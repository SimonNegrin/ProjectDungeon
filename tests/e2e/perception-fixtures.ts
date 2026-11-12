import { mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';
import type { Page, TestInfo } from '@playwright/test';
import { BspMapGenerator } from '../../src/game/bsp';
import { createInitialState } from '../../src/game/engine';
import type { GameState, Tile, Unit } from '../../src/game/types';
import type { GameSnapshot } from '../../src/host/debug';
import { artifactPath } from './artifacts';
import { settle } from './support';

/** Semilla de referencia de REQ-009/TASK-0039. */
export const REFERENCE_SEED = 279837264;
export const TEST_SEED_URL = `/?seed=${REFERENCE_SEED}&test=1`;
export const NORMAL_SEED_URL = `/?seed=${REFERENCE_SEED}`;

export interface ScreenshotOptions {
  readonly testInfo: TestInfo;
  readonly name: string;
}

/** Abre la partida y espera a que el host tenga assets y `__game`. */
export async function openGame(page: Page, url: string): Promise<void> {
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto(url);
  await page.waitForFunction(
    () => Boolean(window.__game) && window.__game!.snapshot().assetsLoaded,
  );
}

/**
 * Carga un estado serializable con el hook `?test=1`. El test construye el
 * estado en Node; el host no expone mutadores del estado vivo.
 */
export async function loadState(
  page: Page,
  state: GameState,
): Promise<GameSnapshot> {
  const snapshot = await page.evaluate(
    (next) => window.__game!.setup!(next),
    state,
  );
  await settle(page);
  return snapshot;
}

export async function screenshot(
  page: Page,
  testInfo: TestInfo,
  name: string,
): Promise<string> {
  const path = artifactPath(testInfo, 'screenshots', `${name}.png`);
  await mkdir(dirname(path), { recursive: true });
  await page.screenshot({ path });
  await testInfo.attach(name, { path, contentType: 'image/png' });
  return path;
}

export function watchConsole(page: Page): string[] {
  const errors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  page.on('pageerror', (error) => errors.push(error.message));
  return errors;
}

const DORMANT = {
  awareness: 'dormant' as const,
  fleeing: false,
  lastKnown: null,
  alertTurns: 0,
  hasShouted: false,
};

function placePlayer(state: GameState, x: number, y: number): GameState {
  const player = state.players[0];
  return {
    ...state,
    players: [
      {
        ...player,
        x,
        y,
        home: { x, y },
        mp: player.maxMp,
        actions: { ...player.actions, remaining: player.actions.max },
      },
    ],
  };
}

function placeEnemy(
  state: GameState,
  id: string,
  x: number,
  y: number,
  patch: Partial<Unit> = {},
): GameState {
  return {
    ...state,
    enemies: state.enemies.map((enemy) =>
      enemy.id === id
        ? {
            ...enemy,
            x,
            y,
            home: { x, y },
            mp: enemy.maxMp,
            actions: { ...enemy.actions, remaining: enemy.actions.max },
            ...patch,
          }
        : enemy,
    ),
  };
}

function withRng(state: GameState, seed: number): GameState {
  return { ...state, rng: { seed, state: 0 } };
}

/** Estado BSP de referencia, con las coordenadas fijas de REQ-009. */
export function referenceState(): GameState {
  return createInitialState({
    seed: REFERENCE_SEED,
    generator: new BspMapGenerator(),
  });
}

/** A: jugador en (1,2) y bruto en (5,4); el `MoveTo` a (4,2) cruza su vista. */
export function detectionState(): GameState {
  let state = placePlayer(referenceState(), 1, 2);
  state = placeEnemy(state, 'enemy-3', 5, 4, DORMANT);
  return state;
}

/**
 * B: bruto dormido adyacente; centinela a 5 tiles tras un muro y otro a 6. El
 * ataque debe despertar al bruto y al de 5, sin cadena hacia el de 6.
 */
export function damageAlarmState(): GameState {
  let state = placePlayer(referenceState(), 2, 2);
  state = withRng(state, 1);
  state = placeEnemy(state, 'enemy-3', 1, 2, DORMANT);
  state = placeEnemy(state, 'enemy-1', 6, 4, DORMANT);
  state = placeEnemy(state, 'enemy-2', 7, 4, DORMANT);
  return state;
}

/** C: cobarde dormido adyacente; un golpe fuerte inicia la huida. */
export function cowardFleeState(): GameState {
  let state = placePlayer(referenceState(), 2, 2);
  // Semilla de combate: el primer impacto hace 3 de daño y deja vivo al
  // cobarde (2/5 PV), justo por encima del umbral del 40 %.
  state = withRng(state, 3);
  state = placeEnemy(state, 'enemy-4', 1, 2, DORMANT);
  return state;
}

/** Valiente adyacente: el mismo golpe fuerte no debe activar `fleeing`. */
export function braveHitState(): GameState {
  let state = placePlayer(referenceState(), 19, 18);
  state = withRng(state, 1);
  state = placeEnemy(state, 'enemy-1', 20, 18, DORMANT);
  return state;
}

/** Cobarde ya en huida con vida completa: otro golpe fuerte renueva la huida. */
export function fleeingRenewalState(): GameState {
  let state = placePlayer(referenceState(), 19, 18);
  // Misma semilla de combate que `cowardFleeState`: impacto de 3 y 2/5 PV.
  state = withRng(state, 3);
  state = placeEnemy(state, 'enemy-4', 20, 18, {
    ...DORMANT,
    awareness: 'alert',
    fleeing: true,
    lastKnown: { x: 19, y: 18 },
    hasShouted: true,
  });
  return state;
}

/**
 * Acorralado: mapa 20×20 con el mismo fondo de saco del unitario de IA. El
 * cobarde en huida no puede romper la visión ni alejarse, así que ataca.
 */
export function corralledState(): GameState {
  const width = 20;
  const height = 20;
  const tiles: Tile[] = [];
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const border = x === 0 || y === 0 || x === width - 1 || y === height - 1;
      tiles.push(border ? 'wall' : 'floor');
    }
  }
  for (const [x, y] of [
    [5, 4],
    [6, 4],
    [7, 4],
    [7, 5],
    [7, 6],
    [6, 6],
    [5, 6],
  ]) {
    tiles[y * width + x] = 'wall';
  }

  const base = referenceState();
  const player = base.players[0];
  const coward = base.enemies[3];
  return {
    grid: { width, height, tiles },
    players: [
      {
        ...player,
        x: 5,
        y: 5,
        home: { x: 5, y: 5 },
        mp: player.maxMp,
        actions: { ...player.actions, remaining: player.actions.max },
      },
    ],
    enemies: [
      {
        ...coward,
        x: 6,
        y: 5,
        home: { x: 6, y: 5 },
        hp: 2,
        mp: coward.maxMp,
        actions: { ...coward.actions, remaining: coward.actions.max },
        awareness: 'alert',
        fleeing: true,
        lastKnown: { x: 5, y: 5 },
        alertTurns: 0,
        hasShouted: true,
      },
    ],
    phase: 'player',
    turn: 1,
    status: 'playing',
    rng: { seed: 1, state: 0 },
  };
}
