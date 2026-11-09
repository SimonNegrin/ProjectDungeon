/**
 * Spawn alrededor del acceso y reparto orgánico de enemigos de REQ-012 v3.
 *
 * Todo es puro y determinista: sin DOM, relojes ni `Math.random`. Las funciones
 * exportadas permiten validar fórmula, reparto, componentes de adyacencia,
 * preferencia por interior, emboscadas en puntos calientes y reserva de salida.
 */

import { inBounds, neighbors4, pointKey } from './grid';
import { hashSeed } from './rng';
import { reservedExitCells } from './exit';
import type {
  Door,
  Enemy,
  EnemyType,
  Exit,
  Hotspot,
  HotspotReason,
  OpenMouth,
  Point,
  Room,
  Spawns,
  Tile,
} from './types';

export const SPAWN_MIN_TILES = 6;
export const SPAWN_RADIUS = 2;
export const SPAWN_FALLBACK_RADIUS = 3;
/** Adyacencia de 8 direcciones: ninguna componente puede superar 2 fichas. */
export const SPAWN_MAX_COMPONENT = 2;
export const ENEMY_MAX_COMPONENT = 2;
export const ENEMY_SURFACE_FACTOR = 0.02;
export const ENEMY_PLAYERS_FACTOR = 1.35;
export const DEFAULT_PLAYERS = 3;
export const DEFAULT_HIDDEN_ENEMY_CHANCE = 0.5;
export const ENEMY_BRUTE_SHARE = 0.2;
export const ENEMY_COWARD_SHARE = 0.2;

interface SpawnInput {
  readonly rooms: readonly Room[];
  readonly doors: readonly Door[];
  readonly openMouths: readonly OpenMouth[];
  readonly tiles: readonly Tile[];
  readonly width: number;
  readonly height: number;
  readonly minTiles: number;
  readonly seed: number;
}

interface SpawnResult {
  readonly spawns: Spawns;
  readonly warnings: readonly string[];
}

interface EnemyInput {
  readonly rooms: readonly Room[];
  readonly doors: readonly Door[];
  readonly openMouths: readonly OpenMouth[];
  readonly corridors?: readonly import('./types').Corridor[];
  readonly exit?: Exit | null;
  readonly tiles: readonly Tile[];
  readonly width: number;
  readonly height: number;
  readonly spawns: Spawns;
  readonly seed: number;
  readonly enemySurfaceFactor: number;
  readonly enemyPlayersFactor: number;
  readonly numPlayers: number;
  readonly hiddenEnemyChance: number;
}

export interface EnemyBreakdownResult {
  readonly surfaceN: number;
  readonly playersP: number;
  readonly surfaceFactor: number;
  readonly playersFactor: number;
  readonly surfaceTerm: number;
  readonly playersTerm: number;
  readonly total: number;
  readonly planned: number;
  readonly perRoom: readonly number[];
  readonly placedPerRoom: readonly number[];
  readonly sentinels: number;
  readonly brutes: number;
  readonly cowards: number;
  readonly interior: number;
  readonly border: number;
  readonly hidden: number;
  readonly hotspotsTotal: number;
  readonly hotspotsEligible: number;
  readonly hotspotRolls: number;
  readonly hotspotsOccupied: number;
  readonly componentsMax: number;
}

interface EnemyResult {
  readonly enemies: readonly Enemy[];
  readonly hotspots: readonly Hotspot[];
  readonly warnings: readonly string[];
  readonly breakdown: EnemyBreakdownResult;
}

function doorKeySet(doors: readonly Door[]): Set<string> {
  return new Set(doors.map((door) => pointKey(door.x, door.y)));
}

function freeCells(room: Room, doors: readonly Door[]): Point[] {
  const doorsAt = doorKeySet(doors);
  return room.cells.filter((cell) => !doorsAt.has(pointKey(cell.x, cell.y)));
}

function chebyshev(a: Point, b: Point): number {
  return Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y));
}

function samePoint(a: Point, b: Point): boolean {
  return a.x === b.x && a.y === b.y;
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
  if (room.cells.length === 0) return { x: room.x, y: room.y };
  const sum = room.cells.reduce(
    (accumulator, cell) => ({ x: accumulator.x + cell.x, y: accumulator.y + cell.y }),
    { x: 0, y: 0 },
  );
  return {
    x: sum.x / room.cells.length,
    y: sum.y / room.cells.length,
  };
}

function distanceToCenterSquared(anchor: Point, center: Point): number {
  return (anchor.x - center.x) ** 2 + (anchor.y - center.y) ** 2;
}

function roomDistanceToPoint(room: Room, point: Point): number {
  const center = roomCenter(room);
  return Math.abs(center.x - point.x) + Math.abs(center.y - point.y);
}

/** Suelo interior de la sala junto al ancla (puerta o boca). */
function interiorCellNextTo(anchor: Point, room: Room): Point | null {
  const roomMask = new Set(room.cells.map((cell) => pointKey(cell.x, cell.y)));
  if (roomMask.has(pointKey(anchor.x, anchor.y))) return anchor;
  const neighbors = neighbors4(anchor.x, anchor.y)
    .filter((cell) => roomMask.has(pointKey(cell.x, cell.y)))
    .sort((a, b) => {
      const center = roomCenter(room);
      return (
        distanceToCenterSquared(a, center) - distanceToCenterSquared(b, center) ||
        a.y - b.y ||
        a.x - b.x
      );
    });
  return neighbors[0] ?? null;
}

/**
 * Acceso de la sala: suelo interior junto a la puerta más cercana al centro
 * (desempate por id). Si no hay puerta, junto a la boca más cercana al centro.
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
        a.id - b.id,
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

  const fallback = [...room.cells].sort((a, b) => {
    return (
      distanceToCenterSquared(a, center) - distanceToCenterSquared(b, center) ||
      a.y - b.y ||
      a.x - b.x
    );
  });
  return fallback[0] ?? { x: room.x, y: room.y };
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
      tiles[next.y * width + next.x] === 1 &&
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
 * ninguna componente puede superar 2 fichas. No relaja esa regla.
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
  const candidates = room.cells.filter((cell) => !doorsAt.has(pointKey(cell.x, cell.y)));
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
  const candidates = room.cells.filter((cell) => !doorsAt.has(pointKey(cell.x, cell.y)));
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

export function placeSpawns(input: SpawnInput): SpawnResult {
  const warnings: string[] = [];
  const largestArea = Math.max(0, ...input.rooms.map((room) => room.area));
  const capacities = new Map<number, number>();
  for (const room of input.rooms) {
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

  const viable = input.rooms
    .filter((room) => capacityOf(room) >= input.minTiles)
    .sort(
      (a, b) =>
        a.accesses - b.accesses ||
        Number(a.area === largestArea) - Number(b.area === largestArea) ||
        freeCells(b, input.doors).length - freeCells(a, input.doors).length ||
        a.id - b.id,
    );

  let spawnRoom = viable[0] ?? null;
  if (!spawnRoom) {
    const fallback = [...input.rooms].sort(
      (a, b) =>
        capacityOf(b) - capacityOf(a) ||
        a.accesses - b.accesses ||
        freeCells(b, input.doors).length - freeCells(a, input.doors).length ||
        Number(a.area === largestArea) - Number(b.area === largestArea) ||
        b.area - a.area ||
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
    const firstFloor = input.tiles.findIndex((tile) => tile === 1);
    if (firstFloor >= 0) {
      const point = { x: firstFloor % input.width, y: Math.floor(firstFloor / input.width) };
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

// ---------------------------------------------------------------------------
// Presupuesto y reparto de enemigos
// ---------------------------------------------------------------------------

/** T = ceil(surfaceFactor × N) + ceil(playersFactor × P). */
export function enemyTotalFor(
  surfaceN: number,
  playersP: number,
  surfaceFactor: number,
  playersFactor: number,
): number {
  return Math.ceil(surfaceFactor * surfaceN) + Math.ceil(playersFactor * playersP);
}

export interface EnemyTypeCounts {
  readonly sentinels: number;
  readonly brutes: number;
  readonly cowards: number;
}

/** 60 % centinelas / 20 % brutos / 20 % cobardes con redondeo unitario. */
export function enemyTypeCounts(total: number): EnemyTypeCounts {
  if (total <= 0) return { sentinels: 0, brutes: 0, cowards: 0 };
  let brutes = Math.round(total * ENEMY_BRUTE_SHARE);
  let cowards = Math.round(total * ENEMY_COWARD_SHARE);
  if (total >= 4) {
    brutes = Math.max(1, brutes);
    cowards = Math.max(1, cowards);
  }
  if (brutes + cowards > total) {
    const scale = total / (brutes + cowards);
    brutes = Math.max(0, Math.floor(brutes * scale));
    cowards = Math.max(0, total - brutes);
  }
  return { sentinels: total - brutes - cowards, brutes, cowards };
}

/** Reparto proporcional al área con mínimo 1 por sala no-spawn. */
export function distributeEnemyBudget(
  rooms: readonly Room[],
  spawnRoomId: number,
  total: number,
): { budgets: Map<number, number>; warnings: string[] } {
  const warnings: string[] = [];
  const budgets = new Map<number, number>();
  for (const room of rooms) budgets.set(room.id, 0);
  const nonSpawn = rooms.filter((room) => room.id !== spawnRoomId);
  if (total <= 0 || nonSpawn.length === 0) return { budgets, warnings };

  if (total < nonSpawn.length) {
    const ordered = [...nonSpawn].sort((a, b) => b.area - a.area || a.id - b.id);
    for (let index = 0; index < total; index += 1) {
      budgets.set(ordered[index].id, 1);
    }
    warnings.push(
      `El presupuesto de ${total} enemigos no cubre ${nonSpawn.length} salas; ${nonSpawn.length - total} quedan vacías.`,
    );
    return { budgets, warnings };
  }

  for (const room of nonSpawn) budgets.set(room.id, 1);
  const remaining = total - nonSpawn.length;
  const totalArea = nonSpawn.reduce((sum, room) => sum + room.area, 0);
  const shares = nonSpawn.map((room) => {
    const exact = totalArea === 0 ? remaining / nonSpawn.length : (remaining * room.area) / totalArea;
    const floor = Math.floor(exact);
    budgets.set(room.id, 1 + floor);
    return { room, floor, remainder: exact - floor };
  });

  let leftover = remaining - shares.reduce((sum, share) => sum + share.floor, 0);
  const ordered = [...shares].sort(
    (a, b) =>
      b.remainder - a.remainder || b.room.area - a.room.area || a.room.id - b.room.id,
  );
  let cursor = 0;
  while (leftover > 0 && ordered.length > 0) {
    const share = ordered[cursor % ordered.length];
    budgets.set(share.room.id, (budgets.get(share.room.id) ?? 0) + 1);
    leftover -= 1;
    cursor += 1;
  }

  return { budgets, warnings };
}

/**
 * Recorta presupuestos que no caben con separación ≥2 y reparte el exceso.
 * Se conserva como utilidad histórica; la v3 usa componentes ≤2 y no la necesita.
 */
export function fitBudgetsToCapacity(
  rooms: readonly Room[],
  budgets: ReadonlyMap<number, number>,
  capacities: ReadonlyMap<number, number>,
  spawnRoomId: number,
  total: number,
): { budgets: Map<number, number>; warnings: string[] } {
  const warnings: string[] = [];
  const next = new Map(budgets);
  const nonSpawn = rooms.filter((room) => room.id !== spawnRoomId);
  let excess = 0;
  for (const room of nonSpawn) {
    const budget = next.get(room.id) ?? 0;
    const capacity = capacities.get(room.id) ?? 0;
    if (budget > capacity) {
      next.set(room.id, capacity);
      excess += budget - capacity;
    }
  }

  while (excess > 0) {
    const candidates = nonSpawn.filter(
      (room) => (next.get(room.id) ?? 0) < (capacities.get(room.id) ?? 0),
    );
    if (candidates.length === 0) break;
    candidates.sort((a, b) => {
      const shareA = a.area / ((next.get(a.id) ?? 0) + 1);
      const shareB = b.area / ((next.get(b.id) ?? 0) + 1);
      return shareB - shareA || b.area - a.area || a.id - b.id;
    });
    const room = candidates[0];
    next.set(room.id, (next.get(room.id) ?? 0) + 1);
    excess -= 1;
  }

  if (excess > 0) {
    warnings.push(
      `La separación ≥2 limita el mapa a ${total - excess} de ${total} enemigos.`,
    );
  }
  return { budgets: next, warnings };
}

export interface EnemyRoomPriority {
  readonly id: number;
  readonly area: number;
  readonly distance: number;
}

/** Asigna tipos: cobardes a lo más lejano, brutos al área mayor, centinelas al resto. */
export function assignEnemyTypes(
  rooms: readonly EnemyRoomPriority[],
  budgets: ReadonlyMap<number, number>,
  counts: EnemyTypeCounts,
): { roomId: number; type: EnemyType }[] {
  const capacities = new Map<number, number>();
  for (const [id, value] of budgets) capacities.set(id, value);
  const available = rooms.filter((room) => (capacities.get(room.id) ?? 0) > 0);
  const byDistance = [...available].sort(
    (a, b) => b.distance - a.distance || a.id - b.id,
  );
  const byArea = [...available].sort(
    (a, b) => b.area - a.area || a.id - b.id,
  );
  const assignments: { roomId: number; type: EnemyType }[] = [];

  function take(type: EnemyType, order: readonly EnemyRoomPriority[], count: number): void {
    let remaining = count;
    while (remaining > 0) {
      let placed = false;
      for (const room of order) {
        const capacity = capacities.get(room.id) ?? 0;
        if (capacity <= 0) continue;
        capacities.set(room.id, capacity - 1);
        assignments.push({ roomId: room.id, type });
        remaining -= 1;
        placed = true;
        if (remaining === 0) break;
      }
      if (!placed) break;
    }
  }

  take('coward', byDistance, counts.cowards);
  take('brute', byArea, counts.brutes);
  take('sentinel', [...available].sort((a, b) => a.id - b.id), counts.sentinels);
  return assignments;
}

export function hasLineOfSight(
  tiles: readonly Tile[],
  width: number,
  height: number,
  from: Point,
  to: Point,
): boolean {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const steps = Math.max(Math.abs(dx), Math.abs(dy)) * 4;
  if (steps === 0) return true;
  for (let step = 1; step < steps; step += 1) {
    const x = Math.round(from.x + (dx * step) / steps);
    const y = Math.round(from.y + (dy * step) / steps);
    if (!inBounds(x, y, width, height)) return false;
    if (tiles[y * width + x] !== 1) return false;
  }
  return true;
}

function hasLineOfSightToSpawn(
  tiles: readonly Tile[],
  width: number,
  height: number,
  cell: Point,
  spawns: Spawns,
): boolean {
  return spawns.party.some((hole) =>
    hasLineOfSight(tiles, width, height, cell, hole),
  );
}

function roomMask(room: Room): Set<string> {
  return new Set(room.cells.map((cell) => pointKey(cell.x, cell.y)));
}

/** Celda interior: sus 4 vecinos ortogonales son suelo de la misma sala. */
export function interiorCell(room: Room, cell: Point, mask?: ReadonlySet<string>): boolean {
  const roomCells = mask ?? roomMask(room);
  return neighbors4(cell.x, cell.y).every((next) =>
    roomCells.has(pointKey(next.x, next.y)),
  );
}

function wallNeighborCount(
  tiles: readonly Tile[],
  width: number,
  height: number,
  cell: Point,
): number {
  return neighbors4(cell.x, cell.y).filter(
    (next) =>
      !inBounds(next.x, next.y, width, height) ||
      tiles[next.y * width + next.x] === 0,
  ).length;
}

function roomAccessCells(
  room: Room,
  doors: readonly Door[],
  openMouths: readonly OpenMouth[],
): Point[] {
  const cells: Point[] = [];
  for (const door of doors) {
    if (door.roomA === room.id || door.roomB === room.id) {
      cells.push({ x: door.x, y: door.y });
    }
  }
  for (const mouth of openMouths) {
    if (mouth.roomA === room.id || mouth.roomB === room.id) {
      cells.push({ x: mouth.x, y: mouth.y });
    }
  }
  return cells;
}

interface EnemyCandidate {
  readonly point: Point;
  readonly interior: boolean;
  readonly hotspotReason: HotspotReason | null;
  readonly roll: number;
  readonly eligibleHotspot: boolean;
  readonly hiddenHit: boolean;
  readonly noLosToSpawn: boolean;
}

function hotspotRoll(seed: number, cell: Point): number {
  const hash = hashSeed(
    seed ^ Math.imul(cell.x + 1, 0x9e3779b1) ^ Math.imul(cell.y + 7, 0x85ebca77),
    0x5bd1e995,
  );
  return hash / 0x1_0000_0000;
}

function roomCandidates(
  room: Room,
  input: EnemyInput,
  hiddenEnemyChance: number,
  doorsAt: ReadonlySet<string>,
  spawnHoles: ReadonlySet<string>,
): { candidates: EnemyCandidate[]; hotspots: Hotspot[] } {
  const mask = roomMask(room);
  const access = roomAccessCells(room, input.doors, input.openMouths);
  const reserved = reservedExitCells(input.exit ?? null);
  const candidates: EnemyCandidate[] = [];
  const hotspots: Hotspot[] = [];

  for (const cell of room.cells) {
    const key = pointKey(cell.x, cell.y);
    if (doorsAt.has(key) || spawnHoles.has(key) || reserved.has(key)) continue;
    if (input.tiles[cell.y * input.width + cell.x] !== 1) continue;

    const interior = interiorCell(room, cell, mask);
    const wallCount = wallNeighborCount(input.tiles, input.width, input.height, cell);
    const noLosToSpawn = !hasLineOfSightToSpawn(
      input.tiles,
      input.width,
      input.height,
      cell,
      input.spawns,
    );
    const noLosToAccess =
      access.length === 0 ||
      !access.some((target) =>
        hasLineOfSight(input.tiles, input.width, input.height, cell, target),
      );
    const corner = wallCount >= 3;
    const noLos = noLosToSpawn && noLosToAccess;
    const reason: HotspotReason | null =
      corner && noLos ? 'ambos' : corner ? 'rincon' : noLos ? 'sin-LOS' : null;
    const roll = hotspotRoll(input.seed, cell);
    const eligibleHotspot = reason !== null && noLosToSpawn;
    const hiddenHit = eligibleHotspot && roll < hiddenEnemyChance;

    const candidate: EnemyCandidate = {
      point: { x: cell.x, y: cell.y },
      interior,
      hotspotReason: reason,
      roll,
      eligibleHotspot,
      hiddenHit,
      noLosToSpawn,
    };
    candidates.push(candidate);
    if (reason) {
      hotspots.push({
        x: cell.x,
        y: cell.y,
        roomId: room.id,
        reason,
        roll,
        eligible: eligibleHotspot,
        occupied: false,
      });
    }
  }

  return { candidates, hotspots };
}

function candidateOrder(a: EnemyCandidate, b: EnemyCandidate, seed: number): number {
  return (
    Number(b.hiddenHit) - Number(a.hiddenHit) ||
    Number(b.interior) - Number(a.interior) ||
    deterministicOrder(seed, a.point, 0x7feb352d) -
      deterministicOrder(seed, b.point, 0x7feb352d) ||
    a.point.y - b.point.y ||
    a.point.x - b.point.x
  );
}

/**
 * Selecciona hasta `budget` fichas respetando componentes ≤2. El orden decide
 * la prioridad: emboscadas elegibles, interior, borde.
 */
function selectCandidates(
  ordered: readonly EnemyCandidate[],
  budget: number,
): EnemyCandidate[] {
  if (budget <= 0 || ordered.length === 0) return [];
  const chosen: EnemyCandidate[] = [];
  let best: EnemyCandidate[] = [];
  let nodes = 0;
  const maxNodes = 200_000;

  function search(start: number): boolean {
    if (chosen.length > best.length) best = [...chosen];
    if (chosen.length >= budget) return true;
    nodes += 1;
    if (nodes > maxNodes) return false;
    for (let index = start; index < ordered.length; index += 1) {
      if (chosen.length + (ordered.length - index) <= best.length) break;
      const candidate = ordered[index];
      const points = chosen.map((item) => item.point);
      if (componentSizeWith(points, candidate.point) > ENEMY_MAX_COMPONENT) continue;
      chosen.push(candidate);
      if (search(index + 1)) return true;
      chosen.pop();
    }
    return false;
  }

  search(0);
  return best;
}

interface RoomPlacement {
  readonly selected: readonly EnemyCandidate[];
  readonly hotspots: readonly Hotspot[];
  readonly relaxed: number;
}

function placeRoomEnemies(
  room: Room,
  budget: number,
  input: EnemyInput,
  hiddenEnemyChance: number,
  doorsAt: ReadonlySet<string>,
  spawnHoles: ReadonlySet<string>,
): RoomPlacement {
  const { candidates, hotspots } = roomCandidates(
    room,
    input,
    hiddenEnemyChance,
    doorsAt,
    spawnHoles,
  );
  const strict = candidates
    .filter((candidate) => candidate.noLosToSpawn)
    .sort((a, b) => candidateOrder(a, b, input.seed));
  let selected = selectCandidates(strict, budget);
  let relaxed = 0;

  if (selected.length < budget) {
    const all = [...candidates].sort((a, b) => candidateOrder(a, b, input.seed));
    const withLos = selectCandidates(all, budget);
    if (withLos.length > selected.length) {
      relaxed = withLos.length - selected.length;
      selected = withLos;
    }
  }

  // Preferencia estricta por interior: si un borde no emboscado puede sustituirse
  // por un interior libre sin romper componentes, se sustituye.
  for (let index = 0; index < selected.length; index += 1) {
    const current = selected[index];
    if (current.interior || current.hiddenHit) continue;
    const others = selected.filter((_, otherIndex) => otherIndex !== index);
    const pool = strict.filter(
      (candidate) =>
        candidate.interior &&
        candidate.noLosToSpawn &&
        !selected.some((item) => item.point.x === candidate.point.x && item.point.y === candidate.point.y),
    );
    const replacement = pool.find(
      (candidate) =>
        componentSizeWith(
          others.map((item) => item.point),
          candidate.point,
        ) <= ENEMY_MAX_COMPONENT,
    );
    if (replacement) selected[index] = replacement;
  }

  const selectedKeys = new Set(selected.map((candidate) => pointKey(candidate.point.x, candidate.point.y)));
  const finalHotspots = hotspots.map((hotspot) => {
    const candidate = selected.find(
      (item) => item.point.x === hotspot.x && item.point.y === hotspot.y,
    );
    return {
      ...hotspot,
      eligible: hotspot.eligible,
      occupied: Boolean(candidate?.hiddenHit && selectedKeys.has(pointKey(hotspot.x, hotspot.y))),
    };
  });

  return { selected, hotspots: finalHotspots, relaxed };
}

export function placeEnemies(input: EnemyInput): EnemyResult {
  const warnings: string[] = [];
  const surfaceN = input.rooms.reduce((sum, room) => sum + room.area, 0);
  const surfaceTerm = Math.ceil(input.enemySurfaceFactor * surfaceN);
  const playersTerm = Math.ceil(input.enemyPlayersFactor * input.numPlayers);
  const total = surfaceTerm + playersTerm;
  const hiddenEnemyChance = Math.min(1, Math.max(0, input.hiddenEnemyChance));

  const { budgets, warnings: budgetWarnings } = distributeEnemyBudget(
    input.rooms,
    input.spawns.roomId,
    total,
  );
  warnings.push(...budgetWarnings);

  const finalBudgets = budgets;
  const planned = input.rooms.reduce(
    (sum, room) => sum + (finalBudgets.get(room.id) ?? 0),
    0,
  );
  const counts = enemyTypeCounts(planned);
  const priorities: EnemyRoomPriority[] = input.rooms.map((room) => ({
    id: room.id,
    area: room.area,
    distance: roomDistanceToPoint(room, input.spawns.player),
  }));
  const assignments = assignEnemyTypes(priorities, finalBudgets, counts);
  const doorsAt = doorKeySet(input.doors);
  const spawnHoles = new Set(input.spawns.party.map((hole) => pointKey(hole.x, hole.y)));

  const assignmentsByRoom = new Map<number, EnemyType[]>();
  for (const assignment of assignments) {
    const list = assignmentsByRoom.get(assignment.roomId) ?? [];
    list.push(assignment.type);
    assignmentsByRoom.set(assignment.roomId, list);
  }

  const enemies: Enemy[] = [];
  const hotspots: Hotspot[] = [];
  const missingByRoom = new Map<number, number>();
  const relaxedByRoom = new Map<number, number>();

  for (const room of input.rooms) {
    const types = assignmentsByRoom.get(room.id) ?? [];
    if (types.length === 0) continue;
    const placement = placeRoomEnemies(
      room,
      types.length,
      input,
      hiddenEnemyChance,
      doorsAt,
      spawnHoles,
    );
    hotspots.push(...placement.hotspots);
    if (placement.relaxed > 0) {
      relaxedByRoom.set(room.id, placement.relaxed);
    }
    for (let index = 0; index < types.length; index += 1) {
      const chosen = placement.selected[index];
      if (!chosen) {
        missingByRoom.set(room.id, (missingByRoom.get(room.id) ?? 0) + 1);
        continue;
      }
      enemies.push({
        id: `enemy-${room.id}-${enemies.filter((enemy) => enemy.roomId === room.id).length}`,
        type: types[index],
        x: chosen.point.x,
        y: chosen.point.y,
        roomId: room.id,
        home: { x: chosen.point.x, y: chosen.point.y },
        hidden: chosen.hiddenHit,
        interior: chosen.interior,
      });
    }
  }

  for (const [roomId, missing] of missingByRoom) {
    warnings.push(
      `La sala ${roomId} no pudo colocar ${missing} enemigo${missing === 1 ? '' : 's'} con componentes ≤2 y sin visión al spawn.`,
    );
  }
  for (const [roomId, relaxed] of relaxedByRoom) {
    warnings.push(
      `Se relajó la línea de visión al spawn en la sala ${roomId} (${relaxed} enemigo${relaxed === 1 ? '' : 's'}).`,
    );
  }
  if (enemies.length < planned) {
    warnings.push(
      `Se colocaron ${enemies.length} enemigos de ${planned} planificados (${total} pedidos).`,
    );
  }

  const perRoom = input.rooms.map((room) => finalBudgets.get(room.id) ?? 0);
  const placedPerRoom = input.rooms.map(
    (room) => enemies.filter((enemy) => enemy.roomId === room.id).length,
  );
  const points = enemies.map((enemy) => ({ x: enemy.x, y: enemy.y }));
  const hidden = enemies.filter((enemy) => enemy.hidden).length;
  const interior = enemies.filter((enemy) => enemy.interior).length;
  const eligibleHotspots = hotspots.filter((hotspot) => hotspot.eligible).length;

  return {
    enemies,
    hotspots,
    warnings,
    breakdown: {
      surfaceN,
      playersP: input.numPlayers,
      surfaceFactor: input.enemySurfaceFactor,
      playersFactor: input.enemyPlayersFactor,
      surfaceTerm,
      playersTerm,
      total,
      planned,
      perRoom,
      placedPerRoom,
      sentinels: enemies.filter((enemy) => enemy.type === 'sentinel').length,
      brutes: enemies.filter((enemy) => enemy.type === 'brute').length,
      cowards: enemies.filter((enemy) => enemy.type === 'coward').length,
      interior,
      border: enemies.length - interior,
      hidden,
      hotspotsTotal: hotspots.length,
      hotspotsEligible: eligibleHotspots,
      hotspotRolls: eligibleHotspots,
      hotspotsOccupied: hidden,
      componentsMax: maxComponentSize(points),
    },
  };
}

/** Vecinos ortogonales de una celda; se exporta para tests de percepción. */
export function adjacentCells(x: number, y: number): Point[] {
  return neighbors4(x, y);
}
