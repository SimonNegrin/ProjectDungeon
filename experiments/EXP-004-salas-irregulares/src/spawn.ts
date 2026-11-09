/**
 * Selección de la sala protegida, los seis huecos de grupo y el reparto de
 * enemigos de REQ-012. Funciones puras y deterministas, sin DOM ni relojes.
 */

import { inBounds, neighbors4, pointKey } from './grid';
import { hashSeed } from './rng';
import type {
  Corridor,
  Door,
  Enemy,
  EnemyType,
  Point,
  Room,
  Spawns,
  Tile,
} from './types';

export const SPAWN_MIN_TILES = 6;
export const MAX_EMPTY_ROOMS = 1;
export const MAX_ENEMIES_PER_ROOM = 2;
export const ENEMY_SEPARATION = 2;

interface SpawnInput {
  readonly rooms: readonly Room[];
  readonly doors: readonly Door[];
  readonly corridors: readonly Corridor[];
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
  readonly emptyRoomChance: number;
}

interface EnemyResult {
  readonly enemies: readonly Enemy[];
  readonly warnings: readonly string[];
}

function doorKeySet(doors: readonly Door[]): Set<string> {
  return new Set(doors.map((door) => pointKey(door.x, door.y)));
}

function freeCells(room: Room, doors: readonly Door[]): Point[] {
  const doorsAt = doorKeySet(doors);
  return room.cells.filter((cell) => !doorsAt.has(pointKey(cell.x, cell.y)));
}

function distanceToDoors(cell: Point, doors: readonly Door[]): number {
  if (doors.length === 0) return 0;
  return Math.min(...doors.map((door) => Math.abs(door.x - cell.x) + Math.abs(door.y - cell.y)));
}

function deterministicOrder(seed: number, cell: Point, salt: number): number {
  return hashSeed(seed ^ (cell.x * 73856093) ^ (cell.y * 19349663), salt);
}

function chooseParty(
  room: Room,
  doors: readonly Door[],
  seed: number,
  minTiles: number,
): Point[] {
  const candidates = freeCells(room, doors);
  if (candidates.length === 0) return [];
  const selected: Point[] = [];
  const pool = [...candidates];

  while (selected.length < minTiles && pool.length > 0) {
    let best: Point | null = null;
    let bestScore = -1;
    for (const cell of pool) {
      const spread =
        selected.length === 0
          ? Number.MAX_SAFE_INTEGER
          : Math.min(
              ...selected.map((hole) =>
                Math.max(Math.abs(hole.x - cell.x), Math.abs(hole.y - cell.y)),
              ),
            );
      const away = distanceToDoors(cell, doors);
      const score = spread * 10_000 + away * 100 + (deterministicOrder(seed, cell, 0x51ed270b) % 100);
      if (score > bestScore) {
        best = cell;
        bestScore = score;
      }
    }
    if (!best) break;
    selected.push(best);
    const index = pool.findIndex((cell) => cell.x === best.x && cell.y === best.y);
    if (index >= 0) pool.splice(index, 1);
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

  let party = chooseParty(spawnRoom, input.doors, input.seed, input.minTiles);
  if (party.length < input.minTiles) {
    const fallbackCells = freeCells(spawnRoom, input.doors).sort(
      (a, b) =>
        deterministicOrder(input.seed, a, 0x9e3779b9) -
        deterministicOrder(input.seed, b, 0x9e3779b9),
    );
    for (const cell of fallbackCells) {
      if (party.length >= input.minTiles) break;
      if (!party.some((hole) => hole.x === cell.x && hole.y === cell.y)) party.push(cell);
    }
    warnings.push('La sala de spawn no alcanzó los huecos pedidos; se relajó el reparto.');
  }

  if (party.length === 0) {
    const firstFloor = input.tiles.findIndex((tile) => tile === 1);
    if (firstFloor >= 0) {
      const point = { x: firstFloor % input.width, y: Math.floor(firstFloor / input.width) };
      party = [point];
      warnings.push('La sala de spawn quedó sin huecos; se usó el primer suelo.');
    }
  }

  const player = party[0] ?? { x: 1, y: 1 };
  return {
    spawns: { roomId: spawnRoom.id, party, player },
    warnings,
  };
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

function distanceFromSpawn(room: Room, spawns: Spawns): number {
  const center = roomCenter(room);
  return Math.abs(center.x - spawns.player.x) + Math.abs(center.y - spawns.player.y);
}

function emptyRoomId(
  rooms: readonly Room[],
  spawns: Spawns,
  seed: number,
  chance: number,
): number | null {
  const nonSpawn = rooms.filter((room) => room.id !== spawns.roomId);
  if (nonSpawn.length < 4) return null;
  const roll = (hashSeed(seed, 0x2545f491) % 1000) / 1000;
  if (roll >= chance) return null;
  const leaves = nonSpawn.filter((room) => room.accesses === 1).sort((a, b) => a.id - b.id);
  const pool = leaves.length > 0 ? leaves : [...nonSpawn].sort((a, b) => a.id - b.id);
  const index = hashSeed(seed, 0x6a09e667) % pool.length;
  return pool[index].id;
}

function enemyBudgets(
  rooms: readonly Room[],
  spawns: Spawns,
  seed: number,
  chance: number,
): { budgets: Map<number, number>; emptyId: number | null } {
  const budgets = new Map<number, number>();
  const nonSpawn = rooms.filter((room) => room.id !== spawns.roomId);
  const emptyId = emptyRoomId(rooms, spawns, seed, chance);
  for (const room of nonSpawn) {
    budgets.set(room.id, room.id === emptyId ? 0 : 1);
  }
  if (emptyId !== null) {
    const occupied = nonSpawn.filter((room) => budgets.get(room.id) === 1);
    const target = [...occupied].sort(
      (a, b) =>
        (budgets.get(a.id) ?? 0) - (budgets.get(b.id) ?? 0) ||
        distanceFromSpawn(b, spawns) - distanceFromSpawn(a, spawns) ||
        a.id - b.id,
    )[0];
    if (target) budgets.set(target.id, Math.min(MAX_ENEMIES_PER_ROOM, (budgets.get(target.id) ?? 0) + 1));
  }
  return { budgets, emptyId };
}

function assignmentsFor(
  rooms: readonly Room[],
  budgets: ReadonlyMap<number, number>,
  spawns: Spawns,
): { roomId: number; type: EnemyType }[] {
  const occupied = rooms
    .filter((room) => (budgets.get(room.id) ?? 0) > 0)
    .sort(
      (a, b) =>
        distanceFromSpawn(b, spawns) - distanceFromSpawn(a, spawns) ||
        a.id - b.id,
    );
  const total = [...budgets.values()].reduce((sum, value) => sum + value, 0);
  const perRoom = new Map<number, EnemyType[]>();
  for (const room of occupied) perRoom.set(room.id, []);

  if (total === 1 && occupied[0]) {
    perRoom.get(occupied[0].id)?.push('sentinel');
  } else if (total >= 2) {
    if (occupied[0]) perRoom.get(occupied[0].id)?.push('coward');
    if (occupied[1]) perRoom.get(occupied[1].id)?.push('brute');
  }

  let remaining = total - [...perRoom.values()].reduce((sum, list) => sum + list.length, 0);
  while (remaining > 0) {
    let placed = false;
    for (const room of occupied) {
      const list = perRoom.get(room.id);
      const budget = budgets.get(room.id) ?? 0;
      if (!list || list.length >= budget) continue;
      list.push('sentinel');
      remaining -= 1;
      placed = true;
      if (remaining === 0) break;
    }
    if (!placed) break;
  }

  const assignments: { roomId: number; type: EnemyType }[] = [];
  for (const room of occupied) {
    for (const type of perRoom.get(room.id) ?? []) {
      assignments.push({ roomId: room.id, type });
    }
  }
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

function chebyshev(a: Point, b: Point): number {
  return Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y));
}

export function placeEnemies(input: EnemyInput): EnemyResult {
  const warnings: string[] = [];
  const { budgets } = enemyBudgets(
    input.rooms,
    input.spawns,
    input.seed,
    input.emptyRoomChance,
  );
  const assignments = assignmentsFor(input.rooms, budgets, input.spawns);
  const doorsAt = doorKeySet(input.doors);
  const spawnHoles = new Set(input.spawns.party.map((hole) => pointKey(hole.x, hole.y)));
  const enemies: Enemy[] = [];

  for (const assignment of assignments) {
    const room = input.rooms.find((item) => item.id === assignment.roomId);
    if (!room) continue;
    const candidates = room.cells
      .filter((cell) => !doorsAt.has(pointKey(cell.x, cell.y)))
      .filter((cell) => !spawnHoles.has(pointKey(cell.x, cell.y)))
      .sort(
        (a, b) =>
          distanceFromSpawnPoint(b, input.spawns) - distanceFromSpawnPoint(a, input.spawns) ||
          deterministicOrder(input.seed, a, 0x1b873593) -
            deterministicOrder(input.seed, b, 0x1b873593) ||
          a.y - b.y ||
          a.x - b.x,
      );

    let chosen: Point | null = null;
    let relaxedSeparation = false;

    for (const cell of candidates) {
      if (enemies.some((enemy) => enemy.x === cell.x && enemy.y === cell.y)) continue;
      if (enemies.some((enemy) => chebyshev(enemy, cell) < ENEMY_SEPARATION)) continue;
      if (hasLineOfSightToSpawn(input.tiles, input.width, input.height, cell, input.spawns)) continue;
      chosen = cell;
      break;
    }

    if (!chosen) {
      for (const cell of candidates) {
        if (enemies.some((enemy) => enemy.x === cell.x && enemy.y === cell.y)) continue;
        if (enemies.some((enemy) => chebyshev(enemy, cell) < ENEMY_SEPARATION)) continue;
        chosen = cell;
        break;
      }
    }

    if (!chosen) {
      relaxedSeparation = true;
      for (const cell of candidates) {
        if (enemies.some((enemy) => enemy.x === cell.x && enemy.y === cell.y)) continue;
        chosen = cell;
        break;
      }
    }

    if (!chosen) {
      warnings.push(`La sala ${room.id} no tenía un hueco válido para su enemigo.`);
      continue;
    }

    if (relaxedSeparation) warnings.push(`Se relajó la separación de enemigos en la sala ${room.id}.`);

    enemies.push({
      id: `enemy-${room.id}-${enemies.filter((enemy) => enemy.roomId === room.id).length}`,
      type: assignment.type,
      x: chosen.x,
      y: chosen.y,
      roomId: room.id,
      home: { x: chosen.x, y: chosen.y },
    });
  }

  return { enemies, warnings };
}

function distanceFromSpawnPoint(cell: Point, spawns: Spawns): number {
  return Math.abs(cell.x - spawns.player.x) + Math.abs(cell.y - spawns.player.y);
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

/**
 * Reubica los huecos del grupo dentro de la sala de spawn para que ninguno
 * quede a la vista de las fichas ya colocadas. Si no hay suficientes celdas
 * ocultas, conserva los huecos originales y avisa.
 */
export function refineSpawnHoles(input: {
  readonly rooms: readonly Room[];
  readonly doors: readonly Door[];
  readonly tiles: readonly Tile[];
  readonly width: number;
  readonly height: number;
  readonly spawns: Spawns;
  readonly enemies: readonly Enemy[];
  readonly minTiles: number;
}): { spawns: Spawns; warnings: readonly string[] } {
  const room = input.rooms.find((item) => item.id === input.spawns.roomId);
  if (!room) return { spawns: input.spawns, warnings: [] };

  const doorsAt = doorKeySet(input.doors);
  const enemyAt = new Set(input.enemies.map((enemy) => pointKey(enemy.x, enemy.y)));
  const candidates = room.cells.filter((cell) => {
    if (doorsAt.has(pointKey(cell.x, cell.y))) return false;
    if (enemyAt.has(pointKey(cell.x, cell.y))) return false;
    return !input.enemies.some((enemy) =>
      hasLineOfSight(input.tiles, input.width, input.height, enemy, cell),
    );
  });

  if (candidates.length < input.minTiles) {
    return {
      spawns: input.spawns,
      warnings: ['No había suficientes huecos de spawn ocultos para todos los enemigos.'],
    };
  }

  const selected: Point[] = [];
  const pool = [...candidates];
  while (selected.length < input.minTiles && pool.length > 0) {
    let best: Point | null = null;
    let bestScore = -1;
    for (const cell of pool) {
      const spread =
        selected.length === 0
          ? Number.MAX_SAFE_INTEGER
          : Math.min(
              ...selected.map((hole) =>
                Math.max(Math.abs(hole.x - cell.x), Math.abs(hole.y - cell.y)),
              ),
            );
      const away = distanceToDoors(cell, input.doors);
      const score = spread * 10_000 + away * 100 + (hashSeed(input.spawns.roomId ^ (cell.x * 31 + cell.y * 17), 0x7f4a7c15) % 100);
      if (score > bestScore) {
        best = cell;
        bestScore = score;
      }
    }
    if (!best) break;
    selected.push(best);
    const index = pool.findIndex((cell) => cell.x === best.x && cell.y === best.y);
    if (index >= 0) pool.splice(index, 1);
  }

  if (selected.length < input.minTiles) {
    return {
      spawns: input.spawns,
      warnings: ['No se pudieron repartir los huecos de spawn ocultos.'],
    };
  }

  return {
    spawns: {
      roomId: input.spawns.roomId,
      party: selected,
      player: selected[0],
    },
    warnings: [],
  };
}

/** Vecinos ortogonales de una celda; se exporta para tests de percepción. */
export function adjacentCells(x: number, y: number): Point[] {
  return neighbors4(x, y);
}
