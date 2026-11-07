import { describe, expect, it } from 'vitest';
import {
  reduce,
  type Command,
  type GameEvent,
  type GameState,
} from '../../../src/game/index';
import { makeState, makeUnit } from './helpers';

interface RunResult {
  readonly states: readonly GameState[];
  readonly events: readonly GameEvent[];
  readonly final: GameState;
}

function run(state: GameState, commands: readonly Command[]): RunResult {
  let current = state;
  const states: GameState[] = [current];
  const events: GameEvent[] = [];

  for (const command of commands) {
    const result = reduce(current, command);
    current = result.state;
    events.push(...result.events);
    states.push(current);
  }

  return { states, events, final: current };
}

const loopCommands: readonly Command[] = [
  { type: 'Move', unitId: 'player-1', dx: 1, dy: 0 },
  { type: 'Attack', unitId: 'player-1', targetId: 'enemy-1' },
  { type: 'EndTurn' },
  { type: 'Move', unitId: 'player-1', dx: 0, dy: -1 },
  { type: 'Attack', unitId: 'player-1', targetId: 'enemy-1' },
];

describe('game loop integration', () => {
  it('encadena Move, Attack y EndTurn hasta la victoria con los eventos esperados', () => {
    const state = makeState({
      players: [makeUnit({ id: 'player-1', faction: 'player', x: 5, y: 5 })],
      enemies: [makeUnit({ id: 'enemy-1', faction: 'enemy', x: 7, y: 5 })],
    });

    const result = run(state, loopCommands);

    expect(result.final.status).toBe('victory');
    expect(result.final.turn).toBe(2);
    expect(result.final.phase).toBe('player');
    expect(result.final.players[0]).toMatchObject({ x: 6, y: 4, hp: 17, mp: 3 });
    expect(result.final.enemies[0]).toMatchObject({ hp: 0 });

    expect(result.events.map((event) => event.type)).toEqual([
      'UnitMoved',
      'AttackPerformed',
      'TurnEnded',
      'EnemyPhaseStarted',
      'AttackPerformed',
      'PlayerTurnStarted',
      'UnitMoved',
      'AttackPerformed',
      'UnitDied',
      'GameEnded',
    ]);
    expect(result.events.at(-1)).toEqual({ type: 'GameEnded', status: 'victory' });
  });

  it('encadena una derrota durante la fase enemiga', () => {
    const state = makeState({
      players: [makeUnit({ id: 'player-1', faction: 'player', x: 5, y: 5, hp: 3 })],
      enemies: [makeUnit({ id: 'enemy-1', faction: 'enemy', x: 6, y: 5 })],
    });

    const result = run(state, [{ type: 'EndTurn' }]);

    expect(result.final.status).toBe('defeat');
    expect(result.final.players[0].hp).toBe(0);
    expect(result.final.phase).toBe('enemy');
    expect(result.events.map((event) => event.type)).toEqual([
      'TurnEnded',
      'EnemyPhaseStarted',
      'AttackPerformed',
      'UnitDied',
      'GameEnded',
    ]);
  });

  it('produce el mismo estado y los mismos eventos con la misma secuencia', () => {
    const makeScenario = (): GameState =>
      makeState({
        players: [makeUnit({ id: 'player-1', faction: 'player', x: 5, y: 5 })],
        enemies: [makeUnit({ id: 'enemy-1', faction: 'enemy', x: 7, y: 5 })],
      });

    const first = run(makeScenario(), loopCommands);
    const second = run(makeScenario(), loopCommands);

    expect(JSON.stringify(first.states)).toBe(JSON.stringify(second.states));
    expect(JSON.stringify(first.events)).toBe(JSON.stringify(second.events));
    expect(JSON.stringify(first.final)).toBe(JSON.stringify(second.final));
  });
});
