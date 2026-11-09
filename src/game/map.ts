/**
 * Modelo, opciones, PRNG y validadores del mapa generado.
 *
 * Este módulo es puro: no importa DOM, Canvas ni el host. Los validadores y el
 * PRNG se comparten con el generador BSP y con los tests.
 */

import type { EnemyType } from './bestiary';
import type { OpenMouth } from './chambers/core/doors';
import type { Hotspot } from './chambers/core/enemies';
import type { WeaponId } from './equipment';
import type { Position, Tile } from './types';

export type RoomRole = 'large' | 'small' | 'medium';
export type CorridorKind = 'tree' | 'loop';
export type DoorOrientation = 'horizontal' | 'vertical';
export type DoorStyle = 'wood' | 'metal' | 'grated';
export type ExitKind = 'door' | 'stairs-down' | 'stairs-up';
export type ExitTile = 'exit-door' | 'staircase-down' | 'staircase-up';

/** Estilos en el orden estable que usa el generador. */
export const DOOR_STYLES: readonly DoorStyle[] = ['wood', 'metal', 'grated'];

export interface Room {
  readonly id: number;
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  readonly role: RoomRole;
  /**
   * Máscara de suelo ordenada por `y` y luego `x`. Opcional de compatibilidad
   * para fixtures legacy; BSP y todo mapa generado la rellenan siempre.
   */
  readonly cells?: readonly Position[];
  /** Número de celdas de `cells`; opcional junto con `cells`. */
  readonly area?: number;
}

export interface Corridor {
  /** Índice estable dentro de `GeneratedMap.corridors`. */
  readonly id?: number;
  readonly fromRoomId: number;
  readonly toRoomId: number;
  /** Alias de `fromRoomId` para el contrato de producción. */
  readonly roomA?: number;
  /** Alias de `toRoomId` para el contrato de producción. */
  readonly roomB?: number;
  readonly kind: CorridorKind;
  /** 1 = pasillo estrecho; 2 = pasillo ancho con carril lateral tallado. */
  readonly width: 1 | 2;
  readonly doorEligible: boolean;
  /** Línea central ortogonal; el carril del pasillo ancho no se guarda aquí. */
  readonly path: readonly Position[];
  /** Máscara de tiles del pasillo: `path` deduplicado. */
  readonly cells?: readonly Position[];
  /** Longitud de la ruta en tiles. */
  readonly length?: number;
}

export interface Door {
  /** Identificador estable dentro de `GeneratedMap.doors`. */
  readonly id?: number;
  readonly x: number;
  readonly y: number;
  readonly orientation: DoorOrientation;
  /** Sala del hueco. */
  readonly roomId: number;
  readonly style?: DoorStyle;
  /** Alias de `roomId`: sala del hueco. */
  readonly roomA?: number;
  /** La otra sala que conecta la puerta; siempre distinta de `roomA`. */
  readonly roomB?: number;
  /** Índice del corredor que contiene el hueco. */
  readonly corridorId?: number;
  /** `true` si las salas están a 0 tiles de pasillo (puerta directa). */
  readonly direct?: boolean;
}

export interface Spawns {
  /** Sala de spawn. */
  readonly roomId?: number;
  /** Grupo de 6 huecos; `party[0]` es el alias profundo de `player`. */
  readonly party?: readonly Position[];
  readonly player: Position;
  readonly enemy: Position;
  readonly distance: number;
}

/** Entrada de nivel (REQ-013); BSP no la genera en esta tarea. */
export interface Entrance {
  readonly roomId: number;
  readonly position: Position;
}

/** Salida única de nivel (REQ-013); BSP no la genera en esta tarea. */
export interface Exit {
  readonly roomId: number;
  readonly kind: ExitKind;
  readonly position: Position;
  readonly access: Position;
  readonly tile: ExitTile;
  readonly distance: number;
  readonly path: readonly number[];
  readonly fallback: boolean;
}

/** Enemigo ya repartido por el mapa (REQ-012); BSP no lo genera aquí. */
export interface MapEnemy {
  readonly id: string;
  readonly type: EnemyType;
  readonly x: number;
  readonly y: number;
  readonly roomId: number;
  readonly home: Position;
  readonly hidden: boolean;
  readonly interior: boolean;
}

export interface MapOptions {
  readonly mapWidth?: number;
  readonly mapHeight?: number;
  readonly roomTarget?: number;
  readonly roomMin?: number;
  readonly roomMax?: number;
  readonly loopRatio?: number;
  /**
   * Objetivo máximo de pasillos anchos: 0 = automático (1 o 2 según semilla),
   * 1 o 2 fuerzan ese objetivo.
   */
  readonly wideCorridorCount?: number;
  /** Ancho de pasillo ancho; en este corte solo se admite 2. */
  readonly wideCorridorWidth?: number;
}

export interface ResolvedMapOptions {
  readonly mapWidth: number;
  readonly mapHeight: number;
  readonly roomTarget: number;
  readonly roomMin: number;
  readonly roomMax: number;
  readonly loopRatio: number;
  readonly wideCorridorCount: number;
  readonly wideCorridorWidth: number;
}

/** Arma colocada en el mapa: entidad con ID estable, posición y arma. */
export interface MapWeapon {
  readonly id: string;
  readonly weaponId: WeaponId;
  readonly x: number;
  readonly y: number;
}

/** Armas fijas de este corte, en el orden en que se colocan. */
export const MAP_WEAPON_SPECS: readonly {
  readonly id: string;
  readonly weaponId: WeaponId;
}[] = [
  { id: 'weapon-axe', weaponId: 'axe' },
  { id: 'weapon-dagger', weaponId: 'dagger' },
];

export interface GeneratedMap {
  readonly seed: number;
  readonly width: number;
  readonly height: number;
  /** `Tile[]` de `src/game/types.ts` (`'floor' | 'wall'`). */
  readonly tiles: readonly Tile[];
  readonly rooms: readonly Room[];
  readonly corridors: readonly Corridor[];
  /** Huecos de puerta de los accesos estrechos, ordenados y sin duplicados. */
  readonly doors: readonly Door[];
  readonly spawns: Spawns;
  /** Entrada de nivel; opcional y generada por variantes de producción. */
  readonly entrance?: Entrance;
  /** Salida de nivel; opcional y generada por variantes de producción. */
  readonly exit?: Exit | null;
  /** Enemigos repartidos por el mapa; opcionales para mapas manuales. */
  readonly enemies?: readonly MapEnemy[];
  /**
   * Accesos sin puerta calculados por variantes de producción (`growth`).
   * Opcional: BSP y los mapas manuales no lo rellenan.
   */
  readonly openMouths?: readonly OpenMouth[];
  /**
   * Puntos calientes de emboscada calculados por variantes de producción.
   * Opcional para no cambiar el contrato histórico.
   */
  readonly hotspots?: readonly Hotspot[];
  /** Sala caverna de la variante, o `null`/`undefined` si no hay. */
  readonly cavernRoomId?: number | null;
  /**
   * Armas recogibles colocadas por semilla. Opcional para mapas construidos a
   * mano en tests; el generador BSP siempre las incluye.
   */
  readonly weapons?: readonly MapWeapon[];
  readonly warnings: readonly string[];
  readonly options: ResolvedMapOptions;
}

export interface MapGenerator {
  readonly id: string;
  generate(seed: number, options?: MapOptions): GeneratedMap;
}

export const DEFAULT_MAP_SEED = 279837264;

export const DEFAULT_MAP_OPTIONS: ResolvedMapOptions = {
  mapWidth: 32,
  mapHeight: 32,
  roomTarget: 9,
  roomMin: 4,
  roomMax: 11,
  loopRatio: 20,
  wideCorridorCount: 0,
  wideCorridorWidth: 2,
};

/** Semilla normalizada a entero sin signo de 32 bits. */
export function normalizeSeed(seed: number): number {
  if (!Number.isFinite(seed)) return DEFAULT_MAP_SEED;
  return Math.trunc(seed) >>> 0;
}

/** PRNG local determinista (mulberry32). No lee relojes ni estado global. */
export function mulberry32(seed: number): () => number {
  let value = normalizeSeed(seed);
  return () => {
    value = (value + 0x6d2b79f5) >>> 0;
    let result = value;
    result = Math.imul(result ^ (result >>> 15), result | 1);
    result ^= result + Math.imul(result ^ (result >>> 7), result | 61);
    return ((result ^ (result >>> 14)) >>> 0) / 4294967296;
  };
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function randInt(rng: () => number, min: number, max: number): number {
  if (max <= min) return min;
  return min + Math.floor(rng() * (max - min + 1));
}

export interface ResolvedMapOptionsResult {
  readonly options: ResolvedMapOptions;
  readonly warnings: readonly string[];
}

/**
 * Resuelve y normaliza las opciones. Nunca lanza: los valores imposibles se
 * corrigen y se registra un aviso honesto.
 */
export function resolveMapOptions(options: MapOptions = {}): ResolvedMapOptionsResult {
  const warnings: string[] = [];
  const defaults = DEFAULT_MAP_OPTIONS;

  const mapWidth = resolveIntegerOption(
    options.mapWidth,
    defaults.mapWidth,
    20,
    4096,
    'Ancho del mapa',
    warnings,
  );
  const mapHeight = resolveIntegerOption(
    options.mapHeight,
    defaults.mapHeight,
    20,
    4096,
    'Alto del mapa',
    warnings,
  );

  const roomTarget = resolveIntegerOption(
    options.roomTarget,
    defaults.roomTarget,
    8,
    12,
    'Salas objetivo',
    warnings,
  );
  const roomMin = resolveIntegerOption(
    options.roomMin,
    defaults.roomMin,
    3,
    6,
    'Sala mínima',
    warnings,
  );
  const roomMax = resolveIntegerOption(
    options.roomMax,
    defaults.roomMax,
    8,
    11,
    'Sala máxima',
    warnings,
  );

  const normalizedRoomMin = Math.min(roomMin, roomMax);
  if (normalizedRoomMin !== roomMin) {
    warnings.push(
      `Sala mínima ${roomMin} mayor que sala máxima ${roomMax}; se usa ${normalizedRoomMin}.`,
    );
  }

  let loopRatio = defaults.loopRatio;
  if (options.loopRatio !== undefined) {
    const rawLoop = Number(options.loopRatio);
    const stepped = Number.isFinite(rawLoop)
      ? clamp(Math.round(rawLoop / 5) * 5, 0, 40)
      : defaults.loopRatio;
    loopRatio = stepped;
    if (stepped !== rawLoop) {
      warnings.push(`Bucles normalizados de ${rawLoop} % a ${stepped} %.`);
    }
  }

  let wideCorridorCount = defaults.wideCorridorCount;
  if (options.wideCorridorCount !== undefined) {
    const rawWide = Number(options.wideCorridorCount);
    const clampedCount = Number.isFinite(rawWide)
      ? clamp(Math.trunc(rawWide), 0, 2)
      : defaults.wideCorridorCount;
    if (clampedCount !== rawWide) {
      warnings.push(`Pasillos anchos normalizados de ${rawWide} a ${clampedCount}.`);
    }
    wideCorridorCount = clampedCount;
  }

  let wideCorridorWidth = defaults.wideCorridorWidth;
  if (options.wideCorridorWidth !== undefined) {
    const rawWidth = Number(options.wideCorridorWidth);
    // En este corte el único ancho válido es 2; el 3 queda fuera de alcance.
    wideCorridorWidth = Number.isFinite(rawWidth) ? 2 : defaults.wideCorridorWidth;
    if (wideCorridorWidth !== rawWidth) {
      warnings.push(
        `Ancho de pasillo ancho normalizado de ${rawWidth} a ${wideCorridorWidth}: solo se admite 2 en este corte.`,
      );
    }
  }

  return {
    options: {
      mapWidth,
      mapHeight,
      roomTarget,
      roomMin: normalizedRoomMin,
      roomMax,
      loopRatio,
      wideCorridorCount,
      wideCorridorWidth,
    },
    warnings,
  };
}

function resolveIntegerOption(
  value: number | undefined,
  fallback: number,
  min: number,
  max: number,
  label: string,
  warnings: string[],
): number {
  if (value === undefined) return fallback;
  const raw = Number(value);
  if (!Number.isFinite(raw)) {
    warnings.push(`${label} no numérico; se usa ${fallback}.`);
    return fallback;
  }
  const resolved = clamp(Math.trunc(raw), min, max);
  if (resolved !== raw) {
    warnings.push(`${label} normalizado de ${raw} a ${resolved}.`);
  }
  return resolved;
}

// ---------------------------------------------------------------------------
// Clasificación y geometría
// ---------------------------------------------------------------------------

export function isLargeRoom(room: Pick<Room, 'width' | 'height'>): boolean {
  return room.width >= 7 && room.height >= 7 && room.width <= 11 && room.height <= 11;
}

export function isSmallRoom(room: Pick<Room, 'width' | 'height'>): boolean {
  return room.width >= 3 && room.height >= 3 && room.width <= 5 && room.height <= 5;
}

export function isMediumRoom(room: Pick<Room, 'width' | 'height'>): boolean {
  return room.width >= 6 && room.height >= 6 && room.width <= 8 && room.height <= 8;
}

export function classifyRoom(room: Pick<Room, 'width' | 'height'>): RoomRole {
  if (isLargeRoom(room)) return 'large';
  if (isSmallRoom(room)) return 'small';
  return 'medium';
}

export function roomCenter(room: Pick<Room, 'x' | 'y' | 'width' | 'height'>): Position {
  return {
    x: room.x + Math.floor(room.width / 2),
    y: room.y + Math.floor(room.height / 2),
  };
}

export interface RoomShape {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  readonly cells?: readonly Position[];
}

/**
 * Pertenencia a sala. Si existe máscara (`cells`), la celda debe estar en ella;
 * una celda de la caja sin suelo no pertenece a la sala. Sin máscara se usa la
 * caja como fallback de compatibilidad para fixtures legacy.
 */
export function roomContains(room: RoomShape, x: number, y: number): boolean {
  if (room.cells) {
    return room.cells.some((cell) => cell.x === x && cell.y === y);
  }
  return x >= room.x && y >= room.y && x < room.x + room.width && y < room.y + room.height;
}

export function roomAt(
  rooms: readonly Room[],
  x: number,
  y: number,
): Room | undefined {
  return rooms.find((room) => roomContains(room, x, y));
}

/**
 * Comprueba si dos rectángulos se tocan o quedan a menos de `padding` tiles.
 * Con `padding = 1` exige al menos una celda de muro entre ambas salas.
 */
export function rectsOverlap(
  a: Pick<Room, 'x' | 'y' | 'width' | 'height'>,
  b: Pick<Room, 'x' | 'y' | 'width' | 'height'>,
  padding = 0,
): boolean {
  return (
    a.x - padding < b.x + b.width &&
    b.x - padding < a.x + a.width &&
    a.y - padding < b.y + b.height &&
    b.y - padding < a.y + a.height
  );
}

export function roomsOverlap(
  rooms: readonly Room[],
): readonly [number, number] | null {
  for (let first = 0; first < rooms.length; first += 1) {
    for (let second = first + 1; second < rooms.length; second += 1) {
      if (rectsOverlap(rooms[first], rooms[second], 0)) {
        return [rooms[first].id, rooms[second].id];
      }
    }
  }
  return null;
}

/** Devuelve el primer par de salas sin al menos un tile de muro entre ellas. */
export function roomsWithoutSeparation(
  rooms: readonly Room[],
): readonly [number, number] | null {
  for (let first = 0; first < rooms.length; first += 1) {
    for (let second = first + 1; second < rooms.length; second += 1) {
      if (rectsOverlap(rooms[first], rooms[second], 1)) {
        return [rooms[first].id, rooms[second].id];
      }
    }
  }
  return null;
}

/** Distancia Manhattan entre dos posiciones. */
export function manhattan(a: Position, b: Position): number {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}

/** Una ruta ortogonal avanza exactamente 1 tile Manhattan en cada paso. */
export function isOrthogonalPath(path: readonly Position[]): boolean {
  for (let index = 1; index < path.length; index += 1) {
    if (manhattan(path[index - 1], path[index]) !== 1) return false;
  }
  return true;
}

export function dedupePath(path: readonly Position[]): Position[] {
  const result: Position[] = [];
  for (const point of path) {
    const last = result[result.length - 1];
    if (!last || last.x !== point.x || last.y !== point.y) result.push(point);
  }
  return result;
}

// ---------------------------------------------------------------------------
// Consultas sobre la rejilla
// ---------------------------------------------------------------------------

export type GridLike = Pick<GeneratedMap, 'width' | 'height' | 'tiles'>;

export function tileIndex(width: number, x: number, y: number): number {
  return y * width + x;
}

export function isFloorTile(grid: GridLike, x: number, y: number): boolean {
  if (x < 0 || y < 0 || x >= grid.width || y >= grid.height) return false;
  return grid.tiles[tileIndex(grid.width, x, y)] === 'floor';
}

/**
 * Distancias BFS sobre suelo. Devuelve `-1` en muros y celdas inalcanzables.
 */
export function floorDistances(
  grid: GridLike,
  from: Position,
): Int32Array {
  const { width, height, tiles } = grid;
  const distances = new Int32Array(width * height).fill(-1);
  if (!isFloorTile(grid, from.x, from.y)) return distances;

  const start = tileIndex(width, from.x, from.y);
  distances[start] = 0;
  const queue = new Int32Array(width * height);
  queue[0] = start;
  let head = 0;
  let tail = 1;

  const visit = (x: number, y: number, currentDistance: number): void => {
    if (x < 0 || y < 0 || x >= width || y >= height) return;
    const index = tileIndex(width, x, y);
    if (tiles[index] !== 'floor' || distances[index] !== -1) return;
    distances[index] = currentDistance + 1;
    queue[tail] = index;
    tail += 1;
  };

  while (head < tail) {
    const current = queue[head];
    head += 1;
    const x = current % width;
    const y = (current - x) / width;
    const nextDistance = distances[current];
    visit(x, y - 1, nextDistance);
    visit(x + 1, y, nextDistance);
    visit(x, y + 1, nextDistance);
    visit(x - 1, y, nextDistance);
  }

  return distances;
}

export function reachableFloor(grid: GridLike, from: Position): number {
  const distances = floorDistances(grid, from);
  let count = 0;
  for (let index = 0; index < distances.length; index += 1) {
    if (distances[index] >= 0) count += 1;
  }
  return count;
}

export function totalFloor(grid: GridLike): number {
  let count = 0;
  for (const tile of grid.tiles) {
    if (tile === 'floor') count += 1;
  }
  return count;
}

export function connectivityPercentage(grid: GridLike, from: Position): number {
  const total = totalFloor(grid);
  if (total === 0) return 0;
  return (reachableFloor(grid, from) / total) * 100;
}

// ---------------------------------------------------------------------------
// Armas del mapa (REQ-010 R-005/T-007)
// ---------------------------------------------------------------------------

/** PRNG propio de la colocación; no comparte estado con el generador ni el combate. */
const WEAPON_PLACEMENT_SALT = 0x51ed270b;

function eligibleWeaponCells(
  map: Pick<GeneratedMap, 'width' | 'height' | 'tiles' | 'rooms' | 'doors' | 'spawns'>,
  room: Room,
  distances: Int32Array,
  blockedKeys: ReadonlySet<string>,
): Position[] {
  const doorKeys = new Set(map.doors.map((door) => `${door.x},${door.y}`));
  const spawnKeys = new Set([
    ...(map.spawns.party ?? []).map((hole) => `${hole.x},${hole.y}`),
    `${map.spawns.player.x},${map.spawns.player.y}`,
    `${map.spawns.enemy.x},${map.spawns.enemy.y}`,
  ]);
  const cells: Position[] = [];

  for (let y = room.y; y < room.y + room.height; y += 1) {
    for (let x = room.x; x < room.x + room.width; x += 1) {
      if (!isFloorTile(map, x, y)) continue;
      // La caja de una sala irregular (caverna) puede contener suelo de pasillo;
      // solo cuenta la máscara real cuando existe.
      if (!roomContains(room, x, y)) continue;
      if (distances[tileIndex(map.width, x, y)] < 0) continue;
      const key = `${x},${y}`;
      if (doorKeys.has(key) || spawnKeys.has(key) || blockedKeys.has(key)) continue;
      cells.push({ x, y });
    }
  }

  return cells;
}

/** Celdas adicionales que ninguna arma debe ocupar (salida, enemigos, etc.). */
export interface PlaceMapWeaponsOptions {
  readonly blockedCells?: readonly Position[];
}

/**
 * Coloca el hacha y la daga de forma determinista a partir de la semilla y del
 * mapa: dos salas distintas, fuera de la sala inicial, alcanzables desde la
 * aparición del jugador y sin caer en muro, puerta ni aparición.
 *
 * Usa un `mulberry32` derivado de la semilla con una sal propia. No consume ni
 * reordena la secuencia del generador BSP ni la del RNG de combate. El parámetro
 * opcional `blockedCells` no altera el PRNG: solo filtra candidatos.
 */
export function placeMapWeapons(
  map: Pick<
    GeneratedMap,
    'seed' | 'width' | 'height' | 'tiles' | 'rooms' | 'doors' | 'spawns'
  >,
  options: PlaceMapWeaponsOptions = {},
): readonly MapWeapon[] {
  const distances = floorDistances(map, map.spawns.player);
  const initialRoom = roomAt(map.rooms, map.spawns.player.x, map.spawns.player.y);
  const rng = mulberry32(normalizeSeed(map.seed) ^ WEAPON_PLACEMENT_SALT);
  const usedRoomIds = new Set<number>();
  const blockedKeys = new Set(
    (options.blockedCells ?? []).map((cell) => `${cell.x},${cell.y}`),
  );
  const placed: MapWeapon[] = [];

  for (const spec of MAP_WEAPON_SPECS) {
    const candidates: Array<{ readonly room: Room; readonly cells: readonly Position[] }> = [];

    for (const room of map.rooms) {
      if (room.id === initialRoom?.id) continue;
      if (usedRoomIds.has(room.id)) continue;
      const cells = eligibleWeaponCells(map, room, distances, blockedKeys);
      if (cells.length > 0) candidates.push({ room, cells });
    }

    if (candidates.length === 0) break;

    const candidate = candidates[Math.floor(rng() * candidates.length)];
    const cell = candidate.cells[Math.floor(rng() * candidate.cells.length)];
    usedRoomIds.add(candidate.room.id);
    placed.push({ id: spec.id, weaponId: spec.weaponId, x: cell.x, y: cell.y });
  }

  return placed;
}

// ---------------------------------------------------------------------------
// Validadores geométricos
// ---------------------------------------------------------------------------

/**
 * Huella declarada de los pasillos anchos: celdas del path más las celdas de
 * suelo ortogonalmente adyacentes fuera de salas (el carril tallado). No se
 * guarda el carril en el modelo: se deriva de los tiles.
 */
export function wideCorridorFootprint(
  map: Pick<GeneratedMap, 'width' | 'height' | 'tiles' | 'rooms' | 'corridors'>,
): Uint8Array {
  const { width, height, tiles, rooms, corridors } = map;
  const footprint = new Uint8Array(width * height);

  for (const corridor of corridors) {
    if (corridor.width !== 2) continue;
    for (const point of dedupePath(corridor.path)) {
      footprint[tileIndex(width, point.x, point.y)] = 1;
      for (const [dx, dy] of [
        [0, -1],
        [1, 0],
        [0, 1],
        [-1, 0],
      ] as const) {
        const x = point.x + dx;
        const y = point.y + dy;
        if (x < 0 || y < 0 || x >= width || y >= height) continue;
        if (tiles[tileIndex(width, x, y)] !== 'floor') continue;
        if (roomAt(rooms, x, y)) continue;
        footprint[tileIndex(width, x, y)] = 1;
      }
    }
  }

  return footprint;
}

/**
 * Cuenta bloques 2×2 de suelo fuera de salas y fuera de la huella de un pasillo
 * ancho declarado. Un corredor estrecho nunca debe formar uno; un bloque que
 * toca una sala se considera parte de la sala.
 */
export function countWideFloor(
  map: Pick<GeneratedMap, 'width' | 'height' | 'tiles' | 'rooms' | 'corridors'>,
): number {
  const { width, height, tiles, rooms } = map;
  const roomCells = new Uint8Array(width * height);
  for (const room of rooms) {
    if (room.cells) {
      for (const cell of room.cells) roomCells[tileIndex(width, cell.x, cell.y)] = 1;
    } else {
      for (let y = room.y; y < room.y + room.height; y += 1) {
        for (let x = room.x; x < room.x + room.width; x += 1) {
          roomCells[tileIndex(width, x, y)] = 1;
        }
      }
    }
  }
  const footprint = wideCorridorFootprint(map);

  let count = 0;
  for (let y = 0; y < height - 1; y += 1) {
    for (let x = 0; x < width - 1; x += 1) {
      const topLeft = tileIndex(width, x, y);
      const topRight = topLeft + 1;
      const bottomLeft = tileIndex(width, x, y + 1);
      const bottomRight = bottomLeft + 1;
      if (
        tiles[topLeft] === 'floor' &&
        tiles[topRight] === 'floor' &&
        tiles[bottomLeft] === 'floor' &&
        tiles[bottomRight] === 'floor' &&
        !roomCells[topLeft] &&
        !roomCells[topRight] &&
        !roomCells[bottomLeft] &&
        !roomCells[bottomRight] &&
        !(
          footprint[topLeft] &&
          footprint[topRight] &&
          footprint[bottomLeft] &&
          footprint[bottomRight]
        )
      ) {
        count += 1;
      }
    }
  }
  return count;
}

/**
 * Longitud del tramo recto más largo (en tiles del path) con un carril
 * transitable consistente en el mismo lado. Es la comprobación geométrica real
 * de que un `width: 2` tiene dos filas/columnas adyacentes.
 */
export function wideCorridorStretch(
  map: Pick<GeneratedMap, 'width' | 'height' | 'tiles' | 'rooms' | 'corridors'>,
  corridor: Corridor,
): number {
  const { width, height, tiles, rooms, corridors } = map;
  const path = dedupePath(corridor.path);
  if (path.length < 2) return 0;

  const ownPath = new Uint8Array(width * height);
  for (const point of path) {
    if (point.x < 0 || point.y < 0 || point.x >= width || point.y >= height) continue;
    ownPath[tileIndex(width, point.x, point.y)] = 1;
  }

  const otherPath = new Uint8Array(width * height);
  for (const other of corridors) {
    if (other === corridor) continue;
    for (const point of dedupePath(other.path)) {
      if (point.x < 0 || point.y < 0 || point.x >= width || point.y >= height) continue;
      otherPath[tileIndex(width, point.x, point.y)] = 1;
    }
  }

  const laneIsFloor = (x: number, y: number): boolean => {
    if (x < 0 || y < 0 || x >= width || y >= height) return false;
    const index = tileIndex(width, x, y);
    if (ownPath[index] || otherPath[index]) return false;
    if (tiles[index] !== 'floor') return false;
    return roomAt(rooms, x, y) === undefined;
  };

  let longest = 0;
  for (const run of straightPathRuns(path)) {
    const horizontal = run.dy === 0;
    for (const side of [-1, 1] as const) {
      let current = 0;
      for (let index = run.from; index <= run.to; index += 1) {
        const point = path[index];
        const laneX = horizontal ? point.x : point.x + side;
        const laneY = horizontal ? point.y + side : point.y;
        if (laneIsFloor(laneX, laneY)) {
          current += 1;
          if (current > longest) longest = current;
        } else {
          current = 0;
        }
      }
    }
  }

  return longest;
}

/** Longitud del tramo recto más largo de una ruta, en tiles. */
export function longestStraight(path: readonly Position[]): number {
  const points = dedupePath(path);
  if (points.length < 2) return 0;
  let longest = 1;
  let current = 1;
  for (let index = 2; index < points.length; index += 1) {
    const previousX = Math.sign(points[index - 1].x - points[index - 2].x);
    const previousY = Math.sign(points[index - 1].y - points[index - 2].y);
    const currentX = Math.sign(points[index].x - points[index - 1].x);
    const currentY = Math.sign(points[index].y - points[index - 1].y);
    if (previousX === currentX && previousY === currentY) {
      current += 1;
    } else {
      longest = Math.max(longest, current);
      current = 1;
    }
  }
  return Math.max(longest, current);
}

/** Número de esquinas (cambios de dirección) de una ruta. */
export function countPathCorners(path: readonly Position[]): number {
  const points = dedupePath(path);
  let corners = 0;
  for (let index = 1; index < points.length - 1; index += 1) {
    const previous = points[index - 1];
    const current = points[index];
    const next = points[index + 1];
    const inX = Math.sign(current.x - previous.x);
    const inY = Math.sign(current.y - previous.y);
    const outX = Math.sign(next.x - current.x);
    const outY = Math.sign(next.y - current.y);
    if (inX !== outX || inY !== outY) corners += 1;
  }
  return corners;
}

export function pathLength(path: readonly Position[]): number {
  const points = dedupePath(path);
  let length = 0;
  for (let index = 1; index < points.length; index += 1) {
    length += manhattan(points[index - 1], points[index]);
  }
  return length;
}

export interface StraightPathRun {
  /** Índice del primer punto del tramo (incluido). */
  readonly from: number;
  /** Índice del último punto del tramo (incluido). */
  readonly to: number;
  readonly dx: number;
  readonly dy: number;
}

/**
 * Divide una ruta ortogonal en tramos rectos maximales. Los tramos comparten
 * el punto de esquina: el `to` de uno es el `from` del siguiente.
 */
export function straightPathRuns(path: readonly Position[]): StraightPathRun[] {
  const points = dedupePath(path);
  if (points.length < 2) return [];

  const runs: StraightPathRun[] = [];
  let from = 0;
  let dx = Math.sign(points[1].x - points[0].x);
  let dy = Math.sign(points[1].y - points[0].y);

  for (let index = 2; index < points.length; index += 1) {
    const nextDx = Math.sign(points[index].x - points[index - 1].x);
    const nextDy = Math.sign(points[index].y - points[index - 1].y);
    if (nextDx !== dx || nextDy !== dy) {
      runs.push({ from, to: index - 1, dx, dy });
      from = index - 1;
      dx = nextDx;
      dy = nextDy;
    }
  }

  runs.push({ from, to: points.length - 1, dx, dy });
  return runs;
}

/**
 * Longitud del callejón más largo desde su extremo hasta la primera
 * bifurcación (grado ≥ 3) o sala. Devuelve 0 si no hay callejones.
 */
export function maxDeadEndLength(
  map: Pick<GeneratedMap, 'width' | 'height' | 'tiles' | 'rooms'>,
): number {
  const { width, height, tiles, rooms } = map;
  const roomCells = new Uint8Array(width * height);
  for (const room of rooms) {
    if (room.cells) {
      for (const cell of room.cells) roomCells[tileIndex(width, cell.x, cell.y)] = 1;
    } else {
      for (let y = room.y; y < room.y + room.height; y += 1) {
        for (let x = room.x; x < room.x + room.width; x += 1) {
          roomCells[tileIndex(width, x, y)] = 1;
        }
      }
    }
  }

  const degree = (x: number, y: number): number => {
    if (x < 0 || y < 0 || x >= width || y >= height) return 0;
    if (tiles[tileIndex(width, x, y)] !== 'floor') return 0;
    let count = 0;
    if (y > 0 && tiles[tileIndex(width, x, y - 1)] === 'floor') count += 1;
    if (x < width - 1 && tiles[tileIndex(width, x + 1, y)] === 'floor') count += 1;
    if (y < height - 1 && tiles[tileIndex(width, x, y + 1)] === 'floor') count += 1;
    if (x > 0 && tiles[tileIndex(width, x - 1, y)] === 'floor') count += 1;
    return count;
  };

  let longest = 0;
  for (let y = 1; y < height - 1; y += 1) {
    for (let x = 1; x < width - 1; x += 1) {
      const index = tileIndex(width, x, y);
      if (tiles[index] !== 'floor' || roomCells[index]) continue;
      if (degree(x, y) !== 1) continue;

      let length = 1;
      let previousX = -1;
      let previousY = -1;
      let currentX = x;
      let currentY = y;

      for (let guard = 0; guard < width * height; guard += 1) {
        let nextX = -1;
        let nextY = -1;
        let options = 0;
        const neighbours: Array<readonly [number, number]> = [
          [currentX, currentY - 1],
          [currentX + 1, currentY],
          [currentX, currentY + 1],
          [currentX - 1, currentY],
        ];
        for (const [candidateX, candidateY] of neighbours) {
          if (candidateX === previousX && candidateY === previousY) continue;
          if (
            candidateX < 0 ||
            candidateY < 0 ||
            candidateX >= width ||
            candidateY >= height
          ) {
            continue;
          }
          if (tiles[tileIndex(width, candidateX, candidateY)] !== 'floor') continue;
          options += 1;
          nextX = candidateX;
          nextY = candidateY;
        }

        // Una sala cuenta como salida: el callejón acaba en el acceso.
        if (
          nextX < 0 ||
          nextY < 0 ||
          options !== 1 ||
          roomCells[tileIndex(width, nextX, nextY)] ||
          degree(nextX, nextY) >= 3
        ) {
          break;
        }

        previousX = currentX;
        previousY = currentY;
        currentX = nextX;
        currentY = nextY;
        length += 1;
      }

      if (length > longest) longest = length;
    }
  }
  return longest;
}

// ---------------------------------------------------------------------------
// Validación completa del mapa de esta tarea
// ---------------------------------------------------------------------------

export interface MapValidation {
  readonly ok: boolean;
  readonly issues: readonly string[];
}

function roomSlotsAreValid(
  map: Pick<GeneratedMap, 'width' | 'height' | 'tiles' | 'rooms'>,
  room: Room,
  x: number,
  y: number,
  outX: number,
  outY: number,
): boolean {
  const { width, height, tiles } = map;
  if (x < 1 || y < 1 || x > width - 2 || y > height - 2) return false;
  if (tiles[tileIndex(width, x, y)] !== 'floor') return false;
  if (!roomContains(room, x - outX, y - outY)) return false;
  if (roomContains(room, x + outX, y + outY)) return false;

  // Muro a ambos lados perpendiculares al paso.
  if (outX !== 0) {
    if (y - 1 < 0 || y + 1 >= height) return false;
    if (tiles[tileIndex(width, x, y - 1)] !== 'wall') return false;
    if (tiles[tileIndex(width, x, y + 1)] !== 'wall') return false;
  } else {
    if (x - 1 < 0 || x + 1 >= width) return false;
    if (tiles[tileIndex(width, x - 1, y)] !== 'wall') return false;
    if (tiles[tileIndex(width, x + 1, y)] !== 'wall') return false;
  }

  // El hueco solo toca su propia sala.
  const neighbours: Array<readonly [number, number]> = [
    [x, y - 1],
    [x + 1, y],
    [x, y + 1],
    [x - 1, y],
  ];
  for (const [neighbourX, neighbourY] of neighbours) {
    const neighbourRoom = roomAt(map.rooms, neighbourX, neighbourY);
    if (!neighbourRoom) continue;
    if (neighbourRoom.id !== room.id) return false;
    if (neighbourX !== x - outX || neighbourY !== y - outY) return false;
  }

  return true;
}

interface CorridorEndpoint {
  readonly x: number;
  readonly y: number;
  readonly outX: number;
  readonly outY: number;
  readonly roomId: number;
  readonly orientation: DoorOrientation;
}

function corridorEndpointInfos(corridor: Corridor): readonly CorridorEndpoint[] {
  const path = dedupePath(corridor.path);
  if (path.length < 2) return [];

  const start = path[0];
  const second = path[1];
  const end = path[path.length - 1];
  const beforeEnd = path[path.length - 2];

  const startOutX = Math.sign(second.x - start.x);
  const startOutY = Math.sign(second.y - start.y);
  const endOutX = Math.sign(beforeEnd.x - end.x);
  const endOutY = Math.sign(beforeEnd.y - end.y);

  return [
    {
      x: start.x,
      y: start.y,
      outX: startOutX,
      outY: startOutY,
      roomId: corridor.fromRoomId,
      orientation: startOutY !== 0 ? 'horizontal' : 'vertical',
    },
    {
      x: end.x,
      y: end.y,
      outX: endOutX,
      outY: endOutY,
      roomId: corridor.toRoomId,
      orientation: endOutY !== 0 ? 'horizontal' : 'vertical',
    },
  ];
}

function corridorIssues(
  map: Pick<GeneratedMap, 'width' | 'height' | 'tiles' | 'rooms' | 'corridors'>,
  corridor: Corridor,
): readonly string[] {
  const issues: string[] = [];
  const path = dedupePath(corridor.path);
  const label = `Corredor ${corridor.fromRoomId}->${corridor.toRoomId}`;

  if (path.length < 3) {
    issues.push(`${label} demasiado corto.`);
    return issues;
  }
  if (!isOrthogonalPath(path)) {
    issues.push(`${label} no es ortogonal.`);
  }
  if (corridor.width !== 1 && corridor.width !== 2) {
    issues.push(`${label} tiene anchura ${String(corridor.width)} fuera de 1-2.`);
  }
  if (corridor.kind !== 'tree' && corridor.kind !== 'loop') {
    issues.push(`${label} tiene un tipo de corredor desconocido.`);
  }
  if (corridor.width === 1 && !corridor.doorEligible) {
    issues.push(`${label} es estrecho y debería admitir puerta.`);
  }
  if (corridor.width === 2 && corridor.doorEligible) {
    issues.push(`${label} es ancho y no debería admitir puerta.`);
  }

  const fromRoom = map.rooms.find((room) => room.id === corridor.fromRoomId);
  const toRoom = map.rooms.find((room) => room.id === corridor.toRoomId);
  if (!fromRoom) {
    issues.push(`Corredor con sala origen ${corridor.fromRoomId} inexistente.`);
    return issues;
  }
  if (!toRoom) {
    issues.push(`Corredor con sala destino ${corridor.toRoomId} inexistente.`);
    return issues;
  }

  for (const point of path) {
    if (map.tiles[tileIndex(map.width, point.x, point.y)] !== 'floor') {
      issues.push(`${label} pasa por muro.`);
      break;
    }
  }

  for (const endpoint of corridorEndpointInfos(corridor)) {
    const room = endpoint.roomId === fromRoom.id ? fromRoom : toRoom;
    if (
      !roomSlotsAreValid(
        map,
        room,
        endpoint.x,
        endpoint.y,
        endpoint.outX,
        endpoint.outY,
      )
    ) {
      issues.push(`Acceso inválido en la sala ${room.id} de ${label}.`);
    }
  }

  if (corridor.width === 2) {
    if (path.length < 4) {
      issues.push(`${label} ancho con menos de 4 tiles de recorrido.`);
    }
    const stretch = wideCorridorStretch(map, corridor);
    if (stretch < 4) {
      issues.push(`${label} ancho con carril real de solo ${stretch} tiles (<4).`);
    }
  }

  return issues;
}

function doorIssues(
  map: Pick<GeneratedMap, 'width' | 'height' | 'tiles' | 'rooms' | 'corridors'>,
  door: Door,
  endpoints: ReadonlyMap<string, readonly CorridorEndpoint[]>,
  widePath: Uint8Array,
  seen: Set<string>,
): readonly string[] {
  const issues: string[] = [];
  const { width, height, tiles, rooms } = map;
  const key = `${door.x},${door.y}`;

  if (seen.has(key)) {
    issues.push(`Puerta duplicada en (${door.x},${door.y}).`);
  }
  seen.add(key);

  if (
    door.x < 0 ||
    door.y < 0 ||
    door.x >= width ||
    door.y >= height ||
    tiles[tileIndex(width, door.x, door.y)] !== 'floor'
  ) {
    issues.push(`Puerta (${door.x},${door.y}) sobre muro.`);
  }
  const room = rooms.find((candidate) => candidate.id === door.roomId);
  if (!room) {
    issues.push(`Puerta con sala ${door.roomId} inexistente.`);
    return issues;
  }
  if (widePath[tileIndex(width, door.x, door.y)]) {
    issues.push(`Puerta (${door.x},${door.y}) dentro de un pasillo ancho.`);
  }

  if (door.style !== undefined && !DOOR_STYLES.includes(door.style)) {
    issues.push(`Puerta (${door.x},${door.y}) con estilo desconocido.`);
  }

  if (door.roomA !== undefined) {
    if (door.roomA !== door.roomId) {
      issues.push(
        `Puerta (${door.x},${door.y}) con sala A ${door.roomA} distinta de su hueco ${door.roomId}.`,
      );
    }
    if (door.roomB !== undefined) {
      if (door.roomB === door.roomA) {
        issues.push(
          `Puerta (${door.x},${door.y}) conecta dos veces la sala ${door.roomA}; debe unir salas distintas.`,
        );
      }
      const roomA = rooms.find((candidate) => candidate.id === door.roomA);
      const roomB = rooms.find((candidate) => candidate.id === door.roomB);
      if (!roomA) {
        issues.push(`Puerta (${door.x},${door.y}) con sala A ${door.roomA} inexistente.`);
      }
      if (!roomB) {
        issues.push(`Puerta (${door.x},${door.y}) con sala B ${door.roomB} inexistente.`);
      }
      if (door.corridorId !== undefined) {
        const corridor = (map.corridors ?? [])[door.corridorId];
        if (!corridor) {
          issues.push(
            `Puerta (${door.x},${door.y}) con corredor ${door.corridorId} inexistente.`,
          );
        } else {
          const corridorRooms = new Set([corridor.fromRoomId, corridor.toRoomId]);
          if (!corridorRooms.has(door.roomA) || !corridorRooms.has(door.roomB)) {
            issues.push(
              `Puerta (${door.x},${door.y}) no coincide con las salas de su corredor.`,
            );
          }
          const expectedDirect = dedupePath(corridor.path).length <= 2;
          if (door.direct !== undefined && door.direct !== expectedDirect) {
            issues.push(
              `Puerta (${door.x},${door.y}) con direct ${door.direct}; se esperaba ${expectedDirect}.`,
            );
          }
        }
      }
    }
  }

  const matching = (endpoints.get(key) ?? []).find(
    (endpoint) => endpoint.roomId === door.roomId,
  );
  if (!matching) {
    issues.push(
      `Puerta (${door.x},${door.y}) no pertenece a un acceso de corredor estrecho.`,
    );
  } else {
    if (matching.orientation !== door.orientation) {
      issues.push(
        `Puerta (${door.x},${door.y}) con orientación ${door.orientation}; se esperaba ${matching.orientation}.`,
      );
    }
    const behindX = door.x - matching.outX;
    const behindY = door.y - matching.outY;
    if (!roomContains(room, behindX, behindY)) {
      issues.push(
        `Puerta (${door.x},${door.y}) no tiene su sala ${door.roomId} detrás.`,
      );
    }
    for (const [dx, dy] of [
      [0, -1],
      [1, 0],
      [0, 1],
      [-1, 0],
    ] as const) {
      const neighbourRoom = roomAt(rooms, door.x + dx, door.y + dy);
      if (!neighbourRoom) continue;
      if (neighbourRoom.id !== door.roomId) {
        issues.push(
          `Puerta (${door.x},${door.y}) toca la sala ${neighbourRoom.id} además de la ${door.roomId}.`,
        );
      }
      if (door.x + dx !== behindX || door.y + dy !== behindY) {
        issues.push(
          `Puerta (${door.x},${door.y}) no está en un acceso de un solo tile.`,
        );
      }
    }
  }

  const horizontal = door.orientation === 'horizontal';
  if (horizontal) {
    // Muro horizontal: la sala queda al norte o al sur y los lados del hueco
    // son este/oeste.
    if (door.x - 1 < 0 || door.x + 1 >= width) {
      issues.push(`Puerta (${door.x},${door.y}) sin muro perpendicular.`);
    } else if (
      tiles[tileIndex(width, door.x - 1, door.y)] !== 'wall' ||
      tiles[tileIndex(width, door.x + 1, door.y)] !== 'wall'
    ) {
      issues.push(`Puerta (${door.x},${door.y}) está en esquina o sin muro lateral.`);
    }
  } else if (door.y - 1 < 0 || door.y + 1 >= height) {
    issues.push(`Puerta (${door.x},${door.y}) sin muro perpendicular.`);
  } else if (
    tiles[tileIndex(width, door.x, door.y - 1)] !== 'wall' ||
    tiles[tileIndex(width, door.x, door.y + 1)] !== 'wall'
  ) {
    issues.push(`Puerta (${door.x},${door.y}) está en esquina o sin muro lateral.`);
  }

  return issues;
}

/** Valida la máscara de sala cuando existe; los fixtures legacy no la traen. */
function roomMaskIssues(
  map: Pick<GeneratedMap, 'width' | 'height' | 'tiles'>,
  room: Room,
): readonly string[] {
  if (!room.cells) return [];
  const issues: string[] = [];
  const { width, tiles } = map;

  if (room.area === undefined || room.area !== room.cells.length) {
    issues.push(
      `Sala ${room.id} declara área ${String(room.area)} pero tiene ${room.cells.length} celdas.`,
    );
  }

  const seen = new Set<string>();
  let ordered = true;
  let previous: Position | null = null;
  for (const cell of room.cells) {
    const key = `${cell.x},${cell.y}`;
    if (seen.has(key)) issues.push(`Sala ${room.id} repite la celda ${key}.`);
    seen.add(key);

    if (
      cell.x < room.x ||
      cell.y < room.y ||
      cell.x >= room.x + room.width ||
      cell.y >= room.y + room.height
    ) {
      issues.push(`Sala ${room.id} tiene la celda ${key} fuera de su caja.`);
    }
    if (tiles[tileIndex(width, cell.x, cell.y)] !== 'floor') {
      issues.push(`Sala ${room.id} tiene la celda ${key} sobre muro.`);
    }
    if (previous && (cell.y < previous.y || (cell.y === previous.y && cell.x < previous.x))) {
      ordered = false;
    }
    previous = cell;
  }
  if (!ordered) issues.push(`Sala ${room.id} tiene la máscara desordenada.`);

  return issues;
}

/** Valida los campos de producción del pasillo sin tocar las reglas BSP. */
function corridorModelIssues(corridor: Corridor, index: number): readonly string[] {
  const issues: string[] = [];
  if (corridor.id !== undefined && corridor.id !== index) {
    issues.push(`Corredor ${corridor.fromRoomId}->${corridor.toRoomId} con id ${corridor.id} != ${index}.`);
  }
  if (corridor.roomA !== undefined && corridor.roomA !== corridor.fromRoomId) {
    issues.push(
      `Corredor ${corridor.fromRoomId}->${corridor.toRoomId} con roomA ${corridor.roomA} distinto de fromRoomId.`,
    );
  }
  if (corridor.roomB !== undefined && corridor.roomB !== corridor.toRoomId) {
    issues.push(
      `Corredor ${corridor.fromRoomId}->${corridor.toRoomId} con roomB ${corridor.roomB} distinto de toRoomId.`,
    );
  }
  if (corridor.length !== undefined && corridor.length !== pathLength(corridor.path)) {
    issues.push(
      `Corredor ${corridor.fromRoomId}->${corridor.toRoomId} con length ${corridor.length} != ${pathLength(corridor.path)}.`,
    );
  }
  if (corridor.cells) {
    const expected = dedupePath(corridor.path);
    const matches =
      expected.length === corridor.cells.length &&
      expected.every(
        (point, position) =>
          point.x === corridor.cells?.[position].x && point.y === corridor.cells?.[position].y,
      );
    if (!matches) {
      issues.push(`Corredor ${corridor.fromRoomId}->${corridor.toRoomId} con cells != path.`);
    }
  }
  return issues;
}

/** Valida sala, grupo de 6 huecos y alias `player` de las apariciones. */
function spawnModelIssues(
  map: Pick<GeneratedMap, 'width' | 'height' | 'tiles' | 'rooms'>,
  spawns: Spawns,
): readonly string[] {
  const issues: string[] = [];
  const playerRoom = roomAt(map.rooms, spawns.player.x, spawns.player.y);

  if (spawns.roomId !== undefined && playerRoom?.id !== spawns.roomId) {
    issues.push(
      `Sala de spawn declarada ${spawns.roomId} != sala del jugador ${String(playerRoom?.id)}.`,
    );
  }

  if (!spawns.party) return issues;
  if (spawns.party.length !== 6) {
    issues.push(`El grupo de spawn tiene ${spawns.party.length} huecos; se esperaban 6.`);
  }
  const first = spawns.party[0];
  if (!first || first.x !== spawns.player.x || first.y !== spawns.player.y) {
    issues.push('El grupo de spawn no tiene a `player` como alias de `party[0]`.');
  }

  const seen = new Set<string>();
  for (const cell of spawns.party) {
    const key = `${cell.x},${cell.y}`;
    if (seen.has(key)) issues.push(`El grupo de spawn repite la celda ${key}.`);
    seen.add(key);
    if (map.tiles[tileIndex(map.width, cell.x, cell.y)] !== 'floor') {
      issues.push(`El grupo de spawn tiene la celda ${key} sobre muro.`);
      continue;
    }
    const room = roomAt(map.rooms, cell.x, cell.y);
    if (!room) {
      issues.push(`El grupo de spawn tiene la celda ${key} fuera de sala.`);
    } else if (spawns.roomId !== undefined && room.id !== spawns.roomId) {
      issues.push(
        `El grupo de spawn tiene la celda ${key} en la sala ${room.id}, no en ${spawns.roomId}.`,
      );
    }
  }

  return issues;
}

/**
 * Validación estructural del mapa de TASK-0009. No exige un número concreto
 * de salas ni roles: eso depende de las opciones y se valida en los tests.
 */
export function validateGeneratedMap(
  map: Pick<
    GeneratedMap,
    'width' | 'height' | 'tiles' | 'rooms' | 'corridors' | 'doors' | 'spawns'
  > & { readonly warnings?: readonly string[] },
): MapValidation {
  const issues: string[] = [];
  const { width, height, tiles, rooms, corridors, doors, spawns } = map;

  if (!Number.isInteger(width) || !Number.isInteger(height) || width < 20 || height < 20) {
    issues.push('Dimensiones de mapa inválidas.');
  }
  if (tiles.length !== width * height) {
    issues.push('La rejilla no coincide con las dimensiones.');
  }

  for (let x = 0; x < width; x += 1) {
    if (tiles[tileIndex(width, x, 0)] !== 'wall') issues.push('Borde superior abierto.');
    if (tiles[tileIndex(width, x, height - 1)] !== 'wall') issues.push('Borde inferior abierto.');
  }
  for (let y = 0; y < height; y += 1) {
    if (tiles[tileIndex(width, 0, y)] !== 'wall') issues.push('Borde izquierdo abierto.');
    if (tiles[tileIndex(width, width - 1, y)] !== 'wall') issues.push('Borde derecho abierto.');
  }

  const overlapping = roomsOverlap(rooms);
  if (overlapping) {
    issues.push(`Salas ${overlapping[0]} y ${overlapping[1]} se solapan.`);
  }
  const unseparated = roomsWithoutSeparation(rooms);
  if (unseparated) {
    issues.push(`Salas ${unseparated[0]} y ${unseparated[1]} no tienen muro entre ellas.`);
  }

  for (const room of rooms) {
    if (room.x < 1 || room.y < 1 || room.x + room.width > width - 1 || room.y + room.height > height - 1) {
      issues.push(`Sala ${room.id} fuera del área interior.`);
    }
    if (!isLargeRoom(room) && !isSmallRoom(room) && !isMediumRoom(room)) {
      issues.push(`Sala ${room.id} no encaja en ningún rol.`);
    }
    if (classifyRoom(room) !== room.role) {
      issues.push(`Sala ${room.id} tiene rol ${room.role} pero mide ${room.width}×${room.height}.`);
    }
    issues.push(...roomMaskIssues(map, room));
  }

  const narrowEndpoints = new Map<string, CorridorEndpoint[]>();
  const widePath = new Uint8Array(width * height);
  for (let corridorIndex = 0; corridorIndex < corridors.length; corridorIndex += 1) {
    const corridor = corridors[corridorIndex];
    issues.push(...corridorIssues(map, corridor));
    issues.push(...corridorModelIssues(corridor, corridorIndex));
    if (corridor.width === 1) {
      for (const endpoint of corridorEndpointInfos(corridor)) {
        const key = `${endpoint.x},${endpoint.y}`;
        const list = narrowEndpoints.get(key);
        if (list) list.push(endpoint);
        else narrowEndpoints.set(key, [endpoint]);
      }
    } else {
      for (const point of dedupePath(corridor.path)) {
        widePath[tileIndex(width, point.x, point.y)] = 1;
      }
    }
  }

  const doorKeys = new Set<string>();
  for (const door of doors) {
    issues.push(...doorIssues(map, door, narrowEndpoints, widePath, doorKeys));
  }

  for (const room of rooms) {
    const roomDoors = doors.filter((door) => door.roomId === room.id);
    if (roomDoors.length < 1 || roomDoors.length > 3) {
      issues.push(`Sala ${room.id} tiene ${roomDoors.length} huecos; se esperaban 1-3.`);
    }
    const hasNarrowAccess = corridors.some(
      (corridor) =>
        corridor.width === 1 &&
        (corridor.fromRoomId === room.id || corridor.toRoomId === room.id),
    );
    if (!hasNarrowAccess) {
      issues.push(`Sala ${room.id} sin ningún acceso estrecho.`);
    }
  }

  if (rooms.length >= 3) {
    const wideCount = corridors.filter((corridor) => corridor.width === 2).length;
    if (wideCount < 1 || wideCount > 2) {
      const warned = (map.warnings ?? []).some((warning) =>
        /pasillos? anchos? ajustados/i.test(warning),
      );
      if (!warned) {
        issues.push(`Pasillos anchos ${wideCount} fuera de 1-2.`);
      }
    }
  }

  if (!isFloorTile(map, spawns.player.x, spawns.player.y)) {
    issues.push('Jugador sobre muro.');
  }
  if (!isFloorTile(map, spawns.enemy.x, spawns.enemy.y)) {
    issues.push('Enemigo sobre muro.');
  }
  const playerRoom = roomAt(rooms, spawns.player.x, spawns.player.y);
  const enemyRoom = roomAt(rooms, spawns.enemy.x, spawns.enemy.y);
  if (!playerRoom) issues.push('Jugador fuera de sala.');
  if (!enemyRoom) issues.push('Enemigo fuera de sala.');
  if (playerRoom && enemyRoom && playerRoom.id === enemyRoom.id) {
    issues.push('Jugador y enemigo comparten sala.');
  }

  issues.push(...spawnModelIssues(map, spawns));

  const distances = floorDistances(map, spawns.player);
  const enemyDistance = distances[tileIndex(width, spawns.enemy.x, spawns.enemy.y)];
  if (enemyDistance !== spawns.distance) {
    issues.push(`Distancia declarada ${spawns.distance} != BFS ${enemyDistance}.`);
  }

  const connectivity = connectivityPercentage(map, spawns.player);
  if (connectivity < 99.999) {
    issues.push(`Conectividad ${connectivity.toFixed(2)} % < 100 %.`);
  }

  const wide = countWideFloor(map);
  if (wide > 0) {
    issues.push(`${wide} bloques 2×2 de suelo fuera de salas.`);
  }

  return { ok: issues.length === 0, issues };
}
