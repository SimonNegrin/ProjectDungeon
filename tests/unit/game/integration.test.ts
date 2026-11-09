import { describe, expect, it } from 'vitest';
import {
  BESTIARY,
  WEAPONS,
  armorValue,
  createRng,
  reduce,
  resolveDamage,
  type Command,
  type GameEvent,
  type GameState,
  type Unit,
} from '../../../src/game/index';
import { makeState, makeUnit, rngForDice } from './helpers';

/** Daño esperado según catálogo y equipo, sin fijar el valor de balance. */
function expectedDamage(
  attacker: Unit,
  target: Unit,
  damageDie: number,
  armorDie: number,
): number {
  return resolveDamage(
    attacker.modifiers.damage + WEAPONS[attacker.equipment.weaponId].damage,
    armorValue(target.equipment.armorId),
    damageDie,
    armorDie,
  );
}

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
      enemies: [
        makeUnit({
          id: 'enemy-1',
          faction: 'enemy',
          x: 7,
          y: 5,
          hp: 8,
          maxHp: 8,
        }),
      ],
      rng: createRng(0),
    });
    const firstHit = expectedDamage(state.players[0], state.enemies[0], 2, 3);
    const enemyHit = expectedDamage(state.enemies[0], state.players[0], 3, 2);
    const secondHit = expectedDamage(state.players[0], state.enemies[0], 5, 2);
    const playerHp = state.players[0].hp - enemyHit;
    const enemyHp = state.enemies[0].hp - firstHit;

    const result = run(state, loopCommands);

    expect(result.final.status).toBe('victory');
    expect(result.final.turn).toBe(2);
    expect(result.final.phase).toBe('player');
    // Turno 1: mueve (6 MP → 5), ataca y termina. Turno 2: se restauran
    // 6 MP, mueve (6 → 5) y remata.
    expect(result.final.players[0]).toMatchObject({ x: 6, y: 4, hp: playerHp, mp: 5 });
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
        damage: firstHit,
        targetHp: enemyHp,
        rolls: { attack: 5, shield: 1, damage: 2, armor: 3 },
      },
      {
        attackerId: 'enemy-1',
        hit: true,
        damage: enemyHit,
        targetHp: playerHp,
        rolls: { attack: 2, shield: 2, damage: 3, armor: 2 },
      },
      {
        attackerId: 'player-1',
        hit: true,
        damage: secondHit,
        targetHp: 0,
        rolls: { attack: 5, shield: 3, damage: 5, armor: 2 },
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
      players: [makeUnit({ id: 'player-1', faction: 'player', x: 5, y: 5, hp: 1 })],
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
          x: 10 + BESTIARY.sentinel.alarm,
          y: 5,
          awareness: 'dormant',
        }),
      ],
    });

    const result = run(state, [
      { type: 'Move', unitId: 'player-1', dx: 1, dy: 0 },
      { type: 'EndTurn' },
    ]);

    const types = result.events.map((event) => event.type);
    expect(types.slice(0, 5)).toEqual([
      'UnitMoved',
      'EnemySpotted',
      'AlarmRaised',
      'TurnEnded',
      'EnemyPhaseStarted',
    ]);
    expect(types).toContain('AttackPerformed');
    expect(types.at(-1)).toBe('PlayerTurnStarted');

    const [first, second] = result.final.enemies;
    expect(first).toMatchObject({
      awareness: 'alert',
      lastKnown: { x: 4, y: 5 },
    });
    expect(
      Math.max(Math.abs(first.x - 4), Math.abs(first.y - 5)),
      'el alertado debe quedar adyacente al jugador',
    ).toBeLessThanOrEqual(1);
    expect(second).toMatchObject({
      awareness: 'alert',
      lastKnown: { x: 4, y: 5 },
      hasShouted: true,
    });
    expect(second.x, 'el receptor debe avanzar hacia el jugador').toBeLessThan(
      state.enemies[1].x,
    );
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
        }),
        makeUnit({
          id: 'enemy-2',
          faction: 'enemy',
          enemyType: 'sentinel',
          x: 6 + BESTIARY.sentinel.alarm,
          y: 5,
          awareness: 'dormant',
        }),
      ],
      rng: rngForDice([6, 1, 2, 1, 1, 6]),
    });

    const result = run(state, [
      { type: 'Attack', unitId: 'player-1', targetId: 'enemy-1' },
      { type: 'EndTurn' },
    ]);

    const types = result.events.map((event) => event.type);
    expect(types.slice(0, 5)).toEqual([
      'AttackPerformed',
      'AlarmRaised',
      'TurnEnded',
      'EnemyPhaseStarted',
      'AttackPerformed',
    ]);
    expect(types).toContain('UnitMoved');
    expect(types.at(-1)).toBe('PlayerTurnStarted');
    expect(result.final.enemies[1]).toMatchObject({
      awareness: 'alert',
      lastKnown: { x: 5, y: 5 },
      hasShouted: true,
    });
    expect(result.final.enemies[1].x).toBeLessThan(state.enemies[1].x);
  });

  it('el cobarde huye tras un golpe fuerte y se aleja del jugador en la fase enemiga', () => {
    const state = makeState({
      players: [makeUnit({ id: 'player-1', faction: 'player', x: 5, y: 5 })],
      enemies: [
        makeUnit({
          id: 'enemy-1',
          faction: 'enemy',
          enemyType: 'coward',
          x: 6,
          y: 5,
          awareness: 'dormant',
        }),
      ],
      rng: rngForDice([6, 1, 1, 1]),
    });

    const result = run(state, [
      { type: 'Attack', unitId: 'player-1', targetId: 'enemy-1' },
      { type: 'EndTurn' },
    ]);

    expect(result.events).toContainEqual({ type: 'EnemyFled', unitId: 'enemy-1' });
    const fledIndex = result.events.findIndex((event) => event.type === 'EnemyFled');
    const enemyPhaseIndex = result.events.findIndex(
      (event) => event.type === 'EnemyPhaseStarted',
    );
    expect(fledIndex).toBeGreaterThanOrEqual(0);
    expect(fledIndex).toBeLessThan(enemyPhaseIndex);

    const enemy = result.final.enemies[0];
    expect(enemy).toMatchObject({
      hp: BESTIARY.coward.maxHp - expectedDamage(state.players[0], state.enemies[0], 1, 1),
      fleeing: true,
      awareness: 'alert',
    });
    expect(
      Math.max(
        Math.abs(enemy.x - result.final.players[0].x),
        Math.abs(enemy.y - result.final.players[0].y),
      ),
    ).toBeGreaterThan(1);
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
