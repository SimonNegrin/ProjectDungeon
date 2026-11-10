/**
 * Catálogo de arquetipos jugables (REQ-015).
 *
 * Es la fuente única de stats, equipo, variantes e identidad del roster. El
 * motor y el host leen de aquí; no deben duplicar estos valores. La identidad
 * mágica es texto sin efecto en combate y `stats.magia` siempre queda vacío.
 */

import type { Position, Unit, UnitEquipment, UnitStats } from './types';

export type ArchetypeId =
  | 'warrior'
  | 'barbarian'
  | 'rogue'
  | 'archer'
  | 'mage'
  | 'cleric'
  | 'spellblade'
  | 'cook'
  | 'farmer';

export interface ArchetypeEntry {
  readonly id: ArchetypeId;
  readonly name: string;
  readonly maxHp: number;
  readonly maxMp: number;
  readonly stats: UnitStats;
  readonly equipment: UnitEquipment;
  /** Arma temática aún no implementada; `null` si ya tiene arma o no aplica. */
  readonly futureWeapon: string | null;
  /** Dos IDs de sprite seleccionables, sin etiqueta de género. */
  readonly variants: readonly [string, string];
  /** Rol o identidad; no cambia ningún cálculo. */
  readonly role: string;
  /** Identidad mágica; `—` si no tiene. No cambia ningún cálculo. */
  readonly magic: string;
}

export const ROSTER: Readonly<Record<ArchetypeId, ArchetypeEntry>> = {
  warrior: {
    id: 'warrior',
    name: 'Guerrero',
    maxHp: 20,
    maxMp: 6,
    stats: {
      habilidad: 1,
      fuerza: 1,
      defensa: 1,
      resistencia: 1,
      punteria: 0,
      magia: [],
    },
    equipment: { weaponId: 'sword', armorId: 'armor', shieldId: 'shield' },
    futureWeapon: null,
    variants: ['warrior-a', 'warrior-b'],
    role: 'Equilibrado; referencia',
    magic: '—',
  },
  barbarian: {
    id: 'barbarian',
    name: 'Bárbaro',
    maxHp: 24,
    maxMp: 5,
    stats: {
      habilidad: 0,
      fuerza: 3,
      defensa: -1,
      resistencia: 0,
      punteria: 0,
      magia: [],
    },
    equipment: { weaponId: 'axe', armorId: null, shieldId: null },
    futureWeapon: null,
    variants: ['barbarian-a', 'barbarian-b'],
    role: 'Pega fuerte y encaja',
    magic: '—',
  },
  rogue: {
    id: 'rogue',
    name: 'Pícaro',
    maxHp: 14,
    maxMp: 8,
    stats: {
      habilidad: 3,
      fuerza: 0,
      defensa: 1,
      resistencia: 0,
      punteria: 0,
      magia: [],
    },
    equipment: { weaponId: 'dagger', armorId: null, shieldId: null },
    futureWeapon: null,
    variants: ['rogue-a', 'rogue-b'],
    role: 'Rápido y fiable',
    magic: '—',
  },
  archer: {
    id: 'archer',
    name: 'Arquero',
    maxHp: 14,
    maxMp: 6,
    stats: {
      habilidad: 1,
      fuerza: 0,
      defensa: 0,
      resistencia: 0,
      punteria: 3,
      magia: [],
    },
    equipment: { weaponId: null, armorId: null, shieldId: null },
    futureWeapon: 'arco',
    variants: ['archer-a', 'archer-b'],
    role: 'Distancia (futuro)',
    magic: '—',
  },
  mage: {
    id: 'mage',
    name: 'Mago',
    maxHp: 12,
    maxMp: 5,
    stats: {
      habilidad: 0,
      fuerza: -1,
      defensa: 0,
      resistencia: 0,
      punteria: 0,
      magia: [],
    },
    equipment: { weaponId: null, armorId: null, shieldId: null },
    futureWeapon: 'bastón',
    variants: ['mage-a', 'mage-b'],
    role: 'Hechizos (futuro)',
    magic: 'varias familias (fuego, veneno…)',
  },
  cleric: {
    id: 'cleric',
    name: 'Clérigo',
    maxHp: 18,
    maxMp: 5,
    stats: {
      habilidad: 0,
      fuerza: -1,
      defensa: 3,
      resistencia: 2,
      punteria: 0,
      magia: [],
    },
    equipment: { weaponId: null, armorId: 'armor', shieldId: 'shield' },
    futureWeapon: 'maza',
    variants: ['cleric-a', 'cleric-b'],
    role: 'Tanque de apoyo',
    magic: 'tanque, sin curación en este corte',
  },
  spellblade: {
    id: 'spellblade',
    name: 'Guerrero mágico',
    maxHp: 18,
    maxMp: 6,
    stats: {
      habilidad: 1,
      fuerza: 0,
      defensa: 1,
      resistencia: 0,
      punteria: 0,
      magia: [],
    },
    equipment: { weaponId: null, armorId: 'armor', shieldId: null },
    futureWeapon: 'espada mágica',
    variants: ['spellblade-a', 'spellblade-b'],
    role: 'Guerrero algo más débil',
    magic: 'magia baja (menor que el Mago)',
  },
  cook: {
    id: 'cook',
    name: 'Cocinero',
    maxHp: 14,
    maxMp: 6,
    stats: {
      habilidad: 3,
      fuerza: -1,
      defensa: 0,
      resistencia: 0,
      punteria: 0,
      magia: [],
    },
    equipment: { weaponId: 'knife', armorId: null, shieldId: null },
    futureWeapon: null,
    variants: ['cook-a', 'cook-b'],
    role: 'Cuchillo y apoyo',
    magic: 'curación',
  },
  farmer: {
    id: 'farmer',
    name: 'Agricultor',
    maxHp: 22,
    maxMp: 4,
    stats: {
      habilidad: -1,
      fuerza: 3,
      defensa: 0,
      resistencia: 1,
      punteria: 0,
      magia: [],
    },
    equipment: { weaponId: null, armorId: null, shieldId: 'shield' },
    futureWeapon: 'guadaña',
    variants: ['farmer-a', 'farmer-b'],
    role: 'Fuerza bruta',
    magic: '—',
  },
};

export function rosterEntry(id: ArchetypeId): ArchetypeEntry {
  return ROSTER[id];
}

export interface CreatePlayerOptions {
  /** Identificador de instancia; por defecto `player-1`. */
  readonly id?: string;
  /** Posición inicial; por defecto `(0, 0)`. */
  readonly position?: Position;
  /** Nombre de instancia; por defecto, el del arquetipo. */
  readonly name?: string;
}

/** Crea una unidad jugadora con los valores del arquetipo y PV/MP completos. */
export function createPlayerFromArchetype(
  id: ArchetypeId,
  options: CreatePlayerOptions = {},
): Unit {
  const entry = rosterEntry(id);
  const position = options.position ?? { x: 0, y: 0 };
  const weaponId = entry.equipment.weaponId;

  return {
    id: options.id ?? 'player-1',
    nombre: options.name ?? entry.name,
    faction: 'player',
    enemyType: null,
    x: position.x,
    y: position.y,
    hp: entry.maxHp,
    maxHp: entry.maxHp,
    mp: entry.maxMp,
    maxMp: entry.maxMp,
    actionAvailable: true,
    stats: entry.stats,
    equipment: entry.equipment,
    weapons: weaponId === null ? [] : [weaponId],
    awareness: 'alert',
    fleeing: false,
    home: { x: position.x, y: position.y },
    lastKnown: null,
    alertTurns: 0,
    hasShouted: false,
  };
}
