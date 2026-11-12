import { describe, expect, it, vi } from 'vitest';
import {
  BESTIARY,
  WEAPONS,
  armorValue,
  createRng,
  reduce,
  resolveDamage,
  type GameEvent,
  type Unit,
} from '../../../src/game/index';
import { makeGridWithWalls, makeState, makeUnit, rngForDice } from './helpers';

function expectedDamage(
  attacker: Unit,
  target: Unit,
  damageDie: number,
  armorDie: number,
): number {
  return resolveDamage(
    attacker.stats.fuerza + WEAPONS[attacker.equipment.weaponId!].damage,
    armorValue(target.equipment.armorId),
    damageDie,
    armorDie,
  );
}

describe('turn phase', () => {
  it('EndTurn ejecuta la fase enemiga y restaura MP y acción del jugador', () => {
    const state = makeState({
      players: [makeUnit({ id: 'player-1', faction: 'player', x: 5, y: 5, mp: 0, actions: 0 })],
      enemies: [makeUnit({ id: 'enemy-1', faction: 'enemy', x: 10, y: 5 })],
      rng: rngForDice([6, 1, 3, 3]),
    });
    const damage = expectedDamage(state.enemies[0], state.players[0], 3, 3);

    const result = reduce(state, { type: 'EndTurn' });
    const attacks = result.events.filter((event) => event.type === 'AttackPerformed');

    expect(result.state.phase).toBe('player');
    expect(result.state.turn).toBe(2);
    expect(result.state.players[0]).toMatchObject({
      mp: 6,
      actions: { remaining: 2 },
      hp: state.players[0].hp - damage,
    });
    expect(result.state.enemies[0]).toMatchObject({
      x: 6,
      y: 5,
      mp: 0,
      actions: { remaining: 0 },
    });
    expect(attacks).toHaveLength(2);
    // El segundo ataque enemigo falla y abre la réplica del jugador (REQ-027).
    expect(result.events.map((event) => event.type)).toEqual([
      'TurnEnded',
      'EnemyPhaseStarted',
      'UnitMoved',
      'UnitMoved',
      'UnitMoved',
      'UnitMoved',
      'AttackPerformed',
      'AttackPerformed',
      'ReplicaPerformed',
      'PlayerTurnStarted',
    ]);
  });

  it('restaura MP y acción del enemigo al empezar su fase', () => {
    const state = makeState({
      players: [makeUnit({ id: 'player-1', faction: 'player', x: 18, y: 5 })],
      enemies: [
        makeUnit({
          id: 'enemy-1',
          faction: 'enemy',
          x: 10,
          y: 5,
          mp: 0,
          actions: 0,
        }),
      ],
    });

    const result = reduce(state, { type: 'EndTurn' });

    expect(result.state.enemies[0]).toMatchObject({ x: 14, y: 5, mp: 0 });
    expect(result.state.enemies[0].actions.remaining).toBe(2);
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
      { id: 'enemy-1', x: 6, y: 5 },
      { id: 'enemy-2', x: 5, y: 6 },
    ]);
    expect(moves.map((move) => move.unitId)).toEqual([
      'enemy-1',
      'enemy-1',
      'enemy-1',
      'enemy-1',
      'enemy-2',
      'enemy-2',
      'enemy-2',
      'enemy-2',
    ]);
    expect(moves[0]).toMatchObject({
      unitId: 'enemy-1',
      from: { x: 10, y: 5 },
      to: { x: 9, y: 5 },
      mpLeft: 3,
    });
    expect(moves[3]).toMatchObject({
      unitId: 'enemy-1',
      from: { x: 7, y: 5 },
      to: { x: 6, y: 5 },
      mpLeft: 0,
    });
    expect(moves[4]).toMatchObject({
      unitId: 'enemy-2',
      from: { x: 5, y: 10 },
      to: { x: 5, y: 9 },
      mpLeft: 3,
    });
    expect(moves[7]).toMatchObject({
      unitId: 'enemy-2',
      from: { x: 5, y: 7 },
      to: { x: 5, y: 6 },
      mpLeft: 0,
    });
  });

  it('varios enemigos adyacentes atacan en la misma fase', () => {
    const state = makeState({
      // Defensor sin arma: este test fija el orden y el daño de los ataques
      // enemigos; la réplica se cubre en `replica.test.ts` (REQ-027).
      players: [
        makeUnit({
          id: 'player-1',
          faction: 'player',
          x: 5,
          y: 5,
          equipment: { weaponId: null, armorId: 'armor', shieldId: 'shield' },
        }),
      ],
      enemies: [
        makeUnit({ id: 'enemy-1', faction: 'enemy', x: 6, y: 5 }),
        makeUnit({ id: 'enemy-2', faction: 'enemy', x: 5, y: 6 }),
      ],
      // Semilla fijada: ambos enemigos impactan.
      rng: createRng(102),
    });
    const firstDamage = expectedDamage(state.enemies[0], state.players[0], 5, 5);
    const secondDamage = expectedDamage(state.enemies[0], state.players[0], 1, 1);
    const thirdDamage = 0;
    const fourthDamage = expectedDamage(state.enemies[1], state.players[0], 4, 2);
    const firstHp = state.players[0].hp - firstDamage;
    const secondHp = firstHp - secondDamage;
    const thirdHp = secondHp - thirdDamage;
    const fourthHp = thirdHp - fourthDamage;

    const result = reduce(state, { type: 'EndTurn' });
    const attacks = result.events.filter((event) => event.type === 'AttackPerformed');

    expect(attacks).toHaveLength(4);
    expect(attacks).toEqual([
      {
        type: 'AttackPerformed',
        attackerId: 'enemy-1',
        targetId: 'player-1',
        hit: true,
        damage: firstDamage,
        targetHp: firstHp,
        rolls: { attack: 6, shield: 5, damage: 5, armor: 5 },
      },
      {
        type: 'AttackPerformed',
        attackerId: 'enemy-1',
        targetId: 'player-1',
        hit: true,
        damage: secondDamage,
        targetHp: secondHp,
        rolls: { attack: 5, shield: 2, damage: 1, armor: 1 },
      },
      {
        type: 'AttackPerformed',
        attackerId: 'enemy-2',
        targetId: 'player-1',
        hit: false,
        damage: thirdDamage,
        targetHp: thirdHp,
        rolls: { attack: 1, shield: 6, damage: null, armor: null },
      },
      {
        type: 'AttackPerformed',
        attackerId: 'enemy-2',
        targetId: 'player-1',
        hit: true,
        damage: fourthDamage,
        targetHp: fourthHp,
        rolls: { attack: 4, shield: 3, damage: 4, armor: 2 },
      },
    ]);
    expect(result.state.players[0].hp).toBe(fourthHp);
  });

  it('detiene la fase enemiga en cuanto muere el último jugador', () => {
    const state = makeState({
      players: [makeUnit({ id: 'player-1', faction: 'player', x: 5, y: 5, hp: 1 })],
      enemies: [
        makeUnit({ id: 'enemy-1', faction: 'enemy', x: 6, y: 5 }),
        makeUnit({ id: 'enemy-2', faction: 'enemy', x: 5, y: 6 }),
      ],
      rng: rngForDice([6, 1, 3, 3]),
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

describe('cola de acciones enemiga', () => {
  function attacksOf(
    events: readonly GameEvent[],
  ): Array<Extract<GameEvent, { type: 'AttackPerformed' }>> {
    return events.filter(
      (event): event is Extract<GameEvent, { type: 'AttackPerformed' }> =>
        event.type === 'AttackPerformed',
    );
  }

  it('cada tipo usa su número de acciones del bestiario', () => {
    for (const [index, type] of (['sentinel', 'brute', 'coward'] as const).entries()) {
      const state = makeState({
        players: [makeUnit({ id: 'player-1', faction: 'player', x: 5, y: 5 })],
        enemies: [
          makeUnit({
            id: 'enemy-1',
            faction: 'enemy',
            enemyType: type,
            x: index === 0 ? 6 : 5,
            y: index === 0 ? 5 : 6,
          }),
        ],
        rng: rngForDice([6, 1, 3, 3]),
      });

      const result = reduce(state, { type: 'EndTurn' });
      const attacks = attacksOf(result.events);

      expect(attacks).toHaveLength(BESTIARY[type].stats.acciones);
      expect(result.state.enemies[0].actions.remaining).toBe(0);
    }
  });

  it('dos tipos encadenan sus acciones sin alterar las del otro', () => {
    const state = makeState({
      players: [makeUnit({ id: 'player-1', faction: 'player', x: 5, y: 5 })],
      enemies: [
        makeUnit({
          id: 'enemy-sentinel',
          faction: 'enemy',
          enemyType: 'sentinel',
          x: 5,
          y: 6,
        }),
        makeUnit({
          id: 'enemy-brute',
          faction: 'enemy',
          enemyType: 'brute',
          x: 6,
          y: 6,
        }),
      ],
      rng: rngForDice([6, 1, 3, 3]),
    });

    const result = reduce(state, { type: 'EndTurn' });
    const attacks = attacksOf(result.events);

    expect(attacks.map((attack) => attack.attackerId)).toEqual([
      'enemy-sentinel',
      'enemy-sentinel',
      'enemy-brute',
    ]);
    expect(result.state.enemies).toMatchObject([
      { id: 'enemy-sentinel', actions: { remaining: 0 } },
      { id: 'enemy-brute', actions: { remaining: 0 } },
    ]);
  });

  it('dormido y en regreso no atacan', () => {
    const state = makeState({
      players: [makeUnit({ id: 'player-1', faction: 'player', x: 5, y: 5 })],
      enemies: [
        makeUnit({
          id: 'enemy-dormant',
          faction: 'enemy',
          x: 6,
          y: 5,
          awareness: 'dormant',
        }),
        makeUnit({
          id: 'enemy-returning',
          faction: 'enemy',
          x: 5,
          y: 6,
          awareness: 'returning',
          home: { x: 18, y: 18 },
        }),
      ],
      rng: rngForDice([6, 1, 3, 3]),
    });

    const result = reduce(state, { type: 'EndTurn' });
    const returning = result.state.enemies.find(
      (enemy) => enemy.id === 'enemy-returning',
    );

    expect(attacksOf(result.events)).toHaveLength(0);
    expect(result.state.enemies[0]).toMatchObject({ x: 6, y: 5, actions: { remaining: 2 } });
    expect(returning).toMatchObject({ awareness: 'returning' });
    expect(returning!.x).toBeGreaterThan(5);
    expect(returning!.y).toBeGreaterThan(6);
  });

  it('el cobarde que huye gasta MP y no ataca al moverse', () => {
    const state = makeState({
      players: [makeUnit({ id: 'player-1', faction: 'player', x: 5, y: 5 })],
      enemies: [
        makeUnit({
          id: 'enemy-1',
          faction: 'enemy',
          enemyType: 'coward',
          x: 9,
          y: 9,
          awareness: 'alert',
          fleeing: true,
        }),
      ],
    });

    const result = reduce(state, { type: 'EndTurn' });
    const moves = result.events.filter((event) => event.type === 'UnitMoved');

    expect(attacksOf(result.events)).toHaveLength(0);
    expect(moves.length).toBeGreaterThan(0);
    expect(result.state.enemies[0]).toMatchObject({
      mp: 0,
      actions: { remaining: BESTIARY.coward.stats.acciones },
    });
  });

  it('el cobarde acorralado ataca con las acciones que le quedan', () => {
    const walls = makeGridWithWalls([
      { x: 5, y: 4 },
      { x: 6, y: 4 },
      { x: 7, y: 4 },
      { x: 7, y: 5 },
      { x: 7, y: 6 },
      { x: 6, y: 6 },
      { x: 5, y: 6 },
    ]);
    const state = makeState({
      grid: walls,
      players: [makeUnit({ id: 'player-1', faction: 'player', x: 5, y: 5 })],
      enemies: [
        makeUnit({
          id: 'enemy-1',
          faction: 'enemy',
          enemyType: 'coward',
          x: 6,
          y: 5,
          awareness: 'alert',
          fleeing: true,
        }),
      ],
      rng: rngForDice([6, 1, 3, 3]),
    });

    const result = reduce(state, { type: 'EndTurn' });
    const attacks = attacksOf(result.events);

    expect(attacks).toHaveLength(BESTIARY.coward.stats.acciones);
    expect(attacks.every((attack) => attack.attackerId === 'enemy-1')).toBe(true);
    expect(result.state.enemies[0].actions.remaining).toBe(0);
  });

  it('la cola termina al morir el objetivo atacado', () => {
    const state = makeState({
      players: [makeUnit({ id: 'player-1', faction: 'player', x: 5, y: 5, hp: 1 })],
      enemies: [
        makeUnit({
          id: 'enemy-1',
          faction: 'enemy',
          enemyType: 'sentinel',
          x: 6,
          y: 5,
        }),
      ],
      rng: rngForDice([6, 1, 3, 3]),
    });

    const result = reduce(state, { type: 'EndTurn' });
    const attacks = attacksOf(result.events);

    expect(attacks).toHaveLength(1);
    expect(result.state.status).toBe('defeat');
    expect(result.state.enemies[0].actions.remaining).toBe(1);
    expect(result.events.map((event) => event.type)).toEqual([
      'TurnEnded',
      'EnemyPhaseStarted',
      'AttackPerformed',
      'UnitDied',
      'GameEnded',
    ]);
  });

  it('la fase termina cuando todos los enemigos agotan sus acciones', () => {
    const state = makeState({
      players: [makeUnit({ id: 'player-1', faction: 'player', x: 5, y: 5 })],
      enemies: [
        makeUnit({ id: 'enemy-1', faction: 'enemy', x: 6, y: 5 }),
        makeUnit({ id: 'enemy-2', faction: 'enemy', x: 5, y: 6 }),
      ],
      rng: createRng(102),
    });

    const result = reduce(state, { type: 'EndTurn' });

    expect(result.state.phase).toBe('player');
    expect(result.state.turn).toBe(2);
    expect(result.state.enemies.every((enemy) => enemy.actions.remaining === 0)).toBe(true);
    expect(result.events.filter((event) => event.type === 'PlayerTurnStarted')).toHaveLength(1);
    expect(result.events.at(-1)).toEqual({ type: 'PlayerTurnStarted', turn: 2 });
  });

  it('es determinista y no usa Math.random', () => {
    const state = makeState({
      players: [makeUnit({ id: 'player-1', faction: 'player', x: 5, y: 5 })],
      enemies: [
        makeUnit({
          id: 'enemy-sentinel',
          faction: 'enemy',
          enemyType: 'sentinel',
          x: 5,
          y: 6,
        }),
        makeUnit({
          id: 'enemy-coward',
          faction: 'enemy',
          enemyType: 'coward',
          x: 6,
          y: 6,
          awareness: 'dormant',
        }),
      ],
      rng: createRng(4242),
    });

    const random = vi.spyOn(Math, 'random').mockImplementation(() => {
      throw new Error('Math.random no debe usarse');
    });

    try {
      const first = reduce(state, { type: 'EndTurn' });
      const second = reduce(state, { type: 'EndTurn' });

      expect(first.events).toEqual(second.events);
      expect(first.state).toEqual(second.state);
      expect(random).not.toHaveBeenCalled();
    } finally {
      random.mockRestore();
    }
  });
});
