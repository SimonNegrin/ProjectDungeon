import { describe, expect, it } from 'vitest';
import { reduce } from '../../../src/game/index';
import { makeState, makeUnit } from './helpers';

describe('turn phase', () => {
  it('EndTurn ejecuta la fase enemiga y restaura MP y acción del jugador', () => {
    const state = makeState({
      players: [makeUnit({ id: 'player-1', faction: 'player', x: 5, y: 5, mp: 0, actionAvailable: false })],
      enemies: [makeUnit({ id: 'enemy-1', faction: 'enemy', x: 10, y: 5 })],
    });

    const result = reduce(state, { type: 'EndTurn' });

    expect(result.state.phase).toBe('player');
    expect(result.state.turn).toBe(2);
    expect(result.state.players[0]).toMatchObject({ mp: 6, actionAvailable: true, hp: 20 });
    expect(result.state.enemies[0]).toMatchObject({ x: 9, y: 5, mp: 3 });
    expect(result.events.map((event) => event.type)).toEqual([
      'TurnEnded',
      'EnemyPhaseStarted',
      'UnitMoved',
      'PlayerTurnStarted',
    ]);
  });

  it('restaura MP y acción del enemigo al empezar su fase', () => {
    const state = makeState({
      players: [makeUnit({ id: 'player-1', faction: 'player', x: 5, y: 5 })],
      enemies: [
        makeUnit({
          id: 'enemy-1',
          faction: 'enemy',
          x: 10,
          y: 5,
          mp: 0,
          actionAvailable: false,
        }),
      ],
    });

    const result = reduce(state, { type: 'EndTurn' });

    expect(result.state.enemies[0]).toMatchObject({ x: 9, y: 5, mp: 3 });
    expect(result.state.enemies[0].actionAvailable).toBe(true);
  });

  it('ejecuta la fase completa con varios enemigos en orden de índice', () => {
    const state = makeState({
      players: [makeUnit({ id: 'player-1', faction: 'player', x: 5, y: 5 })],
      enemies: [
        makeUnit({ id: 'enemy-1', faction: 'enemy', x: 10, y: 5 }),
        makeUnit({ id: 'enemy-2', faction: 'enemy', x: 5, y: 10 }),
      ],
    });

    const result = reduce(state, { type: 'EndTurn' });
    const moves = result.events.filter((event) => event.type === 'UnitMoved');

    expect(result.state.enemies).toMatchObject([
      { id: 'enemy-1', x: 9, y: 5 },
      { id: 'enemy-2', x: 5, y: 9 },
    ]);
    expect(moves).toEqual([
      {
        type: 'UnitMoved',
        unitId: 'enemy-1',
        from: { x: 10, y: 5 },
        to: { x: 9, y: 5 },
        mpLeft: 3,
      },
      {
        type: 'UnitMoved',
        unitId: 'enemy-2',
        from: { x: 5, y: 10 },
        to: { x: 5, y: 9 },
        mpLeft: 3,
      },
    ]);
  });

  it('varios enemigos adyacentes atacan en la misma fase', () => {
    const state = makeState({
      players: [makeUnit({ id: 'player-1', faction: 'player', x: 5, y: 5 })],
      enemies: [
        makeUnit({ id: 'enemy-1', faction: 'enemy', x: 6, y: 5 }),
        makeUnit({ id: 'enemy-2', faction: 'enemy', x: 5, y: 6 }),
      ],
    });

    const result = reduce(state, { type: 'EndTurn' });
    const attacks = result.events.filter((event) => event.type === 'AttackPerformed');

    expect(result.state.players[0].hp).toBe(14);
    expect(attacks).toHaveLength(2);
  });

  it('detiene la fase enemiga en cuanto muere el último jugador', () => {
    const state = makeState({
      players: [makeUnit({ id: 'player-1', faction: 'player', x: 5, y: 5, hp: 3 })],
      enemies: [
        makeUnit({ id: 'enemy-1', faction: 'enemy', x: 6, y: 5 }),
        makeUnit({ id: 'enemy-2', faction: 'enemy', x: 5, y: 6 }),
      ],
    });

    const result = reduce(state, { type: 'EndTurn' });
    const attacks = result.events.filter((event) => event.type === 'AttackPerformed');

    expect(result.state.status).toBe('defeat');
    expect(result.state.players[0].hp).toBe(0);
    expect(attacks).toHaveLength(1);
    expect(result.events.map((event) => event.type)).not.toContain('PlayerTurnStarted');
  });

  it('rechaza EndTurn si la partida ha terminado o la fase no es del jugador', () => {
    const finished = makeState({ status: 'victory' });
    const finishedResult = reduce(finished, { type: 'EndTurn' });
    expect(finishedResult.events).toEqual([
      { type: 'CommandRejected', commandType: 'EndTurn', reason: 'game-over' },
    ]);

    const enemyPhase = makeState({ phase: 'enemy' });
    const enemyPhaseResult = reduce(enemyPhase, { type: 'EndTurn' });
    expect(enemyPhaseResult.events).toEqual([
      { type: 'CommandRejected', commandType: 'EndTurn', reason: 'wrong-phase' },
    ]);
  });
});
