import { describe, expect, it } from 'vitest';
import {
  ARMORS,
  BESTIARY,
  SHIELDS,
  WEAPONS,
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
const WEAPON_IDS: readonly WeaponId[] = ['sword', 'axe', 'dagger'];

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

function damageWith(attacker: Unit, target: Unit, damageDie: number, armorDie: number): number {
  return resolveDamage(
    attacker.modifiers.damage + weaponFor(attacker.equipment.weaponId).damage,
    armorValue(target.equipment.armorId),
    damageDie,
    armorDie,
  );
}

describe('bestiario', () => {
  it('declara la tabla completa y serializable de los tres tipos', () => {
    expect(Object.keys(BESTIARY).sort()).toEqual([...ENEMY_TYPES].sort());
    for (const type of ENEMY_TYPES) {
      const definition = BESTIARY[type];
      expect(definition.id).toBe(type);
      expect(definition.name.length).toBeGreaterThan(0);
      expect(['brave', 'coward']).toContain(definition.profile);
      expect(definition.vision).toBeGreaterThan(0);
      expect(definition.alarm).toBeGreaterThan(0);
      expect(definition.maxHp).toBeGreaterThan(0);
      expect(definition.maxMp).toBeGreaterThan(0);
      expect(definition.modifiers.accuracy).toBeGreaterThanOrEqual(0);
      expect(definition.modifiers.damage).toBeGreaterThanOrEqual(0);
      expect(definition.modifiers.defense).toBeGreaterThanOrEqual(0);
      expect(enemyDefinition(type)).toBe(definition);
    }

    expect(JSON.parse(JSON.stringify(BESTIARY))).toEqual(BESTIARY);
  });

  it('usa un radio de alarma común y el papel de cada tipo en PV y MP', () => {
    const alarms = Object.values(BESTIARY).map((definition) => definition.alarm);
    expect(new Set(alarms).size).toBe(1);

    // El bruto es el tanque y el cobarde el más frágil (REQ-010).
    expect(BESTIARY.brute.maxHp).toBeGreaterThan(BESTIARY.sentinel.maxHp);
    expect(BESTIARY.sentinel.maxHp).toBeGreaterThan(BESTIARY.coward.maxHp);

    // El cobarde tiene más MP para huir y el bruto menos por su armadura.
    expect(BESTIARY.coward.maxMp).toBeGreaterThan(BESTIARY.sentinel.maxMp);
    expect(BESTIARY.sentinel.maxMp).toBeGreaterThan(BESTIARY.brute.maxMp);
  });

  it('el centinela va sin armadura, conserva escudo y el resto del equipo es el aceptado', () => {
    expect(BESTIARY.sentinel.equipment).toMatchObject({
      weaponId: 'sword',
      armorId: null,
      shieldId: 'shield',
    });
    expect(BESTIARY.brute.equipment).toMatchObject({
      weaponId: 'axe',
      armorId: 'plate',
      shieldId: null,
    });
    expect(BESTIARY.coward.equipment).toMatchObject({
      weaponId: 'dagger',
      armorId: null,
      shieldId: 'shield',
    });

    for (const type of ENEMY_TYPES) {
      const definition = BESTIARY[type];
      const weapon = weaponFor(definition.equipment.weaponId);
      expect(weapon).toBe(WEAPONS[definition.equipment.weaponId]);
      expect(shieldValue(definition.equipment.shieldId)).toBe(
        definition.equipment.shieldId === null
          ? 0
          : SHIELDS[definition.equipment.shieldId].defense,
      );
      expect(armorValue(definition.equipment.armorId)).toBe(
        definition.equipment.armorId === null
          ? 0
          : ARMORS[definition.equipment.armorId].armor,
      );
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

    const baseDamage = damageWith(makeEnemy('sentinel'), makePlayer(), 1, 1);
    expect(attackDamage(makeEnemy('sentinel'))).toBe(baseDamage);
    expect(attackDamage(makeEnemy('sentinel', strongerDefinition))).toBe(baseDamage + 5);
  });
});

describe('ataque enemigo con el resolvedor compartido', () => {
  it('cada tipo ataca con su arma y modificadores del bestiario', () => {
    const dice = rngForDice([6, 1, 1, 1]);

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
        damageWith(enemy, player, 1, 1),
      );
      expect(result.rolls).toEqual({ attack: 6, shield: 1, damage: 1, armor: 1 });
    }
  });

  it('la fase enemiga usa el centinela del bestiario y resolveAttack', () => {
    const state = makeState({
      players: [makePlayer()],
      enemies: [makeEnemy('sentinel')],
      rng: rngForDice([6, 1, 1, 1]),
    });
    const expectedDamage = damageWith(state.enemies[0], state.players[0], 1, 1);

    const result = reduce(state, { type: 'EndTurn' });

    expect(result.state.players[0].hp).toBe(state.players[0].hp - expectedDamage);
    expect(result.events).toContainEqual({
      type: 'AttackPerformed',
      attackerId: 'enemy-1',
      targetId: 'player-1',
      hit: true,
      damage: expectedDamage,
      targetHp: state.players[0].hp - expectedDamage,
      rolls: { attack: 6, shield: 1, damage: 1, armor: 1 },
    });
  });
});

describe('tiempo para matar según el catálogo', () => {
  const SAMPLES = 12_000;

  /**
   * REQ-010 define el TtK como `PV / (impacto × daño medio por impacto)`.
   * La referencia se calcula desde el catálogo y las fórmulas, sin fijar
   * números de balance en el test.
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

  function expectedTtk(weaponId: WeaponId, type: EnemyType): number {
    const definition = BESTIARY[type];
    const player = makePlayer(weaponId);
    const enemy = makeEnemy(type);
    const attackBonus = player.modifiers.accuracy + WEAPONS[weaponId].accuracy;
    const defense = enemy.modifiers.defense + shieldValue(enemy.equipment.shieldId);
    const damageBonus = player.modifiers.damage + WEAPONS[weaponId].damage;
    const armor = armorValue(enemy.equipment.armorId);
    let hits = 0;
    let damageSum = 0;

    for (let attackDie = 1; attackDie <= 6; attackDie += 1) {
      for (let shieldDie = 1; shieldDie <= 6; shieldDie += 1) {
        if (!resolveHit(attackBonus, defense, attackDie, shieldDie)) continue;
        hits += 1;
        for (let damageDie = 1; damageDie <= 6; damageDie += 1) {
          for (let armorDie = 1; armorDie <= 6; armorDie += 1) {
            damageSum += resolveDamage(damageBonus, armor, damageDie, armorDie);
          }
        }
      }
    }

    const hitRate = hits / 36;
    const meanDamage = damageSum / (hits * 36);
    return definition.maxHp / (hitRate * meanDamage);
  }

  it('los nueve cruces siguen el TtK calculado desde el catálogo', () => {
    for (const type of ENEMY_TYPES) {
      for (const weaponId of WEAPON_IDS) {
        const measured = measureTtk(weaponId, type);
        expect(
          Math.abs(measured - expectedTtk(weaponId, type)),
          `${type}/${weaponId}`,
        ).toBeLessThanOrEqual(0.3);
      }
    }
  });
});
