import { describe, expect, it } from 'vitest';
import {
  ARMORS,
  PLAYER_MAX_MP,
  SHIELDS,
  WEAPONS,
  createRng,
  reduce,
  resolveAttack,
  resolveDamage,
  resolveHit,
  rollDie,
  type RngState,
} from '../../../src/game/index';
import { advanceRng, makeState, makeUnit, rngForDice } from './helpers';

const PLAYER_HIT_5 = [6, 1, 2, 1] as const;
const ENEMY_HIT_3 = [6, 1, 3, 3] as const;

describe('combat', () => {
  it('ataca en adyacencia ortogonal e impacta con las tiradas del RNG', () => {
    const state = makeState({
      players: [makeUnit({ id: 'player-1', faction: 'player', x: 5, y: 5 })],
      enemies: [makeUnit({ id: 'enemy-1', faction: 'enemy', x: 6, y: 5 })],
      rng: rngForDice(PLAYER_HIT_5),
    });

    const result = reduce(state, {
      type: 'Attack',
      unitId: 'player-1',
      targetId: 'enemy-1',
    });

    expect(result.state.enemies[0].hp).toBe(5);
    expect(result.state.players[0].actionAvailable).toBe(false);
    expect(result.state.phase).toBe('player');
    expect(result.events).toEqual([
      {
        type: 'AttackPerformed',
        attackerId: 'player-1',
        targetId: 'enemy-1',
        hit: true,
        damage: 5,
        targetHp: 5,
        rolls: { attack: 6, shield: 1, damage: 2, armor: 1 },
      },
    ]);
  });

  it('ataca en diagonal y hace 5 al enemigo', () => {
    const state = makeState({
      players: [makeUnit({ id: 'player-1', faction: 'player', x: 5, y: 5 })],
      enemies: [makeUnit({ id: 'enemy-1', faction: 'enemy', x: 6, y: 6 })],
      rng: rngForDice(PLAYER_HIT_5),
    });

    const result = reduce(state, {
      type: 'Attack',
      unitId: 'player-1',
      targetId: 'enemy-1',
    });

    expect(result.state.enemies[0].hp).toBe(5);
  });

  it('rechaza atacar fuera de rango sin consumir tiradas', () => {
    const state = makeState({
      players: [makeUnit({ id: 'player-1', faction: 'player', x: 5, y: 5 })],
      enemies: [makeUnit({ id: 'enemy-1', faction: 'enemy', x: 7, y: 5 })],
      rng: rngForDice(PLAYER_HIT_5),
    });
    const rngBefore = state.rng;

    const result = reduce(state, {
      type: 'Attack',
      unitId: 'player-1',
      targetId: 'enemy-1',
    });

    expect(result.state.enemies[0].hp).toBe(10);
    expect(result.state.players[0].actionAvailable).toBe(true);
    expect(result.state.rng).toBe(rngBefore);
    expect(result.events).toEqual([
      { type: 'CommandRejected', commandType: 'Attack', reason: 'target-not-adjacent' },
    ]);
  });

  it('solo permite una acción por turno', () => {
    const state = makeState({
      players: [makeUnit({ id: 'player-1', faction: 'player', x: 5, y: 5 })],
      enemies: [makeUnit({ id: 'enemy-1', faction: 'enemy', x: 6, y: 5 })],
      rng: rngForDice(PLAYER_HIT_5),
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

    expect(first.state.enemies[0].hp).toBe(5);
    expect(second.state.enemies[0].hp).toBe(5);
    expect(second.events).toEqual([
      { type: 'CommandRejected', commandType: 'Attack', reason: 'no-action' },
    ]);
  });

  it('permite moverse después de atacar mientras quede MP', () => {
    const state = makeState({
      players: [makeUnit({ id: 'player-1', faction: 'player', x: 5, y: 5 })],
      enemies: [makeUnit({ id: 'enemy-1', faction: 'enemy', x: 6, y: 5 })],
    });

    const attacked = reduce(state, {
      type: 'Attack',
      unitId: 'player-1',
      targetId: 'enemy-1',
    });
    const moved = reduce(attacked.state, {
      type: 'Move',
      unitId: 'player-1',
      dx: 0,
      dy: -1,
    });

    expect(moved.state.players[0]).toMatchObject({
      x: 5,
      y: 4,
      mp: PLAYER_MAX_MP - 1,
      actionAvailable: false,
    });
    expect(moved.events).toHaveLength(1);
    expect(moved.events[0].type).toBe('UnitMoved');
  });

  it('rechaza atacar a un objetivo inexistente o muerto', () => {
    const state = makeState({
      players: [makeUnit({ id: 'player-1', faction: 'player', x: 5, y: 5 })],
      enemies: [makeUnit({ id: 'enemy-1', faction: 'enemy', x: 6, y: 5, hp: 0 })],
    });

    const unknown = reduce(state, {
      type: 'Attack',
      unitId: 'player-1',
      targetId: 'enemy-999',
    });
    expect(unknown.events).toEqual([
      { type: 'CommandRejected', commandType: 'Attack', reason: 'target-not-found' },
    ]);

    const dead = reduce(state, {
      type: 'Attack',
      unitId: 'player-1',
      targetId: 'enemy-1',
    });
    expect(dead.events).toEqual([
      { type: 'CommandRejected', commandType: 'Attack', reason: 'target-dead' },
    ]);
  });

  it('rechaza atacar a una unidad de la misma facción', () => {
    const state = makeState({
      players: [
        makeUnit({ id: 'player-1', faction: 'player', x: 5, y: 5 }),
        makeUnit({ id: 'player-2', faction: 'player', x: 6, y: 5 }),
      ],
      enemies: [makeUnit({ id: 'enemy-1', faction: 'enemy', x: 18, y: 18 })],
    });

    const result = reduce(state, {
      type: 'Attack',
      unitId: 'player-1',
      targetId: 'player-2',
    });

    expect(result.events).toEqual([
      { type: 'CommandRejected', commandType: 'Attack', reason: 'same-faction' },
    ]);
  });

  it('emite muerte y victoria cuando el enemigo llega a 0', () => {
    const state = makeState({
      players: [makeUnit({ id: 'player-1', faction: 'player', x: 5, y: 5 })],
      enemies: [makeUnit({ id: 'enemy-1', faction: 'enemy', x: 6, y: 5, hp: 5 })],
      rng: rngForDice(PLAYER_HIT_5),
    });

    const result = reduce(state, {
      type: 'Attack',
      unitId: 'player-1',
      targetId: 'enemy-1',
    });

    expect(result.state.enemies[0].hp).toBe(0);
    expect(result.state.status).toBe('victory');
    expect(result.events).toEqual([
      {
        type: 'AttackPerformed',
        attackerId: 'player-1',
        targetId: 'enemy-1',
        hit: true,
        damage: 5,
        targetHp: 0,
        rolls: { attack: 6, shield: 1, damage: 2, armor: 1 },
      },
      { type: 'UnitDied', unitId: 'enemy-1' },
      { type: 'GameEnded', status: 'victory' },
    ]);
  });

  it('no declara victoria mientras quede otro enemigo vivo', () => {
    const state = makeState({
      players: [makeUnit({ id: 'player-1', faction: 'player', x: 5, y: 5 })],
      enemies: [
        makeUnit({ id: 'enemy-1', faction: 'enemy', x: 6, y: 5, hp: 5 }),
        makeUnit({ id: 'enemy-2', faction: 'enemy', x: 18, y: 18 }),
      ],
      rng: rngForDice(PLAYER_HIT_5),
    });

    const result = reduce(state, {
      type: 'Attack',
      unitId: 'player-1',
      targetId: 'enemy-1',
    });

    expect(result.state.enemies[0].hp).toBe(0);
    expect(result.state.enemies[1].hp).toBe(10);
    expect(result.state.status).toBe('playing');
    expect(result.events.map((event) => event.type)).toEqual([
      'AttackPerformed',
      'UnitDied',
    ]);
  });

  it('no declara derrota mientras quede otro jugador vivo', () => {
    const state = makeState({
      players: [
        makeUnit({ id: 'player-1', faction: 'player', x: 5, y: 5, hp: 3 }),
        makeUnit({ id: 'player-2', faction: 'player', x: 18, y: 18 }),
      ],
      enemies: [makeUnit({ id: 'enemy-1', faction: 'enemy', x: 6, y: 5 })],
      rng: rngForDice(ENEMY_HIT_3),
    });

    const result = reduce(state, { type: 'EndTurn' });

    expect(result.state.players[0].hp).toBe(0);
    expect(result.state.players[1].hp).toBe(20);
    expect(result.state.status).toBe('playing');
    expect(result.events.map((event) => event.type)).toEqual([
      'TurnEnded',
      'EnemyPhaseStarted',
      'AttackPerformed',
      'UnitDied',
      'PlayerTurnStarted',
    ]);
  });

  it('el enemigo hace 3 al jugador con el mismo resolvedor', () => {
    const state = makeState({
      players: [makeUnit({ id: 'player-1', faction: 'player', x: 5, y: 5 })],
      enemies: [makeUnit({ id: 'enemy-1', faction: 'enemy', x: 6, y: 5 })],
      rng: rngForDice(ENEMY_HIT_3),
    });

    const result = reduce(state, { type: 'EndTurn' });

    expect(result.state.players[0].hp).toBe(17);
    expect(result.state.enemies[0].actionAvailable).toBe(false);
    expect(result.events).toContainEqual({
      type: 'AttackPerformed',
      attackerId: 'enemy-1',
      targetId: 'player-1',
      hit: true,
      damage: 3,
      targetHp: 17,
      rolls: { attack: 6, shield: 1, damage: 3, armor: 3 },
    });
  });

  it('la muerte del jugador ocurre a 0 y emite derrota', () => {
    const state = makeState({
      players: [makeUnit({ id: 'player-1', faction: 'player', x: 5, y: 5, hp: 1 })],
      enemies: [makeUnit({ id: 'enemy-1', faction: 'enemy', x: 6, y: 5 })],
      rng: rngForDice(ENEMY_HIT_3),
    });

    const result = reduce(state, { type: 'EndTurn' });

    expect(result.state.players[0].hp).toBe(0);
    expect(result.state.status).toBe('defeat');
    expect(result.events).toContainEqual({ type: 'UnitDied', unitId: 'player-1' });
    expect(result.events).toContainEqual({ type: 'GameEnded', status: 'defeat' });
  });
});

describe('fórmulas de impacto y daño', () => {
  function countHits(difference: number): number {
    let hits = 0;
    for (let attackDie = 1; attackDie <= 6; attackDie += 1) {
      for (let shieldDie = 1; shieldDie <= 6; shieldDie += 1) {
        if (resolveHit(difference, 0, attackDie, shieldDie)) hits += 1;
      }
    }
    return hits;
  }

  it('las 36 combinaciones dan 15 impactos con diferencia 0 y 21 con +1', () => {
    expect(countHits(0)).toBe(15);
    expect(countHits(1)).toBe(21);
    expect(countHits(-1)).toBe(10);
  });

  it('el empate falla', () => {
    expect(resolveHit(0, 0, 3, 3)).toBe(false);
    expect(resolveHit(1, 0, 3, 3)).toBe(true);
  });

  it('respeta la fórmula de daño y el mínimo 1', () => {
    for (let damageDie = 1; damageDie <= 6; damageDie += 1) {
      for (let armorDie = 1; armorDie <= 6; armorDie += 1) {
        for (const [damageBonus, armor] of [
          [5, 0],
          [5, 1],
          [5, 2],
          [1, 6],
        ] as const) {
          const expected = Math.max(1, damageBonus + damageDie - (armor + armorDie));
          expect(resolveDamage(damageBonus, armor, damageDie, armorDie)).toBe(expected);
        }
      }
    }
  });

  it('la armadura no anula el golpe: siempre hay al menos 1 de daño', () => {
    for (let damageDie = 1; damageDie <= 6; damageDie += 1) {
      for (let armorDie = 1; armorDie <= 6; armorDie += 1) {
        expect(resolveDamage(4, 10, damageDie, armorDie)).toBe(1);
      }
    }
  });

  it('el daño coincide con la tabla esperada de espada contra armadura 0 y 2', () => {
    function stats(armor: number): { min: number; max: number; mean: number } {
      let min = Number.POSITIVE_INFINITY;
      let max = Number.NEGATIVE_INFINITY;
      let sum = 0;
      for (let damageDie = 1; damageDie <= 6; damageDie += 1) {
        for (let armorDie = 1; armorDie <= 6; armorDie += 1) {
          const value = resolveDamage(5, armor, damageDie, armorDie);
          min = Math.min(min, value);
          max = Math.max(max, value);
          sum += value;
        }
      }
      return { min, max, mean: sum / 36 };
    }

    expect(stats(0)).toEqual({ min: 1, max: 10, mean: 5.027777777777778 });
    expect(stats(2)).toEqual({ min: 1, max: 8, mean: 3.2777777777777777 });
  });

  it('la muestra empírica de daño queda a menos de 2 puntos de la teórica', () => {
    const samples = 12_000;
    const damageBonus = 5;
    const armor = 1;

    const theoretical = new Map<number, number>();
    for (let damageDie = 1; damageDie <= 6; damageDie += 1) {
      for (let armorDie = 1; armorDie <= 6; armorDie += 1) {
        const value = Math.max(1, damageBonus + damageDie - (armor + armorDie));
        theoretical.set(value, (theoretical.get(value) ?? 0) + 1);
      }
    }

    const observed = new Map<number, number>();
    let rng: RngState = createRng(4242);
    for (let index = 0; index < samples; index += 1) {
      const damageRoll = rollDie(rng);
      const armorRoll = rollDie(damageRoll.rng);
      rng = armorRoll.rng;
      const value = Math.max(
        1,
        damageBonus + damageRoll.die - (armor + armorRoll.die),
      );
      observed.set(value, (observed.get(value) ?? 0) + 1);
    }

    for (const [value, count] of theoretical) {
      const expectedPercent = (count / 36) * 100;
      const observedPercent = ((observed.get(value) ?? 0) / samples) * 100;
      expect(Math.abs(observedPercent - expectedPercent)).toBeLessThanOrEqual(2);
    }
  });
});

describe('equipo y modificadores', () => {
  it('el catálogo tiene IDs estables y los valores aceptados', () => {
    expect(WEAPONS).toEqual({
      sword: { id: 'sword', name: 'Espada', accuracy: 3, damage: 4 },
      axe: { id: 'axe', name: 'Hacha', accuracy: 2, damage: 6 },
      dagger: { id: 'dagger', name: 'Daga', accuracy: 4, damage: 3 },
    });
    expect(ARMORS).toEqual({
      armor: { id: 'armor', name: 'Armadura', armor: 1 },
    });
    expect(SHIELDS).toEqual({
      shield: { id: 'shield', name: 'Escudo', defense: 1 },
    });
  });

  it('el arma equipada cambia acierto y daño sin tocar la fórmula', () => {
    const base = makeUnit({ id: 'player-1', faction: 'player', x: 5, y: 5 });
    const enemy = makeUnit({ id: 'enemy-1', faction: 'enemy', x: 6, y: 5 });

    function damageWith(weaponId: 'sword' | 'axe' | 'dagger'): number {
      const state = makeState({
        players: [{ ...base, equipment: { ...base.equipment, weaponId } }],
        enemies: [enemy],
        rng: rngForDice([6, 1, 3, 1]),
      });
      const result = resolveAttack(state, 'player-1', 'enemy-1');
      if (!result.ok) throw new Error(result.reason);
      return result.damage;
    }

    expect(damageWith('sword')).toBe(6);
    expect(damageWith('axe')).toBe(8);
    expect(damageWith('dagger')).toBe(5);
  });

  it('la armadura reduce daño y el escudo no', () => {
    const attacker = makeUnit({ id: 'player-1', faction: 'player', x: 5, y: 5 });
    const armoured = makeUnit({ id: 'enemy-1', faction: 'enemy', x: 6, y: 5 });
    const unarmoured = makeUnit({
      id: 'enemy-1',
      faction: 'enemy',
      x: 6,
      y: 5,
      maxHp: 20,
      hp: 20,
      equipment: { weaponId: 'sword', armorId: null, shieldId: null },
    });

    function attack(target: typeof armoured): ReturnType<typeof resolveAttack> {
      const state = makeState({
        players: [attacker],
        enemies: [target],
        rng: rngForDice([6, 1, 3, 1]),
      });
      return resolveAttack(state, 'player-1', 'enemy-1');
    }

    const withArmour = attack(armoured);
    const withoutArmour = attack(unarmoured);
    if (!withArmour.ok || !withoutArmour.ok) throw new Error('ataque rechazado');

    expect(withArmour.damage).toBe(6);
    expect(withoutArmour.damage).toBe(7);
    expect(withArmour.hit).toBe(true);
    expect(withoutArmour.hit).toBe(true);
  });

  it('quitar el escudo sube el impacto recibido sin cambiar el daño', () => {
    const attacker = makeUnit({ id: 'player-1', faction: 'player', x: 5, y: 5 });
    const shielded = makeUnit({ id: 'enemy-1', faction: 'enemy', x: 6, y: 5 });
    const unshielded = makeUnit({
      id: 'enemy-1',
      faction: 'enemy',
      x: 6,
      y: 5,
      maxHp: 20,
      hp: 20,
      equipment: { weaponId: 'sword', armorId: 'armor', shieldId: null },
    });

    function attack(target: typeof shielded): ReturnType<typeof resolveAttack> {
      const state = makeState({
        players: [attacker],
        enemies: [target],
        rng: rngForDice([2, 5]),
      });
      return resolveAttack(state, 'player-1', 'enemy-1');
    }

    const withShield = attack(shielded);
    const withoutShield = attack(unshielded);
    if (!withShield.ok || !withoutShield.ok) throw new Error('ataque rechazado');

    expect(withShield.hit).toBe(false);
    expect(withoutShield.hit).toBe(true);
  });

  it('los modificadores de acierto, daño y defensa cambian el combate', () => {
    const base = makeUnit({ id: 'player-1', faction: 'player', x: 5, y: 5 });
    const enemy = makeUnit({ id: 'enemy-1', faction: 'enemy', x: 6, y: 5 });

    function playerAttack(
      modifiers: { readonly accuracy: number; readonly damage: number; readonly defense: number },
      target: typeof enemy,
      dice: readonly number[],
    ): ReturnType<typeof resolveAttack> {
      const state = makeState({
        players: [{ ...base, modifiers }],
        enemies: [target],
        rng: rngForDice(dice),
      });
      return resolveAttack(state, 'player-1', 'enemy-1');
    }

    const lowAccuracy = playerAttack({ accuracy: 0, damage: 1, defense: 1 }, enemy, [3, 5]);
    const highAccuracy = playerAttack({ accuracy: 1, damage: 1, defense: 1 }, enemy, [3, 5]);
    if (!lowAccuracy.ok || !highAccuracy.ok) throw new Error('ataque rechazado');
    expect(lowAccuracy.hit).toBe(false);
    expect(highAccuracy.hit).toBe(true);

    const lowDamage = playerAttack({ accuracy: 1, damage: 0, defense: 1 }, enemy, [6, 1, 3, 1]);
    const highDamage = playerAttack({ accuracy: 1, damage: 5, defense: 1 }, enemy, [6, 1, 3, 1]);
    if (!lowDamage.ok || !highDamage.ok) throw new Error('ataque rechazado');
    expect(lowDamage.damage).toBe(5);
    expect(highDamage.damage).toBe(10);

    const softTarget = { ...enemy, modifiers: { accuracy: 0, damage: 0, defense: 0 } };
    const toughTarget = { ...enemy, modifiers: { accuracy: 0, damage: 0, defense: 5 } };
    const hitSoft = playerAttack({ accuracy: 1, damage: 1, defense: 1 }, softTarget, [5, 5]);
    const hitTough = playerAttack({ accuracy: 1, damage: 1, defense: 1 }, toughTarget, [5, 5]);
    if (!hitSoft.ok || !hitTough.ok) throw new Error('ataque rechazado');
    expect(hitSoft.hit).toBe(true);
    expect(hitTough.hit).toBe(false);
  });
});

describe('secuencia del RNG', () => {
  it('es puro, serializable y reproducible con la misma semilla', () => {
    const rng = createRng(1017);
    const first = rollDie(rng);
    const second = rollDie(rng);

    expect(rng).toEqual({ seed: 1017, state: 0 });
    expect(JSON.parse(JSON.stringify(first))).toEqual(first);
    expect(second).toEqual(first);

    function sequence(seed: number): number[] {
      let current: RngState = createRng(seed);
      const dice: number[] = [];
      for (let index = 0; index < 12; index += 1) {
        const rolled = rollDie(current);
        dice.push(rolled.die);
        current = rolled.rng;
      }
      return dice;
    }

    expect(sequence(1017)).toEqual(sequence(1017));
    expect(sequence(1017)).not.toEqual(sequence(1018));
  });

  it('un fallo consume dos tiradas y avanza el estado exactamente dos pasos', () => {
    const players = [
      makeUnit({ id: 'player-1', faction: 'player', x: 5, y: 5 }),
      makeUnit({ id: 'player-2', faction: 'player', x: 6, y: 6 }),
    ];
    const state = makeState({
      players,
      enemies: [makeUnit({ id: 'enemy-1', faction: 'enemy', x: 6, y: 5, hp: 100, maxHp: 100 })],
      rng: rngForDice([1, 6, 5, 5, 1, 1]),
    });

    const first = resolveAttack(state, 'player-1', 'enemy-1');
    if (!first.ok) throw new Error(first.reason);
    expect(first.hit).toBe(false);
    expect(first.rolls).toEqual({ attack: 1, shield: 6, damage: null, armor: null });
    expect(first.state.rng).toEqual(advanceRng(state.rng, [1, 6]));

    const second = resolveAttack(first.state, 'player-2', 'enemy-1');
    if (!second.ok) throw new Error(second.reason);
    expect(second.rolls.attack).toBe(5);
    expect(second.rolls.shield).toBe(5);
    expect(second.hit).toBe(true);
  });

  it('un impacto consume cuatro tiradas y avanza el estado exactamente cuatro pasos', () => {
    const players = [
      makeUnit({ id: 'player-1', faction: 'player', x: 5, y: 5 }),
      makeUnit({ id: 'player-2', faction: 'player', x: 6, y: 6 }),
    ];
    const state = makeState({
      players,
      enemies: [makeUnit({ id: 'enemy-1', faction: 'enemy', x: 6, y: 5, hp: 100, maxHp: 100 })],
      rng: rngForDice([6, 1, 2, 1, 5, 5]),
    });

    const first = resolveAttack(state, 'player-1', 'enemy-1');
    if (!first.ok) throw new Error(first.reason);
    expect(first.hit).toBe(true);
    expect(first.rolls).toEqual({ attack: 6, shield: 1, damage: 2, armor: 1 });
    expect(first.state.rng).toEqual(advanceRng(state.rng, [6, 1, 2, 1]));

    const second = resolveAttack(first.state, 'player-2', 'enemy-1');
    if (!second.ok) throw new Error(second.reason);
    expect(second.rolls.attack).toBe(5);
    expect(second.rolls.shield).toBe(5);
  });

  it('un ataque rechazado no consume tiradas', () => {
    const state = makeState({
      players: [makeUnit({ id: 'player-1', faction: 'player', x: 5, y: 5 })],
      enemies: [makeUnit({ id: 'enemy-1', faction: 'enemy', x: 9, y: 9 })],
      rng: rngForDice(PLAYER_HIT_5),
    });
    const before = state.rng;

    const result = resolveAttack(state, 'player-1', 'enemy-1');

    expect(result.ok).toBe(false);
    expect(state.rng).toBe(before);
  });
});
