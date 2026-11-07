/**
 * Generación pura y determinista de mazmorras para EXP-001.
 *
 * Este módulo no importa DOM, Canvas ni el shell de experimentos: se puede
 * ejecutar en Vitest (Node) sin jsdom. Toda la aleatoriedad sale de un PRNG
 * local sembrado y las funciones no leen relojes ni estado global.
 */

export type VariantId = 'bsp' | 'random' | 'hybrid';
export type DoorOrientation = 'horizontal' | 'vertical';

export type Point = { x: number; y: number };

export type Room = {
  id: number;
  x: number;
  y: number;
  width: number;
  height: number;
};

export type Door = {
  x: number;
  y: number;
  orientation: DoorOrientation;
  roomId: number;
};

export type CorridorKind = 'tree' | 'loop';

export type Corridor = {
  from: number;
  to: number;
  kind: CorridorKind;
  path: Point[];
};

export type Spawns = {
  player: Point;
  enemy: Point;
  distance: number;
};

export type DungeonState = {
  variant: VariantId;
  seed: number;
  width: number;
  height: number;
  /** 0 = muro, 1 = suelo. Longitud width * height. */
  tiles: number[];
  rooms: Room[];
  doors: Door[];
  corridors: Corridor[];
  spawns: Spawns;
  warnings: string[];
  loops: number;
  /** Lo rellena el host midiendo fuera de la función pura. */
  generationMs?: number;
};

export type DungeonOptions = {
  width?: number;
  height?: number;
  roomTarget?: number;
  roomMin?: number;
  roomMax?: number;
  loopRatio?: number;
};

export type DungeonMetric = {
  label: string;
  value: string | number;
  hint?: string;
};

type ResolvedOptions = {
  width: number;
  height: number;
  roomTarget: number;
  roomMin: number;
  roomMax: number;
  loopRatio: number;
  warnings: string[];
};

type DoorSlot = {
  x: number;
  y: number;
  out: Point;
  orientation: DoorOrientation;
  roomId: number;
};

type BspNode = {
  x: number;
  y: number;
  w: number;
  h: number;
  left?: BspNode;
  right?: BspNode;
  roomId?: number;
};

type GenerationContext = {
  width: number;
  height: number;
  rooms: Room[];
  tiles: number[];
  roomCells: Uint8Array;
  reserved: Set<number>;
  usedSlots: Map<number, DoorSlot[]>;
  slotCache: Map<number, DoorSlot[]>;
  connections: Corridor[];
  warnings: string[];
};

type ConnectionCandidate = {
  slotA: DoorSlot;
  slotB: DoorSlot;
  path: Point[];
};

type RouteCandidate = {
  path: Point[];
  score: number;
};

const DEFAULT_OPTIONS = {
  width: 32,
  height: 32,
  roomTarget: 10,
  roomMin: 3,
  roomMax: 11,
  loopRatio: 20,
} as const;

const DIRECTIONS: Point[] = [
  { x: 0, y: -1 },
  { x: 1, y: 0 },
  { x: 0, y: 1 },
  { x: -1, y: 0 },
];

// ---------------------------------------------------------------------------
// PRNG local (misma familia que el shell, sin importarlo)
// ---------------------------------------------------------------------------

function hashString(input: string): number {
  let hash = 2166136261;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function mulberry32(seed: number): () => number {
  let value = seed >>> 0;
  return () => {
    value = (value + 0x6d2b79f5) >>> 0;
    let result = value;
    result = Math.imul(result ^ (result >>> 15), result | 1);
    result ^= result + Math.imul(result ^ (result >>> 7), result | 61);
    return ((result ^ (result >>> 14)) >>> 0) / 4294967296;
  };
}

function randInt(rng: () => number, min: number, max: number): number {
  if (max <= min) return min;
  return min + Math.floor(rng() * (max - min + 1));
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

// ---------------------------------------------------------------------------
// Utilidades de rejilla y rectángulos
// ---------------------------------------------------------------------------

function indexOf(width: number, x: number, y: number): number {
  return y * width + x;
}

function inBounds(width: number, height: number, x: number, y: number): boolean {
  return x >= 0 && y >= 0 && x < width && y < height;
}

function isCorridorCell(width: number, height: number, point: Point): boolean {
  return point.x >= 1 && point.y >= 1 && point.x <= width - 2 && point.y <= height - 2;
}

function samePoint(a: Point, b: Point): boolean {
  return a.x === b.x && a.y === b.y;
}

function rectsOverlap(a: Room, b: Room, padding = 1): boolean {
  return (
    a.x - padding < b.x + b.width &&
    b.x - padding < a.x + a.width &&
    a.y - padding < b.y + b.height &&
    b.y - padding < a.y + a.height
  );
}

function roomArea(room: Room): number {
  return room.width * room.height;
}

function roomCenter(room: Room): Point {
  return {
    x: room.x + Math.floor(room.width / 2),
    y: room.y + Math.floor(room.height / 2),
  };
}

function dedupePath(path: Point[]): Point[] {
  const result: Point[] = [];
  for (const point of path) {
    const last = result[result.length - 1];
    if (!last || !samePoint(last, point)) result.push(point);
  }
  return result;
}

// ---------------------------------------------------------------------------
// Opciones y colocación de salas
// ---------------------------------------------------------------------------

function resolveOptions(options: DungeonOptions): ResolvedOptions {
  const warnings: string[] = [];
  const rawWidth = Number(options.width ?? DEFAULT_OPTIONS.width);
  const rawHeight = Number(options.height ?? DEFAULT_OPTIONS.height);
  const width = Number.isFinite(rawWidth) ? Math.max(20, Math.floor(rawWidth)) : DEFAULT_OPTIONS.width;
  const height = Number.isFinite(rawHeight) ? Math.max(20, Math.floor(rawHeight)) : DEFAULT_OPTIONS.height;

  const rawTarget = Math.round(Number(options.roomTarget ?? DEFAULT_OPTIONS.roomTarget));
  const roomTarget = clamp(Number.isFinite(rawTarget) ? rawTarget : DEFAULT_OPTIONS.roomTarget, 8, 12);
  if (roomTarget !== rawTarget) {
    warnings.push(`Salas objetivo normalizadas de ${rawTarget} a ${roomTarget}.`);
  }

  const rawMin = Math.round(Number(options.roomMin ?? DEFAULT_OPTIONS.roomMin));
  const roomMin = clamp(Number.isFinite(rawMin) ? rawMin : DEFAULT_OPTIONS.roomMin, 3, 6);
  if (roomMin !== rawMin) {
    warnings.push(`Sala mínima normalizada de ${rawMin} a ${roomMin}.`);
  }

  const rawMax = Math.round(Number(options.roomMax ?? DEFAULT_OPTIONS.roomMax));
  const roomMax = clamp(Number.isFinite(rawMax) ? rawMax : DEFAULT_OPTIONS.roomMax, 8, 11);
  if (roomMax !== rawMax) {
    warnings.push(`Sala máxima normalizada de ${rawMax} a ${roomMax}.`);
  }

  const rawLoop = Number(options.loopRatio ?? DEFAULT_OPTIONS.loopRatio);
  const steppedLoop = Number.isFinite(rawLoop) ? Math.round(rawLoop / 5) * 5 : DEFAULT_OPTIONS.loopRatio;
  const loopRatio = clamp(steppedLoop, 0, 40);
  if (loopRatio !== rawLoop) {
    warnings.push(`Bucles normalizados de ${rawLoop} % a ${loopRatio} %.`);
  }

  return { width, height, roomTarget, roomMin, roomMax, loopRatio, warnings };
}

type PlacementResult = {
  rooms: Room[];
  warnings: string[];
};

function tryPlaceRandom(
  rng: () => number,
  width: number,
  height: number,
  target: number,
  minSide: number,
  maxSide: number,
): Room[] {
  const rooms: Room[] = [];
  const attempts = 1600;
  const minX = 2;
  const minY = 2;
  const maxXLimit = width - 2;
  const maxYLimit = height - 2;

  for (let attempt = 0; attempt < attempts && rooms.length < target; attempt += 1) {
    const position = rooms.length;
    let candidateMinW = minSide;
    let candidateMaxW = maxSide;
    let candidateMinH = minSide;
    let candidateMaxH = maxSide;

    const largeMin = Math.max(7, minSide);
    const smallMax = Math.min(5, maxSide);
    if (position < 2 && maxSide >= largeMin) {
      candidateMinW = largeMin;
      candidateMinH = largeMin;
      candidateMaxW = Math.min(maxSide, 9);
      candidateMaxH = Math.min(maxSide, 9);
    } else if (position < 5 && smallMax >= minSide) {
      candidateMaxW = smallMax;
      candidateMaxH = smallMax;
    }

    // Si la colocación se atasca, reduce el tamaño máximo para que quepan
    // las salas restantes. El panel no cambia; el ajuste se informa.
    if (attempt > 900) {
      const shrink = Math.min(4, Math.floor((attempt - 900) / 175) + 1);
      candidateMaxW = Math.max(minSide, candidateMaxW - shrink);
      candidateMaxH = Math.max(minSide, candidateMaxH - shrink);
    }

    const w = randInt(rng, candidateMinW, candidateMaxW);
    const h = randInt(rng, candidateMinH, candidateMaxH);
    const maxX = maxXLimit - w;
    const maxY = maxYLimit - h;
    if (maxX < minX || maxY < minY) continue;

    const x = randInt(rng, minX, maxX);
    const y = randInt(rng, minY, maxY);
    const candidate: Room = { id: position, x, y, width: w, height: h };

    if (rooms.some((room) => rectsOverlap(room, candidate, 1))) continue;
    rooms.push(candidate);
  }

  return rooms;
}

function placeRandomRooms(rng: () => number, options: ResolvedOptions): PlacementResult {
  const warnings: string[] = [];
  const width = options.width;
  const height = options.height;
  const limitW = width - 4;
  const limitH = height - 4;
  const absoluteMax = Math.min(options.roomMax, limitW, limitH);

  let best: Room[] = [];
  let bestCap = absoluteMax;
  for (let cap = absoluteMax; cap >= options.roomMin; cap -= 1) {
    const rooms = tryPlaceRandom(rng, width, height, options.roomTarget, options.roomMin, cap);
    if (rooms.length > best.length) {
      best = rooms;
      bestCap = cap;
    }
    if (rooms.length >= options.roomTarget) {
      best = rooms;
      bestCap = cap;
      break;
    }
  }

  if (best.length < options.roomTarget) {
    warnings.push(
      `Objetivo de salas ajustado a ${best.length}: no caben ${options.roomTarget} salas de ${options.roomMin}-${options.roomMax} tiles en ${width}×${height}.`,
    );
  }
  if (bestCap < options.roomMax) {
    warnings.push(
      `Tamaño máximo de sala ajustado de ${options.roomMax} a ${bestCap} para colocar ${best.length} salas.`,
    );
  }

  return { rooms: best, warnings };
}

function buildBspTree(
  rng: () => number,
  options: ResolvedOptions,
): { root: BspNode; leaves: BspNode[]; warnings: string[] } {
  const margin = 2;
  const root: BspNode = {
    x: margin,
    y: margin,
    w: options.width - margin * 2,
    h: options.height - margin * 2,
  };
  const leaves: BspNode[] = [root];
  const warnings: string[] = [];
  const minLeaf = options.roomMin + 2;

  while (leaves.length < options.roomTarget) {
    let bestIndex = -1;
    let bestScore = -1;
    for (let index = 0; index < leaves.length; index += 1) {
      const leaf = leaves[index];
      const canVertical = leaf.w >= minLeaf * 2 && leaf.h >= minLeaf;
      const canHorizontal = leaf.h >= minLeaf * 2 && leaf.w >= minLeaf;
      if (!canVertical && !canHorizontal) continue;
      const score = leaf.w * leaf.h;
      if (score > bestScore) {
        bestScore = score;
        bestIndex = index;
      }
    }

    if (bestIndex < 0) break;

    const leaf = leaves[bestIndex];
    const canVertical = leaf.w >= minLeaf * 2 && leaf.h >= minLeaf;
    const canHorizontal = leaf.h >= minLeaf * 2 && leaf.w >= minLeaf;
    const vertical = canVertical && (!canHorizontal || leaf.w >= leaf.h);

    if (vertical) {
      const split = randInt(rng, minLeaf, leaf.w - minLeaf);
      leaf.left = { x: leaf.x, y: leaf.y, w: split, h: leaf.h };
      leaf.right = { x: leaf.x + split, y: leaf.y, w: leaf.w - split, h: leaf.h };
    } else {
      const split = randInt(rng, minLeaf, leaf.h - minLeaf);
      leaf.left = { x: leaf.x, y: leaf.y, w: leaf.w, h: split };
      leaf.right = { x: leaf.x, y: leaf.y + split, w: leaf.w, h: leaf.h - split };
    }
    leaves.splice(bestIndex, 1, leaf.left, leaf.right);
  }

  if (leaves.length < options.roomTarget) {
    warnings.push(
      `Objetivo de salas ajustado a ${leaves.length}: la partición BSP no puede dividir más con salas de al menos ${options.roomMin} tiles.`,
    );
  }

  return { root, leaves, warnings };
}

function placeBspRooms(rng: () => number, options: ResolvedOptions): PlacementResult & { root: BspNode } {
  const { root, leaves, warnings } = buildBspTree(rng, options);
  const rooms: Room[] = [];

  leaves.forEach((leaf, leafIndex) => {
    const maxW = Math.min(options.roomMax, leaf.w - 2, options.width - 4);
    const maxH = Math.min(options.roomMax, leaf.h - 2, options.height - 4);
    if (maxW < options.roomMin || maxH < options.roomMin) return;

    let minW = options.roomMin;
    let minH = options.roomMin;
    let maxRoomW = maxW;
    let maxRoomH = maxH;
    const largeMin = Math.max(7, options.roomMin);

    if (leafIndex < 2 && maxW >= largeMin && maxH >= largeMin) {
      minW = largeMin;
      minH = largeMin;
      maxRoomW = Math.min(maxW, 9);
      maxRoomH = Math.min(maxH, 9);
    } else if (leafIndex < 5 && Math.min(maxW, maxH, 5) >= options.roomMin) {
      maxRoomW = Math.min(maxW, 5);
      maxRoomH = Math.min(maxH, 5);
    }

    const w = randInt(rng, minW, maxRoomW);
    const h = randInt(rng, minH, maxRoomH);
    const minX = leaf.x + 1;
    const minY = leaf.y + 1;
    const maxX = leaf.x + leaf.w - 1 - w;
    const maxY = leaf.y + leaf.h - 1 - h;
    if (maxX < minX || maxY < minY) return;

    const x = randInt(rng, minX, maxX);
    const y = randInt(rng, minY, maxY);
    const room: Room = { id: rooms.length, x, y, width: w, height: h };
    rooms.push(room);
    leaf.roomId = room.id;
  });

  if (rooms.length < leaves.length) {
    warnings.push(
      `Algunas hojas BSP no admiten una sala de ${options.roomMin} tiles; se generaron ${rooms.length} salas.`,
    );
  }

  return { root, rooms, warnings };
}

function addFallbackRooms(rooms: Room[], options: ResolvedOptions, warnings: string[]): void {
  if (rooms.length > 0) return;

  const width = Math.min(6, options.width - 6);
  const height = Math.min(6, options.height - 6);
  const first: Room = { id: 0, x: 2, y: 2, width, height };
  rooms.push(first);
  warnings.push('No se pudo colocar ninguna sala; se usa una sala mínima de emergencia.');

  if (rooms.length < 2) {
    const second: Room = {
      id: 1,
      x: options.width - 2 - width,
      y: options.height - 2 - height,
      width,
      height,
    };
    if (!rectsOverlap(first, second, 1)) {
      rooms.push(second);
      warnings.push('Solo se pudo colocar una segunda sala de emergencia.');
    }
  }
}

// ---------------------------------------------------------------------------
// Contexto de generación y conexiones
// ---------------------------------------------------------------------------

function createGenerationContext(rooms: Room[], options: ResolvedOptions, warnings: string[]): GenerationContext {
  const roomCells = new Uint8Array(options.width * options.height);
  const tiles = new Array<number>(options.width * options.height).fill(0);

  for (const room of rooms) {
    for (let y = room.y; y < room.y + room.height; y += 1) {
      for (let x = room.x; x < room.x + room.width; x += 1) {
        const index = indexOf(options.width, x, y);
        roomCells[index] = 1;
        tiles[index] = 1;
      }
    }
  }

  return {
    width: options.width,
    height: options.height,
    rooms,
    tiles,
    roomCells,
    reserved: new Set<number>(),
    usedSlots: new Map<number, DoorSlot[]>(),
    slotCache: new Map<number, DoorSlot[]>(),
    connections: [],
    warnings,
  };
}

function tileAt(context: GenerationContext, x: number, y: number): number {
  if (!inBounds(context.width, context.height, x, y)) return 0;
  return context.tiles[indexOf(context.width, x, y)];
}

function isRoomCell(context: GenerationContext, x: number, y: number): boolean {
  if (!inBounds(context.width, context.height, x, y)) return false;
  return context.roomCells[indexOf(context.width, x, y)] === 1;
}

function isFloor(context: GenerationContext, x: number, y: number): boolean {
  return tileAt(context, x, y) === 1;
}

function isAdjacentToRoom(context: GenerationContext, x: number, y: number): boolean {
  return DIRECTIONS.some((direction) => isRoomCell(context, x + direction.x, y + direction.y));
}

function isReserved(context: GenerationContext, x: number, y: number): boolean {
  return context.reserved.has(indexOf(context.width, x, y));
}

function orthogonalNeighbours(width: number, height: number, point: Point): Point[] {
  return DIRECTIONS.map((direction) => ({ x: point.x + direction.x, y: point.y + direction.y })).filter(
    (neighbour) => inBounds(width, height, neighbour.x, neighbour.y),
  );
}

function samplePositions(length: number): number[] {
  if (length <= 0) return [];
  if (length === 1) return [0];
  if (length === 2) return [0, 1];
  if (length === 3) return [0, 1, 2];
  return [0, Math.floor((length - 1) / 3), Math.floor((2 * (length - 1)) / 3), length - 1];
}

function doorSlotsForRoom(room: Room): DoorSlot[] {
  const slots: DoorSlot[] = [];
  const horizontalLength = room.width - 2;
  const verticalLength = room.height - 2;

  for (const position of samplePositions(horizontalLength)) {
    slots.push({
      x: room.x + 1 + position,
      y: room.y - 1,
      out: { x: 0, y: -1 },
      orientation: 'horizontal',
      roomId: room.id,
    });
    slots.push({
      x: room.x + 1 + position,
      y: room.y + room.height,
      out: { x: 0, y: 1 },
      orientation: 'horizontal',
      roomId: room.id,
    });
  }

  for (const position of samplePositions(verticalLength)) {
    slots.push({
      x: room.x - 1,
      y: room.y + 1 + position,
      out: { x: -1, y: 0 },
      orientation: 'vertical',
      roomId: room.id,
    });
    slots.push({
      x: room.x + room.width,
      y: room.y + 1 + position,
      out: { x: 1, y: 0 },
      orientation: 'vertical',
      roomId: room.id,
    });
  }

  return slots;
}

function doorPerpendicularCells(slot: DoorSlot): [Point, Point] {
  if (slot.orientation === 'horizontal') {
    return [
      { x: slot.x - 1, y: slot.y },
      { x: slot.x + 1, y: slot.y },
    ];
  }
  return [
    { x: slot.x, y: slot.y - 1 },
    { x: slot.x, y: slot.y + 1 },
  ];
}

function slotIsUsable(context: GenerationContext, slot: DoorSlot): boolean {
  if (!isCorridorCell(context.width, context.height, slot)) return false;
  if (isFloor(context, slot.x, slot.y)) return false;
  if (isReserved(context, slot.x, slot.y)) return false;

  const outward = { x: slot.x + slot.out.x, y: slot.y + slot.out.y };
  if (!isCorridorCell(context.width, context.height, outward)) return false;
  if (isRoomCell(context, outward.x, outward.y)) return false;

  const roomCell = { x: slot.x - slot.out.x, y: slot.y - slot.out.y };
  if (!isRoomCell(context, roomCell.x, roomCell.y)) return false;

  for (const perpendicular of doorPerpendicularCells(slot)) {
    if (!inBounds(context.width, context.height, perpendicular.x, perpendicular.y)) return false;
    if (isFloor(context, perpendicular.x, perpendicular.y)) return false;
    if (isReserved(context, perpendicular.x, perpendicular.y)) return false;
  }

  // Un hueco no puede estar pegado a otro hueco del mismo muro.
  const used = context.usedSlots.get(slot.roomId) ?? [];
  if (
    used.some(
      (other) => Math.abs(other.x - slot.x) <= 1 && Math.abs(other.y - slot.y) <= 1,
    )
  ) {
    return false;
  }

  // El hueco solo puede tocar su propia sala; si toca otra, no es un acceso
  // sala↔pasillo válido.
  for (const neighbour of orthogonalNeighbours(context.width, context.height, slot)) {
    if (!isRoomCell(context, neighbour.x, neighbour.y)) continue;
    if (neighbour.x !== roomCell.x || neighbour.y !== roomCell.y) return false;
  }

  return true;
}

function buildRouteCandidates(start: Point, goal: Point): Point[][] {
  const candidates: Point[][] = [];

  const appendLine = (points: Point[], target: Point): Point[] => {
    const result = [...points];
    let current = result[result.length - 1];
    let guard = 0;
    while ((current.x !== target.x || current.y !== target.y) && guard < 128) {
      guard += 1;
      if (current.x !== target.x) {
        current = { x: current.x + Math.sign(target.x - current.x), y: current.y };
      } else {
        current = { x: current.x, y: current.y + Math.sign(target.y - current.y) };
      }
      result.push(current);
    }
    return result;
  };

  const horizontalThenVertical = appendLine(
    appendLine([start], { x: goal.x, y: start.y }),
    goal,
  );
  candidates.push(horizontalThenVertical);

  const verticalThenHorizontal = appendLine(
    appendLine([start], { x: start.x, y: goal.y }),
    goal,
  );
  candidates.push(verticalThenHorizontal);

  const middleRow = Math.floor((start.y + goal.y) / 2);
  for (const row of [middleRow, middleRow + 1]) {
    const path = appendLine(
      appendLine(appendLine([start], { x: start.x, y: row }), { x: goal.x, y: row }),
      goal,
    );
    candidates.push(path);
  }

  const middleColumn = Math.floor((start.x + goal.x) / 2);
  for (const column of [middleColumn, middleColumn + 1]) {
    const path = appendLine(
      appendLine(appendLine([start], { x: column, y: start.y }), { x: column, y: goal.y }),
      goal,
    );
    candidates.push(path);
  }

  return candidates.map(dedupePath).filter((path) => path.length > 0);
}

function countCorners(path: Point[]): number {
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

function pathLength(path: Point[]): number {
  const points = dedupePath(path);
  let length = 0;
  for (let index = 1; index < points.length; index += 1) {
    length += Math.abs(points[index].x - points[index - 1].x) + Math.abs(points[index].y - points[index - 1].y);
  }
  return length;
}

function wouldCreateWideFloor(context: GenerationContext, path: Point[]): boolean {
  const pathSet = new Set(path.map((point) => indexOf(context.width, point.x, point.y)));
  const floorAt = (x: number, y: number): boolean => {
    if (!inBounds(context.width, context.height, x, y)) return false;
    const index = indexOf(context.width, x, y);
    return context.tiles[index] === 1 || pathSet.has(index);
  };

  for (const point of path) {
    const pointIndex = indexOf(context.width, point.x, point.y);
    if (context.tiles[pointIndex] === 1) continue;
    for (const offsetX of [-1, 0]) {
      for (const offsetY of [-1, 0]) {
        const x = point.x + offsetX;
        const y = point.y + offsetY;
        if (
          floorAt(x, y) &&
          floorAt(x + 1, y) &&
          floorAt(x, y + 1) &&
          floorAt(x + 1, y + 1)
        ) {
          return true;
        }
      }
    }
  }

  return false;
}

function validatePath(
  context: GenerationContext,
  path: Point[],
  slotA: DoorSlot,
  slotB: DoorSlot,
): Point[] | null {
  const points = dedupePath(path);
  if (points.length < 3) return null;
  if (!samePoint(points[0], slotA) || !samePoint(points[points.length - 1], slotB)) return null;

  for (let index = 0; index < points.length; index += 1) {
    const point = points[index];
    if (!isCorridorCell(context.width, context.height, point)) return null;
    if (isReserved(context, point.x, point.y)) return null;
    if (isRoomCell(context, point.x, point.y)) return null;

    const isEndpoint = index === 0 || index === points.length - 1;
    if (!isEndpoint) {
      if (isAdjacentToRoom(context, point.x, point.y)) return null;
      continue;
    }

    const slot = index === 0 ? slotA : slotB;
    const expected =
      index === 0 ? points[1] : points[points.length - 2];
    if (
      expected.x !== point.x + slot.out.x ||
      expected.y !== point.y + slot.out.y
    ) {
      return null;
    }

    const outward = { x: point.x + slot.out.x, y: point.y + slot.out.y };
    if (!isCorridorCell(context.width, context.height, outward)) return null;
    if (isRoomCell(context, outward.x, outward.y)) return null;

    const roomCell = { x: point.x - slot.out.x, y: point.y - slot.out.y };
    for (const perpendicular of doorPerpendicularCells(slot)) {
      if (!inBounds(context.width, context.height, perpendicular.x, perpendicular.y)) return null;
      if (isFloor(context, perpendicular.x, perpendicular.y)) return null;
      if (isReserved(context, perpendicular.x, perpendicular.y)) return null;
    }

    for (const neighbour of orthogonalNeighbours(context.width, context.height, point)) {
      if (!isRoomCell(context, neighbour.x, neighbour.y)) continue;
      if (neighbour.x !== roomCell.x || neighbour.y !== roomCell.y) return null;
    }
  }

  return wouldCreateWideFloor(context, points) ? null : points;
}

function bfsRoute(
  context: GenerationContext,
  start: Point,
  goal: Point,
): Point[] | null {
  const startIndex = indexOf(context.width, start.x, start.y);
  const goalIndex = indexOf(context.width, goal.x, goal.y);
  const previous = new Map<number, number>();
  const queue: number[] = [startIndex];
  const visited = new Set<number>([startIndex]);
  previous.set(startIndex, -1);

  const passable = (x: number, y: number): boolean => {
    if (!isCorridorCell(context.width, context.height, { x, y })) return false;
    if (isRoomCell(context, x, y)) return false;
    if (isReserved(context, x, y)) return false;
    if (isAdjacentToRoom(context, x, y)) return false;
    return true;
  };

  if (!passable(start.x, start.y) || !passable(goal.x, goal.y)) return null;

  let head = 0;
  while (head < queue.length) {
    const current = queue[head];
    head += 1;
    if (current === goalIndex) break;
    const x = current % context.width;
    const y = Math.floor(current / context.width);
    for (const direction of DIRECTIONS) {
      const nextX = x + direction.x;
      const nextY = y + direction.y;
      if (!passable(nextX, nextY)) continue;
      const nextIndex = indexOf(context.width, nextX, nextY);
      if (visited.has(nextIndex)) continue;
      visited.add(nextIndex);
      previous.set(nextIndex, current);
      queue.push(nextIndex);
    }
  }

  if (!visited.has(goalIndex)) return null;

  const path: Point[] = [];
  let current = goalIndex;
  while (current !== -1) {
    path.push({ x: current % context.width, y: Math.floor(current / context.width) });
    current = previous.get(current) ?? -1;
  }
  path.reverse();
  return path;
}

function findConnection(
  context: GenerationContext,
  roomA: Room,
  roomB: Room,
): ConnectionCandidate | null {
  if ((context.usedSlots.get(roomA.id)?.length ?? 0) >= 3) return null;
  if ((context.usedSlots.get(roomB.id)?.length ?? 0) >= 3) return null;

  const cachedSlots = (room: Room): DoorSlot[] => {
    const cached = context.slotCache.get(room.id);
    if (cached) return cached;
    const slots = doorSlotsForRoom(room);
    context.slotCache.set(room.id, slots);
    return slots;
  };

  const slotsA = cachedSlots(roomA).filter((slot) => slotIsUsable(context, slot));
  const slotsB = cachedSlots(roomB).filter((slot) => slotIsUsable(context, slot));
  if (slotsA.length === 0 || slotsB.length === 0) return null;

  const bestHolder: { value: RouteCandidate | null } = { value: null };

  const consider = (slotA: DoorSlot, slotB: DoorSlot, path: Point[]): void => {
    const validated = validatePath(context, path, slotA, slotB);
    if (!validated) return;
    const score = pathLength(validated) * 10 + countCorners(validated);
    if (!bestHolder.value || score < bestHolder.value.score) {
      bestHolder.value = { path: validated, score };
    }
  };

  for (const slotA of slotsA) {
    for (const slotB of slotsB) {
      if (samePoint(slotA, slotB)) continue;
      const start = { x: slotA.x + slotA.out.x, y: slotA.y + slotA.out.y };
      const goal = { x: slotB.x + slotB.out.x, y: slotB.y + slotB.out.y };
      if (!isCorridorCell(context.width, context.height, start)) continue;
      if (!isCorridorCell(context.width, context.height, goal)) continue;
      for (const route of buildRouteCandidates(start, goal)) {
        consider(slotA, slotB, [slotA, ...route, slotB]);
      }
    }
  }

  if (!bestHolder.value) {
    // El fallback BFS es caro; se limita a una muestra de huecos. Si no hay
    // ruta por L/Z ni por esta muestra, el par se considera no conectable y
    // se prueba otro par o se normaliza el mapa.
    const fallbackA = slotsA.slice(0, 6);
    const fallbackB = slotsB.slice(0, 6);
    for (const slotA of fallbackA) {
      for (const slotB of fallbackB) {
        if (samePoint(slotA, slotB)) continue;
        const start = { x: slotA.x + slotA.out.x, y: slotA.y + slotA.out.y };
        const goal = { x: slotB.x + slotB.out.x, y: slotB.y + slotB.out.y };
        const route = bfsRoute(context, start, goal);
        if (!route) continue;
        consider(slotA, slotB, [slotA, ...route, slotB]);
      }
    }
  }

  const best = bestHolder.value;
  if (!best) return null;

  // Recupera los huecos del camino elegido a partir de los extremos.
  const bestPath = best.path;
  const chosenA = slotsA.find((slot) => samePoint(slot, bestPath[0]));
  const chosenB = slotsB.find((slot) => samePoint(slot, bestPath[bestPath.length - 1]));
  if (!chosenA || !chosenB) return null;

  return { slotA: chosenA, slotB: chosenB, path: bestPath };
}

function commitConnection(
  context: GenerationContext,
  candidate: ConnectionCandidate,
  kind: CorridorKind,
): void {
  const { slotA, slotB, path } = candidate;

  for (const point of path) {
    context.tiles[indexOf(context.width, point.x, point.y)] = 1;
  }

  for (const slot of [slotA, slotB]) {
    for (const perpendicular of doorPerpendicularCells(slot)) {
      context.reserved.add(indexOf(context.width, perpendicular.x, perpendicular.y));
    }
    const used = context.usedSlots.get(slot.roomId) ?? [];
    used.push(slot);
    context.usedSlots.set(slot.roomId, used);
  }

  context.connections.push({
    from: slotA.roomId,
    to: slotB.roomId,
    kind,
    path,
  });
}

function roomDistance(a: Room, b: Room): number {
  const centerA = roomCenter(a);
  const centerB = roomCenter(b);
  return Math.abs(centerA.x - centerB.x) + Math.abs(centerA.y - centerB.y);
}

function connectPrim(context: GenerationContext): void {
  const connected = new Set<number>([0]);
  while (connected.size < context.rooms.length) {
    let best: { from: number; to: number; candidate: ConnectionCandidate; score: number } | null = null;

    for (let to = 0; to < context.rooms.length; to += 1) {
      if (connected.has(to)) continue;

      const connectedRooms = [...connected].sort(
        (a, b) => roomDistance(context.rooms[a], context.rooms[to]) - roomDistance(context.rooms[b], context.rooms[to]),
      );

      let bestForRoom: { from: number; candidate: ConnectionCandidate; score: number } | null = null;
      // Los vecinos más cercanos suelen dar el pasillo más corto. Si ninguno
      // es conectable, se prueban los demás antes de rendirse.
      const nearest = connectedRooms.slice(0, 3);
      const rest = connectedRooms.slice(3);
      for (const from of nearest) {
        const candidate = findConnection(context, context.rooms[from], context.rooms[to]);
        if (!candidate) continue;
        const score = pathLength(candidate.path) * 10 + countCorners(candidate.path);
        if (!bestForRoom || score < bestForRoom.score) {
          bestForRoom = { from, candidate, score };
        }
      }
      if (!bestForRoom) {
        for (const from of rest) {
          const candidate = findConnection(context, context.rooms[from], context.rooms[to]);
          if (!candidate) continue;
          const score = pathLength(candidate.path) * 10 + countCorners(candidate.path);
          if (!bestForRoom || score < bestForRoom.score) {
            bestForRoom = { from, candidate, score };
          }
        }
      }

      if (
        bestForRoom &&
        (!best || bestForRoom.score < best.score || (bestForRoom.score === best.score && to < best.to))
      ) {
        best = { from: bestForRoom.from, to, candidate: bestForRoom.candidate, score: bestForRoom.score };
      }
    }

    if (!best) {
      context.warnings.push(
        `No se pudo conectar la sala ${connected.size} de ${context.rooms.length}; el mapa queda incompleto.`,
      );
      break;
    }

    commitConnection(context, best.candidate, 'tree');
    connected.add(best.to);
  }
}

function connectBspTree(context: GenerationContext, node: BspNode): number[] {
  if (!node.left || !node.right) {
    return node.roomId === undefined ? [] : [node.roomId];
  }

  const leftRooms = connectBspTree(context, node.left);
  const rightRooms = connectBspTree(context, node.right);

  let best: { left: number; right: number; candidate: ConnectionCandidate; score: number } | null = null;
  for (const left of leftRooms) {
    for (const right of rightRooms) {
      const candidate = findConnection(context, context.rooms[left], context.rooms[right]);
      if (!candidate) continue;
      const score = pathLength(candidate.path) * 10 + countCorners(candidate.path);
      if (!best || score < best.score) {
        best = { left, right, candidate, score };
      }
    }
  }

  if (best) {
    commitConnection(context, best.candidate, 'tree');
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
    if (connection.kind === 'tree') union(parent, connection.from, connection.to);
  }

  const root = findRoot(parent, 0);
  for (let roomIndex = 1; roomIndex < context.rooms.length; roomIndex += 1) {
    if (findRoot(parent, roomIndex) === root) continue;

    let best: { from: number; to: number; candidate: ConnectionCandidate; score: number } | null = null;
    for (let from = 0; from < context.rooms.length; from += 1) {
      if (findRoot(parent, from) !== root) continue;
      for (let to = 0; to < context.rooms.length; to += 1) {
        if (findRoot(parent, to) === root) continue;
        const candidate = findConnection(context, context.rooms[from], context.rooms[to]);
        if (!candidate) continue;
        const score = pathLength(candidate.path) * 10 + countCorners(candidate.path);
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

function addLoops(context: GenerationContext, loopRatio: number): void {
  const target = Math.min(3, Math.max(0, Math.round((context.rooms.length * loopRatio) / 100)));
  if (target === 0) return;

  const linked = new Set<string>();
  for (const connection of context.connections) {
    const key = connection.from < connection.to ? `${connection.from}:${connection.to}` : `${connection.to}:${connection.from}`;
    linked.add(key);
  }

  const candidates: Array<{ from: number; to: number; candidate: ConnectionCandidate; score: number }> = [];
  for (let from = 0; from < context.rooms.length; from += 1) {
    for (let to = from + 1; to < context.rooms.length; to += 1) {
      const key = `${from}:${to}`;
      if (linked.has(key)) continue;
      if ((context.usedSlots.get(from)?.length ?? 0) >= 3) continue;
      if ((context.usedSlots.get(to)?.length ?? 0) >= 3) continue;
      const candidate = findConnection(context, context.rooms[from], context.rooms[to]);
      if (!candidate) continue;
      candidates.push({
        from,
        to,
        candidate,
        score: pathLength(candidate.path) * 10 + countCorners(candidate.path),
      });
    }
  }

  candidates.sort((a, b) => a.score - b.score || a.from - b.from || a.to - b.to);

  let added = 0;
  for (const candidate of candidates) {
    if (added >= target) break;
    if ((context.usedSlots.get(candidate.from)?.length ?? 0) >= 3) continue;
    if ((context.usedSlots.get(candidate.to)?.length ?? 0) >= 3) continue;
    const fresh = findConnection(context, context.rooms[candidate.from], context.rooms[candidate.to]);
    if (!fresh) continue;
    commitConnection(context, fresh, 'loop');
    added += 1;
  }

  if (added < target) {
    context.warnings.push(`Bucles ajustados de ${target} a ${added}: no quedaban conexiones válidas.`);
  }
}

// ---------------------------------------------------------------------------
// Relleno laberíntico de la variante híbrida
// ---------------------------------------------------------------------------

function growMaze(context: GenerationContext, rng: () => number): void {
  const candidates = new Uint8Array(context.width * context.height);
  for (let y = 1; y <= context.height - 2; y += 1) {
    for (let x = 1; x <= context.width - 2; x += 1) {
      const index = indexOf(context.width, x, y);
      if (context.tiles[index] === 1) continue;
      if (context.roomCells[index] === 1) continue;
      if (context.reserved.has(index)) continue;
      if (isAdjacentToRoom(context, x, y)) continue;
      candidates[index] = 1;
    }
  }

  let carved = 0;
  let changed = true;
  let guard = 0;
  while (changed && guard < context.width * context.height) {
    guard += 1;
    changed = false;
    const frontier: number[] = [];
    for (let index = 0; index < candidates.length; index += 1) {
      if (candidates[index] !== 1) continue;
      if (context.tiles[index] === 1) continue;
      const x = index % context.width;
      const y = Math.floor(index / context.width);
      let floorNeighbours = 0;
      for (const direction of DIRECTIONS) {
        if (isFloor(context, x + direction.x, y + direction.y)) floorNeighbours += 1;
      }
      if (floorNeighbours === 1) frontier.push(index);
    }

    for (let index = frontier.length - 1; index > 0; index -= 1) {
      const swap = Math.floor(rng() * (index + 1));
      [frontier[index], frontier[swap]] = [frontier[swap], frontier[index]];
    }

    for (const index of frontier) {
      if (context.tiles[index] === 1) continue;
      const x = index % context.width;
      const y = Math.floor(index / context.width);
      let floorNeighbours = 0;
      for (const direction of DIRECTIONS) {
        if (isFloor(context, x + direction.x, y + direction.y)) floorNeighbours += 1;
      }
      if (floorNeighbours !== 1) continue;
      context.tiles[index] = 1;
      carved += 1;
      changed = true;
    }
  }

  if (carved === 0) {
    context.warnings.push('La variante híbrida no encontró espacio libre para el relleno laberíntico.');
  }
}

// ---------------------------------------------------------------------------
// Huecos, apariciones y métricas
// ---------------------------------------------------------------------------

function buildDoors(context: GenerationContext): Door[] {
  const doors: Door[] = [];
  for (const room of context.rooms) {
    const slots = context.usedSlots.get(room.id) ?? [];
    for (const slot of slots) {
      doors.push({
        x: slot.x,
        y: slot.y,
        orientation: slot.orientation,
        roomId: slot.roomId,
      });
    }
  }
  doors.sort((a, b) => a.roomId - b.roomId || a.y - b.y || a.x - b.x);
  return doors;
}

function floorDistances(state: DungeonState, from: Point): number[] {
  const distances = new Array<number>(state.width * state.height).fill(-1);
  const startIndex = indexOf(state.width, from.x, from.y);
  if (state.tiles[startIndex] !== 1) return distances;
  distances[startIndex] = 0;
  const queue: number[] = [startIndex];
  let head = 0;
  while (head < queue.length) {
    const current = queue[head];
    head += 1;
    const x = current % state.width;
    const y = Math.floor(current / state.width);
    for (const direction of DIRECTIONS) {
      const nextX = x + direction.x;
      const nextY = y + direction.y;
      if (!inBounds(state.width, state.height, nextX, nextY)) continue;
      const nextIndex = indexOf(state.width, nextX, nextY);
      if (state.tiles[nextIndex] !== 1) continue;
      if (distances[nextIndex] !== -1) continue;
      distances[nextIndex] = distances[current] + 1;
      queue.push(nextIndex);
    }
  }
  return distances;
}

function roomOfPoint(state: DungeonState, point: Point): Room | null {
  for (const room of state.rooms) {
    if (
      point.x >= room.x &&
      point.y >= room.y &&
      point.x < room.x + room.width &&
      point.y < room.y + room.height
    ) {
      return room;
    }
  }
  return null;
}

function placeSpawns(state: DungeonState): Spawns {
  const playerRoom =
    state.rooms.find((room) => state.doors.some((door) => door.roomId === room.id)) ?? state.rooms[0];
  if (!playerRoom) {
    return { player: { x: 1, y: 1 }, enemy: { x: 1, y: 1 }, distance: 0 };
  }

  const player = roomCenter(playerRoom);
  const distances = floorDistances(state, player);

  let enemyRoom: Room | null = null;
  let enemyPoint: Point = player;
  let enemyDistance = -1;

  for (const room of state.rooms) {
    if (room.id === playerRoom.id) continue;
    let roomBestDistance = -1;
    let roomBestPoint: Point | null = null;
    for (let y = room.y; y < room.y + room.height; y += 1) {
      for (let x = room.x; x < room.x + room.width; x += 1) {
        const distance = distances[indexOf(state.width, x, y)];
        if (distance < 0) continue;
        if (
          distance > roomBestDistance ||
          (distance === roomBestDistance &&
            roomBestPoint !== null &&
            (y < roomBestPoint.y || (y === roomBestPoint.y && x < roomBestPoint.x)))
        ) {
          roomBestDistance = distance;
          roomBestPoint = { x, y };
        }
      }
    }
    if (roomBestPoint && roomBestDistance > enemyDistance) {
      enemyDistance = roomBestDistance;
      enemyPoint = roomBestPoint;
      enemyRoom = room;
    }
  }

  if (!enemyRoom) {
    state.warnings.push('No hay una segunda sala alcanzable; el enemigo comparte sala con el jugador.');
    return { player, enemy: player, distance: 0 };
  }

  return { player, enemy: enemyPoint, distance: enemyDistance };
}

function reachableFloor(state: DungeonState, from: Point): number {
  const distances = floorDistances(state, from);
  return distances.filter((distance) => distance >= 0).length;
}

function totalFloor(state: DungeonState): number {
  return state.tiles.reduce((sum, tile) => (tile === 1 ? sum + 1 : sum), 0);
}

function floorPercentage(state: DungeonState): number {
  return (totalFloor(state) / (state.width * state.height)) * 100;
}

export function connectivityPercentage(state: DungeonState): number {
  const floor = totalFloor(state);
  if (floor === 0) return 0;
  return (reachableFloor(state, state.spawns.player) / floor) * 100;
}

function roomsOfCells(state: DungeonState): Uint8Array {
  const cells = new Uint8Array(state.width * state.height);
  for (const room of state.rooms) {
    for (let y = room.y; y < room.y + room.height; y += 1) {
      for (let x = room.x; x < room.x + room.width; x += 1) {
        cells[indexOf(state.width, x, y)] = 1;
      }
    }
  }
  return cells;
}

/** Número de casillas de pasillo (suelo fuera de sala; incluye huecos). */
function corridorTiles(state: DungeonState): number {
  const roomCells = roomsOfCells(state);
  let count = 0;
  for (let index = 0; index < state.tiles.length; index += 1) {
    if (state.tiles[index] === 1 && roomCells[index] === 0) count += 1;
  }
  return count;
}

function doorIndexSet(state: DungeonState): Set<number> {
  return new Set(state.doors.map((door) => indexOf(state.width, door.x, door.y)));
}

function countFloorCorners(state: DungeonState): number {
  const roomCells = roomsOfCells(state);
  const doors = doorIndexSet(state);
  let corners = 0;

  for (let y = 1; y <= state.height - 2; y += 1) {
    for (let x = 1; x <= state.width - 2; x += 1) {
      const index = indexOf(state.width, x, y);
      if (state.tiles[index] !== 1) continue;
      if (roomCells[index] === 1 || doors.has(index)) continue;
      const neighbours = DIRECTIONS.filter(
        (direction) =>
          inBounds(state.width, state.height, x + direction.x, y + direction.y) &&
          state.tiles[indexOf(state.width, x + direction.x, y + direction.y)] === 1,
      );
      if (neighbours.length !== 2) continue;
      const first = neighbours[0];
      const second = neighbours[1];
      const opposite = first.x === -second.x && first.y === -second.y;
      if (!opposite) corners += 1;
    }
  }

  return corners;
}

function countDeadEnds(state: DungeonState): number {
  const roomCells = roomsOfCells(state);
  const doors = doorIndexSet(state);
  let deadEnds = 0;
  for (let y = 1; y <= state.height - 2; y += 1) {
    for (let x = 1; x <= state.width - 2; x += 1) {
      const index = indexOf(state.width, x, y);
      if (state.tiles[index] !== 1) continue;
      if (roomCells[index] === 1 || doors.has(index)) continue;
      let neighbours = 0;
      for (const direction of DIRECTIONS) {
        if (
          inBounds(state.width, state.height, x + direction.x, y + direction.y) &&
          state.tiles[indexOf(state.width, x + direction.x, y + direction.y)] === 1
        ) {
          neighbours += 1;
        }
      }
      if (neighbours === 1) deadEnds += 1;
    }
  }
  return deadEnds;
}

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 1) return sorted[middle];
  return (sorted[middle - 1] + sorted[middle]) / 2;
}

/** Huella estable de rejilla + salas para comparar semillas sin píxeles. */
export function fingerprint(state: Pick<DungeonState, 'width' | 'height' | 'tiles' | 'rooms'>): string {
  let hash = 2166136261;
  for (let index = 0; index < state.tiles.length; index += 1) {
    hash ^= state.tiles[index] + 1;
    hash = Math.imul(hash, 16777619);
  }
  for (const room of state.rooms) {
    for (const value of [room.x, room.y, room.width, room.height]) {
      hash ^= value + 1;
      hash = Math.imul(hash, 16777619);
    }
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

/** Regla de muros aprobada: side1 solo si el sur es suelo; nunca side2. */
export type WallTile = 'wallTop' | 'wallSide1';

export function wallTileFor(
  grid: Pick<DungeonState, 'width' | 'height' | 'tiles'>,
  x: number,
  y: number,
): WallTile {
  const southY = y + 1;
  if (southY < grid.height && southY >= 0 && x >= 0 && x < grid.width) {
    if (grid.tiles[indexOf(grid.width, x, southY)] === 1) return 'wallSide1';
  }
  return 'wallTop';
}

/** Valida un hueco según R-005: suelo, muro a ambos lados y sin esquina. */
export function isDoorValid(state: DungeonState, door: Door): boolean {
  const index = indexOf(state.width, door.x, door.y);
  if (state.tiles[index] !== 1) return false;

  const horizontal = door.orientation === 'horizontal';
  const acrossOffsets = horizontal
    ? [
        { x: 0, y: -1 },
        { x: 0, y: 1 },
      ]
    : [
        { x: -1, y: 0 },
        { x: 1, y: 0 },
      ];
  const perpendicularOffsets = horizontal
    ? [
        { x: -1, y: 0 },
        { x: 1, y: 0 },
      ]
    : [
        { x: 0, y: -1 },
        { x: 0, y: 1 },
      ];

  const across = acrossOffsets.map((offset) => ({ x: door.x + offset.x, y: door.y + offset.y }));
  const roomNeighbours = across.filter(
    (point) =>
      inBounds(state.width, state.height, point.x, point.y) &&
      roomOfPoint(state, point) !== null,
  );
  if (roomNeighbours.length !== 1) return false;

  const roomNeighbour = roomNeighbours[0];
  const outward = across.find((point) => !samePoint(point, roomNeighbour));
  if (!outward) return false;
  if (!inBounds(state.width, state.height, outward.x, outward.y)) return false;
  if (state.tiles[indexOf(state.width, outward.x, outward.y)] !== 1) return false;

  for (const offset of perpendicularOffsets) {
    const x = door.x + offset.x;
    const y = door.y + offset.y;
    if (!inBounds(state.width, state.height, x, y)) return false;
    if (state.tiles[indexOf(state.width, x, y)] !== 0) return false;
  }

  return true;
}

/** Cuenta bloques 2×2 de suelo fuera de salas (ensanchamientos no deseados). */
export function countWideFloor(state: DungeonState): number {
  const roomCells = roomsOfCells(state);
  let count = 0;
  for (let y = 0; y < state.height - 1; y += 1) {
    for (let x = 0; x < state.width - 1; x += 1) {
      const indices = [
        indexOf(state.width, x, y),
        indexOf(state.width, x + 1, y),
        indexOf(state.width, x, y + 1),
        indexOf(state.width, x + 1, y + 1),
      ];
      const allFloor = indices.every((index) => state.tiles[index] === 1);
      const anyRoom = indices.some((index) => roomCells[index] === 1);
      if (allFloor && !anyRoom) count += 1;
    }
  }
  return count;
}

/** Longitud del tramo recto más largo en una ruta. */
export function longestStraight(path: Point[]): number {
  const points = dedupePath(path);
  if (points.length < 2) return 0;
  let longest = 1;
  let current = 1;
  for (let index = 2; index < points.length; index += 1) {
    const previousDirection = {
      x: Math.sign(points[index - 1].x - points[index - 2].x),
      y: Math.sign(points[index - 1].y - points[index - 2].y),
    };
    const direction = {
      x: Math.sign(points[index].x - points[index - 1].x),
      y: Math.sign(points[index].y - points[index - 1].y),
    };
    if (previousDirection.x === direction.x && previousDirection.y === direction.y) {
      current += 1;
    } else {
      longest = Math.max(longest, current);
      current = 1;
    }
  }
  return Math.max(longest, current);
}

export function computeMetrics(state: DungeonState): DungeonMetric[] {
  const areas = state.rooms.map(roomArea);
  const connectivity = connectivityPercentage(state);
  const time = state.generationMs;
  const warnings = state.warnings.length > 0 ? state.warnings.join(' ') : 'Sin ajustes';

  return [
    { label: 'Salas', value: state.rooms.length },
    { label: 'Área mín.', value: areas.length ? Math.min(...areas) : 0 },
    { label: 'Área mediana', value: median(areas) },
    { label: 'Área máx.', value: areas.length ? Math.max(...areas) : 0 },
    { label: 'Suelo', value: `${floorPercentage(state).toFixed(1)} %` },
    { label: 'Pasillos', value: corridorTiles(state), hint: 'tiles fuera de sala' },
    { label: 'Esquinas', value: countFloorCorners(state) },
    { label: 'Callejones', value: countDeadEnds(state) },
    { label: 'Bucles', value: state.loops },
    { label: 'Huecos', value: state.doors.length },
    { label: 'Conectividad', value: `${connectivity.toFixed(0)} %` },
    { label: 'Distancia', value: state.spawns.distance, hint: 'jugador → enemigo' },
    { label: 'Tiempo', value: time === undefined ? '—' : `${time.toFixed(1)} ms` },
    { label: 'Huella', value: fingerprint(state) },
    { label: 'Ajuste', value: warnings },
  ];
}

// ---------------------------------------------------------------------------
// Entrada principal
// ---------------------------------------------------------------------------

function connectedRoomIds(context: GenerationContext): Set<number> {
  if (context.rooms.length === 0) return new Set<number>();
  const parent = context.rooms.map((_, index) => index);
  for (const connection of context.connections) {
    union(parent, connection.from, connection.to);
  }
  const root = findRoot(parent, 0);
  const ids = new Set<number>();
  for (const room of context.rooms) {
    if (findRoot(parent, room.id) === root) ids.add(room.id);
  }
  return ids;
}

export function createDungeon(
  variant: VariantId,
  seed: number,
  options: DungeonOptions = {},
): DungeonState {
  const resolved = resolveOptions(options);
  const warnings = [...resolved.warnings];
  const rng = mulberry32((seed ^ hashString(variant)) >>> 0);

  let rooms: Room[] = [];
  let bspRoot: BspNode | null = null;
  let useBsp = variant === 'bsp';

  if (variant === 'bsp') {
    const placed = placeBspRooms(rng, resolved);
    rooms = placed.rooms;
    bspRoot = placed.root;
    warnings.push(...placed.warnings);
  } else {
    const placed = placeRandomRooms(rng, resolved);
    rooms = placed.rooms;
    warnings.push(...placed.warnings);
  }

  addFallbackRooms(rooms, resolved, warnings);

  let context: GenerationContext | null = null;
  let loopsAdded = false;

  // Si una sala queda atrapada entre otras y no admite un pasillo válido, se
  // descarta y se reconstruye el mapa con las salas restantes. Es una
  // normalización visible, no un fallo silencioso.
  for (let build = 0; build < 3; build += 1) {
    const candidate = createGenerationContext(rooms, resolved, warnings);
    if (useBsp && bspRoot) {
      connectBspTree(candidate, bspRoot);
    } else {
      connectPrim(candidate);
    }
    ensureConnected(candidate);

    const connected = connectedRoomIds(candidate);
    const unconnected = candidate.rooms.filter((room) => !connected.has(room.id));
    context = candidate;

    if (unconnected.length === 0) {
      addLoops(candidate, resolved.loopRatio);
      loopsAdded = true;
      break;
    }

    warnings.push(
      `Se descartaron ${unconnected.length} sala(s) sin pasillo válido: ${unconnected
        .map((room) => room.id)
        .join(', ')}.`,
    );

    const removed = new Set(unconnected.map((room) => room.id));
    const remaining = rooms.filter((room) => !removed.has(room.id));
    if (remaining.length === 0) break;

    const remap = new Map<number, number>();
    rooms = remaining.map((room, index) => {
      remap.set(room.id, index);
      return { ...room, id: index };
    });

    // Las hojas BSP apuntan a ids antiguos; tras una poda usamos Prim.
    useBsp = false;
    bspRoot = null;
  }

  if (context && !loopsAdded) {
    addLoops(context, resolved.loopRatio);
  }

  if (context && variant === 'hybrid') {
    growMaze(context, rng);
  }

  const doors = buildDoors(context!);
  const playerRoom =
    rooms.find((room) => doors.some((door) => door.roomId === room.id)) ?? rooms[0];
  const baseState: DungeonState = {
    variant,
    seed,
    width: resolved.width,
    height: resolved.height,
    tiles: context!.tiles,
    rooms,
    doors,
    corridors: context!.connections,
    spawns: {
      player: playerRoom ? roomCenter(playerRoom) : { x: 1, y: 1 },
      enemy: { x: 1, y: 1 },
      distance: 0,
    },
    warnings,
    loops: context!.connections.filter((connection) => connection.kind === 'loop').length,
  };

  const connectivity = connectivityPercentage(baseState);
  if (connectivity < 99.999) {
    warnings.push(`Conectividad ${connectivity.toFixed(1)} %: hay suelo inalcanzable desde el jugador.`);
  }

  const spawns = placeSpawns(baseState);
  baseState.spawns = spawns;

  if (spawns.distance < 12 && rooms.length > 1) {
    warnings.push(`La distancia jugador→enemigo es ${spawns.distance} (<12) en esta semilla.`);
  }

  return baseState;
}
