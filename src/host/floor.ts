/**
 * Damero y decoración plana del suelo.
 *
 * Este módulo es puro: no conoce DOM, Canvas, relojes ni `Math.random`. La
 * paridad, el tinte, la lista blanca, las densidades y el hash son funciones
 * deterministas que el render y el snapshot de debug comparten.
 */

import { roomAt, type GeneratedMap } from '../game/map';
import type { SpriteRect } from './assets';
import { DECAL_RECTS } from './assets';

export type FloorArea = 'room' | 'corridor';
export type DecalFamily = 'dirt' | 'grass' | 'bones' | 'blood' | 'mushroom';

export interface DecalDefinition {
  readonly id: string;
  readonly family: DecalFamily;
  /** Recorte 32×32 de `tiles.png`. */
  readonly rect: SpriteRect;
}

export interface FloorDecoration {
  readonly x: number;
  readonly y: number;
  readonly area: FloorArea;
  readonly decal: DecalDefinition;
}

/** Resumen serializable de una decoración; es lo que expone el snapshot. */
export interface DecorationSummary {
  readonly x: number;
  readonly y: number;
  readonly type: string;
  readonly area: FloorArea;
}

/** Configuración única del tinte del damero (paridad alterna). */
export const FLOOR_TINT = {
  red: 143,
  green: 163,
  blue: 184,
  alpha: 0.1,
} as const;

/** Estilo de relleno del tinte; el renderer no guarda colores propios. */
export function floorTintStyle(): string {
  return `rgba(${FLOOR_TINT.red}, ${FLOOR_TINT.green}, ${FLOOR_TINT.blue}, ${FLOOR_TINT.alpha})`;
}

/** Paridad global del damero: no depende de sala, cámara ni semilla. */
export function floorParity(x: number, y: number): 0 | 1 {
  return ((x + y) % 2 + 2) % 2 === 1 ? 1 : 0;
}

export interface DensityRange {
  readonly min: number;
  readonly target: number;
  readonly max: number;
}

export const FLOOR_DENSITY: Readonly<Record<FloorArea, DensityRange>> = {
  room: { min: 0.12, target: 0.15, max: 0.18 },
  corridor: { min: 0.06, target: 0.07, max: 0.08 },
};

/**
 * Lista blanca de decals planos aprobados en `REQ-007`.
 *
 * Filas 7-11 e-g, 21-22 a-b y 23 a-d de la rejilla 32×32 de `tiles.png`.
 * Quedan fuera cofres, barriles, rocas, escaleras, fosos o cualquier prop que
 * pueda parecer sólido o interactivo.
 */
export const DECAL_WHITELIST: readonly DecalDefinition[] = [
  { id: 'dirt-7e', family: 'dirt', rect: DECAL_RECTS.dirt7e },
  { id: 'dirt-7f', family: 'dirt', rect: DECAL_RECTS.dirt7f },
  { id: 'dirt-7g', family: 'dirt', rect: DECAL_RECTS.dirt7g },
  { id: 'grass-8e', family: 'grass', rect: DECAL_RECTS.grass8e },
  { id: 'grass-8f', family: 'grass', rect: DECAL_RECTS.grass8f },
  { id: 'grass-8g', family: 'grass', rect: DECAL_RECTS.grass8g },
  { id: 'bones-9e', family: 'bones', rect: DECAL_RECTS.bones9e },
  { id: 'bones-9f', family: 'bones', rect: DECAL_RECTS.bones9f },
  { id: 'bones-9g', family: 'bones', rect: DECAL_RECTS.bones9g },
  { id: 'dirt-10e', family: 'dirt', rect: DECAL_RECTS.dirt10e },
  { id: 'dirt-10f', family: 'dirt', rect: DECAL_RECTS.dirt10f },
  { id: 'dirt-10g', family: 'dirt', rect: DECAL_RECTS.dirt10g },
  { id: 'bones-11e', family: 'bones', rect: DECAL_RECTS.bones11e },
  { id: 'bones-11f', family: 'bones', rect: DECAL_RECTS.bones11f },
  { id: 'bones-11g', family: 'bones', rect: DECAL_RECTS.bones11g },
  { id: 'mushroom-21a', family: 'mushroom', rect: DECAL_RECTS.mushroom21a },
  { id: 'mushroom-21b', family: 'mushroom', rect: DECAL_RECTS.mushroom21b },
  { id: 'bones-22a', family: 'bones', rect: DECAL_RECTS.bones22a },
  { id: 'bones-22b', family: 'bones', rect: DECAL_RECTS.bones22b },
  { id: 'blood-23a', family: 'blood', rect: DECAL_RECTS.blood23a },
  { id: 'blood-23b', family: 'blood', rect: DECAL_RECTS.blood23b },
  { id: 'blood-23c', family: 'blood', rect: DECAL_RECTS.blood23c },
  { id: 'blood-23d', family: 'blood', rect: DECAL_RECTS.blood23d },
];

const DECAL_FAMILIES: Readonly<Record<DecalFamily, readonly DecalDefinition[]>> = {
  dirt: DECAL_WHITELIST.filter((decal) => decal.family === 'dirt'),
  grass: DECAL_WHITELIST.filter((decal) => decal.family === 'grass'),
  bones: DECAL_WHITELIST.filter((decal) => decal.family === 'bones'),
  blood: DECAL_WHITELIST.filter((decal) => decal.family === 'blood'),
  mushroom: DECAL_WHITELIST.filter((decal) => decal.family === 'mushroom'),
};

const SCORE_SALT = 0x9e3779b9;
const FAMILY_SALT = 0x85ebca6b;
const CELL_SALT = 0xc2b2ae35;

/**
 * Hash entero de 32 bits con semilla, coordenada y sal. Mezcla de bits
 * determinista, sin relojes ni estado global.
 */
export function decorationHash(
  seed: number,
  x: number,
  y: number,
  salt: number,
): number {
  let hash = (seed >>> 0) ^ 0x811c9dc5;
  hash = Math.imul(hash ^ (x | 0), 0x01000193);
  hash = Math.imul(hash ^ ((y | 0) + 0x9e3779b9), SCORE_SALT);
  hash = Math.imul(hash ^ (salt | 0), 0x27d4eb2f);
  hash ^= hash >>> 16;
  hash = Math.imul(hash, 0x7feb352d);
  hash ^= hash >>> 15;
  hash = Math.imul(hash, 0x846ca68b);
  hash ^= hash >>> 16;
  return hash >>> 0;
}

interface Candidate {
  readonly x: number;
  readonly y: number;
  readonly score: number;
}

/**
 * Cuota entera que garantiza el rango de densidad cuando existe. Si el número
 * de elegibles es demasiado pequeño para que haya un entero dentro del rango,
 * usa el valor redondeado más cercano al objetivo.
 */
export function densityQuota(eligible: number, range: DensityRange): number {
  if (eligible <= 0) return 0;
  const minCount = Math.ceil(range.min * eligible - 1e-9);
  const maxCount = Math.floor(range.max * eligible + 1e-9);
  const target = Math.round(range.target * eligible);
  if (maxCount < minCount) return Math.min(eligible, Math.max(0, target));
  return Math.min(maxCount, Math.max(minCount, target));
}

function selectCandidates(
  candidates: readonly Candidate[],
  range: DensityRange,
): readonly Candidate[] {
  const quota = densityQuota(candidates.length, range);
  if (quota === 0) return [];
  const ordered = [...candidates].sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    if (a.y !== b.y) return a.y - b.y;
    return a.x - b.x;
  });
  return ordered.slice(0, quota);
}

function familyForRoll(roll: number): DecalFamily {
  if (roll < 40) return 'dirt';
  if (roll < 60) return 'grass';
  if (roll < 75) return 'bones';
  if (roll < 90) return 'blood';
  return 'mushroom';
}

function decalFor(seed: number, x: number, y: number): DecalDefinition {
  const family = familyForRoll(decorationHash(seed, x, y, FAMILY_SALT) % 100);
  const cells = DECAL_FAMILIES[family];
  const index = decorationHash(seed, x, y, CELL_SALT) % cells.length;
  return cells[index];
}

function tileKey(x: number, y: number): string {
  return `${x},${y}`;
}

/**
 * Plan determinista de decoración plana.
 *
 * - Salas: tiles `floor` dentro de un `Room`.
 * - Pasillos: tiles `floor` fuera de toda sala.
 * - Umbrales (`doors`) y apariciones (`spawns`) nunca se decoran.
 * - Sin mapa no hay decoración (el damero sigue existiendo).
 *
 * La misma semilla y el mismo mapa producen siempre la misma lista; el render
 * y el snapshot consumen esta misma función.
 */
export function planDecoration(
  map: GeneratedMap | undefined,
): readonly FloorDecoration[] {
  if (!map) return [];

  const { width, height, tiles, rooms, doors, spawns, seed } = map;
  const excluded = new Set<string>();
  for (const door of doors) excluded.add(tileKey(door.x, door.y));
  excluded.add(tileKey(spawns.player.x, spawns.player.y));
  excluded.add(tileKey(spawns.enemy.x, spawns.enemy.y));

  const roomCandidates: Candidate[] = [];
  const corridorCandidates: Candidate[] = [];

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (tiles[y * width + x] !== 'floor') continue;
      if (excluded.has(tileKey(x, y))) continue;
      const candidate: Candidate = {
        x,
        y,
        score: decorationHash(seed, x, y, SCORE_SALT),
      };
      if (roomAt(rooms, x, y)) roomCandidates.push(candidate);
      else corridorCandidates.push(candidate);
    }
  }

  const selected = [
    ...selectCandidates(roomCandidates, FLOOR_DENSITY.room),
    ...selectCandidates(corridorCandidates, FLOOR_DENSITY.corridor),
  ].sort((a, b) => {
    if (a.y !== b.y) return a.y - b.y;
    return a.x - b.x;
  });

  return selected.map((candidate) => ({
    x: candidate.x,
    y: candidate.y,
    area: roomAt(rooms, candidate.x, candidate.y) ? 'room' : 'corridor',
    decal: decalFor(seed, candidate.x, candidate.y),
  }));
}

/** Resumen de solo lectura para `window.__game.snapshot()`. */
export function summarizeDecoration(
  decoration: readonly FloorDecoration[],
): readonly DecorationSummary[] {
  return decoration.map(({ x, y, area, decal }) => ({
    x,
    y,
    type: decal.id,
    area,
  }));
}
