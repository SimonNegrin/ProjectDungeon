/**
 * Único punto de agregación de stats efectivos (REQ-018 T-004, REQ-019 T-005).
 *
 * Suma los atributos inherentes, los modificadores de los objetos equipados y
 * los traits, aplica los suelos y topes y expone los traits activos con su
 * fuente. Combate, hechizos, movimiento, HUD y snapshot leen este perfil; nadie
 * más suma valores del equipo por su cuenta.
 */

import {
  EQUIPMENT_SLOTS,
  ITEMS,
  TRAITS,
  type EquipmentSlot,
  type ItemDefinition,
  type ItemId,
  type TraitAreaParameters,
  type TraitAttribute,
  type TraitDefinition,
  type TraitLifestealParameters,
  type TraitModifierParameters,
  type TraitSource,
} from './equipment';
import type {
  DamagePacket,
  EquipmentSlots,
  GameEvent,
  ResistanceBand,
  ResistanceProfile,
  Unit,
  UnitStats,
} from './types';

/** Trait activo con su origen y parámetros; serializable. */
export interface ActiveTrait {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly type: TraitDefinition['type'];
  readonly source: TraitSource;
  readonly stackingKey: string;
  readonly parameters: TraitDefinition['parameters'];
  readonly itemId: ItemId;
  readonly slot: EquipmentSlot;
}

/** Totales de los nueve atributos antes de aplicar suelos y topes. */
export type TraitModifierTotals = Readonly<Record<TraitAttribute, number>>;

/** Perfil derivado que consumen combate, hechizos, movimiento y presentación. */
export interface EffectiveProfile {
  /** Atributos inherentes más modificadores de los objetos y traits. */
  readonly stats: UnitStats;
  /** Atributos inherentes sin equipo; base del desglose. */
  readonly baseStats: UnitStats;
  /** PV máximos con traits, nunca por debajo de 1. */
  readonly maxHp: number;
  /** MP máximos con traits, nunca por debajo de 0. */
  readonly maxMp: number;
  /** Acciones por turno con traits, entre 1 y 4. */
  readonly actionsMax: number;
  /** Total por atributo, sin recortar; útil para el desglose. */
  readonly modifiers: TraitModifierTotals;
  /** Traits activos en orden de hueco; los especiales repetidos cuentan una vez. */
  readonly traits: readonly ActiveTrait[];
  /** Acierto del arma equipada; 0 sin arma. */
  readonly accuracy: number;
  /** Evasión del escudo equipado; 0 sin escudo. */
  readonly evasion: number;
  /** Absorción de la armadura corporal; 0 sin armadura. */
  readonly absorption: number;
  /** Acciones extra aportadas por modificadores (equipo y traits). */
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

const ATTRIBUTE_KEYS: readonly TraitAttribute[] = [
  'habilidad',
  'fuerza',
  'defensa',
  'resistencia',
  'punteria',
  'magia',
  'pvMax',
  'mpMax',
  'acciones',
];

const BAND_ORDER: readonly ResistanceBand[] = [
  'vulnerable',
  'normal',
  'resistant',
  'very-resistant',
];

/** Instancia de trait con el hueco que la aporta. */
interface SourcedTrait {
  readonly definition: TraitDefinition;
  readonly itemId: ItemId;
  readonly slot: EquipmentSlot;
}

export interface ResourceBases {
  readonly maxHp?: number;
  readonly maxMp?: number;
}

function emptyTotals(): Record<TraitAttribute, number> {
  return {
    habilidad: 0,
    fuerza: 0,
    defensa: 0,
    resistencia: 0,
    punteria: 0,
    magia: 0,
    pvMax: 0,
    mpMax: 0,
    acciones: 0,
  };
}

function itemsBySlot(items: readonly ItemDefinition[]): readonly SourcedTrait[] {
  const traits: SourcedTrait[] = [];
  for (const slot of EQUIPMENT_SLOTS) {
    for (const item of items.filter((candidate) => candidate.slot === slot)) {
      for (const trait of item.traits) {
        const definition = TRAITS[trait.id];
        if (definition !== undefined) {
          traits.push({ definition, itemId: item.id, slot });
        }
      }
    }
  }
  return traits;
}

/**
 * Magnitud de un especial para el stacking único. Un área mayor gana; a igual
 * radio gana el coste menor. El robo mayor gana; a igual porcentaje, el mínimo
 * mayor. La comparación no depende del orden de iteración.
 */
function specialMagnitude(trait: TraitDefinition): readonly number[] {
  const parameters = trait.parameters;
  if (parameters.kind === 'area') {
    return [parameters.radius, -parameters.actionCost];
  }
  if (parameters.kind === 'lifesteal') {
    return [parameters.percent, parameters.minimum];
  }
  return [0];
}

function isBetterSpecial(candidate: TraitDefinition, current: TraitDefinition): boolean {
  const a = specialMagnitude(candidate);
  const b = specialMagnitude(current);
  for (let index = 0; index < Math.max(a.length, b.length); index += 1) {
    const left = a[index] ?? 0;
    const right = b[index] ?? 0;
    if (left !== right) return left > right;
  }
  return false;
}

/**
 * Recoge traits activos en orden de hueco. Los modificadores se conservan
 * todos; los especiales de la misma clave se reducen al mayor.
 */
export function activeTraits(items: readonly ItemDefinition[]): readonly ActiveTrait[] {
  const sourced = itemsBySlot(items);
  const winners = new Map<string, SourcedTrait>();

  for (const entry of sourced) {
    if (entry.definition.stacking === 'sum') continue;
    const key = entry.definition.stackingKey;
    const current = winners.get(key);
    if (current === undefined || isBetterSpecial(entry.definition, current.definition)) {
      winners.set(key, entry);
    }
  }

  const active: ActiveTrait[] = [];
  for (const entry of sourced) {
    if (
      entry.definition.stacking === 'sum' ||
      winners.get(entry.definition.stackingKey) === entry
    ) {
      active.push(activeTrait(entry));
    }
  }
  return active;
}

function activeTrait(entry: SourcedTrait): ActiveTrait {
  return {
    id: entry.definition.id,
    name: entry.definition.name,
    description: entry.definition.description,
    type: entry.definition.type,
    source: entry.definition.source,
    stackingKey: entry.definition.stackingKey,
    parameters: entry.definition.parameters,
    itemId: entry.itemId,
    slot: entry.slot,
  };
}

/** Totales por atributo: modificadores de objeto + traits de tipo modificador. */
export function modifierTotals(items: readonly ItemDefinition[]): TraitModifierTotals {
  const totals = emptyTotals();
  for (const item of items) {
    for (const [attribute, value] of Object.entries(item.modifiers)) {
      if (attribute in totals && typeof value === 'number' && Number.isFinite(value)) {
        totals[attribute as TraitAttribute] += value;
      }
    }
    for (const trait of item.traits) {
      const definition = TRAITS[trait.id];
      if (definition?.parameters.kind !== 'modifier') continue;
      totals[definition.parameters.attribute] += definition.parameters.amount;
    }
  }
  return totals;
}

/** Desplaza todas las bandas de resistencia en `steps` niveles, con tope. */
export function shiftResistance(
  profile: ResistanceProfile,
  steps: number,
): ResistanceProfile {
  if (steps === 0) return profile;
  const types = ['slash', 'blunt', 'pierce', 'magic', 'electric'] as const;
  const shifted: Partial<Record<(typeof types)[number], ResistanceBand>> = {};
  for (const type of types) {
    const index = BAND_ORDER.indexOf(profile[type] ?? 'normal');
    const next = Math.max(0, Math.min(BAND_ORDER.length - 1, index + steps));
    shifted[type] = BAND_ORDER[next];
  }
  return shifted;
}

function clampMagicLevel(value: number): UnitStats['magicLevel'] {
  return Math.max(0, Math.min(4, value)) as UnitStats['magicLevel'];
}

/** Calcula los PV/MP inherentes a partir del estado actual y el equipo puesto. */
export function inherentResources(
  unit: Pick<Unit, 'maxHp' | 'maxMp' | 'equipment'> & Partial<Pick<Unit, 'baseMaxHp' | 'baseMaxMp'>>,
  catalog: Readonly<Record<string, ItemDefinition>> = ITEMS,
): { readonly maxHp: number; readonly maxMp: number } {
  const totals = modifierTotals(equippedDefinitions(unit, catalog));
  return {
    maxHp: unit.baseMaxHp ?? unit.maxHp - totals.pvMax,
    maxMp: unit.baseMaxMp ?? unit.maxMp - totals.mpMax,
  };
}

/**
 * Agrega stats inherentes y definiciones de objetos. Es pura y acepta
 * definiciones sintéticas para probar modificadores sin tocar el catálogo.
 * Los suelos y topes se aplican una sola vez, después de sumar.
 */
export function aggregateEffectiveStats(
  stats: UnitStats,
  items: readonly ItemDefinition[],
  bases: ResourceBases = {},
): EffectiveProfile {
  const weapon = items.find((item) => item.category === 'weapon') ?? null;
  const shield = items.find((item) => item.category === 'shield') ?? null;
  const armor = items.find((item) => item.category === 'armor') ?? null;
  const totals = modifierTotals(items);

  const baseMaxHp = bases.maxHp ?? 1;
  const baseMaxMp = bases.maxMp ?? 0;
  const effectiveStats: UnitStats = {
    ...stats,
    habilidad: stats.habilidad + totals.habilidad,
    fuerza: stats.fuerza + totals.fuerza,
    defensa: stats.defensa + totals.defensa,
    punteria: stats.punteria + totals.punteria,
    magicLevel: clampMagicLevel(stats.magicLevel + totals.magia),
    acciones: Math.min(4, Math.max(1, stats.acciones + totals.acciones)),
    resistencia: shiftResistance(stats.resistencia, totals.resistencia),
  };

  return {
    stats: effectiveStats,
    baseStats: stats,
    maxHp: Math.max(1, baseMaxHp + totals.pvMax),
    maxMp: Math.max(0, baseMaxMp + totals.mpMax),
    actionsMax: effectiveStats.acciones,
    modifiers: totals,
    traits: activeTraits(items),
    accuracy: weapon?.accuracy ?? 0,
    evasion: shield?.evasion ?? 0,
    absorption: armor?.absorption ?? 0,
    actionsBonus: totals.acciones,
    weapon,
    shield,
    armor,
    damagePackets: weapon?.damagePackets ?? [],
  };
}

/** Definiciones de los objetos equipados, en orden de hueco estable. */
export function equippedDefinitions(
  unit: Pick<Unit, 'equipment'>,
  catalog: Readonly<Record<string, ItemDefinition>> = ITEMS,
): readonly ItemDefinition[] {
  const result: ItemDefinition[] = [];
  for (const slot of EQUIPMENT_SLOTS) {
    const instance = unit.equipment[slot];
    const definition = instance === null ? undefined : catalog[instance.itemId];
    if (definition !== undefined) result.push(definition);
  }
  return result;
}

/** Perfil efectivo de una unidad: inherente + objetos + traits. */
export function effectiveStats(
  unit: Pick<Unit, 'stats' | 'equipment'> &
    Partial<Pick<Unit, 'maxHp' | 'maxMp' | 'baseMaxHp' | 'baseMaxMp'>>,
  catalog: Readonly<Record<string, ItemDefinition>> = ITEMS,
): EffectiveProfile {
  const bases = inherentResources(
    {
      maxHp: unit.maxHp ?? 1,
      maxMp: unit.maxMp ?? 0,
      equipment: unit.equipment,
      ...(unit.baseMaxHp === undefined ? {} : { baseMaxHp: unit.baseMaxHp }),
      ...(unit.baseMaxMp === undefined ? {} : { baseMaxMp: unit.baseMaxMp }),
    },
    catalog,
  );
  return aggregateEffectiveStats(
    unit.stats,
    equippedDefinitions(unit, catalog),
    bases,
  );
}

/**
 * Recalcula los recursos dependientes del equipo sin acumular entre llamadas:
 * PV/MP máximos, recursos actuales acotados y acciones máximas. Los campos
 * `baseMaxHp`/`baseMaxMp` conservan la base inherente.
 */
export function synchronizeUnitResources(
  unit: Unit,
  catalog: Readonly<Record<string, ItemDefinition>> = ITEMS,
): Unit {
  const profile = effectiveStats(unit, catalog);
  return {
    ...unit,
    maxHp: profile.maxHp,
    hp: Math.min(unit.hp, profile.maxHp),
    maxMp: profile.maxMp,
    mp: Math.min(unit.mp, profile.maxMp),
    actions: {
      max: profile.actionsMax,
      remaining: Math.min(unit.actions.remaining, profile.actionsMax),
    },
  };
}

/**
 * Aplica un equipo nuevo y recalcula los recursos. Guarda la base inherente la
 * primera vez para que equipar y desequipar no acumulen PV/MP.
 */
export function withEquipment(
  unit: Unit,
  equipment: EquipmentSlots,
  catalog: Readonly<Record<string, ItemDefinition>> = ITEMS,
): Unit {
  const bases = inherentResources(unit, catalog);
  return synchronizeUnitResources(
    {
      ...unit,
      equipment,
      baseMaxHp: bases.maxHp,
      baseMaxMp: bases.maxMp,
    },
    catalog,
  );
}

/** Busca el especial de área activo, si lo hay. */
export function activeAreaTrait(profile: EffectiveProfile): ActiveTrait | null {
  return (
    profile.traits.find(
      (trait): trait is ActiveTrait & { parameters: TraitAreaParameters } =>
        trait.parameters.kind === 'area',
    ) ?? null
  );
}

/** Busca el robo de vida activo, si lo hay. */
export function activeLifestealTrait(profile: EffectiveProfile): ActiveTrait | null {
  return (
    profile.traits.find(
      (trait): trait is ActiveTrait & { parameters: TraitLifestealParameters } =>
        trait.parameters.kind === 'lifesteal',
    ) ?? null
  );
}

/** Modificador de un trait concreto, útil en pruebas y en el desglose. */
export function modifierParameter(
  trait: ActiveTrait,
): TraitModifierParameters | null {
  return trait.parameters.kind === 'modifier' ? trait.parameters : null;
}

/**
 * Eventos de equipar/desequipar de traits. Compara los huecos antes y después
 * para cubrir cambios, desplazamientos y el escudo que manda a la mochila un
 * arma a dos manos, sin una segunda ruta de inventario.
 */
export function traitEquipmentEvents(
  before: Pick<Unit, 'id' | 'equipment'>,
  after: Pick<Unit, 'id' | 'equipment'>,
): readonly GameEvent[] {
  const events: GameEvent[] = [];
  for (const slot of EQUIPMENT_SLOTS) {
    const previous = before.equipment[slot];
    const next = after.equipment[slot];
    if (previous?.id === next?.id) continue;

    if (previous) {
      const definition = ITEMS[previous.itemId];
      for (const trait of definition.traits) {
        const catalog = TRAITS[trait.id];
        if (catalog?.triggers.includes('unequip') === true) {
          events.push({
            type: 'TraitUnequipped',
            unitId: after.id,
            traitId: catalog.id,
            source: catalog.source,
            slot,
            itemId: definition.id,
          });
        }
      }
    }

    if (next) {
      const definition = ITEMS[next.itemId];
      for (const trait of definition.traits) {
        const catalog = TRAITS[trait.id];
        if (catalog?.triggers.includes('equip') === true) {
          events.push({
            type: 'TraitEquipped',
            unitId: after.id,
            traitId: catalog.id,
            source: catalog.source,
            slot,
            itemId: definition.id,
          });
        }
      }
    }
  }
  return events;
}

export { ATTRIBUTE_KEYS };
