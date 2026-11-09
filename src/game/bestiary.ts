/**
 * Catálogo de bestiario (REQ-010, tabla A de EXP-003).
 *
 * Datos puros y serializables: cada tipo de enemigo referencia el catálogo de
 * equipo por ID y declara modificadores, PV, visión, alarma y perfil. La visión
 * alimenta la percepción; la onda usa el radio de alarma; la huida llega en
 * TASK-0037.
 */

import type { UnitEquipment, UnitModifiers } from './types';

export type EnemyType = 'sentinel' | 'brute' | 'coward';

/** Perfil de comportamiento provisional; `brave` no huye y `coward` sí (REQ-009). */
export type EnemyProfile = 'brave' | 'coward';

export interface EnemyDefinition {
  readonly id: EnemyType;
  readonly name: string;
  /** Perfil de REQ-009; la huida del cobarde llega en TASK-0037. */
  readonly profile: EnemyProfile;
  /** Radio de visión en tiles (REQ-009). */
  readonly vision: number;
  /** Radio de la onda de alarma en tiles (REQ-009). */
  readonly alarm: number;
  readonly maxHp: number;
  readonly maxMp: number;
  readonly modifiers: UnitModifiers;
  readonly equipment: UnitEquipment;
}

export const BESTIARY: Readonly<Record<EnemyType, EnemyDefinition>> = {
  sentinel: {
    id: 'sentinel',
    name: 'Centinela',
    profile: 'brave',
    vision: 6,
    alarm: 5,
    maxHp: 6,
    maxMp: 5,
    modifiers: { accuracy: 0, damage: 0, defense: 0 },
    equipment: { weaponId: 'sword', armorId: null, shieldId: 'shield' },
  },
  brute: {
    id: 'brute',
    name: 'Bruto',
    profile: 'brave',
    vision: 4,
    alarm: 5,
    maxHp: 8,
    maxMp: 4,
    modifiers: { accuracy: 0, damage: 1, defense: 0 },
    equipment: { weaponId: 'axe', armorId: 'plate', shieldId: null },
  },
  coward: {
    id: 'coward',
    name: 'Cobarde',
    profile: 'coward',
    vision: 5,
    alarm: 5,
    maxHp: 5,
    maxMp: 6,
    modifiers: { accuracy: 1, damage: 0, defense: 1 },
    equipment: { weaponId: 'dagger', armorId: null, shieldId: 'shield' },
  },
};

export function enemyDefinition(type: EnemyType): EnemyDefinition {
  return BESTIARY[type];
}
