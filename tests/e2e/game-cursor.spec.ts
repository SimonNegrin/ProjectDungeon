import { mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';
import { expect, test, type Page, type TestInfo } from '@playwright/test';
import {
  approachEnemy,
  moveCursorTo,
  openBspState,
  restart,
  settle,
  snapshot,
  walkTo,
} from './support';
import { artifactPath } from './artifacts';

const SEED = '/?seed=279837264';
const TILE_SIZE = 32;
const VIEWPORT_SIZE = 416;

async function openGame(page: Page): Promise<void> {
  await page.setViewportSize({ width: 1280, height: 720 });
  await openBspState(page, 279837264, SEED);
}

async function screenshot(page: Page, name: string, testInfo: TestInfo): Promise<void> {
  const path = artifactPath(testInfo, 'screenshots', `${name}.png`);
  await mkdir(dirname(path), { recursive: true });
  await page.screenshot({ path });
  await testInfo.attach(name, { path, contentType: 'image/png' });
}

test('humo del cursor: jugador, camino verde/ámbar, bloqueo y aviso HUD', async ({
  page,
}, testInfo) => {
  const consoleErrors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });
  page.on('pageerror', (error) => consoleErrors.push(error.message));

  await openGame(page);

  const start = await snapshot(page);
  expect(start.cursor).toMatchObject({
    x: start.players[0].x,
    y: start.players[0].y,
    visible: true,
    kind: 'player',
    state: 'player',
    path: [],
  });
  await expect(page.getByTestId('cursor')).toBeVisible();
  await expect(page.getByTestId('cursor')).toHaveAttribute('data-cursor-state', 'player');

  // El cursor ocupa exactamente un tile del sub-viewport 13×13.
  const frameBox = await page.getByTestId('frame').boundingBox();
  const cursorBox = await page.getByTestId('cursor').boundingBox();
  expect(frameBox).not.toBeNull();
  expect(cursorBox).not.toBeNull();
  if (frameBox && cursorBox) {
    const tile = frameBox.height / 13;
    const mapLeft = frameBox.x + (frameBox.width - frameBox.height) / 2;
    const expectedLeft =
      mapLeft + ((start.cursor.x * TILE_SIZE - start.camera.x) / VIEWPORT_SIZE) * frameBox.height;
    const expectedTop =
      frameBox.y + ((start.cursor.y * TILE_SIZE - start.camera.y) / VIEWPORT_SIZE) * frameBox.height;
    expect(cursorBox.width).toBeCloseTo(tile, 0);
    expect(cursorBox.height).toBeCloseTo(tile, 0);
    expect(cursorBox.x).toBeCloseTo(expectedLeft, 0);
    expect(cursorBox.y).toBeCloseTo(expectedTop, 0);
  }
  await screenshot(page, 'cursor-player', testInfo);

  // Camino verde: coste 2 dentro del MP; dos puntos fuertes y ninguno atenuado.
  await moveCursorTo(page, start.players[0].x + 2, start.players[0].y);
  const green = await snapshot(page);
  expect(green.camera).toEqual(start.camera);
  expect(green.cursor).toMatchObject({ state: 'reachable', kind: 'floor' });
  expect(green.cursor.path).toHaveLength(2);
  await expect(page.getByTestId('cursor')).toHaveAttribute('data-cursor-state', 'reachable');
  await expect(page.locator('[data-testid="cursor-path-point"].is-strong')).toHaveCount(2);
  await expect(page.locator('[data-testid="cursor-path-point"].is-faded')).toHaveCount(0);
  await screenshot(page, 'cursor-path-green', testInfo);

  // Camino ámbar: destino alcanzable con coste 13 > MP 6.
  await moveCursorTo(page, 11, 7);
  const amber = await snapshot(page);
  expect(amber.cursor).toMatchObject({ state: 'too-far', kind: 'floor' });
  expect(amber.cursor.path.length).toBeGreaterThan(amber.players[0].mp);
  const amberCost = amber.cursor.path.length;
  await expect(page.getByTestId('cursor')).toHaveAttribute('data-cursor-state', 'too-far');
  await expect(page.locator('[data-testid="cursor-path-point"].is-strong')).toHaveCount(
    amber.players[0].mp,
  );
  await expect(page.locator('[data-testid="cursor-path-point"].is-faded')).toHaveCount(
    amberCost - amber.players[0].mp,
  );
  await screenshot(page, 'cursor-path-amber', testInfo);

  // Rojo: el cursor cruza el muro, pero no hay camino ni puntos.
  await page.keyboard.press('r');
  const afterRestart = await snapshot(page);
  expect(afterRestart.cursor).toMatchObject({ state: 'player', visible: true });
  await moveCursorTo(page, 3, 3);
  const blocked = await snapshot(page);
  expect(blocked.cursor).toMatchObject({ state: 'invalid', kind: 'blocked', path: [] });
  await expect(page.getByTestId('cursor')).toHaveAttribute('data-cursor-state', 'invalid');
  await expect(page.locator('[data-testid="cursor-path-point"]')).toHaveCount(0);
  await screenshot(page, 'cursor-blocked', testInfo);

  // Moverse contra un muro se rechaza, avisa y no cambia el jugador.
  const beforeReject = await snapshot(page);
  await page.keyboard.press('Space');
  await settle(page);
  const afterReject = await snapshot(page);
  expect(afterReject.players).toEqual(beforeReject.players);
  expect(afterReject.cursor).toMatchObject({ x: 3, y: 3, state: 'invalid' });
  expect(afterReject.lastEvents).toEqual([
    { type: 'CommandRejected', commandType: 'MoveTo', reason: 'wall' },
  ]);
  await expect(page.getByTestId('hud-message')).toHaveText('Destino no válido');
  await expect(page.getByTestId('hud-message')).toBeVisible();
  await screenshot(page, 'hud-message', testInfo);
  await expect(page.getByTestId('hud-message')).toBeHidden({ timeout: 3000 });

  // Moverse en verde deja el cursor en el destino, que pasa a ser el jugador.
  await moveCursorTo(page, beforeReject.players[0].x + 1, beforeReject.players[0].y);
  await page.keyboard.press('Space');
  await settle(page);
  const moved = await snapshot(page);
  expect(moved.players[0]).toMatchObject({
    x: beforeReject.players[0].x + 1,
    y: beforeReject.players[0].y,
    mp: beforeReject.players[0].mp - 1,
    actionAvailable: true,
  });
  expect(moved.cursor).toMatchObject({
    x: moved.players[0].x,
    y: moved.players[0].y,
    state: 'player',
  });

  expect(consoleErrors).toEqual([]);
});

test('el cursor se recoloca al viewport cuando la cámara se desplaza', async ({ page }) => {
  const consoleErrors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });
  page.on('pageerror', (error) => consoleErrors.push(error.message));

  await openGame(page);
  const start = await snapshot(page);
  expect(start.cursor).toMatchObject({ x: 6, y: 8 });

  // El jugador recorre el mapa con comandos reales (sin tocar el cursor).
  await walkTo(page, 3, 27);
  const moved = await snapshot(page);
  expect(moved.players[0]).toMatchObject({ x: 3, y: 27 });
  expect(moved.camera).toEqual({ x: 0, y: 608, maxX: 608, maxY: 608 });

  const minX = Math.floor(moved.camera.x / TILE_SIZE);
  const minY = Math.floor(moved.camera.y / TILE_SIZE);
  const maxX = Math.ceil((moved.camera.x + VIEWPORT_SIZE) / TILE_SIZE) - 1;
  const maxY = Math.ceil((moved.camera.y + VIEWPORT_SIZE) / TILE_SIZE) - 1;
  expect(moved.cursor.x).toBeGreaterThanOrEqual(minX);
  expect(moved.cursor.x).toBeLessThanOrEqual(maxX);
  expect(moved.cursor.y).toBeGreaterThanOrEqual(minY);
  expect(moved.cursor.y).toBeLessThanOrEqual(maxY);
  expect(moved.cursor.visible).toBe(true);

  // Mover el cursor no desplaza la cámara.
  await page.keyboard.press('ArrowRight');
  const afterCursorMove = await snapshot(page);
  expect(afterCursorMove.cursor).toMatchObject({
    x: moved.cursor.x + 1,
    y: moved.cursor.y,
  });
  expect(afterCursorMove.camera).toEqual(moved.camera);

  await restart(page);
  expect(consoleErrors).toEqual([]);
});

test('humo del cursor sobre enemigo: marca de objetivo y ataque con F', async ({
  page,
}, testInfo) => {
  const consoleErrors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });
  page.on('pageerror', (error) => consoleErrors.push(error.message));

  await openGame(page);
  await approachEnemy(page);
  const adjacent = await snapshot(page);
  expect(
    Math.max(
      Math.abs(adjacent.players[0].x - adjacent.enemies[0].x),
      Math.abs(adjacent.players[0].y - adjacent.enemies[0].y),
    ),
  ).toBe(1);

  await moveCursorTo(page, adjacent.enemies[0].x, adjacent.enemies[0].y);
  const enemyTile = await snapshot(page);
  expect(enemyTile.cursor).toMatchObject({
    x: adjacent.enemies[0].x,
    y: adjacent.enemies[0].y,
    kind: 'enemy',
    state: 'enemy',
  });
  await expect(page.getByTestId('cursor')).toHaveAttribute('data-cursor-state', 'enemy');
  await expect(page.locator('[data-testid="cursor"] .cursor-mark')).toBeVisible();
  await screenshot(page, 'cursor-enemy', testInfo);

  await page.keyboard.press('f');
  await expect(page.getByTestId('attack-flash')).toHaveClass(/is-active/);
  await expect(page.getByTestId('damage-feedback')).toHaveText('-1');
  await expect(page.getByTestId('damage-feedback')).toBeVisible();
  const afterAttack = await snapshot(page);
  expect(afterAttack.enemies[0].hp).toBe(8);
  expect(afterAttack.players[0].actionAvailable).toBe(false);
  expect(afterAttack.cursor).toMatchObject({
    x: enemyTile.cursor.x,
    y: enemyTile.cursor.y,
  });
  await screenshot(page, 'cursor-attack', testInfo);

  expect(consoleErrors).toEqual([]);
});
