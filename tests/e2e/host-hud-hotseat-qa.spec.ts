import { mkdir, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { expect, test, type Page, type TestInfo } from '@playwright/test';
import { createInitialState } from '../../src/game/engine';
import { buildSaveFiles } from '../../src/game/save';
import type { GameState } from '../../src/game/types';
import { FEEDBACK_CONFIG } from '../../src/host/feedback-config';
import { writeSaveZip } from '../../src/host/save-zip';
import { artifactPath } from './artifacts';
import { TEST_SEED_URL, loadState, openGame } from './perception-fixtures';
import {
  advanceToCue,
  dispatchFrozen,
  openState,
  settle,
  snapshot,
} from './support';

/**
 * QA E2E de TASK-0151: «Jugador N de M» junto al activo y aviso «Ronda N» de
 * 2 s que no bloquea. El N/M y la ronda salen del estado; el host solo deriva.
 */

test.use({ viewport: { width: 1280, height: 720 } });

const SEED = 279837264;
const PAGE_SEED = 4242;
const GAME_VERSION = '0.1.0';
const CREATED_AT = '2026-11-15T20:00:00Z';

async function screenshot(
  page: Page,
  name: string,
  testInfo: TestInfo,
): Promise<void> {
  const path = artifactPath(testInfo, 'screenshots', `${name}.png`);
  await mkdir(dirname(path), { recursive: true });
  await page.screenshot({ path, animations: 'disabled' });
  await testInfo.attach(name, { path, contentType: 'image/png' });
}

/** Partida de `names.length` guerreros con un único enemigo dormido. */
function hotseatState(names: readonly string[]): GameState {
  const variants = [1, 2] as const;
  const base = createInitialState({
    seed: SEED,
    players: names.map((name, index) => ({
      archetypeId: 'warrior' as const,
      variant: variants[index % variants.length],
      name,
    })),
  });
  const enemy = base.enemies[0];
  const dormant = {
    ...enemy,
    awareness: 'dormant' as const,
    fleeing: false,
    lastKnown: null,
    alertTurns: 0,
    hasShouted: false,
  };
  return { ...base, enemies: [dormant] };
}

/** Recorre el menú normal hasta empezar una partida de `playerCount`. */
async function startPartyFromMenu(
  page: Page,
  playerCount: number,
): Promise<void> {
  await page.goto(`/?seed=${PAGE_SEED}`);
  await expect(page.getByTestId('start-screen')).toBeVisible();
  await page.getByTestId('start-new').click();
  await expect(page.getByTestId('start-step1')).toBeVisible();
  await page.getByTestId('step1-players').selectOption(String(playerCount));
  await page.getByTestId('step1-seed').fill(String(PAGE_SEED));
  await page.getByTestId('step1-continue').click();
  await expect(page.getByTestId('player-screen')).toBeVisible();
  for (let index = 0; index < playerCount; index += 1) {
    await page.getByTestId('player-next').click();
  }
  await expect(page.getByTestId('party-summary')).toBeVisible();
  await page.getByTestId('summary-start').click();
  await page.waitForFunction(
    (count) => {
      const current = window.__game?.snapshot();
      return Boolean(
        current?.assetsLoaded && current.config?.players.length === count,
      );
    },
    playerCount,
  );
}

test('TASK-0151: al empezar la ronda 1 se anuncia y el aviso no bloquea', async ({
  page,
}, testInfo) => {
  await startPartyFromMenu(page, 2);
  // El reloj de presentación se congela para medir el aviso sin depender del
  // tiempo real de las aserciones; no toca el estado ni el gate de input.
  await page.evaluate(() => window.__game!.advance(0));

  const banner = page.getByTestId('feedback-banner');
  await expect(banner).toBeVisible();
  await expect(banner).toHaveText('Ronda 1');
  await expect(banner).toHaveAttribute('data-banner-kind', 'round');
  await expect(page.getByTestId('hud-player-position')).toHaveText(
    'Jugador 1 de 2',
  );
  await expect(page.getByTestId('hud-live')).toContainText('Jugador 1 de 2');
  await expect(page.getByTestId('hud-live')).toContainText('Ronda 1');
  await screenshot(page, 'partida-2-jugadores-ronda-1', testInfo);

  // Con el banner aún visible: una flecha mueve el cursor y `I` abre el panel.
  const before = await snapshot(page);
  expect(before.animation.animating).toBe(false);
  await page.keyboard.press('ArrowRight');
  const after = await snapshot(page);
  expect(
    after.cursor.x !== before.cursor.x || after.cursor.y !== before.cursor.y,
  ).toBe(true);
  await expect(banner).toBeVisible();
  await expect(banner).toHaveText('Ronda 1');

  await page.keyboard.press('i');
  await expect(page.getByTestId('inventory-panel')).toBeVisible();
  await screenshot(page, 'panel-abierto-con-ronda-1', testInfo);
});

test('TASK-0151: el relevo dentro de la ronda sigue siendo `TU TURNO` y la ronda 2 anuncia `Ronda 2`', async ({
  page,
}, testInfo) => {
  await openState(page, hotseatState(['Ana', 'Bru']));
  await expect(page.getByTestId('hud-player-position')).toHaveText(
    'Jugador 1 de 2',
  );

  // Relevo dentro de la ronda 1: no abre ronda, así que no hay aviso de ronda.
  const handoff = await dispatchFrozen(page, { type: 'EndTurn' });
  expect(handoff.events.map((event) => event.type)).toEqual([
    'TurnEnded',
    'PlayerTurnStarted',
  ]);
  const atHandoff = await advanceToCue(page, 'player-turn');
  expect(atHandoff.turn).toBe(1);
  const banner = page.getByTestId('feedback-banner');
  await expect(banner).toHaveText('TU TURNO');
  await expect(banner).toHaveAttribute('data-banner-kind', 'turn');
  await settle(page);
  await expect(page.getByTestId('hud-player-name')).toHaveText('Bru');
  await expect(page.getByTestId('hud-player-position')).toHaveText(
    'Jugador 2 de 2',
  );

  // Cierra la ronda 1: la fase enemiga vuelve al primer jugador en ronda 2.
  const roundTwo = await dispatchFrozen(page, { type: 'EndTurn' });
  expect(roundTwo.events.some((event) => event.type === 'EnemyPhaseStarted')).toBe(
    true,
  );
  expect(
    roundTwo.events.find((event) => event.type === 'PlayerTurnStarted'),
  ).toMatchObject({ turn: 2 });

  const atCue = await advanceToCue(page, 'player-turn');
  expect(atCue.turn).toBe(2);
  await expect(banner).toBeVisible();
  await expect(banner).toHaveText('Ronda 2');
  await expect(banner).toHaveAttribute('data-banner-kind', 'round');
  await screenshot(page, 'ronda-2-cue', testInfo);

  // 2 s > beat de 350 ms: el aviso sigue visible al terminar la animación.
  const finished = await settle(page);
  expect(finished.animation.animating).toBe(false);
  await expect(banner).toBeVisible();
  await expect(banner).toHaveText('Ronda 2');

  // Y no bloquea: la flecha se acepta con el banner en pantalla.
  const before = await snapshot(page);
  await page.keyboard.press('ArrowRight');
  const after = await snapshot(page);
  expect(
    after.cursor.x !== before.cursor.x || after.cursor.y !== before.cursor.y,
  ).toBe(true);
  await expect(page.getByTestId('hud-player-position')).toHaveText(
    'Jugador 1 de 2',
  );
  await screenshot(page, 'ronda-2-no-bloquea', testInfo);

  // El aviso se apaga dentro de su duración configurada, no antes del beat.
  expect(FEEDBACK_CONFIG.texts.roundBannerMs).toBeGreaterThan(
    FEEDBACK_CONFIG.beats.playerTurn,
  );
  await page.evaluate(
    (ms) => window.__game!.advance(ms),
    FEEDBACK_CONFIG.texts.roundBannerMs,
  );
  await expect(banner).toBeHidden();
});

test('TASK-0151: un jugador comparte la ruta y lee «Jugador 1 de 1» y «Ronda 2»', async ({
  page,
}, testInfo) => {
  await openState(page, hotseatState(['Ana']));
  await expect(page.getByTestId('hud-player-position')).toHaveText(
    'Jugador 1 de 1',
  );
  await expect(page.getByTestId('hud-live')).toContainText('Jugador 1 de 1');

  const result = await dispatchFrozen(page, { type: 'EndTurn' });
  expect(result.events.some((event) => event.type === 'EnemyPhaseStarted')).toBe(
    true,
  );
  expect(
    result.events.find((event) => event.type === 'PlayerTurnStarted'),
  ).toMatchObject({ turn: 2 });

  await advanceToCue(page, 'player-turn');
  const banner = page.getByTestId('feedback-banner');
  await expect(banner).toHaveText('Ronda 2');
  await expect(banner).toHaveAttribute('data-banner-kind', 'round');
  await settle(page);

  await expect(page.getByTestId('hud-player-position')).toHaveText(
    'Jugador 1 de 1',
  );
  await expect(page.getByTestId('hud-player-name')).toHaveText('Ana');
  await expect(page.getByTestId('hud-live')).toHaveText(
    'Turno de Ana. Jugador 1 de 1. Ronda 2.',
  );
  await screenshot(page, 'un-jugador-ronda-2', testInfo);
});

test('TASK-0151: cargar un .zip real no muestra aviso y lee la ronda del estado', async ({
  page,
}, testInfo) => {
  // Guardado con el segundo jugador activo y la partida ya en ronda 2.
  const base = createInitialState({
    seed: SEED,
    players: [
      { archetypeId: 'warrior', variant: 1, name: 'Ana' },
      { archetypeId: 'warrior', variant: 2, name: 'Bru' },
    ],
  });
  const saved: GameState = {
    ...base,
    round: 2,
    activePlayerId: base.players[1].id,
  };
  const files = buildSaveFiles(saved, {
    gameVersion: GAME_VERSION,
    createdAt: CREATED_AT,
  });
  const path = artifactPath(testInfo, 'saves', 'ronda-2-bru.zip');
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, await writeSaveZip(files));

  await page.goto(`/?seed=${PAGE_SEED}`);
  await page.waitForFunction(
    () => Boolean(window.__game) && window.__game!.snapshot().assetsLoaded,
  );
  await expect(page.getByTestId('start-screen')).toBeVisible();

  const chooserPromise = page.waitForEvent('filechooser');
  await page.getByTestId('start-load').click();
  const chooser = await chooserPromise;
  await chooser.setFiles(path);

  await expect(page.getByTestId('start-screen')).toBeHidden();
  const loaded = await snapshot(page);
  expect(loaded.round).toBe(2);
  expect(loaded.activePlayerId).toBe(saved.players[1].id);
  expect(loaded.animation.animating).toBe(false);
  expect(loaded.panning).toBe(false);

  // La ronda se lee del estado: sin banner, sin beat y en la región viva.
  await expect(page.getByTestId('feedback-banner')).toBeHidden();
  await expect(page.getByTestId('hud-player-name')).toHaveText('Bru');
  await expect(page.getByTestId('hud-player-position')).toHaveText(
    'Jugador 2 de 2',
  );
  await expect(page.getByTestId('hud-live')).toHaveText(
    'Turno de Bru. Jugador 2 de 2. Ronda 2.',
  );
  await screenshot(page, 'carga-ronda-2-bru', testInfo);
});

test('TASK-0151: el escenario de test tampoco anuncia ronda al montarse', async ({
  page,
}, testInfo) => {
  await openGame(page, TEST_SEED_URL);
  await loadState(page, hotseatState(['Ana', 'Bru']));

  await expect(page.getByTestId('feedback-banner')).toBeHidden();
  await expect(page.getByTestId('hud-player-position')).toHaveText(
    'Jugador 1 de 2',
  );
  await screenshot(page, 'escenario-sin-aviso', testInfo);
});
