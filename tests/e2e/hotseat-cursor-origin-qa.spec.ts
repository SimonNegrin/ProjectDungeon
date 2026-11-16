import { expect, test } from '@playwright/test';
import type { PlayerConfig } from '../../src/game/config';
import { createInitialState } from '../../src/game/engine';
import { createRoomGrid } from '../../src/game/grid';
import type { GameState } from '../../src/game/types';
import { moveCursorTo, openState, settle, snapshot } from './support';

test.use({ viewport: { width: 1280, height: 720 } });

const SEED = 279837264;
const PARTY: readonly PlayerConfig[] = [
  { archetypeId: 'warrior', variant: 1, name: 'Ana' },
  { archetypeId: 'warrior', variant: 2, name: 'Bru' },
];

/**
 * Sala sin muros con dos jugadores en extremos opuestos: el camino desde el
 * primero es largo y el del segundo corto, así que un origen equivocado se
 * distingue por la longitud y por el primer paso.
 */
function twoPlayerState(): GameState {
  const base = createInitialState({ seed: SEED, players: PARTY });
  const { map, ...rest } = base;
  if (!map) throw new Error('El estado inicial debe traer mapa.');
  return {
    ...rest,
    grid: createRoomGrid(20, 20),
    players: base.players.map((player, index) => ({
      ...player,
      x: index === 0 ? 2 : 17,
      y: index === 0 ? 2 : 17,
      home: { x: index === 0 ? 2 : 17, y: index === 0 ? 2 : 17 },
    })),
    enemies: [],
  };
}

test('el camino del cursor nace del jugador activo tras N', async ({ page }) => {
  await openState(page, twoPlayerState());

  const start = await snapshot(page);
  expect(start.activePlayerId).toBe('player-1');
  expect(start.cursor).toMatchObject({
    x: start.players[0].x,
    y: start.players[0].y,
    state: 'player',
    path: [],
  });

  // `N` entrega el turno al segundo jugador y el cursor reaparece sobre él.
  await page.keyboard.press('n');
  const second = await settle(page);
  expect(second.activePlayerId).toBe('player-2');
  const active = second.players.find(
    (player) => player.id === second.activePlayerId,
  );
  const other = second.players.find(
    (player) => player.id !== second.activePlayerId,
  );
  expect(active).toBeDefined();
  expect(other).toBeDefined();
  expect(second.cursor).toMatchObject({
    x: active!.x,
    y: active!.y,
    state: 'player',
    path: [],
  });

  // Un paso a la derecha del activo: camino y coste desde él, no desde el otro.
  await moveCursorTo(page, active!.x + 1, active!.y);
  const planned = await snapshot(page);
  expect(planned.cursor).toMatchObject({
    kind: 'floor',
    state: 'reachable',
  });
  expect(planned.cursor.path).toEqual([{ x: active!.x + 1, y: active!.y }]);
  expect(planned.cursor.path[0]).not.toEqual({ x: other!.x, y: other!.y });

  // El mismo camino que previsualiza el cursor es el que ejecuta MoveTo.
  await page.keyboard.press('Space');
  await settle(page);
  const moved = await snapshot(page);
  expect(
    moved.players.find((player) => player.id === 'player-2'),
  ).toMatchObject({
    x: active!.x + 1,
    y: active!.y,
    mp: active!.mp - 1,
  });
  expect(moved.players.find((player) => player.id === 'player-1')).toEqual(
    other,
  );
  expect(moved.cursor).toMatchObject({
    x: active!.x + 1,
    y: active!.y,
    state: 'player',
    path: [],
  });
});
