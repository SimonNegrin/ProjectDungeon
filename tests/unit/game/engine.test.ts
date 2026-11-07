import { describe, expect, it } from 'vitest';
import {
  createInitialState,
  ENEMY_MAX_HP,
  ENEMY_MAX_MP,
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
  it('crea la sala 32x24 con muros en el borde y suelo transitable', () => {
    const state = createInitialState();

    expect(state.grid.width).toBe(32);
    expect(state.grid.height).toBe(24);
    expect(ROOM_WIDTH).toBe(32);
    expect(ROOM_HEIGHT).toBe(24);

    for (let x = 0; x < state.grid.width; x += 1) {
      expect(isWallAt(state.grid, x, 0)).toBe(true);
      expect(isWallAt(state.grid, x, state.grid.height - 1)).toBe(true);
    }
    for (let y = 0; y < state.grid.height; y += 1) {
      expect(isWallAt(state.grid, 0, y)).toBe(true);
      expect(isWallAt(state.grid, state.grid.width - 1, y)).toBe(true);
    }

    expect(isWallAt(state.grid, 1, 1)).toBe(false);
    expect(isWallAt(state.grid, 30, 22)).toBe(false);
  });

  it('coloca un jugador y un enemigo con vida, MP y acción iniciales', () => {
    const state = createInitialState();

    expect(state.players).toHaveLength(1);
    expect(state.enemies).toHaveLength(1);
    expect(state.players[0]).toMatchObject({
      id: 'player-1',
      hp: PLAYER_MAX_HP,
      maxHp: PLAYER_MAX_HP,
      mp: PLAYER_MAX_MP,
      maxMp: PLAYER_MAX_MP,
      actionAvailable: true,
    });
    expect(state.enemies[0]).toMatchObject({
      id: 'enemy-1',
      hp: ENEMY_MAX_HP,
      maxHp: ENEMY_MAX_HP,
      mp: ENEMY_MAX_MP,
      maxMp: ENEMY_MAX_MP,
      actionAvailable: true,
    });
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
    expect(result.state.players[0]).toMatchObject({ x: 3, y: 2, mp: 3 });
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
