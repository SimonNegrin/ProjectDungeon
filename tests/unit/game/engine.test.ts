import { describe, expect, it } from 'vitest';
import {
  createInitialState,
  ENEMY_MAX_HP,
  ENEMY_MAX_MP,
  INITIAL_ENEMY_POSITION,
  INITIAL_PLAYER_POSITION,
  isOccupied,
  isWallAt,
  PLAYER_MAX_HP,
  PLAYER_MAX_MP,
  reduce,
  ROOM_HEIGHT,
  ROOM_WIDTH,
  type GameState,
} from '../../../src/game/index';
import { makeState, makeUnit } from './helpers';

describe('engine state', () => {
  it('crea la sala 20x20 con muros en el borde y suelo transitable', () => {
    const state = createInitialState();

    expect(state.grid.width).toBe(20);
    expect(state.grid.height).toBe(20);
    expect(ROOM_WIDTH).toBe(20);
    expect(ROOM_HEIGHT).toBe(20);
    expect(state.grid.tiles).toHaveLength(20 * 20);
    expect(state.grid.tiles.filter((tile) => tile === 'floor')).toHaveLength(18 * 18);
    expect(state.grid.tiles.filter((tile) => tile === 'wall')).toHaveLength(20 * 20 - 18 * 18);

    for (let x = 0; x < state.grid.width; x += 1) {
      expect(isWallAt(state.grid, x, 0)).toBe(true);
      expect(isWallAt(state.grid, x, state.grid.height - 1)).toBe(true);
    }
    for (let y = 0; y < state.grid.height; y += 1) {
      expect(isWallAt(state.grid, 0, y)).toBe(true);
      expect(isWallAt(state.grid, state.grid.width - 1, y)).toBe(true);
    }

    expect(isWallAt(state.grid, 1, 1)).toBe(false);
    expect(isWallAt(state.grid, 18, 18)).toBe(false);
  });

  it('coloca un jugador y un enemigo en (4,4) y (15,15) con vida, MP y acción iniciales', () => {
    const state = createInitialState();

    expect(INITIAL_PLAYER_POSITION).toEqual({ x: 4, y: 4 });
    expect(INITIAL_ENEMY_POSITION).toEqual({ x: 15, y: 15 });
    expect(state.players).toHaveLength(1);
    expect(state.enemies).toHaveLength(1);
    expect(state.players[0]).toMatchObject({
      id: 'player-1',
      x: 4,
      y: 4,
      hp: PLAYER_MAX_HP,
      maxHp: PLAYER_MAX_HP,
      mp: 6,
      maxMp: 6,
      actionAvailable: true,
    });
    expect(state.enemies[0]).toMatchObject({
      id: 'enemy-1',
      x: 15,
      y: 15,
      hp: ENEMY_MAX_HP,
      maxHp: ENEMY_MAX_HP,
      mp: 4,
      maxMp: 4,
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

    const result = reduce(parsed, { type: 'Move', unitId: 'player-1', dx: 1, dy: 0 });
    expect(result.state.players[0]).toMatchObject({ x: 5, y: 4, mp: 5 });
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
