import { mkdir, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { expect, test, type Page, type TestInfo } from '@playwright/test';
import type { PlayerConfig } from '../../src/game/config';
import { createInitialState } from '../../src/game/engine';
import { createRoomGrid } from '../../src/game/grid';
import { MANA_RECOVERY_PER_TURN } from '../../src/game/mana';
import { buildSaveFiles } from '../../src/game/save';
import type { GameState, Unit } from '../../src/game/types';
import { centerCameraOnTile } from '../../src/host/camera';
import { CAMERA_PAN_MS } from '../../src/host/camera-pan';
import { gridPixelSize, TILE_SIZE } from '../../src/host/geometry';
import { MAP_VIEWPORT } from '../../src/host/layout';
import { writeSaveZip } from '../../src/host/save-zip';
import { artifactPath } from './artifacts';
import {
  advanceToCue,
  dispatchFrozen,
  openState,
  settle,
  snapshot,
} from './support';

/**
 * QA E2E de TASK-0154: flujo hotseat de 2 y 6 jugadores con `N`, relevo por
 * cámara, aviso de ronda, recursos por turno, una fase enemiga por ronda,
 * fantasma, guardado restringido, resultado y carga. Deriva las aserciones del
 * estado y de los test ids del host, no de la vista interna.
 */

test.use({ viewport: { width: 1280, height: 720 } });

const SEED = 279837264;
const GAME_VERSION = '0.1.0';
const CREATED_AT = '2026-11-16T00:00:00Z';

const PARTY_TWO: readonly PlayerConfig[] = [
  { archetypeId: 'warrior', variant: 1, name: 'Ana' },
  { archetypeId: 'mage', variant: 2, name: 'Bru' },
];

const PARTY_SIX: readonly PlayerConfig[] = [
  { archetypeId: 'warrior', variant: 1, name: 'Ana' },
  { archetypeId: 'warrior', variant: 2, name: 'Bru' },
  { archetypeId: 'warrior', variant: 1, name: 'Cid' },
  { archetypeId: 'warrior', variant: 2, name: 'Dee' },
  { archetypeId: 'warrior', variant: 1, name: 'Eli' },
  { archetypeId: 'warrior', variant: 2, name: 'Fay' },
];

interface Spot {
  readonly x: number;
  readonly y: number;
}

interface StateOptions {
  readonly phase?: GameState['phase'];
  readonly activeIndex?: number;
  readonly round?: number;
  readonly enemies?: readonly Unit[];
}

/** Estado de presentación sobre una sala sin muros, con jugadores y enemigos fijos. */
function hotseatState(
  players: readonly PlayerConfig[],
  spots: readonly Spot[],
  options: StateOptions = {},
): GameState {
  const base = createInitialState({ seed: SEED, players });
  const { map, ...rest } = base;
  if (!map) throw new Error('El estado inicial debe traer mapa.');
  const enemy = base.enemies[0];
  if (!enemy) throw new Error('El estado inicial debe traer un enemigo de plantilla.');
  const dormant = dormantEnemy(enemy, 18, 2);
  return {
    ...rest,
    grid: createRoomGrid(20, 20),
    players: base.players.map((player, index) => ({
      ...player,
      x: spots[index].x,
      y: spots[index].y,
      home: { ...spots[index] },
    })),
    enemies: options.enemies ?? [dormant],
    phase: options.phase ?? 'player',
    activePlayerId:
      base.players[options.activeIndex ?? 0]?.id ?? null,
    round: options.round ?? 1,
    status: 'playing',
  };
}

function dormantEnemy(template: Unit, x: number, y: number): Unit {
  return {
    ...template,
    id: 'enemy-dormant',
    x,
    y,
    home: { x, y },
    awareness: 'dormant',
    fleeing: false,
    lastKnown: null,
    alertTurns: 0,
    hasShouted: false,
  };
}

function alertEnemy(
  template: Unit,
  id: string,
  x: number,
  y: number,
  options: { readonly fleeing?: boolean } = {},
): Unit {
  return {
    ...template,
    id,
    x,
    y,
    home: { x, y },
    awareness: 'alert',
    fleeing: options.fleeing ?? false,
    lastKnown: { x: 5, y: 5 },
    alertTurns: 0,
    hasShouted: true,
    mp: template.maxMp,
    actions: { ...template.actions, remaining: template.actions.max },
  };
}

/** Deja al primer jugador con MP y acción gastados y al segundo sin recursos. */
function withSpentResources(state: GameState): GameState {
  return {
    ...state,
    players: state.players.map((player, index) => {
      if (index === 0) {
        return {
          ...player,
          mp: 1,
          actions: { ...player.actions, remaining: 1 },
        };
      }
      return {
        ...player,
        mp: 0,
        actions: { ...player.actions, remaining: 0 },
        mana: { ...player.mana, current: 0 },
        spellsCast: player.mana.max > 0 ? 1 : 0,
      };
    }),
  };
}

/** Excepciones no capturadas de la página; la suite exige que no haya ninguna. */
function trackPageErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  return errors;
}

async function screenshot(
  page: Page,
  name: string,
  testInfo: TestInfo,
): Promise<void> {
  const path = artifactPath(testInfo, 'screenshots', `${name}.png`);
  await mkdir(dirname(path), { recursive: true });
  await page.mouse.move(0, 0);
  await page.screenshot({ path, animations: 'disabled' });
  await testInfo.attach(name, { path, contentType: 'image/png' });
}

/** Avanza el reloj manual hasta que la presentación cede el paso al paneo. */
async function advanceUntilPanning(page: Page) {
  return page.evaluate(() => {
    const game = window.__game!;
    for (let step = 0; step < 600; step += 1) {
      const current = game.snapshot();
      if (current.panning || !current.animation.animating) return current;
      game.advance(25);
    }
    throw new Error('La animación no terminó antes del paneo.');
  });
}

test('TASK-0154: dos jugadores con N, relevo por cámara, ronda, recursos y una fase enemiga', async ({
  page,
}, testInfo) => {
  const errors = trackPageErrors(page);
  const state = withSpentResources(
    hotseatState(PARTY_TWO, [
      { x: 2, y: 2 },
      { x: 17, y: 17 },
    ]),
  );
  await openState(page, state);

  const start = await snapshot(page);
  expect(start.round).toBe(1);
  expect(start.phase).toBe('player');
  expect(start.activePlayerId).toBe('player-1');
  expect(start.partyOrder).toEqual(['player-1', 'player-2']);
  await expect(page.getByTestId('hud-player-name')).toHaveText('Ana');
  await expect(page.getByTestId('hud-player-position')).toHaveText(
    'Jugador 1 de 2',
  );
  await screenshot(page, 'dos-jugadores-jugador-1-de-2', testInfo);

  // Primer `N`: relevo al segundo jugador, sin fase enemiga y sin teclas extra.
  const handoff = await dispatchFrozen(page, { type: 'EndTurn' });
  expect(handoff.events.map((event) => event.type)).toEqual([
    'TurnEnded',
    'PlayerTurnStarted',
  ]);
  expect(
    handoff.events.some((event) => event.type === 'EnemyPhaseStarted'),
  ).toBe(false);
  const atPan = await advanceUntilPanning(page);
  expect(atPan.activePlayerId).toBe('player-2');
  expect(atPan.panning).toBe(true);
  await page.evaluate(() => window.__game!.advance(150));
  await screenshot(page, 'relevo-paneo', testInfo);

  const arrived = await page.evaluate(
    (ms) => window.__game!.advance(ms),
    CAMERA_PAN_MS,
  );
  expect(arrived.panning).toBe(false);
  expect(arrived.activePlayerId).toBe('player-2');
  const expectedCamera = centerCameraOnTile(
    state.players[1],
    MAP_VIEWPORT,
    gridPixelSize(state.grid, TILE_SIZE),
    TILE_SIZE,
  );
  expect({ x: arrived.camera.x, y: arrived.camera.y }).toEqual(expectedCamera);
  await expect(page.getByTestId('hud-player-name')).toHaveText('Bru');
  await expect(page.getByTestId('hud-player-position')).toHaveText(
    'Jugador 2 de 2',
  );
  await screenshot(page, 'relevo-destino', testInfo);

  // Recursos por turno: el activo recupera +4 de maná desde lo gastado y
  // restaura MP, acciones y cupo; el anterior conserva lo gastado.
  const second = await settle(page);
  expect(second.players[1]).toMatchObject({
    mp: second.players[1].maxMp,
    actions: { remaining: second.players[1].actions.max },
    mana: {
      current: Math.min(
        second.players[1].mana.max,
        state.players[1].mana.current + MANA_RECOVERY_PER_TURN,
      ),
    },
    spellsCast: 0,
  });
  expect(second.players[0]).toMatchObject({
    mp: 1,
    actions: { remaining: 1 },
  });

  // Cierra la ronda: una única fase enemiga con el enemigo dormido, que espera.
  const roundTwo = await dispatchFrozen(page, { type: 'EndTurn' });
  expect(
    roundTwo.events.filter((event) => event.type === 'EnemyPhaseStarted'),
  ).toHaveLength(1);
  expect(roundTwo.events).toContainEqual({
    type: 'EnemyWaited',
    unitId: 'enemy-dormant',
  });
  expect(
    roundTwo.events.find((event) => event.type === 'PlayerTurnStarted'),
  ).toMatchObject({ turn: 2 });
  const atRound = await advanceToCue(page, 'player-turn');
  const banner = page.getByTestId('feedback-banner');
  await expect(banner).toHaveText('Ronda 2');
  await expect(banner).toHaveAttribute('data-banner-kind', 'round');
  await screenshot(page, 'ronda-2', testInfo);

  const nextRound = await settle(page);
  expect(nextRound.round).toBe(2);
  expect(nextRound.phase).toBe('player');
  expect(nextRound.activePlayerId).toBe('player-1');
  expect(nextRound.players[0]).toMatchObject({
    mp: nextRound.players[0].maxMp,
    actions: { remaining: nextRound.players[0].actions.max },
  });
  const firstCamera = centerCameraOnTile(
    state.players[0],
    MAP_VIEWPORT,
    gridPixelSize(state.grid, TILE_SIZE),
    TILE_SIZE,
  );
  expect({ x: nextRound.camera.x, y: nextRound.camera.y }).toEqual(firstCamera);
  expect({ x: nextRound.cursor.x, y: nextRound.cursor.y }).toEqual({
    x: state.players[0].x,
    y: state.players[0].y,
  });
  await expect(page.getByTestId('hud-player-name')).toHaveText('Ana');
  await expect(page.getByTestId('hud-player-position')).toHaveText(
    'Jugador 1 de 2',
  );
  expect(atRound.round).toBe(2);
  expect(errors).toEqual([]);
});

test('TASK-0154: seis jugadores mantienen el orden, «Jugador N de 6» y recursos por turno', async ({
  page,
}, testInfo) => {
  const errors = trackPageErrors(page);
  const base = hotseatState(PARTY_SIX, [
    { x: 2, y: 2 },
    { x: 4, y: 2 },
    { x: 6, y: 2 },
    { x: 8, y: 2 },
    { x: 10, y: 2 },
    { x: 12, y: 2 },
  ]);
  const state: GameState = {
    ...base,
    players: base.players.map((player) => ({
      ...player,
      mp: 0,
      actions: { ...player.actions, remaining: 0 },
    })),
  };
  await openState(page, state);

  const start = await snapshot(page);
  const order = PARTY_SIX.map((_player, index) => `player-${index + 1}`);
  expect(start.partyOrder).toEqual(order);

  for (let index = 0; index < PARTY_SIX.length; index += 1) {
    const atTurn = await snapshot(page);
    expect(atTurn.round).toBe(1);
    expect(atTurn.activePlayerId).toBe(order[index]);
    await expect(page.getByTestId('hud-player-name')).toHaveText(
      PARTY_SIX[index].name,
    );
    await expect(page.getByTestId('hud-player-position')).toHaveText(
      `Jugador ${index + 1} de 6`,
    );
    if (index === PARTY_SIX.length - 1) {
      await screenshot(page, 'seis-jugadores-jugador-6-de-6', testInfo);
    }

    if (index < PARTY_SIX.length - 1) {
      // La tecla real `N` cierra el turno y pasa al siguiente de la lista.
      await page.keyboard.press('n');
      const after = await settle(page);
      expect(after.round).toBe(1);
      expect(after.activePlayerId).toBe(order[index + 1]);
      expect(after.players[index + 1].mp).toBe(
        after.players[index + 1].maxMp,
      );
      expect(after.players[index + 1].actions.remaining).toBe(
        after.players[index + 1].actions.max,
      );
      // Los que aún no han empezado su turno no reciben recursos.
      if (index + 2 < PARTY_SIX.length) {
        expect(after.players[index + 2].mp).toBe(0);
        expect(after.players[index + 2].actions.remaining).toBe(0);
      }
      if (index === 0) {
        expect(after.players[0].mp).toBe(0);
        expect(after.players[0].actions.remaining).toBe(0);
      }
    } else {
      const closed = await dispatchFrozen(page, { type: 'EndTurn' });
      expect(
        closed.events.filter((event) => event.type === 'EnemyPhaseStarted'),
      ).toHaveLength(1);
      expect(
        closed.events.find((event) => event.type === 'PlayerTurnStarted'),
      ).toMatchObject({ turn: 2 });
      await advanceToCue(page, 'player-turn');
      const banner = page.getByTestId('feedback-banner');
      await expect(banner).toHaveText('Ronda 2');
      await settle(page);
      const nextRound = await snapshot(page);
      expect(nextRound.round).toBe(2);
      expect(nextRound.activePlayerId).toBe('player-1');
      expect(nextRound.players[0].mp).toBe(nextRound.players[0].maxMp);
      await expect(page.getByTestId('hud-player-position')).toHaveText(
        'Jugador 1 de 6',
      );
    }
  }
  expect(errors).toEqual([]);
});

test('TASK-0154: «El master mueve» solo con acciones, HUD de actor/objetivo y «Sin objetivo»', async ({
  page,
}, testInfo) => {
  const errors = trackPageErrors(page);
  const base = hotseatState(PARTY_TWO.slice(0, 1), [{ x: 5, y: 5 }]);
  const template = base.enemies[0];
  const attacker = alertEnemy(template, 'enemy-attacker', 6, 5);
  const sleeper = dormantEnemy(template, 18, 18);
  await openState(page, { ...base, enemies: [attacker, sleeper] });

  const opened = await dispatchFrozen(page, { type: 'EndTurn' });
  expect(
    opened.events.filter((event) => event.type === 'EnemyPhaseStarted'),
  ).toHaveLength(1);
  const banner = page.getByTestId('feedback-banner');
  await advanceToCue(page, 'enemy-phase');
  await expect(banner).toHaveText('El master mueve');
  await expect(banner).toHaveAttribute('data-banner-kind', 'phase');
  await screenshot(page, 'fase-enemiga-master-mueve', testInfo);

  await advanceToCue(page, 'attack');
  await expect(banner).toBeHidden();
  const atAttack = await snapshot(page);
  expect(atAttack.enemyActorId).toBe('enemy-attacker');
  expect(atAttack.enemyTargetId).toBe('player-1');
  await expect(page.getByTestId('hud-cursor-detail')).toHaveAttribute(
    'data-kind',
    'enemy',
  );
  await expect(page.getByTestId('hud-player-name')).toHaveText('Ana');
  await expect(page.getByTestId('hud-player-position')).toHaveText('—');
  await screenshot(page, 'fase-enemiga-actor-objetivo', testInfo);

  await advanceToCue(page, 'player-turn');
  await expect(banner).toHaveText('Ronda 2');
  await settle(page);

  // Un enemigo que huye actúa sin objetivo: el HUD no inventa un personaje.
  const fleeBase = hotseatState(PARTY_TWO.slice(0, 1), [{ x: 5, y: 5 }]);
  const fleeing = alertEnemy(
    fleeBase.enemies[0],
    'enemy-fleeing',
    10,
    5,
    { fleeing: true },
  );
  await openState(page, { ...fleeBase, enemies: [fleeing] });
  const fleeOpen = await dispatchFrozen(page, { type: 'EndTurn' });
  expect(
    fleeOpen.events.filter((event) => event.type === 'EnemyPhaseStarted'),
  ).toHaveLength(1);
  await advanceToCue(page, 'enemy-phase');
  await expect(banner).toHaveText('El master mueve');
  await advanceToCue(page, 'move');
  const atFlee = await snapshot(page);
  expect(atFlee.enemyActorId).toBe('enemy-fleeing');
  expect(atFlee.enemyTargetId).toBeNull();
  await expect(page.getByTestId('hud-player-name')).toHaveText('Sin objetivo');
  await screenshot(page, 'fase-enemiga-sin-objetivo', testInfo);
  expect(errors).toEqual([]);
});

test('TASK-0154: el fantasma respeta su turno, pasa con N y no abre el panel', async ({
  page,
}, testInfo) => {
  const errors = trackPageErrors(page);
  const state = hotseatState(PARTY_TWO, [
    { x: 5, y: 5 },
    { x: 8, y: 5 },
  ]);
  const ghost = state.players[0];
  const ghostState: GameState = {
    ...state,
    players: state.players.map((player, index) =>
      index === 0
        ? {
            ...player,
            hp: 0,
            ghost: true,
            actions: { ...player.actions, remaining: 1 },
          }
        : player,
    ),
  };
  await openState(page, ghostState);

  await expect(page.getByTestId('hud-player-name')).toHaveText(ghost.nombre);
  await expect(page.getByTestId('hud-player-position')).toHaveText(
    'Jugador 1 de 2',
  );
  await expect(page.getByTestId('hud-condition')).toHaveText('Fantasma');

  // El fantasma no abre el panel; el turno sí se cierra con `N`.
  await page.keyboard.press('i');
  await expect(page.getByTestId('inventory-panel')).toBeHidden();
  await screenshot(page, 'fantasma-turno', testInfo);

  await page.keyboard.press('n');
  const handoff = await settle(page);
  expect(handoff.activePlayerId).toBe('player-2');
  await expect(page.getByTestId('hud-player-position')).toHaveText(
    'Jugador 2 de 2',
  );

  const closed = await dispatchFrozen(page, { type: 'EndTurn' });
  expect(
    closed.events.some((event) => event.type === 'EnemyPhaseStarted'),
  ).toBe(true);
  await advanceToCue(page, 'player-turn');
  await settle(page);
  const nextRound = await snapshot(page);
  expect(nextRound.round).toBe(2);
  expect(nextRound.activePlayerId).toBe('player-1');
  await expect(page.getByTestId('hud-condition')).toHaveText('Fantasma');
  await expect(page.getByTestId('hud-player-position')).toHaveText(
    'Jugador 1 de 2',
  );
  expect(errors).toEqual([]);
});

test('TASK-0154: guardar se desactiva en fase enemiga y la pausa es global', async ({
  page,
}, testInfo) => {
  const errors = trackPageErrors(page);
  const enemyPhase = hotseatState(PARTY_TWO, [
    { x: 2, y: 2 },
    { x: 17, y: 17 },
  ], { phase: 'enemy' });
  await openState(page, enemyPhase);
  await page.keyboard.press('Escape');
  await expect(page.getByTestId('pause-menu')).toBeVisible();
  await expect(page.getByTestId('pause-save')).toBeDisabled();
  await expect(page.getByTestId('pause-save')).toHaveAttribute(
    'data-enabled',
    'false',
  );
  await expect(page.getByTestId('pause-save-reason')).toHaveText(
    'Solo se puede guardar en la fase de personajes.',
  );
  await screenshot(page, 'fase-enemiga-guardar-desactivado', testInfo);
  await page.keyboard.press('Escape');
  await expect(page.getByTestId('pause-menu')).toBeHidden();

  // `E` y `R` ya no son atajos de juego; `Esc` abre la pausa para cualquiera.
  const playing = hotseatState(PARTY_TWO, [
    { x: 2, y: 2 },
    { x: 17, y: 17 },
  ]);
  await openState(page, playing);
  const before = await snapshot(page);
  await page.keyboard.press('e');
  await page.keyboard.press('r');
  await settle(page);
  const after = await snapshot(page);
  expect(after.activePlayerId).toBe(before.activePlayerId);
  expect(after.round).toBe(before.round);
  expect(after.players).toEqual(before.players);
  expect(
    after.lastEvents.some((event) => event.type === 'GameRestarted'),
  ).toBe(false);
  await page.keyboard.press('Escape');
  await expect(page.getByTestId('pause-menu')).toBeVisible();
  await screenshot(page, 'pausa-global', testInfo);
  expect(errors).toEqual([]);
});

test('TASK-0154: el resultado ofrece Nueva y Cargar, y cargar devuelve el control al activo', async ({
  page,
}, testInfo) => {
  const errors = trackPageErrors(page);
  const ended: GameState = {
    ...hotseatState(PARTY_TWO, [
      { x: 2, y: 2 },
      { x: 17, y: 17 },
    ]),
    status: 'victory',
    round: 4,
  };
  await openState(page, ended);
  await expect(page.getByTestId('result-screen')).toBeVisible();
  await expect(page.getByTestId('result-title')).toHaveText('Victoria');
  await expect(page.getByTestId('result-round')).toHaveText('Ronda 4');
  await expect(page.getByTestId('result-new')).toHaveText('Nueva partida');
  await expect(page.getByTestId('result-load')).toHaveText('Cargar partida');
  await screenshot(page, 'resultado-victoria', testInfo);

  const savedBase = createInitialState({ seed: SEED, players: PARTY_TWO });
  const saved: GameState = {
    ...savedBase,
    activePlayerId: savedBase.players[1].id,
    round: 2,
  };
  const files = buildSaveFiles(saved, {
    gameVersion: GAME_VERSION,
    createdAt: CREATED_AT,
  });
  const path = artifactPath(testInfo, 'saves', 'hotseat-ronda-2-bru.zip');
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, await writeSaveZip(files));

  const chooserPromise = page.waitForEvent('filechooser');
  await page.getByTestId('result-load').click();
  await (await chooserPromise).setFiles(path);
  await expect(page.getByTestId('result-screen')).toBeHidden();
  await settle(page);

  const loaded = await snapshot(page);
  expect(loaded.status).toBe('playing');
  expect(loaded.round).toBe(2);
  expect(loaded.activePlayerId).toBe(saved.players[1].id);
  expect(loaded.panning).toBe(false);
  await expect(page.getByTestId('hud-player-name')).toHaveText('Bru');
  await expect(page.getByTestId('hud-player-position')).toHaveText(
    'Jugador 2 de 2',
  );
  await screenshot(page, 'carga-jugador-2', testInfo);
  expect(errors).toEqual([]);
});
