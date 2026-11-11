/**
 * Resolvedor puro de la v2.0.
 *
 * Fórmulas de REQ-010 y REQ-025: impacto con `>` (el empate falla), daño con
 * mínimo 1 y absorción = resistencia + armadura. El orden de tiradas es ataque,
 * escudo; si impacta, daño y armadura.
 */

import { armorValue, shieldValue, weaponFor } from './catalog';
import type {
  AttackRolls,
  Catalog,
  Rng,
  SpellDefinition,
  Unit,
} from './types';

export interface AttackResolution {
  readonly hit: boolean;
  readonly damage: number;
  readonly rolls: AttackRolls;
}

/** Impacto físico: `bonus de ataque + 1d6 > bonus de defensa + 1d6`. */
export function physicalHit(
  attackBonus: number,
  defenseBonus: number,
  attackDie: number,
  shieldDie: number,
): boolean {
  return attackBonus + attackDie > defenseBonus + shieldDie;
}

/** Daño físico: `max(1, daño + 1d6 − (absorción + 1d6))`. */
export function physicalDamage(
  damageBonus: number,
  absorption: number,
  damageDie: number,
  armorDie: number,
): number {
  return Math.max(1, damageBonus + damageDie - (absorption + armorDie));
}

/** Impacto mágico: nivel de magia + acierto del hechizo contra defensa + escudo. */
export function magicHit(
  magicLevel: number,
  spellAccuracy: number,
  defenseBonus: number,
  attackDie: number,
  shieldDie: number,
): boolean {
  return physicalHit(
    magicLevel + spellAccuracy,
    defenseBonus,
    attackDie,
    shieldDie,
  );
}

/** Daño mágico: poder del hechizo contra resistencia + armadura; el nivel no suma. */
export function magicDamage(
  spellPower: number,
  absorption: number,
  damageDie: number,
  armorDie: number,
): number {
  return physicalDamage(spellPower, absorption, damageDie, armorDie);
}

export function physicalAttackBonus(unit: Unit, catalog: Catalog): number {
  const weapon = weaponFor(catalog, unit.weaponId);
  return unit.stats.habilidad + (weapon?.accuracy ?? 0);
}

export function physicalDamageBonus(unit: Unit, catalog: Catalog): number {
  const weapon = weaponFor(catalog, unit.weaponId);
  return unit.stats.fuerza + (weapon?.damage ?? 0);
}

export function defenseBonus(unit: Unit, catalog: Catalog): number {
  return unit.stats.defensa + shieldValue(catalog, unit.shieldId);
}

export function absorption(unit: Unit, catalog: Catalog): number {
  return unit.stats.resistencia + armorValue(catalog, unit.armorId);
}

export function magicAttackBonus(unit: Unit, spell: SpellDefinition): number {
  return unit.magicLevel + spell.accuracy;
}

export function resolvePhysicalAttack(
  attacker: Unit,
  defender: Unit,
  rng: Rng,
  catalog: Catalog,
): AttackResolution {
  const weapon = weaponFor(catalog, attacker.weaponId);
  if (!weapon) throw new Error(`Ataque sin arma: ${attacker.id}`);

  const attackDie = rng.die();
  const shieldDie = rng.die();
  const hit = physicalHit(
    attacker.stats.habilidad + weapon.accuracy,
    defender.stats.defensa + shieldValue(catalog, defender.shieldId),
    attackDie,
    shieldDie,
  );

  if (!hit) {
    return {
      hit: false,
      damage: 0,
      rolls: { attack: attackDie, shield: shieldDie, damage: null, armor: null },
    };
  }

  const damageDie = rng.die();
  const armorDie = rng.die();
  const damage = physicalDamage(
    attacker.stats.fuerza + weapon.damage,
    defender.stats.resistencia + armorValue(catalog, defender.armorId),
    damageDie,
    armorDie,
  );

  return {
    hit: true,
    damage,
    rolls: {
      attack: attackDie,
      shield: shieldDie,
      damage: damageDie,
      armor: armorDie,
    },
  };
}

export function resolveMagicAttack(
  caster: Unit,
  target: Unit,
  spell: SpellDefinition,
  rng: Rng,
  catalog: Catalog,
): AttackResolution {
  const attackDie = rng.die();
  const shieldDie = rng.die();
  const hit = magicHit(
    caster.magicLevel,
    spell.accuracy,
    target.stats.defensa + shieldValue(catalog, target.shieldId),
    attackDie,
    shieldDie,
  );

  if (!hit) {
    return {
      hit: false,
      damage: 0,
      rolls: { attack: attackDie, shield: shieldDie, damage: null, armor: null },
    };
  }

  const damageDie = rng.die();
  const armorDie = rng.die();
  const damage = magicDamage(
    spell.power,
    target.stats.resistencia + armorValue(catalog, target.armorId),
    damageDie,
    armorDie,
  );

  return {
    hit: true,
    damage,
    rolls: {
      attack: attackDie,
      shield: shieldDie,
      damage: damageDie,
      armor: armorDie,
    },
  };
}
