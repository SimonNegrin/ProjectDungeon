import { mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { expect, test, type Page, type TestInfo } from '@playwright/test';
import { GrowthMapGenerator } from '../../src/game/chambers/variants/growth';
import { createInitialState } from '../../src/game/engine';
import type { GameState } from '../../src/game/types';
import type { GameSnapshot } from '../../src/host/debug';
import { artifactPath } from './artifacts';

const SEED = 1;
const CAVERN_SEED = 6;
const WIDE_SEED = 4;
const DOOR_EXIT_SEED = 3;

test.use({ viewport: { width: 1280, height: 720 } });

async function open(page: Page, seed: number, testMode = false): Promise<GameSnapshot> {
  await page.goto(`/?seed=${seed}${testMode ? '&test=1' : ''}`);
  await page.waitForFunction(
    () => Boolean(window.__game) && window.__game!.snapshot().assetsLoaded,
  );
  return page.evaluate(() => window.__game!.snapshot());
}

async function loadAt(page: Page, seed: number, point: { x: number; y: number }): Promise<GameSnapshot> {
  await open(page, seed, true);
  const state = createInitialState({ seed, generator: new GrowthMapGenerator() });
  const player = state.players[0];
  const next: GameState = {
    ...state,
    players: [{ ...player, x: point.x, y: point.y, home: { x: point.x, y: point.y } }],
  };
  return page.evaluate(
    (serialized) => window.__game!.setup!(serialized),
    JSON.parse(JSON.stringify(next)),
  );
}

function growthState(seed: number): GameState {
  return createInitialState({ seed, generator: new GrowthMapGenerator() });
}

async function settleLayout(page: Page): Promise<void> {
  await page.evaluate(
    () =>
      new Promise<void>((resolveFrame) => {
        requestAnimationFrame(() => requestAnimationFrame(() => resolveFrame()));
      }),
  );
}

async function save(page: Page, testInfo: TestInfo, name: string): Promise<string> {
  const root = process.env.E2E_ARTIFACTS_DIR;
  const path = root
    ? resolve(process.cwd(), root, 'screenshots', `${name}.png`)
    : artifactPath(testInfo, 'screenshots', `${name}.png`);
  await mkdir(dirname(path), { recursive: true });
  await page.screenshot({ path });
  await testInfo.attach(name, { path, contentType: 'image/png' });
  return path;
}

async function canvasData(page: Page): Promise<string> {
  return page
    .locator('#game-canvas')
    .evaluate((canvas) => (canvas as HTMLCanvasElement).toDataURL());
}

function assertGrowthSnapshot(snapshot: GameSnapshot): void {
  expect(typeof snapshot.seed).toBe('number');
  expect(snapshot.rooms.length).toBeGreaterThanOrEqual(3);
  expect(snapshot.entrance).not.toBeNull();
  expect(snapshot.exit).not.toBeNull();
  expect(snapshot.spawns?.party).toHaveLength(6);
  expect(snapshot.spawns?.party?.[0]).toEqual(snapshot.spawns?.player);
  expect(snapshot.mapEnemies.length).toBeGreaterThan(0);
  expect(Array.isArray(snapshot.openMouths)).toBe(true);
  expect(Array.isArray(snapshot.hotspots)).toBe(true);
  for (const room of snapshot.rooms) {
    expect(room.cells?.length).toBe(room.area);
  }
  for (const door of snapshot.doors) {
    expect(snapshot.grid.tiles[door.y * snapshot.grid.width + door.x]).toBe('floor');
    expect(['wood', 'metal', 'grated']).toContain(door.style);
  }
  for (const enemy of snapshot.mapEnemies) {
    expect(enemy.home).toEqual({ x: enemy.x, y: enemy.y });
  }
}

test('juego growth normal, F1 on/off y mismo render determinista', async ({ page }, testInfo) => {
  const initial = await open(page, SEED);
  assertGrowthSnapshot(initial);
  expect(initial.cavernRoomId).toBeNull();
  await settleLayout(page);
  const normal = await canvasData(page);
  await save(page, testInfo, 'growth-normal');

  const hudBefore = await page.getByTestId('hud').innerText();
  await page.keyboard.press('F1');
  await expect(page.getByTestId('debug-overlay')).toBeVisible();
  await settleLayout(page);
  const debugText = await page.getByTestId('debug-content').innerText();
  expect(debugText).toContain('Spawn: sala');
  expect(debugText).toContain('Salida:');
  expect(debugText).toContain('Bocas sin puerta:');
  expect(debugText).toContain('Enemigos del generador:');
  expect(debugText).toContain('Puntos calientes:');
  expect(debugText).toContain('Caverna: ninguna');
  expect(await page.getByTestId('hud').innerText()).toBe(hudBefore);
  const debugCanvas = await canvasData(page);
  expect(debugCanvas).not.toBe(normal);
  await save(page, testInfo, 'growth-debug-on');

  await page.keyboard.press('F1');
  await expect(page.getByTestId('debug-overlay')).toBeHidden();
  await settleLayout(page);
  expect(await canvasData(page)).toBe(normal);
  await save(page, testInfo, 'growth-debug-off');

  // La misma semilla produce el mismo snapshot y el mismo canvas.
  const reloaded = await open(page, SEED);
  await settleLayout(page);
  expect(reloaded.grid.tiles).toEqual(initial.grid.tiles);
  expect(reloaded.rooms).toEqual(initial.rooms);
  expect(reloaded.mapEnemies).toEqual(initial.mapEnemies);
  expect(await canvasData(page)).toBe(normal);
});

test('caverna growth: máscara irregular y F1', async ({ page }, testInfo) => {
  const snapshot = await open(page, CAVERN_SEED);
  assertGrowthSnapshot(snapshot);
  expect(snapshot.cavernRoomId).not.toBeNull();
  const cavern = snapshot.rooms.find((room) => room.id === snapshot.cavernRoomId)!;
  const maskKeys = new Set(cavern.cells!.map((cell) => `${cell.x},${cell.y}`));
  let irregular = 0;
  for (let y = cavern.y; y < cavern.y + cavern.height; y += 1) {
    for (let x = cavern.x; x < cavern.x + cavern.width; x += 1) {
      if (!maskKeys.has(`${x},${y}`)) irregular += 1;
    }
  }
  expect(irregular).toBeGreaterThan(0);

  await page.keyboard.press('F1');
  await expect(page.getByTestId('debug-overlay')).toBeVisible();
  expect(await page.getByTestId('debug-content').innerText()).toContain(
    `Caverna: sala ${snapshot.cavernRoomId}`,
  );
  await settleLayout(page);
  await save(page, testInfo, 'growth-cavern-debug');
});

test('pasillo ancho, spawn y 13×13 con F1', async ({ page }, testInfo) => {
  const state = growthState(WIDE_SEED);
  const corridor = state.map!.corridors.find((item) => item.width === 2)!;
  expect(corridor).toBeDefined();
  const point = corridor.path[Math.floor(corridor.path.length / 2)];
  const snapshot = await loadAt(page, WIDE_SEED, point);
  expect(snapshot.corridors.some((item) => item.width === 2)).toBe(true);
  expect(snapshot.viewport).toEqual({ width: 416, height: 416 });
  expect(snapshot.viewport.width / snapshot.tileSize).toBe(13);
  expect(snapshot.viewport.height / snapshot.tileSize).toBe(13);

  await page.keyboard.press('F1');
  await expect(page.getByTestId('debug-overlay')).toBeVisible();
  await settleLayout(page);
  await save(page, testInfo, 'growth-wide-corridor-debug');
  await save(page, testInfo, 'growth-13x13');

  const spawnState = growthState(SEED);
  const spawn = spawnState.map!.spawns;
  const spawnSnapshot = await loadAt(page, SEED, spawn.player);
  expect(spawnSnapshot.spawns?.party).toHaveLength(6);
  await page.keyboard.press('F1');
  await settleLayout(page);
  await save(page, testInfo, 'growth-spawn-debug');
});

test('entrada y salida: escalera y puerta de borde con F1', async ({ page }, testInfo) => {
  const stairs = growthState(SEED).map!.exit!;
  expect(stairs.kind).toBe('stairs-up');
  const stairsSnapshot = await loadAt(page, SEED, stairs.access);
  expect(stairsSnapshot.exit).toMatchObject({
    kind: 'stairs-up',
    position: stairs.position,
  });
  await page.keyboard.press('F1');
  await settleLayout(page);
  await save(page, testInfo, 'growth-exit-stairs-debug');

  const door = growthState(DOOR_EXIT_SEED).map!.exit!;
  expect(door.kind).toBe('door');
  const doorSnapshot = await loadAt(page, DOOR_EXIT_SEED, door.access);
  expect(doorSnapshot.exit).toMatchObject({ kind: 'door', position: door.position });
  await page.keyboard.press('F1');
  await settleLayout(page);
  await save(page, testInfo, 'growth-exit-door-debug');
});
