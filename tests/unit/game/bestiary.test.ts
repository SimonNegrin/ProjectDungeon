import { describe, expect, it } from 'vitest';
import {
  BESTIARY,
  armorValue,
  createRng,
  enemyDefinition,
  reduce,
  resolveAttack,
  resolveDamage,
  resolveHit,
  shieldValue,
  weaponFor,
  type EnemyType,
  type Unit,
  type WeaponId,
} from '../../../src/game/index';
import { makeState, makeUnit, rngForDice } from './helpers';

const ENEMY_TYPES: readonly EnemyType[] = ['sentinel', 'brute', 'coward'];
const WEAPONS: readonly WeaponId[] = ['sword', 'axe', 'dagger'];

function makeEnemy(
  type: EnemyType,
  definition = BESTIARY[type],
  position: { readonly x: number; readonly y: number } = { x: 6, y: 5 },
): Unit {
  return makeUnit({
    id: 'enemy-1',
    faction: 'enemy',
    enemyType: type,
    x: position.x,
    y: position.y,
    hp: definition.maxHp,
    maxHp: definition.maxHp,
    modifiers: definition.modifiers,
    equipment: definition.equipment,
    weapons: [definition.equipment.weaponId],
  });
}

function makePlayer(weaponId: WeaponId = 'sword'): Unit {
  return makeUnit({
    id: 'player-1',
    faction: 'player',
    x: 5,
    y: 5,
    equipment: { weaponId, armorId: 'armor', shieldId: 'shield' },
  });
}

describe('bestiario', () => {
  it('contiene la tabla A completa y serializable de los tres tipos', () => {
    expect(BESTIARY).toEqual({
      sentinel: {
        id: 'sentinel',
        name: 'Centinela',
        profile: 'brave',
        vision: 6,
        alarm: 8,
        maxHp: 9,
        modifiers: { accuracy: 0, damage: 0, defense: 0 },
        equipment: { weaponId: 'sword', armorId: 'armor', shieldId: 'shield' },
      },
      brute: {
        id: 'brute',
        name: 'Bruto',
        profile: 'brave',
        vision: 4,
        alarm: 8,
        maxHp: 12,
        modifiers: { accuracy: 0, damage: 1, defense: 0 },
        equipment: { weaponId: 'axe', armorId: 'plate', shieldId: null },
      },
      coward: {
        id: 'coward',
        name: 'Cobarde',
        profile: 'coward',
        vision: 5,
        alarm: 8,
        maxHp: 8,
        modifiers: { accuracy: 1, damage: 0, defense: 1 },
        equipment: { weaponId: 'dagger', armorId: null, shieldId: 'shield' },
      },
    });

    expect(JSON.parse(JSON.stringify(BESTIARY))).toEqual(BESTIARY);
    for (const type of ENEMY_TYPES) {
      expect(enemyDefinition(type)).toBe(BESTIARY[type]);
    }
  });

  it('el equipo del catálogo resuelve al arma, escudo y armadura aceptados', () => {
    const expected = {
      sentinel: { accuracy: 3, damage: 4, shield: 1, armor: 1, hp: 9 },
      brute: { accuracy: 2, damage: 6, shield: 0, armor: 2, hp: 12 },
      coward: { accuracy: 4, damage: 3, shield: 1, armor: 0, hp: 8 },
    } as const;

    for (const type of ENEMY_TYPES) {
      const definition = BESTIARY[type];
      const weapon = weaponFor(definition.equipment.weaponId);
      const values = expected[type];

      expect(definition.maxHp).toBe(values.hp);
      expect([weapon.accuracy, weapon.damage]).toEqual([values.accuracy, values.damage]);
      expect(shieldValue(definition.equipment.shieldId)).toBe(values.shield);
      expect(armorValue(definition.equipment.armorId)).toBe(values.armor);
    }
  });

  it('cambiar un valor del catálogo cambia el combate sin tocar fórmulas', () => {
    const baseDefinition = BESTIARY.sentinel;
    const strongerDefinition = {
      ...baseDefinition,
      modifiers: { ...baseDefinition.modifiers, damage: 5 },
    };
    const dice = rngForDice([6, 1, 1, 1]);

    function attackDamage(enemy: Unit): number {
      const state = makeState({
        players: [makePlayer()],
        enemies: [enemy],
        rng: dice,
      });
      const result = resolveAttack(state, 'enemy-1', 'player-1');
      if (!result.ok) throw new Error(result.reason);
      return result.damage;
    }

    expect(attackDamage(makeEnemy('sentinel'))).toBe(3);
    expect(attackDamage(makeEnemy('sentinel', strongerDefinition))).toBe(8);
  });
});

describe('ataque enemigo con el resolvedor compartido', () => {
  it('cada tipo ataca con su arma y modificadores del bestiario', () => {
    const dice = rngForDice([6, 1, 1, 1]);
    const expectedDamage: Record<EnemyType, number> = {
      sentinel: 3,
      brute: 6,
      coward: 2,
    };

    for (const type of ENEMY_TYPES) {
      const definition = BESTIARY[type];
      const weapon = weaponFor(definition.equipment.weaponId);
      const enemy = makeEnemy(type);
      const player = makePlayer();
      const state = makeState({ players: [player], enemies: [enemy], rng: dice });

      const result = resolveAttack(state, enemy.id, player.id);
      if (!result.ok) throw new Error(result.reason);

      expect(result.hit).toBe(
        resolveHit(
          definition.modifiers.accuracy + weapon.accuracy,
          player.modifiers.defense + shieldValue(player.equipment.shieldId),
          6,
          1,
        ),
      );
      expect(result.damage).toBe(
        resolveDamage(
          definition.modifiers.damage + weapon.damage,
          armorValue(player.equipment.armorId),
          1,
          1,
        ),
      );
      expect(result.damage).toBe(expectedDamage[type]);
      expect(result.rolls).toEqual({ attack: 6, shield: 1, damage: 1, armor: 1 });
    }
  });

  it('la fase enemiga usa el centinela del bestiario y resolveAttack', () => {
    const state = makeState({
      players: [makePlayer()],
      enemies: [makeEnemy('sentinel')],
      rng: rngForDice([6, 1, 1, 1]),
    });

    const result = reduce(state, { type: 'EndTurn' });

    expect(result.state.players[0].hp).toBe(17);
    expect(result.events).toContainEqual({
      type: 'AttackPerformed',
      attackerId: 'enemy-1',
      targetId: 'player-1',
      hit: true,
      damage: 3,
      targetHp: 17,
      rolls: { attack: 6, shield: 1, damage: 1, armor: 1 },
    });
  });
});

describe('tiempo para matar de la tabla A', () => {
  const SAMPLES = 12_000;

  /**
   * REQ-010 define el TtK como `PV / (impacto × daño medio por impacto)`.
   * Se estiman el impacto y el daño medio con `resolveAttack` sobre un RNG
   * sembrado, con suficientes repeticiones para que la media sea estable.
   */
  function measureTtk(weaponId: WeaponId, type: EnemyType): number {
    const definition = BESTIARY[type];
    const player = makePlayer(weaponId);
    const enemy = makeEnemy(type);
    let rng = createRng(1017);
    let hits = 0;
    let damageSum = 0;

    for (let sample = 0; sample < SAMPLES; sample += 1) {
      const state = makeState({ players: [player], enemies: [enemy], rng });
      const result = resolveAttack(state, player.id, enemy.id);
      if (!result.ok) throw new Error(result.reason);
      if (result.hit) {
        hits += 1;
        damageSum += result.damage;
      }
      rng = result.state.rng;
    }

    const hitRate = hits / SAMPLES;
    const meanDamage = damageSum / hits;
    return definition.maxHp / (hitRate * meanDamage);
  }

  const expected: Record<EnemyType, Record<WeaponId, number>> = {
    sentinel: { sword: 2.6, axe: 2.1, dagger: 3.0 },
    brute: { sword: 4.0, axe: 2.9, dagger: 4.8 },
    coward: { sword: 2.2, axe: 2.0, dagger: 2.3 },
  };

  it('los nueve cruces quedan dentro de ±0,3 ataques del requisito', () => {
    for (const type of ENEMY_TYPES) {
      for (const weaponId of WEAPONS) {
        const measured = measureTtk(weaponId, type);
        expect(Math.abs(measured - expected[type][weaponId])).toBeLessThanOrEqual(0.3);
      }
    }
  });
});
