/**
 * Reparto y colocación de enemigos del generador denso de REQ-012 (TASK-0045).
 *
 * El total se calcula por superficie de salas y número de jugadores; el reparto
 * es proporcional al área con mínimo 1 por sala no-spawn. La colocación prefiere
 * interiores, permite parejas con componente global ≤2 y usa emboscadas en
 * puntos calientes. La ausencia de visión inicial reutiliza `hasLineOfSight` de
 * `perception.ts`. Sin DOM, relojes ni `Math.random`.
 */

import type { Door, Exit, MapEnemy, Room } from '../../map';
import { hasLineOfSight } from '../../perception';
import type { EnemyType } from '../../bestiary';
import type { Grid, Position, Tile } from '../../types';
import type { OpenMouth } from './doors';
import { reservedExitCells } from './exit';
import { inBounds, neighbors4, pointKey, type Point } from './grid';
import { hashSeed } from './rng';
import {
  componentSizeWith,
  maxComponentSize,
  roomAreaOf,
  roomCellsOf,
  type SpawnPlacement,
} from './spawn';

export const ENEMY_MAX_COMPONENT = 2;
export const ENEMY_SURFACE_FACTOR = 0.02;
export const ENEMY_PLAYERS_FACTOR = 1.2;
export const DEFAULT_PLAYERS = 6;
export const DEFAULT_HIDDEN_ENEMY_CHANCE = 0.25;
export const ENEMY_BRUTE_SHARE = 0.2;
export const ENEMY_COWARD_SHARE = 0.2;

export interface ChamberEnemyInput {
  readonly rooms: readonly Room[];
  readonly doors: readonly Door[];
  readonly openMouths: readonly OpenMouth[];
  readonly exit?: Exit | null;
  readonly tiles: readonly Tile[];
  readonly width: number;
  readonly height: number;
  readonly spawns: SpawnPlacement;
  readonly seed: number;
  readonly enemySurfaceFactor: number;
  readonly enemyPlayersFactor: number;
  readonly numPlayers: number;
  readonly hiddenEnemyChance: number;
}

export type HotspotReason = 'rincon' | 'sin-LOS' | 'ambos';

/** Punto caliente candidato para emboscada, con su tirada determinista. */
export interface Hotspot {
  readonly x: number;
  readonly y: number;
  readonly roomId: number;
  readonly reason: HotspotReason;
  /** Tirada independiente en [0,1). */
  readonly roll: number;
  /** Elegible para colocar una ficha (sin exclusión ni LOS al spawn). */
  readonly eligible: boolean;
  readonly occupied: boolean;
}

/** Desglose serializable del presupuesto de enemigos de REQ-012 R-006/R-008. */
export interface EnemyBreakdownResult {
  readonly surfaceN: number;
  readonly playersP: number;
  readonly surfaceFactor: number;
  readonly playersFactor: number;
  readonly surfaceTerm: number;
  readonly playersTerm: number;
  readonly total: number;
  readonly planned: number;
  /** Presupuesto por sala, indexado por `roomId`. */
  readonly perRoom: readonly number[];
  /** Fichas realmente colocadas por sala, indexado por `roomId`. */
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

export interface ChamberEnemyResult {
  readonly enemies: readonly MapEnemy[];
  readonly hotspots: readonly Hotspot[];
  readonly warnings: readonly string[];
  readonly breakdown: EnemyBreakdownResult;
}

function doorKeySet(doors: readonly Door[]): Set<string> {
  return new Set(doors.map((door) => pointKey(door.x, door.y)));
}

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
    const ordered = [...nonSpawn].sort(
      (a, b) => roomAreaOf(b) - roomAreaOf(a) || a.id - b.id,
    );
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
  const totalArea = nonSpawn.reduce((sum, room) => sum + roomAreaOf(room), 0);
  const shares = nonSpawn.map((room) => {
    const exact =
      totalArea === 0 ? remaining / nonSpawn.length : (remaining * roomAreaOf(room)) / totalArea;
    const floor = Math.floor(exact);
    budgets.set(room.id, 1 + floor);
    return { room, floor, remainder: exact - floor };
  });

  let leftover = remaining - shares.reduce((sum, share) => sum + share.floor, 0);
  const ordered = [...shares].sort(
    (a, b) =>
      b.remainder - a.remainder ||
      roomAreaOf(b.room) - roomAreaOf(a.room) ||
      a.room.id - b.room.id,
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
  const byArea = [...available].sort((a, b) => b.area - a.area || a.id - b.id);
  const assignments: { roomId: number; type: EnemyType }[] = [];

  const take = (type: EnemyType, order: readonly EnemyRoomPriority[], count: number): void => {
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
  };

  take('coward', byDistance, counts.cowards);
  take('brute', byArea, counts.brutes);
  take('sentinel', [...available].sort((a, b) => a.id - b.id), counts.sentinels);
  return assignments;
}

function roomMask(room: Room): Set<string> {
  return new Set(roomCellsOf(room).map((cell) => pointKey(cell.x, cell.y)));
}

/** Celda interior: sus 4 vecinos ortogonales son suelo de la misma sala. */
export function interiorCell(
  room: Room,
  cell: Point,
  mask?: ReadonlySet<string>,
): boolean {
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
      tiles[next.y * width + next.x] === 'wall',
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

function hasLineOfSightToSpawn(
  grid: Grid,
  cell: Point,
  spawns: SpawnPlacement,
): boolean {
  return spawns.party.some((hole) => hasLineOfSight(grid, cell, hole));
}

function roomCandidates(
  room: Room,
  input: ChamberEnemyInput,
  grid: Grid,
  doorsAt: ReadonlySet<string>,
  spawnHoles: ReadonlySet<string>,
): { candidates: EnemyCandidate[]; hotspots: Hotspot[] } {
  const mask = roomMask(room);
  const access = roomAccessCells(room, input.doors, input.openMouths);
  const reserved = reservedExitCells(input.exit ?? null);
  const candidates: EnemyCandidate[] = [];
  const hotspots: Hotspot[] = [];
  const hiddenEnemyChance = Math.min(1, Math.max(0, input.hiddenEnemyChance));

  for (const cell of roomCellsOf(room)) {
    const key = pointKey(cell.x, cell.y);
    if (doorsAt.has(key) || spawnHoles.has(key) || reserved.has(key)) continue;
    if (input.tiles[cell.y * input.width + cell.x] !== 'floor') continue;

    const interior = interiorCell(room, cell, mask);
    const wallCount = wallNeighborCount(input.tiles, input.width, input.height, cell);
    const noLosToSpawn = !hasLineOfSightToSpawn(grid, cell, input.spawns);
    const noLosToAccess =
      access.length === 0 ||
      !access.some((target) => hasLineOfSight(grid, cell, target));
    const corner = wallCount >= 3;
    const noLos = noLosToSpawn && noLosToAccess;
    const reason: HotspotReason | null =
      corner && noLos ? 'ambos' : corner ? 'rincon' : noLos ? 'sin-LOS' : null;
    const roll = hotspotRoll(input.seed, cell);
    const eligibleHotspot = reason !== null && noLosToSpawn;

    candidates.push({
      point: { x: cell.x, y: cell.y },
      interior,
      hotspotReason: reason,
      roll,
      eligibleHotspot,
      hiddenHit: eligibleHotspot && roll < hiddenEnemyChance,
      noLosToSpawn,
    });
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
    hashSeed(seed ^ (a.point.x * 73856093) ^ (a.point.y * 19349663), 0x7feb352d) -
      hashSeed(seed ^ (b.point.x * 73856093) ^ (b.point.y * 19349663), 0x7feb352d) ||
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
  placed: readonly Point[] = [],
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
      const points = [...placed, ...chosen.map((item) => item.point)];
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
  input: ChamberEnemyInput,
  grid: Grid,
  doorsAt: ReadonlySet<string>,
  spawnHoles: ReadonlySet<string>,
  placed: readonly Point[] = [],
): RoomPlacement {
  const { candidates, hotspots } = roomCandidates(
    room,
    input,
    grid,
    doorsAt,
    spawnHoles,
  );
  const strict = candidates
    .filter((candidate) => candidate.noLosToSpawn)
    .sort((a, b) => candidateOrder(a, b, input.seed));
  let selected = selectCandidates(strict, budget, placed);
  let relaxed = 0;

  if (selected.length < budget) {
    const all = [...candidates].sort((a, b) => candidateOrder(a, b, input.seed));
    const withLos = selectCandidates(all, budget, placed);
    if (withLos.length > selected.length) {
      relaxed = withLos.length - selected.length;
      selected = withLos;
    }
  }

  // Preferencia estricta por interior: si un borde no emboscado puede sustituirse
  // por un interior libre sin romper componentes (locales ni globales), se sustituye.
  for (let index = 0; index < selected.length; index += 1) {
    const current = selected[index];
    if (current.interior || current.hiddenHit) continue;
    const others = selected.filter((_, otherIndex) => otherIndex !== index);
    const pool = strict.filter(
      (candidate) =>
        candidate.interior &&
        candidate.noLosToSpawn &&
        !selected.some(
          (item) =>
            item.point.x === candidate.point.x && item.point.y === candidate.point.y,
        ),
    );
    const replacement = pool.find(
      (candidate) =>
        componentSizeWith(
          [...placed, ...others.map((item) => item.point)],
          candidate.point,
        ) <= ENEMY_MAX_COMPONENT,
    );
    if (replacement) selected[index] = replacement;
  }

  const selectedKeys = new Set(
    selected.map((candidate) => pointKey(candidate.point.x, candidate.point.y)),
  );
  const finalHotspots = hotspots.map((hotspot) => {
    const candidate = selected.find(
      (item) => item.point.x === hotspot.x && item.point.y === hotspot.y,
    );
    return {
      ...hotspot,
      occupied: Boolean(candidate?.hiddenHit && selectedKeys.has(pointKey(hotspot.x, hotspot.y))),
    };
  });

  return { selected, hotspots: finalHotspots, relaxed };
}

function roomDistanceToPoint(room: Room, point: Point): number {
  const cells = roomCellsOf(room);
  if (cells.length === 0) return 0;
  const center = cells.reduce(
    (accumulator, cell) => ({
      x: accumulator.x + cell.x / cells.length,
      y: accumulator.y + cell.y / cells.length,
    }),
    { x: 0, y: 0 },
  );
  return Math.abs(center.x - point.x) + Math.abs(center.y - point.y);
}

/**
 * Reparte y coloca los enemigos del generador denso. Nunca supera `T`, no
 * coloca en la sala de spawn ni en la salida reservada y emite avisos cuando un
 * presupuesto no cabe.
 */
export function placeChamberEnemies(input: ChamberEnemyInput): ChamberEnemyResult {
  const warnings: string[] = [];
  const grid: Grid = { width: input.width, height: input.height, tiles: input.tiles };
  const surfaceN = input.rooms.reduce((sum, room) => sum + roomAreaOf(room), 0);
  const surfaceTerm = Math.ceil(input.enemySurfaceFactor * surfaceN);
  const playersTerm = Math.ceil(input.enemyPlayersFactor * input.numPlayers);
  const total = surfaceTerm + playersTerm;
  const spawnRoomId = input.spawns.roomId;

  const { budgets, warnings: budgetWarnings } = distributeEnemyBudget(
    input.rooms,
    spawnRoomId,
    total,
  );
  warnings.push(...budgetWarnings);

  const planned = input.rooms.reduce(
    (sum, room) => sum + (budgets.get(room.id) ?? 0),
    0,
  );
  const counts = enemyTypeCounts(planned);
  const priorities: EnemyRoomPriority[] = input.rooms.map((room) => ({
    id: room.id,
    area: roomAreaOf(room),
    distance: roomDistanceToPoint(room, input.spawns.player),
  }));
  const assignments = assignEnemyTypes(priorities, budgets, counts);
  const doorsAt = doorKeySet(input.doors);
  const spawnHoles = new Set(
    input.spawns.party.map((hole) => pointKey(hole.x, hole.y)),
  );

  const assignmentsByRoom = new Map<number, EnemyType[]>();
  for (const assignment of assignments) {
    const list = assignmentsByRoom.get(assignment.roomId) ?? [];
    list.push(assignment.type);
    assignmentsByRoom.set(assignment.roomId, list);
  }

  const enemies: MapEnemy[] = [];
  const hotspots: Hotspot[] = [];
  const missingByRoom = new Map<number, number>();
  const relaxedByRoom = new Map<number, number>();
  const placements = new Map<number, RoomPlacement>();
  const placedPoints: Point[] = [];

  // Pase secuencial: cada sala ve las fichas ya colocadas para que la
  // componente global de 8 direcciones nunca supere 2, no solo la local.
  for (const room of input.rooms) {
    const types = assignmentsByRoom.get(room.id) ?? [];
    if (types.length === 0) continue;
    const placement = placeRoomEnemies(
      room,
      types.length,
      input,
      grid,
      doorsAt,
      spawnHoles,
      placedPoints,
    );
    placements.set(room.id, placement);
    placedPoints.push(...placement.selected.map((candidate) => candidate.point));
  }

  // Post-pase determinista de reubicación: si una sala se quedó corta por los
  // conflictos globales, se recalcula su selección viendo el resto del mapa.
  for (let pass = 0; pass < 2; pass += 1) {
    let improved = false;
    for (const room of input.rooms) {
      const types = assignmentsByRoom.get(room.id) ?? [];
      const placement = placements.get(room.id);
      if (!placement || placement.selected.length >= types.length) continue;
      const others = input.rooms
        .filter((other) => other.id !== room.id)
        .flatMap((other) =>
          (placements.get(other.id)?.selected ?? []).map((candidate) => candidate.point),
        );
      const retry = placeRoomEnemies(
        room,
        types.length,
        input,
        grid,
        doorsAt,
        spawnHoles,
        others,
      );
      if (retry.selected.length > placement.selected.length) {
        placements.set(room.id, retry);
        improved = true;
      }
    }
    if (!improved) break;
  }

  for (const room of input.rooms) {
    const types = assignmentsByRoom.get(room.id) ?? [];
    const placement = placements.get(room.id);
    if (!placement) continue;
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
      const countInRoom = enemies.filter((enemy) => enemy.roomId === room.id).length;
      enemies.push({
        id: `enemy-${room.id}-${countInRoom}`,
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

  const perRoom = input.rooms.map((room) => budgets.get(room.id) ?? 0);
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
      hotspotRolls: hotspots.length,
      hotspotsOccupied: hidden,
      componentsMax: maxComponentSize(points),
    },
  };
}

/** Vecinos ortogonales de una celda; se exporta para tests de percepción. */
export function adjacentCells(x: number, y: number): Position[] {
  return neighbors4(x, y);
}
