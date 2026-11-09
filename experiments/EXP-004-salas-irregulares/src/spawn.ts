/**
 * Spawn alrededor del acceso y reparto de enemigos de REQ-012 v2 (EXP-004).
 *
 * Todo es puro y determinista: sin DOM, relojes ni `Math.random`. Las funciones
 * exportadas permiten que los tests validen fórmula, reparto y prioridades sin
 * generar un mapa completo.
 */

import { inBounds, neighbors4, pointKey } from './grid';
import { hashSeed } from './rng';
import type {
  Door,
  Enemy,
  EnemyType,
  OpenMouth,
  Point,
  Room,
  Spawns,
  Tile,
} from './types';

export const SPAWN_MIN_TILES = 6;
export const SPAWN_RADIUS = 2;
export const SPAWN_FALLBACK_RADIUS = 3;
export const SPAWN_SEPARATION = 2;
export const ENEMY_SEPARATION = 2;
export const ENEMY_SURFACE_FACTOR = 0.02;
export const ENEMY_PLAYERS_FACTOR = 1.35;
export const DEFAULT_PLAYERS = 3;
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
  readonly tiles: readonly Tile[];
  readonly width: number;
  readonly height: number;
  readonly spawns: Spawns;
  readonly seed: number;
  readonly enemySurfaceFactor: number;
  readonly enemyPlayersFactor: number;
  readonly numPlayers: number;
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
}

interface EnemyResult {
  readonly enemies: readonly Enemy[];
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
        chebyshev(cell, input.access) >= SPAWN_SEPARATION &&
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
 * incluyendo el acceso y con separación Chebyshev ≥2 entre todos. Devuelve el
 * conjunto máximo encontrado; si no llega a `minTiles`, el llamador avisa y no
 * relaja la separación. Nunca inventa huecos adyacentes.
 */
function searchParty(input: PartySearchInput): Point[] {
  const ordered = orderPartyCandidates(input);
  const target = Math.max(0, input.minTiles - 1);
  const chosen: Point[] = [];
  let best: Point[] = [];
  let nodes = 0;
  const maxNodes = 500_000;

  function search(start: number): boolean {
    if (chosen.length > best.length) best = [...chosen];
    if (chosen.length >= target) return true;
    nodes += 1;
    if (nodes > maxNodes) return false;
    for (let index = start; index < ordered.length; index += 1) {
      if (chosen.length + (ordered.length - index) <= best.length) break;
      const cell = ordered[index];
      if (chosen.some((other) => chebyshev(other, cell) < SPAWN_SEPARATION)) continue;
      chosen.push(cell);
      if (search(index + 1)) return true;
      chosen.pop();
    }
    return false;
  }

  search(0);
  return [input.access, ...best];
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
      `La sala de spawn solo ofreció ${selected.length} de ${minTiles} huecos libres con separación ≥2.`,
    );
  }

  return selected;
}

export function placeSpawns(input: SpawnInput): SpawnResult {
  const warnings: string[] = [];
  const viable = input.rooms
    .filter((room) => freeCells(room, input.doors).length >= input.minTiles)
    .sort(
      (a, b) =>
        a.accesses - b.accesses ||
        freeCells(b, input.doors).length - freeCells(a, input.doors).length ||
        b.area - a.area ||
        a.id - b.id,
    );

  let spawnRoom = viable[0] ?? null;
  if (!spawnRoom) {
    const fallback = [...input.rooms].sort(
      (a, b) =>
        freeCells(b, input.doors).length - freeCells(a, input.doors).length ||
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
 * Recorta presupuestos que no caben con separación ≥2 y reparte el exceso por
 * área entre las salas con capacidad. Es determinista y no muta la entrada.
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

function enemyCandidates(
  room: Room,
  doorsAt: ReadonlySet<string>,
  spawnHoles: ReadonlySet<string>,
  spawns: Spawns,
  seed: number,
): Point[] {
  return room.cells
    .filter((cell) => !doorsAt.has(pointKey(cell.x, cell.y)))
    .filter((cell) => !spawnHoles.has(pointKey(cell.x, cell.y)))
    .sort(
      (a, b) =>
        Math.abs(b.x - spawns.player.x) +
          Math.abs(b.y - spawns.player.y) -
          (Math.abs(a.x - spawns.player.x) + Math.abs(a.y - spawns.player.y)) ||
        deterministicOrder(seed, a, 0x1b873593) -
          deterministicOrder(seed, b, 0x1b873593) ||
        a.y - b.y ||
        a.x - b.x,
    );
}

/** Máximo de fichas separadas ≥2 que caben en una sala, en orden determinista. */
export function separationCapacity(
  room: Room,
  doors: readonly Door[],
  spawns: Spawns,
  seed: number,
): number {
  const doorsAt = doorKeySet(doors);
  const spawnHoles = new Set(spawns.party.map((hole) => pointKey(hole.x, hole.y)));
  const cells = enemyCandidates(room, doorsAt, spawnHoles, spawns, seed);
  const chosen: Point[] = [];
  for (const cell of cells) {
    if (chosen.every((other) => chebyshev(other, cell) >= ENEMY_SEPARATION)) {
      chosen.push(cell);
    }
  }
  return chosen.length;
}

/**
 * Busca `budget` posiciones separadas ≥2 y no bloqueadas por visión. Devuelve
 * menos si no existe combinación; el llamador avisa y no relaja la regla.
 */
export function selectEnemyPositions(
  candidates: readonly Point[],
  budget: number,
  blocked: (cell: Point) => boolean = () => false,
): Point[] {
  if (budget <= 0) return [];
  const allowed = candidates.filter((cell) => !blocked(cell));
  const chosen: Point[] = [];
  let nodes = 0;
  const maxNodes = 200_000;

  function search(start: number): boolean {
    if (chosen.length >= budget) return true;
    nodes += 1;
    if (nodes > maxNodes) return false;
    for (let index = start; index < allowed.length; index += 1) {
      const cell = allowed[index];
      if (chosen.some((other) => chebyshev(other, cell) < ENEMY_SEPARATION)) continue;
      chosen.push(cell);
      if (search(index + 1)) return true;
      chosen.pop();
    }
    return false;
  }

  return search(0) ? [...chosen] : [];
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

export function placeEnemies(input: EnemyInput): EnemyResult {
  const warnings: string[] = [];
  const surfaceN = input.rooms.reduce((sum, room) => sum + room.area, 0);
  const surfaceTerm = Math.ceil(input.enemySurfaceFactor * surfaceN);
  const playersTerm = Math.ceil(input.enemyPlayersFactor * input.numPlayers);
  const total = surfaceTerm + playersTerm;

  const { budgets, warnings: budgetWarnings } = distributeEnemyBudget(
    input.rooms,
    input.spawns.roomId,
    total,
  );
  warnings.push(...budgetWarnings);

  const capacities = new Map(
    input.rooms.map((room) => [
      room.id,
      separationCapacity(room, input.doors, input.spawns, input.seed),
    ]),
  );
  const fitted = fitBudgetsToCapacity(
    input.rooms,
    budgets,
    capacities,
    input.spawns.roomId,
    total,
  );
  warnings.push(...fitted.warnings);

  const finalBudgets = fitted.budgets;
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

  const positionsByRoom = new Map<number, Point[]>();
  const visionRelaxedByRoom = new Map<number, number>();
  for (const room of input.rooms) {
    const budget = assignmentsByRoom.get(room.id)?.length ?? 0;
    if (budget === 0) continue;
    const candidates = enemyCandidates(room, doorsAt, spawnHoles, input.spawns, input.seed);
    const blocked = (cell: Point) =>
      hasLineOfSightToSpawn(input.tiles, input.width, input.height, cell, input.spawns);
    const strict = selectEnemyPositions(candidates, budget, blocked);
    if (strict.length >= budget) {
      positionsByRoom.set(room.id, strict);
      continue;
    }
    const relaxed = selectEnemyPositions(candidates, budget);
    if (relaxed.length > strict.length) {
      positionsByRoom.set(room.id, relaxed);
      visionRelaxedByRoom.set(room.id, relaxed.length - strict.length);
    } else {
      positionsByRoom.set(room.id, strict);
    }
  }

  const enemies: Enemy[] = [];
  const missingByRoom = new Map<number, number>();

  for (const assignment of assignments) {
    const room = input.rooms.find((item) => item.id === assignment.roomId);
    if (!room) continue;
    const positions = positionsByRoom.get(room.id);
    const chosen = positions?.shift();
    if (!chosen) {
      missingByRoom.set(room.id, (missingByRoom.get(room.id) ?? 0) + 1);
      continue;
    }
    enemies.push({
      id: `enemy-${room.id}-${enemies.filter((enemy) => enemy.roomId === room.id).length}`,
      type: assignment.type,
      x: chosen.x,
      y: chosen.y,
      roomId: room.id,
      home: { x: chosen.x, y: chosen.y },
    });
  }

  for (const [roomId, missing] of missingByRoom) {
    warnings.push(
      `La sala ${roomId} no pudo colocar ${missing} enemigo${missing === 1 ? '' : 's'} con separación ≥2 y sin visión al spawn.`,
    );
  }
  for (const [roomId, relaxed] of visionRelaxedByRoom) {
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

  return {
    enemies,
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
    },
  };
}

/** Vecinos ortogonales de una celda; se exporta para tests de percepción. */
export function adjacentCells(x: number, y: number): Point[] {
  return neighbors4(x, y);
}
