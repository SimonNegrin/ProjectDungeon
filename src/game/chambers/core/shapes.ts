/**
 * Formas de sala del núcleo de chambers (REQ-011 R-002/R-003/R-007).
 *
 * Las salas normales se empaquetan en una cuadrícula compacta de 2-6 huecos
 * con paredes de 1-2 tiles; cada sala parte de una caja y pierde muescas de
 * 1-2 tiles de fondo, manteniendo la máscara conexa y sin islas. La caverna
 * excepcional es una sala grande con dos anexas (3 salas en total).
 */

import type { Point } from './grid';
import {
  boxArea,
  boxContains,
  boxInside,
  maskIsConnected,
  neighbors4,
  pointKey,
  pointsToMask,
  sortPoints,
  type Box,
} from './grid';
import type { ResolvedChamberOptions } from './options';
import type { Rng } from './rng';

export type RoomSpec = 'large' | 'medium' | 'small';

export interface RawRoom {
  readonly box: Box;
  readonly cells: readonly Point[];
  readonly spec: RoomSpec;
}

export interface RoomLayout {
  readonly rooms: readonly RawRoom[];
  readonly cavern: RawRoom | null;
}

interface Slot {
  readonly column: number;
  readonly row: number;
}

const MAX_COLUMNS = 3;
const MAX_ROWS = 2;

function distribute(
  total: number,
  count: number,
  min: number,
  max: number,
  rng: Rng,
): number[] {
  if (count <= 0) return [];
  const safeMin = Math.max(1, Math.min(min, Math.floor(total / count)));
  const safeMax = Math.max(safeMin, Math.min(max, total - safeMin * (count - 1)));
  const values = new Array<number>(count).fill(safeMin);
  let remaining = Math.max(0, Math.min(total, safeMax * count) - safeMin * count);

  let guard = 0;
  while (remaining > 0 && guard < 10_000) {
    guard += 1;
    const candidates: number[] = [];
    for (let index = 0; index < count; index += 1) {
      if (values[index] < safeMax) candidates.push(index);
    }
    if (candidates.length === 0) break;
    values[rng.pick(candidates)] += 1;
    remaining -= 1;
  }

  return rng.shuffle(values);
}

function raiseTo(values: number[], target: number, floor: number): boolean {
  const receiver = values.indexOf(Math.max(...values));
  if (values[receiver] >= target) return true;
  const donor = values.findIndex((value, index) => index !== receiver && value > floor);
  if (donor < 0) return false;
  values[donor] -= 1;
  values[receiver] += 1;
  return values[receiver] >= target;
}

function connectedSlots(columns: number, rows: number, size: number): Slot[][] {
  const total = columns * rows;
  const result: Slot[][] = [];
  for (let mask = 0; mask < 1 << total; mask += 1) {
    let count = 0;
    for (let bit = 0; bit < total; bit += 1) {
      if (mask & (1 << bit)) count += 1;
    }
    if (count !== size) continue;

    const slots: Slot[] = [];
    for (let bit = 0; bit < total; bit += 1) {
      if (mask & (1 << bit)) {
        slots.push({ column: bit % columns, row: Math.floor(bit / columns) });
      }
    }
    if (slots.length === 0) continue;

    const keys = new Set(slots.map((slot) => pointKey(slot.column, slot.row)));
    const queue: Slot[] = [slots[0]];
    const seen = new Set<string>([pointKey(slots[0].column, slots[0].row)]);
    for (let index = 0; index < queue.length; index += 1) {
      const current = queue[index];
      for (const next of [
        { column: current.column + 1, row: current.row },
        { column: current.column - 1, row: current.row },
        { column: current.column, row: current.row + 1 },
        { column: current.column, row: current.row - 1 },
      ]) {
        if (next.column < 0 || next.row < 0) continue;
        if (next.column >= columns || next.row >= rows) continue;
        const key = pointKey(next.column, next.row);
        if (!keys.has(key) || seen.has(key)) continue;
        seen.add(key);
        queue.push(next);
      }
    }
    if (seen.size === slots.length) result.push(slots);
  }
  return result;
}

function fullBoxCells(box: Box): Point[] {
  const cells: Point[] = [];
  for (let y = box.y; y < box.y + box.height; y += 1) {
    for (let x = box.x; x < box.x + box.width; x += 1) cells.push({ x, y });
  }
  return cells;
}

function removalCandidates(box: Box): Box[] {
  const candidates: Box[] = [];
  const maxDepthX = Math.min(2, box.width - 1);
  const maxDepthY = Math.min(2, box.height - 1);

  for (let depthX = 1; depthX <= maxDepthX; depthX += 1) {
    for (let depthY = 1; depthY <= maxDepthY; depthY += 1) {
      candidates.push({ x: box.x, y: box.y, width: depthX, height: depthY });
      candidates.push({
        x: box.x + box.width - depthX,
        y: box.y,
        width: depthX,
        height: depthY,
      });
      candidates.push({
        x: box.x,
        y: box.y + box.height - depthY,
        width: depthX,
        height: depthY,
      });
      candidates.push({
        x: box.x + box.width - depthX,
        y: box.y + box.height - depthY,
        width: depthX,
        height: depthY,
      });
    }
  }

  for (let depth = 1; depth <= Math.min(2, box.width - 1); depth += 1) {
    for (let length = 1; length <= Math.min(3, box.height - 1); length += 1) {
      for (let offset = 0; offset <= box.height - length; offset += 1) {
        candidates.push({
          x: box.x + (offset % 2 === 0 ? 0 : box.width - depth),
          y: box.y + offset,
          width: depth,
          height: length,
        });
      }
    }
  }

  for (let depth = 1; depth <= Math.min(2, box.height - 1); depth += 1) {
    for (let length = 1; length <= Math.min(3, box.width - 1); length += 1) {
      for (let offset = 0; offset <= box.width - length; offset += 1) {
        candidates.push({
          x: box.x + offset,
          y: box.y + (offset % 2 === 0 ? 0 : box.height - depth),
          width: length,
          height: depth,
        });
      }
    }
  }

  return candidates;
}

function countNotches(cells: readonly Point[], box: Box): number {
  const mask = pointsToMask(cells);
  let notches = 0;
  for (let y = box.y; y < box.y + box.height; y += 1) {
    for (let x = box.x; x < box.x + box.width; x += 1) {
      if (mask.has(pointKey(x, y))) continue;
      if (neighbors4(x, y).some((next) => mask.has(pointKey(next.x, next.y)))) {
        notches += 1;
      }
    }
  }
  return notches;
}

/** Profundidad máxima de una muesca medida desde el borde de la caja. */
export function maxNotchDepth(cells: readonly Point[], box: Box): number {
  const mask = pointsToMask(cells);
  let deepest = 0;
  for (let y = box.y; y < box.y + box.height; y += 1) {
    for (let x = box.x; x < box.x + box.width; x += 1) {
      if (mask.has(pointKey(x, y))) continue;
      if (!neighbors4(x, y).some((next) => mask.has(pointKey(next.x, next.y)))) continue;
      const depth =
        Math.min(
          x - box.x,
          box.x + box.width - 1 - x,
          y - box.y,
          box.y + box.height - 1 - y,
        ) + 1;
      deepest = Math.max(deepest, depth);
    }
  }
  return deepest;
}

/** Número de muescas (celdas de caja ausentes que tocan la máscara). */
export function roomNotchCount(room: Pick<RawRoom, 'cells' | 'box'>): number {
  return countNotches(room.cells, room.box);
}

function removeRect(
  mask: Map<string, Point>,
  rect: Box,
): boolean {
  let removed = 0;
  for (let y = rect.y; y < rect.y + rect.height; y += 1) {
    for (let x = rect.x; x < rect.x + rect.width; x += 1) {
      if (mask.delete(pointKey(x, y))) removed += 1;
    }
  }
  return removed > 0;
}

/**
 * Talla muescas de 1-2 tiles de fondo sobre una caja. Nunca desconecta la
 * máscara ni baja la relación área/caja de 0,55; para salas pequeñas apunta a
 * área ≤19 (R-002).
 */
export function carveRoomMask(
  box: Box,
  rng: Rng,
  spec: RoomSpec,
  minNotches = 1,
): Point[] {
  const full = fullBoxCells(box);
  if (box.width <= 3 && box.height <= 3) return full;

  const mask = new Map<string, Point>(full.map((cell) => [pointKey(cell.x, cell.y), cell]));
  const boxSize = boxArea(box);
  const minArea = spec === 'large' ? 28 : spec === 'medium' ? 16 : 9;
  const maxRatio = spec === 'small' ? 0.74 : 0.86;
  const minRatio = 0.55;
  const candidates = removalCandidates(box);

  let guard = 0;
  while (guard < 80) {
    guard += 1;
    const cells = [...mask.values()];
    const ratio = cells.length / boxSize;
    if (ratio <= maxRatio && countNotches(cells, box) >= minNotches) break;

    const shuffled = rng.shuffle(candidates);
    let applied = false;
    for (const rect of shuffled) {
      const next = new Map(mask);
      if (!removeRect(next, rect)) continue;
      const nextCells = [...next.values()];
      if (nextCells.length < minArea) continue;
      if (nextCells.length / boxSize < minRatio) continue;
      if (!maskIsConnected(nextCells)) continue;
      mask.clear();
      for (const [key, point] of next) mask.set(key, point);
      applied = true;
      break;
    }
    if (!applied) break;
  }

  return sortPoints([...mask.values()]);
}

function minBoxSideFor(spec: RoomSpec, options: ResolvedChamberOptions): number {
  if (spec === 'large') return Math.max(7, Math.min(options.roomMin, 7));
  if (spec === 'medium') return Math.max(6, Math.min(options.roomMin, 6));
  return Math.max(3, Math.min(options.roomMin, 5));
}

function buildRoomBox(
  slot: Box,
  spec: RoomSpec,
  options: ResolvedChamberOptions,
  rows: number,
  row: number,
  rng: Rng,
): { box: Box; spec: RoomSpec } {
  const maxSide = Math.min(8, options.roomMax);
  let actual: RoomSpec = spec;
  let width = 0;
  let height = 0;

  if (spec === 'large') {
    const side = Math.min(slot.width, slot.height, maxSide);
    if (side >= 7) {
      width = side;
      height = side;
    } else {
      actual = 'medium';
    }
  }

  if (actual === 'medium') {
    width = Math.min(slot.width, maxSide, Math.max(6, Math.min(options.roomMin, 6)));
    height = Math.min(slot.height, maxSide, Math.max(6, Math.min(options.roomMin, 6)));
    if (width < 6 || height < 6) {
      actual = 'small';
    }
  }

  if (actual === 'small') {
    const minSide = minBoxSideFor('small', options);
    width = Math.min(slot.width, maxSide, 5);
    height = Math.min(slot.height, maxSide, 5);
    width = Math.max(Math.min(minSide, slot.width), Math.min(width, 5));
    height = Math.max(Math.min(minSide, slot.height), Math.min(height, 5));
    width = Math.min(width, slot.width);
    height = Math.min(height, slot.height);
  }

  width = Math.max(1, width);
  height = Math.max(1, height);

  const x =
    slot.width <= width
      ? slot.x
      : slot.x + (rng.chance(0.5) ? 0 : slot.width - width);
  let y: number;
  if (rows <= 1) {
    y = slot.y + (slot.height <= height ? 0 : rng.int(slot.height - height + 1));
  } else {
    y = row === 0 ? slot.y + slot.height - height : slot.y;
  }

  return { box: { x, y, width, height }, spec: actual };
}

function assembleRooms(
  slots: readonly Slot[],
  widths: readonly number[],
  heights: readonly number[],
  columnX: readonly number[],
  rowY: readonly number[],
  options: ResolvedChamberOptions,
  rng: Rng,
): RawRoom[] {
  const slotsBox = slots.map((slot) => ({
    slot,
    box: {
      x: columnX[slot.column],
      y: rowY[slot.row],
      width: widths[slot.column],
      height: heights[slot.row],
    },
  }));

  const largeCapable = slotsBox.filter(
    (entry) => entry.box.width >= 7 && entry.box.height >= 7 && options.roomMax >= 7,
  );
  const largeEntry = largeCapable.length > 0 ? rng.pick(largeCapable) : null;
  const smallPool = slotsBox.filter((entry) => entry !== largeEntry);
  const smallest = smallPool.sort(
    (a, b) =>
      Math.min(a.box.width, a.box.height) - Math.min(b.box.width, b.box.height) ||
      a.slot.row - b.slot.row ||
      a.slot.column - b.slot.column,
  )[0];
  const smallEntry = smallest ?? largeEntry;

  return slotsBox.map((entry) => {
    let spec: RoomSpec;
    if (entry === largeEntry) {
      spec = 'large';
    } else if (entry === smallEntry) {
      spec = 'small';
    } else if (entry.box.width >= 6 && entry.box.height >= 6 && options.roomMax >= 6) {
      spec = 'medium';
    } else {
      spec = 'small';
    }

    const built = buildRoomBox(entry.box, spec, options, heights.length, entry.slot.row, rng);
    const cells = carveRoomMask(built.box, rng, built.spec, 1);
    return { box: built.box, cells, spec: built.spec };
  });
}

/** Empaqueta las salas normales en una cuadrícula compacta. */
export function buildNormalLayout(
  rng: Rng,
  options: ResolvedChamberOptions,
  warnings: string[],
  wantsWide: boolean,
): RoomLayout {
  const interiorWidth = options.mapWidth - 2;
  const interiorHeight = options.mapHeight - 2;
  const gap = options.wallThickness;
  const minSide = Math.max(3, options.roomMin);

  const columns = Math.min(
    MAX_COLUMNS,
    Math.max(1, Math.floor((interiorWidth + gap) / (minSide + gap))),
  );
  const rows = Math.min(
    MAX_ROWS,
    Math.max(1, Math.floor((interiorHeight + gap) / (minSide + gap))),
  );
  const slotCount = columns * rows;

  let roomCount = options.roomCount;
  if (roomCount > slotCount) {
    roomCount = Math.max(3, slotCount);
    warnings.push(
      `El mapa no admite ${options.roomCount} salas con estas opciones; se usan ${roomCount}.`,
    );
  }

  const columnBudget = interiorWidth - gap * (columns - 1);
  const columnTotal = Math.min(columnBudget, options.roomMax * columns);
  const columnMin = Math.max(3, Math.min(minSide, Math.floor(columnBudget / columns)));
  const widths = distribute(columnTotal, columns, columnMin, options.roomMax, rng);
  if (
    options.roomMax >= 7 &&
    options.roomMin <= 5 &&
    Math.max(...widths) < 7
  ) {
    const guard = Math.min(columns * 4, 12);
    for (let attempt = 0; attempt < guard && Math.max(...widths) < 7; attempt += 1) {
      raiseTo(widths, 7, 3);
    }
  }

  const rowGap = wantsWide ? Math.max(gap, 2) : gap;
  const rowBudget = interiorHeight - rowGap * (rows - 1);
  const rowTotal = Math.min(rowBudget, options.roomMax * rows);
  const rowMin = Math.max(3, Math.min(minSide, Math.floor(rowBudget / rows)));
  const heights = distribute(rowTotal, rows, rowMin, options.roomMax, rng);
  if (options.roomMax >= 7 && Math.max(...heights) < 7) {
    for (let attempt = 0; attempt < 12 && Math.max(...heights) < 7; attempt += 1) {
      raiseTo(heights, 7, 3);
    }
  }
  if (wantsWide && rows === 2 && rowBudget >= 14) {
    const guard = 16;
    for (let attempt = 0; attempt < guard; attempt += 1) {
      const smallIndex = heights.findIndex((value) => value < 7);
      if (smallIndex < 0) break;
      const donor = heights.findIndex((value, index) => index !== smallIndex && value > 7);
      if (donor < 0) break;
      heights[donor] -= 1;
      heights[smallIndex] += 1;
    }
  }

  const clusterWidth = widths.reduce((sum, value) => sum + value, 0) + gap * (columns - 1);
  const clusterHeight = heights.reduce((sum, value) => sum + value, 0) + rowGap * (rows - 1);
  const originX =
    clusterWidth >= interiorWidth
      ? 1
      : 1 + rng.int(interiorWidth - clusterWidth + 1);
  const originY =
    clusterHeight >= interiorHeight
      ? 1
      : 1 + rng.int(interiorHeight - clusterHeight + 1);

  const columnX: number[] = [];
  let cursorX = originX;
  for (const width of widths) {
    columnX.push(cursorX);
    cursorX += width + gap;
  }
  const rowY: number[] = [];
  let cursorY = originY;
  for (const height of heights) {
    rowY.push(cursorY);
    cursorY += height + rowGap;
  }

  const all = connectedSlots(columns, rows, roomCount);
  const largeSlots = all.filter((slots) =>
    slots.some(
      (slot) => widths[slot.column] >= 7 && heights[slot.row] >= 7 && options.roomMax >= 7,
    ),
  );
  const pool = largeSlots.length > 0 ? largeSlots : all;
  let chosen: readonly Slot[];
  if (pool.length > 0) {
    chosen = rng.pick(pool);
  } else {
    const fallback: Slot[] = [];
    for (let row = 0; row < rows && fallback.length < roomCount; row += 1) {
      for (let column = 0; column < columns && fallback.length < roomCount; column += 1) {
        fallback.push({ column, row });
      }
    }
    chosen = fallback;
  }

  const rooms = assembleRooms(
    chosen,
    widths,
    heights,
    columnX,
    rowY,
    options,
    rng,
  );
  if (
    rooms.some(
      (room) => room.box.width < options.roomMin || room.box.height < options.roomMin,
    )
  ) {
    warnings.push(
      `Alguna sala no alcanzó el tamaño mínimo ${options.roomMin} por el empaquetado; se conservó el mapa válido.`,
    );
  }
  return { rooms, cavern: null };
}

function tryCavernLayout(
  rng: Rng,
  options: ResolvedChamberOptions,
  corner: { right: boolean; bottom: boolean },
): RoomLayout | null {
  const interiorWidth = options.mapWidth - 2;
  const interiorHeight = options.mapHeight - 2;
  const gap = options.wallThickness;
  const maxX = options.mapWidth - 2;
  const maxY = options.mapHeight - 2;

  const maxCavernWidth = Math.min(11, interiorWidth - gap - 3);
  const maxCavernHeight = Math.min(11, interiorHeight - gap - 3);
  if (maxCavernWidth < 7 || maxCavernHeight < 7) return null;

  const targetWidth = Math.max(7, Math.min(maxCavernWidth, Math.round(interiorWidth * 0.62)));
  const targetHeight = Math.max(7, Math.min(maxCavernHeight, Math.round(interiorHeight * 0.62)));

  for (let shrink = 0; shrink <= Math.max(0, targetWidth - 7) + Math.max(0, targetHeight - 7); shrink += 1) {
    const width = Math.max(7, targetWidth - Math.floor(shrink / 2));
    const height = Math.max(7, targetHeight - Math.ceil(shrink / 2));
    const x = corner.right ? maxX - width + 1 : 1;
    const y = corner.bottom ? maxY - height + 1 : 1;

    const spaceRight = maxX - (x + width - 1) - gap;
    const spaceLeft = x - 1 - gap;
    const spaceBottom = maxY - (y + height - 1) - gap;
    const spaceTop = y - 1 - gap;

    const sides: Array<'right' | 'left' | 'bottom' | 'top'> = [];
    if (spaceRight >= 3) sides.push('right');
    if (spaceLeft >= 3) sides.push('left');
    if (spaceBottom >= 3) sides.push('bottom');
    if (spaceTop >= 3) sides.push('top');
    if (sides.length < 2) continue;

    const ordered = rng.shuffle(sides).slice(0, 2);
    const annexSize = (space: number): number => Math.min(4, space);
    const cavernBox: Box = { x, y, width, height };
    const boxes: Array<{ side: 'right' | 'left' | 'bottom' | 'top'; box: Box }> = [];

    for (const side of ordered) {
      if (side === 'right' || side === 'left') {
        const size = annexSize(side === 'right' ? spaceRight : spaceLeft);
        const annexWidth = size;
        const annexHeight = Math.min(size, height);
        const annexX = side === 'right' ? x + width + gap : x - gap - annexWidth;
        const annexY = y + rng.int(Math.max(1, height - annexHeight + 1));
        boxes.push({
          side,
          box: { x: annexX, y: annexY, width: annexWidth, height: annexHeight },
        });
      } else {
        const size = annexSize(side === 'bottom' ? spaceBottom : spaceTop);
        const annexWidth = Math.min(size, width);
        const annexHeight = size;
        const annexY = side === 'bottom' ? y + height + gap : y - gap - annexHeight;
        const annexX = x + rng.int(Math.max(1, width - annexWidth + 1));
        boxes.push({
          side,
          box: { x: annexX, y: annexY, width: annexWidth, height: annexHeight },
        });
      }
    }

    const unique = new Set(boxes.map((entry) => pointKey(entry.box.x, entry.box.y)));
    if (unique.size < 2) continue;
    if (!boxes.every((entry) => boxInside(entry.box, options.mapWidth, options.mapHeight, 1))) {
      continue;
    }

    const cavernCells = carveRoomMask(cavernBox, rng, 'large', 4);
    const cavernArea = cavernCells.length;
    const annexes: RawRoom[] = [];
    for (const entry of boxes) {
      const cells = carveRoomMask(entry.box, rng, 'small', 1);
      annexes.push({ box: entry.box, cells, spec: 'small' });
    }
    const totalArea = cavernArea + annexes.reduce((sum, room) => sum + room.cells.length, 0);
    if (cavernArea / totalArea < 0.55) continue;

    const cavern: RawRoom = { box: cavernBox, cells: cavernCells, spec: 'large' };
    return { rooms: [cavern, ...annexes], cavern };
  }

  return null;
}

/** Construye la caverna de 3 salas (caverna + 2 anexas) o `null` si no cabe. */
export function buildCavernLayout(
  rng: Rng,
  options: ResolvedChamberOptions,
  warnings: string[],
): RoomLayout | null {
  const corners = rng.shuffle([
    { right: false, bottom: false },
    { right: true, bottom: false },
    { right: false, bottom: true },
    { right: true, bottom: true },
  ]);
  for (const corner of corners) {
    const layout = tryCavernLayout(rng, options, corner);
    if (layout) return layout;
  }
  warnings.push(
    'La caverna no cupo con dos anexas en este mapa; se generó un mapa normal.',
  );
  return null;
}

/** Celdas de caja que pertenecen a la máscara. */
export function maskCellCount(room: Pick<RawRoom, 'cells'>): number {
  return room.cells.length;
}

/** Comprueba que la caja contiene todas las celdas de la máscara. */
export function maskInsideBox(room: Pick<RawRoom, 'box' | 'cells'>): boolean {
  return room.cells.every((cell) => boxContains(room.box, cell.x, cell.y));
}
