import { mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';
import { expect, test, type Page, type TestInfo } from '@playwright/test';
import type { GameEvent } from '../../src/game/types';
import { FEEDBACK_CONFIG } from '../../src/host/feedback-config';
import type { GameSnapshot } from '../../src/host/debug';
import { artifactPath } from './artifacts';
import {
  advanceToCue,
  dispatchCommand,
  dispatchFrozen,
  moveCursorTo,
  openBspState,
  settle,
  snapshot,
} from './support';

test.use({ viewport: { width: 1280, height: 720 } });

const HIT_SEED = 1;
const MISS_SEED = 13;
const EQUIPMENT_SEED = 279837264;

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

/** Aplica un filtro de grises a la página para la evidencia visual. */
async function setGrayscale(page: Page, enabled: boolean): Promise<void> {
  await page.evaluate((on) => {
    document.documentElement.style.filter = on ? 'grayscale(1)' : '';
  }, enabled);
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

  const result = await dispatchFrozen(page, {
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
  await setGrayscale(page, true);
  await screenshot(page, 'impacto-grises', testInfo);
  await setGrayscale(page, false);
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

  const result = await dispatchFrozen(page, {
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
  await setGrayscale(page, true);
  await screenshot(page, 'fallo-grises', testInfo);
  await setGrayscale(page, false);
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

  const result = await dispatchFrozen(page, {
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

async function openAdjacentImpact(page: Page) {
  const base = await openBspState(page, HIT_SEED);
  const enemy = base.enemies[0];
  const west = floorNeighbor(base, enemy.x, enemy.y);
  expect(west).toBeDefined();
  const adjacent = await openBspState(page, HIT_SEED, undefined, {
    player: west!,
    enemies: [enemy],
  });
  const result = await dispatchFrozen(page, {
    type: 'Attack',
    unitId: 'player-1',
    targetId: enemy.id,
  });
  const attack = attackEvent(result.events);
  expect(attack).toBeDefined();
  expect(attack!.hit).toBe(true);
  return { adjacent, attack: attack! };
}

test('TASK-0061: advance(ms) sin animación consume textos y banners ya creados', async ({
  page,
}) => {
  // Texto de impacto: visible al terminar la animación, inmune a advance(0) y
  // agotado por el reloj manual sin esperas reales.
  await openAdjacentImpact(page);
  await advanceToCue(page, 'attack');
  const textAnimation = await settle(page);
  expect(textAnimation.animation.animating).toBe(false);
  const text = page.getByTestId('damage-feedback');
  await expect(text).toBeVisible();
  const beforeZero = await text.textContent();
  await page.evaluate(() => window.__game!.advance(0));
  await expect(text).toBeVisible();
  expect(await text.textContent()).toBe(beforeZero);
  await advance(page, FEEDBACK_CONFIG.texts.damageMs + 100);
  await expect(text).toBeHidden();

  // Banner de recogida: misma semántica de persistencia.
  const base = await openBspState(page, EQUIPMENT_SEED);
  const weapon = base.weapons[0];
  expect(weapon).toBeDefined();
  await openBspState(page, EQUIPMENT_SEED, undefined, {
    player: { x: weapon.x, y: weapon.y },
  });
  await dispatchFrozen(page, { type: 'PickUp', unitId: 'player-1' });
  await advanceToCue(page, 'pickup');
  const bannerAnimation = await settle(page);
  expect(bannerAnimation.animation.animating).toBe(false);
  const banner = page.getByTestId('feedback-banner');
  await expect(banner).toBeVisible();
  await page.evaluate(() => window.__game!.advance(0));
  await expect(banner).toBeVisible();
  await advance(page, FEEDBACK_CONFIG.texts.bannerMs + 100);
  await expect(banner).toBeHidden();
});

test('TASK-0061: el texto persiste con rejilla, cursor y camino visibles', async ({
  page,
}, testInfo) => {
  const { adjacent } = await openAdjacentImpact(page);
  await advanceToCue(page, 'attack');
  const afterAnimation = await settle(page);
  expect(afterAnimation.animation.animating).toBe(false);
  const text = page.getByTestId('damage-feedback');
  await expect(text).toBeVisible();

  // Mueve el cursor del enemigo al jugador y da un paso a suelo: el camino
  // vuelve a dibujarse sin consumir la persistencia del texto.
  const player = afterAnimation.players[0];
  const enemy = adjacent.enemies[0];
  const directions = [
    { key: 'ArrowUp', dx: 0, dy: -1 },
    { key: 'ArrowRight', dx: 1, dy: 0 },
    { key: 'ArrowDown', dx: 0, dy: 1 },
    { key: 'ArrowLeft', dx: -1, dy: 0 },
  ] as const;
  const candidate = directions.find(({ dx, dy }) => {
    const cell = { x: player.x + dx, y: player.y + dy };
    if (cell.x === enemy.x && cell.y === enemy.y) return false;
    if (cell.x < 0 || cell.y < 0) return false;
    if (cell.x >= afterAnimation.grid.width || cell.y >= afterAnimation.grid.height) {
      return false;
    }
    return (
      afterAnimation.grid.tiles[cell.y * afterAnimation.grid.width + cell.x] ===
      'floor'
    );
  });
  expect(candidate).toBeDefined();
  await moveCursorTo(page, player.x, player.y);
  await page.keyboard.press(candidate!.key);

  const withPath = await snapshot(page);
  expect(withPath.cursor.visible).toBe(true);
  expect(withPath.cursor.path.length).toBeGreaterThan(0);
  await expect(page.getByTestId('cursor')).toBeVisible();
  expect(
    await page.locator('[data-testid="cursor-path-point"]').count(),
  ).toBeGreaterThan(0);
  await expect(text).toBeVisible();
  await expect(page.locator('#game-canvas')).toBeVisible();
  await screenshot(page, 'impacto-persistente', testInfo);
});
