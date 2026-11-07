import { describe, expect, it } from 'vitest';
import {
  createInitialState,
  DEFAULT_MAP_OPTIONS,
  DEFAULT_MAP_SEED,
  ENEMY_MAX_HP,
  ENEMY_MAX_MP,
  isOccupied,
  isWallAt,
  PLAYER_MAX_HP,
  PLAYER_MAX_MP,
  reduce,
  type GameState,
} from '../../../src/game/index';
import { makeState, makeUnit } from './helpers';

describe('engine state', () => {
  it('crea un mapa generado de 32x32 con muros en el borde y suelo transitable', () => {
    const state = createInitialState();

    expect(state.grid.width).toBe(32);
    expect(state.grid.height).toBe(32);
    expect(state.grid.tiles).toHaveLength(32 * 32);

    expect(state.map).toBeDefined();
    expect(state.map?.seed).toBe(DEFAULT_MAP_SEED);
    expect(state.map?.options).toEqual(DEFAULT_MAP_OPTIONS);
    expect(state.map?.tiles).toBe(state.grid.tiles);

    for (let x = 0; x < state.grid.width; x += 1) {
      expect(isWallAt(state.grid, x, 0)).toBe(true);
      expect(isWallAt(state.grid, x, state.grid.height - 1)).toBe(true);
    }
    for (let y = 0; y < state.grid.height; y += 1) {
      expect(isWallAt(state.grid, 0, y)).toBe(true);
      expect(isWallAt(state.grid, state.grid.width - 1, y)).toBe(true);
    }

    expect(state.grid.tiles.filter((tile) => tile === 'floor').length).toBeGreaterThan(0);
  });

  it('coloca al jugador y al enemigo en los spawns del mapa con vida, MP y acción iniciales', () => {
    const state = createInitialState();
    const spawns = state.map?.spawns;

    expect(spawns).toBeDefined();
    expect(state.players).toHaveLength(1);
    expect(state.enemies).toHaveLength(1);
    expect(state.players[0]).toMatchObject({
      id: 'player-1',
      x: spawns?.player.x,
      y: spawns?.player.y,
      hp: PLAYER_MAX_HP,
      maxHp: PLAYER_MAX_HP,
      mp: PLAYER_MAX_MP,
      maxMp: PLAYER_MAX_MP,
      actionAvailable: true,
    });
    expect(state.enemies[0]).toMatchObject({
      id: 'enemy-1',
      x: spawns?.enemy.x,
      y: spawns?.enemy.y,
      hp: ENEMY_MAX_HP,
      maxHp: ENEMY_MAX_HP,
      mp: ENEMY_MAX_MP,
      maxMp: ENEMY_MAX_MP,
      actionAvailable: true,
    });
    expect(PLAYER_MAX_MP).toBe(6);
    expect(ENEMY_MAX_MP).toBe(4);
    expect(state.phase).toBe('player');
    expect(state.turn).toBe(1);
    expect(state.status).toBe('playing');
  });

  it('no coloca entidades sobre muros ni casillas ocupadas', () => {
    const state = createInitialState();
    const units = [...state.players, ...state.enemies];

    for (const unit of units) {
      expect(isWallAt(state.grid, unit.x, unit.y)).toBe(false);
    }
    expect(isOccupied(state, state.players[0].x, state.players[0].y)).toBe(true);
    expect(isOccupied(state, state.enemies[0].x, state.enemies[0].y)).toBe(true);
  });

  it('es serializable y puede reducirse tras un round-trip JSON', () => {
    const state = createInitialState();
    const parsed = JSON.parse(JSON.stringify(state)) as GameState;

    expect(parsed).toEqual(state);
    expect(parsed.map).toEqual(state.map);
    expect(JSON.parse(JSON.stringify(state.map))).toEqual(state.map);

    const player = state.players[0];
    const direction = findOpenDirection(state, player.x, player.y);
    const result = reduce(parsed, {
      type: 'Move',
      unitId: 'player-1',
      dx: direction.dx,
      dy: direction.dy,
    });

    expect(result.state.players[0]).toMatchObject({
      x: player.x + direction.dx,
      y: player.y + direction.dy,
      mp: 5,
    });
    expect(result.state.map).toEqual(state.map);
  });

  it('es determinista: dos estados iniciales son profundamente iguales', () => {
    const first = createInitialState();
    const second = createInitialState();

    expect(JSON.stringify(second)).toBe(JSON.stringify(first));
    expect(second).toEqual(first);
  });

  it('reduce es pura y no muta el estado de entrada', () => {
    const state = makeState({
      players: [makeUnit({ id: 'player-1', faction: 'player', x: 5, y: 5 })],
      enemies: [makeUnit({ id: 'enemy-1', faction: 'enemy', x: 10, y: 5 })],
    });
    const before = JSON.stringify(state);

    const result = reduce(state, { type: 'Move', unitId: 'player-1', dx: 1, dy: 0 });

    expect(JSON.stringify(state)).toBe(before);
    expect(result.state).not.toBe(state);
    expect(result.state.players[0]).not.toBe(state.players[0]);
  });

  it('Restart vuelve siempre al estado inicial', () => {
    const dirty = makeState({
      players: [makeUnit({ id: 'player-1', faction: 'player', x: 9, y: 9, hp: 4, mp: 0 })],
      enemies: [makeUnit({ id: 'enemy-1', faction: 'enemy', x: 10, y: 9, hp: 2 })],
      turn: 7,
      status: 'victory',
    });

    const result = reduce(dirty, { type: 'Restart' });

    expect(result.state).toEqual(createInitialState());
    expect(result.events).toEqual([{ type: 'GameRestarted' }]);
  });

  it('rechaza comandos de juego cuando la partida ha terminado', () => {
    for (const status of ['victory', 'defeat'] as const) {
      const state = makeState({ status });
      const result = reduce(state, { type: 'Move', unitId: 'player-1', dx: 1, dy: 0 });

      expect(result.state).toBe(state);
      expect(result.events).toEqual([
        { type: 'CommandRejected', commandType: 'Move', reason: 'game-over' },
      ]);
    }
  });
});

/** Busca una dirección ortogonal transitable desde una casilla del jugador. */
function findOpenDirection(
  state: GameState,
  x: number,
  y: number,
): { readonly dx: number; readonly dy: number } {
  const candidates = [
    { dx: 1, dy: 0 },
    { dx: -1, dy: 0 },
    { dx: 0, dy: 1 },
    { dx: 0, dy: -1 },
  ];
  for (const candidate of candidates) {
    const target = { x: x + candidate.dx, y: y + candidate.dy };
    if (
      target.x >= 0 &&
      target.y >= 0 &&
      target.x < state.grid.width &&
      target.y < state.grid.height &&
      state.grid.tiles[target.y * state.grid.width + target.x] === 'floor' &&
      !isOccupied(state, target.x, target.y)
    ) {
      return candidate;
    }
  }
  throw new Error('El jugador no tiene ninguna casilla libre adyacente.');
}
