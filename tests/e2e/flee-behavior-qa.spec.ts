import { expect, test } from '@playwright/test';
import { BESTIARY } from '../../src/game/bestiary';
import { hasLineOfSight } from '../../src/game/perception';
import type { GameEvent } from '../../src/game/types';
import type { GameSnapshot } from '../../src/host/debug';
import {
  TEST_SEED_URL,
  braveHitState,
  corralledState,
  cowardFleeState,
  fleeingRenewalState,
  loadState,
  openGame,
  screenshot,
  watchConsole,
} from './perception-fixtures';
import { moveCursorTo, settle, snapshot } from './support';

test.use({ viewport: { width: 1280, height: 720 } });

function enemyOf(snap: GameSnapshot, id: string) {
  const enemy = snap.enemies.find((candidate) => candidate.id === id);
  if (!enemy) throw new Error(`Falta ${id} en el snapshot`);
  return enemy;
}

function attackEvent(events: readonly GameEvent[]) {
  return events.find(
    (event): event is Extract<GameEvent, { type: 'AttackPerformed' }> =>
      event.type === 'AttackPerformed',
  );
}

function distance(a: { x: number; y: number }, b: { x: number; y: number }): number {
  return Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y));
}

test('TASK-0039: el cobarde huye tras un golpe de ≥40 %, rompe la visión y se aleja', async ({
  page,
}, testInfo) => {
  const consoleErrors = watchConsole(page);
  await openGame(page, TEST_SEED_URL);
  const initial = await loadState(page, cowardFleeState());
  const cowardMaxHp = BESTIARY.coward.maxHp;
  expect(enemyOf(initial, 'enemy-4')).toMatchObject({
    hp: cowardMaxHp,
    fleeing: false,
  });

  await moveCursorTo(page, 1, 2);
  await page.keyboard.press('f');
  await settle(page);
  const hit = await snapshot(page);
  const attack = attackEvent(hit.lastEvents);
  expect(attack).toBeDefined();
  expect(attack!.hit).toBe(true);
  // Umbral del 40 % de la vida máxima, redondeando hacia arriba.
  const threshold = Math.ceil(cowardMaxHp * 0.4);
  expect(attack!.damage).toBeGreaterThanOrEqual(threshold);
  expect(attack!.targetHp).toBeGreaterThan(0);
  expect(hit.lastEvents.some((event) => event.type === 'EnemyFled')).toBe(true);
  expect(enemyOf(hit, 'enemy-4')).toMatchObject({
    fleeing: true,
    hp: cowardMaxHp - attack!.damage,
  });

  await page.keyboard.press('e');
  await settle(page);
  const fled = await snapshot(page);
  const coward = enemyOf(fled, 'enemy-4');
  const player = fled.players[0];
  const beforeFlee = enemyOf(hit, 'enemy-4');
  expect(coward.fleeing).toBe(true);
  expect(distance(coward, beforeFlee)).toBeGreaterThanOrEqual(
    Math.ceil(BESTIARY.coward.maxMp / 2),
  );
  expect(distance(coward, player)).toBeGreaterThanOrEqual(4);
  expect(
    hasLineOfSight(
      fled.grid,
      { x: coward.x, y: coward.y },
      { x: player.x, y: player.y },
    ),
  ).toBe(false);
  await screenshot(page, testInfo, 'huida');
  expect(consoleErrors).toEqual([]);
});

test('TASK-0039: el valiente no huye y otro golpe fuerte renueva la huida', async ({
  page,
}) => {
  const consoleErrors = watchConsole(page);
  await openGame(page, TEST_SEED_URL);
  const initial = await loadState(page, braveHitState());
  expect(enemyOf(initial, 'enemy-1').enemyType).toBe('sentinel');

  await moveCursorTo(page, 20, 18);
  await page.keyboard.press('f');
  await settle(page);
  const brave = await snapshot(page);
  const braveAttack = attackEvent(brave.lastEvents);
  expect(braveAttack).toBeDefined();
  expect(braveAttack!.hit).toBe(true);
  expect(brave.lastEvents.some((event) => event.type === 'EnemyFled')).toBe(false);
  expect(enemyOf(brave, 'enemy-1').fleeing).toBe(false);
  expect(enemyOf(brave, 'enemy-1').hp).toBeLessThan(BESTIARY.sentinel.maxHp);

  // Renovación: un cobarde ya en huida y con vida completa vuelve a huir.
  await loadState(page, fleeingRenewalState());
  await moveCursorTo(page, 20, 18);
  await page.keyboard.press('f');
  await settle(page);
  const renewed = await snapshot(page);
  const renewalAttack = attackEvent(renewed.lastEvents);
  expect(renewalAttack).toBeDefined();
  expect(renewalAttack!.hit).toBe(true);
  expect(renewalAttack!.targetHp).toBe(
    BESTIARY.coward.maxHp - renewalAttack!.damage,
  );
  expect(
    renewed.lastEvents.filter((event) => event.type === 'EnemyFled'),
  ).toEqual([{ type: 'EnemyFled', unitId: 'enemy-4' }]);
  expect(enemyOf(renewed, 'enemy-4')).toMatchObject({
    fleeing: true,
    hp: BESTIARY.coward.maxHp - renewalAttack!.damage,
  });
  expect(consoleErrors).toEqual([]);
});

test('TASK-0039: el cobarde acorralado ataca en vez de esperar', async ({
  page,
}, testInfo) => {
  const consoleErrors = watchConsole(page);
  await openGame(page, TEST_SEED_URL);
  const initial = await loadState(page, corralledState());
  expect(enemyOf(initial, 'enemy-4')).toMatchObject({
    x: 6,
    y: 5,
    fleeing: true,
  });

  await page.keyboard.press('e');
  await settle(page);
  const after = await snapshot(page);
  const enemyAttacks = after.lastEvents.filter(
    (event): event is Extract<GameEvent, { type: 'AttackPerformed' }> =>
      event.type === 'AttackPerformed' && event.attackerId === 'enemy-4',
  );
  const attack = enemyAttacks[0];
  expect(attack).toBeDefined();
  expect(attack!.attackerId).toBe('enemy-4');
  expect(attack!.targetId).toBe('player-1');
  // Acorralado encadena una acción de ataque por acción disponible.
  expect(enemyAttacks).toHaveLength(BESTIARY.coward.stats.acciones);
  expect(enemyOf(after, 'enemy-4')).toMatchObject({
    x: 6,
    y: 5,
    fleeing: true,
    actions: { remaining: 0 },
  });
  expect(
    after.lastEvents.some(
      (event) => event.type === 'UnitMoved' && event.unitId === 'enemy-4',
    ),
  ).toBe(false);
  const enemyDamage = enemyAttacks.reduce((total, hit) => total + hit.damage, 0);
  expect(after.players[0].hp).toBe(20 - enemyDamage);
  expect(after.players[0].hp).toBeLessThan(20);
  await screenshot(page, testInfo, 'acorralado');
  expect(consoleErrors).toEqual([]);
});
