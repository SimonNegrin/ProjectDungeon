import { mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';
import { expect, test, type Page, type TestInfo } from '@playwright/test';
import type { GameEvent } from '../../src/game/types';
import type { GameSnapshot } from '../../src/host/debug';
import { artifactPath } from './artifacts';
import {
  advanceToCue,
  dispatchCommand,
  openBspState,
  settle,
} from './support';

const HIT_SEED = 1;
const MISS_SEED = 13;

function floorNeighbor(snap: GameSnapshot, x: number, y: number) {
  return [
    { x, y: y - 1 },
    { x: x + 1, y },
    { x, y: y + 1 },
    { x: x - 1, y },
  ].find((cell) => {
    if (cell.x < 0 || cell.y < 0) return false;
    if (cell.x >= snap.grid.width || cell.y >= snap.grid.height) return false;
    return snap.grid.tiles[cell.y * snap.grid.width + cell.x] === 'floor';
  });
}

function attackEvent(events: readonly GameEvent[]) {
  return events.find(
    (event): event is Extract<GameEvent, { type: 'AttackPerformed' }> =>
      event.type === 'AttackPerformed',
  );
}

async function screenshot(page: Page, name: string, testInfo: TestInfo): Promise<void> {
  const path = artifactPath(testInfo, 'screenshots', `${name}.png`);
  await mkdir(dirname(path), { recursive: true });
  await page.screenshot({ path });
  await testInfo.attach(name, { path, contentType: 'image/png' });
}

async function advance(page: Page, ms: number): Promise<GameSnapshot> {
  return page.evaluate((delta) => window.__game!.advance(delta), ms);
}

test('impacto: cue con destello, embestida, -N y tick de PV', async ({
  page,
}, testInfo) => {
  const base = await openBspState(page, HIT_SEED);
  const enemy = base.enemies[0];
  const west = floorNeighbor(base, enemy.x, enemy.y);
  expect(west).toBeDefined();
  const adjacent = await openBspState(page, HIT_SEED, undefined, {
    player: west!,
    enemies: [enemy],
  });

  const result = await dispatchCommand(page, {
    type: 'Attack',
    unitId: 'player-1',
    targetId: enemy.id,
  });
  const attack = attackEvent(result.events);
  expect(attack).toBeDefined();
  expect(attack!.hit).toBe(true);

  await advanceToCue(page, 'attack');
  const impact = await advance(page, 70);
  expect(impact.animation.cues.find((cue) => cue.kind === 'attack')).toMatchObject({
    kind: 'attack',
    hit: true,
  });
  await expect(page.getByTestId('damage-feedback')).toHaveText(
    `-${attack!.damage}`,
  );
  await expect(page.getByTestId('damage-feedback')).toHaveAttribute(
    'data-result',
    'hit',
  );
  await expect(page.getByTestId('hud-enemy-hp')).toHaveText(
    `${Math.max(0, adjacent.enemies[0].hp - attack!.damage)}/${enemy.maxHp}`,
  );
  await screenshot(page, 'impacto', testInfo);
  await settle(page);
});

test('fallo: cuerda opuesta, Fallo gris y sin destello de impacto', async ({
  page,
}, testInfo) => {
  const base = await openBspState(page, MISS_SEED);
  const enemy = base.enemies[0];
  const beside = floorNeighbor(base, enemy.x, enemy.y);
  expect(beside).toBeDefined();
  await openBspState(page, MISS_SEED, undefined, {
    player: beside!,
    enemies: [enemy],
    rng: { seed: MISS_SEED, state: 0 },
  });

  const result = await dispatchCommand(page, {
    type: 'Attack',
    unitId: 'player-1',
    targetId: enemy.id,
  });
  const miss = attackEvent(result.events);
  expect(miss).toBeDefined();
  expect(miss!.hit).toBe(false);

  await advanceToCue(page, 'attack');
  const sample = await advance(page, 70);
  expect(sample.animation.cues.find((cue) => cue.kind === 'attack')).toMatchObject({
    kind: 'attack',
    hit: false,
  });
  await expect(page.getByTestId('damage-feedback')).toHaveText('Fallo');
  await expect(page.getByTestId('damage-feedback')).toHaveAttribute(
    'data-result',
    'miss',
  );
  await screenshot(page, 'fallo', testInfo);
  await settle(page);
});

test('muerte y cadáver: 900 ms de secuencia y persistencia sin tocar la rejilla', async ({
  page,
}, testInfo) => {
  const base = await openBspState(page, HIT_SEED);
  const enemy = base.enemies[0];
  const weak = { ...enemy, hp: 1 };
  const other = base.enemies[1];
  expect(other).toBeDefined();
  const west = floorNeighbor(base, enemy.x, enemy.y);
  expect(west).toBeDefined();
  const adjacent = await openBspState(page, HIT_SEED, undefined, {
    player: west!,
    enemies: [weak, other],
  });
  const gridBefore = [...adjacent.grid.tiles];

  const result = await dispatchCommand(page, {
    type: 'Attack',
    unitId: 'player-1',
    targetId: enemy.id,
  });
  const attack = attackEvent(result.events);
  expect(attack).toBeDefined();
  expect(attack!.hit).toBe(true);
  expect(result.events.some((event) => event.type === 'UnitDied')).toBe(true);

  await advanceToCue(page, 'death');
  const death = await advance(page, 40);
  expect(death.animation.cues.find((cue) => cue.kind === 'death')).toBeDefined();
  await screenshot(page, 'muerte', testInfo);

  const finished = await settle(page);
  expect(finished.animation.animating).toBe(false);
  expect(finished.status).toBe('playing');
  expect(finished.enemies[0].hp).toBe(0);
  expect(finished.grid.tiles).toEqual(gridBefore);
  await screenshot(page, 'cadaver', testInfo);

  // El cadáver es solo presentación: la unidad muerta sigue en el estado y no
  // se escribe en la rejilla; reiniciar la sala lo limpia.
  expect(finished.grid.tiles).toEqual(gridBefore);
  const afterTurn = await dispatchCommand(page, { type: 'EndTurn' });
  expect(afterTurn.snapshot.enemies[0].hp).toBe(0);
  await settle(page);
  expect((await page.evaluate(() => window.__game!.snapshot())).grid.tiles).toEqual(
    gridBefore,
  );
});
