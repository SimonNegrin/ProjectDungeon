import { mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';
import { expect, test, type Page, type TestInfo } from '@playwright/test';
import { BspMapGenerator } from '../../src/game/bsp';
import { WEAPONS } from '../../src/game/equipment';
import { createInitialState } from '../../src/game/engine';
import type { GameState } from '../../src/game/types';
import { artifactPath } from './artifacts';
import {
  TEST_SEED_URL,
  cowardFleeState,
  detectionState,
  loadState,
  openGame,
} from './perception-fixtures';
import {
  advanceToCue,
  dispatchFrozen,
  openBspState,
  settle,
  snapshot,
} from './support';

test.use({ viewport: { width: 1280, height: 720 } });

const SEED = 279837264;

async function screenshot(page: Page, name: string, testInfo: TestInfo): Promise<void> {
  const path = artifactPath(testInfo, 'screenshots', `${name}.png`);
  await mkdir(dirname(path), { recursive: true });
  await page.screenshot({ path });
  await testInfo.attach(name, { path, contentType: 'image/png' });
}

function floorNeighbor(
  snap: Awaited<ReturnType<typeof snapshot>>,
  x: number,
  y: number,
) {
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

test('TASK-0059: la recogida mantiene el arma, pulsa el slot y cambia al final', async ({
  page,
}, testInfo) => {
  const base = await openBspState(page, SEED);
  const weapon = base.weapons[0];
  expect(weapon).toBeDefined();
  const beforeEquipment = base.players[0].equipment;
  const beforeWeapon = await page.getByTestId('hud-weapon').textContent();

  await openBspState(page, SEED, undefined, {
    player: { x: weapon.x, y: weapon.y },
  });
  await dispatchFrozen(page, { type: 'PickUp', unitId: 'player-1' });
  await advanceToCue(page, 'pickup');
  await page.evaluate(() => window.__game!.advance(5));

  const banner = page.getByTestId('feedback-banner');
  await expect(banner).toBeVisible();
  await expect(banner).toHaveText(`+ ${WEAPONS[weapon.weaponId].name}`);
  await expect(banner).toHaveAttribute('data-banner-kind', 'pickup');
  // El HUD todavía muestra el equipo inicial: el cambio llega al final del beat.
  await expect(page.getByTestId('hud-weapon')).toHaveText(beforeWeapon ?? '');
  await expect(page.getByTestId('hud-weapon')).toHaveClass(/is-pulsing/);
  await screenshot(page, 'recogida', testInfo);

  await settle(page);
  await expect(page.getByTestId('hud-weapon')).toContainText(
    WEAPONS[weapon.weaponId].name,
  );
  expect(beforeEquipment.weaponId).not.toBe(weapon.weaponId);
});

test('TASK-0059: el cambio de arma pulsa el slot y aplica el arma al final', async ({
  page,
}) => {
  await openGame(page, TEST_SEED_URL);
  const base = createInitialState({ seed: SEED, generator: new BspMapGenerator() });
  const state: GameState = {
    ...base,
    players: [
      {
        ...base.players[0],
        weapons: ['sword', 'axe'],
        equipment: { ...base.players[0].equipment, weaponId: 'sword' },
      },
    ],
  };
  await loadState(page, state);

  await dispatchFrozen(page, {
    type: 'SelectWeapon',
    unitId: 'player-1',
    slot: 2,
  });
  await advanceToCue(page, 'select-weapon');
  await page.evaluate(() => window.__game!.advance(5));

  await expect(page.getByTestId('feedback-banner')).toHaveText('Hacha');
  await expect(page.getByTestId('feedback-banner')).toHaveAttribute(
    'data-banner-kind',
    'select-weapon',
  );
  await expect(page.getByTestId('hud-weapon')).toContainText('Espada');
  await expect(page.getByTestId('hud-weapon')).toHaveClass(/is-pulsing/);

  await settle(page);
  await expect(page.getByTestId('hud-weapon')).toContainText('Hacha');
});

test('TASK-0059: avistamiento estable y alarma con onda, borde y aviso en su cue', async ({
  page,
}, testInfo) => {
  await openGame(page, TEST_SEED_URL);
  await loadState(page, detectionState());

  await dispatchFrozen(page, {
    type: 'MoveTo',
    unitId: 'player-1',
    target: { x: 4, y: 2 },
  });
  await advanceToCue(page, 'spotted');

  const marker = page.locator('[data-testid="spot-marker"][data-unit-id="enemy-3"]');
  await expect(marker).toHaveText('!');
  await expect(marker).toBeVisible();
  await page.evaluate(() => {
    (window as unknown as { __spotNode: Element | null }).__spotNode =
      document.querySelector('[data-testid="spot-marker"]');
  });
  await page.evaluate(() => window.__game!.advance(25));
  expect(
    await page.evaluate(
      () =>
        (window as unknown as { __spotNode: Element | null }).__spotNode ===
        document.querySelector('[data-testid="spot-marker"]'),
    ),
  ).toBe(true);
  await screenshot(page, 'avistamiento', testInfo);

  await advanceToCue(page, 'alarm');
  await expect(page.getByTestId('hud-message')).toHaveText('¡Alarma! Te han visto');
  await expect(page.getByTestId('hud-message')).toBeVisible();
  const alarmPeak = await page.evaluate(() => window.__game!.advance(250));
  expect(
    alarmPeak.animation.cues.some((cue) => cue.kind === 'alarm'),
  ).toBe(true);
  await expect(page.getByTestId('frame-effects')).toHaveAttribute(
    'data-effect',
    'alarm',
  );
  await screenshot(page, 'alarma', testInfo);
});

test('TASK-0059: huida con marca, banner de fase y fin de partida sin overlay prematuro', async ({
  page,
}, testInfo) => {
  await openGame(page, TEST_SEED_URL);
  await loadState(page, cowardFleeState());
  await dispatchFrozen(page, {
    type: 'Attack',
    unitId: 'player-1',
    targetId: 'enemy-4',
  });
  await advanceToCue(page, 'fled');
  await page.evaluate(() => window.__game!.advance(10));
  const mark = page.locator('[data-testid="unit-mark"][data-unit-id="enemy-4"]');
  await expect(mark).toBeVisible();
  await expect(mark).toHaveText(/^!![↑↓←→]$/);
  await screenshot(page, 'huida', testInfo);

  // Fase enemiga: banner y tinte de borde; TurnEnded no añade otro banner.
  await openBspState(page, SEED);
  await dispatchFrozen(page, { type: 'EndTurn' });
  const phase = await advanceToCue(page, 'enemy-phase');
  expect(phase.animation.cues.some((cue) => cue.kind === 'turn-ended')).toBe(
    false,
  );
  await expect(page.getByTestId('feedback-banner')).toHaveText('FASE ENEMIGA');
  await expect(page.getByTestId('feedback-banner')).toHaveAttribute(
    'data-banner-kind',
    'phase',
  );
  await screenshot(page, 'fase-enemiga', testInfo);
  await settle(page);

  // Victoria: el overlay espera los 800 ms del cue de fin de partida.
  const base = await openBspState(page, SEED);
  const enemy = base.enemies[0];
  const beside = floorNeighbor(base, enemy.x, enemy.y);
  expect(beside).toBeDefined();
  await openBspState(page, SEED, undefined, {
    player: beside!,
    enemies: [{ ...enemy, hp: 1 }],
    rng: { seed: 1, state: 0 },
  });
  await dispatchFrozen(page, {
    type: 'Attack',
    unitId: 'player-1',
    targetId: enemy.id,
  });
  await advanceToCue(page, 'game-ended');
  await expect(page.getByTestId('overlay-victory')).toBeHidden();
  await expect(page.getByTestId('frame-effects')).toHaveAttribute(
    'data-effect',
    'game-ended',
  );
  await page.evaluate(() => window.__game!.advance(100));
  await expect(page.getByTestId('overlay-victory')).toBeHidden();

  await settle(page);
  await expect(page.getByTestId('overlay-victory')).toBeVisible();
  await screenshot(page, 'overlay', testInfo);
});

test('TASK-0059: el reinicio funde 250 ms sin crear un beat bloqueante', async ({
  page,
}) => {
  await openBspState(page, SEED);
  const restart = await page.evaluate(() => {
    window.__game!.dispatch({ type: 'Restart' });
    const fade = document.querySelector<HTMLElement>(
      '[data-testid="screen-fade"]',
    )!;
    return {
      hidden: fade.hidden,
      fading: fade.classList.contains('is-fading'),
      animating: window.__game!.snapshot().animation.animating,
      turn: window.__game!.snapshot().turn,
    };
  });

  expect(restart).toEqual({
    hidden: false,
    fading: true,
    animating: false,
    turn: 1,
  });
});

test('TASK-0059: el rechazo no crea beat y muestra aviso con sacudida', async ({
  page,
}) => {
  await openBspState(page, SEED);
  const before = await snapshot(page);
  const rejected = await page.evaluate(() => {
    const result = window.__game!.dispatch({
      type: 'Attack',
      unitId: 'player-1',
      targetId: 'enemy-1',
    });
    return {
      events: result.events.map((event) => event.type),
      animating: window.__game!.snapshot().animation.animating,
      shaking: document
        .querySelector('[data-testid="cursor"]')!
        .classList.contains('is-shaking'),
    };
  });
  const after = await snapshot(page);

  expect(rejected.events).toContain('CommandRejected');
  expect(rejected.animating).toBe(false);
  expect(rejected.shaking).toBe(true);
  expect(after.turn).toBe(before.turn);
  await expect(page.getByTestId('hud-message')).toBeVisible();
});
