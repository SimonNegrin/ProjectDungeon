/**
 * Damero programático y decoración plana del suelo.
 *
 * Este módulo es puro: no conoce DOM, Canvas, relojes ni `Math.random`. La
 * paridad, las paletas, los ambientes, la lista blanca, las densidades y el
 * hash son funciones deterministas que el render y el snapshot de debug
 * comparten.
 */

import { roomAt, type GeneratedMap, type Room } from '../game/map';
import type { SpriteRect } from './assets';
import { DECAL_RECTS } from './assets';

export type FloorArea = 'room' | 'corridor';

/** Ambiente dominante de una sala; `mixed` no impone una familia. */
export type FloorAmbient = 'humid' | 'death' | 'ruin' | 'vegetation' | 'mixed';

/** Paleta curada asignada por contraste con el ambiente. */
export type FloorPaletteId = 'neutral' | 'humid' | 'death' | 'ruin' | 'vegetation';

export type DecalFamily =
  | 'pebbles'
  | 'grass'
  | 'dirt'
  | 'blueBrick'
  | 'bones'
  | 'redBrick'
  | 'plant'
  | 'mushroom'
  | 'corpse'
  | 'blood';

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
  readonly ambient: FloorAmbient;
  readonly family: DecalFamily;
  readonly decal: DecalDefinition;
}

/** Resumen serializable de una decoración; es lo que expone el snapshot. */
export interface DecorationSummary {
  readonly x: number;
  readonly y: number;
  readonly type: string;
  readonly family: DecalFamily;
  readonly ambient: FloorAmbient;
  readonly area: FloorArea;
}

/** Paleta asignada a una sala, también expuesta por el snapshot. */
export interface RoomPalette {
  readonly roomId: number;
  readonly ambient: FloorAmbient;
  readonly palette: FloorPaletteId;
  readonly base: string;
  readonly second: string;
}

/** Base común de toda la mazmorra (Modelo A). */
export const FLOOR_BASE = '#0d1519' as const;

export interface FloorPalette {
  readonly base: string;
  readonly second: string;
}

/** Cinco paletas curadas; el segundo tono no imita el color del ambiente. */
export const FLOOR_PALETTES: Readonly<Record<FloorPaletteId, FloorPalette>> = {
  neutral: { base: FLOOR_BASE, second: '#16232b' },
  humid: { base: FLOOR_BASE, second: '#142528' },
  death: { base: FLOOR_BASE, second: '#2a2026' },
  ruin: { base: FLOOR_BASE, second: '#2b2419' },
  vegetation: { base: FLOOR_BASE, second: '#24261f' },
};

/** Mapeo determinista ambiente → paleta. `mixed` usa la neutra. */
export const AMBIENT_PALETTE: Readonly<Record<FloorAmbient, FloorPaletteId>> = {
  humid: 'humid',
  death: 'death',
  ruin: 'ruin',
  vegetation: 'vegetation',
  mixed: 'neutral',
};

/** Paridad global del damero: no depende de sala, cámara ni semilla. */
export function floorParity(x: number, y: number): 0 | 1 {
  return ((x + y) % 2 + 2) % 2 === 1 ? 1 : 0;
}

/** Color plano de un tile de suelo según paridad y paleta. */
export function floorColor(
  x: number,
  y: number,
  palette: FloorPaletteId = 'neutral',
): string {
  const colors = FLOOR_PALETTES[palette];
  return floorParity(x, y) === 0 ? colors.base : colors.second;
}

export interface DensityRange {
  readonly min: number;
  readonly target: number;
  readonly max: number;
}

export const FLOOR_DENSITY: Readonly<Record<FloorArea, DensityRange>> = {
  room: { min: 0.32, target: 0.35, max: 0.38 },
  corridor: { min: 0.13, target: 0.16, max: 0.19 },
};

/**
 * Lista blanca de 31 decals planos aprobados en `REQ-008` y revisados por
 * `REQ-017`.
 *
 * Piedritas 7.e-g, hierba 8.e-g, tierra 9.e-g, ladrillo azul 10.e-g, huesos
 * 11.e-g, ladrillo rojo 12.e-g, siete plantas pequeñas 20.a/b/e/l/n/o/p,
 * setas 21.a-b y sangre/slime 23.a-d. Los cadáveres 22.a-b se reservan para
 * muertes reales y no son decoración ambiental. Quedan fuera cofres, barriles,
 * rocas, escaleras, fosos, cultivos altos o cualquier prop que pueda parecer
 * sólido o interactivo.
 */
export const DECAL_WHITELIST: readonly DecalDefinition[] = [
  { id: 'pebbles-7e', family: 'pebbles', rect: DECAL_RECTS.pebbles7e },
  { id: 'pebbles-7f', family: 'pebbles', rect: DECAL_RECTS.pebbles7f },
  { id: 'pebbles-7g', family: 'pebbles', rect: DECAL_RECTS.pebbles7g },
  { id: 'grass-8e', family: 'grass', rect: DECAL_RECTS.grass8e },
  { id: 'grass-8f', family: 'grass', rect: DECAL_RECTS.grass8f },
  { id: 'grass-8g', family: 'grass', rect: DECAL_RECTS.grass8g },
  { id: 'dirt-9e', family: 'dirt', rect: DECAL_RECTS.dirt9e },
  { id: 'dirt-9f', family: 'dirt', rect: DECAL_RECTS.dirt9f },
  { id: 'dirt-9g', family: 'dirt', rect: DECAL_RECTS.dirt9g },
  { id: 'blueBrick-10e', family: 'blueBrick', rect: DECAL_RECTS.blueBrick10e },
  { id: 'blueBrick-10f', family: 'blueBrick', rect: DECAL_RECTS.blueBrick10f },
  { id: 'blueBrick-10g', family: 'blueBrick', rect: DECAL_RECTS.blueBrick10g },
  { id: 'bones-11e', family: 'bones', rect: DECAL_RECTS.bones11e },
  { id: 'bones-11f', family: 'bones', rect: DECAL_RECTS.bones11f },
  { id: 'bones-11g', family: 'bones', rect: DECAL_RECTS.bones11g },
  { id: 'redBrick-12e', family: 'redBrick', rect: DECAL_RECTS.redBrick12e },
  { id: 'redBrick-12f', family: 'redBrick', rect: DECAL_RECTS.redBrick12f },
  { id: 'redBrick-12g', family: 'redBrick', rect: DECAL_RECTS.redBrick12g },
  { id: 'plant-20a', family: 'plant', rect: DECAL_RECTS.plant20a },
  { id: 'plant-20b', family: 'plant', rect: DECAL_RECTS.plant20b },
  { id: 'plant-20e', family: 'plant', rect: DECAL_RECTS.plant20e },
  { id: 'plant-20l', family: 'plant', rect: DECAL_RECTS.plant20l },
  { id: 'plant-20n', family: 'plant', rect: DECAL_RECTS.plant20n },
  { id: 'plant-20o', family: 'plant', rect: DECAL_RECTS.plant20o },
  { id: 'plant-20p', family: 'plant', rect: DECAL_RECTS.plant20p },
  { id: 'mushroom-21a', family: 'mushroom', rect: DECAL_RECTS.mushroom21a },
  { id: 'mushroom-21b', family: 'mushroom', rect: DECAL_RECTS.mushroom21b },
  { id: 'blood-23a', family: 'blood', rect: DECAL_RECTS.blood23a },
  { id: 'blood-23b', family: 'blood', rect: DECAL_RECTS.blood23b },
  { id: 'blood-23c', family: 'blood', rect: DECAL_RECTS.blood23c },
  { id: 'blood-23d', family: 'blood', rect: DECAL_RECTS.blood23d },
];

/** Familias de la lista blanca, agrupadas para la selección determinista. */
export const DECAL_FAMILIES: Readonly<
  Record<DecalFamily, readonly DecalDefinition[]>
> = {
  pebbles: DECAL_WHITELIST.filter((decal) => decal.family === 'pebbles'),
  grass: DECAL_WHITELIST.filter((decal) => decal.family === 'grass'),
  dirt: DECAL_WHITELIST.filter((decal) => decal.family === 'dirt'),
  blueBrick: DECAL_WHITELIST.filter((decal) => decal.family === 'blueBrick'),
  bones: DECAL_WHITELIST.filter((decal) => decal.family === 'bones'),
  redBrick: DECAL_WHITELIST.filter((decal) => decal.family === 'redBrick'),
  plant: DECAL_WHITELIST.filter((decal) => decal.family === 'plant'),
  mushroom: DECAL_WHITELIST.filter((decal) => decal.family === 'mushroom'),
  // Reservado para la presentación de muerte; nunca se elige como decoración.
  corpse: [],
  blood: DECAL_WHITELIST.filter((decal) => decal.family === 'blood'),
};

const ALL_FAMILIES: readonly DecalFamily[] = [
  'pebbles',
  'grass',
  'dirt',
  'blueBrick',
  'bones',
  'redBrick',
  'plant',
  'mushroom',
  'blood',
];

/**
 * Familias dominantes por ambiente. Se eligen por contraste con el segundo
 * tono, no para imitar el color del suelo. `mixed` acepta todas.
 */
export const AMBIENT_FAMILIES: Readonly<
  Record<FloorAmbient, readonly DecalFamily[]>
> = {
  humid: ['mushroom', 'blood', 'grass', 'plant', 'dirt'],
  death: ['blood', 'bones', 'redBrick', 'dirt'],
  ruin: ['pebbles', 'blueBrick', 'dirt', 'bones'],
  vegetation: ['grass', 'plant', 'mushroom', 'pebbles'],
  mixed: ALL_FAMILIES,
};

const SCORE_SALT = 0x9e3779b9;
const FOCUS_SALT = 0x5be0cd19;
const MIX_SALT = 0x7f4a7c15;
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

const AMBIENT_ORDER: readonly FloorAmbient[] = [
  'humid',
  'death',
  'ruin',
  'vegetation',
  'mixed',
];

/**
 * Ambiente dominante determinista de una sala a partir de la semilla.
 *
 * La semilla fija un desplazamiento sobre el ciclo de cinco ambientes y las
 * salas lo recorren por `id`. Así una mazmorra con cinco o más salas siempre
 * muestra humedad, muerte, ruina y vegetación, sin depender de una tirada que
 * podría dejar un tema fuera. Dos salas separadas por cinco ids comparten tema.
 */
export function roomAmbientFor(map: GeneratedMap, room: Room): FloorAmbient {
  const offset = (map.seed >>> 0) % AMBIENT_ORDER.length;
  return AMBIENT_ORDER[(room.id + offset) % AMBIENT_ORDER.length];
}

/** Paleta de una sala; pasillos y umbrales usan la neutra. */
export function paletteForRoom(map: GeneratedMap, room: Room): FloorPaletteId {
  return AMBIENT_PALETTE[roomAmbientFor(map, room)];
}

/** Paleta de un tile: la de su sala o la neutra fuera de toda sala. */
export function paletteAt(
  map: GeneratedMap | undefined,
  x: number,
  y: number,
): FloorPaletteId {
  if (!map) return 'neutral';
  // Los umbrales de puerta son neutros aunque caigan dentro del rectángulo de
  // una sala: el cambio de paleta ocurre al cruzar la puerta.
  if (map.doors.some((door) => door.x === x && door.y === y)) return 'neutral';
  const room = roomAt(map.rooms, x, y);
  return room ? paletteForRoom(map, room) : 'neutral';
}

/** Color plano de un tile del mapa; sin mapa usa la paleta neutra. */
export function floorColorFor(
  map: GeneratedMap | undefined,
  x: number,
  y: number,
): string {
  return floorColor(x, y, paletteAt(map, x, y));
}

/** Paletas de las salas, en orden de mapa; el snapshot las expone. */
export function roomPalettesFor(
  map: GeneratedMap | undefined,
): readonly RoomPalette[] {
  if (!map) return [];
  return map.rooms.map((room) => {
    const ambient = roomAmbientFor(map, room);
    const palette = AMBIENT_PALETTE[ambient];
    const colors = FLOOR_PALETTES[palette];
    return {
      roomId: room.id,
      ambient,
      palette,
      base: colors.base,
      second: colors.second,
    };
  });
}

export interface RoomFocus {
  readonly x: number;
  readonly y: number;
  readonly radius: number;
}

/**
 * Focos locales deterministas de una sala. Algunas salas son solo dispersas:
 * devuelven cero focos y la selección usa únicamente el ruido por coordenada.
 */
export function roomFocusesFor(
  map: GeneratedMap,
  room: Room,
): readonly RoomFocus[] {
  const offset = (map.seed >>> 0) % 5;
  if ((room.id + offset) % 5 === 0) return [];

  const count =
    1 + (decorationHash(map.seed, room.x, room.y, FOCUS_SALT) % 3);
  const width = Math.max(1, room.width - 2);
  const height = Math.max(1, room.height - 2);
  const focuses: RoomFocus[] = [];
  for (let index = 0; index < count; index += 1) {
    const hash = decorationHash(
      map.seed,
      room.id,
      room.x * 13 + room.y * 7 + index,
      FOCUS_SALT + index + 1,
    );
    focuses.push({
      x: room.x + 1 + (hash % width),
      y: room.y + 1 + ((hash >>> 8) % height),
      radius: 2 + ((hash >>> 16) % 2),
    });
  }
  return focuses;
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

function pick<T>(items: readonly T[], hash: number): T {
  return items[hash % items.length];
}

function decalFor(
  seed: number,
  x: number,
  y: number,
  family: DecalFamily,
): DecalDefinition {
  const cells = DECAL_FAMILIES[family];
  return pick(cells, decorationHash(seed, x, y, CELL_SALT));
}

function tileKey(x: number, y: number): string {
  return `${x},${y}`;
}

/**
 * Plan determinista de decoración plana.
 *
 * - Salas: tiles `floor` dentro de un `Room`, agrupados por focos deterministas.
 * - Pasillos: tiles `floor` fuera de toda sala, con mezcla y sin foco.
 * - Umbrales (`doors`) y apariciones (`spawns`) nunca se decoran.
 * - Sin mapa no hay decoración (el damero sigue existiendo).
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

  const focusCache = new Map<number, readonly RoomFocus[]>();
  const focusesOf = (room: Room): readonly RoomFocus[] => {
    const cached = focusCache.get(room.id);
    if (cached) return cached;
    const focuses = roomFocusesFor(map, room);
    focusCache.set(room.id, focuses);
    return focuses;
  };

  const roomCandidates = new Map<number, Candidate[]>();
  const corridorCandidates: Candidate[] = [];

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (tiles[y * width + x] !== 'floor') continue;
      if (excluded.has(tileKey(x, y))) continue;

      const room = roomAt(rooms, x, y);
      let score = decorationHash(seed, x, y, SCORE_SALT);
      if (room) {
        const nearFocus = focusesOf(room).some(
          (focus) =>
            Math.max(Math.abs(x - focus.x), Math.abs(y - focus.y)) <= focus.radius,
        );
        if (nearFocus) score += 0x1_0000_0000;
        const bucket = roomCandidates.get(room.id) ?? [];
        bucket.push({ x, y, score });
        roomCandidates.set(room.id, bucket);
      } else {
        corridorCandidates.push({ x, y, score });
      }
    }
  }

  const selected = [
    ...[...roomCandidates.entries()].flatMap(([roomId, candidates]) => {
      const room = rooms.find((item) => item.id === roomId);
      return selectCandidates(candidates, FLOOR_DENSITY.room).map((candidate) => ({
        ...candidate,
        area: 'room' as const,
        room,
      }));
    }),
    ...selectCandidates(corridorCandidates, FLOOR_DENSITY.corridor).map(
      (candidate) => ({
        ...candidate,
        area: 'corridor' as const,
        room: undefined,
      }),
    ),
  ].sort((a, b) => {
    if (a.y !== b.y) return a.y - b.y;
    return a.x - b.x;
  });

  const mixByRoom = new Map<number, Set<string>>();
  const roomCounts = new Map<number, number>();
  for (const entry of selected) {
    if (!entry.room) continue;
    roomCounts.set(entry.room.id, (roomCounts.get(entry.room.id) ?? 0) + 1);
  }
  for (const [roomId, count] of roomCounts) {
    const room = rooms.find((item) => item.id === roomId);
    if (!room || roomAmbientFor(map, room) === 'mixed') {
      mixByRoom.set(roomId, new Set());
      continue;
    }
    const mixCount = Math.round(count * 0.25);
    const ordered = selected
      .filter((entry) => entry.room?.id === roomId)
      .sort(
        (a, b) =>
          decorationHash(seed, a.x, a.y, MIX_SALT) -
            decorationHash(seed, b.x, b.y, MIX_SALT) ||
          a.y - b.y ||
          a.x - b.x,
      );
    mixByRoom.set(
      roomId,
      new Set(ordered.slice(0, mixCount).map((entry) => tileKey(entry.x, entry.y))),
    );
  }

  return selected.map((entry) => {
    const ambient: FloorAmbient = entry.room
      ? roomAmbientFor(map, entry.room)
      : 'mixed';
    const dominant = AMBIENT_FAMILIES[ambient];
    const isMixed =
      entry.room !== undefined &&
      ambient !== 'mixed' &&
      (mixByRoom.get(entry.room.id)?.has(tileKey(entry.x, entry.y)) ?? false);
    const otherFamilies = ALL_FAMILIES.filter(
      (family) => !dominant.includes(family),
    );
    const families =
      isMixed && otherFamilies.length > 0 ? otherFamilies : dominant;
    const family = pick(
      families,
      decorationHash(seed, entry.x, entry.y, FAMILY_SALT),
    );
    return {
      x: entry.x,
      y: entry.y,
      area: entry.area,
      ambient,
      family,
      decal: decalFor(seed, entry.x, entry.y, family),
    };
  });
}

/** Resumen de solo lectura para `window.__game.snapshot()`. */
export function summarizeDecoration(
  decoration: readonly FloorDecoration[],
): readonly DecorationSummary[] {
  return decoration.map(({ x, y, area, ambient, family, decal }) => ({
    x,
    y,
    type: decal.id,
    family,
    ambient,
    area,
  }));
}
