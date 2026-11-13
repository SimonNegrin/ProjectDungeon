/**
 * Único punto de agregación de stats efectivos (REQ-018 T-004).
 *
 * Suma los atributos inherentes (`UnitStats`), los modificadores de los objetos
 * equipados y los traits (vacíos en este corte). Combate, hechizos, IA y HUD
 * leen este perfil; nadie más suma valores del equipo por su cuenta.
 */

import { ITEMS, type ItemAttribute, type ItemDefinition } from './equipment';
import type { DamagePacket, Unit, UnitStats } from './types';

/** Perfil derivado que consumen combate, hechizos y presentación. */
export interface EffectiveProfile {
  /** Atributos inherentes más modificadores de los objetos equipados. */
  readonly stats: UnitStats;
  /** Acierto del arma equipada; 0 sin arma. */
  readonly accuracy: number;
  /** Evasión del escudo equipado; 0 sin escudo. */
  readonly evasion: number;
  /** Absorción de la armadura corporal; 0 sin armadura. */
  readonly absorption: number;
  /** Acciones extra de los modificadores del equipo, sin recortar. */
  readonly actionsBonus: number;
  /** Arma equipada, o `null`. */
  readonly weapon: ItemDefinition | null;
  /** Escudo equipado, o `null`. */
  readonly shield: ItemDefinition | null;
  /** Armadura corporal equipada, o `null`. */
  readonly armor: ItemDefinition | null;
  /** Paquetes del arma equipada; vacío sin arma. */
  readonly damagePackets: readonly DamagePacket[];
}

function attributeBonus(
  items: readonly ItemDefinition[],
  attribute: ItemAttribute,
): number {
  let total = 0;
  for (const item of items) {
    total += item.modifiers[attribute] ?? 0;
  }
  return total;
}

/**
 * Agrega stats inherentes y definiciones de objetos. Es pura y acepta
 * definiciones sintéticas para probar modificadores sin tocar el catálogo.
 */
export function aggregateEffectiveStats(
  stats: UnitStats,
  items: readonly ItemDefinition[],
): EffectiveProfile {
  const weapon = items.find((item) => item.category === 'weapon') ?? null;
  const shield = items.find((item) => item.category === 'shield') ?? null;
  const armor = items.find((item) => item.category === 'armor') ?? null;

  return {
    stats: {
      ...stats,
      habilidad: stats.habilidad + attributeBonus(items, 'habilidad'),
      fuerza: stats.fuerza + attributeBonus(items, 'fuerza'),
      defensa: stats.defensa + attributeBonus(items, 'defensa'),
      punteria: stats.punteria + attributeBonus(items, 'punteria'),
      acciones: stats.acciones + attributeBonus(items, 'acciones'),
    },
    accuracy: weapon?.accuracy ?? 0,
    evasion: shield?.evasion ?? 0,
    absorption: armor?.absorption ?? 0,
    actionsBonus: attributeBonus(items, 'acciones'),
    weapon,
    shield,
    armor,
    damagePackets: weapon?.damagePackets ?? [],
  };
}

/** Definiciones de los objetos equipados, en orden de hueco estable. */
export function equippedDefinitions(
  unit: Pick<Unit, 'equipment'>,
): readonly ItemDefinition[] {
  return Object.values(unit.equipment)
    .filter((instance) => instance !== null)
    .map((instance) => ITEMS[instance.itemId]);
}

/** Perfil efectivo de una unidad: inherentes + objetos + traits vacíos. */
export function effectiveStats(unit: Pick<Unit, 'stats' | 'equipment'>): EffectiveProfile {
  return aggregateEffectiveStats(unit.stats, equippedDefinitions(unit));
}
