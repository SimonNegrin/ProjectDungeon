import { mkdir, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { expect, test, type Page, type TestInfo } from '@playwright/test';
import {
  ROSTER,
  createPlayerFromArchetype,
  createRoomGrid,
  createRng,
  type ArchetypeId,
  type GameState,
  type Unit,
} from '../../src/game/index';
import { artifactPath } from './artifacts';
import { openState, settle } from './support';

const SEED = 279837264;
const VIEWPORTS = [
  { width: 900, height: 700 },
  { width: 1280, height: 720 },
] as const;

interface ExpectedPortrait {
  readonly id: ArchetypeId;
  /** Columna del recorte en `rogues.png` (celda de 32×32). */
  readonly sx: number;
  /** Fila del recorte en `rogues.png` (celda de 32×32). */
  readonly sy: number;
}

/** Los tres arquetipos del QA; cada uno debe pintar una celda distinta. */
const EXPECTED: readonly ExpectedPortrait[] = [
  { id: 'warrior', sx: 0, sy: 32 },
  { id: 'mage', sx: 32, sy: 128 },
  { id: 'rogue', sx: 96, sy: 0 },
];

function player(id: ArchetypeId): Unit {
  return createPlayerFromArchetype(id, {
    id: 'player-1',
    position: { x: 5, y: 5 },
  });
}

function roomState(unit: Unit): GameState {
  return {
    grid: createRoomGrid(20, 20),
    players: [unit],
    enemies: [],
    groundItems: [],
    containers: [],
    phase: 'player',
    turn: 1,
    status: 'playing',
    rng: createRng(SEED),
  };
}

interface Box {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  readonly right: number;
  readonly bottom: number;
}

interface PortraitState {
  readonly name: string;
  readonly archetype: string;
  readonly backgroundImage: string;
  /** Tamaño lógico de la hoja (sin la escala de presentación). */
  readonly backgroundSize: { readonly x: number; readonly y: number };
  readonly imageRendering: string;
  readonly scale: number;
  /** Posición lógica del recorte dentro de la hoja, ya con el ×2 del arte. */
  readonly position: { readonly x: number; readonly y: number };
  readonly box: Box;
  readonly nameBox: Box;
  readonly character: Box;
}

/** Lee nombre, arquetipo, recorte y cajas del HUD en una sola evaluación. */
async function portraitState(page: Page): Promise<PortraitState> {
  return page.evaluate(() => {
    const element = (testId: string): HTMLElement => {
      const found = document.querySelector<HTMLElement>(
        `[data-testid="${testId}"]`,
      );
      if (!found) throw new Error(`Falta [data-testid="${testId}"]`);
      return found;
    };
    const box = (testId: string): Box => {
      const rect = element(testId).getBoundingClientRect();
      return {
        x: rect.x,
        y: rect.y,
        width: rect.width,
        height: rect.height,
        right: rect.right,
        bottom: rect.bottom,
      };
    };

    const portrait = element('hud-portrait');
    const style = getComputedStyle(portrait);
    const scale =
      Number.parseFloat(
        getComputedStyle(document.documentElement).getPropertyValue('--ui-scale'),
      ) || 1;
    const [positionX, positionY] = style.backgroundPosition
      .split(/\s+/)
      .map((part) => Number.parseFloat(part));
    const [sizeX, sizeY] = style.backgroundSize
      .split(/\s+/)
      .map((part) => Number.parseFloat(part));

    return {
      name: element('hud-player-name').textContent ?? '',
      archetype: element('hud-archetype').textContent ?? '',
      backgroundImage: style.backgroundImage,
      backgroundSize: { x: sizeX / scale, y: sizeY / scale },
      imageRendering: style.imageRendering,
      scale,
      position: { x: positionX / scale, y: positionY / scale },
      box: box('hud-portrait'),
      nameBox: box('hud-player-name'),
      character: box('hud-zone-character'),
    };
  });
}

/**
 * Sustituye el estado con `window.__game.setup` y devuelve nombre, arquetipo y
 * recorte leídos en la misma tarea del navegador: si la vista no los cambiara
 * en el mismo render, la lectura los vería desincronizados.
 */
async function setupAndMeasure(
  page: Page,
  state: GameState,
): Promise<Pick<PortraitState, 'name' | 'archetype' | 'position'>> {
  return page.evaluate((next) => {
    window.__game!.setup!(next);
    const text = (testId: string): string =>
      document.querySelector<HTMLElement>(`[data-testid="${testId}"]`)
        ?.textContent ?? '';
    const portrait = document.querySelector<HTMLElement>(
      '[data-testid="hud-portrait"]',
    );
    if (!portrait) throw new Error('Falta [data-testid="hud-portrait"]');
    const style = getComputedStyle(portrait);
    const scale =
      Number.parseFloat(
        getComputedStyle(document.documentElement).getPropertyValue('--ui-scale'),
      ) || 1;
    const [positionX, positionY] = style.backgroundPosition
      .split(/\s+/)
      .map((part) => Number.parseFloat(part));
    return {
      name: text('hud-player-name'),
      archetype: text('hud-archetype'),
      position: { x: positionX / scale, y: positionY / scale },
    };
  }, JSON.parse(JSON.stringify(state)));
}

function expectNear(
  actual: number,
  expected: number,
  label: string,
  tolerance = 1,
): void {
  expect(
    Math.abs(actual - expected),
    `${label}: ${actual} ≈ ${expected} (±${tolerance})`,
  ).toBeLessThanOrEqual(tolerance);
}

function expectPortrait(
  state: PortraitState,
  expected: ExpectedPortrait,
  label: string,
): void {
  const name = ROSTER[expected.id].name;
  expect(state.name, `${label}: nombre`).toBe(name);
  expect(state.archetype, `${label}: arquetipo`).toBe(name);
  expect(state.backgroundImage, `${label}: hoja de sprites`).toContain(
    '/assets/32rogues/rogues.png',
  );
  expect(state.imageRendering, `${label}: sin interpolación`).toBe('pixelated');
  expectNear(state.backgroundSize.x, 448, `${label}: ancho lógico de la hoja`);
  expectNear(state.backgroundSize.y, 448, `${label}: alto lógico de la hoja`);
  expectNear(
    state.position.x,
    -expected.sx * 2,
    `${label}: columna del recorte`,
  );
  expectNear(state.position.y, -expected.sy * 2, `${label}: fila del recorte`);
  expectNear(state.box.width, 64 * state.scale, `${label}: ancho del retrato`);
  expectNear(state.box.height, 64 * state.scale, `${label}: alto del retrato`);
}

/** El retrato, el nombre y la zona Personaje no se mueven al cambiar jugador. */
function expectStableLayout(
  before: PortraitState,
  after: PortraitState,
  label: string,
): void {
  for (const key of ['box', 'nameBox', 'character'] as const) {
    for (const edge of ['x', 'y', 'width', 'height'] as const) {
      expect(
        Math.abs(after[key][edge] - before[key][edge]),
        `${label}: ${key}.${edge} estable (±1 px)`,
      ).toBeLessThanOrEqual(1);
    }
  }
}

async function screenshot(
  page: Page,
  name: string,
  testInfo: TestInfo,
): Promise<void> {
  const path = artifactPath(testInfo, 'screenshots', `${name}.png`);
  await mkdir(dirname(path), { recursive: true });
  await page.screenshot({ path, fullPage: true });
  await testInfo.attach(name, { path, contentType: 'image/png' });
}

async function writeLog(
  testInfo: TestInfo,
  name: string,
  data: unknown,
): Promise<void> {
  const path = artifactPath(testInfo, 'logs', name);
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
}

for (const viewport of VIEWPORTS) {
  const suffix = `${viewport.width}x${viewport.height}`;

  test.describe(`Retrato del HUD a ${suffix}`, () => {
    test('carga la miniatura correcta de guerrero, mago y pícaro', async ({
      page,
    }) => {
      await page.setViewportSize(viewport);
      const seen: PortraitState[] = [];

      for (const expected of EXPECTED) {
        await openState(page, roomState(player(expected.id)));
        const state = await portraitState(page);
        expectPortrait(state, expected, `${expected.id} en carga inicial`);
        seen.push(state);
      }

      const positions = new Set(
        seen.map(
          (state) => `${Math.round(state.position.x)},${Math.round(state.position.y)}`,
        ),
      );
      expect(positions.size).toBe(3);
    });

    test('cambia retrato, nombre y arquetipo a la vez sin recargar ni mover el layout', async ({
      page,
    }, testInfo) => {
      await page.setViewportSize(viewport);
      await openState(page, roomState(player('warrior')));
      await page.evaluate(() => {
        (window as Window & { __portraitMarker?: string }).__portraitMarker =
          'same-page';
      });

      const warrior = await portraitState(page);
      expectPortrait(warrior, EXPECTED[0], 'guerrero');
      await screenshot(page, `hud-portrait-warrior-${suffix}`, testInfo);

      const mageSetup = await setupAndMeasure(
        page,
        roomState(player('mage')),
      );
      await settle(page);
      const mage = await portraitState(page);
      expect(mageSetup.name, 'mago: nombre en el mismo render').toBe(
        ROSTER.mage.name,
      );
      expect(mageSetup.archetype, 'mago: arquetipo en el mismo render').toBe(
        ROSTER.mage.name,
      );
      expectNear(
        mageSetup.position.x,
        -EXPECTED[1].sx * 2,
        'mago: columna en el mismo render',
      );
      expectNear(
        mageSetup.position.y,
        -EXPECTED[1].sy * 2,
        'mago: fila en el mismo render',
      );
      expectPortrait(mage, EXPECTED[1], 'mago');
      expectStableLayout(warrior, mage, 'guerrero→mago');
      await screenshot(page, `hud-portrait-mage-${suffix}`, testInfo);

      const rogueSetup = await setupAndMeasure(
        page,
        roomState(player('rogue')),
      );
      await settle(page);
      const rogue = await portraitState(page);
      expect(rogueSetup.name, 'pícaro: nombre en el mismo render').toBe(
        ROSTER.rogue.name,
      );
      expect(rogueSetup.archetype, 'pícaro: arquetipo en el mismo render').toBe(
        ROSTER.rogue.name,
      );
      expectNear(
        rogueSetup.position.x,
        -EXPECTED[2].sx * 2,
        'pícaro: columna en el mismo render',
      );
      expectNear(
        rogueSetup.position.y,
        -EXPECTED[2].sy * 2,
        'pícaro: fila en el mismo render',
      );
      expectPortrait(rogue, EXPECTED[2], 'pícaro');
      expectStableLayout(warrior, rogue, 'guerrero→pícaro');
      await screenshot(page, `hud-portrait-rogue-${suffix}`, testInfo);

      const positions = new Set(
        [warrior, mage, rogue].map(
          (state) => `${Math.round(state.position.x)},${Math.round(state.position.y)}`,
        ),
      );
      expect(positions.size).toBe(3);

      // El marcador sigue vivo: los tres cambios ocurrieron sin recargar.
      expect(
        await page.evaluate(
          () =>
            (window as Window & { __portraitMarker?: string })
              .__portraitMarker ?? null,
        ),
      ).toBe('same-page');

      await writeLog(testInfo, `hud-portrait-${suffix}.json`, {
        viewport: suffix,
        scale: warrior.scale,
        samples: { warrior, mage, rogue },
      });
    });
  });
}
