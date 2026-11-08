import { mkdir, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { expect, test, type Page, type TestInfo } from '@playwright/test';
import type { GameSnapshot } from '../../src/host/debug';
import { walkTo } from './support';

const ARTIFACTS = 'artifacts/TASK-0016/attempt-1';
const SCREENSHOTS = `${ARTIFACTS}/screenshots`;

const TILE_SIZE = 32;
const RENDER_SCALE = 3;
const CANVAS_WIDTH = 2218;
const CANVAS_HEIGHT = 1248;
const MAP_OFFSET_BACKING = 485;

async function snapshot(page: Page): Promise<GameSnapshot> {
  return page.evaluate(() => window.__game!.snapshot());
}

async function openGame(page: Page, search = '/?seed=279837264'): Promise<void> {
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto(search);
  await page.waitForFunction(
    () => Boolean(window.__game) && window.__game!.snapshot().assetsLoaded,
  );
}

async function saveScreenshot(
  page: Page,
  name: string,
  testInfo: TestInfo,
  options: { fullPage?: boolean } = {},
): Promise<void> {
  const path = `${SCREENSHOTS}/${name}.png`;
  await mkdir(dirname(path), { recursive: true });
  await page.screenshot({ path, ...options });
  await testInfo.attach(name, { path, contentType: 'image/png' });
}

/**
 * Recorte del Canvas centrado en una coordenada del mundo. Convierte la
 * posición de mundo a píxeles de respaldo (3×) y de ahí a coordenadas CSS del
 * elemento para hacer un `clip` de página.
 */
async function saveCanvasCrop(
  page: Page,
  name: string,
  testInfo: TestInfo,
  worldX: number,
  worldY: number,
  size = 220,
): Promise<void> {
  const snap = await snapshot(page);
  const canvas = page.locator('#game-canvas');
  const box = await canvas.boundingBox();
  if (!box) throw new Error('No se pudo medir #game-canvas');

  const backingX = MAP_OFFSET_BACKING + (worldX - snap.camera.x) * RENDER_SCALE;
  const backingY = (worldY - snap.camera.y) * RENDER_SCALE;
  const cssX = box.x + (backingX / CANVAS_WIDTH) * box.width;
  const cssY = box.y + (backingY / CANVAS_HEIGHT) * box.height;

  const clipX = Math.round(
    Math.min(Math.max(cssX - size / 2, box.x), box.x + box.width - size),
  );
  const clipY = Math.round(
    Math.min(Math.max(cssY - size / 2, box.y), box.y + box.height - size),
  );

  const path = `${SCREENSHOTS}/${name}.png`;
  await mkdir(dirname(path), { recursive: true });
  // El recorte siempre cae dentro del marco del Canvas.
  expect(box.width).toBeGreaterThanOrEqual(size);
  expect(box.height).toBeGreaterThanOrEqual(size);
  const clip = {
    x: Math.min(clipX, box.x + box.width - size),
    y: Math.min(clipY, box.y + box.height - size),
    width: size,
    height: size,
  };
  await page.screenshot({ path, clip });
  await testInfo.attach(name, { path, contentType: 'image/png' });
}

function expectedCamera(snap: GameSnapshot): { x: number; y: number } {
  const player = snap.players[0];
  const rawX = Math.round((player.x + 0.5) * snap.tileSize - snap.viewport.width / 2);
  const rawY = Math.round((player.y + 0.5) * snap.tileSize - snap.viewport.height / 2);
  return {
    x: Math.min(Math.max(rawX, 0), snap.camera.maxX),
    y: Math.min(Math.max(rawY, 0), snap.camera.maxY),
  };
}

test('mapa generado por semilla: snapshot, cámara, debug, R y F2', async ({ page }, testInfo) => {
  const consoleErrors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });
  page.on('pageerror', (error) => consoleErrors.push(error.message));

  await openGame(page);
  const initial = await snapshot(page);

  expect(initial.grid.width).toBe(32);
  expect(initial.grid.height).toBe(32);
  expect(initial.grid.tiles).toHaveLength(1024);
  expect(initial.seed).toBe(279837264);
  expect(initial.rooms).toHaveLength(9);
  expect(initial.corridors).toHaveLength(10);
  expect(initial.doors).toHaveLength(18);
  expect(initial.spawns).toEqual({
    player: { x: 6, y: 8 },
    enemy: { x: 23, y: 28 },
    distance: 59,
  });
  expect(initial.players[0]).toMatchObject({ x: 6, y: 8 });
  expect(initial.enemies[0]).toMatchObject({ x: 23, y: 28 });
  expect(initial.camera).toEqual({ x: 0, y: 64, maxX: 608, maxY: 608 });
  expect(initial.camera.x).toBe(expectedCamera(initial).x);
  expect(initial.camera.y).toBe(expectedCamera(initial).y);

  await mkdir(ARTIFACTS, { recursive: true });
  await writeFile(
    `${ARTIFACTS}/snapshot.json`,
    `${JSON.stringify(initial, null, 2)}\n`,
    'utf8',
  );

  // Movimiento válido con teclado: ArrowRight mueve el cursor y Space ejecuta
  // Moverse; la cámara sigue al jugador.
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('Space');
  const moved = await snapshot(page);
  expect(moved.players[0]).toMatchObject({ x: 7, y: 8, mp: 5 });
  expect(moved.camera).toEqual({ x: 32, y: 64, maxX: 608, maxY: 608 });
  expect(moved.camera.x).toBe(expectedCamera(moved).x);
  expect(moved.camera.y).toBe(expectedCamera(moved).y);

  // F1: overlay con semilla, salas, huecos, spawns y pasillos anchos.
  const beforeDebug = moved;
  await page.keyboard.press('F1');
  const overlay = page.getByTestId('debug-overlay');
  await expect(overlay).toBeVisible();
  const debugText = await page.getByTestId('debug-content').textContent();
  expect(debugText).toContain('Semilla: 279837264');
  expect(debugText).toContain('Salas:');
  expect(debugText).toContain('0 (3,4) 7×9 large');
  expect(debugText).toContain('Huecos:');
  expect(debugText).toContain('(10,5) vertical sala 0');
  expect(debugText).toContain('Spawns: jugador (6,8) · enemigo (23,28) · distancia 59');
  expect(debugText).toContain('Pasillos anchos:');
  expect(debugText).toContain('F2 nueva semilla');
  await saveScreenshot(page, 'debug-on', testInfo);

  // F1 de nuevo: overlay oculto y snapshot intacto.
  await page.keyboard.press('F1');
  await expect(overlay).toBeHidden();
  const afterDebug = await snapshot(page);
  expect(afterDebug).toEqual(beforeDebug);
  await saveScreenshot(page, 'debug-off', testInfo);

  // R conserva la semilla y los spawns.
  await page.keyboard.press('r');
  const afterRestart = await snapshot(page);
  expect(afterRestart.seed).toBe(initial.seed);
  expect(afterRestart.spawns).toEqual(initial.spawns);
  expect(afterRestart.players[0]).toMatchObject({ x: 6, y: 8, mp: 6 });
  expect(afterRestart.grid.tiles).toEqual(initial.grid.tiles);

  // F2: semilla nueva y mapa regenerado.
  await page.keyboard.press('F2');
  const afterF2 = await snapshot(page);
  expect(afterF2.seed).not.toBe(afterRestart.seed);
  expect(afterF2.turn).toBe(1);
  expect(afterF2.status).toBe('playing');
  expect(afterF2.grid.tiles).not.toEqual(afterRestart.grid.tiles);
  expect(afterF2.rooms).not.toEqual(afterRestart.rooms);
  expect(afterF2.camera.maxX).toBe(608);
  expect(afterF2.camera.maxY).toBe(608);
  expect(afterF2.camera.x).toBe(expectedCamera(afterF2).x);
  expect(afterF2.camera.y).toBe(expectedCamera(afterF2).y);

  // Detalle de muros y pasillo ancho con la semilla de referencia. El jugador
  // se acerca a la esquina suroeste de la sala 0 con comandos reales para que
  // el pasillo ancho quede centrado en el viewport.
  await openGame(page);
  await walkTo(page, 3, 12);
  const corner = await snapshot(page);
  expect(corner.camera).toEqual({ x: 0, y: 192, maxX: 608, maxY: 608 });
  expect(corner.players[0]).toMatchObject({ x: 3, y: 12 });
  // Esquina suroeste de la sala 0: tile (3,12) ≈ mundo (112,400).
  await saveCanvasCrop(page, 'wall-corner', testInfo, 3.5 * TILE_SIZE, 11.5 * TILE_SIZE);
  // Pasillo ancho 0→1 en la columna x≈1-2, ahora visible sobre y≈15.
  await saveCanvasCrop(page, 'wide-corridor', testInfo, 2.5 * TILE_SIZE, 15.5 * TILE_SIZE);
  expect(corner.spawns?.player).toEqual({ x: 6, y: 8 });

  expect(consoleErrors).toEqual([]);
});
