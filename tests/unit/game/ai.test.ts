import { describe, expect, it } from 'vitest';
import { planEnemyAction, reduce } from '../../../src/game/index';
import { makeGridWithWalls, makeState, makeUnit, rngForDice } from './helpers';

describe('enemy AI', () => {
  it('elige al jugador más cercano y avanza una casilla hacia él', () => {
    const state = makeState({
      players: [
        makeUnit({ id: 'player-1', faction: 'player', x: 8, y: 10 }),
        makeUnit({ id: 'player-2', faction: 'player', x: 14, y: 10 }),
      ],
      enemies: [makeUnit({ id: 'enemy-1', faction: 'enemy', x: 10, y: 10 })],
    });

    const plan = planEnemyAction(state, state.enemies[0]);
    expect(plan).toEqual({ type: 'move', dx: -1, dy: 0 });

    const result = reduce(state, { type: 'EndTurn' });
    expect(result.state.enemies[0]).toMatchObject({ x: 9, y: 10 });
  });

  it('desempata por índice de jugador de forma determinista', () => {
    const first = makeState({
      players: [
        makeUnit({ id: 'player-1', faction: 'player', x: 8, y: 10 }),
        makeUnit({ id: 'player-2', faction: 'player', x: 12, y: 10 }),
      ],
      enemies: [makeUnit({ id: 'enemy-1', faction: 'enemy', x: 10, y: 10 })],
    });
    const second = makeState({
      players: [
        makeUnit({ id: 'player-3', faction: 'player', x: 12, y: 10 }),
        makeUnit({ id: 'player-4', faction: 'player', x: 8, y: 10 }),
      ],
      enemies: [makeUnit({ id: 'enemy-1', faction: 'enemy', x: 10, y: 10 })],
    });

    expect(planEnemyAction(first, first.enemies[0])).toEqual({ type: 'move', dx: -1, dy: 0 });
    expect(planEnemyAction(second, second.enemies[0])).toEqual({ type: 'move', dx: 1, dy: 0 });
  });

  it('ataca si el jugador más cercano está en rango', () => {
    const state = makeState({
      players: [makeUnit({ id: 'player-1', faction: 'player', x: 5, y: 5 })],
      enemies: [makeUnit({ id: 'enemy-1', faction: 'enemy', x: 6, y: 6 })],
      rng: rngForDice([6, 1, 3, 3]),
    });

    expect(planEnemyAction(state, state.enemies[0])).toEqual({
      type: 'attack',
      targetId: 'player-1',
    });

    const result = reduce(state, { type: 'EndTurn' });
    expect(result.state.players[0].hp).toBe(17);
    expect(result.state.enemies[0]).toMatchObject({ x: 6, y: 6, actionAvailable: false });
  });

  it('avanza exactamente una casilla por fase aunque tenga 4 MP', () => {
    const state = makeState({
      players: [makeUnit({ id: 'player-1', faction: 'player', x: 5, y: 5 })],
      enemies: [makeUnit({ id: 'enemy-1', faction: 'enemy', x: 15, y: 5 })],
    });

    const result = reduce(state, { type: 'EndTurn' });
    const moves = result.events.filter((event) => event.type === 'UnitMoved');

    expect(moves).toHaveLength(1);
    expect(result.state.enemies[0]).toMatchObject({ x: 14, y: 5, mp: 3 });
  });

  it('espera si no puede avanzar ni atacar', () => {
    const walls = makeGridWithWalls([
      { x: 4, y: 4 },
      { x: 5, y: 4 },
      { x: 6, y: 4 },
      { x: 4, y: 5 },
      { x: 6, y: 5 },
      { x: 4, y: 6 },
      { x: 5, y: 6 },
      { x: 6, y: 6 },
    ]);
    const state = makeState({
      grid: walls,
      players: [makeUnit({ id: 'player-1', faction: 'player', x: 10, y: 10 })],
      enemies: [makeUnit({ id: 'enemy-1', faction: 'enemy', x: 5, y: 5 })],
    });

    expect(planEnemyAction(state, state.enemies[0])).toEqual({ type: 'wait' });

    const result = reduce(state, { type: 'EndTurn' });
    expect(result.state.enemies[0]).toMatchObject({ x: 5, y: 5 });
    expect(result.events).toContainEqual({ type: 'EnemyWaited', unitId: 'enemy-1' });
  });

  it('es determinista con el mismo estado', () => {
    const state = makeState({
      players: [makeUnit({ id: 'player-1', faction: 'player', x: 3, y: 3 })],
      enemies: [makeUnit({ id: 'enemy-1', faction: 'enemy', x: 15, y: 10 })],
    });

    expect(planEnemyAction(state, state.enemies[0])).toEqual(
      planEnemyAction(state, state.enemies[0]),
    );
  });
});
