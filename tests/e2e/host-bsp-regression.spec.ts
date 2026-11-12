import { mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';
import { expect, test, type Page, type TestInfo } from '@playwright/test';
import type { GameSnapshot } from '../../src/host/debug';
import { artifactPath } from './artifacts';
import {
  dispatchCommand,
  openBspState,
  reachableVisibleTiles,
  settle,
  snapshot,
} from './support';

const BSP_SEED = 279837264;

test.use({ viewport: { width: 1280, height: 720 } });

function expectedCamera(snap: GameSnapshot): { x: number; y: number } {
  const player = snap.players[0];
  const rawX = Math.round(
    (player.x + 0.5) * snap.tileSize - snap.viewport.width / 2,
  );
  const rawY = Math.round(
    (player.y + 0.5) * snap.tileSize - snap.viewport.height / 2,
  );
  return {
    x: Math.min(Math.max(rawX, 0), snap.camera.maxX),
    y: Math.min(Math.max(rawY, 0), snap.camera.maxY),
  };
}

async function save(page: Page, name: string, testInfo: TestInfo) {
  const path = artifactPath(testInfo, 'screenshots', `${name}.png`);
  await mkdir(dirname(path), { recursive: true });
  await page.screenshot({ path });
  await testInfo.attach(name, { path, contentType: 'image/png' });
}

test('BSP inyectado: arranque, cámara, cursor, movimiento y combate', async ({
  page,
}, testInfo) => {
  const consoleErrors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });
  page.on('pageerror', (error) => consoleErrors.push(error.message));

  const initial = await openBspState(page, BSP_SEED);
  expect(initial.seed).toBe(BSP_SEED);
  expect(initial.grid).toMatchObject({ width: 32, height: 32 });
  expect(initial.enemies.map((enemy) => enemy.id)).toEqual([
    'enemy-1',
    'enemy-2',
    'enemy-3',
    'enemy-4',
  ]);
  expect(initial.camera.maxX).toBe(608);
  expect(initial.camera.maxY).toBe(608);
  expect(initial.camera).toEqual({
    ...expectedCamera(initial),
    maxX: 608,
    maxY: 608,
  });
  expect(initial.cursor).toMatchObject({
    x: initial.players[0].x,
    y: initial.players[0].y,
    visible: true,
    kind: 'player',
    state: 'player',
    path: [],
  });
  await save(page, 'bsp-regression', testInfo);

  // Movimiento real: el cursor se mueve a un tile visible alcanzable y Espacio
  // ejecuta Moverse. MP baja y la cámara se recalcula.
  const target = reachableVisibleTiles(initial, {
    minDistance: 1,
    maxDistance: 1,
  })[0];
  expect(target, 'Debe existir un paso visible').toBeDefined();
  await page.evaluate(
    ({ x, y }) =>
      window.__game!.dispatch({
        type: 'MoveTo',
        unitId: 'player-1',
        target: { x, y },
      }),
    target,
  );
  await settle(page);
  const moved = await snapshot(page);
  expect(moved.players[0]).toMatchObject({
    x: target.x,
    y: target.y,
    mp: initial.players[0].mp - 1,
  });
  expect(moved.camera).toMatchObject(expectedCamera(moved));

  // Combate real sobre el mismo BSP: se coloca al jugador junto a enemy-1 y se
  // ataca con `Attack`; el objetivo pierde vida y se gasta la acción.
  const enemy = initial.enemies[0];
  const beside = [
    { x: enemy.x - 1, y: enemy.y },
    { x: enemy.x + 1, y: enemy.y },
    { x: enemy.x, y: enemy.y - 1 },
    { x: enemy.x, y: enemy.y + 1 },
  ].find(
    (point) =>
      initial.grid.tiles[point.y * initial.grid.width + point.x] === 'floor',
  );
  expect(beside, 'Enemy-1 debe tener una casilla libre adyacente').toBeDefined();
  const combat = await openBspState(page, BSP_SEED, undefined, {
    player: beside!,
    enemies: [enemy],
  });
  expect(combat.players[0]).toMatchObject(beside!);
  const result = await dispatchCommand(page, {
    type: 'Attack',
    unitId: 'player-1',
    targetId: enemy.id,
  });
  await settle(page);
  const attack = result.events.find((event) => event.type === 'AttackPerformed');
  expect(attack, 'El ataque debe producirse').toBeDefined();
  const afterAttack = await snapshot(page);
  expect(afterAttack.players[0].actions.remaining).toBe(1);
  expect(afterAttack.enemies[0].hp).toBeLessThanOrEqual(enemy.hp);
  await save(page, 'bsp-regression-combat', testInfo);

  expect(consoleErrors).toEqual([]);
});
