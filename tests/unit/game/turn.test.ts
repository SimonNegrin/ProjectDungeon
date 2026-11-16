import { describe, expect, it, vi } from 'vitest';
import {
  BESTIARY,
  MANA_RECOVERY_PER_TURN,
  closeTurnAfterActiveDeath,
  createRng,
  itemInstance,
  reduce,
  type Command,
  type GameEvent,
  type Unit,
} from '../../../src/game/index';
import {
  expectedSinglePacketBreakdown,
  expectedSinglePacketDamage,
  makeGridWithWalls,
  makeState,
  makeUnit,
  rngForDice,
} from './helpers';

function expectedDamage(
  attacker: Unit,
  target: Unit,
  damageDie: number,
  resistanceDie: number,
): number {
  return expectedSinglePacketDamage(attacker, target, damageDie, resistanceDie);
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
    expect(result.state.round).toBe(2);
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

  it('abrir un cofre gasta una acción del turno y EndTurn la restaura (REQ-020 T-005)', () => {
    const state = makeState({
      players: [makeUnit({ id: 'player-1', faction: 'player', x: 5, y: 5, actions: 2 })],
      enemies: [],
      containers: [
        {
          id: 'chest-1',
          x: 6,
          y: 5,
          capacity: 4,
          items: [itemInstance('loot-1', 'sword'), null, null, null],
          kind: 'chest',
          opened: false,
        },
      ],
    });

    const opened = reduce(state, {
      type: 'OpenContainer',
      unitId: 'player-1',
      containerId: 'chest-1',
    });
    expect(opened.events).toEqual([]);
    expect(opened.state.players[0].actions.remaining).toBe(1);
    expect(opened.state.players[0].mp).toBe(state.players[0].mp);

    const ended = reduce(opened.state, { type: 'EndTurn' });
    expect(ended.state.players[0].actions.remaining).toBe(2);
    expect(ended.state.players[0].mp).toBe(state.players[0].maxMp);
    expect(ended.state.containers?.[0].opened).toBe(true);
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
        damageBreakdown: expectedSinglePacketBreakdown(
          state.enemies[0],
          state.players[0],
          5,
          5,
        ),
      },
      {
        type: 'AttackPerformed',
        attackerId: 'enemy-1',
        targetId: 'player-1',
        hit: true,
        damage: secondDamage,
        targetHp: secondHp,
        rolls: { attack: 5, shield: 2, damage: 1, armor: 1 },
        damageBreakdown: expectedSinglePacketBreakdown(
          state.enemies[0],
          state.players[0],
          1,
          1,
        ),
      },
      {
        type: 'AttackPerformed',
        attackerId: 'enemy-2',
        targetId: 'player-1',
        hit: false,
        damage: thirdDamage,
        targetHp: thirdHp,
        rolls: { attack: 1, shield: 6, damage: null, armor: null },
        damageBreakdown: [],
      },
      {
        type: 'AttackPerformed',
        attackerId: 'enemy-2',
        targetId: 'player-1',
        hit: true,
        damage: fourthDamage,
        targetHp: fourthHp,
        rolls: { attack: 4, shield: 3, damage: 4, armor: 2 },
        damageBreakdown: expectedSinglePacketBreakdown(
          state.enemies[1],
          state.players[0],
          4,
          2,
        ),
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
    expect(result.state.round).toBe(2);
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

describe('turno por jugador, validación del activo y fase enemiga (REQ-031 T-002/T-003/T-004)', () => {
  function party(count: number, options: { readonly mp?: number; readonly actions?: number } = {}) {
    return Array.from({ length: count }, (_, index) =>
      makeUnit({
        id: `player-${index + 1}`,
        faction: 'player',
        x: 5 + index,
        y: 5,
        ...(options.mp === undefined ? {} : { mp: options.mp }),
        ...(options.actions === undefined ? {} : { actions: options.actions }),
      }),
    );
  }

  it('con dos jugadores alterna sin fase enemiga hasta cerrar la ronda', () => {
    const state = makeState({
      players: party(2, { mp: 0, actions: 0 }),
      enemies: [makeUnit({ id: 'enemy-1', faction: 'enemy', x: 18, y: 18, awareness: 'dormant' })],
    });

    const first = reduce(state, { type: 'EndTurn' });

    expect(first.state.phase).toBe('player');
    expect(first.state.round).toBe(1);
    expect(first.state.activePlayerId).toBe('player-2');
    expect(first.state.players[1]).toMatchObject({ mp: 6, actions: { remaining: 2 } });
    expect(first.state.players[0]).toMatchObject({ mp: 0, actions: { remaining: 0 } });
    expect(first.events).toEqual([
      { type: 'TurnEnded', turn: 1 },
      { type: 'PlayerTurnStarted', turn: 1 },
    ]);
    expect(first.enemyPhase).toBeUndefined();

    const second = reduce(first.state, { type: 'EndTurn' });

    expect(second.state.phase).toBe('player');
    expect(second.state.round).toBe(2);
    expect(second.state.activePlayerId).toBe('player-1');
    expect(second.state.players[0]).toMatchObject({ mp: 6, actions: { remaining: 2 } });
    expect(second.events.filter((event) => event.type === 'EnemyPhaseStarted')).toHaveLength(1);
    expect(second.enemyPhase).toEqual([
      { enemyId: 'enemy-1', targetId: null, action: 'wait' },
    ]);
  });

  it('con seis jugadores hay una única fase enemiga por ronda y vuelve al primero', () => {
    let state = makeState({
      players: party(6, { mp: 0, actions: 0 }),
      enemies: [makeUnit({ id: 'enemy-1', faction: 'enemy', x: 18, y: 18, awareness: 'dormant' })],
    });
    let enemyPhases = 0;

    for (let index = 1; index <= 6; index += 1) {
      const result = reduce(state, { type: 'EndTurn' });
      enemyPhases += result.events.filter((event) => event.type === 'EnemyPhaseStarted').length;
      state = result.state;

      if (index < 6) {
        expect(result.state.round, `turno ${index}`).toBe(1);
        expect(result.state.activePlayerId).toBe(`player-${index + 1}`);
        expect(result.enemyPhase).toBeUndefined();
      }
    }

    expect(enemyPhases).toBe(1);
    expect(state.phase).toBe('player');
    expect(state.round).toBe(2);
    expect(state.activePlayerId).toBe('player-1');
    expect(state.players[0]).toMatchObject({ mp: 6, actions: { remaining: 2 } });
    expect(state.players[5]).toMatchObject({ mp: 6, actions: { remaining: 2 } });
  });

  it('restaura recursos solo al jugador que empieza su turno', () => {
    const state = makeState({
      players: [
        makeUnit({
          id: 'player-1',
          faction: 'player',
          x: 5,
          y: 5,
          mp: 0,
          actions: 0,
          magicLevel: 1,
          mana: { current: 1, max: 4 },
          spellsCast: 2,
        }),
        makeUnit({
          id: 'player-2',
          faction: 'player',
          x: 6,
          y: 5,
          mp: 1,
          actions: 1,
          magicLevel: 2,
          mana: { current: 0, max: 8 },
          spellsCast: 1,
        }),
      ],
      enemies: [makeUnit({ id: 'enemy-1', faction: 'enemy', x: 18, y: 18, awareness: 'dormant' })],
    });

    const first = reduce(state, { type: 'EndTurn' });

    expect(first.state.players[1]).toMatchObject({
      mp: 6,
      actions: { remaining: 2 },
      mana: { current: Math.min(0 + MANA_RECOVERY_PER_TURN, 8), max: 8 },
      spellsCast: 0,
    });
    expect(first.state.players[0]).toMatchObject({
      mp: 0,
      actions: { remaining: 0 },
      mana: { current: 1, max: 4 },
      spellsCast: 2,
    });

    const second = reduce(first.state, { type: 'EndTurn' });

    expect(second.state.players[0]).toMatchObject({
      mp: 6,
      actions: { remaining: 2 },
      mana: { current: 4, max: 4 },
      spellsCast: 0,
    });
    // El segundo conserva sus recursos hasta su próximo turno.
    expect(second.state.players[1]).toMatchObject({
      mp: 6,
      actions: { remaining: 2 },
      mana: { current: MANA_RECOVERY_PER_TURN, max: 8 },
      spellsCast: 0,
    });
  });

  it('un resucitado con el índice por delante recibe su turno en la misma ronda', () => {
    const state = makeState({
      players: [
        makeUnit({ id: 'player-1', faction: 'player', x: 5, y: 5 }),
        makeUnit({
          id: 'player-2',
          faction: 'player',
          x: 6,
          y: 5,
          hp: 12,
          mp: 0,
          actionsMax: 2,
          actions: 0,
          magicLevel: 1,
          mana: { current: 0, max: 4 },
          spellsCast: 1,
        }),
      ],
      enemies: [makeUnit({ id: 'enemy-1', faction: 'enemy', x: 18, y: 18, awareness: 'dormant' })],
    });

    const result = reduce(state, { type: 'EndTurn', unitId: 'player-1' });

    expect(result.state.round).toBe(1);
    expect(result.state.activePlayerId).toBe('player-2');
    expect(result.events).toEqual([
      { type: 'TurnEnded', turn: 1 },
      { type: 'PlayerTurnStarted', turn: 1 },
    ]);
    expect(result.enemyPhase).toBeUndefined();
    expect(result.state.players[1]).toMatchObject({
      mp: 6,
      mana: { current: 4, max: 4 },
      actions: { max: 2, remaining: 2 },
      spellsCast: 0,
    });
  });

  it('un resucitado con el índice ya pasado espera a la ronda siguiente', () => {
    const state = makeState({
      players: [
        makeUnit({
          id: 'player-1',
          faction: 'player',
          x: 6,
          y: 5,
          hp: 12,
          mp: 0,
          actionsMax: 2,
          actions: 0,
          magicLevel: 1,
          mana: { current: 0, max: 4 },
          spellsCast: 1,
        }),
        makeUnit({ id: 'player-2', faction: 'player', x: 5, y: 5 }),
      ],
      enemies: [makeUnit({ id: 'enemy-1', faction: 'enemy', x: 18, y: 18, awareness: 'dormant' })],
      activePlayerId: 'player-2',
    });

    const result = reduce(state, { type: 'EndTurn', unitId: 'player-2' });

    expect(result.state.round).toBe(2);
    expect(result.state.activePlayerId).toBe('player-1');
    expect(result.events.map((event) => event.type)).toEqual([
      'TurnEnded',
      'EnemyPhaseStarted',
      'EnemyWaited',
      'PlayerTurnStarted',
    ]);
    // No actuó en la ronda 1: solo recibe recursos cuando empieza su turno.
    expect(result.state.players[0]).toMatchObject({
      mp: 6,
      mana: { current: 4, max: 4 },
      actions: { max: 2, remaining: 2 },
      spellsCast: 0,
    });
  });

  it('no cierra el turno al agotar recursos; solo lo hace EndTurn', () => {
    const state = makeState({
      players: party(2, { mp: 0, actions: 0 }),
      enemies: [makeUnit({ id: 'enemy-1', faction: 'enemy', x: 18, y: 18, awareness: 'dormant' })],
    });

    const spent = reduce(state, { type: 'Move', unitId: 'player-1', dx: 1, dy: 0 });

    expect(spent.events).toEqual([
      { type: 'CommandRejected', commandType: 'Move', reason: 'no-mp' },
    ]);
    expect(spent.state.activePlayerId).toBe('player-1');
    expect(spent.state.round).toBe(1);

    const ended = reduce(spent.state, { type: 'EndTurn', unitId: 'player-1' });

    expect(ended.state.activePlayerId).toBe('player-2');
    expect(ended.state.round).toBe(1);
  });

  it('rechaza EndTurn sin activo válido o con otro jugador sin cambiar el estado', () => {
    const noActive = makeState({ players: party(2), activePlayerId: null });
    const missing = makeState({ players: party(2), activePlayerId: 'player-9' });
    const other = makeState({ players: party(2), activePlayerId: 'player-1' });
    const dead = makeState({
      players: [
        makeUnit({ id: 'player-1', faction: 'player', x: 5, y: 5, hp: 0 }),
        makeUnit({ id: 'player-2', faction: 'player', x: 6, y: 5 }),
      ],
      activePlayerId: 'player-1',
    });

    for (const [state, command, reason] of [
      [noActive, { type: 'EndTurn' }, 'invalid-active'],
      [missing, { type: 'EndTurn' }, 'invalid-active'],
      [other, { type: 'EndTurn', unitId: 'player-2' }, 'not-active'],
      [dead, { type: 'EndTurn' }, 'dead-unit'],
    ] as const) {
      const result = reduce(state, command);
      expect(result.state, reason).toBe(state);
      expect(result.events).toEqual([
        { type: 'CommandRejected', commandType: 'EndTurn', reason },
      ]);
    }

    const matching = reduce(other, { type: 'EndTurn', unitId: 'player-1' });
    expect(matching.state.activePlayerId).toBe('player-2');
  });

  it('rechaza los comandos de una unidad no activa sin cambios', () => {
    const state = makeState({
      players: party(2),
      enemies: [makeUnit({ id: 'enemy-1', faction: 'enemy', x: 18, y: 18 })],
      activePlayerId: 'player-1',
    });
    const commands: readonly Command[] = [
      { type: 'Move', unitId: 'player-2', dx: 1, dy: 0 },
      { type: 'MoveTo', unitId: 'player-2', target: { x: 9, y: 5 } },
      { type: 'Attack', unitId: 'player-2', targetId: 'enemy-1' },
      { type: 'CastSpell', unitId: 'player-2', spellId: 'electric-1', target: { x: 9, y: 5 } },
      { type: 'PickUp', unitId: 'player-2' },
      { type: 'TakeItem', unitId: 'player-2', containerId: 'corpse-x', itemId: 'item-x' },
      { type: 'TakeAll', unitId: 'player-2', containerId: 'corpse-x' },
      { type: 'EquipItem', unitId: 'player-2', from: 'backpack', index: 0 },
      { type: 'UnequipItem', unitId: 'player-2', slot: 'weapon' },
      { type: 'DropItem', unitId: 'player-2', from: 'backpack', index: 0 },
      { type: 'SelectWeapon', unitId: 'player-2', slot: 1 },
      { type: 'InspectContainer', unitId: 'player-2', containerId: 'chest-x' },
    ];

    for (const command of commands) {
      const result = reduce(state, command);
      expect(result.state, command.type).toBe(state);
      expect(result.events, command.type).toEqual([
        {
          type: 'CommandRejected',
          commandType: command.type,
          reason: 'not-active',
        },
      ]);
    }
  });

  it('expone la fase enemiga en orden de índice con objetivo y espera', () => {
    const state = makeState({
      players: [makeUnit({ id: 'player-1', faction: 'player', x: 5, y: 5, hp: 20 })],
      enemies: [
        makeUnit({ id: 'enemy-1', faction: 'enemy', x: 15, y: 15, awareness: 'dormant' }),
        makeUnit({ id: 'enemy-2', faction: 'enemy', x: 6, y: 5 }),
        makeUnit({ id: 'enemy-3', faction: 'enemy', x: 18, y: 18 }),
      ],
      rng: createRng(102),
    });

    const result = reduce(state, { type: 'EndTurn' });

    expect(result.enemyPhase).toEqual([
      { enemyId: 'enemy-1', targetId: null, action: 'wait' },
      { enemyId: 'enemy-2', targetId: 'player-1', action: 'act' },
      { enemyId: 'enemy-3', targetId: 'player-1', action: 'act' },
    ]);
    expect(result.events.filter((event) => event.type === 'EnemyWaited')).toEqual([
      { type: 'EnemyWaited', unitId: 'enemy-1' },
    ]);
  });

  it('el fantasma conserva su índice, recibe recursos y puede cerrar turno', () => {
    const state = makeState({
      players: [
        makeUnit({ id: 'player-1', faction: 'player', x: 4, y: 5, hp: 0 }),
        makeUnit({
          id: 'player-2',
          faction: 'player',
          x: 5,
          y: 5,
          hp: 0,
          ghost: true,
          mp: 0,
          actions: 0,
          actionsMax: 1,
        }),
        makeUnit({ id: 'player-3', faction: 'player', x: 6, y: 5 }),
      ],
      enemies: [makeUnit({ id: 'enemy-1', faction: 'enemy', x: 18, y: 18, awareness: 'dormant' })],
      activePlayerId: 'player-3',
    });

    const phased = reduce(state, { type: 'EndTurn' });

    expect(phased.state.round).toBe(2);
    expect(phased.state.activePlayerId).toBe('player-2');
    expect(phased.state.players.map((player) => player.id)).toEqual([
      'player-1',
      'player-2',
      'player-3',
    ]);
    expect(phased.state.players[1]).toMatchObject({
      mp: 6,
      actions: { max: 1, remaining: 1 },
    });

    const passed = reduce(phased.state, { type: 'EndTurn' });

    expect(passed.state.round).toBe(2);
    expect(passed.state.activePlayerId).toBe('player-3');
    expect(passed.state.players.map((player) => player.id)).toEqual([
      'player-1',
      'player-2',
      'player-3',
    ]);
  });
});

describe('muerte del activo en su turno y wipe (REQ-031 R-015, REQ-021 R-011/T-008)', () => {
  function types(events: readonly GameEvent[]): string[] {
    return events.map((event) => event.type);
  }

  it('closeTurnAfterActiveDeath cierra solo si el activo murió y la partida sigue', () => {
    const dead = makeState({
      players: [
        makeUnit({ id: 'player-1', faction: 'player', x: 5, y: 5, hp: 0 }),
        makeUnit({ id: 'player-2', faction: 'player', x: 8, y: 5, mp: 0, actions: 0 }),
      ],
      activePlayerId: 'player-1',
    });

    const closed = closeTurnAfterActiveDeath(dead, 'player-1');

    expect(closed && types(closed.events)).toEqual(['TurnEnded', 'PlayerTurnStarted']);
    expect(closed?.state.activePlayerId).toBe('player-2');
    expect(closed?.state.round).toBe(1);
    expect(closed?.state.players[1]).toMatchObject({ mp: 6, actions: { remaining: 2 } });

    // No cierra si el activo sigue vivo, cambió, falta o la partida terminó.
    expect(closeTurnAfterActiveDeath(makeState(), 'player-1')).toBeUndefined();
    expect(
      closeTurnAfterActiveDeath({ ...dead, activePlayerId: 'player-2' }, 'player-1'),
    ).toBeUndefined();
    expect(
      closeTurnAfterActiveDeath({ ...dead, activePlayerId: 'player-9' }, 'player-9'),
    ).toBeUndefined();
    expect(
      closeTurnAfterActiveDeath({ ...dead, status: 'defeat' }, 'player-1'),
    ).toBeUndefined();
  });

  it('si no queda ningún vivo, la derrota no añade turno y conserva la ronda', () => {
    const state = makeState({
      players: [
        makeUnit({ id: 'player-1', faction: 'player', x: 5, y: 5, hp: 1 }),
        makeUnit({ id: 'player-2', faction: 'player', x: 8, y: 5, hp: 0, ghost: true }),
      ],
      enemies: [makeUnit({ id: 'enemy-1', faction: 'enemy', x: 6, y: 5 })],
      round: 3,
      rng: rngForDice([1, 6, 6, 1, 3, 3]),
    });

    const result = reduce(state, {
      type: 'Attack',
      unitId: 'player-1',
      targetId: 'enemy-1',
    });

    // El fantasma no evita el wipe (la resurrección aún no existe: TASK-0148).
    expect(types(result.events)).toEqual([
      'AttackPerformed',
      'ReplicaPerformed',
      'UnitDied',
      'GameEnded',
    ]);
    expect(result.events.at(-1)).toEqual({ type: 'GameEnded', status: 'defeat' });
    expect(result.state.status).toBe('defeat');
    expect(result.state.round).toBe(3);
    expect(result.state.players[1].ghost).toBe(true);

    const rejected = reduce(result.state, { type: 'EndTurn' });
    expect(rejected.events).toEqual([
      { type: 'CommandRejected', commandType: 'EndTurn', reason: 'game-over' },
    ]);
  });

  it('con un vivo y fantasmas la partida sigue y el control pasa al siguiente jugable', () => {
    const state = makeState({
      players: [
        makeUnit({ id: 'player-1', faction: 'player', x: 5, y: 5, hp: 1 }),
        makeUnit({ id: 'player-2', faction: 'player', x: 8, y: 5, hp: 0, ghost: true }),
        makeUnit({ id: 'player-3', faction: 'player', x: 9, y: 5, mp: 0, actions: 0 }),
      ],
      enemies: [makeUnit({ id: 'enemy-1', faction: 'enemy', x: 6, y: 5 })],
      rng: rngForDice([1, 6, 6, 1, 3, 3]),
    });

    const result = reduce(state, {
      type: 'Attack',
      unitId: 'player-1',
      targetId: 'enemy-1',
    });

    expect(result.state.status).toBe('playing');
    expect(result.state.round).toBe(1);
    expect(result.state.activePlayerId).toBe('player-2');
    expect(types(result.events)).toEqual([
      'AttackPerformed',
      'ReplicaPerformed',
      'UnitDied',
      'TurnEnded',
      'PlayerTurnStarted',
    ]);

    // El fantasma puede cerrar turno; el control llega al vivo siguiente.
    const passed = reduce(result.state, { type: 'EndTurn', unitId: 'player-2' });
    expect(passed.state.status).toBe('playing');
    expect(passed.state.activePlayerId).toBe('player-3');
    expect(passed.state.players[2]).toMatchObject({ mp: 6, actions: { remaining: 2 } });
  });

  it('un último vivo que muere en la fase enemiga deja derrota sin PlayerTurnStarted', () => {
    const state = makeState({
      players: [
        makeUnit({ id: 'player-2', faction: 'player', x: 18, y: 18, hp: 0, ghost: true }),
        makeUnit({ id: 'player-1', faction: 'player', x: 5, y: 5, hp: 1 }),
      ],
      enemies: [makeUnit({ id: 'enemy-1', faction: 'enemy', x: 6, y: 5 })],
      activePlayerId: 'player-1',
      round: 2,
      rng: rngForDice([6, 1, 3, 3]),
    });

    const result = reduce(state, { type: 'EndTurn' });

    expect(types(result.events)).toEqual([
      'TurnEnded',
      'EnemyPhaseStarted',
      'AttackPerformed',
      'UnitDied',
      'GameEnded',
    ]);
    expect(result.state.status).toBe('defeat');
    expect(result.state.round).toBe(2);
    expect(result.events).not.toContainEqual({ type: 'PlayerTurnStarted', turn: 3 });
  });

  it('si muere en la fase enemiga con otro vivo, la ronda avanza y el activo se recoloca', () => {
    const state = makeState({
      players: [
        makeUnit({ id: 'player-2', faction: 'player', x: 18, y: 18 }),
        makeUnit({ id: 'player-1', faction: 'player', x: 5, y: 5, hp: 1 }),
      ],
      enemies: [makeUnit({ id: 'enemy-1', faction: 'enemy', x: 6, y: 5 })],
      activePlayerId: 'player-1',
      rng: rngForDice([6, 1, 3, 3]),
    });

    const result = reduce(state, { type: 'EndTurn' });

    expect(types(result.events)).toEqual([
      'TurnEnded',
      'EnemyPhaseStarted',
      'AttackPerformed',
      'UnitDied',
      'PlayerTurnStarted',
    ]);
    expect(result.state.status).toBe('playing');
    expect(result.state.round).toBe(2);
    expect(result.state.activePlayerId).toBe('player-2');
    expect(result.state.players[1]).toMatchObject({ hp: 0, ghost: true });
  });
});
