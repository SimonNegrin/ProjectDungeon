/**
 * Colocación determinista de los cuatro enemigos iniciales (REQ-009 R-010/T-007).
 *
 * El módulo es puro y serializable: deriva las posiciones del mapa generado y
 * de `map.seed`, sin leer relojes, sin DOM y sin aleatoriedad global. Usa un
 * `mulberry32` propio con una sal distinta a la del generador y a la de las
 * armas, de modo que no consume ni reordena sus secuencias.
 */

import { BESTIARY, type EnemyType } from './bestiary';
import {
  floorDistances,
  isFloorTile,
  mulberry32,
  normalizeSeed,
  roomAt,
  tileIndex,
  type GeneratedMap,
  type Room,
} from './map';
import type { Position } from './types';

/** Ficha estable de cada enemigo inicial. Los IDs no cambian entre partidas. */
export interface EnemyPlacementSpec {
  readonly id: string;
  readonly type: EnemyType;
}

/** Orden fijo: 2 centinelas, 1 bruto y 1 cobarde, con IDs `enemy-1..4`. */
export const ENEMY_PLACEMENT_SPECS: readonly EnemyPlacementSpec[] = [
  { id: 'enemy-1', type: 'sentinel' },
  { id: 'enemy-2', type: 'sentinel' },
  { id: 'enemy-3', type: 'brute' },
  { id: 'enemy-4', type: 'coward' },
];

/** Sal propia de la colocación; no comparte estado con el BSP ni con las armas. */
export const ENEMY_PLACEMENT_SALT = 0x4c2f9a17;

/** Separación mínima Chebyshev entre dos enemigos (decisión del brief). */
export const MIN_ENEMY_DISTANCE = 2;
/** Distancia mínima al jugador; la visión máxima es 6, así que 7 evita verlo. */
export const MIN_PLAYER_DISTANCE = 7;
/** Radio de alarma de REQ-009: una pareja debe quedar dentro. */
export const ALARM_RADIUS = 8;
/** Intentos deterministas antes de probar sin el ancla o devolver `null`. */
const MAX_PLACEMENT_ATTEMPTS = 8192;

export interface EnemyPlacement {
  readonly id: string;
  readonly type: EnemyType;
  readonly x: number;
  readonly y: number;
}

interface RoomCells {
  readonly room: Room;
  readonly cells: readonly Position[];
}

type MapForPlacement = Pick<
  GeneratedMap,
  'seed' | 'width' | 'height' | 'tiles' | 'rooms' | 'doors' | 'spawns' | 'weapons'
>;

function chebyshev(a: Pick<Position, 'x' | 'y'>, b: Pick<Position, 'x' | 'y'>): number {
  return Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y));
}

function cellKey(position: Pick<Position, 'x' | 'y'>): string {
  return `${position.x},${position.y}`;
}

function roomIdAt(rooms: readonly Room[], position: Position): number | undefined {
  return roomAt(rooms, position.x, position.y)?.id;
}

/**
 * Celdas válidas agrupadas por sala: suelo alcanzable desde el jugador, fuera
 * de puertas, armas y la aparición del jugador, y a ≥7 Chebyshev del jugador.
 */
function collectRoomCells(map: MapForPlacement): readonly RoomCells[] {
  const distances = floorDistances(map, map.spawns.player);
  const excluded = new Set<string>([
    cellKey(map.spawns.player),
    ...map.doors.map(cellKey),
    ...(map.weapons ?? []).map(cellKey),
  ]);
  const result: RoomCells[] = [];

  for (const room of map.rooms) {
    const cells: Position[] = [];
    for (let y = room.y; y < room.y + room.height; y += 1) {
      for (let x = room.x; x < room.x + room.width; x += 1) {
        if (!isFloorTile(map, x, y)) continue;
        if (distances[tileIndex(map.width, x, y)] < 0) continue;
        if (excluded.has(`${x},${y}`)) continue;
        if (chebyshev({ x, y }, map.spawns.player) < MIN_PLAYER_DISTANCE) continue;
        cells.push({ x, y });
      }
    }
    if (cells.length > 0) result.push({ room, cells });
  }

  return result;
}

function isEligibleAnchor(
  map: MapForPlacement,
  roomCells: readonly RoomCells[],
): RoomCells | null {
  const anchor = map.spawns.enemy;
  const room = roomAt(map.rooms, anchor.x, anchor.y);
  if (!room) return null;

  const bucket = roomCells.find((entry) => entry.room.id === room.id);
  if (!bucket) return null;
  if (!bucket.cells.some((cell) => cell.x === anchor.x && cell.y === anchor.y)) return null;

  return bucket;
}

/** Comprueba todas las restricciones de REQ-009 R-010/T-007. */
function isValidPlacement(
  map: MapForPlacement,
  positions: readonly Position[],
): boolean {
  if (positions.length !== ENEMY_PLACEMENT_SPECS.length) return false;

  const roomIds = new Set<number>();
  for (const position of positions) {
    if (!isFloorTile(map, position.x, position.y)) return false;
    const roomId = roomIdAt(map.rooms, position);
    if (roomId === undefined || roomIds.has(roomId)) return false;
    roomIds.add(roomId);
    if (chebyshev(position, map.spawns.player) < MIN_PLAYER_DISTANCE) return false;
  }

  let hasOpenPair = false;
  let hasIsolated = false;

  for (let first = 0; first < positions.length; first += 1) {
    let isolated = true;
    for (let second = 0; second < positions.length; second += 1) {
      if (first === second) continue;
      const distance = chebyshev(positions[first], positions[second]);
      if (distance < MIN_ENEMY_DISTANCE) return false;
      if (distance <= ALARM_RADIUS) hasOpenPair = true;
      if (distance <= ALARM_RADIUS) isolated = false;
    }
    if (isolated) hasIsolated = true;
  }

  return hasOpenPair && hasIsolated;
}

function shuffled<T>(items: readonly T[], rng: () => number): T[] {
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const other = Math.floor(rng() * (index + 1));
    [copy[index], copy[other]] = [copy[other], copy[index]];
  }
  return copy;
}

function pickCell(roomCells: RoomCells, rng: () => number): Position {
  const index = Math.floor(rng() * roomCells.cells.length);
  return roomCells.cells[Math.min(index, roomCells.cells.length - 1)];
}

/**
 * Busca una combinación válida de 4 salas y celdas. Si `anchorRoom` no es nula,
 * su celda queda fija como primera posición y se eligen otras 3 salas. La
 * búsqueda es determinista: mismo mapa y semilla, mismas posiciones.
 */
function searchPlacement(
  map: MapForPlacement,
  roomCells: readonly RoomCells[],
  rng: () => number,
  anchor: Position | null,
  anchorRoomId: number | null,
): readonly Position[] | null {
  const availableRooms = roomCells.filter((entry) => entry.room.id !== anchorRoomId);
  if (availableRooms.length < (anchor ? 3 : 4)) return null;

  for (let attempt = 0; attempt < MAX_PLACEMENT_ATTEMPTS; attempt += 1) {
    const rooms = shuffled(availableRooms, rng).slice(0, anchor ? 3 : 4);
    const positions: Position[] = anchor ? [anchor] : [];
    for (const room of rooms) positions.push(pickCell(room, rng));

    if (isValidPlacement(map, positions)) return positions;
  }

  return null;
}

function toPlacements(positions: readonly Position[]): readonly EnemyPlacement[] {
  return ENEMY_PLACEMENT_SPECS.map((spec, index) => ({
    id: spec.id,
    type: spec.type,
    x: positions[index].x,
    y: positions[index].y,
  }));
}

/**
 * Coloca exactamente 4 enemigos a partir del mapa y su semilla. Si la aparición
 * histórica `spawns.enemy` cumple las restricciones, se conserva como ancla de
 * `enemy-1`; si no, se derivan las cuatro posiciones del mapa.
 *
 * Devuelve `null` si el mapa no tiene datos de salas suficientes (por ejemplo,
 * un generador inyectado en tests) o no existe combinación válida. No relaja
 * ninguna restricción para rellenar el cupo.
 */
export function placeMapEnemies(
  map: MapForPlacement,
): readonly EnemyPlacement[] | null {
  if (map.rooms.length < ENEMY_PLACEMENT_SPECS.length) return null;

  const roomCells = collectRoomCells(map);
  if (roomCells.length < ENEMY_PLACEMENT_SPECS.length) return null;

  const rng = mulberry32(normalizeSeed(map.seed) ^ ENEMY_PLACEMENT_SALT);
  const anchorBucket = isEligibleAnchor(map, roomCells);

  if (anchorBucket) {
    const anchored = searchPlacement(
      map,
      roomCells,
      rng,
      map.spawns.enemy,
      anchorBucket.room.id,
    );
    if (anchored) return toPlacements(anchored);
  }

  const derived = searchPlacement(map, roomCells, rng, null, null);
  return derived ? toPlacements(derived) : null;
}

/** Radio de visión máximo del bestiario; documenta por qué 7 evita la visión. */
export const MAX_ENEMY_VISION = Math.max(
  ...Object.values(BESTIARY).map((definition) => definition.vision),
);
