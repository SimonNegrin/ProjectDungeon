import { mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';
import { expect, test, type Page, type TestInfo } from '@playwright/test';
import type { GameState, Tile } from '../../src/game/types';
import { artifactPath } from './artifacts';
import {
  TEST_SEED_URL,
  detectionState,
  loadState,
  openGame,
} from './perception-fixtures';
import { dispatchFrozen, openBspState, snapshot } from './support';

test.use({ viewport: { width: 1280, height: 720 } });

const HIT_SEED = 1;

interface GridLike {
  readonly width: number;
  readonly height: number;
  readonly tiles: readonly Tile[];
}

function floorNeighbor(
  grid: GridLike,
  x: number,
  y: number,
): { x: number; y: number } | undefined {
  return [
    { x, y: y - 1 },
    { x: x + 1, y },
    { x, y: y + 1 },
    { x: x - 1, y },
  ].find((cell) => {
    if (cell.x < 0 || cell.y < 0) return false;
    if (cell.x >= grid.width || cell.y >= grid.height) return false;
    return grid.tiles[cell.y * grid.width + cell.x] === 'floor';
  });
}

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

/**
 * Un enemigo alerta adyacente ataca (texto) y un bruto dormido visible espera
 * (marca); al cerrar la fase aparece `TU TURNO` (banner). El BSP de referencia
 * mantiene sin LOS al bruto dormido en (5,4).
 */
function mixedFeedbackState(): GameState {
  const base = detectionState();
  const player = base.players[0];
  const attackerTemplate = base.enemies.find((enemy) => enemy.id === 'enemy-3')!;
  const waiterTemplate = base.enemies.find((enemy) => enemy.id === 'enemy-1')!;
  const adjacent = floorNeighbor(base.grid, player.x, player.y);
  if (!adjacent) throw new Error('El jugador no tiene suelo adyacente');

  return {
    ...base,
    rng: { seed: 1, state: 0 },
    enemies: [
      {
        ...attackerTemplate,
        id: 'enemy-1',
        x: adjacent.x,
        y: adjacent.y,
        home: { ...adjacent },
        mp: attackerTemplate.maxMp,
        actions: {
          ...attackerTemplate.actions,
          remaining: attackerTemplate.actions.max,
        },
        awareness: 'alert',
        fleeing: false,
        lastKnown: { x: player.x, y: player.y },
        alertTurns: 0,
        hasShouted: true,
      },
      {
        ...waiterTemplate,
        id: 'enemy-2',
        x: 5,
        y: 4,
        home: { x: 5, y: 4 },
        mp: waiterTemplate.maxMp,
        actions: {
          ...waiterTemplate.actions,
          remaining: waiterTemplate.actions.max,
        },
        awareness: 'dormant',
        fleeing: false,
        lastKnown: null,
        alertTurns: 0,
        hasShouted: false,
      },
    ],
  };
}

function engineView(snap: Awaited<ReturnType<typeof snapshot>>) {
  return {
    players: snap.players,
    enemies: snap.enemies,
    turn: snap.turn,
    phase: snap.phase,
    status: snap.status,
  };
}

test('TASK-0061: reducido conserva texto, banner y marca sin tween y con el mismo orden', async ({
  page,
}, testInfo) => {
  // Referencia animada: mismos eventos de motor y mismo estado final.
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await openGame(page, TEST_SEED_URL);
  await loadState(page, mixedFeedbackState());
  const animated = await dispatchFrozen(page, { type: 'EndTurn' });
  const animatedSnap = await snapshot(page);
  expect(animated.events.map((event) => event.type)).toEqual([
    'TurnEnded',
    'EnemyPhaseStarted',
    'AttackPerformed',
    // REQ-027: el ataque enemigo falla y el jugador replica en el mismo beat.
    'ReplicaPerformed',
    'EnemyWaited',
    'PlayerTurnStarted',
  ]);

  // Movimiento reducido: todo se aplica en el evento, sin reloj de tween.
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await openGame(page, TEST_SEED_URL);
  await loadState(page, mixedFeedbackState());
  const reduced = await dispatchFrozen(page, { type: 'EndTurn' });
  const reducedSnap = await snapshot(page);

  expect(reduced.events).toEqual(animated.events);
  expect(reduced.events.map((event) => event.type)).toEqual(
    animated.events.map((event) => event.type),
  );
  expect(engineView(reducedSnap)).toEqual(engineView(animatedSnap));
  expect(reducedSnap.animation).toMatchObject({
    animating: false,
    step: 0,
    totalSteps: 0,
    unitId: null,
    position: null,
    cues: [],
  });

  const attack = reduced.events.find((event) => event.type === 'AttackPerformed');
  expect(attack).toBeDefined();
  const text = page.getByTestId('damage-feedback');
  await expect(text).toBeVisible();
  await expect(text).toHaveText(attack!.hit ? `-${attack!.damage}` : 'Fallo');
  await expect(text).toHaveAttribute(
    'data-result',
    attack!.hit ? 'hit' : 'miss',
  );
  const textStyle = await text.evaluate((node) => {
    const element = node as HTMLElement;
    return { opacity: element.style.opacity, transform: element.style.transform };
  });
  expect(textStyle.opacity).toBe('1');
  // Sin desplazamiento de 4 px: el estado final es estático.
  expect(textStyle.transform).toContain('- 0px');

  await expect(page.getByTestId('feedback-banner')).toBeVisible();
  await expect(page.getByTestId('feedback-banner')).toHaveText('TU TURNO');
  await expect(page.getByTestId('feedback-banner')).toHaveAttribute(
    'data-banner-kind',
    'turn',
  );

  const mark = page.locator('[data-testid="unit-mark"][data-unit-id="enemy-2"]');
  await expect(mark).toBeVisible();
  await expect(mark).toHaveText('...');
  await expect(mark).toHaveAttribute('data-mark-kind', 'waited');

  // Sin tinte de fase ni parpadeo de cursor: no hay animación.
  await expect(page.getByTestId('frame-effects')).toHaveAttribute(
    'data-effect',
    'none',
  );
  await expect(page.getByTestId('cursor')).not.toHaveClass(/is-returning/);
  await screenshot(page, 'reducido-banner-marca', testInfo);
});

test('TASK-0061: reducido no sacude al rechazar ni funde al reiniciar', async ({
  page,
}, testInfo) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await openGame(page, TEST_SEED_URL);
  await loadState(page, mixedFeedbackState());

  const rejected = await dispatchFrozen(page, {
    type: 'Attack',
    unitId: 'player-1',
    targetId: 'enemy-2',
  });
  expect(rejected.events.map((event) => event.type)).toEqual(['CommandRejected']);
  const afterRejection = await snapshot(page);
  expect(afterRejection.animation.animating).toBe(false);
  await expect(page.getByTestId('cursor')).not.toHaveClass(/is-shaking/);
  await expect(page.getByTestId('hud-message')).toBeVisible();
  await screenshot(page, 'reducido-rechazo', testInfo);

  const restart = await page.evaluate(() => {
    const result = window.__game!.dispatch({ type: 'Restart' });
    window.__game!.advance(0);
    const fade = document.querySelector<HTMLElement>(
      '[data-testid="screen-fade"]',
    )!;
    const banner = document.querySelector<HTMLElement>(
      '[data-testid="feedback-banner"]',
    )!;
    return {
      events: result.events.map((event) => event.type),
      fadeHidden: fade.hidden,
      bannerHidden: banner.hidden,
      marks: document.querySelectorAll('[data-testid="unit-mark"]').length,
      animating: window.__game!.snapshot().animation.animating,
    };
  });

  expect(restart.events).toContain('GameRestarted');
  expect(restart.fadeHidden).toBe(true);
  expect(restart.bannerHidden).toBe(true);
  expect(restart.marks).toBe(0);
  expect(restart.animating).toBe(false);
  await screenshot(page, 'reducido-reinicio', testInfo);
});

test('TASK-0061: reducido aplica el impacto sin tween y conserva `-N`', async ({
  page,
}, testInfo) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const base = await openBspState(page, HIT_SEED);
  const enemy = base.enemies[0];
  const west = floorNeighbor(base.grid, enemy.x, enemy.y);
  expect(west).toBeDefined();
  await openBspState(page, HIT_SEED, undefined, {
    player: west!,
    enemies: [enemy],
  });

  const result = await dispatchFrozen(page, {
    type: 'Attack',
    unitId: 'player-1',
    targetId: enemy.id,
  });
  const attack = result.events.find(
    (event): event is Extract<typeof event, { type: 'AttackPerformed' }> =>
      event.type === 'AttackPerformed',
  );
  expect(attack).toBeDefined();
  expect(attack!.hit).toBe(true);

  const snap = await snapshot(page);
  expect(snap.animation.animating).toBe(false);
  await expect(page.getByTestId('damage-feedback')).toHaveText(
    `-${attack!.damage}`,
  );
  await expect(page.getByTestId('damage-feedback')).toHaveAttribute(
    'data-result',
    'hit',
  );
  await screenshot(page, 'reducido-impacto', testInfo);
});
