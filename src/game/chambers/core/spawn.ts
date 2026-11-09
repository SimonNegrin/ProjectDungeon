/**
 * Spawn protegido y grupo de seis huecos de REQ-012 (TASK-0045).
 *
 * La sala de spawn es la más protegida (menos accesos) y debe admitir seis
 * huecos con componentes de adyacencia de 8 direcciones de tamaño ≤2. El grupo
 * se coloca alrededor del acceso y nunca comparte celda con puertas, salida,
 * armas ni enemigos. Todo es puro y determinista: sin DOM, relojes ni
 * `Math.random`.
 */

import type { Door, Room } from '../../map';
import type { Tile } from '../../types';
import type { OpenMouth } from './doors';
import {
  chebyshev,
  inBounds,
  neighbors4,
  pointKey,
  samePoint,
  type Point,
} from './grid';
import { hashSeed } from './rng';

/** Seis jugadores por defecto; el motor actual usa solo el primero. */
export const SPAWN_MIN_TILES = 6;
export const SPAWN_RADIUS = 2;
export const SPAWN_FALLBACK_RADIUS = 3;
/** Adyacencia de 8 direcciones: ninguna componente puede superar 2 fichas. */
export const SPAWN_MAX_COMPONENT = 2;

export interface SpawnInput {
  readonly rooms: readonly Room[];
  readonly doors: readonly Door[];
  readonly openMouths: readonly OpenMouth[];
  readonly tiles: readonly Tile[];
  readonly width: number;
  readonly height: number;
  readonly minTiles: number;
  readonly seed: number;
}

export interface SpawnPlacement {
  readonly roomId: number;
  readonly party: readonly Point[];
  readonly player: Point;
}

export interface SpawnResult {
  readonly spawns: SpawnPlacement;
  readonly warnings: readonly string[];
}

/** Máscara de suelo de una sala; la caja es el fallback de fixtures legacy. */
export function roomCellsOf(room: Room): readonly Point[] {
  if (room.cells) return room.cells;
  const cells: Point[] = [];
  for (let y = room.y; y < room.y + room.height; y += 1) {
    for (let x = room.x; x < room.x + room.width; x += 1) {
      cells.push({ x, y });
    }
  }
  return cells;
}

export function roomAreaOf(room: Room): number {
  return room.area ?? roomCellsOf(room).length;
}

/** Adyacencia de 8 direcciones (incluye diagonales). */
export function adjacent8(a: Point, b: Point): boolean {
  return chebyshev(a, b) === 1;
}

/**
 * Tamaño de la componente que formaría `cell` al añadirse a `chosen`, contando
 * solo la adyacencia de 8 direcciones. `chosen` debe cumplir ya el límite.
 */
export function componentSizeWith(chosen: readonly Point[], cell: Point): number {
  const points = [...chosen, cell];
  const seen = new Set<string>([pointKey(cell.x, cell.y)]);
  const queue: Point[] = [cell];
  for (let cursor = 0; cursor < queue.length; cursor += 1) {
    const current = queue[cursor];
    for (const candidate of points) {
      if (seen.has(pointKey(candidate.x, candidate.y))) continue;
      if (!adjacent8(current, candidate)) continue;
      seen.add(pointKey(candidate.x, candidate.y));
      queue.push(candidate);
    }
  }
  return seen.size;
}

/** Componente máxima de adyacencia de 8 direcciones de un conjunto. */
export function maxComponentSize(points: readonly Point[]): number {
  const seen = new Set<string>();
  let maximum = 0;
  for (const point of points) {
    const key = pointKey(point.x, point.y);
    if (seen.has(key)) continue;
    const queue: Point[] = [point];
    seen.add(key);
    let size = 0;
    for (let cursor = 0; cursor < queue.length; cursor += 1) {
      const current = queue[cursor];
      size += 1;
      for (const candidate of points) {
        const candidateKey = pointKey(candidate.x, candidate.y);
        if (seen.has(candidateKey)) continue;
        if (!adjacent8(current, candidate)) continue;
        seen.add(candidateKey);
        queue.push(candidate);
      }
    }
    maximum = Math.max(maximum, size);
  }
  return maximum;
}

function deterministicOrder(seed: number, cell: Point, salt: number): number {
  return hashSeed(seed ^ (cell.x * 73856093) ^ (cell.y * 19349663), salt);
}

function roomCenter(room: Room): Point {
  const cells = roomCellsOf(room);
  if (cells.length === 0) return { x: room.x, y: room.y };
  const sum = cells.reduce(
    (accumulator, cell) => ({ x: accumulator.x + cell.x, y: accumulator.y + cell.y }),
    { x: 0, y: 0 },
  );
  return { x: sum.x / cells.length, y: sum.y / cells.length };
}

function distanceToCenterSquared(anchor: Point, center: Point): number {
  return (anchor.x - center.x) ** 2 + (anchor.y - center.y) ** 2;
}

/** Suelo interior de la sala junto al ancla (puerta o boca). */
function interiorCellNextTo(anchor: Point, room: Room): Point | null {
  const roomMask = new Set(roomCellsOf(room).map((cell) => pointKey(cell.x, cell.y)));
  if (roomMask.has(pointKey(anchor.x, anchor.y))) return { x: anchor.x, y: anchor.y };
  const center = roomCenter(room);
  const neighbors = neighbors4(anchor.x, anchor.y)
    .filter((cell) => roomMask.has(pointKey(cell.x, cell.y)))
    .sort(
      (a, b) =>
        distanceToCenterSquared(a, center) - distanceToCenterSquared(b, center) ||
        a.y - b.y ||
        a.x - b.x,
    );
  return neighbors[0] ?? null;
}

/**
 * Acceso de la sala: suelo interior junto a la puerta más cercana al centro
 * (desempate por `id`). Si no hay puerta, junto a la boca más cercana al centro.
 */
export function chooseSpawnAccess(
  room: Room,
  doors: readonly Door[],
  openMouths: readonly OpenMouth[],
): Point {
  const center = roomCenter(room);
  const roomDoors = doors
    .filter((door) => door.roomA === room.id || door.roomB === room.id)
    .sort(
      (a, b) =>
        distanceToCenterSquared(a, center) - distanceToCenterSquared(b, center) ||
        (a.id ?? 0) - (b.id ?? 0),
    );
  for (const door of roomDoors) {
    const access = interiorCellNextTo(door, room);
    if (access) return access;
  }

  const roomMouths = openMouths
    .filter((mouth) => mouth.roomA === room.id || mouth.roomB === room.id)
    .sort(
      (a, b) =>
        distanceToCenterSquared(a, center) - distanceToCenterSquared(b, center) ||
        a.id - b.id,
    );
  for (const mouth of roomMouths) {
    const access = interiorCellNextTo(mouth, room);
    if (access) return access;
  }

  const fallback = [...roomCellsOf(room)].sort((a, b) => {
    return (
      distanceToCenterSquared(a, center) - distanceToCenterSquared(b, center) ||
      a.y - b.y ||
      a.x - b.x
    );
  });
  return fallback[0] ?? { x: room.x, y: room.y };
}

function doorKeySet(doors: readonly Door[]): Set<string> {
  return new Set(doors.map((door) => pointKey(door.x, door.y)));
}

/** Superficie libre de la sala: sus celdas menos las ocupadas por puertas. */
function freeRoomCells(room: Room, doors: readonly Door[]): readonly Point[] {
  const doorsAt = doorKeySet(doors);
  return roomCellsOf(room).filter((cell) => !doorsAt.has(pointKey(cell.x, cell.y)));
}

function freeNeighborCount(
  cell: Point,
  tiles: readonly Tile[],
  width: number,
  height: number,
  doorsAt: ReadonlySet<string>,
): number {
  return neighbors4(cell.x, cell.y).filter(
    (next) =>
      inBounds(next.x, next.y, width, height) &&
      tiles[next.y * width + next.x] === 'floor' &&
      !doorsAt.has(pointKey(next.x, next.y)),
  ).length;
}

interface PartySearchInput {
  readonly candidates: readonly Point[];
  readonly access: Point;
  readonly radius: number;
  readonly minTiles: number;
  readonly tiles: readonly Tile[];
  readonly width: number;
  readonly height: number;
  readonly doorsAt: ReadonlySet<string>;
  readonly seed: number;
}

/**
 * Orden determinista de candidatos: primero los tiles con al menos dos vecinos
 * libres, luego los más cercanos al acceso y, por último, el hash de la semilla.
 */
function orderPartyCandidates(input: PartySearchInput): Point[] {
  return input.candidates
    .filter(
      (cell) =>
        !samePoint(cell, input.access) &&
        (input.radius === Number.POSITIVE_INFINITY ||
          chebyshev(cell, input.access) <= input.radius),
    )
    .sort((a, b) => {
      const freeA = freeNeighborCount(a, input.tiles, input.width, input.height, input.doorsAt);
      const freeB = freeNeighborCount(b, input.tiles, input.width, input.height, input.doorsAt);
      const rankA = freeA >= 2 ? 0 : 1;
      const rankB = freeB >= 2 ? 0 : 1;
      const distanceA = chebyshev(a, input.access);
      const distanceB = chebyshev(b, input.access);
      return (
        rankA - rankB ||
        freeB - freeA ||
        distanceA - distanceB ||
        deterministicOrder(input.seed, a, 0x51ed270b) -
          deterministicOrder(input.seed, b, 0x51ed270b) ||
        a.y - b.y ||
        a.x - b.x
      );
    });
}

/**
 * Búsqueda determinista del mayor conjunto de huecos dentro de `radius`,
 * incluyendo el acceso. Permite parejas adyacentes en 8 direcciones, pero
 * ninguna componente puede superar 2 fichas.
 */
function searchParty(input: PartySearchInput): Point[] {
  const ordered = orderPartyCandidates(input);
  const chosen: Point[] = [input.access];
  let best: Point[] = [...chosen];
  let nodes = 0;
  const maxNodes = 500_000;

  function search(start: number): boolean {
    if (chosen.length > best.length) best = [...chosen];
    if (chosen.length >= input.minTiles) return true;
    nodes += 1;
    if (nodes > maxNodes) return false;
    for (let index = start; index < ordered.length; index += 1) {
      if (chosen.length + (ordered.length - index) <= best.length) break;
      const cell = ordered[index];
      if (componentSizeWith(chosen, cell) > SPAWN_MAX_COMPONENT) continue;
      chosen.push(cell);
      if (search(index + 1)) return true;
      chosen.pop();
    }
    return false;
  }

  search(0);
  return best;
}

/**
 * Huecos que la sala puede ofrecer como máximo con componentes ≤2, contando
 * también los fallbacks de radio. Se usa para no elegir como spawn una sala
 * que no admite los 6 huecos de REQ-012 R-001.
 */
export function partyCapacity(
  room: Room,
  doors: readonly Door[],
  access: Point,
  tiles: readonly Tile[],
  width: number,
  height: number,
  seed: number,
): number {
  const doorsAt = doorKeySet(doors);
  const candidates = roomCellsOf(room).filter(
    (cell) => !doorsAt.has(pointKey(cell.x, cell.y)),
  );
  if (candidates.length === 0) return 0;
  const accessCell =
    candidates.find((cell) => samePoint(cell, access)) ??
    [...candidates].sort(
      (a, b) =>
        chebyshev(a, access) - chebyshev(b, access) ||
        deterministicOrder(seed, a, 0x9e3779b9) - deterministicOrder(seed, b, 0x9e3779b9),
    )[0];
  return searchParty({
    candidates,
    access: accessCell,
    radius: Number.POSITIVE_INFINITY,
    minTiles: SPAWN_MIN_TILES,
    tiles,
    width,
    height,
    doorsAt,
    seed,
  }).length;
}

function chooseParty(
  room: Room,
  doors: readonly Door[],
  access: Point,
  tiles: readonly Tile[],
  width: number,
  height: number,
  seed: number,
  minTiles: number,
  warnings: string[],
): Point[] {
  const doorsAt = doorKeySet(doors);
  const candidates = roomCellsOf(room).filter(
    (cell) => !doorsAt.has(pointKey(cell.x, cell.y)),
  );
  if (candidates.length === 0) {
    warnings.push('La sala de spawn no tenía huecos libres.');
    return [];
  }

  const accessCell =
    candidates.find((cell) => samePoint(cell, access)) ??
    [...candidates].sort(
      (a, b) =>
        chebyshev(a, access) - chebyshev(b, access) ||
        deterministicOrder(seed, a, 0x9e3779b9) - deterministicOrder(seed, b, 0x9e3779b9),
    )[0];
  const base = {
    candidates,
    access: accessCell,
    minTiles,
    tiles,
    width,
    height,
    doorsAt,
    seed,
  };

  let selected = searchParty({ ...base, radius: SPAWN_RADIUS });
  if (selected.length < minTiles) {
    const atThree = searchParty({ ...base, radius: SPAWN_FALLBACK_RADIUS });
    if (atThree.length >= minTiles) {
      selected = atThree;
      warnings.push('No cabían los huecos pedidos a radio 2; se amplió a radio 3.');
    } else {
      const wholeRoom = searchParty({ ...base, radius: Number.POSITIVE_INFINITY });
      selected = wholeRoom.length >= atThree.length ? wholeRoom : atThree;
      if (selected.length >= minTiles) {
        warnings.push(
          'No cabían los huecos pedidos a radio 2 ni 3; se amplió a la sala completa.',
        );
      }
    }
  }

  if (selected.length < minTiles) {
    warnings.push(
      `La sala de spawn solo ofreció ${selected.length} de ${minTiles} huecos libres con componentes ≤2.`,
    );
  }

  return selected;
}

/**
 * Accesos de la sala según REQ-012 R-001: puertas más dos por pasillo ancho.
 * Las bocas estrechas no cuentan: una puerta en un extremo ya representa el
 * acceso del pasillo y la boca del otro extremo lo duplicaría.
 */
function accessesFor(
  roomId: number,
  doors: readonly Door[],
  openMouths: readonly OpenMouth[],
): number {
  let count = 0;
  for (const door of doors) {
    if (door.roomA === roomId || door.roomB === roomId) count += 1;
  }
  const wideCorridors = new Set<number>();
  for (const mouth of openMouths) {
    if (mouth.reason !== 'pasillo-ancho') continue;
    if (mouth.roomA !== roomId && mouth.roomB !== roomId) continue;
    wideCorridors.add(mouth.corridorId);
  }
  return count + wideCorridors.size * 2;
}

/**
 * Elige la sala de spawn más protegida y coloca el grupo alrededor del acceso.
 * `party[0]` es el acceso y `player` su alias. Los fallbacks de radio o de
 * capacidad emiten avisos legibles.
 */
export function placeSpawns(input: SpawnInput): SpawnResult {
  const warnings: string[] = [];
  const largestArea = Math.max(0, ...input.rooms.map(roomAreaOf));
  const accesses = new Map<number, number>();
  const capacities = new Map<number, number>();
  for (const room of input.rooms) {
    accesses.set(room.id, accessesFor(room.id, input.doors, input.openMouths));
    const roomAccess = chooseSpawnAccess(room, input.doors, input.openMouths);
    capacities.set(
      room.id,
      partyCapacity(
        room,
        input.doors,
        roomAccess,
        input.tiles,
        input.width,
        input.height,
        input.seed,
      ),
    );
  }
  const capacityOf = (room: Room): number => capacities.get(room.id) ?? 0;
  const accessesOf = (room: Room): number => accesses.get(room.id) ?? 0;

  const viable = input.rooms
    .filter((room) => capacityOf(room) >= input.minTiles)
    .sort(
      (a, b) =>
        accessesOf(a) - accessesOf(b) ||
        Number(roomAreaOf(a) === largestArea) - Number(roomAreaOf(b) === largestArea) ||
        freeRoomCells(b, input.doors).length - freeRoomCells(a, input.doors).length ||
        a.id - b.id,
    );

  let spawnRoom = viable[0] ?? null;
  if (!spawnRoom) {
    const fallback = [...input.rooms].sort(
      (a, b) =>
        capacityOf(b) - capacityOf(a) ||
        accessesOf(a) - accessesOf(b) ||
        freeRoomCells(b, input.doors).length - freeRoomCells(a, input.doors).length ||
        Number(roomAreaOf(a) === largestArea) - Number(roomAreaOf(b) === largestArea) ||
        roomAreaOf(b) - roomAreaOf(a) ||
        a.id - b.id,
    )[0];
    if (fallback) {
      spawnRoom = fallback;
      warnings.push(
        `Ninguna sala tenía ${input.minTiles} huecos libres; se usó la sala ${fallback.id}.`,
      );
    }
  }

  if (!spawnRoom) {
    const empty = { x: 1, y: 1 };
    return {
      spawns: { roomId: -1, party: [], player: empty },
      warnings: ['No se pudo elegir sala de spawn.'],
    };
  }

  const access = chooseSpawnAccess(spawnRoom, input.doors, input.openMouths);
  let party = chooseParty(
    spawnRoom,
    input.doors,
    access,
    input.tiles,
    input.width,
    input.height,
    input.seed,
    input.minTiles,
    warnings,
  );

  if (party.length === 0) {
    const firstFloor = input.tiles.findIndex((tile) => tile === 'floor');
    if (firstFloor >= 0) {
      const point = {
        x: firstFloor % input.width,
        y: Math.floor(firstFloor / input.width),
      };
      party = [point];
      warnings.push('La sala de spawn quedó sin huecos; se usó el primer suelo.');
    }
  }

  const player = party[0] ?? access;
  return {
    spawns: { roomId: spawnRoom.id, party, player },
    warnings,
  };
}
