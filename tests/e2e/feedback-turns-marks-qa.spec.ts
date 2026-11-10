import { mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';
import { expect, test, type Page, type TestInfo } from '@playwright/test';
import type { GameState, Unit } from '../../src/game/types';
import { FEEDBACK_CONFIG } from '../../src/host/feedback-config';
import { artifactPath } from './artifacts';
import {
  TEST_SEED_URL,
  cowardFleeState,
  detectionState,
  loadState,
  openGame,
} from './perception-fixtures';
import { advanceToCue, dispatchFrozen, settle, snapshot } from './support';

test.use({ viewport: { width: 1280, height: 720 } });

async function screenshot(
  page: Page,
  name: string,
  testInfo: TestInfo,
): Promise<void> {
  const path = artifactPath(testInfo, 'screenshots', `${name}.png`);
  await mkdir(dirname(path), { recursive: true });
  await page.screenshot({ path });
  await testInfo.attach(name, { path, contentType: 'image/png' });
}

/** Estado de referencia con un único enemigo; conserva la LOS del BSP. */
function onlyEnemy(state: GameState, unitId: string): GameState {
  return {
    ...state,
    enemies: state.enemies.filter((enemy) => enemy.id === unitId),
  };
}

/**
 * Bruto en regreso que ya está en su `home`: al empezar la fase enemiga el
 * motor emite `EnemyReturned` y lo deja dormido. La posición (5,4) conserva la
 * línea de visión bloqueada del BSP de referencia, así que no vuelve a alertarse.
 */
function returningState(): GameState {
  const base = onlyEnemy(detectionState(), 'enemy-3');
  return {
    ...base,
    enemies: base.enemies.map((enemy): Unit => ({
      ...enemy,
      awareness: 'returning',
      fleeing: false,
      lastKnown: { x: 1, y: 2 },
      alertTurns: 3,
      hasShouted: true,
    })),
  };
}

/** Bruto dormido visible en (5,4): su plan vacío emite `EnemyWaited`. */
function waitingState(): GameState {
  return onlyEnemy(detectionState(), 'enemy-3');
}

test('TASK-0061: el regreso muestra `zzz` durante su cue', async ({
  page,
}, testInfo) => {
  await openGame(page, TEST_SEED_URL);
  await loadState(page, returningState());

  const result = await dispatchFrozen(page, { type: 'EndTurn' });
  expect(
    result.events.filter((event) => event.type === 'EnemyReturned'),
  ).toEqual([{ type: 'EnemyReturned', unitId: 'enemy-3' }]);

  const atCue = await advanceToCue(page, 'returned');
  expect(
    atCue.animation.cues.find((cue) => cue.kind === 'returned'),
  ).toBeDefined();

  const mark = page.locator(
    '[data-testid="unit-mark"][data-unit-id="enemy-3"]',
  );
  await expect(mark).toBeVisible();
  await expect(mark).toHaveText('zzz');
  await expect(mark).toHaveAttribute('data-mark-kind', 'returned');
  await screenshot(page, 'regreso', testInfo);

  // La marca sigue visible durante los primeros 100 ms de su beat de 250 ms.
  await page.evaluate(() => window.__game!.advance(100));
  await expect(mark).toBeVisible();
  await expect(mark).toHaveText('zzz');

  const finished = await settle(page);
  expect(finished.animation.animating).toBe(false);
  // La marca de la espera que sigue al regreso se consume con el reloj manual.
  await page.evaluate(
    (ms) => window.__game!.advance(ms),
    FEEDBACK_CONFIG.texts.waitedPersistMs + 100,
  );
  await expect(mark).toHaveCount(0);
});

test('TASK-0061: la espera muestra `...` sobre un enemigo visible', async ({
  page,
}, testInfo) => {
  await openGame(page, TEST_SEED_URL);
  await loadState(page, waitingState());

  const result = await dispatchFrozen(page, { type: 'EndTurn' });
  expect(
    result.events.filter((event) => event.type === 'EnemyWaited'),
  ).toEqual([{ type: 'EnemyWaited', unitId: 'enemy-3' }]);

  const atCue = await advanceToCue(page, 'waited');
  expect(atCue.animation.cues.find((cue) => cue.kind === 'waited')).toBeDefined();

  const mark = page.locator(
    '[data-testid="unit-mark"][data-unit-id="enemy-3"]',
  );
  await expect(mark).toBeVisible();
  await expect(mark).toHaveText('...');
  await expect(mark).toHaveAttribute('data-mark-kind', 'waited');
  await screenshot(page, 'espera', testInfo);

  await settle(page);
  await expect(mark).toHaveCount(0);
});

test('TASK-0061: `TU TURNO` con cursor oculto en el cue y visible al final', async ({
  page,
}, testInfo) => {  await openGame(page, TEST_SEED_URL);
  await loadState(page, waitingState());

  const result = await dispatchFrozen(page, { type: 'EndTurn' });
  expect(result.events.map((event) => event.type)).toEqual([
    'TurnEnded',
    'EnemyPhaseStarted',
    'EnemyWaited',
    'PlayerTurnStarted',
  ]);

  const atCue = await advanceToCue(page, 'player-turn');
  expect(
    atCue.animation.cues.find((cue) => cue.kind === 'player-turn'),
  ).toBeDefined();
  await expect(page.getByTestId('feedback-banner')).toBeVisible();
  await expect(page.getByTestId('feedback-banner')).toHaveText('TU TURNO');
  await expect(page.getByTestId('feedback-banner')).toHaveAttribute(
    'data-banner-kind',
    'turn',
  );
  // Durante el beat el cursor de presentación sigue oculto.
  await expect(page.getByTestId('cursor')).toBeHidden();
  await screenshot(page, 'turno-jugador', testInfo);

  const finished = await page.evaluate(() => {
    const game = window.__game!;
    const state = game.advance(1_000_000);
    const cursor = document.querySelector<HTMLElement>(
      '[data-testid="cursor"]',
    )!;
    const banner = document.querySelector<HTMLElement>(
      '[data-testid="feedback-banner"]',
    )!;
    return {
      state,
      cursorVisible: !cursor.hidden,
      returning: cursor.classList.contains('is-returning'),
      bannerVisible: !banner.hidden,
      bannerText: banner.textContent,
    };
  });

  expect(finished.state.animation.animating).toBe(false);
  expect(finished.cursorVisible).toBe(true);
  expect(finished.returning).toBe(true);
  // El banner de 700 ms sigue visible tras el beat de 350 ms.
  expect(finished.bannerVisible).toBe(true);
  expect(finished.bannerText).toBe('TU TURNO');
  expect((await snapshot(page)).turn).toBe(2);
});

test('TASK-0061: advance(ms) consume la marca de huida ya creada', async ({
  page,
}) => {
  await openGame(page, TEST_SEED_URL);
  await loadState(page, cowardFleeState());

  const result = await dispatchFrozen(page, {
    type: 'Attack',
    unitId: 'player-1',
    targetId: 'enemy-4',
  });
  expect(result.events.some((event) => event.type === 'EnemyFled')).toBe(true);

  await advanceToCue(page, 'fled');
  const afterAnimation = await settle(page);
  expect(afterAnimation.animation.animating).toBe(false);

  const mark = page.locator(
    '[data-testid="unit-mark"][data-unit-id="enemy-4"]',
  );
  await expect(mark).toBeVisible();
  await page.evaluate(() => window.__game!.advance(0));
  await expect(mark).toBeVisible();

  await page.evaluate(
    (ms) => window.__game!.advance(ms),
    FEEDBACK_CONFIG.texts.fledPersistMs + 100,
  );
  await expect(mark).toHaveCount(0);
});
