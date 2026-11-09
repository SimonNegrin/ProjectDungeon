/**
 * Selección pura de la salida de nivel de REQ-013 para EXP-004.
 *
 * La salida se elige después de las puertas y el spawn y antes de los enemigos.
 * El grafo usa las conexiones reales (`corridors`); las puertas decorativas no
 * son nodos. Sin `Math.random`, relojes ni DOM.
 */

import { inBounds, neighbors4, pointKey } from './grid';
import { hashSeed } from './rng';
import type {
  Corridor,
  Door,
  Exit,
  ExitKind,
  ExitMode,
  ExitTile,
  Point,
  Room,
  Spawns,
  Tile,
} from './types';

export const EXIT_MIN_DISTANCE = 2;

const KIND_TILES: Readonly<Record<ExitKind, ExitTile>> = {
  door: 'exit-door',
  'stairs-down': 'staircase-down',
  'stairs-up': 'staircase-up',
};

const KIND_ORDER: readonly ExitKind[] = ['door', 'stairs-down', 'stairs-up'];

export interface ExitInput {
  readonly rooms: readonly Room[];
  readonly doors: readonly Door[];
  readonly corridors: readonly Corridor[];
  readonly tiles: readonly Tile[];
  readonly width: number;
  readonly height: number;
  readonly spawns: Spawns;
  readonly seed: number;
  readonly mode: ExitMode;
}

export interface ExitResult {
  readonly exit: Exit | null;
  readonly warnings: readonly string[];
}

/** Grafo no dirigido de salas usando las conexiones reales. */
export function buildRoomGraph(
  rooms: readonly Room[],
  corridors: readonly Corridor[],
): Map<number, Set<number>> {
  const graph = new Map<number, Set<number>>();
  for (const room of rooms) graph.set(room.id, new Set());
  for (const corridor of corridors) {
    if (!graph.has(corridor.roomA) || !graph.has(corridor.roomB)) continue;
    graph.get(corridor.roomA)?.add(corridor.roomB);
    graph.get(corridor.roomB)?.add(corridor.roomA);
  }
  return graph;
}

export interface RoomDistances {
  readonly distance: ReadonlyMap<number, number>;
  readonly parent: ReadonlyMap<number, number>;
}

/** BFS determinista desde la sala de spawn. */
export function roomDistances(
  startRoomId: number,
  graph: ReadonlyMap<number, ReadonlySet<number>>,
): RoomDistances {
  const distance = new Map<number, number>();
  const parent = new Map<number, number>();
  if (!graph.has(startRoomId)) return { distance, parent };
  distance.set(startRoomId, 0);
  const queue: number[] = [startRoomId];
  for (let cursor = 0; cursor < queue.length; cursor += 1) {
    const current = queue[cursor];
    const next = [...(graph.get(current) ?? [])].sort((a, b) => a - b);
    for (const neighbour of next) {
      if (distance.has(neighbour)) continue;
      distance.set(neighbour, (distance.get(current) ?? 0) + 1);
      parent.set(neighbour, current);
      queue.push(neighbour);
    }
  }
  return { distance, parent };
}

export function pathToRoom(
  parent: ReadonlyMap<number, number>,
  startRoomId: number,
  targetRoomId: number,
): number[] {
  if (targetRoomId === startRoomId) return [startRoomId];
  const path: number[] = [];
  let cursor: number | undefined = targetRoomId;
  const guard = new Set<number>();
  while (cursor !== undefined && !guard.has(cursor)) {
    guard.add(cursor);
    path.push(cursor);
    if (cursor === startRoomId) return path.reverse();
    cursor = parent.get(cursor);
  }
  return [];
}

function isFloor(
  tiles: readonly Tile[],
  width: number,
  height: number,
  x: number,
  y: number,
): boolean {
  return inBounds(x, y, width, height) && tiles[y * width + x] === 1;
}

function doorCells(doors: readonly Door[]): Set<string> {
  return new Set(doors.map((door) => pointKey(door.x, door.y)));
}

function spawnCells(spawns: Spawns): Set<string> {
  return new Set(spawns.party.map((hole) => pointKey(hole.x, hole.y)));
}

function hashPoint(seed: number, point: Point, salt: number): number {
  return hashSeed(seed ^ Math.imul(point.x + 1, 0x9e3779b1) ^ Math.imul(point.y + 7, 0x85ebca77), salt);
}

interface DoorCandidate {
  readonly position: Point;
  readonly access: Point;
}

/**
 * Muro del borde con suelo de la sala dentro. Las salas viven con margen 1, así
 * que el muro exterior es el tile inmediatamente anterior al suelo de borde.
 */
export function doorBoundaryCandidates(
  room: Room,
  tiles: readonly Tile[],
  width: number,
  height: number,
  doors: readonly Door[],
  spawns: Spawns,
): DoorCandidate[] {
  const doorAt = doorCells(doors);
  const holes = spawnCells(spawns);
  const candidates: DoorCandidate[] = [];
  const seen = new Set<string>();

  const add = (position: Point, access: Point): void => {
    if (!inBounds(position.x, position.y, width, height)) return;
    if (tiles[position.y * width + position.x] !== 0) return;
    if (!isFloor(tiles, width, height, access.x, access.y)) return;
    const key = pointKey(position.x, position.y);
    if (seen.has(key)) return;
    if (doorAt.has(pointKey(access.x, access.y))) return;
    if (holes.has(pointKey(access.x, access.y))) return;
    seen.add(key);
    candidates.push({ position, access });
  };

  for (const cell of room.cells) {
    if (cell.x === 1) add({ x: 0, y: cell.y }, cell);
    if (cell.y === 1) add({ x: cell.x, y: 0 }, cell);
    if (cell.x === width - 2) add({ x: width - 1, y: cell.y }, cell);
    if (cell.y === height - 2) add({ x: cell.x, y: height - 1 }, cell);
  }

  return candidates;
}

function manhattan(a: Point, b: Point): number {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}

/** Suelo de la sala para una escalera, lejos del spawn y determinista. */
export function stairPosition(
  room: Room,
  tiles: readonly Tile[],
  width: number,
  height: number,
  doors: readonly Door[],
  spawns: Spawns,
  seed: number,
): Point | null {
  const doorAt = doorCells(doors);
  const holes = spawnCells(spawns);
  const candidates = room.cells
    .filter((cell) => isFloor(tiles, width, height, cell.x, cell.y))
    .filter((cell) => !doorAt.has(pointKey(cell.x, cell.y)))
    .filter((cell) => !holes.has(pointKey(cell.x, cell.y)));
  if (candidates.length === 0) return null;
  return [...candidates].sort(
    (a, b) =>
      manhattan(b, spawns.player) - manhattan(a, spawns.player) ||
      hashPoint(seed, a, 0x2545f491) - hashPoint(seed, b, 0x2545f491) ||
      a.y - b.y ||
      a.x - b.x,
  )[0];
}

function resolveKind(mode: ExitMode, seed: number): ExitKind {
  if (mode !== 'random') return mode;
  return KIND_ORDER[hashSeed(seed, 0x6d2b79f5) % KIND_ORDER.length];
}

interface RoomChoice {
  readonly roomId: number;
  readonly distance: number;
  readonly path: readonly number[];
  readonly room: Room;
}

function orderedRooms(
  rooms: readonly Room[],
  spawnRoomId: number,
  distances: RoomDistances,
  onlyBorder: readonly Room[] | null,
): RoomChoice[] {
  const borderIds = onlyBorder ? new Set(onlyBorder.map((room) => room.id)) : null;
  const candidates: RoomChoice[] = [];
  for (const room of rooms) {
    if (room.id === spawnRoomId) continue;
    if (borderIds && !borderIds.has(room.id)) continue;
    const distance = distances.distance.get(room.id);
    if (distance === undefined) continue;
    candidates.push({
      roomId: room.id,
      distance,
      path: pathToRoom(distances.parent, spawnRoomId, room.id),
      room,
    });
  }
  return candidates.sort(
    (a, b) =>
      b.distance - a.distance ||
      a.roomId - b.roomId ||
      b.room.area - a.room.area,
  );
}

export function selectExit(input: ExitInput): ExitResult {
  const warnings: string[] = [];
  const graph = buildRoomGraph(input.rooms, input.corridors);
  const distances = roomDistances(input.spawns.roomId, graph);
  const requested = resolveKind(input.mode, input.seed);

  const reachable = orderedRooms(input.rooms, input.spawns.roomId, distances, null);
  const farEnough = reachable.filter((choice) => choice.distance >= EXIT_MIN_DISTANCE);

  if (reachable.length === 0) {
    warnings.push('No hay ninguna sala no-spawn alcanzable; la salida queda vacía.');
    return { exit: null, warnings };
  }
  if (farEnough.length === 0) {
    warnings.push(
      'No hay una sala no-spawn a distancia ≥2; se usó la más lejana alcanzable.',
    );
  }

  let kind: ExitKind = requested;
  let fallback = false;
  let pool = farEnough.length > 0 ? farEnough : reachable;

  if (kind === 'door') {
    const borderRooms = input.rooms.filter((room) => {
      if (room.id === input.spawns.roomId) return false;
      if (!distances.distance.has(room.id)) return false;
      return (
        doorBoundaryCandidates(
          room,
          input.tiles,
          input.width,
          input.height,
          input.doors,
          input.spawns,
        ).length > 0
      );
    });
    const borderPool = orderedRooms(
      input.rooms,
      input.spawns.roomId,
      distances,
      borderRooms,
    ).filter((choice) => choice.distance >= EXIT_MIN_DISTANCE);
    if (borderPool.length > 0) {
      pool = borderPool;
    } else {
      warnings.push(
        'Ninguna sala a distancia ≥2 toca el borde del mapa; la puerta de salida cayó a stairs-down.',
      );
      kind = 'stairs-down';
      fallback = true;
    }
  }

  const choice = pool[0];
  if (!choice) {
    warnings.push('No se pudo elegir una sala de salida; la salida queda vacía.');
    return { exit: null, warnings };
  }

  if (kind === 'door') {
    const candidates = doorBoundaryCandidates(
      choice.room,
      input.tiles,
      input.width,
      input.height,
      input.doors,
      input.spawns,
    );
    if (candidates.length === 0) {
      warnings.push(
        'La sala de salida no ofreció un muro de borde válido; la puerta cayó a stairs-down.',
      );
      kind = 'stairs-down';
      fallback = true;
    } else {
      const best = [...candidates].sort(
        (a, b) =>
          hashPoint(input.seed, a.position, 0x27d4eb2f) -
            hashPoint(input.seed, b.position, 0x27d4eb2f) ||
          a.position.y - b.position.y ||
          a.position.x - b.position.x,
      )[0];
      return {
        exit: {
          roomId: choice.roomId,
          kind,
          position: best.position,
          access: best.access,
          tile: KIND_TILES[kind],
          distance: choice.distance,
          path: choice.path,
          fallback,
        },
        warnings,
      };
    }
  }

  const position = stairPosition(
    choice.room,
    input.tiles,
    input.width,
    input.height,
    input.doors,
    input.spawns,
    input.seed,
  );
  if (!position) {
    warnings.push('La sala de salida no tenía suelo libre para la escalera; la salida queda vacía.');
    return { exit: null, warnings };
  }

  return {
    exit: {
      roomId: choice.roomId,
      kind,
      position,
      access: position,
      tile: KIND_TILES[kind],
      distance: choice.distance,
      path: choice.path,
      fallback,
    },
    warnings,
  };
}

/** Celdas que la salida reserva: su tile y su acceso. */
export function reservedExitCells(exit: Exit | null): Set<string> {
  if (!exit) return new Set();
  return new Set([
    pointKey(exit.position.x, exit.position.y),
    pointKey(exit.access.x, exit.access.y),
  ]);
}

/** Exportado para tests de percepción. */
export function orthogonalNeighbors(x: number, y: number): Point[] {
  return neighbors4(x, y);
}
