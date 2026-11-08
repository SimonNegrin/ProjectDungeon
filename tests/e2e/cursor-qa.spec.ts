import { mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';
import { expect, test, type Page, type TestInfo } from '@playwright/test';
import type { GameSnapshot } from '../../src/host/debug';
import {
  approachEnemy,
  defeatAllEnemies,
  ensureAdjacentWithMp,
  moveAwayFromEnemy,
  moveCursorTo,
  restart,
  retreatEnemyOutOfReach,
  settle,
  snapshot,
  visibleRange,
} from './support';
import { artifactPath } from './artifacts';

const SEED = 279837264;
const SEED_URL = `/?seed=${SEED}`;

function trackConsoleErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  page.on('pageerror', (error) => errors.push(error.message));
  return errors;
}

async function openGame(page: Page): Promise<void> {
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto(SEED_URL);
  await page.waitForFunction(
    () => Boolean(window.__game) && window.__game!.snapshot().assetsLoaded,
  );
}

async function screenshot(page: Page, name: string, testInfo: TestInfo): Promise<void> {
  const path = artifactPath(testInfo, 'screenshots', `${name}.png`);
  await mkdir(dirname(path), { recursive: true });
  await page.screenshot({ path });
  await testInfo.attach(name, { path, contentType: 'image/png' });
}

async function cursorVisual(page: Page) {
  return page.getByTestId('cursor').evaluate((element) => {
    const style = window.getComputedStyle(element);
    return {
      borderStyle: style.borderTopStyle,
      borderColor: style.borderTopColor,
      borderWidth: style.borderTopWidth,
    };
  });
}

function findTile(
  snap: GameSnapshot,
  wanted: 'wall' | 'floor',
): { x: number; y: number } {
  const range = visibleRange(snap);
  for (let y = range.minY; y <= range.maxY; y += 1) {
    for (let x = range.minX; x <= range.maxX; x += 1) {
      if (snap.grid.tiles[y * snap.grid.width + x] === wanted) return { x, y };
    }
  }
  throw new Error(`No hay ningún tile ${wanted} en el viewport.`);
}

function distance(a: { x: number; y: number }, b: { x: number; y: number }): number {
  return Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y));
}

test('cursor inicial, teclado en cuatro direcciones y borde del viewport', async ({
  page,
}, testInfo) => {
  const consoleErrors = trackConsoleErrors(page);
  await openGame(page);

  const start = await snapshot(page);
  expect(start.seed).toBe(SEED);
  expect(start.players[0]).toMatchObject({ x: 6, y: 8 });
  expect(start.cursor).toMatchObject({
    x: 6,
    y: 8,
    visible: true,
    kind: 'player',
    state: 'player',
    path: [],
  });
  await expect(page.getByTestId('cursor')).toBeVisible();
  await expect(page.getByTestId('cursor')).toHaveAttribute('data-cursor-state', 'player');
  await expect(page.locator('[data-testid="cursor-path-point"]')).toHaveCount(0);

  // Un tile cuadrado dentro del sub-viewport 13×13, sin otro marco sobre el jugador.
  const frame = await page.getByTestId('frame').boundingBox();
  const cursor = await page.getByTestId('cursor').boundingBox();
  expect(frame).not.toBeNull();
  expect(cursor).not.toBeNull();
  if (frame && cursor) {
    expect(cursor.width).toBeCloseTo(frame.height / 13, 0);
    expect(cursor.height).toBeCloseTo(frame.height / 13, 0);
  }
  expect(await cursorVisual(page)).toMatchObject({
    borderStyle: 'solid',
    borderColor: 'rgba(255, 255, 255, 0.92)',
  });
  await screenshot(page, 'cursor-player', testInfo);

  const moves: Array<[string, number, number]> = [
    ['ArrowRight', 1, 0],
    ['ArrowDown', 0, 1],
    ['ArrowLeft', -1, 0],
    ['ArrowUp', 0, -1],
    ['d', 1, 0],
    ['s', 0, 1],
    ['a', -1, 0],
    ['w', 0, -1],
  ];

  for (const [key, dx, dy] of moves) {
    const before = await snapshot(page);
    await page.keyboard.press(key);
    const after = await snapshot(page);
    expect(after.cursor, `${key} mueve el cursor un tile`).toMatchObject({
      x: before.cursor.x + dx,
      y: before.cursor.y + dy,
    });
    expect(after.players[0]).toEqual(start.players[0]);
    expect(after.camera).toEqual(start.camera);
    expect(after.turn).toBe(start.turn);
    expect(after.phase).toBe('player');
  }
  expect((await snapshot(page)).cursor).toMatchObject({ x: 6, y: 8 });
  await expect(page.getByTestId('hud-player-mp')).toHaveText('6/6');

  // En el borde derecho del viewport el cursor no avanza ni hace wrap.
  const range = visibleRange(start);
  expect(range.maxX - range.minX + 1).toBe(13);
  expect(range.maxY - range.minY + 1).toBe(13);
  let previousX = (await snapshot(page)).cursor.x;
  for (let guard = 0; guard < 64; guard += 1) {
    await page.keyboard.press('ArrowRight');
    const current = (await snapshot(page)).cursor;
    if (current.x === previousX) break;
    previousX = current.x;
  }
  expect(previousX).toBe(range.maxX);
  const atEdge = await snapshot(page);
  await page.keyboard.press('ArrowRight');
  const afterEdge = await snapshot(page);
  expect(afterEdge.cursor).toMatchObject({ x: range.maxX, y: atEdge.cursor.y });
  expect(afterEdge.camera).toEqual(start.camera);
  expect(afterEdge.players[0]).toEqual(start.players[0]);
  expect(afterEdge.turn).toBe(start.turn);

  expect(consoleErrors).toEqual([]);
});

test('estados, patrones de borde y caminos verde y ámbar en dos tonos', async ({
  page,
}, testInfo) => {
  const consoleErrors = trackConsoleErrors(page);
  await openGame(page);

  const start = await snapshot(page);
  const wall = findTile(start, 'wall');
  await moveCursorTo(page, wall.x, wall.y);
  const blocked = await snapshot(page);
  expect(blocked.cursor).toMatchObject({
    x: wall.x,
    y: wall.y,
    visible: true,
    kind: 'blocked',
    state: 'invalid',
    path: [],
  });
  await expect(page.getByTestId('cursor')).toHaveAttribute('data-cursor-state', 'invalid');
  await expect(page.locator('[data-testid="cursor-path-point"]')).toHaveCount(0);
  expect(await cursorVisual(page)).toMatchObject({
    borderStyle: 'double',
    borderColor: 'rgb(248, 113, 113)',
  });

  await restart(page);
  await expect(page.getByTestId('cursor')).toHaveAttribute('data-cursor-state', 'player');
  await expect(page.locator('[data-testid="cursor-path-point"]')).toHaveCount(0);
  expect(await cursorVisual(page)).toMatchObject({
    borderStyle: 'solid',
    borderColor: 'rgba(255, 255, 255, 0.92)',
  });

  // Verde: destino a dos pasos, por debajo del MP; camino completo en tono fuerte.
  const greenTarget = { x: start.players[0].x + 2, y: start.players[0].y };
  await moveCursorTo(page, greenTarget.x, greenTarget.y);
  const green = await snapshot(page);
  expect(green.cursor).toMatchObject({
    x: greenTarget.x,
    y: greenTarget.y,
    kind: 'floor',
    state: 'reachable',
  });
  expect(green.cursor.path.length).toBeGreaterThan(0);
  expect(green.cursor.path.length).toBeLessThanOrEqual(green.players[0].mp);
  expect(green.cursor.path).not.toContainEqual(green.players[0]);
  expect(green.cursor.path).not.toContainEqual(green.enemies[0]);
  const greenRange = visibleRange(green);
  for (const point of green.cursor.path) {
    expect(point.x).toBeGreaterThanOrEqual(greenRange.minX);
    expect(point.x).toBeLessThanOrEqual(greenRange.maxX);
    expect(point.y).toBeGreaterThanOrEqual(greenRange.minY);
    expect(point.y).toBeLessThanOrEqual(greenRange.maxY);
  }
  await expect(page.getByTestId('cursor')).toHaveAttribute('data-cursor-state', 'reachable');
  await expect(page.locator('[data-testid="cursor-path-point"].is-strong')).toHaveCount(
    green.cursor.path.length,
  );
  await expect(page.locator('[data-testid="cursor-path-point"].is-faded')).toHaveCount(0);
  expect(await cursorVisual(page)).toMatchObject({
    borderStyle: 'solid',
    borderColor: 'rgb(74, 222, 128)',
  });
  await screenshot(page, 'cursor-path-green', testInfo);

  // Ámbar: coste mayor que el MP; el tramo alcanzable es fuerte y el resto atenuado.
  await moveCursorTo(page, 11, 7);
  const amber = await snapshot(page);
  expect(amber.cursor).toMatchObject({ x: 11, y: 7, kind: 'floor', state: 'too-far' });
  expect(amber.cursor.path.length).toBeGreaterThan(amber.players[0].mp);
  expect(amber.cursor.path).not.toEqual(green.cursor.path);
  await expect(page.getByTestId('cursor')).toHaveAttribute('data-cursor-state', 'too-far');
  await expect(page.locator('[data-testid="cursor-path-point"].is-strong')).toHaveCount(
    amber.players[0].mp,
  );
  await expect(page.locator('[data-testid="cursor-path-point"].is-faded')).toHaveCount(
    amber.cursor.path.length - amber.players[0].mp,
  );
  expect(amber.players[0].mp).toBeGreaterThan(0);
  expect(amber.cursor.path.length - amber.players[0].mp).toBeGreaterThan(0);
  expect(await cursorVisual(page)).toMatchObject({
    borderStyle: 'dashed',
    borderColor: 'rgb(251, 191, 36)',
  });
  await screenshot(page, 'cursor-path-amber', testInfo);

  expect(consoleErrors).toEqual([]);
});

test('Moverse en verde: llega al cursor y gasta el coste exacto sin consumir acción', async ({
  page,
}) => {
  const consoleErrors = trackConsoleErrors(page);
  await openGame(page);

  const start = await snapshot(page);
  const target = { x: start.players[0].x + 2, y: start.players[0].y };
  await moveCursorTo(page, target.x, target.y);
  const planned = await snapshot(page);
  expect(planned.cursor).toMatchObject({ kind: 'floor', state: 'reachable' });
  const cost = planned.cursor.path.length;
  expect(cost).toBeGreaterThan(0);

  await page.keyboard.press('Space');
  await settle(page);
  const moved = await snapshot(page);
  expect(moved.players[0]).toMatchObject({
    x: target.x,
    y: target.y,
    mp: start.players[0].mp - cost,
    actionAvailable: true,
  });
  expect(moved.turn).toBe(start.turn);
  expect(moved.status).toBe('playing');
  expect(moved.cursor).toMatchObject({
    x: target.x,
    y: target.y,
    visible: true,
    state: 'player',
    path: [],
  });
  expect(moved.lastEvents.filter((event) => event.type === 'UnitMoved')).toHaveLength(cost);
  expect(moved.lastEvents.some((event) => event.type === 'AttackPerformed')).toBe(false);
  await expect(page.getByTestId('hud-player-mp')).toHaveText(
    `${start.players[0].mp - cost}/6`,
  );
  await expect(page.getByTestId('hud-action')).toHaveText('Sí');

  // El camino se recalcula al mover al jugador y al mover el cursor.
  await page.keyboard.press('ArrowRight');
  const next = await snapshot(page);
  expect(next.cursor).toMatchObject({ x: target.x + 1, y: target.y });
  expect(next.cursor.path.length).toBe(1);
  expect(next.cursor.path.at(-1)).toEqual({ x: target.x + 1, y: target.y });

  expect(consoleErrors).toEqual([]);
});

test('Moverse en ámbar avanza hasta agotar MP y en rojo no altera el estado', async ({
  page,
}, testInfo) => {
  const consoleErrors = trackConsoleErrors(page);
  await openGame(page);

  const start = await snapshot(page);
  await moveCursorTo(page, 11, 7);
  const planned = await snapshot(page);
  expect(planned.cursor).toMatchObject({ kind: 'floor', state: 'too-far' });
  const cost = planned.cursor.path.length;
  const mp = planned.players[0].mp;
  expect(cost).toBeGreaterThan(mp);
  const steps = Math.min(cost, mp);
  const expected = planned.cursor.path[steps - 1];
  const enemyHp = planned.enemies[0].hp;

  await page.keyboard.press('Space');
  await settle(page);
  const moved = await snapshot(page);
  expect(moved.players[0]).toMatchObject({
    x: expected.x,
    y: expected.y,
    mp: 0,
    actionAvailable: true,
  });
  expect(moved.turn).toBe(start.turn);
  expect(moved.enemies[0].hp).toBe(enemyHp);
  expect(moved.lastEvents.some((event) => event.type === 'AttackPerformed')).toBe(false);
  expect(moved.cursor).toMatchObject({
    x: 11,
    y: 7,
    visible: true,
    kind: 'floor',
    state: 'too-far',
  });
  await expect(page.locator('[data-testid="cursor-path-point"].is-strong')).toHaveCount(0);
  await expect(page.locator('[data-testid="cursor-path-point"].is-faded')).toHaveCount(
    moved.cursor.path.length,
  );
  await screenshot(page, 'cursor-move-amber', testInfo);

  // Rojo: el muro no mueve, no gasta MP ni acción y avisa.
  await restart(page);
  const afterRestart = await snapshot(page);
  const wall = findTile(afterRestart, 'wall');
  await moveCursorTo(page, wall.x, wall.y);
  const beforeReject = await snapshot(page);
  expect(beforeReject.cursor).toMatchObject({ state: 'invalid', path: [] });
  await page.keyboard.press('Space');
  await settle(page);
  const afterReject = await snapshot(page);
  expect(afterReject.players).toEqual(beforeReject.players);
  expect(afterReject.turn).toBe(beforeReject.turn);
  expect(afterReject.phase).toBe(beforeReject.phase);
  expect(afterReject.status).toBe(beforeReject.status);
  expect(afterReject.lastEvents).toEqual([
    { type: 'CommandRejected', commandType: 'MoveTo', reason: 'wall' },
  ]);
  await expect(page.getByTestId('hud-message')).toHaveText('Destino no válido');
  await expect(page.getByTestId('hud-message')).toBeVisible();
  await screenshot(page, 'hud-message', testInfo);
  await expect(page.getByTestId('hud-message')).toBeHidden({ timeout: 3000 });

  expect(consoleErrors).toEqual([]);
});

test('enemigo adyacente: marca, ataque directo con F, fin de turno y victoria', async ({
  page,
}, testInfo) => {
  const consoleErrors = trackConsoleErrors(page);
  await openGame(page);
  await approachEnemy(page);

  const adjacent = await snapshot(page);
  expect(distance(adjacent.players[0], adjacent.enemies[0])).toBe(1);
  await moveCursorTo(page, adjacent.enemies[0].x, adjacent.enemies[0].y);
  const selected = await snapshot(page);
  expect(selected.cursor).toMatchObject({
    x: adjacent.enemies[0].x,
    y: adjacent.enemies[0].y,
    visible: true,
    kind: 'enemy',
    state: 'enemy',
    path: [],
  });
  expect(selected.cursor.attackTile).toEqual({
    x: selected.players[0].x,
    y: selected.players[0].y,
  });
  await expect(page.getByTestId('cursor')).toHaveAttribute('data-cursor-state', 'enemy');
  await expect(page.locator('[data-testid="cursor"] .cursor-mark')).toBeVisible();
  expect(await cursorVisual(page)).toMatchObject({
    borderStyle: 'double',
    borderColor: 'rgb(248, 113, 113)',
  });
  await screenshot(page, 'cursor-enemy', testInfo);

  // F ataca sin moverse ni gastar MP.
  await page.keyboard.press('f');
  await expect(page.getByTestId('attack-flash')).toHaveClass(/is-active/);
  await expect(page.getByTestId('damage-feedback')).toHaveText('-1');
  await expect(page.getByTestId('damage-feedback')).toBeVisible();
  const afterF = await snapshot(page);
  expect(afterF.enemies[0].hp).toBe(selected.enemies[0].hp - 1);
  expect(afterF.players[0]).toMatchObject({
    x: selected.players[0].x,
    y: selected.players[0].y,
    mp: selected.players[0].mp,
    actionAvailable: false,
  });
  expect(afterF.cursor).toMatchObject({
    x: selected.cursor.x,
    y: selected.cursor.y,
  });
  expect(afterF.lastEvents).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        type: 'AttackPerformed',
        attackerId: 'player-1',
        targetId: 'enemy-1',
        damage: 1,
      }),
    ]),
  );
  await screenshot(page, 'cursor-attack', testInfo);

  // E ejecuta la fase enemiga y devuelve el cursor al jugador.
  const beforeEndTurn = await snapshot(page);
  await page.keyboard.press('e');
  await settle(page);
  const afterEndTurn = await snapshot(page);
  expect(afterEndTurn.phase).toBe('player');
  expect(afterEndTurn.turn).toBe(beforeEndTurn.turn + 1);
  expect(afterEndTurn.lastEvents.map((event) => event.type)).toEqual(
    expect.arrayContaining(['EnemyPhaseStarted', 'PlayerTurnStarted']),
  );
  expect(afterEndTurn.players[0]).toMatchObject({
    hp: beforeEndTurn.players[0].hp - 4,
    mp: 6,
    actionAvailable: true,
  });
  expect(afterEndTurn.cursor).toMatchObject({
    x: afterEndTurn.players[0].x,
    y: afterEndTurn.players[0].y,
    visible: true,
    state: 'player',
  });

  // Ya adyacente y con acción: Espacio ataca sin moverse ni gastar MP.
  await moveCursorTo(page, afterEndTurn.enemies[0].x, afterEndTurn.enemies[0].y);
  const beforeVictory = await snapshot(page);
  expect(distance(beforeVictory.players[0], beforeVictory.enemies[0])).toBe(1);
  await page.keyboard.press('Space');
  await settle(page);
  const afterFirstKill = await snapshot(page);
  expect(afterFirstKill.enemies[0].hp).toBe(0);
  expect(afterFirstKill.players[0]).toMatchObject({
    x: beforeVictory.players[0].x,
    y: beforeVictory.players[0].y,
    mp: beforeVictory.players[0].mp,
  });

  if (afterFirstKill.status === 'playing') await defeatAllEnemies(page);
  const victory = await snapshot(page);
  expect(victory.status).toBe('victory');
  expect(victory.enemies.every((enemy) => enemy.hp === 0)).toBe(true);
  await expect(page.getByTestId('cursor')).toBeHidden();
  await expect(page.locator('[data-testid="cursor-path-point"]')).toHaveCount(0);
  await expect(page.getByTestId('overlay-victory')).toBeVisible();

  expect(consoleErrors).toEqual([]);
});

test('enemigo no adyacente: camino al tile de ataque, F rechazado y Moverse ataca', async ({
  page,
}, testInfo) => {
  const consoleErrors = trackConsoleErrors(page);
  await openGame(page);
  await approachEnemy(page);
  await ensureAdjacentWithMp(page, 2);
  expect(await moveAwayFromEnemy(page)).toBe(true);

  const retreated = await snapshot(page);
  expect(distance(retreated.players[0], retreated.enemies[0])).toBe(2);
  await moveCursorTo(page, retreated.enemies[0].x, retreated.enemies[0].y);
  const selected = await snapshot(page);
  expect(selected.cursor).toMatchObject({
    kind: 'enemy',
    state: 'enemy',
    visible: true,
  });
  expect(selected.cursor.path.length).toBeGreaterThan(0);
  const attackTile = selected.cursor.attackTile;
  expect(attackTile).toBeDefined();
  if (attackTile) {
    expect(selected.cursor.path.at(-1)).toEqual(attackTile);
    expect(distance(attackTile, selected.enemies[0])).toBe(1);
  }
  expect(selected.cursor.path).not.toContainEqual(selected.enemies[0]);
  expect(selected.cursor.path).not.toContainEqual(selected.players[0]);
  await screenshot(page, 'cursor-enemy-path', testInfo);

  // F fuera de rango: no mueve, no gasta acción y avisa.
  await page.keyboard.press('f');
  const afterF = await snapshot(page);
  expect(afterF.players).toEqual(selected.players);
  expect(afterF.enemies).toEqual(selected.enemies);
  expect(afterF.turn).toBe(selected.turn);
  expect(afterF.lastEvents).toEqual([
    { type: 'CommandRejected', commandType: 'Attack', reason: 'target-not-adjacent' },
  ]);
  await expect(page.getByTestId('hud-message')).toHaveText('Enemigo fuera de alcance');
  await expect(page.getByTestId('hud-message')).toBeVisible();

  // El aviso no bloquea: Espacio mueve hasta el tile de ataque y ataca.
  const beforeMoveTo = await snapshot(page);
  const cost = beforeMoveTo.cursor.path.length;
  await page.keyboard.press('Space');
  await settle(page);
  const afterMoveTo = await snapshot(page);
  expect(afterMoveTo.players[0]).toMatchObject({
    x: attackTile!.x,
    y: attackTile!.y,
    mp: beforeMoveTo.players[0].mp - cost,
    actionAvailable: false,
  });
  expect(afterMoveTo.enemies[0].hp).toBe(beforeMoveTo.enemies[0].hp - 1);
  expect(afterMoveTo.cursor).toMatchObject({
    x: beforeMoveTo.enemies[0].x,
    y: beforeMoveTo.enemies[0].y,
    kind: 'enemy',
    state: 'enemy',
    path: [],
  });
  expect(afterMoveTo.lastEvents).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        type: 'AttackPerformed',
        attackerId: 'player-1',
        targetId: 'enemy-1',
        damage: 1,
      }),
    ]),
  );
  await expect(page.getByTestId('hud-message')).toBeHidden({ timeout: 3000 });

  expect(consoleErrors).toEqual([]);
});

test('enemigo alcanzable sin acción: Espacio se acerca al tile de ataque sin dañar', async ({
  page,
}) => {
  const consoleErrors = trackConsoleErrors(page);
  await openGame(page);
  await approachEnemy(page);
  await ensureAdjacentWithMp(page, 2);

  const adjacent = await snapshot(page);
  await moveCursorTo(page, adjacent.enemies[0].x, adjacent.enemies[0].y);
  await page.keyboard.press('f');
  const afterAttack = await snapshot(page);
  expect(afterAttack.players[0].actionAvailable).toBe(false);
  expect(afterAttack.enemies[0].hp).toBe(8);

  expect(await moveAwayFromEnemy(page)).toBe(true);
  const retreated = await snapshot(page);
  await moveCursorTo(page, retreated.enemies[0].x, retreated.enemies[0].y);
  const planned = await snapshot(page);
  expect(planned.cursor).toMatchObject({ kind: 'enemy', state: 'enemy' });
  expect(planned.cursor.path.length).toBeGreaterThan(0);
  expect(planned.cursor.path.length).toBeLessThanOrEqual(planned.players[0].mp);
  const attackTile = planned.cursor.attackTile!;
  const steps = planned.cursor.path.length;

  await page.keyboard.press('Space');
  await settle(page);
  const moved = await snapshot(page);
  expect(moved.players[0]).toMatchObject({
    x: attackTile.x,
    y: attackTile.y,
    mp: planned.players[0].mp - steps,
    actionAvailable: false,
  });
  expect(moved.enemies[0].hp).toBe(planned.enemies[0].hp);
  expect(moved.lastEvents.some((event) => event.type === 'AttackPerformed')).toBe(false);
  expect(moved.cursor).toMatchObject({
    x: retreated.enemies[0].x,
    y: retreated.enemies[0].y,
    kind: 'enemy',
  });

  expect(consoleErrors).toEqual([]);
});

test('enemigo adyacente sin acción: Espacio no mueve, no ataca y avisa', async ({ page }) => {
  const consoleErrors = trackConsoleErrors(page);
  await openGame(page);
  await approachEnemy(page);
  const adjacent = await snapshot(page);
  await moveCursorTo(page, adjacent.enemies[0].x, adjacent.enemies[0].y);
  await page.keyboard.press('f');
  const beforeReject = await snapshot(page);
  expect(beforeReject.players[0].actionAvailable).toBe(false);
  expect(distance(beforeReject.players[0], beforeReject.enemies[0])).toBe(1);

  await page.keyboard.press('Space');
  await settle(page);
  const afterReject = await snapshot(page);
  expect(afterReject.players).toEqual(beforeReject.players);
  expect(afterReject.enemies).toEqual(beforeReject.enemies);
  expect(afterReject.turn).toBe(beforeReject.turn);
  expect(afterReject.lastEvents).toEqual([
    { type: 'CommandRejected', commandType: 'MoveTo', reason: 'no-action' },
  ]);
  expect(afterReject.cursor).toMatchObject({
    x: beforeReject.enemies[0].x,
    y: beforeReject.enemies[0].y,
    state: 'enemy',
  });
  await expect(page.getByTestId('hud-message')).toHaveText('Sin acción');
  await expect(page.getByTestId('hud-message')).toBeVisible();
  await expect(page.getByTestId('hud-message')).toBeHidden({ timeout: 3000 });

  expect(consoleErrors).toEqual([]);
});

test('enemigo demasiado lejano: avance parcial hasta agotar MP sin atacar', async ({
  page,
}, testInfo) => {
  const consoleErrors = trackConsoleErrors(page);
  await openGame(page);
  await approachEnemy(page);
  await ensureAdjacentWithMp(page, 2);

  const tooFar = await retreatEnemyOutOfReach(page);
  expect(tooFar.players[0].mp).toBeGreaterThan(0);
  const enemy = tooFar.enemies[0];
  await moveCursorTo(page, enemy.x, enemy.y);
  const planned = await snapshot(page);
  expect(planned.cursor).toMatchObject({
    x: enemy.x,
    y: enemy.y,
    kind: 'enemy',
    state: 'enemy',
  });
  expect(planned.cursor.path.length).toBeGreaterThan(planned.players[0].mp);
  const mp = planned.players[0].mp;
  const expected = planned.cursor.path[mp - 1];
  await screenshot(page, 'cursor-enemy-too-far', testInfo);

  await page.keyboard.press('Space');
  await settle(page);
  const moved = await snapshot(page);
  expect(moved.players[0]).toMatchObject({
    x: expected.x,
    y: expected.y,
    mp: 0,
    actionAvailable: true,
  });
  expect(moved.enemies[0].hp).toBe(planned.enemies[0].hp);
  expect(moved.lastEvents.some((event) => event.type === 'AttackPerformed')).toBe(false);
  expect(moved.cursor).toMatchObject({
    x: enemy.x,
    y: enemy.y,
    kind: 'enemy',
    state: 'enemy',
  });
  await screenshot(page, 'cursor-move-partial', testInfo);

  // Sin MP restantes, un segundo Moverse avisa y no altera nada.
  const beforeSecond = await snapshot(page);
  await page.keyboard.press('Space');
  await settle(page);
  const afterSecond = await snapshot(page);
  expect(afterSecond.players).toEqual(beforeSecond.players);
  expect(afterSecond.enemies).toEqual(beforeSecond.enemies);
  expect(afterSecond.lastEvents).toEqual([
    { type: 'CommandRejected', commandType: 'MoveTo', reason: 'no-mp' },
  ]);
  await expect(page.getByTestId('hud-message')).toHaveText('Sin MP');
  await expect(page.getByTestId('hud-message')).toBeVisible();
  await expect(page.getByTestId('hud-message')).toBeHidden({ timeout: 3000 });

  expect(consoleErrors).toEqual([]);
});

test('ciclo de vida, snapshot, debug y HUD sin botones nuevos', async ({
  page,
}, testInfo) => {
  const consoleErrors = trackConsoleErrors(page);
  await openGame(page);

  const start = await snapshot(page);
  await expect(page.getByTestId('hud-keys')).toContainText('cursor');
  await expect(page.getByTestId('hud-keys')).toContainText('Espacio/Enter moverse');
  await expect(page.getByTestId('hud-keys')).toContainText('F atacar');
  await expect(page.getByTestId('hud-keys')).toContainText('E terminar turno');
  await expect(
    page.getByRole('button', { name: /Moverse|Atacar|Terminar/i }),
  ).toHaveCount(0);
  expect(await page.locator('button:visible').count()).toBe(0);

  // El snapshot es serializable y conserva cursor, estado y camino.
  const roundTrip = await page.evaluate(() =>
    JSON.parse(JSON.stringify(window.__game!.snapshot())),
  );
  expect(roundTrip.cursor).toEqual(start.cursor);
  expect(roundTrip.cursor).toMatchObject({
    x: start.players[0].x,
    y: start.players[0].y,
    visible: true,
    kind: 'player',
    state: 'player',
    path: [],
  });

  // F1 muestra la información del cursor; el overlay no altera la partida.
  await moveCursorTo(page, start.players[0].x + 1, start.players[0].y);
  const selected = await snapshot(page);
  await page.keyboard.press('F1');
  await expect(page.getByTestId('debug-overlay')).toBeVisible();
  const debugText = await page.getByTestId('debug-content').textContent();
  expect(debugText).toContain(
    `Cursor: (${selected.cursor.x}, ${selected.cursor.y}) alcanzable · camino ${selected.cursor.path.length}`,
  );
  await screenshot(page, 'debug', testInfo);
  await page.keyboard.press('F1');
  await expect(page.getByTestId('debug-overlay')).toBeHidden();
  expect((await snapshot(page)).players).toEqual(start.players);

  // R reinicia y recoloca el cursor sobre el jugador.
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('r');
  const afterRestart = await snapshot(page);
  expect(afterRestart).toMatchObject({ status: 'playing', turn: 1, phase: 'player' });
  expect(afterRestart.cursor).toMatchObject({
    x: afterRestart.players[0].x,
    y: afterRestart.players[0].y,
    visible: true,
    state: 'player',
  });

  // E completa la fase enemiga y deja el cursor sobre el jugador.
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('e');
  await settle(page);
  const afterEndTurn = await snapshot(page);
  expect(afterEndTurn.phase).toBe('player');
  expect(afterEndTurn.turn).toBe(2);
  expect(afterEndTurn.lastEvents.map((event) => event.type)).toEqual(
    expect.arrayContaining(['EnemyPhaseStarted', 'PlayerTurnStarted']),
  );
  expect(afterEndTurn.cursor).toMatchObject({
    x: afterEndTurn.players[0].x,
    y: afterEndTurn.players[0].y,
    visible: true,
    state: 'player',
  });

  // F2 genera otra semilla y recoloca el cursor en el nuevo spawn.
  const seedBefore = (await snapshot(page)).seed;
  await page.keyboard.press('F2');
  const afterF2 = await snapshot(page);
  expect(afterF2.seed).not.toBe(seedBefore);
  expect(afterF2.turn).toBe(1);
  expect(afterF2.status).toBe('playing');
  expect(afterF2.cursor).toMatchObject({
    x: afterF2.spawns!.player.x,
    y: afterF2.spawns!.player.y,
    visible: true,
    state: 'player',
  });

  expect(consoleErrors).toEqual([]);
});
