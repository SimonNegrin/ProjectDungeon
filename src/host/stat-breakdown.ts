/**
 * Desglose de stats del portador (REQ-019 R-006/T-012): inherente, equipo y
 * traits por atributo, con el total que publica `effectiveStats`. La suma de
 * fuentes es solo presentación: el total nunca se recalcula aquí, se copia del
 * perfil del motor para que HUD, F1 y combate lean el mismo valor.
 */

import { TRAITS, type TraitAttribute } from '../game/equipment';
import { effectiveStats, equippedDefinitions } from '../game/stats';
import type { Unit } from '../game/types';
import { formatProfile } from './damage-labels';

export type BreakdownStatId =
  | 'habilidad'
  | 'fuerza'
  | 'defensa'
  | 'resistencia'
  | 'punteria'
  | 'magia'
  | 'pvMax'
  | 'mpMax'
  | 'acciones';

export interface StatBreakdownRow {
  readonly id: BreakdownStatId;
  readonly label: string;
  /** Valor inherente del personaje, sin equipo. */
  readonly inherent: string;
  /** Aporte de los modificadores de los objetos equipados. */
  readonly equipment: string;
  /** Aporte de los traits de los objetos equipados. */
  readonly traits: string;
  /** Total efectivo, copiado de `effectiveStats`. */
  readonly total: string;
  /** Nota cuando un suelo o tope recorta el total. */
  readonly note?: string;
}

const LABELS: Readonly<Record<BreakdownStatId, string>> = {
  habilidad: 'Habilidad',
  fuerza: 'Fuerza',
  defensa: 'Defensa',
  resistencia: 'Resistencia',
  punteria: 'Puntería',
  magia: 'Magia',
  pvMax: 'PV máximos',
  mpMax: 'MP máximos',
  acciones: 'Acciones',
};

const NUMERIC_ATTRIBUTES: readonly TraitAttribute[] = [
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

function signed(value: number): string {
  return value >= 0 ? `+${value}` : `${value}`;
}

function total(value: number): string {
  return String(value);
}

function attributeRow(
  id: BreakdownStatId,
  inherent: string,
  equipment: string,
  traits: string,
  totalValue: string,
  note?: string,
): StatBreakdownRow {
  return {
    id,
    label: LABELS[id],
    inherent,
    equipment,
    traits,
    total: totalValue,
    ...(note === undefined ? {} : { note }),
  };
}

/**
 * Recorre objetos y catálogo para separar el aporte del equipo del de traits.
 * Los modificadores de objeto viven en `modifiers`; los traits de tipo
 * modificador son los únicos que alteran atributos.
 */
export function statBreakdown(unit: Unit): readonly StatBreakdownRow[] {
  const profile = effectiveStats(unit);
  const equipment = emptyTotals();
  const traits = emptyTotals();

  for (const item of equippedDefinitions(unit)) {
    for (const [attribute, value] of Object.entries(item.modifiers)) {
      if (
        NUMERIC_ATTRIBUTES.includes(attribute as TraitAttribute) &&
        typeof value === 'number' &&
        Number.isFinite(value)
      ) {
        equipment[attribute as TraitAttribute] += value;
      }
    }
    for (const itemTrait of item.traits) {
      const definition = TRAITS[itemTrait.id];
      if (definition?.parameters.kind !== 'modifier') continue;
      traits[definition.parameters.attribute] += definition.parameters.amount;
    }
  }

  const baseMaxHp = profile.maxHp - profile.modifiers.pvMax;
  const baseMaxMp = profile.maxMp - profile.modifiers.mpMax;
  const actionsSum = unit.stats.acciones + equipment.acciones + traits.acciones;
  const actionsNote =
    actionsSum !== profile.actionsMax
      ? `total recortado desde ${signed(actionsSum)}`
      : undefined;

  return [
    ...(['habilidad', 'fuerza', 'defensa', 'punteria'] as const).map((id) =>
      attributeRow(
        id,
        total(unit.stats[id]),
        signed(equipment[id]),
        signed(traits[id]),
        total(profile.stats[id]),
      ),
    ),
    attributeRow(
      'resistencia',
      formatProfile(unit.stats.resistencia),
      `${signed(equipment.resistencia)} niveles`,
      `${signed(traits.resistencia)} niveles`,
      formatProfile(profile.stats.resistencia),
    ),
    attributeRow(
      'magia',
      total(unit.stats.magicLevel),
      signed(equipment.magia),
      signed(traits.magia),
      total(profile.stats.magicLevel),
    ),
    attributeRow(
      'pvMax',
      total(baseMaxHp),
      signed(equipment.pvMax),
      signed(traits.pvMax),
      total(profile.maxHp),
    ),
    attributeRow(
      'mpMax',
      total(baseMaxMp),
      signed(equipment.mpMax),
      signed(traits.mpMax),
      total(profile.maxMp),
    ),
    attributeRow(
      'acciones',
      total(unit.stats.acciones),
      signed(equipment.acciones),
      signed(traits.acciones),
      total(profile.actionsMax),
      actionsNote,
    ),
  ];
}
