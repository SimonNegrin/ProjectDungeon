import { describe, expect, it } from 'vitest';
import {
  WEAPONS,
  armorValue,
  planEnemyAction,
  reduce,
  resolveAttack,
  resolveDamage,
  type GameEvent,
  type Unit,
} from '../../../src/game/index';
import { advanceRng, makeState, makeUnit, rngForDice } from './helpers';

const DAMAGE_DICE = [3, 3] as const;
const PLAYER_HIT = [6, 1, ...DAMAGE_DICE] as const;
/** Fallo del atacante y fallo de la réplica con las tiradas mínimas. */
const BOTH_MISS = [1, 6, 1, 6] as const;

function expectedDamage(
  attacker: Unit,
  target: Unit,
  damageDie: number,
  armorDie: number,
): number {
  return resolveDamage(
    attacker.stats.fuerza + WEAPONS[attacker.equipment.weaponId!].damage,
    target.stats.resistencia + armorValue(target.equipment.armorId),
    damageDie,
    armorDie,
  );
}

function armedEnemy(
  x: number,
  y: number,
  overrides: Partial<Parameters<typeof makeUnit>[0]> = {},
): Unit {
  return makeUnit({
    id: 'enemy-1',
    faction: 'enemy',
    x,
    y,
    awareness: 'alert',
    ...overrides,
  });
}

function armedPlayer(
  x: number,
  y: number,
  overrides: Partial<Parameters<typeof makeUnit>[0]> = {},
): Unit {
  return makeUnit({ id: 'player-1', faction: 'player', x, y, ...overrides });
}

function types(events: readonly GameEvent[]): string[] {
  return events.map((event) => event.type);
}

describe('réplica tras fallo cuerpo a cuerpo', () => {
  it('un impacto no genera réplica y conserva el contrato del ataque', () => {
    const state = makeState({
      players: [armedPlayer(5, 5)],
      enemies: [armedEnemy(6, 5)],
      rng: rngForDice(PLAYER_HIT),
    });
    const damage = expectedDamage(state.players[0], state.enemies[0], 3, 3);
    const enemyBefore = state.enemies[0];

    const result = reduce(state, {
      type: 'Attack',
      unitId: 'player-1',
      targetId: 'enemy-1',
    });

    expect(types(result.events)).toEqual(['AttackPerformed']);
    expect(result.state.enemies[0]).toMatchObject({
      hp: enemyBefore.hp - damage,
      actions: { remaining: enemyBefore.actions.remaining },
    });
    expect(result.state.players[0].actions.remaining).toBe(1);
  });

  it('un fallo resuelve la réplica del defensor justo después del ataque', () => {
    const state = makeState({
      players: [armedPlayer(5, 5)],
      enemies: [armedEnemy(6, 5)],
      rng: rngForDice([1, 6, ...PLAYER_HIT]),
    });
    const damage = expectedDamage(state.enemies[0], state.players[0], 3, 3);
    const playerHp = state.players[0].hp;

    const result = reduce(state, {
      type: 'Attack',
      unitId: 'player-1',
      targetId: 'enemy-1',
    });

    expect(types(result.events)).toEqual(['AttackPerformed', 'ReplicaPerformed']);
    expect(result.events[0]).toMatchObject({
      type: 'AttackPerformed',
      attackerId: 'player-1',
      targetId: 'enemy-1',
      hit: false,
      damage: 0,
      rolls: { attack: 1, shield: 6, damage: null, armor: null },
    });
    expect(result.events[1]).toEqual({
      type: 'ReplicaPerformed',
      attackerId: 'enemy-1',
      targetId: 'player-1',
      hit: true,
      damage,
      targetHp: playerHp - damage,
      rolls: { attack: 6, shield: 1, damage: 3, armor: 3 },
    });
    expect(result.state.players[0].hp).toBe(playerHp - damage);
    expect(result.state.players[0].actions.remaining).toBe(1);
  });

  it('la réplica usa tiradas nuevas y puede fallar sin abrir cadena', () => {
    const state = makeState({
      players: [armedPlayer(5, 5)],
      enemies: [armedEnemy(6, 5)],
      rng: rngForDice(BOTH_MISS),
    });
    const before = state.players[0];

    const result = reduce(state, {
      type: 'Attack',
      unitId: 'player-1',
      targetId: 'enemy-1',
    });

    expect(result.events).toEqual([
      {
        type: 'AttackPerformed',
        attackerId: 'player-1',
        targetId: 'enemy-1',
        hit: false,
        damage: 0,
        targetHp: state.enemies[0].hp,
        rolls: { attack: 1, shield: 6, damage: null, armor: null },
      },
      {
        type: 'ReplicaPerformed',
        attackerId: 'enemy-1',
        targetId: 'player-1',
        hit: false,
        damage: 0,
        targetHp: before.hp,
        rolls: { attack: 1, shield: 6, damage: null, armor: null },
      },
    ]);
    // Cuatro tiradas: dos del fallo y dos de la réplica; no hay tercera.
    expect(result.state.rng).toEqual(advanceRng(state.rng, BOTH_MISS));
  });

  it('la réplica puede matar: el atacante muere y el jugador pierde la partida', () => {
    const state = makeState({
      players: [armedPlayer(5, 5, { hp: 1 })],
      enemies: [armedEnemy(6, 5)],
      rng: rngForDice([1, 6, ...PLAYER_HIT]),
    });

    const result = reduce(state, {
      type: 'Attack',
      unitId: 'player-1',
      targetId: 'enemy-1',
    });

    expect(types(result.events)).toEqual([
      'AttackPerformed',
      'ReplicaPerformed',
      'UnitDied',
      'GameEnded',
    ]);
    expect(result.state.players[0].hp).toBe(0);
    expect(result.state.status).toBe('defeat');
    expect(result.state.enemies[0].hp).toBe(state.enemies[0].hp);
    expect(result.events.at(-1)).toEqual({ type: 'GameEnded', status: 'defeat' });

    const again = reduce(result.state, {
      type: 'Attack',
      unitId: 'player-1',
      targetId: 'enemy-1',
    });
    expect(again.events).toEqual([
      { type: 'CommandRejected', commandType: 'Attack', reason: 'game-over' },
    ]);
  });

  it('el enemigo que muere por la réplica no ejecuta su acción siguiente', () => {
    const state = makeState({
      players: [armedPlayer(5, 5)],
      enemies: [armedEnemy(6, 5, { enemyType: 'sentinel', hp: 1 })],
      rng: rngForDice([1, 6, ...PLAYER_HIT]),
    });

    const result = reduce(state, { type: 'EndTurn' });
    const attacks = result.events.filter(
      (event) => event.type === 'AttackPerformed',
    );

    expect(attacks).toHaveLength(1);
    expect(types(result.events)).toEqual([
      'TurnEnded',
      'EnemyPhaseStarted',
      'AttackPerformed',
      'ReplicaPerformed',
      'UnitDied',
      'GameEnded',
    ]);
    expect(result.state.enemies[0].hp).toBe(0);
    expect(result.state.status).toBe('victory');
    expect(types(result.events)).not.toContain('PlayerTurnStarted');
  });

  it('dos fallos en el mismo turno producen dos réplicas independientes', () => {
    // Habilidad mínima y defensa suficiente: ambos ataques y ambas réplicas
    // fallan con cualquier tirada, de modo que el test no fija dados.
    const state = makeState({
      players: [armedPlayer(5, 5, { stats: { habilidad: -10 } })],
      enemies: [armedEnemy(6, 5, { stats: { habilidad: -10 } })],
    });

    const first = reduce(state, {
      type: 'Attack',
      unitId: 'player-1',
      targetId: 'enemy-1',
    });
    const second = reduce(first.state, {
      type: 'Attack',
      unitId: 'player-1',
      targetId: 'enemy-1',
    });

    expect(types(first.events)).toEqual(['AttackPerformed', 'ReplicaPerformed']);
    expect(types(second.events)).toEqual(['AttackPerformed', 'ReplicaPerformed']);
    expect(second.state.players[0].actions.remaining).toBe(0);
    expect(second.state.enemies[0].actions.remaining).toBe(2);
    expect(second.state.players[0].hp).toBe(state.players[0].hp);
    expect(second.state.enemies[0].hp).toBe(state.enemies[0].hp);
  });

  it('la réplica es gratis y deja intactos acciones y MP del defensor', () => {
    const playerDefends = makeState({
      players: [armedPlayer(5, 5)],
      enemies: [armedEnemy(6, 5)],
      rng: rngForDice([1, 6, ...PLAYER_HIT]),
    });
    const playerBefore = playerDefends.players[0];

    const enemyMiss = resolveAttack(playerDefends, 'enemy-1', 'player-1');
    if (!enemyMiss.ok) throw new Error(enemyMiss.reason);

    expect(types(enemyMiss.events)).toEqual([
      'AttackPerformed',
      'ReplicaPerformed',
    ]);
    expect(enemyMiss.state.players[0]).toMatchObject({
      actions: playerBefore.actions,
      mp: playerBefore.mp,
      maxMp: playerBefore.maxMp,
    });
    expect(enemyMiss.state.enemies[0].actions.remaining).toBe(
      playerDefends.enemies[0].actions.remaining - 1,
    );
  });

  it('serializar y rehidratar el estado no reproduce réplicas pendientes', () => {
    const state = makeState({
      players: [armedPlayer(5, 5)],
      enemies: [armedEnemy(6, 5)],
      rng: rngForDice(BOTH_MISS),
    });

    const result = reduce(state, {
      type: 'Attack',
      unitId: 'player-1',
      targetId: 'enemy-1',
    });
    const hydrated = JSON.parse(JSON.stringify(result.state)) as typeof state;

    expect(hydrated).toEqual(result.state);
    // Un comando sin efecto no vuelve a emitir la reacción ya resuelta.
    const next = reduce(hydrated, {
      type: 'SelectWeapon',
      unitId: 'player-1',
      slot: 1,
    });
    expect(next.events).toEqual([]);
    expect(types(next.events)).not.toContain('ReplicaPerformed');
  });
});

describe('elegibilidad del defensor', () => {
  it('sin arma equipada no hay réplica', () => {
    const state = makeState({
      players: [armedPlayer(5, 5)],
      enemies: [
        armedEnemy(6, 5, {
          equipment: { weaponId: null, armorId: 'armor', shieldId: 'shield' },
        }),
      ],
      rng: rngForDice([1, 6]),
    });

    const result = reduce(state, {
      type: 'Attack',
      unitId: 'player-1',
      targetId: 'enemy-1',
    });

    expect(types(result.events)).toEqual(['AttackPerformed']);
  });

  it('un enemigo dormido no replica aunque esté armado y adyacente', () => {
    const state = makeState({
      players: [armedPlayer(5, 5)],
      enemies: [armedEnemy(6, 5, { awareness: 'dormant' })],
      rng: rngForDice([1, 6]),
    });

    const result = reduce(state, {
      type: 'Attack',
      unitId: 'player-1',
      targetId: 'enemy-1',
    });

    expect(types(result.events)).toEqual(['AttackPerformed']);
    expect(result.state.enemies[0].awareness).toBe('dormant');
  });

  it('acercarse despierta al dormido y desde ese momento sí replica', () => {
    const state = makeState({
      players: [armedPlayer(4, 5)],
      enemies: [armedEnemy(6, 5, { enemyType: 'sentinel', awareness: 'dormant' })],
    });
    expect(state.enemies[0].awareness).toBe('dormant');

    const moved = reduce(state, {
      type: 'Move',
      unitId: 'player-1',
      dx: 1,
      dy: 0,
    });
    expect(types(moved.events)).toContain('EnemySpotted');
    expect(moved.state.enemies[0].awareness).toBe('alert');

    const attacked = reduce(
      { ...moved.state, rng: rngForDice([1, 6, ...PLAYER_HIT]) },
      { type: 'Attack', unitId: 'player-1', targetId: 'enemy-1' },
    );
    expect(types(attacked.events)).toEqual([
      'AttackPerformed',
      'ReplicaPerformed',
    ]);
  });

  it('un enemigo que huye en campo abierto no replica', () => {
    const state = makeState({
      players: [armedPlayer(5, 5)],
      enemies: [armedEnemy(6, 5, { fleeing: true })],
      rng: rngForDice([1, 6]),
    });

    const result = reduce(state, {
      type: 'Attack',
      unitId: 'player-1',
      targetId: 'enemy-1',
    });

    expect(types(result.events)).toEqual(['AttackPerformed']);
  });

  it('un enemigo que huye acorralado sí replica', () => {
    const state = makeState({
      players: [armedPlayer(2, 2)],
      enemies: [armedEnemy(1, 1, { fleeing: true })],
      rng: rngForDice(BOTH_MISS),
    });

    const result = reduce(state, {
      type: 'Attack',
      unitId: 'player-1',
      targetId: 'enemy-1',
    });

    expect(types(result.events)).toEqual(['AttackPerformed', 'ReplicaPerformed']);
    expect(result.state.enemies[0].fleeing).toBe(true);
  });

  it('el que regresa replica y sigue regresando sin cambiar de objetivo', () => {
    const state = makeState({
      players: [armedPlayer(5, 5)],
      enemies: [
        armedEnemy(6, 5, {
          awareness: 'returning',
          home: { x: 10, y: 5 },
          lastKnown: { x: 2, y: 2 },
        }),
      ],
      rng: rngForDice([1, 6, ...PLAYER_HIT]),
    });
    const enemyBefore = state.enemies[0];

    const result = reduce(state, {
      type: 'Attack',
      unitId: 'player-1',
      targetId: 'enemy-1',
    });

    expect(types(result.events)).toEqual(['AttackPerformed', 'ReplicaPerformed']);
    expect(result.state.enemies[0]).toMatchObject({
      awareness: 'returning',
      home: enemyBefore.home,
      lastKnown: enemyBefore.lastKnown,
    });
    expect(planEnemyAction(result.state, result.state.enemies[0]).type).toBe('move');
  });

  it('ataques a distancia y mágicos no generan réplica', () => {
    for (const kind of ['ranged', 'magic'] as const) {
      const state = makeState({
        players: [armedPlayer(5, 5)],
        enemies: [armedEnemy(6, 5)],
        rng: rngForDice([1, 6]),
      });

      const result = resolveAttack(state, 'player-1', 'enemy-1', kind);

      if (!result.ok) throw new Error(result.reason);
      expect(types(result.events), kind).toEqual(['AttackPerformed']);
      expect(result.hit, kind).toBe(false);
      expect(result.state.rng).toEqual(advanceRng(state.rng, [1, 6]));
    }
  });

  it('un defensor jugador sin arma tampoco replica al enemigo', () => {
    const state = makeState({
      players: [
        armedPlayer(5, 5, {
          equipment: { weaponId: null, armorId: 'armor', shieldId: 'shield' },
        }),
      ],
      enemies: [armedEnemy(6, 5)],
      rng: rngForDice([1, 6]),
    });

    const result = resolveAttack(state, 'enemy-1', 'player-1');
    if (!result.ok) throw new Error(result.reason);

    expect(types(result.events)).toEqual(['AttackPerformed']);
  });
});

describe('orden, determinismo e integración', () => {
  it('usa la misma fórmula y RNG pero tiradas distintas y deterministas', () => {
    const state = makeState({
      players: [armedPlayer(5, 5)],
      enemies: [armedEnemy(6, 5)],
      rng: rngForDice([1, 6, ...PLAYER_HIT]),
    });
    const run = () =>
      reduce(state, {
        type: 'Attack',
        unitId: 'player-1',
        targetId: 'enemy-1',
      });

    const first = run();
    const second = run();

    expect(second).toEqual(first);
    expect(first.state.rng).toEqual(
      advanceRng(state.rng, [1, 6, ...PLAYER_HIT]),
    );
    expect(first.events[1]).toMatchObject({
      type: 'ReplicaPerformed',
      rolls: { attack: 6, shield: 1, damage: 3, armor: 3 },
    });
  });

  it('MoveTo que falla al llegar al enemigo dispara la réplica', () => {
    const state = makeState({
      players: [armedPlayer(2, 5)],
      enemies: [armedEnemy(6, 5)],
      rng: rngForDice(BOTH_MISS),
    });

    const result = reduce(state, {
      type: 'MoveTo',
      unitId: 'player-1',
      target: { x: 6, y: 5 },
    });
    const last = types(result.events).slice(-2);

    expect(result.events.some((event) => event.type === 'UnitMoved')).toBe(true);
    expect(last).toEqual(['AttackPerformed', 'ReplicaPerformed']);
    expect(result.state.players[0].hp).toBe(state.players[0].hp);
    expect(result.state.enemies[0].hp).toBe(state.enemies[0].hp);
  });

  it('el orden es ataque, réplica y muerte del atacante', () => {
    const state = makeState({
      players: [armedPlayer(5, 5, { hp: 1 })],
      enemies: [armedEnemy(6, 5)],
      rng: rngForDice([1, 6, ...PLAYER_HIT]),
    });

    const result = reduce(state, {
      type: 'Attack',
      unitId: 'player-1',
      targetId: 'enemy-1',
    });
    const order = types(result.events);

    expect(order.indexOf('AttackPerformed')).toBeLessThan(
      order.indexOf('ReplicaPerformed'),
    );
    expect(order.indexOf('ReplicaPerformed')).toBeLessThan(
      order.indexOf('UnitDied'),
    );
    expect(order.indexOf('UnitDied')).toBeLessThan(order.indexOf('GameEnded'));
  });
});
