/**
 * Catálogo de bestiario (REQ-010, tabla A de EXP-003).
 *
 * Datos puros y serializables: cada tipo de enemigo referencia el catálogo de
 * equipo por ID y declara modificadores, PV, visión y perfil. La visión y el
 * perfil son provisionales de REQ-009; este corte no implementa percepción,
 * alarma ni huida.
 */

import type { UnitEquipment, UnitModifiers } from './types';

export type EnemyType = 'sentinel' | 'brute' | 'coward';

/** Perfil de comportamiento provisional; `brave` no huye y `coward` sí (REQ-009). */
export type EnemyProfile = 'brave' | 'coward';

export interface EnemyDefinition {
  readonly id: EnemyType;
  readonly name: string;
  /** Perfil provisional de REQ-009; sin comportamiento en este corte. */
  readonly profile: EnemyProfile;
  /** Radio de visión provisional en tiles (REQ-009). */
  readonly vision: number;
  readonly maxHp: number;
  readonly modifiers: UnitModifiers;
  readonly equipment: UnitEquipment;
}

export const BESTIARY: Readonly<Record<EnemyType, EnemyDefinition>> = {
  sentinel: {
    id: 'sentinel',
    name: 'Centinela',
    profile: 'brave',
    vision: 6,
    maxHp: 9,
    modifiers: { accuracy: 0, damage: 0, defense: 0 },
    equipment: { weaponId: 'sword', armorId: 'armor', shieldId: 'shield' },
  },
  brute: {
    id: 'brute',
    name: 'Bruto',
    profile: 'brave',
    vision: 4,
    maxHp: 12,
    modifiers: { accuracy: 0, damage: 1, defense: 0 },
    equipment: { weaponId: 'axe', armorId: 'plate', shieldId: null },
  },
  coward: {
    id: 'coward',
    name: 'Cobarde',
    profile: 'coward',
    vision: 5,
    maxHp: 8,
    modifiers: { accuracy: 1, damage: 0, defense: 1 },
    equipment: { weaponId: 'dagger', armorId: null, shieldId: 'shield' },
  },
};

export function enemyDefinition(type: EnemyType): EnemyDefinition {
  return BESTIARY[type];
}
