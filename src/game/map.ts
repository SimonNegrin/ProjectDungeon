/**
 * Modelo, opciones, PRNG y validadores del mapa generado.
 *
 * Este módulo es puro: no importa DOM, Canvas ni el host. Los validadores y el
 * PRNG se comparten con el generador BSP y con los tests.
 */

import type { Position, Tile } from './types';

export type RoomRole = 'large' | 'small' | 'medium';
export type CorridorKind = 'tree' | 'loop';
export type DoorOrientation = 'horizontal' | 'vertical';

export interface Room {
  readonly id: number;
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  readonly role: RoomRole;
}

export interface Corridor {
  readonly fromRoomId: number;
  readonly toRoomId: number;
  readonly kind: CorridorKind;
  readonly width: 1;
  readonly doorEligible: boolean;
  readonly path: readonly Position[];
}

export interface Door {
  readonly x: number;
  readonly y: number;
  readonly orientation: DoorOrientation;
  readonly roomId: number;
}

export interface Spawns {
  readonly player: Position;
  readonly enemy: Position;
  readonly distance: number;
}

export interface MapOptions {
  readonly mapWidth?: number;
  readonly mapHeight?: number;
  readonly roomTarget?: number;
  readonly roomMin?: number;
  readonly roomMax?: number;
  readonly loopRatio?: number;
  /** Reservado para TASK-0009; en esta tarea se acepta y se ignora. */
  readonly wideCorridorCount?: number;
  /** Reservado para TASK-0009; en esta tarea se acepta y se ignora. */
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

export interface GeneratedMap {
  readonly seed: number;
  readonly width: number;
  readonly height: number;
  /** `Tile[]` de `src/game/types.ts` (`'floor' | 'wall'`). */
  readonly tiles: readonly Tile[];
  readonly rooms: readonly Room[];
  readonly corridors: readonly Corridor[];
  /** Vacío en esta tarea. TASK-0009 lo rellena. */
  readonly doors: readonly Door[];
  readonly spawns: Spawns;
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

  const requestedWideCount = options.wideCorridorCount;
  let wideCorridorCount = 0;
  if (requestedWideCount !== undefined) {
    const rawWide = Number(requestedWideCount);
    const clampedCount = Number.isFinite(rawWide)
      ? clamp(Math.trunc(rawWide), 0, 2)
      : 0;
    if (clampedCount !== rawWide) {
      warnings.push(`Pasillos anchos normalizados de ${rawWide} a ${clampedCount}.`);
    }
    if (clampedCount > 0) {
      warnings.push(
        'Los pasillos anchos no se implementan en TASK-0008; wideCorridorCount se normaliza a 0.',
      );
    }
  }

  let wideCorridorWidth = defaults.wideCorridorWidth;
  if (options.wideCorridorWidth !== undefined) {
    const rawWidth = Number(options.wideCorridorWidth);
    wideCorridorWidth = Number.isFinite(rawWidth)
      ? clamp(Math.trunc(rawWidth), 2, 3)
      : defaults.wideCorridorWidth;
    if (wideCorridorWidth !== rawWidth) {
      warnings.push(
        `Ancho de pasillo ancho normalizado de ${rawWidth} a ${wideCorridorWidth}.`,
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

export function roomContains(
  room: Pick<Room, 'x' | 'y' | 'width' | 'height'>,
  x: number,
  y: number,
): boolean {
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
// Validadores geométricos
// ---------------------------------------------------------------------------

/**
 * Cuenta bloques 2×2 de suelo fuera de salas. Un corredor estrecho nunca debe
 * formar uno; un bloque que toca una sala se considera parte de la sala.
 */
export function countWideFloor(map: Pick<GeneratedMap, 'width' | 'height' | 'tiles' | 'rooms'>): number {
  const { width, height, tiles, rooms } = map;
  const roomCells = new Uint8Array(width * height);
  for (const room of rooms) {
    for (let y = room.y; y < room.y + room.height; y += 1) {
      for (let x = room.x; x < room.x + room.width; x += 1) {
        roomCells[tileIndex(width, x, y)] = 1;
      }
    }
  }

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
        !roomCells[bottomRight]
      ) {
        count += 1;
      }
    }
  }
  return count;
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
    for (let y = room.y; y < room.y + room.height; y += 1) {
      for (let x = room.x; x < room.x + room.width; x += 1) {
        roomCells[tileIndex(width, x, y)] = 1;
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

function corridorEndpoints(
  map: Pick<GeneratedMap, 'width' | 'height' | 'tiles' | 'rooms'>,
  corridor: Corridor,
): readonly string[] {
  const issues: string[] = [];
  const path = dedupePath(corridor.path);
  if (path.length < 3) {
    issues.push(`Corredor ${corridor.fromRoomId}->${corridor.toRoomId} demasiado corto.`);
    return issues;
  }
  if (!isOrthogonalPath(path)) {
    issues.push(`Corredor ${corridor.fromRoomId}->${corridor.toRoomId} no es ortogonal.`);
  }
  if (corridor.width !== 1) {
    issues.push(`Corredor ${corridor.fromRoomId}->${corridor.toRoomId} no mide 1 tile.`);
  }
  if (!corridor.doorEligible) {
    issues.push(
      `Corredor ${corridor.fromRoomId}->${corridor.toRoomId} debería admitir puerta.`,
    );
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
      issues.push(`Corredor ${corridor.fromRoomId}->${corridor.toRoomId} pasa por muro.`);
      break;
    }
  }

  const start = path[0];
  const second = path[1];
  const end = path[path.length - 1];
  const beforeEnd = path[path.length - 2];

  const startOutX = Math.sign(second.x - start.x);
  const startOutY = Math.sign(second.y - start.y);
  if (!roomSlotsAreValid(map, fromRoom, start.x, start.y, startOutX, startOutY)) {
    issues.push(`Acceso de salida inválido en la sala ${fromRoom.id}.`);
  }

  const endOutX = Math.sign(beforeEnd.x - end.x);
  const endOutY = Math.sign(beforeEnd.y - end.y);
  if (!roomSlotsAreValid(map, toRoom, end.x, end.y, endOutX, endOutY)) {
    issues.push(`Acceso de llegada inválido en la sala ${toRoom.id}.`);
  }

  return issues;
}

/**
 * Validación estructural del mapa de TASK-0008. No exige un número concreto
 * de salas ni roles: eso depende de las opciones y se valida en los tests.
 */
export function validateGeneratedMap(
  map: Pick<
    GeneratedMap,
    'width' | 'height' | 'tiles' | 'rooms' | 'corridors' | 'doors' | 'spawns'
  >,
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
  }

  for (const corridor of corridors) {
    issues.push(...corridorEndpoints(map, corridor));
  }

  for (const door of doors) {
    if (map.tiles[tileIndex(width, door.x, door.y)] !== 'floor') {
      issues.push(`Puerta (${door.x},${door.y}) sobre muro.`);
    }
    if (!rooms.some((room) => room.id === door.roomId)) {
      issues.push(`Puerta con sala ${door.roomId} inexistente.`);
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
