/**
 * Catálogo de bestiario (REQ-010, tabla A de EXP-003) y plantillas de familia
 * de resistencia (REQ-029 R-013).
 *
 * Datos puros y serializables: cada tipo de enemigo referencia el catálogo de
 * equipo por ID y declara sus ocho atributos (REQ-014), visión, alarma y perfil.
 * El perfil efectivo se compone de la plantilla de familia más una
 * sobrescritura parcial; los valores v1 son estimados para probar.
 */

import type {
  ResistanceBand,
  ResistanceProfile,
  UnitEquipment,
  UnitStats,
} from './types';

export type EnemyType = 'sentinel' | 'brute' | 'coward';

/** Perfil de comportamiento provisional; `brave` no huye y `coward` sí (REQ-009). */
export type EnemyProfile = 'brave' | 'coward';

/** Familias reutilizables del bestiario futuro (REQ-029 R-013). */
export type EnemyFamily =
  | 'humanoid'
  | 'construct'
  | 'undead'
  | 'beast'
  | 'elemental'
  | 'dragon';

function profile(
  slash: ResistanceBand,
  blunt: ResistanceBand,
  pierce: ResistanceBand,
  magic: ResistanceBand,
  electric: ResistanceBand,
): ResistanceProfile {
  return { slash, blunt, pierce, magic, electric };
}

/**
 * Plantillas estimadas v1 por familia. Las cinco bandas son explícitas para
 * contrastarlas 1:1 con REQ-029; una banda ausente seguiría siendo `normal`.
 */
export const FAMILY_PROFILES: Readonly<Record<EnemyFamily, ResistanceProfile>> = {
  humanoid: profile('normal', 'normal', 'normal', 'normal', 'normal'),
  construct: profile('resistant', 'vulnerable', 'resistant', 'normal', 'normal'),
  undead: profile('vulnerable', 'resistant', 'resistant', 'vulnerable', 'normal'),
  beast: profile('normal', 'normal', 'normal', 'vulnerable', 'normal'),
  elemental: profile('normal', 'normal', 'normal', 'resistant', 'resistant'),
  dragon: profile('resistant', 'normal', 'vulnerable', 'resistant', 'resistant'),
};

/** Perfil efectivo: plantilla de familia más la sobrescritura parcial del enemigo. */
export function familyResistanceProfile(
  family: EnemyFamily,
  overrides: ResistanceProfile = {},
): ResistanceProfile {
  return { ...FAMILY_PROFILES[family], ...overrides };
}

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
  readonly stats: UnitStats;
  readonly equipment: UnitEquipment;
  /** Familia de la que hereda la plantilla de resistencia. */
  readonly family: EnemyFamily;
  /** Solo las bandas que este enemigo cambia respecto a la familia. */
  readonly resistanceOverrides: ResistanceProfile;
}

interface EnemySeed {
  readonly id: EnemyType;
  readonly name: string;
  readonly profile: EnemyProfile;
  readonly vision: number;
  readonly alarm: number;
  readonly maxHp: number;
  readonly maxMp: number;
  /** Atributos sin perfil: el perfil se deriva de familia y sobrescritura. */
  readonly stats: Omit<UnitStats, 'resistencia'>;
  readonly equipment: UnitEquipment;
  readonly family: EnemyFamily;
  readonly resistanceOverrides?: ResistanceProfile;
}

function defineEnemy(seed: EnemySeed): EnemyDefinition {
  const resistanceOverrides = seed.resistanceOverrides ?? {};
  return {
    id: seed.id,
    name: seed.name,
    profile: seed.profile,
    vision: seed.vision,
    alarm: seed.alarm,
    maxHp: seed.maxHp,
    maxMp: seed.maxMp,
    stats: {
      ...seed.stats,
      resistencia: familyResistanceProfile(seed.family, resistanceOverrides),
    },
    equipment: seed.equipment,
    family: seed.family,
    resistanceOverrides,
  };
}

export const BESTIARY: Readonly<Record<EnemyType, EnemyDefinition>> = {
  sentinel: defineEnemy({
    id: 'sentinel',
    name: 'Centinela',
    profile: 'brave',
    vision: 6,
    alarm: 5,
    maxHp: 6,
    maxMp: 5,
    stats: {
      habilidad: 0,
      fuerza: 0,
      defensa: 0,
      punteria: 0,
      magicLevel: 0,
      acciones: 2,
    },
    equipment: { weaponId: 'sword', armorId: null, shieldId: 'shield' },
    family: 'humanoid',
  }),
  brute: defineEnemy({
    id: 'brute',
    name: 'Bruto',
    profile: 'brave',
    vision: 4,
    alarm: 5,
    maxHp: 8,
    maxMp: 4,
    stats: {
      habilidad: 0,
      fuerza: 1,
      defensa: 0,
      punteria: 0,
      magicLevel: 0,
      acciones: 1,
    },
    equipment: { weaponId: 'axe', armorId: 'plate', shieldId: null },
    family: 'humanoid',
    resistanceOverrides: {
      blunt: 'resistant',
      magic: 'vulnerable',
      electric: 'vulnerable',
    },
  }),
  coward: defineEnemy({
    id: 'coward',
    name: 'Cobarde',
    profile: 'coward',
    vision: 5,
    alarm: 5,
    maxHp: 5,
    maxMp: 6,
    stats: {
      habilidad: 1,
      fuerza: 0,
      defensa: 1,
      punteria: 0,
      magicLevel: 0,
      acciones: 2,
    },
    equipment: { weaponId: 'dagger', armorId: null, shieldId: 'shield' },
    family: 'humanoid',
    resistanceOverrides: { blunt: 'vulnerable' },
  }),
};

export function enemyDefinition(type: EnemyType): EnemyDefinition {
  return BESTIARY[type];
}
