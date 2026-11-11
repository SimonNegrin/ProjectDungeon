/**
 * Catálogo de la v2.0: roster, bestiario, equipo, hechizos y perfiles de IA.
 *
 * Es la única fuente de valores. Añadir un combatiente, hechizo o perfil es
 * editar datos; el resolvedor no cambia.
 */

import type {
  ArmorDefinition,
  AIProfile,
  Catalog,
  CombatantTemplate,
  ShieldDefinition,
  SpellDefinition,
  Unit,
  WeaponDefinition,
} from './types';

export const CATALOG_VERSION = 'EXP-003-v2.0.0';

export const WEAPONS: Readonly<Record<string, WeaponDefinition>> = {
  espada: { id: 'espada', name: 'Espada', accuracy: 3, damage: 3 },
  hacha: { id: 'hacha', name: 'Hacha', accuracy: 2, damage: 5 },
  daga: { id: 'daga', name: 'Daga', accuracy: 4, damage: 2 },
  cuchillo: { id: 'cuchillo', name: 'Cuchillo', accuracy: 4, damage: 1 },
};

export const ARMORS: Readonly<Record<string, ArmorDefinition>> = {
  armadura: { id: 'armadura', name: 'Armadura', armor: 1 },
  coraza: { id: 'coraza', name: 'Coraza', armor: 2 },
};

export const SHIELDS: Readonly<Record<string, ShieldDefinition>> = {
  escudo: { id: 'escudo', name: 'Escudo', defense: 1 },
};

export const AI_PROFILES: Readonly<Record<string, AIProfile>> = {
  valiente: {
    id: 'valiente',
    name: 'Valiente',
    fleeThreshold: null,
    castSpells: false,
    spellPriority: 'power',
  },
  cobarde: {
    id: 'cobarde',
    name: 'Cobarde',
    fleeThreshold: 0.4,
    castSpells: false,
    spellPriority: 'power',
  },
};

export const SPELLS: Readonly<Record<string, SpellDefinition>> = {
  'electrico-i': {
    id: 'electrico-i',
    name: 'Eléctrico I',
    family: 'electrico',
    level: 1,
    cost: 2,
    rangeMin: 1,
    rangeMax: 3,
    accuracy: 2,
    power: 2,
    target: 'enemy',
    effect: { type: 'damage' },
  },
  'fuego-ii': {
    id: 'fuego-ii',
    name: 'Fuego II',
    family: 'fuego',
    level: 2,
    cost: 4,
    rangeMin: 1,
    rangeMax: 3,
    accuracy: 0,
    power: 5,
    target: 'enemy',
    effect: { type: 'damage' },
  },
  'electrico-iii': {
    id: 'electrico-iii',
    name: 'Eléctrico III',
    family: 'electrico',
    level: 3,
    cost: 6,
    rangeMin: 1,
    rangeMax: 4,
    accuracy: 3,
    power: 4,
    target: 'enemy',
    effect: { type: 'damage' },
  },
  'fuego-iv': {
    id: 'fuego-iv',
    name: 'Fuego IV',
    family: 'fuego',
    level: 4,
    cost: 8,
    rangeMin: 1,
    rangeMax: 4,
    accuracy: 1,
    power: 8,
    target: 'enemy',
    effect: { type: 'damage' },
  },
  'curacion-iii': {
    id: 'curacion-iii',
    name: 'Curación III',
    family: 'vida',
    level: 3,
    cost: 6,
    rangeMin: 2,
    rangeMax: 3,
    accuracy: 0,
    power: 0,
    target: 'ally',
    effect: { type: 'heal', amount: 4 },
  },
  'resurreccion-iv': {
    id: 'resurreccion-iv',
    name: 'Resurrección IV',
    family: 'vida',
    level: 4,
    cost: 8,
    rangeMin: 1,
    rangeMax: 1,
    accuracy: 0,
    power: 0,
    target: 'corpse',
    effect: { type: 'resurrect', hpFraction: 0.6 },
  },
};

export const ROSTER: ReadonlyArray<CombatantTemplate> = [
  {
    id: 'guerrero',
    name: 'Guerrero',
    side: 'hero',
    stats: { habilidad: 1, fuerza: 1, defensa: 1, resistencia: 1 },
    maxHp: 20,
    maxMp: 6,
    magicLevel: 0,
    maxActions: 2,
    weaponId: 'espada',
    armorId: 'armadura',
    shieldId: 'escudo',
    marksmanship: 0,
    vision: 0,
    alarmRadius: 0,
    profileId: 'valiente',
  },
  {
    id: 'picaro',
    name: 'Pícaro',
    side: 'hero',
    stats: { habilidad: 3, fuerza: 0, defensa: 1, resistencia: 0 },
    maxHp: 14,
    maxMp: 8,
    magicLevel: 0,
    maxActions: 3,
    weaponId: 'daga',
    armorId: null,
    shieldId: null,
    marksmanship: 0,
    vision: 0,
    alarmRadius: 0,
    profileId: 'valiente',
  },
  {
    id: 'mago',
    name: 'Mago',
    side: 'hero',
    stats: { habilidad: 0, fuerza: -1, defensa: 0, resistencia: 0 },
    maxHp: 12,
    maxMp: 5,
    magicLevel: 4,
    maxActions: 2,
    weaponId: null,
    armorId: null,
    shieldId: null,
    marksmanship: 0,
    vision: 0,
    alarmRadius: 0,
    profileId: 'valiente',
  },
  {
    id: 'clerigo',
    name: 'Clérigo',
    side: 'hero',
    stats: { habilidad: 0, fuerza: -1, defensa: 3, resistencia: 2 },
    maxHp: 18,
    maxMp: 5,
    magicLevel: 3,
    maxActions: 2,
    weaponId: null,
    armorId: 'armadura',
    shieldId: 'escudo',
    marksmanship: 0,
    vision: 0,
    alarmRadius: 0,
    profileId: 'valiente',
  },
];

export const BESTIARY: ReadonlyArray<CombatantTemplate> = [
  {
    id: 'centinela',
    name: 'Centinela',
    side: 'enemy',
    stats: { habilidad: 0, fuerza: 0, defensa: 0, resistencia: 0 },
    maxHp: 6,
    maxMp: 5,
    magicLevel: 0,
    maxActions: 2,
    weaponId: 'espada',
    armorId: null,
    shieldId: 'escudo',
    marksmanship: 0,
    vision: 6,
    alarmRadius: 5,
    profileId: 'valiente',
    enemyType: 'centinela',
  },
  {
    id: 'bruto',
    name: 'Bruto',
    side: 'enemy',
    stats: { habilidad: 0, fuerza: 1, defensa: 0, resistencia: 0 },
    maxHp: 8,
    maxMp: 4,
    magicLevel: 0,
    maxActions: 1,
    weaponId: 'hacha',
    armorId: 'coraza',
    shieldId: null,
    marksmanship: 0,
    vision: 4,
    alarmRadius: 5,
    profileId: 'valiente',
    enemyType: 'bruto',
  },
  {
    id: 'cobarde',
    name: 'Cobarde',
    side: 'enemy',
    stats: { habilidad: 1, fuerza: 0, defensa: 1, resistencia: 0 },
    maxHp: 5,
    maxMp: 6,
    magicLevel: 0,
    maxActions: 2,
    weaponId: 'daga',
    armorId: null,
    shieldId: 'escudo',
    marksmanship: 0,
    vision: 5,
    alarmRadius: 5,
    profileId: 'cobarde',
    enemyType: 'cobarde',
  },
];

export const CATALOG: Catalog = {
  version: CATALOG_VERSION,
  roster: ROSTER,
  bestiary: BESTIARY,
  weapons: WEAPONS,
  armors: ARMORS,
  shields: SHIELDS,
  spells: SPELLS,
  aiProfiles: AI_PROFILES,
};

export function manaForLevel(magicLevel: number): number {
  return magicLevel * 4;
}

export function findTemplate(
  catalog: Catalog,
  id: string,
): CombatantTemplate | undefined {
  return (
    catalog.roster.find((template) => template.id === id) ??
    catalog.bestiary.find((template) => template.id === id)
  );
}

export function templateFor(catalog: Catalog, id: string): CombatantTemplate {
  const template = findTemplate(catalog, id);
  if (!template) throw new Error(`Combatiente desconocido: ${id}`);
  return template;
}

export function createUnit(template: CombatantTemplate, pos: number): Unit {
  const maxMana = manaForLevel(template.magicLevel);
  return {
    id: template.id,
    templateId: template.id,
    name: template.name,
    side: template.side,
    stats: template.stats,
    hp: template.maxHp,
    maxHp: template.maxHp,
    mp: template.maxMp,
    maxMp: template.maxMp,
    mana: maxMana,
    maxMana,
    magicLevel: template.magicLevel,
    actions: template.maxActions,
    maxActions: template.maxActions,
    spellsCastThisTurn: 0,
    weaponId: template.weaponId,
    armorId: template.armorId,
    shieldId: template.shieldId,
    pos,
    vision: template.vision,
    alarmRadius: template.alarmRadius,
    profileId: template.profileId,
    awareness: template.side === 'enemy' ? 'dormant' : 'alert',
    home: pos,
    lastKnown: null,
    fleeing: false,
  };
}

export function weaponFor(
  catalog: Catalog,
  weaponId: string | null,
): WeaponDefinition | null {
  return weaponId === null ? null : (catalog.weapons[weaponId] ?? null);
}

export function armorValue(catalog: Catalog, armorId: string | null): number {
  return armorId === null ? 0 : (catalog.armors[armorId]?.armor ?? 0);
}

export function shieldValue(
  catalog: Catalog,
  shieldId: string | null,
): number {
  return shieldId === null ? 0 : (catalog.shields[shieldId]?.defense ?? 0);
}
