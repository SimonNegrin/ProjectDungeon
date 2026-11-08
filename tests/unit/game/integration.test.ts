import { describe, expect, it } from 'vitest';
import {
  createRng,
  reduce,
  type Command,
  type GameEvent,
  type GameState,
} from '../../../src/game/index';
import { makeState, makeUnit, rngForDice } from './helpers';

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

/** Semilla que produce 5, 3 y 5 de daño: el enemigo cae y el jugador acaba con 17 PV. */
const VICTORY_SEED = 71;

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
      rng: createRng(VICTORY_SEED),
    });

    const result = run(state, loopCommands);

    expect(result.final.status).toBe('victory');
    expect(result.final.turn).toBe(2);
    expect(result.final.phase).toBe('player');
    // Turno 1: mueve (6 MP → 5), ataca y termina. Turno 2: se restauran
    // 6 MP, mueve (6 → 5) y remata.
    expect(result.final.players[0]).toMatchObject({ x: 6, y: 4, hp: 17, mp: 5 });
    expect(result.final.enemies[0]).toMatchObject({ hp: 0 });

    const attacks = result.events.filter((event) => event.type === 'AttackPerformed');
    expect(
      attacks.map(({ attackerId, hit, damage, targetHp, rolls }) => ({
        attackerId,
        hit,
        damage,
        targetHp,
        rolls,
      })),
    ).toEqual([
      {
        attackerId: 'player-1',
        hit: true,
        damage: 5,
        targetHp: 5,
        rolls: { attack: 6, shield: 1, damage: 5, armor: 4 },
      },
      {
        attackerId: 'enemy-1',
        hit: true,
        damage: 3,
        targetHp: 17,
        rolls: { attack: 4, shield: 3, damage: 6, armor: 6 },
      },
      {
        attackerId: 'player-1',
        hit: true,
        damage: 5,
        targetHp: 0,
        rolls: { attack: 5, shield: 4, damage: 6, armor: 5 },
      },
    ]);

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
      rng: rngForDice([6, 1, 3, 3]),
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

  it('un enemigo en regreso vuelve a su puesto sin atacar y se duerme al llegar', () => {
    const state = makeState({
      players: [makeUnit({ id: 'player-1', faction: 'player', x: 18, y: 18 })],
      enemies: [
        makeUnit({
          id: 'enemy-1',
          faction: 'enemy',
          x: 5,
          y: 5,
          awareness: 'returning',
          home: { x: 2, y: 2 },
          alertTurns: 3,
        }),
      ],
    });

    const result = run(state, [
      { type: 'EndTurn' },
      { type: 'EndTurn' },
      { type: 'EndTurn' },
    ]);

    expect(
      result.events.filter((event) => event.type === 'AttackPerformed'),
    ).toEqual([]);

    const moves = result.events.filter(
      (event): event is Extract<GameEvent, { type: 'UnitMoved' }> =>
        event.type === 'UnitMoved',
    );
    const distanceToHome = (position: { x: number; y: number }): number =>
      Math.max(Math.abs(position.x - 2), Math.abs(position.y - 2));

    expect(moves.map((event) => distanceToHome(event.to))).toEqual([2, 1, 0]);
    expect(result.final.enemies[0]).toMatchObject({
      x: 2,
      y: 2,
      awareness: 'dormant',
      lastKnown: null,
      alertTurns: 0,
    });
    expect(
      result.events.filter((event) => event.type === 'EnemyReturned'),
    ).toEqual([{ type: 'EnemyReturned', unitId: 'enemy-1' }]);
  });

  it('la visión da la alarma y el alertado actúa en la fase enemiga', () => {
    const state = makeState({
      players: [makeUnit({ id: 'player-1', faction: 'player', x: 3, y: 5 })],
      enemies: [
        makeUnit({
          id: 'enemy-1',
          faction: 'enemy',
          enemyType: 'sentinel',
          x: 10,
          y: 5,
          awareness: 'dormant',
        }),
        makeUnit({
          id: 'enemy-2',
          faction: 'enemy',
          enemyType: 'sentinel',
          x: 16,
          y: 5,
          awareness: 'dormant',
        }),
      ],
    });

    const result = run(state, [
      { type: 'Move', unitId: 'player-1', dx: 1, dy: 0 },
      { type: 'EndTurn' },
    ]);

    expect(result.events.map((event) => event.type)).toEqual([
      'UnitMoved',
      'EnemySpotted',
      'AlarmRaised',
      'TurnEnded',
      'EnemyPhaseStarted',
      'UnitMoved',
      'UnitMoved',
      'PlayerTurnStarted',
    ]);
    expect(result.final.enemies[0]).toMatchObject({
      x: 9,
      y: 5,
      awareness: 'alert',
      lastKnown: { x: 4, y: 5 },
    });
    expect(result.final.enemies[1]).toMatchObject({
      x: 15,
      y: 5,
      awareness: 'alert',
      lastKnown: { x: 4, y: 5 },
      hasShouted: true,
    });
  });

  it('el daño a un dormido da la alarma y el alertado actúa en la fase enemiga', () => {
    const state = makeState({
      players: [makeUnit({ id: 'player-1', faction: 'player', x: 5, y: 5 })],
      enemies: [
        makeUnit({
          id: 'enemy-1',
          faction: 'enemy',
          enemyType: 'sentinel',
          x: 6,
          y: 5,
          awareness: 'dormant',
          maxHp: 9,
          hp: 9,
        }),
        makeUnit({
          id: 'enemy-2',
          faction: 'enemy',
          enemyType: 'sentinel',
          x: 12,
          y: 5,
          awareness: 'dormant',
          maxHp: 9,
          hp: 9,
        }),
      ],
      rng: rngForDice([6, 1, 2, 1, 1, 6]),
    });

    const result = run(state, [
      { type: 'Attack', unitId: 'player-1', targetId: 'enemy-1' },
      { type: 'EndTurn' },
    ]);

    expect(result.events.map((event) => event.type)).toEqual([
      'AttackPerformed',
      'AlarmRaised',
      'TurnEnded',
      'EnemyPhaseStarted',
      'AttackPerformed',
      'UnitMoved',
      'PlayerTurnStarted',
    ]);
    expect(result.final.enemies[1]).toMatchObject({
      x: 11,
      y: 5,
      awareness: 'alert',
      lastKnown: { x: 5, y: 5 },
      hasShouted: true,
    });
  });

  it('produce el mismo estado y los mismos eventos con la misma secuencia', () => {
    const makeScenario = (): GameState =>
      makeState({
        players: [makeUnit({ id: 'player-1', faction: 'player', x: 5, y: 5 })],
        enemies: [makeUnit({ id: 'enemy-1', faction: 'enemy', x: 7, y: 5 })],
        rng: createRng(1017),
      });

    const first = run(makeScenario(), loopCommands);
    const second = run(makeScenario(), loopCommands);

    expect(JSON.stringify(first.states)).toBe(JSON.stringify(second.states));
    expect(JSON.stringify(first.events)).toBe(JSON.stringify(second.events));
    expect(JSON.stringify(first.final)).toBe(JSON.stringify(second.final));
  });
});
