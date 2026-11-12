import { describe, expect, it } from 'vitest';
import {
  MOVE_COST,
  PLAYER_MAX_MP,
  reduce,
  type GameState,
} from '../../../src/game/index';
import { makeState, makeUnit } from './helpers';

const FAR_ENEMY = makeUnit({ id: 'enemy-1', faction: 'enemy', x: 18, y: 18 });

function stateWithPlayerAt(x: number, y: number, patch: Partial<GameState> = {}): GameState {
  return makeState({
    players: [makeUnit({ id: 'player-1', faction: 'player', x, y })],
    enemies: [FAR_ENEMY],
    ...patch,
  });
}

describe('movement', () => {
  it('mueve en las 8 direcciones y gasta 1 MP, también en diagonal', () => {
    const directions = [
      [0, -1],
      [1, -1],
      [1, 0],
      [1, 1],
      [0, 1],
      [-1, 1],
      [-1, 0],
      [-1, -1],
    ] as const;

    for (const [dx, dy] of directions) {
      const state = stateWithPlayerAt(10, 10);
      const result = reduce(state, { type: 'Move', unitId: 'player-1', dx, dy });

      expect(result.state.players[0]).toMatchObject({
        x: 10 + dx,
        y: 10 + dy,
        mp: PLAYER_MAX_MP - MOVE_COST,
        actions: { remaining: 2 },
      });
      expect(result.events).toEqual([
        {
          type: 'UnitMoved',
          unitId: 'player-1',
          from: { x: 10, y: 10 },
          to: { x: 10 + dx, y: 10 + dy },
          mpLeft: PLAYER_MAX_MP - MOVE_COST,
        },
      ]);
    }
  });

  it('rechaza un movimiento sin MP y no cambia la posición', () => {
    const state = makeState({
      players: [makeUnit({ id: 'player-1', faction: 'player', x: 10, y: 10, mp: 0 })],
      enemies: [FAR_ENEMY],
    });

    const result = reduce(state, { type: 'Move', unitId: 'player-1', dx: 1, dy: 0 });

    expect(result.state.players[0]).toMatchObject({ x: 10, y: 10, mp: 0 });
    expect(result.events).toEqual([
      { type: 'CommandRejected', commandType: 'Move', reason: 'no-mp' },
    ]);
  });

  it('permite seis movimientos con 6 MP y rechaza el séptimo', () => {
    let state = stateWithPlayerAt(10, 10);

    for (let step = 0; step < PLAYER_MAX_MP; step += 1) {
      state = reduce(state, { type: 'Move', unitId: 'player-1', dx: 1, dy: 0 }).state;
    }

    expect(state.players[0]).toMatchObject({ x: 16, y: 10, mp: 0 });

    const rejected = reduce(state, { type: 'Move', unitId: 'player-1', dx: 1, dy: 0 });
    expect(rejected.state.players[0]).toMatchObject({ x: 16, y: 10, mp: 0 });
    expect(rejected.events).toEqual([
      { type: 'CommandRejected', commandType: 'Move', reason: 'no-mp' },
    ]);
  });

  it('no permite ocupar una casilla con otra unidad', () => {
    const state = makeState({
      players: [makeUnit({ id: 'player-1', faction: 'player', x: 5, y: 5 })],
      enemies: [makeUnit({ id: 'enemy-1', faction: 'enemy', x: 6, y: 5 })],
    });

    const result = reduce(state, { type: 'Move', unitId: 'player-1', dx: 1, dy: 0 });

    expect(result.state.players[0]).toMatchObject({ x: 5, y: 5, mp: PLAYER_MAX_MP });
    expect(result.events).toEqual([
      { type: 'CommandRejected', commandType: 'Move', reason: 'occupied' },
    ]);
  });

  it('no permite entrar en un muro del borde', () => {
    const state = stateWithPlayerAt(1, 1);
    const result = reduce(state, { type: 'Move', unitId: 'player-1', dx: -1, dy: 0 });

    expect(result.state.players[0]).toMatchObject({ x: 1, y: 1 });
    expect(result.events).toEqual([
      { type: 'CommandRejected', commandType: 'Move', reason: 'wall' },
    ]);
  });

  it('rechaza direcciones inválidas', () => {
    const state = stateWithPlayerAt(5, 5);

    for (const [dx, dy] of [
      [0, 0],
      [2, 0],
      [0, -2],
      [0.5, 1],
    ] as const) {
      const result = reduce(state, { type: 'Move', unitId: 'player-1', dx, dy });
      expect(result.events).toEqual([
        { type: 'CommandRejected', commandType: 'Move', reason: 'invalid-direction' },
      ]);
    }
  });

  it('no corta esquinas cuando una casilla ortogonal está ocupada', () => {
    const state = makeState({
      players: [makeUnit({ id: 'player-1', faction: 'player', x: 5, y: 5 })],
      enemies: [makeUnit({ id: 'enemy-1', faction: 'enemy', x: 6, y: 5 })],
    });

    const result = reduce(state, { type: 'Move', unitId: 'player-1', dx: 1, dy: 1 });

    expect(result.state.players[0]).toMatchObject({ x: 5, y: 5, mp: PLAYER_MAX_MP });
    expect(result.events).toEqual([
      { type: 'CommandRejected', commandType: 'Move', reason: 'corner-cut' },
    ]);
  });

  it('permite la diagonal cuando las dos casillas ortogonales están libres y deja 5 MP', () => {
    const state = stateWithPlayerAt(5, 5);
    const result = reduce(state, { type: 'Move', unitId: 'player-1', dx: 1, dy: 1 });

    expect(result.state.players[0]).toMatchObject({ x: 6, y: 6, mp: PLAYER_MAX_MP - MOVE_COST });
  });

  it('rechaza mover durante la fase enemiga', () => {
    const state = stateWithPlayerAt(5, 5, { phase: 'enemy' });
    const result = reduce(state, { type: 'Move', unitId: 'player-1', dx: 1, dy: 0 });

    expect(result.state).toBe(state);
    expect(result.events).toEqual([
      { type: 'CommandRejected', commandType: 'Move', reason: 'wrong-phase' },
    ]);
  });
});
