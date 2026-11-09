import { createHash } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { expect, test, type Page, type TestInfo } from '@playwright/test';
import type { Room } from '../../src/game/map';
import type { GameSnapshot } from '../../src/host/debug';
import { artifactPath } from './artifacts';
import {
  dispatchCommand,
  endTurn,
  moveCursorTo,
  openBspState,
  settle,
  snapshot,
  walkTo,
} from './support';

const REFERENCE_SEED = 279837264;
const ALTERNATE_SEED = 279837265;
const REFERENCE_URL = `/?seed=${REFERENCE_SEED}`;
const ALTERNATE_URL = `/?seed=${ALTERNATE_SEED}`;

/** Contrato de presentación (REQ-005/REQ-007), no se lee de producción. */
const TILE_SIZE = 32;
const RENDER_SCALE = 3;
const CANVAS_WIDTH = 2218;
const CANVAS_HEIGHT = 1248;
const MAP_OFFSET_BACKING = 485;

/**
 * Umbrales documentados en `report.md`.
 *
 * - `FLOOR_TINT_MIN_LUMINANCE`: el damero programático base/segundo tono supera
 *   12 de diferencia de luminancia; 6 deja margen a los decals y a la escala
 *   CSS. El nombre se conserva para no reescribir la QA completa de TASK-0024.
 * - `GRAYSCALE_MIN_LUMINANCE`: mismo damero medido sobre `gris.png`; 5 exige
 *   que la alternancia se conserve al eliminar el color.
 * - `WALL_TINT_MAX_LUMINANCE`: los muros no llevan tinte; sus bloques deben
 *   coincidir con el sprite (0 píxeles distintos) y su paridad no debe mover la
 *   media más de 1.
 */
const FLOOR_TINT_MIN_LUMINANCE = 6;
const GRAYSCALE_MIN_LUMINANCE = 5;
const WALL_TINT_MAX_LUMINANCE = 1;

const DECAL_FAMILIES = [
  'pebbles',
  'grass',
  'dirt',
  'blueBrick',
  'bones',
  'redBrick',
  'plant',
  'mushroom',
  'corpse',
  'blood',
] as const;
const DIRECTIONS = [
  [0, -1],
  [1, 0],
  [0, 1],
  [-1, 0],
] as const;

interface Point {
  readonly x: number;
  readonly y: number;
}

interface TilePoint extends Point {
  readonly parity: 0 | 1;
}

interface TileLuminance extends TilePoint {
  readonly mean: readonly [number, number, number];
  readonly luminance: number;
}

interface TilePair {
  readonly a: TilePoint;
  readonly b: TilePoint;
}

interface TileRect {
  readonly left: number;
  readonly top: number;
  readonly width: number;
  readonly height: number;
}

type WallKind = 'wallTop' | 'wallSide1';

interface WallSample extends Point {
  readonly kind: WallKind;
  readonly parity: 0 | 1;
}

interface WallPixelResult extends WallSample {
  readonly total: number;
  readonly mismatches: number;
  readonly meanLuminance: number;
}

function parityOf(x: number, y: number): 0 | 1 {
  return ((x + y) % 2 + 2) % 2 === 1 ? 1 : 0;
}

function keyOf(x: number, y: number): string {
  return `${x},${y}`;
}

function roomAt(rooms: readonly Room[], x: number, y: number): Room | undefined {
  return rooms.find(
    (room) =>
      x >= room.x && y >= room.y && x < room.x + room.width && y < room.y + room.height,
  );
}

function tileAt(snap: GameSnapshot, x: number, y: number): string | undefined {
  if (x < 0 || y < 0 || x >= snap.grid.width || y >= snap.grid.height) return undefined;
  return snap.grid.tiles[y * snap.grid.width + x];
}

function isFullyVisible(snap: GameSnapshot, x: number, y: number): boolean {
  const left = x * TILE_SIZE;
  const top = y * TILE_SIZE;
  return (
    left >= snap.camera.x &&
    left + TILE_SIZE <= snap.camera.x + snap.viewport.width &&
    top >= snap.camera.y &&
    top + TILE_SIZE <= snap.camera.y + snap.viewport.height
  );
}

/** Tiles medibles: suelo visible, sin decal, sin puerta/spawn y sin unidad. */
function measurableTiles(snap: GameSnapshot, area: 'room' | 'corridor'): TilePoint[] {
  const doors = new Set(snap.doors.map((door) => keyOf(door.x, door.y)));
  const decals = new Set(snap.decoration.map((decal) => keyOf(decal.x, decal.y)));
  const spawns = new Set(
    [snap.spawns?.player, snap.spawns?.enemy]
      .filter((spawn): spawn is Point => Boolean(spawn))
      .map((spawn) => keyOf(spawn.x, spawn.y)),
  );
  const units = new Set(
    [...snap.players, ...snap.enemies].map((unit) => keyOf(unit.x, unit.y)),
  );

  const tiles: TilePoint[] = [];
  for (let y = 0; y < snap.grid.height; y += 1) {
    for (let x = 0; x < snap.grid.width; x += 1) {
      if (tileAt(snap, x, y) !== 'floor') continue;
      if (!isFullyVisible(snap, x, y)) continue;
      const tileArea = roomAt(snap.rooms, x, y) ? 'room' : 'corridor';
      if (tileArea !== area) continue;
      const key = keyOf(x, y);
      if (doors.has(key) || decals.has(key) || spawns.has(key) || units.has(key)) continue;
      tiles.push({ x, y, parity: parityOf(x, y) });
    }
  }
  return tiles;
}

function findAdjacentParityPair(tiles: readonly TilePoint[]): TilePair | undefined {
  const byKey = new Map(tiles.map((tile) => [keyOf(tile.x, tile.y), tile]));
  for (const tile of tiles) {
    for (const [dx, dy] of [
      [1, 0],
      [0, 1],
    ] as const) {
      const neighbour = byKey.get(keyOf(tile.x + dx, tile.y + dy));
      if (neighbour && neighbour.parity !== tile.parity) {
        return { a: tile, b: neighbour };
      }
    }
  }
  return undefined;
}

/** BFS sobre el suelo visible con el tile del enemigo bloqueado. */
function bfsDistances(snap: GameSnapshot): Int32Array {
  const width = snap.grid.width;
  const distances = new Int32Array(width * snap.grid.height).fill(-1);
  const player = snap.players[0];
  const enemy = snap.enemies[0];
  const start = player.y * width + player.x;
  if (snap.grid.tiles[start] !== 'floor') return distances;

  distances[start] = 0;
  const queue: number[] = [start];
  for (let head = 0; head < queue.length; head += 1) {
    const current = queue[head];
    const x = current % width;
    const y = (current - x) / width;
    for (const [dx, dy] of DIRECTIONS) {
      const nx = x + dx;
      const ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= width || ny >= snap.grid.height) continue;
      if (nx === enemy.x && ny === enemy.y) continue;
      const index = ny * width + nx;
      if (snap.grid.tiles[index] !== 'floor') continue;
      if (distances[index] !== -1) continue;
      distances[index] = distances[current] + 1;
      queue.push(index);
    }
  }
  return distances;
}

function nearestDecoration(
  snap: GameSnapshot,
  area: 'room' | 'corridor',
  predicate: (decal: { x: number; y: number; distance: number }) => boolean,
): { x: number; y: number; type: string } | undefined {
  const distances = bfsDistances(snap);
  const width = snap.grid.width;
  const candidates = snap.decoration
    .filter((decal) => decal.area === area)
    .map((decal) => ({
      x: decal.x,
      y: decal.y,
      type: decal.type,
      distance: distances[decal.y * width + decal.x],
    }))
    .filter((decal) => decal.distance > 0 && predicate(decal))
    .sort((a, b) => a.distance - b.distance || a.y - b.y || a.x - b.x);
  const first = candidates[0];
  return first ? { x: first.x, y: first.y, type: first.type } : undefined;
}

/** Rectángulo del tile en coordenadas CSS de página, derivado del canvas real. */
function tilePageRect(
  snap: GameSnapshot,
  canvas: { x: number; y: number; width: number; height: number },
  x: number,
  y: number,
): TileRect {
  const backingX = MAP_OFFSET_BACKING + (x * TILE_SIZE - snap.camera.x) * RENDER_SCALE;
  const backingY = (y * TILE_SIZE - snap.camera.y) * RENDER_SCALE;
  return {
    left: canvas.x + (backingX / CANVAS_WIDTH) * canvas.width,
    top: canvas.y + (backingY / CANVAS_HEIGHT) * canvas.height,
    width: canvas.width * ((TILE_SIZE * RENDER_SCALE) / CANVAS_WIDTH),
    height: canvas.height * ((TILE_SIZE * RENDER_SCALE) / CANVAS_HEIGHT),
  };
}

async function settleLayout(page: Page): Promise<void> {
  await page.evaluate(
    () =>
      new Promise<void>((resolve) => {
        requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
      }),
  );
}

async function openGame(page: Page, search = REFERENCE_URL): Promise<void> {
  await page.setViewportSize({ width: 1280, height: 720 });
  const seed = Number(new URL(search, 'http://127.0.0.1').searchParams.get('seed') ?? REFERENCE_SEED);
  await openBspState(page, seed, search);
  await settleLayout(page);
  await settle(page);
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

async function writeArtifact(
  testInfo: TestInfo,
  name: string,
  contents: string,
  contentType = 'text/plain',
): Promise<string> {
  const path = artifactPath(testInfo, name);
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, contents, 'utf8');
  await testInfo.attach(name, { path, contentType });
  return path;
}

async function saveScreenshot(
  page: Page,
  name: string,
  testInfo: TestInfo,
): Promise<Buffer> {
  const path = artifactPath(testInfo, 'screenshots', `${name}.png`);
  await mkdir(dirname(path), { recursive: true });
  const buffer = await page.screenshot({ path, fullPage: true });
  await testInfo.attach(name, { path, contentType: 'image/png' });
  return buffer;
}

async function measureCanvasTiles(
  page: Page,
  snap: GameSnapshot,
  tiles: readonly TilePoint[],
): Promise<TileLuminance[]> {
  return page.evaluate(
    ({ points, camera, offset }) => {
      const canvas = document.querySelector<HTMLCanvasElement>('#game-canvas');
      const context = canvas?.getContext('2d');
      if (!canvas || !context) throw new Error('Falta #game-canvas o su contexto 2D');

      const blockSize = 32 * 3;
      const inset = 18;
      return points.map((point) => {
        const backingX = offset + (point.x * 32 - camera.x) * 3;
        const backingY = (point.y * 32 - camera.y) * 3;
        const size = blockSize - inset * 2;
        const data = context.getImageData(
          backingX + inset,
          backingY + inset,
          size,
          size,
        ).data;
        let red = 0;
        let green = 0;
        let blue = 0;
        let count = 0;
        for (let index = 0; index < data.length; index += 4) {
          red += data[index];
          green += data[index + 1];
          blue += data[index + 2];
          count += 1;
        }
        const mean: [number, number, number] = [red / count, green / count, blue / count];
        return {
          x: point.x,
          y: point.y,
          parity: point.parity as 0 | 1,
          mean,
          luminance: 0.2126 * mean[0] + 0.7152 * mean[1] + 0.0722 * mean[2],
        };
      });
    },
    { points: tiles, camera: snap.camera, offset: MAP_OFFSET_BACKING },
  );
}

function meanLuminanceByParity(measurements: readonly TileLuminance[]): {
  parity0: number;
  parity1: number;
  delta: number;
} {
  const meanFor = (parity: 0 | 1): number => {
    const values = measurements.filter((item) => item.parity === parity);
    if (values.length === 0) throw new Error(`No hay tiles de paridad ${parity}`);
    return values.reduce((sum, item) => sum + item.luminance, 0) / values.length;
  };
  const parity0 = meanFor(0);
  const parity1 = meanFor(1);
  return { parity0, parity1, delta: Math.abs(parity1 - parity0) };
}

function selectWallSamples(snap: GameSnapshot): WallSample[] {
  const buckets = new Map<string, WallSample[]>();
  for (let y = 0; y < snap.grid.height; y += 1) {
    for (let x = 0; x < snap.grid.width; x += 1) {
      if (tileAt(snap, x, y) !== 'wall') continue;
      if (!isFullyVisible(snap, x, y)) continue;
      const kind: WallKind = tileAt(snap, x, y + 1) === 'floor' ? 'wallSide1' : 'wallTop';
      const parity = parityOf(x, y);
      const bucket = `${kind}-${parity}`;
      const list = buckets.get(bucket) ?? [];
      if (list.length < 2) list.push({ x, y, kind, parity });
      buckets.set(bucket, list);
    }
  }
  return [...buckets.values()].flat();
}

/**
 * Compara el bloque de respaldo de cada muro visible con el sprite que dicta
 * la regla por borde. Cualquier tinte de damero sobre el muro rompe la igualdad.
 */
async function compareWallPixels(
  page: Page,
  snap: GameSnapshot,
  samples: readonly WallSample[],
): Promise<WallPixelResult[]> {
  const sprites: Record<WallKind, { sx: number; sy: number; sw: number; sh: number }> = {
    wallTop: { sx: 0, sy: 64, sw: 32, sh: 32 },
    wallSide1: { sx: 32, sy: 64, sw: 32, sh: 32 },
  };

  return page.evaluate(
    async ({ wallSamples, camera, rects, offset }) => {
      const canvas = document.querySelector<HTMLCanvasElement>('#game-canvas');
      const context = canvas?.getContext('2d');
      if (!canvas || !context) throw new Error('Falta #game-canvas o su contexto 2D');

      const tilesImage = await new Promise<HTMLImageElement>((resolve, reject) => {
        const image = new Image();
        image.addEventListener('load', () => resolve(image), { once: true });
        image.addEventListener(
          'error',
          () => reject(new Error('No se pudo cargar tiles.png')),
          { once: true },
        );
        image.src = '/assets/32rogues/tiles.png';
      });

      const blockSize = 32 * 3;
      const renderSprite = (rect: { sx: number; sy: number; sw: number; sh: number }) => {
        const sprite = document.createElement('canvas');
        sprite.width = blockSize;
        sprite.height = blockSize;
        const spriteContext = sprite.getContext('2d');
        if (!spriteContext) throw new Error('Falta contexto 2D para el sprite');
        spriteContext.imageSmoothingEnabled = false;
        spriteContext.fillStyle = '#080b10';
        spriteContext.fillRect(0, 0, blockSize, blockSize);
        spriteContext.drawImage(
          tilesImage,
          rect.sx,
          rect.sy,
          rect.sw,
          rect.sh,
          0,
          0,
          blockSize,
          blockSize,
        );
        return spriteContext.getImageData(0, 0, blockSize, blockSize).data;
      };

      const spriteData = {
        wallTop: renderSprite(rects.wallTop),
        wallSide1: renderSprite(rects.wallSide1),
      };

      return wallSamples.map((sample) => {
        const backingX = offset + (sample.x * 32 - camera.x) * 3;
        const backingY = (sample.y * 32 - camera.y) * 3;
        const gameData = context.getImageData(backingX, backingY, blockSize, blockSize).data;
        const expected = spriteData[sample.kind as WallKind];

        let mismatches = 0;
        let red = 0;
        let green = 0;
        let blue = 0;
        let count = 0;
        for (let index = 0; index < gameData.length; index += 4) {
          if (
            gameData[index] !== expected[index] ||
            gameData[index + 1] !== expected[index + 1] ||
            gameData[index + 2] !== expected[index + 2] ||
            gameData[index + 3] !== expected[index + 3]
          ) {
            mismatches += 1;
          }
          red += gameData[index];
          green += gameData[index + 1];
          blue += gameData[index + 2];
          count += 1;
        }
        return {
          x: sample.x,
          y: sample.y,
          kind: sample.kind,
          parity: sample.parity,
          total: blockSize * blockSize,
          mismatches,
          meanLuminance:
            0.2126 * (red / count) + 0.7152 * (green / count) + 0.0722 * (blue / count),
        };
      });
    },
    {
      wallSamples: samples,
      camera: snap.camera,
      rects: sprites,
      offset: MAP_OFFSET_BACKING,
    },
  );
}

async function readScreenshotPixels(
  page: Page,
  buffer: Buffer,
  points: readonly Point[],
): Promise<{ width: number; height: number; pixels: number[][] }> {
  return page.evaluate(
    async ({ dataUrl, coords }) => {
      const blob = await (await fetch(dataUrl)).blob();
      const bitmap = await createImageBitmap(blob);
      const canvas = document.createElement('canvas');
      canvas.width = bitmap.width;
      canvas.height = bitmap.height;
      const context = canvas.getContext('2d');
      if (!context) throw new Error('Falta contexto 2D para la captura');
      context.drawImage(bitmap, 0, 0);
      return {
        width: bitmap.width,
        height: bitmap.height,
        pixels: coords.map((point) =>
          Array.from(
            context.getImageData(Math.round(point.x), Math.round(point.y), 1, 1).data,
          ),
        ),
      };
    },
    {
      dataUrl: `data:image/png;base64,${buffer.toString('base64')}`,
      coords: points,
    },
  );
}

async function grayscaleFromScreenshot(
  page: Page,
  buffer: Buffer,
  rects: readonly TileRect[],
): Promise<{
  width: number;
  height: number;
  means: number[][];
  luminances: number[];
  delta: number;
  png: Buffer;
}> {
  const result = await page.evaluate(
    async ({ dataUrl, tiles }) => {
      const blob = await (await fetch(dataUrl)).blob();
      const bitmap = await createImageBitmap(blob);
      const canvas = document.createElement('canvas');
      canvas.width = bitmap.width;
      canvas.height = bitmap.height;
      const context = canvas.getContext('2d');
      if (!context) throw new Error('Falta contexto 2D para la captura');
      context.drawImage(bitmap, 0, 0);

      const image = context.getImageData(0, 0, canvas.width, canvas.height);
      const means = tiles.map((rect) => {
        const insetX = Math.max(1, Math.round(rect.width * 0.2));
        const insetY = Math.max(1, Math.round(rect.height * 0.2));
        const x = Math.round(rect.left + insetX);
        const y = Math.round(rect.top + insetY);
        const width = Math.max(1, Math.round(rect.width - insetX * 2));
        const height = Math.max(1, Math.round(rect.height - insetY * 2));
        const data = context.getImageData(x, y, width, height).data;
        let red = 0;
        let green = 0;
        let blue = 0;
        let count = 0;
        for (let index = 0; index < data.length; index += 4) {
          red += data[index];
          green += data[index + 1];
          blue += data[index + 2];
          count += 1;
        }
        return [red / count, green / count, blue / count];
      });

      const data = image.data;
      for (let index = 0; index < data.length; index += 4) {
        const grey = Math.round(
          0.2126 * data[index] + 0.7152 * data[index + 1] + 0.0722 * data[index + 2],
        );
        data[index] = grey;
        data[index + 1] = grey;
        data[index + 2] = grey;
      }
      context.putImageData(image, 0, 0);

      return {
        width: canvas.width,
        height: canvas.height,
        means,
        dataUrl: canvas.toDataURL('image/png'),
      };
    },
    {
      dataUrl: `data:image/png;base64,${buffer.toString('base64')}`,
      tiles: rects,
    },
  );

  const luminances = result.means.map(
    ([red, green, blue]) => 0.2126 * red + 0.7152 * green + 0.0722 * blue,
  );
  return {
    width: result.width,
    height: result.height,
    means: result.means,
    luminances,
    delta: Math.abs(luminances[1] - luminances[0]),
    png: Buffer.from(result.dataUrl.replace(/^data:image\/png;base64,/, ''), 'base64'),
  };
}

function isGreenPixel(pixel: readonly number[]): boolean {
  return pixel[1] >= 150 && pixel[1] > pixel[0] + 40 && pixel[1] > pixel[2] + 40;
}

function isBrightPixel(pixel: readonly number[]): boolean {
  return pixel[0] >= 210 && pixel[1] >= 210 && pixel[2] >= 210;
}

function sha256(buffer: Buffer): string {
  return createHash('sha256').update(buffer).digest('hex');
}

test('snapshot: densidades, exclusiones, lista blanca y un decal por tile', async ({
  page,
}, testInfo) => {
  const consoleErrors = watchConsole(page);
  await openGame(page);
  const snap = await snapshot(page);

  expect(snap.seed).toBe(REFERENCE_SEED);
  expect(snap.spawns).not.toBeNull();
  if (!snap.spawns) throw new Error('El snapshot debe incluir spawns');

  const doors = new Set(snap.doors.map((door) => keyOf(door.x, door.y)));
  const spawns = new Set(
    [snap.spawns.player, snap.spawns.enemy].map((spawn) => keyOf(spawn.x, spawn.y)),
  );
  const eligible = { room: 0, corridor: 0 };
  let floorTiles = 0;
  for (let y = 0; y < snap.grid.height; y += 1) {
    for (let x = 0; x < snap.grid.width; x += 1) {
      if (tileAt(snap, x, y) !== 'floor') continue;
      floorTiles += 1;
      const key = keyOf(x, y);
      if (doors.has(key) || spawns.has(key)) continue;
      if (roomAt(snap.rooms, x, y)) eligible.room += 1;
      else eligible.corridor += 1;
    }
  }
  expect(floorTiles).toBeGreaterThan(0);
  expect(eligible.room).toBeGreaterThan(0);
  expect(eligible.corridor).toBeGreaterThan(0);

  const decorated = { room: 0, corridor: 0 };
  const decalKeys = new Set<string>();
  for (const decal of snap.decoration) {
    const key = keyOf(decal.x, decal.y);
    expect(tileAt(snap, decal.x, decal.y), `Decal ${key} sobre suelo`).toBe('floor');
    expect(doors.has(key), `Decal ${key} sobre umbral`).toBe(false);
    expect(spawns.has(key), `Decal ${key} sobre aparición`).toBe(false);
    expect(roomAt(snap.rooms, decal.x, decal.y) ? 'room' : 'corridor').toBe(decal.area);

    const family = decal.type.split('-')[0];
    expect(
      (DECAL_FAMILIES as readonly string[]).includes(family),
      `Decal ${decal.type} debe ser plano de la lista blanca`,
    ).toBe(true);
    expect(decal.type, `Decal ${decal.type} no debe ser un prop sólido`).toMatch(
      /^(pebbles|grass|dirt|blueBrick|bones|redBrick|plant|mushroom|corpse|blood)-[a-z0-9]+$/,
    );

    decalKeys.add(key);
    decorated[decal.area] += 1;
  }

  // Máximo un decal por tile: la lista no repite coordenadas.
  expect(decalKeys.size).toBe(snap.decoration.length);
  expect(decorated.room).toBeGreaterThan(0);
  expect(decorated.corridor).toBeGreaterThan(0);

  const roomDensity = decorated.room / eligible.room;
  const corridorDensity = decorated.corridor / eligible.corridor;
  expect(roomDensity).toBeGreaterThanOrEqual(0.32);
  expect(roomDensity).toBeLessThanOrEqual(0.38);
  expect(corridorDensity).toBeGreaterThanOrEqual(0.13);
  expect(corridorDensity).toBeLessThanOrEqual(0.19);

  // La paridad global del damero no depende de la semilla ni de la sala.
  for (let y = 0; y < snap.grid.height; y += 1) {
    for (let x = 0; x < snap.grid.width; x += 1) {
      if (tileAt(snap, x, y) !== 'floor') continue;
      expect(parityOf(x, y)).toBe((x + y) % 2);
    }
  }

  // Dos lecturas seguidas del mismo estado no cambian la planificación.
  expect((await snapshot(page)).decoration).toEqual(snap.decoration);

  await writeArtifact(testInfo, 'snapshot.json', JSON.stringify(snap, null, 2), 'application/json');
  const densityLines = [
    'TASK-0022 damero y decoración · densidades medidas desde window.__game.snapshot()',
    `seed=${REFERENCE_SEED}`,
    `floor_tiles=${floorTiles}`,
    `eligible_room=${eligible.room} eligible_corridor=${eligible.corridor}`,
    `decorated_room=${decorated.room} density_room=${(roomDensity * 100).toFixed(2)}% (rango 32.00-38.00%)`,
    `decorated_corridor=${decorated.corridor} density_corridor=${(corridorDensity * 100).toFixed(2)}% (rango 13.00-19.00%)`,
    `decorated_total=${snap.decoration.length} unique_tiles=${decalKeys.size}`,
    `doors=${snap.doors.length} spawns=2 decals_on_doors_or_spawns=0`,
    `room_types=${[...new Set(snap.decoration.filter((d) => d.area === 'room').map((d) => d.type))].sort().join(',')}`,
    `corridor_types=${[...new Set(snap.decoration.filter((d) => d.area === 'corridor').map((d) => d.type))].sort().join(',')}`,
    '',
  ];
  await writeArtifact(testInfo, 'densidades.txt', densityLines.join('\n'));
  console.log(
    `TASK-0022 densidades room=${decorated.room}/${eligible.room} (${(roomDensity * 100).toFixed(2)}%) corridor=${decorated.corridor}/${eligible.corridor} (${(corridorDensity * 100).toFixed(2)}%)`,
  );

  expect(consoleErrors).toEqual([]);
});

test('damero en sala y pasillo: tonos alternos y muros sin tinte', async ({
  page,
}, testInfo) => {
  const consoleErrors = watchConsole(page);
  await openGame(page);

  const roomSnap = await snapshot(page);
  const roomTiles = measurableTiles(roomSnap, 'room');
  const roomPair = findAdjacentParityPair(roomTiles);
  if (!roomPair) throw new Error('No hay par adyacente de paridad opuesta en la sala');

  await saveScreenshot(page, 'damero-sala', testInfo);

  // Todas las muestras sin decal por paridad, más el par adyacente concreto.
  const roomSamples = [
    ...roomTiles.filter((tile) => tile.parity === 0).slice(0, 8),
    ...roomTiles.filter((tile) => tile.parity === 1).slice(0, 8),
    roomPair.a,
    roomPair.b,
  ];
  const roomMeasurements = await measureCanvasTiles(page, roomSnap, dedupeTiles(roomSamples));
  const roomLuminance = meanLuminanceByParity(roomMeasurements);
  const roomPairLuminance = pairLuminance(roomMeasurements, roomPair);
  expect(roomLuminance.delta).toBeGreaterThan(FLOOR_TINT_MIN_LUMINANCE);
  expect(roomPairLuminance).toBeGreaterThan(FLOOR_TINT_MIN_LUMINANCE);

  const wallSamples = selectWallSamples(roomSnap);
  expect(wallSamples.some((sample) => sample.parity === 0)).toBe(true);
  expect(wallSamples.some((sample) => sample.parity === 1)).toBe(true);
  expect(wallSamples.some((sample) => sample.kind === 'wallSide1')).toBe(true);
  const wallResults = await compareWallPixels(page, roomSnap, wallSamples);
  for (const wall of wallResults) {
    expect(
      wall.mismatches,
      `Muro (${wall.x},${wall.y}) ${wall.kind}: ${wall.mismatches}/${wall.total} píxeles con tinte`,
    ).toBe(0);
  }
  const wallDeltaFor = (kind: WallKind): number => {
    const means = ([0, 1] as const).map((parity) => {
      const values = wallResults.filter(
        (wall) => wall.kind === kind && wall.parity === parity,
      );
      if (values.length === 0) throw new Error(`Sin muros ${kind} de paridad ${parity}`);
      return values.reduce((sum, wall) => sum + wall.meanLuminance, 0) / values.length;
    });
    return Math.abs(means[1] - means[0]);
  };
  expect(wallDeltaFor('wallTop')).toBeLessThanOrEqual(WALL_TINT_MAX_LUMINANCE);
  expect(wallDeltaFor('wallSide1')).toBeLessThanOrEqual(WALL_TINT_MAX_LUMINANCE);

  // Pasillo: se encuadra con movimiento real y se mide el mismo damero.
  await walkTo(page, 3, 12);
  await settle(page);
  await settleLayout(page);
  const corridorSnap = await snapshot(page);
  expect(corridorSnap.players[0]).toMatchObject({ x: 3, y: 12 });

  const corridorTiles = measurableTiles(corridorSnap, 'corridor');
  const corridorPair = findAdjacentParityPair(corridorTiles);
  if (!corridorPair) throw new Error('No hay par adyacente de paridad opuesta en el pasillo');
  expect(
    roomAt(corridorSnap.rooms, corridorPair.a.x, corridorPair.a.y),
    'El par del pasillo no debe caer dentro de una sala',
  ).toBeUndefined();

  await saveScreenshot(page, 'damero-pasillo', testInfo);

  const corridorMeasurements = await measureCanvasTiles(
    page,
    corridorSnap,
    dedupeTiles([corridorPair.a, corridorPair.b]),
  );
  const corridorPairLuminance = pairLuminance(corridorMeasurements, corridorPair);
  expect(corridorPairLuminance).toBeGreaterThan(FLOOR_TINT_MIN_LUMINANCE);

  const lines = [
    'TASK-0022 damero · luminancia media por tile desde los píxeles del canvas',
    `seed=${REFERENCE_SEED}`,
    `threshold_min_luminance=${FLOOR_TINT_MIN_LUMINANCE}`,
    `room camera=(${roomSnap.camera.x},${roomSnap.camera.y}) samples=${roomMeasurements.length}`,
    `room parity0_mean=${roomLuminance.parity0.toFixed(3)} parity1_mean=${roomLuminance.parity1.toFixed(3)} delta=${roomLuminance.delta.toFixed(3)}`,
    `room adjacent_pair (${roomPair.a.x},${roomPair.a.y}) p${roomPair.a.parity} vs (${roomPair.b.x},${roomPair.b.y}) p${roomPair.b.parity} delta=${roomPairLuminance.toFixed(3)}`,
    `room tile_means ${roomMeasurements
      .map((item) => `(${item.x},${item.y})p${item.parity}=${item.luminance.toFixed(2)}`)
      .join(' ')}`,
    `corridor camera=(${corridorSnap.camera.x},${corridorSnap.camera.y})`,
    `corridor adjacent_pair (${corridorPair.a.x},${corridorPair.a.y}) p${corridorPair.a.parity} vs (${corridorPair.b.x},${corridorPair.b.y}) p${corridorPair.b.parity} delta=${corridorPairLuminance.toFixed(3)}`,
    `corridor tile_means ${corridorMeasurements
      .map((item) => `(${item.x},${item.y})p${item.parity}=${item.luminance.toFixed(2)}`)
      .join(' ')}`,
    `walls sampled=${wallResults.length} mismatched_pixels=${wallResults.reduce(
      (sum, wall) => sum + wall.mismatches,
      0,
    )} wallTop_parity_delta=${wallDeltaFor('wallTop').toFixed(3)} wallSide1_parity_delta=${wallDeltaFor('wallSide1').toFixed(3)}`,
    `wall_samples ${wallResults
      .map((wall) => `(${wall.x},${wall.y})${wall.kind}p${wall.parity}=${wall.meanLuminance.toFixed(2)}`)
      .join(' ')}`,
    '',
  ];
  await writeArtifact(testInfo, 'damero.txt', lines.join('\n'));
  console.log(
    `TASK-0022 damero room_delta=${roomLuminance.delta.toFixed(2)} pair=${roomPairLuminance.toFixed(2)} corridor_pair=${corridorPairLuminance.toFixed(2)} walls_mismatch=${wallResults.reduce((sum, wall) => sum + wall.mismatches, 0)}`,
  );

  expect(consoleErrors).toEqual([]);
});

function dedupeTiles(tiles: readonly TilePoint[]): TilePoint[] {
  const seen = new Set<string>();
  const result: TilePoint[] = [];
  for (const tile of tiles) {
    const key = keyOf(tile.x, tile.y);
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(tile);
  }
  return result;
}

function pairLuminance(measurements: readonly TileLuminance[], pair: TilePair): number {
  const find = (x: number, y: number): TileLuminance => {
    const match = measurements.find((item) => item.x === x && item.y === y);
    if (!match) throw new Error(`Falta la medición de (${x},${y})`);
    return match;
  };
  return Math.abs(find(pair.a.x, pair.a.y).luminance - find(pair.b.x, pair.b.y).luminance);
}

test('escala de grises: el damero se conserva por luminancia', async ({ page }, testInfo) => {
  const consoleErrors = watchConsole(page);
  await openGame(page);
  const snap = await snapshot(page);
  const tiles = measurableTiles(snap, 'room');
  const pair = findAdjacentParityPair(tiles);
  if (!pair) throw new Error('No hay par adyacente de paridad opuesta para grises');

  const canvas = page.locator('#game-canvas');
  const box = await canvas.boundingBox();
  if (!box) throw new Error('No se pudo medir #game-canvas');

  const roomShot = await saveScreenshot(page, 'damero-sala', testInfo);
  const rects = [tilePageRect(snap, box, pair.a.x, pair.a.y), tilePageRect(snap, box, pair.b.x, pair.b.y)];
  const grey = await grayscaleFromScreenshot(page, roomShot, rects);
  expect(grey.width).toBe(1280);
  expect(grey.height).toBe(720);
  expect(grey.delta).toBeGreaterThan(GRAYSCALE_MIN_LUMINANCE);

  const greyPath = artifactPath(testInfo, 'screenshots', 'gris.png');
  await mkdir(dirname(greyPath), { recursive: true });
  await writeFile(greyPath, grey.png);
  await testInfo.attach('gris', { path: greyPath, contentType: 'image/png' });

  const lines = [
    'TASK-0022 escala de grises · captura de sala convertida a luminancia',
    `formula=0.2126R+0.7152G+0.0722B`,
    `source=damero-sala.png (1280x720)`,
    `pair (${pair.a.x},${pair.a.y}) p${pair.a.parity} vs (${pair.b.x},${pair.b.y}) p${pair.b.parity}`,
    `rgb_means a=${grey.means[0].map((value) => value.toFixed(2)).join(',')} b=${grey.means[1].map((value) => value.toFixed(2)).join(',')}`,
    `grey_luminance a=${grey.luminances[0].toFixed(3)} b=${grey.luminances[1].toFixed(3)} delta=${grey.delta.toFixed(3)}`,
    `threshold_min_luminance=${GRAYSCALE_MIN_LUMINANCE}`,
    `output=artifacts/TASK-0022/attempt-1/floor-qa/screenshots/gris.png`,
    '',
  ];
  await writeArtifact(testInfo, 'grises.txt', lines.join('\n'));
  console.log(
    `TASK-0022 grises a=${grey.luminances[0].toFixed(2)} b=${grey.luminances[1].toFixed(2)} delta=${grey.delta.toFixed(2)}`,
  );

  expect(consoleErrors).toEqual([]);
});

test('camino y cursor se dibujan por encima de un tile decorado', async ({
  page,
}, testInfo) => {
  const consoleErrors = watchConsole(page);
  await openGame(page);
  let snap = await snapshot(page);

  if (snap.players[0].mp === 0) {
    await endTurn(page);
    snap = await snapshot(page);
  }

  const player = snap.players[0];
  const target = nearestDecoration(
    snap,
    'room',
    (decal) =>
      Math.max(Math.abs(decal.x - player.x), Math.abs(decal.y - player.y)) >= 2 &&
      Math.abs(decal.x - player.x) !== Math.abs(decal.y - player.y) &&
      decal.distance <= player.mp &&
      isFullyVisible(snap, decal.x, decal.y),
  );
  if (!target) throw new Error('No hay decal alcanzable dentro del viewport y del MP');

  await moveCursorTo(page, target.x, target.y);
  await settleLayout(page);
  const cursorSnap = await snapshot(page);
  expect(cursorSnap.cursor).toMatchObject({
    x: target.x,
    y: target.y,
    visible: true,
    state: 'reachable',
  });
  // Al menos dos pasos: el primer punto del camino no queda bajo el cursor.
  expect(cursorSnap.cursor.path.length).toBeGreaterThanOrEqual(2);
  // `state: 'reachable'` ya implica que el coste cabe en el MP actual.

  const shot = await saveScreenshot(page, 'camino-sobre-decal', testInfo);

  const canvas = page.locator('#game-canvas');
  const box = await canvas.boundingBox();
  if (!box) throw new Error('No se pudo medir #game-canvas');
  const targetRect = tilePageRect(cursorSnap, box, target.x, target.y);

  const cursorBox = await page.locator('[data-testid="cursor"]').boundingBox();
  if (!cursorBox) throw new Error('No se pudo medir el cursor');
  expect(Math.abs(cursorBox.x - targetRect.left)).toBeLessThanOrEqual(2);
  expect(Math.abs(cursorBox.y - targetRect.top)).toBeLessThanOrEqual(2);
  expect(Math.abs(cursorBox.width - targetRect.width)).toBeLessThanOrEqual(2);
  expect(Math.abs(cursorBox.height - targetRect.height)).toBeLessThanOrEqual(2);

  const pathCount = await page.locator('[data-testid="cursor-path-point"]').count();
  expect(pathCount).toBe(cursorSnap.cursor.path.length);
  const pathDots = await page.locator('[data-testid="cursor-path-point"]').evaluateAll(
    (elements) =>
      elements.map((element) => {
        const rect = element.getBoundingClientRect();
        return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };
      }),
  );
  for (let index = 0; index < cursorSnap.cursor.path.length; index += 1) {
    const point = cursorSnap.cursor.path[index];
    const expected = tilePageRect(cursorSnap, box, point.x, point.y);
    expect(Math.abs(pathDots[index].x - (expected.left + expected.width / 2))).toBeLessThanOrEqual(2);
    expect(Math.abs(pathDots[index].y - (expected.top + expected.height / 2))).toBeLessThanOrEqual(2);
  }

  const stacking = await page.evaluate(() => {
    const overlay = document.querySelector<HTMLElement>('.map-overlay');
    const cursor = document.querySelector<HTMLElement>('[data-testid="cursor"]');
    const path = document.querySelector<HTMLElement>('[data-testid="cursor-path"]');
    const gameCanvas = document.querySelector<HTMLCanvasElement>('#game-canvas');
    if (!overlay || !cursor || !path || !gameCanvas) {
      throw new Error('Faltan canvas, overlay, cursor o cursor-path');
    }
    const canvasStyle = getComputedStyle(gameCanvas);
    return {
      overlayPosition: getComputedStyle(overlay).position,
      overlayZ: getComputedStyle(overlay).zIndex,
      cursorZ: getComputedStyle(cursor).zIndex,
      pathZ: getComputedStyle(path).zIndex,
      canvasPosition: canvasStyle.position,
      canvasZ: canvasStyle.zIndex,
      canvasBeforeOverlay: Boolean(
        gameCanvas.compareDocumentPosition(overlay) & Node.DOCUMENT_POSITION_FOLLOWING,
      ),
      pathHidden: path.hidden,
      cursorHidden: cursor.hidden,
      devicePixelRatio: window.devicePixelRatio,
      overlayRect: overlay.getBoundingClientRect().toJSON(),
      cursorRect: cursor.getBoundingClientRect().toJSON(),
    };
  });

  expect(stacking.pathHidden).toBe(false);
  expect(stacking.cursorHidden).toBe(false);
  expect(stacking.overlayPosition).toBe('absolute');
  expect(Number(stacking.overlayZ)).toBeGreaterThan(0);
  expect(Number(stacking.cursorZ)).toBeGreaterThan(Number(stacking.pathZ));
  expect(stacking.canvasPosition).toBe('static');
  expect(stacking.canvasZ).toBe('auto');
  expect(stacking.canvasBeforeOverlay).toBe(true);
  expect(stacking.overlayRect.x).toBeLessThanOrEqual(cursorBox.x);
  expect(stacking.overlayRect.y).toBeLessThanOrEqual(cursorBox.y);
  expect(stacking.overlayRect.right).toBeGreaterThanOrEqual(cursorBox.x + cursorBox.width);
  expect(stacking.overlayRect.bottom).toBeGreaterThanOrEqual(cursorBox.y + cursorBox.height);
  expect(stacking.devicePixelRatio).toBe(1);

  // Píxeles de la captura: el borde verde del cursor y el primer punto del
  // camino están pintados encima del decal, no tapados por el canvas.
  const borderPoints = [
    { x: cursorBox.x + 1, y: cursorBox.y + cursorBox.height / 2 },
    { x: cursorBox.x + cursorBox.width / 2, y: cursorBox.y + 1 },
    { x: cursorBox.x + cursorBox.width - 2, y: cursorBox.y + cursorBox.height / 2 },
    { x: cursorBox.x + cursorBox.width / 2, y: cursorBox.y + cursorBox.height - 2 },
  ];
  const firstDot = pathDots[0];
  const dotPoints = [
    { x: firstDot.x, y: firstDot.y },
    { x: firstDot.x + 1, y: firstDot.y },
    { x: firstDot.x, y: firstDot.y + 1 },
    { x: firstDot.x - 1, y: firstDot.y - 1 },
  ];
  const sampled = await readScreenshotPixels(page, shot, [...borderPoints, ...dotPoints]);
  const borderPixels = sampled.pixels.slice(0, borderPoints.length);
  const dotPixels = sampled.pixels.slice(borderPoints.length);
  expect(
    borderPixels.filter((pixel) => isGreenPixel(pixel)).length,
    `Borde del cursor sobre el decal: ${JSON.stringify(borderPixels)}`,
  ).toBeGreaterThanOrEqual(2);
  expect(
    dotPixels.some((pixel) => isBrightPixel(pixel)),
    `Punto de camino sobre el decal: ${JSON.stringify(dotPixels)}`,
  ).toBe(true);

  const lines = [
    'TASK-0022 camino y cursor sobre decoración',
    `seed=${REFERENCE_SEED}`,
    `decorated_tile=(${target.x},${target.y}) type=${target.type}`,
    `cursor=(x=${cursorSnap.cursor.x},y=${cursorSnap.cursor.y}) state=${cursorSnap.cursor.state} kind=${cursorSnap.cursor.kind}`,
    `path_steps=${cursorSnap.cursor.path.length}`,
    `path_points=${cursorSnap.cursor.path.map((point) => `(${point.x},${point.y})`).join(' ')}`,
    `dom_path_points=${pathCount}`,
    `z_index overlay=${stacking.overlayZ} path=${stacking.pathZ} cursor=${stacking.cursorZ} canvas=${stacking.canvasZ} canvas_position=${stacking.canvasPosition} canvas_before_overlay=${stacking.canvasBeforeOverlay}`,
    `cursor_rect x=${cursorBox.x.toFixed(2)} y=${cursorBox.y.toFixed(2)} w=${cursorBox.width.toFixed(2)} h=${cursorBox.height.toFixed(2)} expected x=${targetRect.left.toFixed(2)} y=${targetRect.top.toFixed(2)} w=${targetRect.width.toFixed(2)} h=${targetRect.height.toFixed(2)}`,
    `border_pixels ${JSON.stringify(borderPixels)}`,
    `path_dot_pixels ${JSON.stringify(dotPixels)}`,
    `green_border_hits=${borderPixels.filter((pixel) => isGreenPixel(pixel)).length}/4 bright_dot=${dotPixels.some((pixel) => isBrightPixel(pixel))}`,
    '',
  ];
  await writeArtifact(testInfo, 'camino.txt', lines.join('\n'));
  console.log(
    `TASK-0022 camino decal=(${target.x},${target.y}) steps=${cursorSnap.cursor.path.length} green=${borderPixels.filter((pixel) => isGreenPixel(pixel)).length}/4 bright=${dotPixels.some((pixel) => isBrightPixel(pixel))}`,
  );

  expect(consoleErrors).toEqual([]);
});

test('MoveTo a un tile decorado termina y conserva la decoración', async ({
  page,
}, testInfo) => {
  const consoleErrors = watchConsole(page);
  await openGame(page);
  const initial = await snapshot(page);

  const target = nearestDecoration(initial, 'room', () => true);
  if (!target) throw new Error('No hay decoración de sala alcanzable');

  const distances = bfsDistances(initial);
  const width = initial.grid.width;
  const neighbours = DIRECTIONS.map(([dx, dy]) => ({
    x: target.x + dx,
    y: target.y + dy,
  }))
    .filter((point) => tileAt(initial, point.x, point.y) === 'floor')
    .filter((point) => distances[point.y * width + point.x] >= 0)
    .sort(
      (a, b) =>
        distances[a.y * width + a.x] - distances[b.y * width + b.x] || a.y - b.y || a.x - b.x,
    );
  const approach = neighbours[0];
  if (!approach) throw new Error(`El tile decorado (${target.x},${target.y}) no tiene aproximación`);

  const player = initial.players[0];
  if (player.x !== approach.x || player.y !== approach.y) {
    await walkTo(page, approach.x, approach.y);
  }
  await settleLayout(page);

  if ((await snapshot(page)).players[0].mp === 0) {
    await endTurn(page);
  }

  const before = await snapshot(page);
  expect(tileAt(before, target.x, target.y)).toBe('floor');
  expect(before.decoration).toContainEqual(
    expect.objectContaining({ x: target.x, y: target.y, type: target.type }),
  );

  const result = await dispatchCommand(page, {
    type: 'MoveTo',
    unitId: 'player-1',
    target: { x: target.x, y: target.y },
  });
  expect(
    result.events.filter((event) => event.type === 'CommandRejected'),
    `MoveTo a (${target.x},${target.y}) debe ser aceptado`,
  ).toEqual([]);
  expect(
    result.events.some(
      (event) =>
        event.type === 'UnitMoved' &&
        event.to.x === target.x &&
        event.to.y === target.y,
    ),
    'MoveTo debe emitir UnitMoved hasta el tile decorado',
  ).toBe(true);

  await settle(page);
  await settleLayout(page);
  const after = await snapshot(page);
  expect(after.players[0]).toMatchObject({ x: target.x, y: target.y });
  expect(after.decoration).toEqual(before.decoration);
  expect(after.grid.tiles).toEqual(before.grid.tiles);
  expect(after.decoration).toContainEqual(
    expect.objectContaining({ x: target.x, y: target.y, type: target.type }),
  );

  const lines = [
    'TASK-0022 MoveTo sobre decoración',
    `seed=${REFERENCE_SEED}`,
    `target=(${target.x},${target.y}) type=${target.type} approach=(${approach.x},${approach.y})`,
    `player_before=(${before.players[0].x},${before.players[0].y}) mp=${before.players[0].mp}`,
    `player_after=(${after.players[0].x},${after.players[0].y}) mp=${after.players[0].mp}`,
    `events=${result.events.map((event) => event.type).join(',')}`,
    `decoration_unchanged=${JSON.stringify(after.decoration) === JSON.stringify(before.decoration)}`,
    `grid_unchanged=${JSON.stringify(after.grid.tiles) === JSON.stringify(before.grid.tiles)}`,
    '',
  ];
  await writeArtifact(testInfo, 'moveto.txt', lines.join('\n'));
  console.log(
    `TASK-0022 MoveTo target=(${target.x},${target.y}) approach=(${approach.x},${approach.y}) player_after=(${after.players[0].x},${after.players[0].y})`,
  );

  expect(consoleErrors).toEqual([]);
});

test('misma semilla idéntica y otra semilla cambia decals manteniendo el damero', async ({
  page,
}, testInfo) => {
  const consoleErrors = watchConsole(page);

  await openGame(page);
  const reference = await snapshot(page);
  const firstShot = await page.screenshot({ fullPage: true });
  const firstCanvas = await page.locator('#game-canvas').evaluate(
    (element) => (element as HTMLCanvasElement).toDataURL('image/png'),
  );

  await openGame(page);
  const repeated = await snapshot(page);
  const secondShot = await page.screenshot({ fullPage: true });
  const secondCanvas = await page.locator('#game-canvas').evaluate(
    (element) => (element as HTMLCanvasElement).toDataURL('image/png'),
  );

  expect(repeated.seed).toBe(reference.seed);
  expect(repeated.grid.tiles).toEqual(reference.grid.tiles);
  expect(repeated.decoration).toEqual(reference.decoration);
  expect(Buffer.compare(firstShot, secondShot), 'capturas de la misma semilla').toBe(0);
  expect(firstCanvas).toBe(secondCanvas);

  // Otra semilla: mapa y decoración distintos, damero global intacto.
  await openGame(page, ALTERNATE_URL);
  const alternate = await snapshot(page);
  expect(alternate.seed).toBe(ALTERNATE_SEED);
  expect(alternate.seed).not.toBe(reference.seed);
  expect(alternate.decoration).not.toEqual(reference.decoration);
  await saveScreenshot(page, 'semilla-distinta', testInfo);

  const alternateTiles = measurableTiles(alternate, 'room');
  const alternatePair = findAdjacentParityPair(alternateTiles);
  if (!alternatePair) throw new Error('No hay par adyacente en la sala de la otra semilla');
  const alternateMeasurements = await measureCanvasTiles(page, alternate, [
    alternatePair.a,
    alternatePair.b,
  ]);
  const alternateDelta = pairLuminance(alternateMeasurements, alternatePair);
  expect(alternateDelta).toBeGreaterThan(FLOOR_TINT_MIN_LUMINANCE);
  for (let y = 0; y < alternate.grid.height; y += 1) {
    for (let x = 0; x < alternate.grid.width; x += 1) {
      if (tileAt(alternate, x, y) !== 'floor') continue;
      expect(parityOf(x, y)).toBe((x + y) % 2);
    }
  }

  const lines = [
    'TASK-0022 determinismo de presentación',
    `reference_seed=${REFERENCE_SEED}`,
    `screenshot_method=page.screenshot({ fullPage: true }) + Buffer.compare (bytes)`,
    `canvas_method=canvas.toDataURL('image/png') (cadena idéntica)`,
    `reference_shot_bytes=${firstShot.length} sha256=${sha256(firstShot)}`,
    `repeated_shot_bytes=${secondShot.length} sha256=${sha256(secondShot)}`,
    `screenshots_identical=${Buffer.compare(firstShot, secondShot) === 0}`,
    `canvas_identical=${firstCanvas === secondCanvas}`,
    `alternate_seed=${alternate.seed} alternate_decorated=${alternate.decoration.length} reference_decorated=${reference.decoration.length}`,
    `alternate_decoration_differs=true`,
    `alternate_pair (${alternatePair.a.x},${alternatePair.a.y})p${alternatePair.a.parity} vs (${alternatePair.b.x},${alternatePair.b.y})p${alternatePair.b.parity} delta=${alternateDelta.toFixed(3)}`,
    `damero_threshold_min_luminance=${FLOOR_TINT_MIN_LUMINANCE}`,
    '',
  ];
  await writeArtifact(testInfo, 'determinismo.txt', lines.join('\n'));
  console.log(
    `TASK-0022 determinismo identical=${Buffer.compare(firstShot, secondShot) === 0} alternate_seed=${alternate.seed} alternate_delta=${alternateDelta.toFixed(2)}`,
  );

  expect(consoleErrors).toEqual([]);
});
