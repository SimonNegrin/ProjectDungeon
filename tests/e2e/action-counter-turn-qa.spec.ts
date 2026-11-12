import { mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';
import { expect, test, type Page, type TestInfo } from '@playwright/test';
import type { GameSnapshot } from '../../src/host/debug';
import { artifactPath } from './artifacts';
import {
  moveCursorTo,
  openBspState,
  reachableVisibleTiles,
  settle,
  snapshot,
  waitForCanvasStable,
} from './support';

const SEED = 279837264;

function trackConsoleErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  page.on('pageerror', (error) => errors.push(error.message));
  return errors;
}

/**
 * Carga el BSP de referencia con un único enemigo duradero en una casilla
 * adyacente libre. El resto de la guardia podría intervenir en la fase enemiga
 * y añadir ruido ajeno al contador de acciones.
 */
async function openAdjacentDurableEnemy(page: Page): Promise<GameSnapshot> {
  await page.setViewportSize({ width: 1280, height: 720 });
  const base = await openBspState(page, SEED);
  const enemy = base.enemies[0];
  const beside = [
    { x: enemy.x - 1, y: enemy.y },
    { x: enemy.x + 1, y: enemy.y },
    { x: enemy.x, y: enemy.y - 1 },
    { x: enemy.x, y: enemy.y + 1 },
  ].find(
    (point) => base.grid.tiles[point.y * base.grid.width + point.x] === 'floor',
  );
  if (!beside) throw new Error('Enemy-1 no tiene una casilla libre adyacente');

  return openBspState(page, SEED, undefined, {
    player: beside,
    enemies: [{ ...enemy, hp: 20, maxHp: 20 }],
  });
}

async function screenshot(page: Page, name: string, testInfo: TestInfo): Promise<void> {
  const path = artifactPath(testInfo, 'screenshots', `${name}.png`);
  await mkdir(dirname(path), { recursive: true });
  await page.screenshot({ path });
  await testInfo.attach(name, { path, contentType: 'image/png' });
}

/** Un paso real con `Space`; devuelve `false` si no hay destino adyacente. */
async function stepWithMp(page: Page): Promise<boolean> {
  const before = await snapshot(page);
  const target = reachableVisibleTiles(before, {
    minDistance: 1,
    maxDistance: 1,
  })[0];
  if (!target) return false;

  await moveCursorTo(page, target.x, target.y);
  await page.keyboard.press('Space');
  const after = await settle(page);
  return after.players[0].mp < before.players[0].mp;
}

async function nextFrame(page: Page): Promise<void> {
  await page.evaluate(
    () =>
      new Promise<void>((resolve) => {
        requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
      }),
  );
}

test('dos ataques, cierre manual con E, sugerencia y movimiento sin acciones', async ({
  page,
}, testInfo) => {
  const consoleErrors = trackConsoleErrors(page);
  await openAdjacentDurableEnemy(page);

  const initial = await snapshot(page);
  expect(initial.players[0].actions).toEqual({ max: 2, remaining: 2 });
  await expect(page.getByTestId('hud-action')).toHaveText('2/2');
  await expect(page.getByTestId('hud-suggestion')).toBeHidden();

  await moveCursorTo(page, initial.enemies[0].x, initial.enemies[0].y);

  // Primer ataque: el contador baja a 1/2, no a 0.
  await page.keyboard.press('f');
  const afterFirst = await settle(page);
  expect(afterFirst.players[0].actions.remaining).toBe(1);
  await expect(page.getByTestId('hud-action')).toHaveText('1/2');

  // Segundo ataque seguido: baja a 0/2 y el turno sigue en fase de jugador.
  await page.keyboard.press('f');
  const afterSecond = await settle(page);
  expect(afterSecond.players[0].actions.remaining).toBe(0);
  await expect(page.getByTestId('hud-action')).toHaveText('0/2');
  expect(afterSecond.phase).toBe('player');
  expect(afterSecond.turn).toBe(initial.turn);
  expect(afterSecond.status).toBe('playing');
  expect(
    afterSecond.lastEvents.some(
      (event) => event.type === 'TurnEnded' || event.type === 'EnemyPhaseStarted',
    ),
  ).toBe(false);

  // Sin auto-terminación: tras dos frames el estado sigue en fase de jugador.
  await nextFrame(page);
  const stillPlayer = await snapshot(page);
  expect(stillPlayer).toMatchObject({
    phase: 'player',
    turn: initial.turn,
    status: 'playing',
  });
  expect(stillPlayer.players[0].actions.remaining).toBe(0);

  // Moverse con 0 acciones gasta MP, no ataca y no cierra el turno.
  const beforeMove = await snapshot(page);
  expect(await stepWithMp(page)).toBe(true);
  const afterMove = await snapshot(page);
  expect(afterMove.players[0].actions.remaining).toBe(0);
  expect(
    afterMove.players[0].x !== beforeMove.players[0].x ||
      afterMove.players[0].y !== beforeMove.players[0].y,
  ).toBe(true);
  expect(afterMove.players[0].mp).toBeLessThan(beforeMove.players[0].mp);
  expect(afterMove.enemies[0].hp).toBe(beforeMove.enemies[0].hp);
  expect(
    afterMove.lastEvents.some((event) => event.type === 'AttackPerformed'),
  ).toBe(false);
  expect(afterMove).toMatchObject({ phase: 'player', turn: initial.turn });

  // Agotar el MP restante sin gastar acciones ni atacar.
  for (let guard = 0; guard < 12; guard += 1) {
    const current = await snapshot(page);
    if (current.players[0].mp === 0) break;
    if (!(await stepWithMp(page))) break;
  }
  const exhausted = await snapshot(page);
  expect(exhausted.players[0].mp).toBe(0);
  expect(exhausted.players[0].actions.remaining).toBe(0);
  expect(exhausted.phase).toBe('player');
  expect(exhausted.turn).toBe(initial.turn);
  await expect(page.getByTestId('hud-player-mp')).toHaveText('0/6');
  await expect(page.getByTestId('hud-action')).toHaveText('0/2');
  const suggestion = page.getByTestId('hud-suggestion');
  await expect(suggestion).toBeVisible();
  await expect(suggestion).toHaveText(
    'Sin acciones ni MP: pulsa E para terminar el turno',
  );

  await waitForCanvasStable(page);
  await screenshot(page, 'acciones-sin-mp-1280x720', testInfo);

  await page.setViewportSize({ width: 900, height: 700 });
  await nextFrame(page);
  await waitForCanvasStable(page);
  await expect(page.getByTestId('hud-action')).toHaveText('0/2');
  await expect(suggestion).toBeVisible();
  await screenshot(page, 'acciones-sin-mp-900x700', testInfo);

  // Solo E cierra el turno: restaura acciones y oculta la sugerencia.
  const beforeEndTurn = await snapshot(page);
  await page.keyboard.press('e');
  const afterEndTurn = await settle(page);
  expect(afterEndTurn.turn).toBe(beforeEndTurn.turn + 1);
  expect(afterEndTurn.phase).toBe('player');
  expect(afterEndTurn.players[0].actions.remaining).toBe(2);
  expect(
    afterEndTurn.lastEvents.map((event) => event.type),
  ).toEqual(expect.arrayContaining(['EnemyPhaseStarted', 'PlayerTurnStarted']));
  await expect(page.getByTestId('hud-action')).toHaveText('2/2');
  await expect(suggestion).toBeHidden();

  expect(consoleErrors).toEqual([]);
});
