import { mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';
import { expect, test, type Page, type TestInfo } from '@playwright/test';
import type { GameEvent, Unit } from '../../src/game/types';
import type { GameSnapshot } from '../../src/host/debug';
import {
  approachEnemy,
  endTurn,
  moveCursorTo,
  openBspState,
  snapshot,
  walkTo,
  type BspStateOptions,
} from './support';
import { artifactPath } from './artifacts';

const CANVAS_ID = '#game-canvas';

/** Valores del contrato aprobado en REQ-005 (no se leen de producción). */
const TILE_SIZE = 32;
const VIEWPORT_SIZE = 416;
const TILES_PER_AXIS = 13;
const CANVAS_WIDTH = 2218;
const CANVAS_HEIGHT = 1248;
const MAP_BACKING_SIZE = 1248;
const SIDE_BACKING = 485;

const FRAME_ASPECT = 16 / 9;
/** Tolerancia del criterio: ±0,1 % sobre la proporción 16:9. */
const ASPECT_TOLERANCE = FRAME_ASPECT * 0.001;
/** Tolerancia de 1:1 del sub-viewport del mapa. */
const SQUARE_TOLERANCE = 0.001;
/** Redondeo entero de cámara y de márgenes subpíxel del layout. */
const PX_TOLERANCE = 1;

const HUD_TEST_IDS = [
  'hud',
  'hud-player-hp',
  'hud-player-mp',
  'hud-action',
  'hud-phase',
  'hud-enemy-hp',
  'hud-turn',
  'hud-status',
  'hud-keys',
] as const;

interface Box {
  x: number;
  y: number;
  width: number;
  height: number;
  right: number;
  bottom: number;
}

interface HudMeasurement {
  id: string;
  box: Box | null;
  scrollWidth: number;
  clientWidth: number;
  scrollHeight: number;
  clientHeight: number;
}

interface LayoutMeasurement {
  frame: Box;
  stage: Box;
  canvas: Box;
  footer: Box;
  hud: HudMeasurement[];
  document: {
    scrollWidth: number;
    clientWidth: number;
    scrollHeight: number;
    clientHeight: number;
  };
  stageBackground: string;
  imageRendering: string;
  imageSmoothingEnabled: boolean;
  canvasInternal: { width: number; height: number };
}

interface PixelRegion {
  samples: number;
  nonBlack: number;
}

interface PixelMeasurement {
  sideLeft: PixelRegion;
  sideRight: PixelRegion;
  map: PixelRegion;
  sampledSides: { x: number; y: number; rgba: number[] }[];
}

interface GameViewport {
  name: string;
  width: number;
  height: number;
  screenshot: string;
  /** Eje en el que el espacio sobrante produce bandas negras. */
  bands: 'lateral' | 'vertical';
}

const VIEWPORTS: readonly GameViewport[] = [
  {
    name: '1280×720',
    width: 1280,
    height: 720,
    screenshot: 'frame-1280x720',
    bands: 'lateral',
  },
  {
    name: '1920×1080',
    width: 1920,
    height: 1080,
    screenshot: 'frame-1920x1080',
    bands: 'lateral',
  },
  {
    name: '900×700 (estrecha)',
    width: 900,
    height: 700,
    screenshot: 'frame-narrow',
    bands: 'vertical',
  },
];

async function settleLayout(page: Page): Promise<void> {
  await page.evaluate(
    () =>
      new Promise<void>((resolve) => {
        requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
      }),
  );
}

async function openGame(
  page: Page,
  width: number,
  height: number,
  options: BspStateOptions = {},
): Promise<void> {
  await page.setViewportSize({ width, height });
  await openBspState(page, 279837264, undefined, options);
  await settleLayout(page);
}

function watchConsole(page: Page): string[] {
  const errors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  page.on('pageerror', (error) => errors.push(error.message));
  return errors;
}

async function measureLayout(page: Page): Promise<LayoutMeasurement> {
  return page.evaluate((hudIds): LayoutMeasurement => {
    const toBox = (element: Element): Box => {
      const rect = element.getBoundingClientRect();
      return {
        x: rect.x,
        y: rect.y,
        width: rect.width,
        height: rect.height,
        right: rect.right,
        bottom: rect.bottom,
      };
    };
    const requireTestId = (id: string): HTMLElement => {
      const element = document.querySelector<HTMLElement>(`[data-testid="${id}"]`);
      if (!element) throw new Error(`Falta [data-testid="${id}"]`);
      return element;
    };
    const canvas = document.querySelector<HTMLCanvasElement>('#game-canvas');
    const stage = requireTestId('stage');
    const footer = document.querySelector('footer');
    const context = canvas?.getContext('2d');
    if (!canvas || !footer || !context) throw new Error('Falta canvas, footer o contexto 2D');

    return {
      frame: toBox(requireTestId('frame')),
      stage: toBox(stage),
      canvas: toBox(canvas),
      footer: toBox(footer),
      hud: hudIds.map((id) => {
        const element = requireTestId(id);
        return {
          id,
          box: toBox(element),
          scrollWidth: element.scrollWidth,
          clientWidth: element.clientWidth,
          scrollHeight: element.scrollHeight,
          clientHeight: element.clientHeight,
        };
      }),
      document: {
        scrollWidth: document.documentElement.scrollWidth,
        clientWidth: document.documentElement.clientWidth,
        scrollHeight: document.documentElement.scrollHeight,
        clientHeight: document.documentElement.clientHeight,
      },
      stageBackground: getComputedStyle(stage).backgroundColor,
      imageRendering: getComputedStyle(canvas).imageRendering,
      imageSmoothingEnabled: context.imageSmoothingEnabled,
      canvasInternal: { width: canvas.width, height: canvas.height },
    };
  }, HUD_TEST_IDS);
}

/**
 * Recorre los dos laterales completos del canvas de respaldo y una rejilla del
 * área del mapa. Los laterales deben ser negro puro; el mapa debe tener arte.
 * No se compara la imagen completa, solo las regiones laterales y muestras.
 */
async function measurePixels(page: Page): Promise<PixelMeasurement> {
  return page.evaluate(() => {
    const canvas = document.querySelector<HTMLCanvasElement>('#game-canvas');
    const context = canvas?.getContext('2d');
    if (!canvas || !context) throw new Error('Falta canvas o contexto 2D');

    const region = (x: number, width: number) => {
      const data = context.getImageData(x, 0, width, canvas.height).data;
      let nonBlack = 0;
      for (let index = 0; index < data.length; index += 4) {
        if (data[index] !== 0 || data[index + 1] !== 0 || data[index + 2] !== 0) {
          nonBlack += 1;
        }
        if (data[index + 3] !== 255) nonBlack += 1;
      }
      return { samples: width * canvas.height, nonBlack };
    };

    let mapNonBlack = 0;
    let mapSamples = 0;
    for (let x = 485; x < 1733; x += 32) {
      for (let y = 0; y < canvas.height; y += 32) {
        const data = context.getImageData(x, y, 1, 1).data;
        mapSamples += 1;
        if (data[0] !== 0 || data[1] !== 0 || data[2] !== 0) mapNonBlack += 1;
      }
    }

    const points = [
      [0, 0],
      [8, 8],
      [224, 100],
      [477, 576],
      [484, canvas.height - 1],
      [1733, 0],
      [1900, 300],
      [2210, 576],
      [canvas.width - 1, canvas.height - 1],
    ];
    const sampledSides = points.map(([x, y]) => ({
      x,
      y,
      rgba: Array.from(context.getImageData(x, y, 1, 1).data),
    }));

    return {
      sideLeft: region(0, 485),
      sideRight: region(1733, 485),
      map: { samples: mapSamples, nonBlack: mapNonBlack },
      sampledSides,
    };
  });
}

function unitRect(unit: Unit, tileSize: number) {
  const left = unit.x * tileSize;
  const top = unit.y * tileSize;
  return { left, top, right: left + tileSize, bottom: top + tileSize };
}

function viewportRect(snapshotData: GameSnapshot) {
  return {
    left: snapshotData.camera.x,
    top: snapshotData.camera.y,
    right: snapshotData.camera.x + snapshotData.viewport.width,
    bottom: snapshotData.camera.y + snapshotData.viewport.height,
  };
}

function intersects(
  a: { left: number; top: number; right: number; bottom: number },
  b: { left: number; top: number; right: number; bottom: number },
): boolean {
  return a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
}

function playerVisible(snapshotData: GameSnapshot): boolean {
  return intersects(
    unitRect(snapshotData.players[0], snapshotData.tileSize),
    viewportRect(snapshotData),
  );
}

function enemyVisible(snapshotData: GameSnapshot): boolean {
  return intersects(
    unitRect(snapshotData.enemies[0], snapshotData.tileSize),
    viewportRect(snapshotData),
  );
}

/** Rango inclusivo de tiles visibles, mismo cálculo que el render del host. */
function visibleTileRange(snapshotData: GameSnapshot) {
  const clamp = (value: number, min: number, max: number) =>
    Math.min(Math.max(value, min), max);
  const { camera, viewport, tileSize, grid } = snapshotData;
  return {
    minX: clamp(Math.floor(camera.x / tileSize), 0, grid.width - 1),
    minY: clamp(Math.floor(camera.y / tileSize), 0, grid.height - 1),
    maxX: clamp(Math.ceil((camera.x + viewport.width) / tileSize) - 1, 0, grid.width - 1),
    maxY: clamp(Math.ceil((camera.y + viewport.height) / tileSize) - 1, 0, grid.height - 1),
  };
}

/** Cámara esperada si el jugador está centrado y después se limita al mundo. */
function expectedCamera(snapshotData: GameSnapshot) {
  const player = snapshotData.players[0];
  const rawX = Math.round(
    (player.x + 0.5) * snapshotData.tileSize - snapshotData.viewport.width / 2,
  );
  const rawY = Math.round(
    (player.y + 0.5) * snapshotData.tileSize - snapshotData.viewport.height / 2,
  );
  return {
    x: Math.min(Math.max(rawX, 0), snapshotData.camera.maxX),
    y: Math.min(Math.max(rawY, 0), snapshotData.camera.maxY),
  };
}

function expectPlayerVisible(snapshotData: GameSnapshot, context: string): void {
  expect(playerVisible(snapshotData), `El jugador debe verse ${context}`).toBe(true);
}

function expectHudInsideViewport(
  layout: LayoutMeasurement,
  viewportWidth: number,
  viewportHeight: number,
): void {
  for (const item of layout.hud) {
    expect(item.box, `El HUD debe exponer ${item.id}`).not.toBeNull();
    if (!item.box) continue;
    expect(item.box.x, `${item.id} no debe salir por la izquierda`).toBeGreaterThanOrEqual(0);
    expect(item.box.y, `${item.id} no debe salir por arriba`).toBeGreaterThanOrEqual(0);
    expect(item.box.right, `${item.id} no debe salir por la derecha`).toBeLessThanOrEqual(
      viewportWidth + 0.5,
    );
    expect(item.box.bottom, `${item.id} no debe salir por abajo`).toBeLessThanOrEqual(
      viewportHeight + 0.5,
    );
    expect(item.scrollWidth, `${item.id} no debe recortar texto en horizontal`).toBeLessThanOrEqual(
      item.clientWidth + 1,
    );
    expect(item.scrollHeight, `${item.id} no debe recortar texto en vertical`).toBeLessThanOrEqual(
      item.clientHeight + 1,
    );
  }
}

function expectWithinViewport(box: Box, viewportWidth: number, viewportHeight: number): void {
  expect(box.x).toBeGreaterThanOrEqual(0);
  expect(box.y).toBeGreaterThanOrEqual(0);
  expect(box.right).toBeLessThanOrEqual(viewportWidth + 0.5);
  expect(box.bottom).toBeLessThanOrEqual(viewportHeight + 0.5);
}

async function screenshot(page: Page, name: string, testInfo: TestInfo): Promise<void> {
  const path = artifactPath(testInfo, 'screenshots', `${name}.png`);
  await mkdir(dirname(path), { recursive: true });
  await page.screenshot({ path, fullPage: true });
  await testInfo.attach(name, { path, contentType: 'image/png' });
}

test.describe('encuadre 16:9, mapa 13×13 y HUD', () => {
  for (const viewport of VIEWPORTS) {
    test(`mantiene las invariantes a ${viewport.name}`, async ({ page }, testInfo) => {
      const consoleErrors = watchConsole(page);
      await openGame(page, viewport.width, viewport.height);

      const snap = await snapshot(page);
      const layout = await measureLayout(page);
      const pixels = await measurePixels(page);

      await expect(page.getByTestId('frame')).toBeVisible();
      await expect(page.locator(CANVAS_ID)).toBeVisible();
      await expect(page.getByTestId('hud')).toBeVisible();

      // Marco 16:9 y canvas 16:9 con ±0,1 %.
      expect(layout.frame.width).toBeGreaterThan(0);
      expect(layout.frame.height).toBeGreaterThan(0);
      expect(Math.abs(layout.frame.width / layout.frame.height - FRAME_ASPECT)).toBeLessThanOrEqual(
        ASPECT_TOLERANCE,
      );
      expect(
        Math.abs(layout.canvas.width / layout.canvas.height - FRAME_ASPECT),
      ).toBeLessThanOrEqual(ASPECT_TOLERANCE);

      // Canvas interno fijo 2218×1248 y área de mapa 1:1 centrada.
      expect(layout.canvasInternal).toEqual({ width: CANVAS_WIDTH, height: CANVAS_HEIGHT });
      const mapCssWidth = layout.canvas.width * (MAP_BACKING_SIZE / CANVAS_WIDTH);
      const mapCssHeight = layout.canvas.height * (MAP_BACKING_SIZE / CANVAS_HEIGHT);
      expect(Math.abs(mapCssWidth / mapCssHeight - 1)).toBeLessThanOrEqual(SQUARE_TOLERANCE);
      expect(Math.abs(mapCssHeight - layout.canvas.height)).toBeLessThanOrEqual(0.5);
      const mapLeftOffset = layout.canvas.width * (SIDE_BACKING / CANVAS_WIDTH);
      const mapRightOffset = layout.canvas.width - mapLeftOffset - mapCssWidth;
      expect(Math.abs(mapLeftOffset - mapRightOffset)).toBeLessThanOrEqual(0.5);

      // Constantes del sub-viewport y del respaldo, derivadas del snapshot.
      expect(snap.tileSize).toBe(TILE_SIZE);
      expect(snap.viewport).toEqual({ width: VIEWPORT_SIZE, height: VIEWPORT_SIZE });
      expect(snap.viewport.width / snap.tileSize).toBe(TILES_PER_AXIS);
      expect(snap.viewport.height / snap.tileSize).toBe(TILES_PER_AXIS);
      expect(snap.viewport.width * 3).toBe(MAP_BACKING_SIZE);
      expect((CANVAS_WIDTH - MAP_BACKING_SIZE) / 2).toBe(SIDE_BACKING);

      // El viewport cubre exactamente 13×13 tiles. La cámara inicial deriva del
      // spawn BSP vigente y cae alineada a la rejilla.
      const range = visibleTileRange(snap);
      const expected = expectedCamera(snap);
      expect(snap.camera).toEqual({
        ...expected,
        maxX: 608,
        maxY: 608,
      });
      expect(range).toEqual({
        minX: Math.floor(snap.camera.x / TILE_SIZE),
        minY: Math.floor(snap.camera.y / TILE_SIZE),
        maxX: Math.ceil((snap.camera.x + snap.viewport.width) / TILE_SIZE) - 1,
        maxY: Math.ceil((snap.camera.y + snap.viewport.height) / TILE_SIZE) - 1,
      });
      expect(range.maxX - range.minX + 1).toBe(TILES_PER_AXIS);
      expect(range.maxY - range.minY + 1).toBe(TILES_PER_AXIS);
      expect(snap.camera.x % TILE_SIZE).toBe(0);
      expect(snap.camera.y % TILE_SIZE).toBe(0);
      expect(snap.viewport.width / TILE_SIZE).toBe(TILES_PER_AXIS);

      // Pixel art nítido y sin suavizado.
      expect(layout.imageRendering).toBe('pixelated');
      expect(layout.imageSmoothingEnabled).toBe(false);

      // Laterales de respaldo en negro puro y mapa con arte (sin invasión).
      expect(pixels.sideLeft.nonBlack).toBe(0);
      expect(pixels.sideRight.nonBlack).toBe(0);
      expect(pixels.sideLeft.samples).toBe(SIDE_BACKING * CANVAS_HEIGHT);
      expect(pixels.sideRight.samples).toBe(SIDE_BACKING * CANVAS_HEIGHT);
      for (const sample of pixels.sampledSides) {
        expect(sample.rgba, `Píxel lateral (${sample.x}, ${sample.y})`).toEqual([0, 0, 0, 255]);
      }
      expect(pixels.map.nonBlack).toBeGreaterThan(500);
      expect(pixels.map.nonBlack).toBeGreaterThan(pixels.map.samples / 2);

      // Bandas negras del escenario y marco centrado.
      expect(layout.stageBackground).toBe('rgb(0, 0, 0)');
      expect(layout.frame.x).toBeGreaterThanOrEqual(layout.stage.x - 0.5);
      expect(layout.frame.y).toBeGreaterThanOrEqual(layout.stage.y - PX_TOLERANCE);
      expect(layout.frame.right).toBeLessThanOrEqual(layout.stage.right + PX_TOLERANCE);
      expect(layout.frame.bottom).toBeLessThanOrEqual(layout.stage.bottom + PX_TOLERANCE);
      expect(
        Math.abs(
          layout.frame.x - layout.stage.x - (layout.stage.right - layout.frame.right),
        ),
      ).toBeLessThanOrEqual(PX_TOLERANCE);
      expect(
        Math.abs(
          layout.frame.y - layout.stage.y - (layout.stage.bottom - layout.frame.bottom),
        ),
      ).toBeLessThanOrEqual(PX_TOLERANCE);

      if (viewport.bands === 'lateral') {
        // Limitado por altura: bandas laterales negras dentro del escenario.
        expect(layout.stage.width - layout.frame.width).toBeGreaterThan(1);
        expect(Math.abs(layout.stage.height - layout.frame.height)).toBeLessThanOrEqual(
          PX_TOLERANCE,
        );
      } else {
        // Limitado por anchura: bandas verticales negras (marco sin deformar).
        expect(layout.stage.height - layout.frame.height).toBeGreaterThan(1);
        expect(Math.abs(layout.stage.width - layout.frame.width)).toBeLessThanOrEqual(
          PX_TOLERANCE,
        );
      }

      // HUD íntegro, legible y sin recortes; footer dentro de la ventana.
      expectHudInsideViewport(layout, viewport.width, viewport.height);
      expectWithinViewport(layout.footer, viewport.width, viewport.height);
      expect(layout.document.scrollWidth).toBeLessThanOrEqual(layout.document.clientWidth + 1);
      expect(layout.document.scrollHeight).toBeLessThanOrEqual(layout.document.clientHeight + 1);

      await screenshot(page, viewport.screenshot, testInfo);

      expect(consoleErrors).toEqual([]);
    });
  }
});

test('el canvas interno 2218×1248 no cambia al redimensionar', async ({ page }) => {
  const consoleErrors = watchConsole(page);
  await openGame(page, 1280, 720);

  const internalSize = () =>
    page.evaluate(() => {
      const canvas = document.querySelector<HTMLCanvasElement>('#game-canvas');
      if (!canvas) throw new Error('Falta #game-canvas');
      return { width: canvas.width, height: canvas.height };
    });

  const initial = await internalSize();
  expect(initial).toEqual({ width: CANVAS_WIDTH, height: CANVAS_HEIGHT });

  for (const [width, height] of [
    [1920, 1080],
    [900, 700],
    [1280, 720],
  ] as const) {
    await page.setViewportSize({ width, height });
    await settleLayout(page);
    expect(await internalSize(), `Canvas interno tras ${width}×${height}`).toEqual(initial);
  }

  const layout = await measureLayout(page);
  expect(Math.abs(layout.frame.width / layout.frame.height - FRAME_ASPECT)).toBeLessThanOrEqual(
    ASPECT_TOLERANCE,
  );

  expect(consoleErrors).toEqual([]);
});

test('la cámara centra al jugador y se detiene en los cuatro bordes del mapa', async ({
  page,
}, testInfo) => {
  const consoleErrors = watchConsole(page);
  await openGame(page, 1280, 720, { enemies: [] });

  // Arranque: el spawn BSP vigente y la cámara centrada en él.
  const initial = await snapshot(page);
  expect(initial.camera).toEqual({
    ...expectedCamera(initial),
    maxX: 608,
    maxY: 608,
  });
  expect(initial.players[0]).toMatchObject({
    x: initial.spawns!.player.x,
    y: initial.spawns!.player.y,
    mp: 6,
    hp: 20,
  });
  expect(initial.camera.x).toBe(expectedCamera(initial).x);
  expect(initial.camera.y).toBe(expectedCamera(initial).y);
  expectPlayerVisible(initial, 'en el arranque');

  // Lejos de los bordes: el jugador queda centrado en el viewport (±1 px).
  await walkTo(page, 9, 11);
  const centered = await snapshot(page);
  expect(centered.players[0]).toMatchObject({ x: 9, y: 11 });
  expect(centered.camera).toEqual({
    ...expectedCamera(centered),
    maxX: 608,
    maxY: 608,
  });
  expect(centered.camera.x).toBeGreaterThan(0);
  expect(centered.camera.y).toBeGreaterThan(0);
  expect(centered.camera.x).toBeLessThan(centered.camera.maxX);
  expect(centered.camera.y).toBeLessThan(centered.camera.maxY);
  expect(Math.abs(centered.camera.x - expectedCamera(centered).x)).toBeLessThanOrEqual(
    PX_TOLERANCE,
  );
  expect(Math.abs(centered.camera.y - expectedCamera(centered).y)).toBeLessThanOrEqual(
    PX_TOLERANCE,
  );
  const playerCenterX =
    (centered.players[0].x + 0.5) * centered.tileSize - centered.camera.x;
  const playerCenterY =
    (centered.players[0].y + 0.5) * centered.tileSize - centered.camera.y;
  expect(Math.abs(playerCenterX - centered.viewport.width / 2)).toBeLessThanOrEqual(
    PX_TOLERANCE,
  );
  expect(Math.abs(playerCenterY - centered.viewport.height / 2)).toBeLessThanOrEqual(
    PX_TOLERANCE,
  );
  await screenshot(page, 'camera-centered', testInfo);

  // Borde noroeste: cámara (0,0) en la sala 0.
  await walkTo(page, 3, 5);
  const northWest = await snapshot(page);
  expect(northWest.players[0]).toMatchObject({ x: 3, y: 5 });
  expect(northWest.camera).toMatchObject({ x: 0, y: 0 });
  expectPlayerVisible(northWest, 'en el borde noroeste');

  // Borde noreste: cámara (608,0) en la sala 6.
  await walkTo(page, 28, 5);
  const northEast = await snapshot(page);
  expect(northEast.players[0]).toMatchObject({ x: 28, y: 5 });
  expect(northEast.camera).toMatchObject({ x: 608, y: 0 });
  expectPlayerVisible(northEast, 'en el borde noreste');

  // Borde suroeste: cámara (0,608) en la sala 1.
  await walkTo(page, 3, 27);
  const southWest = await snapshot(page);
  expect(southWest.players[0]).toMatchObject({ x: 3, y: 27 });
  expect(southWest.camera).toMatchObject({ x: 0, y: 608 });
  expectPlayerVisible(southWest, 'en el borde suroeste');

  // Borde este: cámara (608,320) en la sala 7. Se comprueba el clamp este con
  // una ruta real y el clamp sur en la ruta suroeste.
  await walkTo(page, 28, 16);
  const southEast = await snapshot(page);
  expect(southEast.players[0]).toMatchObject({ x: 28, y: 16 });
  expect(southEast.camera).toMatchObject({ x: 608, y: 320 });
  expect(southEast.camera.x).toBe(southEast.camera.maxX);
  expectPlayerVisible(southEast, 'en el borde este');

  await screenshot(page, 'camera-edge', testInfo);

  expect(consoleErrors).toEqual([]);
});

test('el enemigo empieza fuera del viewport y sigue fuera mientras la distancia supera el viewport', async ({
  page,
}) => {
  const consoleErrors = watchConsole(page);

  // Se carga el mismo BSP con el jugador en la sala 0, lejos del enemigo. Así
  // no hay que cruzar medio mapa con la IA de 4 MP activa.
  const initial = await openBspState(page, 279837264, undefined, {
    player: { x: 9, y: 11 },
  });
  await settleLayout(page);
  expect(initial.players[0]).toMatchObject({ x: 9, y: 11 });
  expect(initial.enemies[0]).toMatchObject({
    x: initial.spawns!.enemy.x,
    y: initial.spawns!.enemy.y,
  });
  expect(initial.spawns!.distance).toBeGreaterThanOrEqual(12);
  expect(enemyVisible(initial), 'El enemigo no debe verse al arrancar').toBe(false);
  expectPlayerVisible(initial, 'en el arranque');

  const afterMoves = initial;
  expect(afterMoves.camera).toEqual({
    ...expectedCamera(afterMoves),
    maxX: 608,
    maxY: 608,
  });
  expect(enemyVisible(afterMoves), 'El enemigo debe seguir fuera del viewport').toBe(false);
  expectPlayerVisible(afterMoves, 'tras moverse');

  // El centinela sigue dormido y fuera del viewport 13×13: no hay visión.
  await endTurn(page);
  const afterEnemyPhase = await snapshot(page);
  expect(afterEnemyPhase.turn).toBe(initial.turn + 1);
  expect(afterEnemyPhase.phase).toBe('player');
  expect(afterEnemyPhase.enemies[0]).toMatchObject({
    x: initial.spawns!.enemy.x,
    y: initial.spawns!.enemy.y,
    awareness: 'dormant',
  });
  const chebyshev = Math.max(
    Math.abs(afterEnemyPhase.players[0].x - afterEnemyPhase.enemies[0].x),
    Math.abs(afterEnemyPhase.players[0].y - afterEnemyPhase.enemies[0].y),
  );
  expect(chebyshev).toBeGreaterThan(TILES_PER_AXIS);
  expect(enemyVisible(afterEnemyPhase), 'El enemigo debe seguir fuera del viewport').toBe(false);

  expect(consoleErrors).toEqual([]);
});

test('el HUD muestra vida, MP, acción, fase, turno y enemigo; el ataque conserva flash y daño', async ({
  page,
}, testInfo) => {
  const consoleErrors = watchConsole(page);
  await openGame(page, 1280, 720);
  const initial = await snapshot(page);
  const initialEnemy = initial.enemies[0];

  await expect(page.getByTestId('hud-player-hp')).toHaveText('20/20');
  await expect(page.getByTestId('hud-player-mp')).toHaveText('6/6');
  await expect(page.getByTestId('hud-action')).toHaveText('2/2');
  await expect(page.getByTestId('hud-phase')).toHaveText('Jugador');
  await expect(page.getByTestId('hud-turn')).toHaveText('Turno 1');
  await expect(page.getByTestId('hud-enemy-hp')).toHaveText(
    `${initialEnemy.hp}/${initialEnemy.maxHp}`,
  );

  // Solo enemy-1: el resto de la guardia con su MP por tipo puede matar al
  // jugador durante el trayecto; el combate y sus aserciones no cambian.
  await openGame(page, 1280, 720, { enemies: [initialEnemy] });
  await approachEnemy(page);
  const adjacent = await snapshot(page);
  expect(
    Math.max(
      Math.abs(adjacent.players[0].x - adjacent.enemies[0].x),
      Math.abs(adjacent.players[0].y - adjacent.enemies[0].y),
    ),
  ).toBe(1);

  await moveCursorTo(page, adjacent.enemies[0].x, adjacent.enemies[0].y);
  await page.keyboard.press('f');
  const afterAttack = await snapshot(page);
  expect(
    afterAttack.animation.cues.find((cue) => cue.kind === 'attack'),
  ).toMatchObject({ kind: 'attack', hit: true });
  const playerAttack = afterAttack.lastEvents.find(
    (event): event is Extract<GameEvent, { type: 'AttackPerformed' }> =>
      event.type === 'AttackPerformed' && event.attackerId === 'player-1',
  );
  expect(playerAttack).toBeDefined();
  await expect(page.getByTestId('damage-feedback')).toHaveText(
    `-${playerAttack!.damage}`,
  );
  await expect(page.getByTestId('damage-feedback')).toBeVisible();
  await screenshot(page, 'attack', testInfo);

  expect(afterAttack.enemies[0].hp).toBe(playerAttack!.targetHp);
  expect(afterAttack.players[0].actions.remaining).toBe(1);
  expect(afterAttack.lastEvents).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        type: 'AttackPerformed',
        attackerId: 'player-1',
        targetId: 'enemy-1',
        damage: playerAttack!.damage,
      }),
    ]),
  );
  await expect(page.getByTestId('hud-enemy-hp')).toHaveText(
    `${playerAttack!.targetHp}/${initialEnemy.maxHp}`,
  );
  await expect(page.getByTestId('hud-action')).toHaveText('1/2');

  expect(consoleErrors).toEqual([]);
});
