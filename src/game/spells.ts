/**
 * Catálogo de hechizos (REQ-025 T-002).
 *
 * Es un módulo de datos puro y serializable: la única fuente de nivel, coste,
 * alcance, acierto, poder, objetivo, efecto y presentación. El resolvedor lee
 * de aquí y no codifica números por hechizo; añadir o ajustar un hechizo no
 * requiere tocar `magic.ts`.
 */

import type { MagicLevel } from './types';

export type SpellId =
  | 'electric-1'
  | 'fire-2'
  | 'electric-3'
  | 'fire-4'
  | 'healing-3'
  | 'resurrection-4';

/** Familia del hechizo (REQ-025 R-002); no limita el acceso por sí misma. */
export type SpellFamily = 'electric' | 'fire' | 'life';

/**
 * Objetivo válido de un hechizo:
 * - `enemy`: unidad viva de facción contraria.
 * - `ally`: unidad viva de la misma facción, nunca el lanzador.
 * - `corpse`: jugador muerto sobre su casilla.
 */
export type SpellTarget = 'enemy' | 'ally' | 'corpse';

/** Distancia Chebyshev mínima y máxima del objetivo. */
export interface SpellRange {
  readonly min: number;
  readonly max: number;
}

/**
 * Efecto parametrizado. El resolvedor despacha por `kind`, nunca por id:
 * - `damage` usa `power` (raíz) en la capa de daño.
 * - `heal` cura `amount` sin superar el PV máximo.
 * - `resurrect` devuelve `ceil(hpRatio × PV máximo)`, mínimo `minHp`.
 */
export type SpellEffect =
  | { readonly kind: 'damage' }
  | { readonly kind: 'heal'; readonly amount: number }
  | {
      readonly kind: 'resurrect';
      readonly hpRatio: number;
      readonly minHp: number;
    };

/** Pista de presentación para `TASK-0083`; no es arte ni audio. */
export type SpellCue = 'bolt' | 'healing' | 'revival';

export interface SpellPresentation {
  readonly cue: SpellCue;
  /** Etiqueta corta para HUD, avisos y log. */
  readonly label: string;
}

export interface SpellDefinition {
  readonly id: SpellId;
  readonly name: string;
  readonly family: SpellFamily;
  /** Nivel de magia mínimo para lanzarlo (REQ-025 R-007). */
  readonly minLevel: MagicLevel;
  /** Coste final de maná; `2 × nivel` es solo una guía de diseño. */
  readonly cost: number;
  readonly range: SpellRange;
  /** Bono de acierto del hechizo; el nivel de magia se suma aparte. */
  readonly accuracy: number;
  /** Poder de daño; 0 en hechizos sin ataque. */
  readonly power: number;
  readonly target: SpellTarget;
  readonly effect: SpellEffect;
  readonly presentation: SpellPresentation;
}

/** Catálogo mínimo provisional v1 (REQ-025 R-013). */
export const SPELLS: Readonly<Record<SpellId, SpellDefinition>> = {
  'electric-1': {
    id: 'electric-1',
    name: 'Eléctrico I',
    family: 'electric',
    minLevel: 1,
    cost: 2,
    range: { min: 1, max: 3 },
    accuracy: 2,
    power: 2,
    target: 'enemy',
    effect: { kind: 'damage' },
    presentation: { cue: 'bolt', label: 'proyectil eléctrico' },
  },
  'fire-2': {
    id: 'fire-2',
    name: 'Fuego II',
    family: 'fire',
    minLevel: 2,
    cost: 4,
    range: { min: 1, max: 3 },
    accuracy: 0,
    power: 5,
    target: 'enemy',
    effect: { kind: 'damage' },
    presentation: { cue: 'bolt', label: 'proyectil de fuego' },
  },
  'electric-3': {
    id: 'electric-3',
    name: 'Eléctrico III',
    family: 'electric',
    minLevel: 3,
    cost: 6,
    range: { min: 1, max: 4 },
    accuracy: 3,
    power: 4,
    target: 'enemy',
    effect: { kind: 'damage' },
    presentation: { cue: 'bolt', label: 'proyectil eléctrico' },
  },
  'fire-4': {
    id: 'fire-4',
    name: 'Fuego IV',
    family: 'fire',
    minLevel: 4,
    cost: 8,
    range: { min: 1, max: 4 },
    accuracy: 1,
    power: 8,
    target: 'enemy',
    effect: { kind: 'damage' },
    presentation: { cue: 'bolt', label: 'proyectil de fuego' },
  },
  'healing-3': {
    id: 'healing-3',
    name: 'Curación III',
    family: 'life',
    minLevel: 3,
    cost: 6,
    range: { min: 2, max: 3 },
    accuracy: 0,
    power: 0,
    target: 'ally',
    effect: { kind: 'heal', amount: 4 },
    presentation: { cue: 'healing', label: 'curación' },
  },
  'resurrection-4': {
    id: 'resurrection-4',
    name: 'Resurrección IV',
    family: 'life',
    minLevel: 4,
    cost: 8,
    range: { min: 1, max: 1 },
    accuracy: 0,
    power: 0,
    target: 'corpse',
    effect: { kind: 'resurrect', hpRatio: 0.6, minHp: 1 },
    presentation: { cue: 'revival', label: 'resurrección' },
  },
};

/** Acceso tipado al catálogo; el id es estable. */
export function spellFor(id: SpellId): SpellDefinition {
  return SPELLS[id];
}

/** Búsqueda segura por id de runtime; `undefined` si el hechizo no existe. */
export function findSpell(id: string): SpellDefinition | undefined {
  if (!Object.prototype.hasOwnProperty.call(SPELLS, id)) return undefined;
  return SPELLS[id as SpellId];
}
