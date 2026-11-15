import { mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';
import { expect, test, type Page, type TestInfo } from '@playwright/test';
import { createInitialState } from '../../src/game/engine';
import type { PlayerConfig } from '../../src/game/config';
import { createRoomGrid } from '../../src/game/grid';
import type { GameState } from '../../src/game/types';
import { centerCameraOnTile, type Camera } from '../../src/host/camera';
import { CAMERA_PAN_MS } from '../../src/host/camera-pan';
import { gridPixelSize, TILE_SIZE } from '../../src/host/geometry';
import { MAP_VIEWPORT } from '../../src/host/layout';
import type { GameSnapshot } from '../../src/host/debug';
import { artifactPath } from './artifacts';
import { dispatchFrozen, openState, snapshot } from './support';

test.use({ viewport: { width: 1280, height: 720 } });

const SEED = 279837264;
const PARTY: readonly PlayerConfig[] = [
  { archetypeId: 'warrior', variant: 1, name: 'Ana' },
  { archetypeId: 'warrior', variant: 2, name: 'Bru' },
];
const SPOTS = [
  { x: 2, y: 2 },
  { x: 17, y: 17 },
];

/**
 * Estado de presentación: mapa de sala sin muros interiores y sin enemigos para
 * aislar el relevo de la fase enemiga (TASK-0152). La cámara de cada jugador
 * queda en extremos opuestos del recorrido (0,0) y (224,224).
 */
function cameraState(playerCount: 1 | 2): GameState {
  const base = createInitialState({
    seed: SEED,
    players: PARTY.slice(0, playerCount),
  });
  const { map, ...rest } = base;
  if (!map) throw new Error('El estado inicial debe traer mapa.');
  return {
    ...rest,
    grid: createRoomGrid(20, 20),
    enemies: [],
    players: base.players.map((player, index) => ({
      ...player,
      x: SPOTS[index].x,
      y: SPOTS[index].y,
      home: { ...SPOTS[index] },
    })),
  };
}

function cameraOf(state: GameState, playerId: string): Camera {
  const player =
    state.players.find((candidate) => candidate.id === playerId) ??
    state.players[0];
  return centerCameraOnTile(
    player,
    MAP_VIEWPORT,
    gridPixelSize(state.grid, TILE_SIZE),
    TILE_SIZE,
  );
}

/** Avanza el reloj manual hasta que la animación cede el paso al paneo. */
async function advanceUntilPanning(page: Page): Promise<GameSnapshot> {
  return page.evaluate(() => {
    const game = window.__game!;
    for (let step = 0; step < 600; step += 1) {
      const current = game.snapshot();
      if (current.panning || !current.animation.animating) return current;
      game.advance(25);
    }
    throw new Error('La animación no terminó antes de 15 s de presentación.');
  });
}

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

test('TASK-0150: el relevo con dos jugadores panea, bloquea y libera al llegar', async ({
  page,
}, testInfo) => {
  const state = cameraState(2);
  const p1Camera = cameraOf(state, 'player-1');
  const p2Camera = cameraOf(state, 'player-2');

  await openState(page, state);
  const start = await snapshot(page);
  // Ronda 1 arranca directamente en el primer personaje.
  expect(start.round).toBe(1);
  expect(start.activePlayerId).toBe('player-1');
  expect(start.panning).toBe(false);
  expect({ x: start.camera.x, y: start.camera.y }).toEqual(p1Camera);

  await dispatchFrozen(page, { type: 'EndTurn' });
  const atPanStart = await advanceUntilPanning(page);
  expect(atPanStart.activePlayerId).toBe('player-2');
  expect(atPanStart.panning).toBe(true);
  expect(atPanStart.animation.animating).toBe(false);

  const mid = await page.evaluate(() => window.__game!.advance(150));
  expect(mid.panning).toBe(true);
  expect(mid.camera.x).toBeGreaterThan(Math.min(p1Camera.x, p2Camera.x));
  expect(mid.camera.x).toBeLessThan(Math.max(p1Camera.x, p2Camera.x));
  expect(mid.camera.y).toBeGreaterThan(Math.min(p1Camera.y, p2Camera.y));
  expect(mid.camera.y).toBeLessThan(Math.max(p1Camera.y, p2Camera.y));
  await screenshot(page, 'relevo-paneo', testInfo);

  // Durante el paneo se ignoran cursor y fin de turno; el activo no cambia.
  await page.keyboard.press('d');
  await page.keyboard.press('n');
  const blocked = await snapshot(page);
  expect(blocked.panning).toBe(true);
  expect(blocked.activePlayerId).toBe('player-2');
  expect(blocked.cursor.x).toBe(mid.cursor.x);
  expect(blocked.cursor.y).toBe(mid.cursor.y);

  const arrived = await page.evaluate(
    (ms) => window.__game!.advance(ms),
    CAMERA_PAN_MS,
  );
  expect(arrived.panning).toBe(false);
  expect(arrived.activePlayerId).toBe('player-2');
  expect({ x: arrived.camera.x, y: arrived.camera.y }).toEqual(p2Camera);
  // El cursor queda en el activo, no en players[0].
  expect({ x: arrived.cursor.x, y: arrived.cursor.y }).toEqual({
    x: SPOTS[1].x,
    y: SPOTS[1].y,
  });
  await screenshot(page, 'relevo-destino', testInfo);

  // Al llegar, el comando del nuevo activo se acepta.
  await page.keyboard.press('ArrowRight');
  const moved = await snapshot(page);
  expect(moved.cursor.x).toBe(arrived.cursor.x + 1);
  expect(moved.cursor.y).toBe(arrived.cursor.y);
});

test('TASK-0150: la vuelta de la fase enemiga hace paneo al primer jugador', async ({
  page,
}, testInfo) => {
  const state = cameraState(2);
  const p1Camera = cameraOf(state, 'player-1');

  await openState(page, state);
  await dispatchFrozen(page, { type: 'EndTurn' });
  await advanceUntilPanning(page);
  await page.evaluate(() => window.__game!.advance(1_000));
  const second = await snapshot(page);
  expect(second.activePlayerId).toBe('player-2');
  expect(second.panning).toBe(false);

  await dispatchFrozen(page, { type: 'EndTurn' });
  const returnStart = await advanceUntilPanning(page);
  expect(returnStart.round).toBe(2);
  expect(returnStart.activePlayerId).toBe('player-1');
  expect(returnStart.panning).toBe(true);

  const returned = await page.evaluate(
    (ms) => window.__game!.advance(ms),
    CAMERA_PAN_MS,
  );
  expect(returned.panning).toBe(false);
  expect(returned.round).toBe(2);
  expect(returned.activePlayerId).toBe('player-1');
  expect({ x: returned.camera.x, y: returned.camera.y }).toEqual(p1Camera);
  await screenshot(page, 'vuelta-ronda', testInfo);
});

test('TASK-0150: con un solo jugador no hay paneo de relevo', async ({ page }) => {
  const state = cameraState(1);
  const p1Camera = cameraOf(state, 'player-1');

  await openState(page, state);
  await dispatchFrozen(page, { type: 'EndTurn' });
  const after = await advanceUntilPanning(page);

  expect(after.round).toBe(2);
  expect(after.activePlayerId).toBe('player-1');
  expect(after.panning).toBe(false);
  expect(after.animation.animating).toBe(false);
  expect({ x: after.camera.x, y: after.camera.y }).toEqual(p1Camera);
});

test('TASK-0150: con prefers-reduced-motion la cámara salta sin paneo', async ({
  page,
}) => {
  const state = cameraState(2);
  const p2Camera = cameraOf(state, 'player-2');

  await page.emulateMedia({ reducedMotion: 'reduce' });
  await openState(page, state);
  await dispatchFrozen(page, { type: 'EndTurn' });
  const after = await snapshot(page);

  expect(after.activePlayerId).toBe('player-2');
  expect(after.panning).toBe(false);
  expect(after.animation.animating).toBe(false);
  expect({ x: after.camera.x, y: after.camera.y }).toEqual(p2Camera);
});
