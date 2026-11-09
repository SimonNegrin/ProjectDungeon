/**
 * Generador BSP determinista de mazmorras.
 *
 * Implementa `MapGenerator` con `id = 'bsp'`. No importa DOM ni el host y toda
 * la aleatoriedad sale de `mulberry32`. El modelo de salida es JSON-safe.
 */

import {
  classifyRoom,
  countPathCorners,
  DEFAULT_MAP_OPTIONS,
  dedupePath,
  DOOR_STYLES,
  isLargeRoom,
  isSmallRoom,
  longestStraight,
  maxDeadEndLength,
  mulberry32,
  normalizeSeed,
  pathLength,
  placeMapWeapons,
  randInt,
  resolveMapOptions,
  straightPathRuns,
  validateGeneratedMap,
  type Corridor,
  type CorridorKind,
  type Door,
  type DoorStyle,
  type GeneratedMap,
  type MapGenerator,
  type MapOptions,
  type ResolvedMapOptions,
  type Room,
  type RoomRole,
  type Spawns,
} from './map';
import type { Position, Tile } from './types';
import type { OpenMouth } from './chambers/core/doors';
import { placeSpawns, SPAWN_MIN_TILES, type SpawnPlacement } from './chambers/core/spawn';
import { hasLineOfSight } from './perception';

const DIRECTIONS: ReadonlyArray<readonly [number, number]> = [
  [0, -1],
  [1, 0],
  [0, 1],
  [-1, 0],
];

const MAX_ROLE_SLOTS = 3;
const MAX_GENERATION_ATTEMPTS = 8;
const MAX_BSP_ROLE_ATTEMPTS = 120;

interface MutableRoom {
  id: number;
  x: number;
  y: number;
  width: number;
  height: number;
  role: RoomRole;
}

interface BspNode {
  x: number;
  y: number;
  w: number;
  h: number;
  left?: BspNode;
  right?: BspNode;
  roomId?: number;
}

interface DoorSlot {
  readonly x: number;
  readonly y: number;
  readonly outX: number;
  readonly outY: number;
  readonly orientation: 'horizontal' | 'vertical';
  readonly roomId: number;
}

interface GenerationContext {
  readonly width: number;
  readonly height: number;
  readonly rooms: MutableRoom[];
  readonly tiles: Uint8Array;
  readonly roomCells: Uint8Array;
  readonly nearRoom: Uint8Array;
  readonly reserved: Uint8Array;
  readonly usedSlots: DoorSlot[][];
  readonly slotCache: DoorSlot[][];
  readonly connections: Corridor[];
  readonly warnings: string[];
  readonly pathMask: Uint8Array;
}

interface ConnectionCandidate {
  readonly slotA: DoorSlot;
  readonly slotB: DoorSlot;
  readonly path: Position[];
}

interface RoleSides {
  readonly min: number;
  readonly max: number;
}

interface RolePlan {
  readonly roles: RoomRole[];
  readonly largeTarget: number;
  readonly smallTarget: number;
  readonly warnings: string[];
}

interface PlacementResult {
  readonly rooms: MutableRoom[];
  readonly root: BspNode | null;
  readonly largeTarget: number;
  readonly smallTarget: number;
  readonly degraded: boolean;
  readonly warnings: string[];
}

interface ShapeState {
  cornersSatisfied: boolean;
}

function indexOf(width: number, x: number, y: number): number {
  return y * width + x;
}

function inBounds(width: number, height: number, x: number, y: number): boolean {
  return x >= 0 && y >= 0 && x < width && y < height;
}

function isCorridorArea(width: number, height: number, x: number, y: number): boolean {
  return x >= 1 && y >= 1 && x <= width - 2 && y <= height - 2;
}

function samePosition(a: Position, b: Position): boolean {
  return a.x === b.x && a.y === b.y;
}

// ---------------------------------------------------------------------------
// Programa de roles y partición BSP
// ---------------------------------------------------------------------------

function roleSides(role: RoomRole, options: ResolvedMapOptions): RoleSides | null {
  let min: number;
  let max: number;
  if (role === 'large') {
    min = Math.max(7, options.roomMin);
    max = Math.min(9, options.roomMax);
  } else if (role === 'small') {
    min = Math.max(3, options.roomMin);
    max = Math.min(5, options.roomMax);
  } else {
    min = Math.max(6, options.roomMin);
    max = Math.min(8, options.roomMax);
  }
  return min <= max ? { min, max } : null;
}

function roleMinSide(role: RoomRole, options: ResolvedMapOptions): number {
  return roleSides(role, options)?.min ?? options.roomMin;
}

function buildRolePlan(options: ResolvedMapOptions): RolePlan {
  const warnings: string[] = [];
  const roles: RoomRole[] = [];
  const large = roleSides('large', options);
  const small = roleSides('small', options);
  const medium = roleSides('medium', options);

  let largeTarget = 0;
  let smallTarget = 0;
  if (large) {
    largeTarget = 2;
  } else {
    warnings.push(
      `No caben 2 salas grandes (7×7 a 9×9) con sala máxima ${options.roomMax}; se usa el mejor reparto posible.`,
    );
  }
  if (small) {
    smallTarget = 3;
  } else {
    warnings.push(
      `Con sala mínima ${options.roomMin} no caben las 3 salas pequeñas (3×3 a 5×5); se usan solo grandes y medianas.`,
    );
  }

  for (let index = 0; index < largeTarget; index += 1) roles.push('large');
  for (let index = 0; index < smallTarget; index += 1) roles.push('small');
  while (roles.length < options.roomTarget && medium) roles.push('medium');
  while (roles.length < options.roomTarget) {
    if (large) roles.push('large');
    else if (small) roles.push('small');
    else break;
  }
  if (roles.length > options.roomTarget) roles.length = options.roomTarget;

  return { roles, largeTarget, smallTarget, warnings };
}

function buildBspTree(
  rng: () => number,
  options: ResolvedMapOptions,
): { root: BspNode; leaves: BspNode[] } {
  const margin = 2;
  const root: BspNode = {
    x: margin,
    y: margin,
    w: options.mapWidth - margin * 2,
    h: options.mapHeight - margin * 2,
  };
  const leaves: BspNode[] = [root];
  const minLeaf = options.roomMin + 2;
  const leafCapacity = (w: number, h: number): number =>
    w >= minLeaf && h >= minLeaf
      ? Math.floor(w / minLeaf) * Math.floor(h / minLeaf)
      : 0;

  let totalCapacity = leafCapacity(root.w, root.h);

  while (leaves.length < options.roomTarget) {
    let bestIndex = -1;
    let bestArea = -1;
    let bestSplit = -1;
    let bestVertical = false;

    for (let index = 0; index < leaves.length; index += 1) {
      const leaf = leaves[index];
      const canVertical = leaf.w >= minLeaf * 2 && leaf.h >= minLeaf;
      const canHorizontal = leaf.h >= minLeaf * 2 && leaf.w >= minLeaf;
      if (!canVertical && !canHorizontal) continue;

      const area = leaf.w * leaf.h;
      if (area < bestArea) continue;

      const required = options.roomTarget - totalCapacity + leafCapacity(leaf.w, leaf.h);
      let split = -1;
      let vertical = false;

      for (const candidateVertical of [true, false]) {
        const can = candidateVertical ? canVertical : canHorizontal;
        if (!can) continue;
        const length = candidateVertical ? leaf.w : leaf.h;
        const other = candidateVertical ? leaf.h : leaf.w;
        const valid: number[] = [];
        for (let candidate = minLeaf; candidate <= length - minLeaf; candidate += 1) {
          const first = leafCapacity(candidate, other);
          const second = leafCapacity(length - candidate, other);
          if (first + second >= required) valid.push(candidate);
        }
        if (valid.length === 0) continue;
        split = valid[Math.floor(rng() * valid.length)];
        vertical = candidateVertical;
        break;
      }

      if (split < 0) continue;
      bestIndex = index;
      bestArea = area;
      bestSplit = split;
      bestVertical = vertical;
    }

    if (bestIndex < 0) break;

    const leaf = leaves[bestIndex];
    const previousCapacity = leafCapacity(leaf.w, leaf.h);
    if (bestVertical) {
      leaf.left = { x: leaf.x, y: leaf.y, w: bestSplit, h: leaf.h };
      leaf.right = { x: leaf.x + bestSplit, y: leaf.y, w: leaf.w - bestSplit, h: leaf.h };
      totalCapacity =
        totalCapacity -
        previousCapacity +
        leafCapacity(bestSplit, leaf.h) +
        leafCapacity(leaf.w - bestSplit, leaf.h);
    } else {
      leaf.left = { x: leaf.x, y: leaf.y, w: leaf.w, h: bestSplit };
      leaf.right = { x: leaf.x, y: leaf.y + bestSplit, w: leaf.w, h: leaf.h - bestSplit };
      totalCapacity =
        totalCapacity -
        previousCapacity +
        leafCapacity(leaf.w, bestSplit) +
        leafCapacity(leaf.w, leaf.h - bestSplit);
    }
    leaves.splice(bestIndex, 1, leaf.left, leaf.right);
  }

  return { root, leaves };
}

function assignRolesToLeaves(
  leaves: readonly BspNode[],
  roles: readonly RoomRole[],
  options: ResolvedMapOptions,
): Array<RoomRole | null> | null {
  if (leaves.length !== roles.length) return null;

  const capacities = leaves.map((leaf) => Math.min(leaf.w, leaf.h) - 2);
  const available = new Array<boolean>(leaves.length).fill(true);
  const result = new Array<RoomRole | null>(leaves.length).fill(null);

  const ordered = roles
    .map((role, index) => ({ role, index }))
    .sort(
      (a, b) =>
        roleMinSide(b.role, options) - roleMinSide(a.role, options) || a.index - b.index,
    );

  for (const { role } of ordered) {
    const needed = roleMinSide(role, options);
    let chosen = -1;
    for (let index = 0; index < leaves.length; index += 1) {
      if (!available[index] || capacities[index] < needed) continue;
      if (chosen < 0 || capacities[index] < capacities[chosen]) chosen = index;
    }
    if (chosen < 0) return null;
    available[chosen] = false;
    result[chosen] = role;
  }

  return result;
}

function tryBspRolePlacement(
  rng: () => number,
  options: ResolvedMapOptions,
  plan: RolePlan,
): { root: BspNode; rooms: MutableRoom[] } | null {
  for (let attempt = 0; attempt < MAX_BSP_ROLE_ATTEMPTS; attempt += 1) {
    const built = buildBspTree(rng, options);
    if (built.leaves.length !== plan.roles.length) continue;

    const assignment = assignRolesToLeaves(built.leaves, plan.roles, options);
    if (!assignment) continue;

    const rooms: MutableRoom[] = [];
    let placedAll = true;
    for (let leafIndex = 0; leafIndex < built.leaves.length; leafIndex += 1) {
      const leaf = built.leaves[leafIndex];
      const role = assignment[leafIndex];
      const sides = role ? roleSides(role, options) : null;
      if (!role || !sides) {
        placedAll = false;
        break;
      }

      const maxW = Math.min(sides.max, leaf.w - 2);
      const maxH = Math.min(sides.max, leaf.h - 2);
      if (maxW < sides.min || maxH < sides.min) {
        placedAll = false;
        break;
      }

      const width = randInt(rng, sides.min, maxW);
      const height = randInt(rng, sides.min, maxH);
      const minX = leaf.x + 1;
      const minY = leaf.y + 1;
      const maxX = leaf.x + leaf.w - 1 - width;
      const maxY = leaf.y + leaf.h - 1 - height;
      if (maxX < minX || maxY < minY) {
        placedAll = false;
        break;
      }

      const room: MutableRoom = {
        id: rooms.length,
        x: randInt(rng, minX, maxX),
        y: randInt(rng, minY, maxY),
        width,
        height,
        role,
      };
      rooms.push(room);
      leaf.roomId = room.id;
    }

    if (placedAll) return { root: built.root, rooms };
  }

  return null;
}

interface PackedItem {
  readonly side: number;
  readonly role: RoomRole;
}

interface PackedRow {
  readonly items: PackedItem[];
  width: number;
  height: number;
}

function packRoleRooms(
  roles: readonly RoomRole[],
  options: ResolvedMapOptions,
): MutableRoom[] | null {
  const order = [...roles].sort(
    (a, b) => roleMinSide(b, options) - roleMinSide(a, options),
  );
  const margin = 2;
  const usableWidth = options.mapWidth - margin * 2;
  const usableHeight = options.mapHeight - margin * 2;

  for (const gap of [3, 2, 1]) {
    const rows: PackedRow[] = [];
    let row: PackedRow = { items: [], width: 0, height: 0 };
    let fits = true;

    for (const role of order) {
      const side = roleMinSide(role, options);
      if (side > usableWidth) {
        fits = false;
        break;
      }
      const added = row.items.length === 0 ? side : side + gap;
      if (row.width + added > usableWidth) {
        rows.push(row);
        row = { items: [], width: 0, height: 0 };
      }
      row.width += row.items.length === 0 ? side : side + gap;
      row.height = Math.max(row.height, side);
      row.items.push({ side, role });
    }
    if (row.items.length > 0) rows.push(row);
    if (!fits) continue;

    const totalHeight =
      rows.reduce((sum, current) => sum + current.height, 0) +
      gap * Math.max(0, rows.length - 1);
    if (totalHeight > usableHeight) continue;

    const extraSpace = usableHeight - totalHeight;
    const rowOffsets = [0, 3, 1, 4, 2];
    const rooms: MutableRoom[] = [];
    let y = margin;

    rows.forEach((currentRow, rowIndex) => {
      const maxOffset = Math.max(0, usableWidth - currentRow.width);
      const offset =
        rowIndex === 0 ? 0 : Math.min(maxOffset, rowOffsets[rowIndex % rowOffsets.length]);
      let x = margin + offset;
      for (const item of currentRow.items) {
        rooms.push({
          id: rooms.length,
          x,
          y,
          width: item.side,
          height: item.side,
          role: item.role,
        });
        x += item.side + gap;
      }
      y += currentRow.height + gap + (rowIndex === 0 ? extraSpace : 0);
    });

    return rooms;
  }

  return null;
}

/**
 * Reparto de respaldo cuando el programa exacto de roles no cabe (por ejemplo,
 * 24×24). Coloca una sala válida por hoja BSP y clasifica su rol por tamaño.
 */
function placeBestEffortRooms(
  rng: () => number,
  options: ResolvedMapOptions,
): { root: BspNode; rooms: MutableRoom[] } | null {
  const built = buildBspTree(rng, options);
  const rooms: MutableRoom[] = [];

  for (const leaf of built.leaves) {
    const capacity = Math.min(leaf.w, leaf.h) - 2;
    const candidates: RoomRole[] = [];
    if (capacity >= 7) candidates.push('large');
    if (capacity >= 6) candidates.push('medium');
    if (capacity >= 4) candidates.push('small');

    for (const role of candidates) {
      const sides = roleSides(role, options);
      if (!sides) continue;
      const maxW = Math.min(sides.max, leaf.w - 2);
      const maxH = Math.min(sides.max, leaf.h - 2);
      if (maxW < sides.min || maxH < sides.min) continue;

      const width = randInt(rng, sides.min, maxW);
      const height = randInt(rng, sides.min, maxH);
      const minX = leaf.x + 1;
      const minY = leaf.y + 1;
      const maxX = leaf.x + leaf.w - 1 - width;
      const maxY = leaf.y + leaf.h - 1 - height;
      if (maxX < minX || maxY < minY) continue;

      const room: MutableRoom = {
        id: rooms.length,
        x: randInt(rng, minX, maxX),
        y: randInt(rng, minY, maxY),
        width,
        height,
        role: classifyRoom({ width, height }),
      };
      rooms.push(room);
      leaf.roomId = room.id;
      break;
    }
  }

  return rooms.length > 0 ? { root: built.root, rooms } : null;
}

function emergencyRooms(options: ResolvedMapOptions): MutableRoom[] {
  const side = Math.min(6, options.mapWidth - 6, options.mapHeight - 6);
  const first: MutableRoom = {
    id: 0,
    x: 2,
    y: 2,
    width: side,
    height: side,
    role: classifyRoom({ width: side, height: side }),
  };
  const second: MutableRoom = {
    id: 1,
    x: options.mapWidth - 2 - side,
    y: options.mapHeight - 2 - side,
    width: side,
    height: side,
    role: classifyRoom({ width: side, height: side }),
  };
  return [first, second];
}

function placeRooms(
  rng: () => number,
  options: ResolvedMapOptions,
  plan: RolePlan,
): PlacementResult {
  const bsp = tryBspRolePlacement(rng, options, plan);
  if (bsp) {
    return {
      rooms: bsp.rooms,
      root: bsp.root,
      largeTarget: plan.largeTarget,
      smallTarget: plan.smallTarget,
      degraded: false,
      warnings: [...plan.warnings],
    };
  }

  const packed = packRoleRooms(plan.roles, options);
  if (packed) {
    return {
      rooms: packed,
      root: null,
      largeTarget: plan.largeTarget,
      smallTarget: plan.smallTarget,
      degraded: false,
      warnings: [
        ...plan.warnings,
        'Colocación de respaldo determinista para garantizar el programa de roles.',
      ],
    };
  }

  const bestEffort = placeBestEffortRooms(rng, options);
  if (bestEffort) {
    const largeTarget = bestEffort.rooms.filter(isLargeRoom).length;
    const smallTarget = bestEffort.rooms.filter(isSmallRoom).length;
    return {
      rooms: bestEffort.rooms,
      root: bestEffort.root,
      largeTarget,
      smallTarget,
      degraded: true,
      warnings: [
        ...plan.warnings,
        `No se pudo garantizar el programa de roles en ${options.mapWidth}×${options.mapHeight}; se usa el mejor reparto BSP posible.`,
      ],
    };
  }

  return {
    rooms: emergencyRooms(options),
    root: null,
    largeTarget: 0,
    smallTarget: 0,
    degraded: true,
    warnings: [
      ...plan.warnings,
      'No se pudo colocar ninguna sala con el programa pedido; se usa el mapa de emergencia.',
    ],
  };
}

// ---------------------------------------------------------------------------
// Contexto de generación, slots y pasillos
// ---------------------------------------------------------------------------

function createContext(
  rooms: MutableRoom[],
  options: ResolvedMapOptions,
  warnings: string[],
): GenerationContext {
  const width = options.mapWidth;
  const height = options.mapHeight;
  const size = width * height;
  const tiles = new Uint8Array(size);
  const roomCells = new Uint8Array(size);

  for (const room of rooms) {
    for (let y = room.y; y < room.y + room.height; y += 1) {
      for (let x = room.x; x < room.x + room.width; x += 1) {
        const index = indexOf(width, x, y);
        roomCells[index] = 1;
        tiles[index] = 1;
      }
    }
  }

  const nearRoom = new Uint8Array(size);
  for (let y = 1; y < height - 1; y += 1) {
    for (let x = 1; x < width - 1; x += 1) {
      const index = indexOf(width, x, y);
      if (roomCells[index]) continue;
      if (
        roomCells[indexOf(width, x, y - 1)] ||
        roomCells[indexOf(width, x + 1, y)] ||
        roomCells[indexOf(width, x, y + 1)] ||
        roomCells[indexOf(width, x - 1, y)]
      ) {
        nearRoom[index] = 1;
      }
    }
  }

  return {
    width,
    height,
    rooms,
    tiles,
    roomCells,
    nearRoom,
    reserved: new Uint8Array(size),
    usedSlots: rooms.map(() => []),
    slotCache: rooms.map(() => []),
    connections: [],
    warnings,
    pathMask: new Uint8Array(size),
  };
}

function samplePositions(length: number): number[] {
  if (length <= 0) return [];
  if (length <= 3) return Array.from({ length }, (_, index) => index);
  const last = length - 1;
  return [0, Math.floor(last / 3), Math.floor((2 * last) / 3), last];
}

function doorSlotsForRoom(room: MutableRoom): DoorSlot[] {
  const slots: DoorSlot[] = [];
  const horizontalLength = room.width - 2;
  const verticalLength = room.height - 2;

  for (const position of samplePositions(horizontalLength)) {
    slots.push({
      x: room.x + 1 + position,
      y: room.y - 1,
      outX: 0,
      outY: -1,
      orientation: 'horizontal',
      roomId: room.id,
    });
    slots.push({
      x: room.x + 1 + position,
      y: room.y + room.height,
      outX: 0,
      outY: 1,
      orientation: 'horizontal',
      roomId: room.id,
    });
  }

  for (const position of samplePositions(verticalLength)) {
    slots.push({
      x: room.x - 1,
      y: room.y + 1 + position,
      outX: -1,
      outY: 0,
      orientation: 'vertical',
      roomId: room.id,
    });
    slots.push({
      x: room.x + room.width,
      y: room.y + 1 + position,
      outX: 1,
      outY: 0,
      orientation: 'vertical',
      roomId: room.id,
    });
  }

  return slots;
}

function cachedSlots(context: GenerationContext, room: MutableRoom): DoorSlot[] {
  const cached = context.slotCache[room.id];
  if (cached.length === 0) {
    const slots = doorSlotsForRoom(room);
    context.slotCache[room.id] = slots;
    return slots;
  }
  return cached;
}

function perpendicularOffsets(slot: DoorSlot): ReadonlyArray<readonly [number, number]> {
  return slot.orientation === 'horizontal'
    ? [
        [-1, 0],
        [1, 0],
      ]
    : [
        [0, -1],
        [0, 1],
      ];
}

function slotIsUsable(context: GenerationContext, slot: DoorSlot): boolean {
  const { width, height, tiles, roomCells, reserved } = context;
  if (!isCorridorArea(width, height, slot.x, slot.y)) return false;

  const slotIndex = indexOf(width, slot.x, slot.y);
  if (tiles[slotIndex] || reserved[slotIndex]) return false;

  const outwardX = slot.x + slot.outX;
  const outwardY = slot.y + slot.outY;
  if (!isCorridorArea(width, height, outwardX, outwardY)) return false;
  if (roomCells[indexOf(width, outwardX, outwardY)]) return false;

  const behindX = slot.x - slot.outX;
  const behindY = slot.y - slot.outY;
  if (!roomCells[indexOf(width, behindX, behindY)]) return false;

  for (const [dx, dy] of perpendicularOffsets(slot)) {
    const x = slot.x + dx;
    const y = slot.y + dy;
    if (!inBounds(width, height, x, y)) return false;
    const index = indexOf(width, x, y);
    if (tiles[index] || reserved[index]) return false;
  }

  for (const other of context.usedSlots[slot.roomId]) {
    if (Math.abs(other.x - slot.x) <= 1 && Math.abs(other.y - slot.y) <= 1) return false;
  }

  for (const [dx, dy] of DIRECTIONS) {
    const x = slot.x + dx;
    const y = slot.y + dy;
    if (!inBounds(width, height, x, y)) continue;
    if (!roomCells[indexOf(width, x, y)]) continue;
    if (x !== behindX || y !== behindY) return false;
  }

  return true;
}

function usableSlots(context: GenerationContext, room: MutableRoom): DoorSlot[] {
  return cachedSlots(context, room).filter((slot) => slotIsUsable(context, slot));
}

function wouldCloseBlock(context: GenerationContext, x: number, y: number): boolean {
  const { width, height, tiles } = context;
  for (let offsetY = -1; offsetY <= 0; offsetY += 1) {
    for (let offsetX = -1; offsetX <= 0; offsetX += 1) {
      let complete = true;
      for (let dy = 0; dy <= 1 && complete; dy += 1) {
        for (let dx = 0; dx <= 1 && complete; dx += 1) {
          const cellX = x + offsetX + dx;
          const cellY = y + offsetY + dy;
          if (cellX === x && cellY === y) continue;
          if (!inBounds(width, height, cellX, cellY)) {
            complete = false;
            break;
          }
          if (!tiles[indexOf(width, cellX, cellY)]) complete = false;
        }
      }
      if (complete) return true;
    }
  }
  return false;
}

function isPassable(context: GenerationContext, x: number, y: number): boolean {
  const { width, height, tiles, roomCells, nearRoom, reserved } = context;
  if (!isCorridorArea(width, height, x, y)) return false;
  const index = indexOf(width, x, y);
  if (roomCells[index] || nearRoom[index] || reserved[index] || tiles[index]) return false;
  return !wouldCloseBlock(context, x, y);
}

function wouldCreateWideFloor(
  context: GenerationContext,
  path: readonly Position[],
): boolean {
  const { width, height, tiles, pathMask } = context;
  for (const point of path) pathMask[indexOf(width, point.x, point.y)] = 1;

  const floorAt = (x: number, y: number): boolean => {
    if (!inBounds(width, height, x, y)) return false;
    const index = indexOf(width, x, y);
    return tiles[index] === 1 || pathMask[index] === 1;
  };

  let wide = false;
  for (const point of path) {
    if (wide) break;
    for (let offsetY = -1; offsetY <= 0 && !wide; offsetY += 1) {
      for (let offsetX = -1; offsetX <= 0 && !wide; offsetX += 1) {
        const x = point.x + offsetX;
        const y = point.y + offsetY;
        if (
          floorAt(x, y) &&
          floorAt(x + 1, y) &&
          floorAt(x, y + 1) &&
          floorAt(x + 1, y + 1)
        ) {
          wide = true;
        }
      }
    }
  }

  for (const point of path) pathMask[indexOf(width, point.x, point.y)] = 0;
  return wide;
}

function validatePath(
  context: GenerationContext,
  rawPath: readonly Position[],
  slotA: DoorSlot,
  slotB: DoorSlot,
): Position[] | null {
  const path = dedupePath(rawPath);
  if (path.length < 3) return null;
  if (!samePosition(path[0], slotA) || !samePosition(path[path.length - 1], slotB)) {
    return null;
  }

  const { width, height, tiles, roomCells, nearRoom, reserved } = context;

  for (let index = 0; index < path.length; index += 1) {
    const point = path[index];
    if (!isCorridorArea(width, height, point.x, point.y)) return null;
    const cellIndex = indexOf(width, point.x, point.y);
    if (reserved[cellIndex] || roomCells[cellIndex] || tiles[cellIndex]) return null;

    const isEndpoint = index === 0 || index === path.length - 1;
    if (!isEndpoint) {
      if (nearRoom[cellIndex]) return null;
      continue;
    }

    const slot = index === 0 ? slotA : slotB;
    const expected = index === 0 ? path[1] : path[path.length - 2];
    if (expected.x !== point.x + slot.outX || expected.y !== point.y + slot.outY) {
      return null;
    }

    const outwardX = point.x + slot.outX;
    const outwardY = point.y + slot.outY;
    if (!isCorridorArea(width, height, outwardX, outwardY)) return null;
    if (roomCells[indexOf(width, outwardX, outwardY)]) return null;

    const behindX = point.x - slot.outX;
    const behindY = point.y - slot.outY;

    for (const [dx, dy] of perpendicularOffsets(slot)) {
      const x = point.x + dx;
      const y = point.y + dy;
      if (!inBounds(width, height, x, y)) return null;
      const perpendicularIndex = indexOf(width, x, y);
      if (tiles[perpendicularIndex] || reserved[perpendicularIndex]) return null;
    }

    for (const [dx, dy] of DIRECTIONS) {
      const x = point.x + dx;
      const y = point.y + dy;
      if (!inBounds(width, height, x, y)) continue;
      if (!roomCells[indexOf(width, x, y)]) continue;
      if (x !== behindX || y !== behindY) return null;
    }
  }

  return wouldCreateWideFloor(context, path) ? null : path;
}

function appendLine(
  points: readonly Position[],
  targetX: number,
  targetY: number,
): Position[] {
  const result = [...points];
  let current = result[result.length - 1];
  let guard = 0;
  while ((current.x !== targetX || current.y !== targetY) && guard < 4096) {
    guard += 1;
    const x =
      current.x !== targetX
        ? current.x + Math.sign(targetX - current.x)
        : current.x;
    const y =
      current.x === targetX
        ? current.y + Math.sign(targetY - current.y)
        : current.y;
    current = { x, y };
    result.push(current);
  }
  return result;
}

function zRouteCandidates(start: Position, goal: Position): Position[][] {
  const candidates: Position[][] = [];

  candidates.push(appendLine(appendLine([start], goal.x, start.y), goal.x, goal.y));
  candidates.push(appendLine(appendLine([start], start.x, goal.y), goal.x, goal.y));

  const middleRow = Math.floor((start.y + goal.y) / 2);
  for (const row of [middleRow, middleRow + 1]) {
    candidates.push(
      appendLine(appendLine(appendLine([start], start.x, row), goal.x, row), goal.x, goal.y),
    );
  }

  const middleColumn = Math.floor((start.x + goal.x) / 2);
  for (const column of [middleColumn, middleColumn + 1]) {
    candidates.push(
      appendLine(appendLine(appendLine([start], column, start.y), column, goal.y), goal.x, goal.y),
    );
  }

  return candidates.map((path) => dedupePath(path));
}

function findZConnection(
  context: GenerationContext,
  roomA: MutableRoom,
  roomB: MutableRoom,
): ConnectionCandidate | null {
  if (context.usedSlots[roomA.id].length >= MAX_ROLE_SLOTS) return null;
  if (context.usedSlots[roomB.id].length >= MAX_ROLE_SLOTS) return null;

  const slotsA = usableSlots(context, roomA);
  const slotsB = usableSlots(context, roomB);
  if (slotsA.length === 0 || slotsB.length === 0) return null;

  for (const slotA of slotsA) {
    for (const slotB of slotsB) {
      if (samePosition(slotA, slotB)) continue;
      const start = { x: slotA.x + slotA.outX, y: slotA.y + slotA.outY };
      const goal = { x: slotB.x + slotB.outX, y: slotB.y + slotB.outY };
      for (const route of zRouteCandidates(start, goal)) {
        const path = dedupePath([slotA, ...route, slotB]);
        if (countPathCorners(path) < 2) continue;
        const validated = validatePath(context, path, slotA, slotB);
        if (validated) return { slotA, slotB, path: validated };
      }
    }
  }

  return null;
}

function findBfsConnection(
  context: GenerationContext,
  roomA: MutableRoom,
  roomB: MutableRoom,
): ConnectionCandidate | null {
  if (context.usedSlots[roomA.id].length >= MAX_ROLE_SLOTS) return null;
  if (context.usedSlots[roomB.id].length >= MAX_ROLE_SLOTS) return null;

  const slotsA = usableSlots(context, roomA);
  const slotsB = usableSlots(context, roomB);
  if (slotsA.length === 0 || slotsB.length === 0) return null;

  const { width, height } = context;
  const size = width * height;
  const previous = new Int32Array(size).fill(-2);
  const targetSlot = new Int32Array(size).fill(-1);
  const queue = new Int32Array(size);

  for (let slotIndex = 0; slotIndex < slotsB.length; slotIndex += 1) {
    const slot = slotsB[slotIndex];
    const x = slot.x + slot.outX;
    const y = slot.y + slot.outY;
    if (!isPassable(context, x, y)) continue;
    targetSlot[indexOf(width, x, y)] = slotIndex;
  }

  let head = 0;
  let tail = 0;
  for (const slot of slotsA) {
    const x = slot.x + slot.outX;
    const y = slot.y + slot.outY;
    if (!isPassable(context, x, y)) continue;
    const index = indexOf(width, x, y);
    if (previous[index] !== -2) continue;
    previous[index] = -1;
    queue[tail] = index;
    tail += 1;
  }

  const reconstruct = (targetIndex: number, slotB: DoorSlot): ConnectionCandidate | null => {
    const cells: number[] = [];
    let current = targetIndex;
    while (current !== -1) {
      cells.push(current);
      const parent = previous[current];
      if (parent === -2) return null;
      current = parent;
    }
    cells.reverse();

    const sourceIndex = cells[0];
    const sourceX = sourceIndex % width;
    const sourceY = (sourceIndex - sourceX) / width;
    const slotA = slotsA.find(
      (slot) => slot.x + slot.outX === sourceX && slot.y + slot.outY === sourceY,
    );
    if (!slotA) return null;

    const path = dedupePath([
      slotA,
      ...cells.map((cell) => {
        const x = cell % width;
        return { x, y: (cell - x) / width };
      }),
      slotB,
    ]);
    const validated = validatePath(context, path, slotA, slotB);
    return validated ? { slotA, slotB, path: validated } : null;
  };

  while (head < tail) {
    const current = queue[head];
    head += 1;

    const slotIndex = targetSlot[current];
    if (slotIndex >= 0) {
      const candidate = reconstruct(current, slotsB[slotIndex]);
      if (candidate) return candidate;
      targetSlot[current] = -2;
    }

    const x = current % width;
    const y = (current - x) / width;
    for (const [dx, dy] of DIRECTIONS) {
      const nextX = x + dx;
      const nextY = y + dy;
      if (!isPassable(context, nextX, nextY)) continue;
      const nextIndex = indexOf(width, nextX, nextY);
      if (previous[nextIndex] !== -2) continue;
      previous[nextIndex] = current;
      queue[tail] = nextIndex;
      tail += 1;
    }
  }

  return null;
}

function findConnection(
  context: GenerationContext,
  roomA: MutableRoom,
  roomB: MutableRoom,
  preferCorners: boolean,
): ConnectionCandidate | null {
  if (preferCorners) {
    const z = findZConnection(context, roomA, roomB);
    if (z) return z;
  }
  return findBfsConnection(context, roomA, roomB);
}

function commitConnection(
  context: GenerationContext,
  candidate: ConnectionCandidate,
  kind: CorridorKind,
): void {
  const { width, tiles, reserved, usedSlots, connections } = context;

  for (const point of candidate.path) {
    tiles[indexOf(width, point.x, point.y)] = 1;
  }

  for (const slot of [candidate.slotA, candidate.slotB]) {
    for (const [dx, dy] of perpendicularOffsets(slot)) {
      const x = slot.x + dx;
      const y = slot.y + dy;
      if (!inBounds(context.width, context.height, x, y)) continue;
      reserved[indexOf(width, x, y)] = 1;
    }
    usedSlots[slot.roomId].push(slot);
  }

  connections.push({
    fromRoomId: candidate.slotA.roomId,
    toRoomId: candidate.slotB.roomId,
    kind,
    width: 1,
    doorEligible: true,
    path: candidate.path.map((point) => ({ x: point.x, y: point.y })),
  });
}

// ---------------------------------------------------------------------------
// Conexiones: árbol BSP, union-find y bucles
// ---------------------------------------------------------------------------

function connectBspTree(
  context: GenerationContext,
  node: BspNode,
  shape: ShapeState,
): number[] {
  if (!node.left || !node.right) {
    return node.roomId === undefined ? [] : [node.roomId];
  }

  const leftRooms = connectBspTree(context, node.left, shape);
  const rightRooms = connectBspTree(context, node.right, shape);

  let best:
    | { left: number; right: number; candidate: ConnectionCandidate; score: number }
    | null = null;
  let bestCorner:
    | { left: number; right: number; candidate: ConnectionCandidate; score: number }
    | null = null;

  for (const left of leftRooms) {
    for (const right of rightRooms) {
      const wantCorners = !shape.cornersSatisfied && !bestCorner;
      const candidate = findConnection(
        context,
        context.rooms[left],
        context.rooms[right],
        wantCorners,
      );
      if (!candidate) continue;
      const corners = countPathCorners(candidate.path);
      const score = pathLength(candidate.path) * 10 + corners;
      if (!best || score < best.score) {
        best = { left, right, candidate, score };
      }
      if (corners >= 2 && (!bestCorner || score < bestCorner.score)) {
        bestCorner = { left, right, candidate, score };
      }
    }
  }

  const chosen = !shape.cornersSatisfied && bestCorner ? bestCorner : best;
  if (chosen) {
    commitConnection(context, chosen.candidate, 'tree');
    if (countPathCorners(chosen.candidate.path) >= 2) shape.cornersSatisfied = true;
  } else if (leftRooms.length > 0 && rightRooms.length > 0) {
    context.warnings.push('Una rama BSP no encontró un pasillo válido entre sus salas.');
  }

  return [...leftRooms, ...rightRooms];
}

function findRoot(parent: number[], room: number): number {
  let current = room;
  while (parent[current] !== current) {
    parent[current] = parent[parent[current]];
    current = parent[current];
  }
  return current;
}

function union(parent: number[], a: number, b: number): void {
  const rootA = findRoot(parent, a);
  const rootB = findRoot(parent, b);
  if (rootA !== rootB) parent[rootB] = rootA;
}

function ensureConnected(context: GenerationContext): void {
  if (context.rooms.length < 2) return;

  const parent = context.rooms.map((_, index) => index);
  for (const connection of context.connections) {
    if (connection.kind === 'tree') {
      union(parent, connection.fromRoomId, connection.toRoomId);
    }
  }

  for (let roomIndex = 1; roomIndex < context.rooms.length; roomIndex += 1) {
    const root = findRoot(parent, 0);
    if (findRoot(parent, roomIndex) === root) continue;

    let best:
      | { from: number; to: number; candidate: ConnectionCandidate; score: number }
      | null = null;

    for (let from = 0; from < context.rooms.length; from += 1) {
      if (findRoot(parent, from) !== root) continue;
      for (let to = 0; to < context.rooms.length; to += 1) {
        if (findRoot(parent, to) === root) continue;
        const candidate = findConnection(
          context,
          context.rooms[from],
          context.rooms[to],
          false,
        );
        if (!candidate) continue;
        const score = pathLength(candidate.path) * 10 + countPathCorners(candidate.path);
        if (!best || score < best.score) best = { from, to, candidate, score };
      }
    }

    if (!best) {
      context.warnings.push(`La sala ${roomIndex} no se pudo conectar al resto del mapa.`);
      continue;
    }

    commitConnection(context, best.candidate, 'tree');
    union(parent, best.from, best.to);
  }
}

function addLoops(
  context: GenerationContext,
  loopRatio: number,
  shape: ShapeState,
): number {
  const target = Math.min(
    3,
    Math.max(0, Math.round((context.rooms.length * loopRatio) / 100)),
  );
  if (target === 0) return 0;

  const roomCount = context.rooms.length;
  const linked = new Array<boolean>(roomCount * roomCount).fill(false);
  for (const connection of context.connections) {
    linked[connection.fromRoomId * roomCount + connection.toRoomId] = true;
    linked[connection.toRoomId * roomCount + connection.fromRoomId] = true;
  }

  let added = 0;

  while (added < target) {
    const candidates: Array<{
      from: number;
      to: number;
      score: number;
    }> = [];

    for (let from = 0; from < roomCount; from += 1) {
      if (context.usedSlots[from].length >= MAX_ROLE_SLOTS) continue;
      for (let to = from + 1; to < roomCount; to += 1) {
        if (linked[from * roomCount + to]) continue;
        if (context.usedSlots[to].length >= MAX_ROLE_SLOTS) continue;
        const candidate = findConnection(
          context,
          context.rooms[from],
          context.rooms[to],
          !shape.cornersSatisfied,
        );
        if (!candidate) continue;
        const corners = countPathCorners(candidate.path);
        candidates.push({
          from,
          to,
          score: pathLength(candidate.path) * 10 + corners,
        });
      }
    }

    if (candidates.length === 0) break;
    candidates.sort((a, b) => a.score - b.score || a.from - b.from || a.to - b.to);

    let committed = false;
    for (const entry of candidates) {
      if (context.usedSlots[entry.from].length >= MAX_ROLE_SLOTS) continue;
      if (context.usedSlots[entry.to].length >= MAX_ROLE_SLOTS) continue;
      const fresh = findConnection(
        context,
        context.rooms[entry.from],
        context.rooms[entry.to],
        false,
      );
      if (!fresh) continue;
      commitConnection(context, fresh, 'loop');
      if (countPathCorners(fresh.path) >= 2) shape.cornersSatisfied = true;
      linked[entry.from * roomCount + entry.to] = true;
      linked[entry.to * roomCount + entry.from] = true;
      added += 1;
      committed = true;
      break;
    }

    if (!committed) break;
  }

  if (added < target) {
    context.warnings.push(`Bucles ajustados de ${target} a ${added}: no quedaban conexiones válidas.`);
  }

  return added;
}

// ---------------------------------------------------------------------------
// Pasillos anchos y huecos de puerta
// ---------------------------------------------------------------------------

interface LanePlan {
  readonly cells: readonly Position[];
  readonly length: number;
}

function ownPathMask(
  context: GenerationContext,
  path: readonly Position[],
): Uint8Array {
  const mask = new Uint8Array(context.width * context.height);
  for (const point of path) {
    mask[indexOf(context.width, point.x, point.y)] = 1;
  }
  return mask;
}

function laneCellBaseIsValid(
  context: GenerationContext,
  pathMask: Uint8Array,
  x: number,
  y: number,
): boolean {
  const { width, height, tiles, roomCells, nearRoom, reserved } = context;
  if (!isCorridorArea(width, height, x, y)) return false;
  const index = indexOf(width, x, y);
  if (roomCells[index] || nearRoom[index] || reserved[index]) return false;
  if (pathMask[index]) return false;
  return tiles[index] === 0;
}

/** Rechaza un carril que crearía un 2×2 con suelo ajeno al corredor. */
function laneCreatesForeignWideFloor(
  context: GenerationContext,
  pathMask: Uint8Array,
  laneMask: Uint8Array,
): boolean {
  const { width, height, tiles, roomCells } = context;
  for (let y = 0; y < height - 1; y += 1) {
    for (let x = 0; x < width - 1; x += 1) {
      const cells: Array<readonly [number, number]> = [
        [x, y],
        [x + 1, y],
        [x, y + 1],
        [x + 1, y + 1],
      ];
      let touchesLane = false;
      let allFloor = true;
      let anyForeign = false;
      let anyRoom = false;

      for (const [cellX, cellY] of cells) {
        const index = indexOf(width, cellX, cellY);
        if (laneMask[index]) touchesLane = true;
        if (roomCells[index]) {
          anyRoom = true;
          break;
        }
        const own = pathMask[index] === 1 || laneMask[index] === 1;
        if (!own && tiles[index] === 0) {
          allFloor = false;
          break;
        }
        if (!own) anyForeign = true;
      }

      if (touchesLane && !anyRoom && allFloor && anyForeign) return true;
    }
  }

  return false;
}

function planLaneRun(
  context: GenerationContext,
  path: readonly Position[],
  from: number,
  to: number,
  horizontal: boolean,
  side: 1 | -1,
  pathMask: Uint8Array,
): LanePlan | null {
  let best: Position[] = [];
  let current: Position[] = [];

  for (let index = from; index <= to; index += 1) {
    const point = path[index];
    const laneX = horizontal ? point.x : point.x + side;
    const laneY = horizontal ? point.y + side : point.y;
    if (laneCellBaseIsValid(context, pathMask, laneX, laneY)) {
      current.push({ x: laneX, y: laneY });
      if (current.length > best.length) best = [...current];
    } else {
      current = [];
    }
  }

  if (best.length < 4) return null;

  const laneMask = new Uint8Array(context.width * context.height);
  for (const point of best) {
    laneMask[indexOf(context.width, point.x, point.y)] = 1;
  }
  if (laneCreatesForeignWideFloor(context, pathMask, laneMask)) return null;

  return { cells: best, length: best.length };
}

function planWidening(
  context: GenerationContext,
  corridor: Corridor,
): LanePlan | null {
  const path = dedupePath(corridor.path);
  if (path.length < 4) return null;
  const pathMask = ownPathMask(context, path);
  let best: LanePlan | null = null;

  for (const run of straightPathRuns(path)) {
    const from = Math.max(run.from, 1);
    const to = Math.min(run.to, path.length - 2);
    if (to - from + 1 < 4) continue;

    for (const side of [-1, 1] as const) {
      const plan = planLaneRun(
        context,
        path,
        from,
        to,
        run.dy === 0,
        side,
        pathMask,
      );
      if (plan && (!best || plan.length > best.length)) best = plan;
    }
  }

  return best;
}

function carveWidening(
  context: GenerationContext,
  corridorIndex: number,
  plan: LanePlan,
): void {
  for (const point of plan.cells) {
    context.tiles[indexOf(context.width, point.x, point.y)] = 1;
  }
  const corridor = context.connections[corridorIndex];
  context.connections[corridorIndex] = {
    ...corridor,
    width: 2,
    doorEligible: false,
    path: corridor.path.map((point) => ({ x: point.x, y: point.y })),
  };
}

interface WideCandidate {
  readonly index: number;
  readonly plan: LanePlan;
  readonly score: number;
}

function collectWideCandidates(
  context: GenerationContext,
  narrowRemaining: readonly number[],
  seed: number,
  attempt: number,
): WideCandidate[] {
  const candidates: WideCandidate[] = [];

  for (let index = 0; index < context.connections.length; index += 1) {
    const corridor = context.connections[index];
    if (corridor.width !== 1) continue;
    if (narrowRemaining[corridor.fromRoomId] <= 1) continue;
    if (narrowRemaining[corridor.toRoomId] <= 1) continue;

    const plan = planWidening(context, corridor);
    if (!plan) continue;

    const tie =
      ((Math.imul(seed ^ (index + 1) ^ (attempt * 0x9e3779b1), 0x85ebca6b) >>> 0) %
        997) /
      997;
    candidates.push({
      index,
      plan,
      score: plan.length * 1000 + pathLength(corridor.path) * 10 + tie,
    });
  }

  candidates.sort((a, b) => b.score - a.score || a.index - b.index);
  return candidates;
}

/**
 * Añade una conexión estrecha nueva y la ensancha. Solo se usa si ninguna
 * conexión existente permitía un carril seguro.
 */
function tryFallbackWideLoop(
  context: GenerationContext,
  narrowRemaining: readonly number[],
): boolean {
  if (context.rooms.length < 3) return false;
  const loops = context.connections.filter(
    (corridor) => corridor.kind === 'loop',
  ).length;
  if (loops >= 3) return false;

  const roomCount = context.rooms.length;
  const linked = new Array<boolean>(roomCount * roomCount).fill(false);
  for (const corridor of context.connections) {
    linked[corridor.fromRoomId * roomCount + corridor.toRoomId] = true;
    linked[corridor.toRoomId * roomCount + corridor.fromRoomId] = true;
  }

  for (let from = 0; from < roomCount; from += 1) {
    if (narrowRemaining[from] <= 1) continue;
    if (context.usedSlots[from].length >= MAX_ROLE_SLOTS) continue;
    for (let to = from + 1; to < roomCount; to += 1) {
      if (narrowRemaining[to] <= 1) continue;
      if (linked[from * roomCount + to]) continue;
      if (context.usedSlots[to].length >= MAX_ROLE_SLOTS) continue;

      const candidate = findConnection(
        context,
        context.rooms[from],
        context.rooms[to],
        false,
      );
      if (!candidate) continue;

      const hypothetical: Corridor = {
        fromRoomId: candidate.slotA.roomId,
        toRoomId: candidate.slotB.roomId,
        kind: 'loop',
        width: 1,
        doorEligible: true,
        path: candidate.path,
      };
      const plan = planWidening(context, hypothetical);
      if (!plan) continue;

      commitConnection(context, candidate, 'loop');
      carveWidening(context, context.connections.length - 1, plan);
      return true;
    }
  }

  return false;
}

function widenCorridors(
  context: GenerationContext,
  seed: number,
  attempt: number,
  target: number,
): number {
  if (target <= 0 || context.rooms.length < 2) return 0;

  const narrowRemaining = context.rooms.map(() => 0);
  for (const corridor of context.connections) {
    narrowRemaining[corridor.fromRoomId] += 1;
    narrowRemaining[corridor.toRoomId] += 1;
  }

  let widened = 0;
  while (widened < target) {
    const candidates = collectWideCandidates(
      context,
      narrowRemaining,
      seed,
      attempt,
    );
    const chosen = candidates.find(
      (candidate) => {
        const corridor = context.connections[candidate.index];
        return (
          corridor.width === 1 &&
          narrowRemaining[corridor.fromRoomId] > 1 &&
          narrowRemaining[corridor.toRoomId] > 1
        );
      },
    );
    if (!chosen) break;

    const corridor = context.connections[chosen.index];
    carveWidening(context, chosen.index, chosen.plan);
    narrowRemaining[corridor.fromRoomId] -= 1;
    narrowRemaining[corridor.toRoomId] -= 1;
    widened += 1;
  }

  if (widened === 0 && tryFallbackWideLoop(context, narrowRemaining)) {
    widened = 1;
  }

  if (widened < target) {
    context.warnings.push(
      `Pasillos anchos ajustados de ${target} a ${widened}: no había más conexiones con carril seguro.`,
    );
  }

  return widened;
}

/** Estilo determinista entre los tres de `DOOR_STYLES`; no consume RNG. */
function doorStyleFor(x: number, y: number, roomId: number, corridorId: number): DoorStyle {
  const index = (x * 31 + y * 17 + roomId * 13 + corridorId * 7) % DOOR_STYLES.length;
  return DOOR_STYLES[(index + DOOR_STYLES.length) % DOOR_STYLES.length];
}

function buildDoors(context: GenerationContext): Door[] {
  const doors: Door[] = [];
  const seen = new Set<string>();

  for (let corridorIndex = 0; corridorIndex < context.connections.length; corridorIndex += 1) {
    const corridor = context.connections[corridorIndex];
    if (corridor.width !== 1) continue;
    const path = dedupePath(corridor.path);
    if (path.length < 2) continue;

    const start = path[0];
    const second = path[1];
    const end = path[path.length - 1];
    const beforeEnd = path[path.length - 2];

    const startOutY = Math.sign(second.y - start.y);
    const endOutY = Math.sign(beforeEnd.y - end.y);
    const direct = path.length <= 2;

    const entries: Array<{
      point: Position;
      roomId: number;
      otherRoomId: number;
      outY: number;
    }> = [
      {
        point: start,
        roomId: corridor.fromRoomId,
        otherRoomId: corridor.toRoomId,
        outY: startOutY,
      },
      {
        point: end,
        roomId: corridor.toRoomId,
        otherRoomId: corridor.fromRoomId,
        outY: endOutY,
      },
    ];

    for (const entry of entries) {
      const key = `${entry.point.x},${entry.point.y}`;
      if (seen.has(key)) continue;
      seen.add(key);
      doors.push({
        x: entry.point.x,
        y: entry.point.y,
        orientation: entry.outY !== 0 ? 'horizontal' : 'vertical',
        roomId: entry.roomId,
        style: doorStyleFor(entry.point.x, entry.point.y, entry.roomId, corridorIndex),
        roomA: entry.roomId,
        roomB: entry.otherRoomId,
        corridorId: corridorIndex,
        direct,
      });
    }
  }

  doors.sort((a, b) => a.roomId - b.roomId || a.y - b.y || a.x - b.x);
  return doors.map((door, index) => ({ ...door, id: index }));
}

// ---------------------------------------------------------------------------
// Apariciones
// ---------------------------------------------------------------------------

function distancesFrom(
  context: GenerationContext,
  from: Position,
): Int32Array {
  const { width, height, tiles } = context;
  const distances = new Int32Array(width * height).fill(-1);
  if (!isCorridorArea(width, height, from.x, from.y)) return distances;
  const start = indexOf(width, from.x, from.y);
  if (!tiles[start]) return distances;

  distances[start] = 0;
  const queue = new Int32Array(width * height);
  queue[0] = start;
  let head = 0;
  let tail = 1;

  while (head < tail) {
    const current = queue[head];
    head += 1;
    const x = current % width;
    const y = (current - x) / width;
    const nextDistance = distances[current] + 1;
    for (const [dx, dy] of DIRECTIONS) {
      const nextX = x + dx;
      const nextY = y + dy;
      if (!inBounds(width, height, nextX, nextY)) continue;
      const nextIndex = indexOf(width, nextX, nextY);
      if (!tiles[nextIndex] || distances[nextIndex] !== -1) continue;
      distances[nextIndex] = nextDistance;
      queue[tail] = nextIndex;
      tail += 1;
    }
  }

  return distances;
}

interface SpawnResult {
  readonly spawns: Spawns;
  readonly issues: readonly string[];
}

function tileView(context: GenerationContext): Tile[] {
  const tiles: Tile[] = new Array<Tile>(context.width * context.height);
  for (let index = 0; index < tiles.length; index += 1) {
    tiles[index] = context.tiles[index] ? 'floor' : 'wall';
  }
  return tiles;
}

function contextRoomModels(context: GenerationContext): Room[] {
  return context.rooms.map((room) => {
    const cells: Position[] = [];
    for (let y = room.y; y < room.y + room.height; y += 1) {
      for (let x = room.x; x < room.x + room.width; x += 1) {
        if (context.tiles[indexOf(context.width, x, y)]) cells.push({ x, y });
      }
    }
    return {
      id: room.id,
      x: room.x,
      y: room.y,
      width: room.width,
      height: room.height,
      role: room.role ?? classifyRoom({ width: room.width, height: room.height }),
      cells,
      area: cells.length,
    };
  });
}

/** Bocas de los pasillos anchos de BSP, que no generan puerta. */
function wideOpenMouths(context: GenerationContext): OpenMouth[] {
  const mouths: OpenMouth[] = [];
  let nextId = 0;
  for (let corridorIndex = 0; corridorIndex < context.connections.length; corridorIndex += 1) {
    const corridor = context.connections[corridorIndex];
    if (corridor.width !== 2) continue;
    const path = dedupePath(corridor.path);
    if (path.length < 2) continue;
    const endpoints: Array<{ point: Position; next: Position; roomId: number }> = [
      { point: path[0], next: path[1], roomId: corridor.fromRoomId },
      {
        point: path[path.length - 1],
        next: path[path.length - 2],
        roomId: corridor.toRoomId,
      },
    ];
    for (const endpoint of endpoints) {
      const outY = Math.sign(endpoint.next.y - endpoint.point.y);
      mouths.push({
        id: nextId,
        x: endpoint.point.x,
        y: endpoint.point.y,
        orientation: outY !== 0 ? 'horizontal' : 'vertical',
        roomA: corridor.fromRoomId,
        roomB: corridor.toRoomId,
        corridorId: corridorIndex,
        reason: 'pasillo-ancho',
      });
      nextId += 1;
    }
  }
  return mouths;
}

/**
 * Ancla legacy de `spawns.enemy`: la celda no-spawn más lejana sin línea de
 * visión a ningún hueco del grupo, fuera de puertas, armas y huecos. Si no
 * existe, usa la más lejana aunque tenga visión y lo avisa. No es fuente de
 * verdad para la colocación, pero conserva el contrato serializable y el ancla
 * opcional de `enemy-1`.
 */
function enemyAnchor(
  context: GenerationContext,
  spawns: SpawnPlacement,
  doors: readonly Door[],
  weaponCells: ReadonlySet<string>,
): { readonly point: Position; readonly distance: number; readonly relaxed: boolean } {
  const { width, height } = context;
  const grid = { width, height, tiles: tileView(context) };
  const holes = spawns.party.length > 0 ? spawns.party : [spawns.player];
  const distances = distancesFrom(context, spawns.player);
  const excluded = new Set<string>([
    ...holes.map((hole) => `${hole.x},${hole.y}`),
    ...doors.map((door) => `${door.x},${door.y}`),
    ...weaponCells,
  ]);

  let best: { point: Position; distance: number } | null = null;
  let farthest: { point: Position; distance: number } | null = null;

  for (const room of context.rooms) {
    if (room.id === spawns.roomId) continue;
    for (let y = room.y; y < room.y + room.height; y += 1) {
      for (let x = room.x; x < room.x + room.width; x += 1) {
        const distance = distances[indexOf(width, x, y)];
        if (distance < 0) continue;
        if (excluded.has(`${x},${y}`)) continue;
        const point = { x, y };
        const betterFarthest =
          !farthest ||
          distance > farthest.distance ||
          (distance === farthest.distance &&
            (y < farthest.point.y || (y === farthest.point.y && x < farthest.point.x)));
        if (betterFarthest) farthest = { point, distance };
        if (holes.some((hole) => hasLineOfSight(grid, point, hole))) continue;
        const better =
          !best ||
          distance > best.distance ||
          (distance === best.distance &&
            (y < best.point.y || (y === best.point.y && x < best.point.x)));
        if (better) best = { point, distance };
      }
    }
  }

  if (best) return { ...best, relaxed: false };
  if (farthest) return { ...farthest, relaxed: true };
  return { point: spawns.player, distance: 0, relaxed: true };
}

/**
 * Contrato nuevo de REQ-012: la sala más protegida, seis huecos alrededor del
 * acceso y `party[0]` como jugador. El ancla `spawns.enemy` se conserva como
 * dato serializable y ancla opcional de `enemy-1`, nunca como fuente de verdad.
 */
function chooseSpawns(
  context: GenerationContext,
  doors: readonly Door[],
  seed: number,
): SpawnResult {
  const rooms = contextRoomModels(context);
  if (rooms.length === 0) {
    return {
      spawns: { player: { x: 1, y: 1 }, enemy: { x: 1, y: 1 }, distance: 0 },
      issues: ['No hay salas para colocar las apariciones.'],
    };
  }

  const warnings = context.warnings;
  const placed = placeSpawns({
    rooms,
    doors,
    openMouths: wideOpenMouths(context),
    tiles: tileView(context),
    width: context.width,
    height: context.height,
    minTiles: SPAWN_MIN_TILES,
    seed,
  });
  for (const warning of placed.warnings) warnings.push(warning);

  const spawns = placed.spawns;
  if (spawns.roomId < 0) {
    return {
      spawns: { player: spawns.player, enemy: spawns.player, distance: 0 },
      issues: ['No se pudo elegir la sala de spawn.'],
    };
  }

  const issues: string[] = [];
  const party = spawns.party;
  if (party.length < SPAWN_MIN_TILES) {
    issues.push(
      `La sala de spawn solo ofreció ${party.length} de ${SPAWN_MIN_TILES} huecos.`,
    );
  }

  // Las armas se colocan después del mapa, pero su resultado es puro y estable:
  // se calculan aquí solo para no anclar `spawns.enemy` sobre una de ellas.
  const weaponCells = new Set(
    placeMapWeapons({
      seed,
      width: context.width,
      height: context.height,
      tiles: tileView(context),
      rooms,
      doors,
      spawns: { ...spawns, enemy: spawns.player, distance: 0 },
    }).map((weapon) => `${weapon.x},${weapon.y}`),
  );
  const anchor = enemyAnchor(context, spawns, doors, weaponCells);
  if (anchor.relaxed) {
    warnings.push(
      'No había ancla sin visión al spawn; se usó la celda más lejana con línea de visión.',
    );
  }
  return {
    spawns: {
      roomId: spawns.roomId,
      party,
      player: spawns.player,
      enemy: anchor.point,
      distance: anchor.distance,
    },
    issues,
  };
}


// ---------------------------------------------------------------------------
// Ensamblado y aceptación
// ---------------------------------------------------------------------------

function buildMap(
  context: GenerationContext,
  options: ResolvedMapOptions,
  seed: number,
  warnings: readonly string[],
  spawns: Spawns,
  doors?: readonly Door[],
): GeneratedMap {
  const tiles: Tile[] = new Array<Tile>(context.width * context.height);
  for (let index = 0; index < tiles.length; index += 1) {
    tiles[index] = context.tiles[index] ? 'floor' : 'wall';
  }

  const map: GeneratedMap = {
    seed,
    width: context.width,
    height: context.height,
    tiles,
    rooms: context.rooms.map(
      (room): Room => {
        const cells: Position[] = [];
        for (let y = room.y; y < room.y + room.height; y += 1) {
          for (let x = room.x; x < room.x + room.width; x += 1) {
            if (context.tiles[indexOf(context.width, x, y)]) cells.push({ x, y });
          }
        }
        return {
          id: room.id,
          x: room.x,
          y: room.y,
          width: room.width,
          height: room.height,
          role: room.role,
          cells,
          area: cells.length,
        };
      },
    ),
    corridors: context.connections.map((corridor, index) => {
      const path = corridor.path.map((point) => ({ x: point.x, y: point.y }));
      const cells = dedupePath(path);
      return {
        ...corridor,
        id: index,
        roomA: corridor.fromRoomId,
        roomB: corridor.toRoomId,
        path,
        cells,
        length: pathLength(cells),
      };
    }),
    doors: doors ?? buildDoors(context),
    spawns,
    warnings,
    options,
  };

  // Colocación derivada del mapa ya generado y de su semilla; PRNG propio.
  return { ...map, weapons: placeMapWeapons(map) };
}

function assessMap(
  map: GeneratedMap,
  placement: PlacementResult,
  options: ResolvedMapOptions,
): string[] {
  const issues: string[] = [];

  if (map.rooms.length < 8 || map.rooms.length > 12) {
    issues.push(`Número de salas ${map.rooms.length} fuera de 8-12.`);
  }

  const largeCount = map.rooms.filter(isLargeRoom).length;
  const smallCount = map.rooms.filter(isSmallRoom).length;
  if (largeCount < placement.largeTarget) {
    issues.push(`Salas grandes ${largeCount} < ${placement.largeTarget}.`);
  }
  if (smallCount < placement.smallTarget) {
    issues.push(`Salas pequeñas ${smallCount} < ${placement.smallTarget}.`);
  }

  const expectedTree = Math.max(0, map.rooms.length - 1);
  const treeCount = map.corridors.filter((corridor) => corridor.kind === 'tree').length;
  if (treeCount !== expectedTree) {
    issues.push(`Conexiones de árbol ${treeCount} != ${expectedTree}.`);
  }

  const loops = map.corridors.filter((corridor) => corridor.kind === 'loop').length;
  const loopTarget = Math.min(
    3,
    Math.max(0, Math.round((map.rooms.length * options.loopRatio) / 100)),
  );
  if (loopTarget > 0 && (loops < 1 || loops > 3)) {
    issues.push(`Bucles ${loops} fuera de 1-3.`);
  }
  if (loops > 3) issues.push(`Bucles ${loops} > 3.`);

  if (map.rooms.length >= 3) {
    const wideCount = map.corridors.filter((corridor) => corridor.width === 2).length;
    if (wideCount < 1 || wideCount > 2) {
      issues.push(`Pasillos anchos ${wideCount} fuera de 1-2.`);
    }
  }

  const maxStraight = map.corridors.reduce(
    (longest, corridor) => Math.max(longest, longestStraight(corridor.path)),
    0,
  );
  if (maxStraight < 5) {
    issues.push(`Tramo recto máximo ${maxStraight} < 5.`);
  }

  const maxCorners = map.corridors.reduce(
    (most, corridor) => Math.max(most, countPathCorners(corridor.path)),
    0,
  );
  if (maxCorners < 2) {
    issues.push(`Ningún corredor tiene 2 esquinas (máximo ${maxCorners}).`);
  }

  const connectivity = mapConnectivity(map);
  if (connectivity < 99.999) {
    issues.push(`Conectividad ${connectivity.toFixed(2)} % < 100 %.`);
  }

  return issues;
}

function mapConnectivity(map: GeneratedMap): number {
  const total = map.tiles.reduce(
    (count, tile) => (tile === 'floor' ? count + 1 : count),
    0,
  );
  if (total === 0) return 0;

  const { width, height, tiles } = map;
  const distances = new Int32Array(width * height).fill(-1);
  const startIndex = indexOf(width, map.spawns.player.x, map.spawns.player.y);
  if (tiles[startIndex] !== 'floor') return 0;

  distances[startIndex] = 0;
  const queue = new Int32Array(width * height);
  queue[0] = startIndex;
  let head = 0;
  let tail = 1;
  let reached = 1;

  while (head < tail) {
    const current = queue[head];
    head += 1;
    const x = current % width;
    const y = (current - x) / width;
    for (const [dx, dy] of DIRECTIONS) {
      const nextX = x + dx;
      const nextY = y + dy;
      if (!inBounds(width, height, nextX, nextY)) continue;
      const nextIndex = indexOf(width, nextX, nextY);
      if (tiles[nextIndex] !== 'floor' || distances[nextIndex] !== -1) continue;
      distances[nextIndex] = distances[current] + 1;
      queue[tail] = nextIndex;
      tail += 1;
      reached += 1;
    }
  }

  return (reached / total) * 100;
}

/**
 * Generador BSP por defecto. `generate` es puro y determinista para la misma
 * semilla y opciones.
 */
export class BspMapGenerator implements MapGenerator {
  readonly id = 'bsp';

  generate(seed: number, options: MapOptions = {}): GeneratedMap {
    const normalizedSeed = normalizeSeed(seed);
    const resolved = resolveMapOptions(options);
    const resolvedOptions = resolved.options;
    const baseWarnings = [...resolved.warnings];
    const plan = buildRolePlan(resolvedOptions);
    const rng = mulberry32(normalizedSeed);

    // PRNG separado: no altera la secuencia que coloca salas y corredores.
    const wideRandom = mulberry32(normalizedSeed ^ 0x9e3779b9);
    const autoWideTarget = wideRandom() < 0.5 ? 1 : 2;
    const wideTarget =
      resolvedOptions.wideCorridorCount === 0
        ? autoWideTarget
        : resolvedOptions.wideCorridorCount;

    let best:
      | { map: GeneratedMap; issues: readonly string[]; placement: PlacementResult }
      | null = null;

    for (let attempt = 0; attempt < MAX_GENERATION_ATTEMPTS; attempt += 1) {
      const warnings = [...baseWarnings];
      const placement = placeRooms(rng, resolvedOptions, plan);
      warnings.push(...placement.warnings);

      if (placement.rooms.length < 2) {
        const context = createContext(placement.rooms, resolvedOptions, warnings);
        const doors = buildDoors(context);
        const spawnResult = chooseSpawns(context, doors, normalizedSeed);
        const map = buildMap(
          context,
          resolvedOptions,
          normalizedSeed,
          warnings,
          spawnResult.spawns,
          doors,
        );
        const issues = [
          ...spawnResult.issues,
          ...assessMap(map, placement, resolvedOptions),
          ...validateGeneratedMap(map).issues,
        ];
        if (!best || issues.length < best.issues.length) best = { map, issues, placement };
        continue;
      }

      const context = createContext(placement.rooms, resolvedOptions, warnings);

      if (placement.rooms.length < resolvedOptions.roomTarget) {
        warnings.push(
          `Objetivo de salas ajustado a ${placement.rooms.length}: la partición no admite ${resolvedOptions.roomTarget} salas con los mínimos pedidos.`,
        );
      }

      const shape: ShapeState = { cornersSatisfied: false };
      if (placement.root) {
        connectBspTree(context, placement.root, shape);
      } else {
        // Sin árbol BSP (empaquetado de respaldo): conecta por cercanía.
        ensureConnected(context);
      }
      ensureConnected(context);

      addLoops(context, resolvedOptions.loopRatio, shape);
      widenCorridors(context, normalizedSeed, attempt, wideTarget);

      const doors = buildDoors(context);
      const spawnResult = chooseSpawns(context, doors, normalizedSeed);
      const map = buildMap(
        context,
        resolvedOptions,
        normalizedSeed,
        warnings,
        spawnResult.spawns,
        doors,
      );
      const issues = [
        ...spawnResult.issues,
        ...assessMap(map, placement, resolvedOptions),
        ...validateGeneratedMap(map).issues,
      ];

      const deadEnd = maxDeadEndLength(map);
      if (deadEnd > 4) {
        issues.push(`Callejón de ${deadEnd} tiles > 4.`);
      }

      if (issues.length === 0) {
        return map;
      }

      if (!best || issues.length < best.issues.length) {
        best = { map, issues, placement };
      }
    }

    if (best) {
      return {
        ...best.map,
        warnings: [
          ...best.map.warnings,
          ...best.issues.map((issue) => `No se pudo cumplir: ${issue}`),
        ],
      };
    }

    const warnings = [...baseWarnings];
    const rooms = emergencyRooms(resolvedOptions);
    const context = createContext(rooms, resolvedOptions, warnings);
    ensureConnected(context);
    const doors = buildDoors(context);
    const spawnResult = chooseSpawns(context, doors, normalizedSeed);
    return buildMap(
      context,
      resolvedOptions,
      normalizedSeed,
      warnings,
      spawnResult.spawns,
      doors,
    );
  }
}

export const BSP_MAP_GENERATOR_ID = 'bsp';

/** Opciones de referencia de EXP-001 como `MapOptions`. */
export const REFERENCE_MAP_OPTIONS: MapOptions = {
  mapWidth: DEFAULT_MAP_OPTIONS.mapWidth,
  mapHeight: DEFAULT_MAP_OPTIONS.mapHeight,
  roomTarget: DEFAULT_MAP_OPTIONS.roomTarget,
  roomMin: DEFAULT_MAP_OPTIONS.roomMin,
  roomMax: DEFAULT_MAP_OPTIONS.roomMax,
  loopRatio: DEFAULT_MAP_OPTIONS.loopRatio,
};
