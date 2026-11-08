import { createHash } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { expect, test, type Page, type TestInfo } from '@playwright/test';
import type { Room } from '../../src/game/map';
import { DECAL_RECTS } from '../../src/host/assets';
import type { GameSnapshot } from '../../src/host/debug';
import { DECAL_WHITELIST } from '../../src/host/floor';
import { artifactPath } from './artifacts';
import { settle, snapshot, walkTo } from './support';

const REFERENCE_SEED = 279837264;
const ALTERNATE_SEED = 279837265;
const REFERENCE_URL = `/?seed=${REFERENCE_SEED}`;
const ALTERNATE_URL = `/?seed=${ALTERNATE_SEED}`;

/**
 * Contrato de presentación de REQ-008, no se lee de producción: base común,
 * segundos tonos curados, ambiente→paleta y familias dominantes por ambiente.
 */
const FLOOR_BASE = '#0d1519';
const PALETTE_SECONDS: Readonly<Record<string, string>> = {
  neutral: '#16232b',
  humid: '#142528',
  death: '#2a2026',
  ruin: '#2b2419',
  vegetation: '#24261f',
};
const AMBIENT_PALETTE: Readonly<Record<string, string>> = {
  humid: 'humid',
  death: 'death',
  ruin: 'ruin',
  vegetation: 'vegetation',
  mixed: 'neutral',
};
const AMBIENT_FAMILIES: Readonly<Record<string, readonly string[]>> = {
  humid: ['mushroom', 'blood', 'grass', 'plant', 'dirt'],
  death: ['blood', 'bones', 'corpse', 'redBrick', 'dirt'],
  ruin: ['pebbles', 'blueBrick', 'dirt', 'bones'],
  vegetation: ['grass', 'plant', 'mushroom', 'pebbles'],
  mixed: [
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
  ],
};

/** Contrato de presentación del mapa (REQ-005/REQ-007), no se lee de producción. */
const TILE_SIZE = 32;
const MAP_OFFSET_BACKING = 485;

interface Point {
  readonly x: number;
  readonly y: number;
}

interface TilePoint extends Point {
  readonly parity: 0 | 1;
}

interface TileMeasurement extends TilePoint {
  readonly mean: readonly [number, number, number];
  readonly uniqueColors: number;
}

interface RoomSample {
  readonly room: Room;
  readonly palette: string;
  readonly ambient: string;
}

function parityOf(x: number, y: number): 0 | 1 {
  return ((x + y) % 2 + 2) % 2 === 1 ? 1 : 0;
}

function keyOf(x: number, y: number): string {
  return `${x},${y}`;
}

function hexToRgb(hex: string): readonly [number, number, number] {
  const value = Number.parseInt(hex.slice(1), 16);
  return [(value >>> 16) & 0xff, (value >>> 8) & 0xff, value & 0xff];
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

function paletteForRoom(snap: GameSnapshot, roomId: number): RoomSample {
  const room = snap.rooms.find((candidate) => candidate.id === roomId);
  const entry = snap.floorPalettes.find((candidate) => candidate.roomId === roomId);
  if (!room || !entry) throw new Error(`Falta la sala ${roomId} o su paleta`);
  return { room, palette: entry.palette, ambient: entry.ambient };
}

/** Tiles de suelo medibles: visibles, sin decal, puerta, aparición ni unidad. */
function measurableTiles(
  snap: GameSnapshot,
  predicate: (x: number, y: number) => boolean,
): TilePoint[] {
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
      if (!predicate(x, y)) continue;
      const key = keyOf(x, y);
      if (doors.has(key) || decals.has(key) || spawns.has(key) || units.has(key)) continue;
      tiles.push({ x, y, parity: parityOf(x, y) });
    }
  }
  return tiles;
}

/** Par de tiles con paridades opuestas; prefiere uno adyacente si existe. */
function palettePair(tiles: readonly TilePoint[]): {
  readonly base: TilePoint;
  readonly second: TilePoint;
} {
  const byKey = new Map(tiles.map((tile) => [keyOf(tile.x, tile.y), tile]));
  for (const tile of tiles) {
    for (const [dx, dy] of [
      [1, 0],
      [0, 1],
    ] as const) {
      const neighbour = byKey.get(keyOf(tile.x + dx, tile.y + dy));
      if (neighbour && neighbour.parity !== tile.parity) {
        return tile.parity === 0
          ? { base: tile, second: neighbour }
          : { base: neighbour, second: tile };
      }
    }
  }

  const base = tiles.find((tile) => tile.parity === 0);
  const second = tiles.find((tile) => tile.parity === 1);
  if (!base || !second) throw new Error('No hay tiles de ambas paridades');
  return { base, second };
}

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
    for (const [dx, dy] of [
      [0, -1],
      [1, 0],
      [0, 1],
      [-1, 0],
    ] as const) {
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

/** Sala más cercana al jugador que cumple el predicado. */
function nearestRoom(
  snap: GameSnapshot,
  predicate: (sample: RoomSample) => boolean,
): RoomSample {
  const distances = bfsDistances(snap);
  const candidates = snap.floorPalettes
    .map((entry) => paletteForRoom(snap, entry.roomId))
    .filter(predicate)
    .sort((a, b) => {
      const distanceOf = (sample: RoomSample): number => {
        const values: number[] = [];
        for (let y = sample.room.y; y < sample.room.y + sample.room.height; y += 1) {
          for (let x = sample.room.x; x < sample.room.x + sample.room.width; x += 1) {
            const distance = distances[y * snap.grid.width + x];
            if (distance >= 0) values.push(distance);
          }
        }
        return values.length > 0 ? Math.min(...values) : Number.POSITIVE_INFINITY;
      };
      return distanceOf(a) - distanceOf(b) || a.room.id - b.room.id;
    });
  const first = candidates[0];
  if (!first) throw new Error('No hay sala que cumpla el criterio de ambiente');
  return first;
}

function roomFloorTile(room: Room): Point {
  return {
    x: room.x + Math.floor(room.width / 2),
    y: room.y + Math.floor(room.height / 2),
  };
}

function nearestCorridorTile(snap: GameSnapshot): Point {
  const distances = bfsDistances(snap);
  let best: Point | undefined;
  let bestDistance = Number.POSITIVE_INFINITY;
  for (let y = 0; y < snap.grid.height; y += 1) {
    for (let x = 0; x < snap.grid.width; x += 1) {
      if (tileAt(snap, x, y) !== 'floor') continue;
      if (roomAt(snap.rooms, x, y)) continue;
      if (snap.doors.some((door) => door.x === x && door.y === y)) continue;
      const distance = distances[y * snap.grid.width + x];
      if (distance < 0 || distance >= bestDistance) continue;
      best = { x, y };
      bestDistance = distance;
    }
  }
  if (!best) throw new Error('No hay un tile de pasillo alcanzable');
  return best;
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
  await page.goto(search);
  await page.waitForFunction(
    () => Boolean(window.__game) && window.__game!.snapshot().assetsLoaded,
  );
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

/** Media RGB del bloque de respaldo de un tile; el relleno es plano. */
async function measureCanvasTile(
  page: Page,
  snap: GameSnapshot,
  tile: TilePoint,
): Promise<TileMeasurement> {
  return page.evaluate(
    ({ point, camera, offset }) => {
      const canvas = document.querySelector<HTMLCanvasElement>('#game-canvas');
      const context = canvas?.getContext('2d');
      if (!canvas || !context) throw new Error('Falta #game-canvas o su contexto 2D');

      const blockSize = 32 * 3;
      const inset = 18;
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
      const colors = new Set<string>();
      for (let index = 0; index < data.length; index += 4) {
        red += data[index];
        green += data[index + 1];
        blue += data[index + 2];
        count += 1;
        colors.add(`${data[index]},${data[index + 1]},${data[index + 2]}`);
      }
      return {
        x: point.x,
        y: point.y,
        parity: point.parity,
        mean: [red / count, green / count, blue / count] as [number, number, number],
        uniqueColors: colors.size,
      };
    },
    { point: tile, camera: snap.camera, offset: MAP_OFFSET_BACKING },
  );
}

function expectColor(
  measurement: TileMeasurement,
  hex: string,
  label: string,
): void {
  const expected = hexToRgb(hex).map((channel) => channel) as [
    number,
    number,
    number,
  ];
  for (let channel = 0; channel < 3; channel += 1) {
    expect(
      Math.abs(measurement.mean[channel] - expected[channel]),
      `${label} (${measurement.x},${measurement.y}) canal ${channel}: medio ${measurement.mean[channel].toFixed(2)} esperado ${expected[channel]}`,
    ).toBeLessThanOrEqual(1);
  }
  expect(
    measurement.uniqueColors,
    `${label} (${measurement.x},${measurement.y}) debe ser relleno plano`,
  ).toBeLessThanOrEqual(2);
}

async function verifyPalette(
  page: Page,
  snap: GameSnapshot,
  tiles: readonly TilePoint[],
  palette: string,
  label: string,
): Promise<{ base: TileMeasurement; second: TileMeasurement }> {
  const pair = palettePair(tiles);
  const base = await measureCanvasTile(page, snap, pair.base);
  const second = await measureCanvasTile(page, snap, pair.second);
  expectColor(base, FLOOR_BASE, `${label} base`);
  expectColor(second, PALETTE_SECONDS[palette] ?? '', `${label} segundo tono`);
  return { base, second };
}

function sha256(buffer: Buffer): string {
  return createHash('sha256').update(buffer).digest('hex');
}

test('snapshot y canvas: base común, una paleta por sala y puertas/pasillos neutros', async ({
  page,
}, testInfo) => {
  const consoleErrors = watchConsole(page);
  await openGame(page);
  const snap = await snapshot(page);

  expect(snap.floorPalettes).toHaveLength(snap.rooms.length);
  const seen = new Set<number>();
  const ambients = new Set<string>();
  for (const entry of snap.floorPalettes) {
    expect(entry.base).toBe(FLOOR_BASE);
    expect(entry.second).toBe(PALETTE_SECONDS[entry.palette]);
    expect(entry.palette).toBe(AMBIENT_PALETTE[entry.ambient]);
    expect(snap.rooms.some((room) => room.id === entry.roomId)).toBe(true);
    expect(seen.has(entry.roomId)).toBe(false);
    seen.add(entry.roomId);
    ambients.add(entry.ambient);
  }
  expect(ambients.size).toBeGreaterThanOrEqual(3);
  expect(ambients.has('humid')).toBe(true);
  expect(ambients.has('death')).toBe(true);

  const neutralRoom = nearestRoom(snap, (sample) => sample.palette === 'neutral');
  const neutralMeasurements = await verifyPalette(
    page,
    snap,
    measurableTiles(snap, (x, y) => roomAt(snap.rooms, x, y)?.id === neutralRoom.room.id),
    neutralRoom.palette,
    `sala ${neutralRoom.room.id} ${neutralRoom.ambient}`,
  );

  const corridorTiles = measurableTiles(snap, (x, y) => !roomAt(snap.rooms, x, y));
  expect(corridorTiles.length).toBeGreaterThan(1);
  const corridorMeasurements = await verifyPalette(
    page,
    snap,
    corridorTiles,
    'neutral',
    'pasillo',
  );

  // Puerta de una sala con paleta no neutra: debe usar la neutra. Se elige una
  // de paridad impar para comprobar el segundo tono neutro, no solo la base.
  const door = snap.doors.find((candidate) => {
    const sample = paletteForRoom(snap, candidate.roomId);
    return (
      sample.palette !== 'neutral' &&
      parityOf(candidate.x, candidate.y) === 1 &&
      isFullyVisible(snap, candidate.x, candidate.y)
    );
  });
  if (!door) throw new Error('No hay puerta no neutra visible de paridad impar');
  const doorMeasurement = await measureCanvasTile(page, snap, {
    x: door.x,
    y: door.y,
    parity: 1,
  });
  expectColor(doorMeasurement, PALETTE_SECONDS.neutral, 'puerta neutra');

  const lines = [
    'TASK-0024 paletas por sala y neutralidad de pasillos/puertas',
    `seed=${REFERENCE_SEED}`,
    `rooms=${snap.rooms.length} ambients=${[...ambients].sort().join(',')}`,
    `palettes ${snap.floorPalettes
      .map(
        (entry) =>
          `room${entry.roomId}:${entry.ambient}/${entry.palette}/${entry.second}`,
      )
      .join(' ')}`,
    `neutral_room=${neutralRoom.room.id} pair (${neutralMeasurements.base.x},${neutralMeasurements.base.y})p0=${neutralMeasurements.base.mean.map((value) => value.toFixed(2)).join(',')} (${neutralMeasurements.second.x},${neutralMeasurements.second.y})p1=${neutralMeasurements.second.mean.map((value) => value.toFixed(2)).join(',')}`,
    `corridor pair (${corridorMeasurements.base.x},${corridorMeasurements.base.y})p0=${corridorMeasurements.base.mean.map((value) => value.toFixed(2)).join(',')} (${corridorMeasurements.second.x},${corridorMeasurements.second.y})p1=${corridorMeasurements.second.mean.map((value) => value.toFixed(2)).join(',')}`,
    `door (${door.x},${door.y}) room=${door.roomId} parity=1 mean=${doorMeasurement.mean.map((value) => value.toFixed(2)).join(',')} expected_neutral_second=#16232b`,
    '',
  ];
  await writeArtifact(testInfo, 'paletas-neutralidad.txt', lines.join('\n'));
  console.log(
    `TASK-0024 paletas salas=${snap.rooms.length} ambients=${[...ambients].sort().join(',')} door=(${door.x},${door.y})`,
  );

  expect(consoleErrors).toEqual([]);
});

test('ambientes: sala neutra, pasillo, muerte y humedad con focos y mezcla', async ({
  page,
}, testInfo) => {
  const consoleErrors = watchConsole(page);
  await openGame(page);
  let snap = await snapshot(page);
  const paletteById = new Map(
    snap.floorPalettes.map((entry) => [entry.roomId, entry]),
  );

  // Mezcla 20-30 % en salas con ambiente dominante y familias del ambiente.
  const mixture: string[] = [];
  let mixedRoomsChecked = 0;
  for (const room of snap.rooms) {
    const entry = paletteById.get(room.id);
    if (!entry || entry.ambient === 'mixed') continue;
    const decals = snap.decoration.filter(
      (decal) => roomAt(snap.rooms, decal.x, decal.y)?.id === room.id,
    );
    if (decals.length < 4) continue;
    const dominant = AMBIENT_FAMILIES[entry.ambient] ?? [];
    expect(
      decals.some((decal) => dominant.includes(decal.family)),
      `Sala ${room.id} (${entry.ambient}) debe usar familias dominantes`,
    ).toBe(true);
    const mixed = decals.filter((decal) => !dominant.includes(decal.family));
    const ratio = mixed.length / decals.length;
    expect(ratio, `Sala ${room.id} (${entry.ambient}) mezcla`).toBeGreaterThanOrEqual(0.2);
    expect(ratio, `Sala ${room.id} (${entry.ambient}) mezcla`).toBeLessThanOrEqual(0.3);
    mixedRoomsChecked += 1;
    mixture.push(
      `room${room.id}:${entry.ambient} decals=${decals.length} mix=${mixed.length} ratio=${ratio.toFixed(3)}`,
    );
  }
  expect(mixedRoomsChecked).toBeGreaterThan(0);

  // Focos: al menos dos salas concentran la decoración en una ventana 5×5.
  const clusters = snap.rooms
    .map((room) => {
      const decals = snap.decoration.filter(
        (decal) => roomAt(snap.rooms, decal.x, decal.y)?.id === room.id,
      );
      let peak = 0;
      let peakAt: Point | undefined;
      for (const decal of decals) {
        const count = decals.filter(
          (other) =>
            Math.max(Math.abs(other.x - decal.x), Math.abs(other.y - decal.y)) <= 2,
        ).length;
        if (count > peak) {
          peak = count;
          peakAt = { x: decal.x, y: decal.y };
        }
      }
      return { roomId: room.id, decals: decals.length, peak, peakAt };
    })
    .filter((entry) => entry.decals >= 4);
  expect(clusters.filter((entry) => entry.peak >= 8).length).toBeGreaterThanOrEqual(2);

  const neutralRoom = nearestRoom(snap, (sample) => sample.palette === 'neutral');
  const deathRoom = nearestRoom(snap, (sample) => sample.ambient === 'death');
  const humidRoom = nearestRoom(snap, (sample) => sample.ambient === 'humid');

  await saveScreenshot(page, 'ambiente-sala-neutra', testInfo);
  const neutral = await verifyPalette(
    page,
    snap,
    measurableTiles(snap, (x, y) => roomAt(snap.rooms, x, y)?.id === neutralRoom.room.id),
    neutralRoom.palette,
    `sala neutra ${neutralRoom.room.id}`,
  );

  const corridorTarget = nearestCorridorTile(snap);
  await walkTo(page, corridorTarget.x, corridorTarget.y);
  await settle(page);
  await settleLayout(page);
  snap = await snapshot(page);
  expect(snap.players[0]).toMatchObject({
    x: corridorTarget.x,
    y: corridorTarget.y,
  });
  await saveScreenshot(page, 'ambiente-pasillo', testInfo);
  const corridor = await verifyPalette(
    page,
    snap,
    measurableTiles(snap, (x, y) => !roomAt(snap.rooms, x, y)),
    'neutral',
    'pasillo',
  );
  expect(tileAt(snap, corridorTarget.x, corridorTarget.y)).toBe('floor');

  const deathTarget = roomFloorTile(deathRoom.room);
  await walkTo(page, deathTarget.x, deathTarget.y);
  await settle(page);
  await settleLayout(page);
  snap = await snapshot(page);
  expect(snap.players[0]).toMatchObject({ x: deathTarget.x, y: deathTarget.y });
  await saveScreenshot(page, 'ambiente-sala-muerte', testInfo);
  const death = await verifyPalette(
    page,
    snap,
    measurableTiles(snap, (x, y) => roomAt(snap.rooms, x, y)?.id === deathRoom.room.id),
    deathRoom.palette,
    `sala muerte ${deathRoom.room.id}`,
  );

  const humidTarget = roomFloorTile(humidRoom.room);
  await walkTo(page, humidTarget.x, humidTarget.y);
  await settle(page);
  await settleLayout(page);
  snap = await snapshot(page);
  expect(snap.players[0]).toMatchObject({ x: humidTarget.x, y: humidTarget.y });
  await saveScreenshot(page, 'ambiente-sala-humedad', testInfo);
  const humid = await verifyPalette(
    page,
    snap,
    measurableTiles(snap, (x, y) => roomAt(snap.rooms, x, y)?.id === humidRoom.room.id),
    humidRoom.palette,
    `sala humedad ${humidRoom.room.id}`,
  );

  // Los segundos tonos de las tres salas capturadas son distintos y la base es común.
  const seconds = new Set([
    PALETTE_SECONDS[neutralRoom.palette],
    PALETTE_SECONDS[deathRoom.palette],
    PALETTE_SECONDS[humidRoom.palette],
  ]);
  expect(seconds.size).toBe(3);
  expect(neutral.second.mean).not.toEqual(death.second.mean);
  expect(neutral.second.mean).not.toEqual(humid.second.mean);
  expect(death.second.mean).not.toEqual(humid.second.mean);

  const lines = [
    'TASK-0024 ambientes, focos y mezcla',
    `seed=${REFERENCE_SEED}`,
    `rooms=${snap.rooms.length} palettes=${snap.floorPalettes.map((entry) => `${entry.roomId}:${entry.ambient}`).join(' ')}`,
    ...mixture,
    `clusters ${clusters
      .map(
        (entry) =>
          `room${entry.roomId}:decals=${entry.decals}:peak5x5=${entry.peak}@(${entry.peakAt?.x},${entry.peakAt?.y})`,
      )
      .join(' ')}`,
    `captures=sala-neutra(room${neutralRoom.room.id},${neutralRoom.palette}) pasillo muerte(room${deathRoom.room.id},${deathRoom.palette}) humedad(room${humidRoom.room.id},${humidRoom.palette})`,
    `neutral second p1=(${neutral.second.x},${neutral.second.y}) ${neutral.second.mean.map((value) => value.toFixed(2)).join(',')}`,
    `corridor p1=(${corridor.second.x},${corridor.second.y}) ${corridor.second.mean.map((value) => value.toFixed(2)).join(',')}`,
    `death second p1=(${death.second.x},${death.second.y}) ${death.second.mean.map((value) => value.toFixed(2)).join(',')}`,
    `humid second p1=(${humid.second.x},${humid.second.y}) ${humid.second.mean.map((value) => value.toFixed(2)).join(',')}`,
    '',
  ];
  await writeArtifact(testInfo, 'ambientes.txt', lines.join('\n'));
  console.log(
    `TASK-0024 ambientes neutral=room${neutralRoom.room.id} death=room${deathRoom.room.id} humid=room${humidRoom.room.id} clusters=${clusters.filter((entry) => entry.peak >= 8).length}`,
  );

  expect(consoleErrors).toEqual([]);
});

test('lista blanca y familias 9 tierra, 10 ladrillo azul y 11 huesos', async ({
  page,
}, testInfo) => {
  const consoleErrors = watchConsole(page);
  await openGame(page);
  const snap = await snapshot(page);

  const whitelist = new Set(DECAL_WHITELIST.map((decal) => decal.id));
  const rowByFamily: Readonly<Record<string, number>> = {
    dirt: 9,
    blueBrick: 10,
    bones: 11,
  };
  const familiesSeen = new Set<string>();

  for (const decal of snap.decoration) {
    expect(whitelist.has(decal.type), `Decal ${decal.type} fuera de la lista blanca`).toBe(
      true,
    );
    expect(decal.type.startsWith(`${decal.family}-`), decal.type).toBe(true);
    const row = Number(decal.type.split('-')[1].replace(/\D/g, ''));
    expect(row, `Familia ${decal.family} en fila ${row}`).toBeGreaterThanOrEqual(7);
    if (decal.family in rowByFamily) {
      expect(row, `Familia ${decal.family}`).toBe(rowByFamily[decal.family]);
    }
    familiesSeen.add(decal.family);
  }

  for (const family of Object.keys(rowByFamily)) {
    expect(familiesSeen.has(family), `La semilla debe mostrar ${family}`).toBe(true);
    for (const decal of DECAL_WHITELIST.filter((entry) => entry.family === family)) {
      expect(decal.rect.sy / TILE_SIZE + 1, `${decal.id} fila`).toBe(
        rowByFamily[family],
      );
    }
  }

  // Evidencia visual: las tres familias en orden de fila, columnas e-g.
  const rows = [
    { label: '9 = tierra', rects: [DECAL_RECTS.dirt9e, DECAL_RECTS.dirt9f, DECAL_RECTS.dirt9g] },
    {
      label: '10 = ladrillo azul',
      rects: [
        DECAL_RECTS.blueBrick10e,
        DECAL_RECTS.blueBrick10f,
        DECAL_RECTS.blueBrick10g,
      ],
    },
    {
      label: '11 = huesos',
      rects: [DECAL_RECTS.bones11e, DECAL_RECTS.bones11f, DECAL_RECTS.bones11g],
    },
  ];
  const dataUrl = await page.evaluate(async (families) => {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const loaded = new Image();
      loaded.addEventListener('load', () => resolve(loaded), { once: true });
      loaded.addEventListener(
        'error',
        () => reject(new Error('No se pudo cargar tiles.png')),
        { once: true },
      );
      loaded.src = '/assets/32rogues/tiles.png';
    });

    const scale = 4;
    const cell = 32 * scale;
    const labelWidth = 150;
    const canvas = document.createElement('canvas');
    canvas.width = labelWidth + cell * 3;
    canvas.height = cell * families.length;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Falta contexto 2D');
    context.imageSmoothingEnabled = false;
    context.fillStyle = '#101418';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = '#e8e8e8';
    context.font = '16px monospace';
    context.textBaseline = 'middle';
    families.forEach((family, index) => {
      const top = index * cell;
      context.fillText(family.label, 8, top + cell / 2);
      family.rects.forEach((rect, column) => {
        context.drawImage(
          image,
          rect.sx,
          rect.sy,
          rect.sw,
          rect.sh,
          labelWidth + column * cell,
          top,
          cell,
          cell,
        );
      });
    });
    return canvas.toDataURL('image/png');
  }, rows);

  const familiesPath = artifactPath(testInfo, 'screenshots', 'familias-9-10-11.png');
  await mkdir(dirname(familiesPath), { recursive: true });
  await writeFile(
    familiesPath,
    Buffer.from(dataUrl.replace(/^data:image\/png;base64,/, ''), 'base64'),
  );
  await testInfo.attach('familias-9-10-11', {
    path: familiesPath,
    contentType: 'image/png',
  });

  const lines = [
    'TASK-0024 lista blanca y familias',
    `seed=${REFERENCE_SEED}`,
    `decorated=${snap.decoration.length} whitelist=${DECAL_WHITELIST.length}`,
    `families_seen=${[...familiesSeen].sort().join(',')}`,
    `row_mapping dirt=9 blueBrick=10 bones=11 verified=${Object.keys(rowByFamily).join(',')}`,
    `visual=artifacts/TASK-0024/attempt-1/floor-ambient-qa/screenshots/familias-9-10-11.png`,
    '',
  ];
  await writeArtifact(testInfo, 'familias.txt', lines.join('\n'));
  console.log(
    `TASK-0024 familias decals=${snap.decoration.length} seen=${[...familiesSeen].sort().join(',')}`,
  );

  expect(consoleErrors).toEqual([]);
});

test('otra semilla cambia decal y ambiente manteniendo base y damero', async ({
  page,
}, testInfo) => {
  const consoleErrors = watchConsole(page);

  await openGame(page);
  const reference = await snapshot(page);
  const firstCanvas = await page.locator('#game-canvas').evaluate(
    (element) => (element as HTMLCanvasElement).toDataURL('image/png'),
  );

  await openGame(page);
  const repeated = await snapshot(page);
  const secondCanvas = await page.locator('#game-canvas').evaluate(
    (element) => (element as HTMLCanvasElement).toDataURL('image/png'),
  );
  expect(repeated.floorPalettes).toEqual(reference.floorPalettes);
  expect(repeated.decoration).toEqual(reference.decoration);
  expect(secondCanvas).toBe(firstCanvas);

  await openGame(page, ALTERNATE_URL);
  const alternate = await snapshot(page);
  expect(alternate.seed).toBe(ALTERNATE_SEED);
  expect(alternate.decoration).not.toEqual(reference.decoration);
  expect(alternate.floorPalettes.map((entry) => entry.ambient)).not.toEqual(
    reference.floorPalettes.map((entry) => entry.ambient),
  );
  for (const entry of alternate.floorPalettes) {
    expect(entry.base).toBe(FLOOR_BASE);
    expect(entry.second).toBe(PALETTE_SECONDS[entry.palette]);
  }
  for (let y = 0; y < alternate.grid.height; y += 1) {
    for (let x = 0; x < alternate.grid.width; x += 1) {
      if (tileAt(alternate, x, y) !== 'floor') continue;
      expect(parityOf(x, y)).toBe((x + y) % 2);
    }
  }

  const alternateShot = await saveScreenshot(
    page,
    'ambiente-semilla-distinta',
    testInfo,
  );

  const lines = [
    'TASK-0024 determinismo de ambiente y decoración',
    `reference_seed=${REFERENCE_SEED}`,
    `alternate_seed=${alternate.seed}`,
    `same_seed_palettes_identical=${JSON.stringify(repeated.floorPalettes) === JSON.stringify(reference.floorPalettes)}`,
    `same_seed_decoration_identical=${JSON.stringify(repeated.decoration) === JSON.stringify(reference.decoration)}`,
    `same_seed_canvas_identical=${secondCanvas === firstCanvas}`,
    `reference_ambients=${reference.floorPalettes.map((entry) => `${entry.roomId}:${entry.ambient}`).join(' ')}`,
    `alternate_ambients=${alternate.floorPalettes.map((entry) => `${entry.roomId}:${entry.ambient}`).join(' ')}`,
    `decorations reference=${reference.decoration.length} alternate=${alternate.decoration.length}`,
    `alternate_shot_bytes=${alternateShot.length} sha256=${sha256(alternateShot)}`,
    `damero_parity_global=true base_common=${FLOOR_BASE}`,
    '',
  ];
  await writeArtifact(testInfo, 'determinismo-ambiente.txt', lines.join('\n'));
  console.log(
    `TASK-0024 determinismo ambiente ref=${reference.floorPalettes.map((entry) => entry.ambient).join(',')} alt=${alternate.floorPalettes.map((entry) => entry.ambient).join(',')} same_canvas=${secondCanvas === firstCanvas}`,
  );

  expect(consoleErrors).toEqual([]);
});
