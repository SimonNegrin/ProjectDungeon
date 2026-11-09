/**
 * Enlaces y pasillos del núcleo de chambers (REQ-011 R-005/R-006).
 *
 * Un enlace guarda los tiles de muro tallados entre dos salas; su longitud es
 * el número de pasos de la ruta (0 = puerta directa, 1-3 = pasillo corto). El
 * pasillo ancho se elige entre enlaces de longitud ≥3 y se talla con un carril
 * lateral determinista.
 */

import type { Point } from './grid';
import {
  inBounds,
  maskToPoints,
  pointKey,
  UnionFind,
} from './grid';
import type { ResolvedChamberOptions } from './options';
import type { Rng } from './rng';
import type { RawRoom } from './shapes';

export interface ChamberLink {
  readonly roomA: number;
  readonly roomB: number;
  /** Tiles de muro tallados; no incluye el suelo de las salas. */
  readonly cells: readonly Point[];
  /** Pasos de la ruta: `cells.length - 1`. */
  readonly length: number;
}

export interface LinkSelection {
  readonly tree: readonly ChamberLink[];
  readonly extras: readonly ChamberLink[];
  readonly wide: ChamberLink | null;
}

function lPath(a: Point, b: Point, horizontalFirst: boolean): Point[] | null {
  if (a.x === b.x) {
    const cells: Point[] = [];
    const dy = Math.sign(b.y - a.y);
    for (let y = a.y + dy; y !== b.y; y += dy) cells.push({ x: a.x, y });
    return cells;
  }
  if (a.y === b.y) {
    const cells: Point[] = [];
    const dx = Math.sign(b.x - a.x);
    for (let x = a.x + dx; x !== b.x; x += dx) cells.push({ x, y: a.y });
    return cells;
  }

  const cells: Point[] = [];
  const dx = Math.sign(b.x - a.x);
  const dy = Math.sign(b.y - a.y);
  if (horizontalFirst) {
    for (let x = a.x + dx; x !== b.x; x += dx) cells.push({ x, y: a.y });
    cells.push({ x: b.x, y: a.y });
    for (let y = a.y + dy; y !== b.y; y += dy) cells.push({ x: b.x, y });
  } else {
    for (let y = a.y + dy; y !== b.y; y += dy) cells.push({ x: a.x, y });
    cells.push({ x: a.x, y: b.y });
    for (let x = a.x + dx; x !== b.x; x += dx) cells.push({ x, y: b.y });
  }
  return cells;
}

/** Mejor enlace ortogonal entre dos salas dentro del rango de pasillo. */
export function findLink(
  roomA: number,
  roomB: number,
  rooms: readonly RawRoom[],
  roomMask: ReadonlySet<string>,
  options: ResolvedChamberOptions,
): ChamberLink | null {
  const a = rooms[roomA];
  const b = rooms[roomB];
  if (!a || !b) return null;

  const maxDistance = options.corridorMaxLength + 2;
  let best: { link: ChamberLink; score: number } | null = null;

  for (const cellA of a.cells) {
    for (const cellB of b.cells) {
      const distance = Math.abs(cellA.x - cellB.x) + Math.abs(cellA.y - cellB.y);
      if (distance < 2 || distance > maxDistance) continue;

      for (const path of [lPath(cellA, cellB, true), lPath(cellA, cellB, false)]) {
        if (!path || path.length === 0) continue;
        if (!path.every((cell) => inBounds(cell.x, cell.y, options.mapWidth, options.mapHeight))) {
          continue;
        }
        if (
          path.some(
            (cell) =>
              cell.x <= 0 ||
              cell.y <= 0 ||
              cell.x >= options.mapWidth - 1 ||
              cell.y >= options.mapHeight - 1,
          )
        ) {
          continue;
        }
        if (path.some((cell) => roomMask.has(pointKey(cell.x, cell.y)))) continue;

        const length = path.length - 1;
        if (length > options.corridorMaxLength) continue;

        const score = distance * 10 + path.length;
        if (!best || score < best.score) {
          best = { link: { roomA, roomB, cells: path, length }, score };
        }
      }
    }
  }

  return best?.link ?? null;
}

/** Todos los enlaces candidatos, uno por pareja de salas. */
export function findLinks(
  rooms: readonly RawRoom[],
  options: ResolvedChamberOptions,
): ChamberLink[] {
  const roomMask = new Set<string>();
  for (const room of rooms) {
    for (const cell of room.cells) roomMask.add(pointKey(cell.x, cell.y));
  }

  const links: ChamberLink[] = [];
  for (let first = 0; first < rooms.length; first += 1) {
    for (let second = first + 1; second < rooms.length; second += 1) {
      const link = findLink(first, second, rooms, roomMask, options);
      if (link) links.push(link);
    }
  }
  return links;
}

function linkKey(link: ChamberLink): string {
  return `${link.roomA}:${link.roomB}:${link.cells
    .map((cell) => pointKey(cell.x, cell.y))
    .join('|')}`;
}

function sameRooms(a: ChamberLink, b: ChamberLink): boolean {
  return (
    (a.roomA === b.roomA && a.roomB === b.roomB) ||
    (a.roomA === b.roomB && a.roomB === b.roomA)
  );
}

function compareLinks(a: ChamberLink, b: ChamberLink): number {
  return (
    a.length - b.length ||
    a.roomA - b.roomA ||
    a.roomB - b.roomB ||
    (a.cells[0]?.y ?? 0) - (b.cells[0]?.y ?? 0) ||
    (a.cells[0]?.x ?? 0) - (b.cells[0]?.x ?? 0)
  );
}

/**
 * BFS de un camino de exactamente 4 tiles de muro (longitud 3) entre dos
 * salas. Se usa solo si el pasillo ancho se pidió y no hay enlace normal de
 * longitud ≥3.
 */
export function findWideDetour(
  rooms: readonly RawRoom[],
  roomMask: ReadonlySet<string>,
  options: ResolvedChamberOptions,
): ChamberLink | null {
  const wallCell = (cell: Point): boolean =>
    cell.x > 0 &&
    cell.y > 0 &&
    cell.x < options.mapWidth - 1 &&
    cell.y < options.mapHeight - 1 &&
    !roomMask.has(pointKey(cell.x, cell.y));

  for (let first = 0; first < rooms.length; first += 1) {
    for (let second = first + 1; second < rooms.length; second += 1) {
      const starts = new Map<string, Point>();
      const goals = new Set<string>();
      for (const cell of rooms[first].cells) {
        for (const next of [
          { x: cell.x + 1, y: cell.y },
          { x: cell.x - 1, y: cell.y },
          { x: cell.x, y: cell.y + 1 },
          { x: cell.x, y: cell.y - 1 },
        ]) {
          if (wallCell(next)) starts.set(pointKey(next.x, next.y), next);
        }
      }
      for (const cell of rooms[second].cells) {
        for (const next of [
          { x: cell.x + 1, y: cell.y },
          { x: cell.x - 1, y: cell.y },
          { x: cell.x, y: cell.y + 1 },
          { x: cell.x, y: cell.y - 1 },
        ]) {
          if (wallCell(next)) goals.add(pointKey(next.x, next.y));
        }
      }
      if (starts.size === 0 || goals.size === 0) continue;

      const queue: Point[][] = [...starts.values()].map((cell) => [cell]);
      for (let cursor = 0; cursor < queue.length && cursor < 40_000; cursor += 1) {
        const path = queue[cursor];
        if (path.length === 4) {
          const last = path[path.length - 1];
          if (goals.has(pointKey(last.x, last.y))) {
            return { roomA: first, roomB: second, cells: path, length: path.length - 1 };
          }
          continue;
        }
        const last = path[path.length - 1];
        for (const next of [
          { x: last.x + 1, y: last.y },
          { x: last.x - 1, y: last.y },
          { x: last.x, y: last.y + 1 },
          { x: last.x, y: last.y - 1 },
        ]) {
          if (!wallCell(next)) continue;
          if (path.some((cell) => cell.x === next.x && cell.y === next.y)) continue;
          queue.push([...path, next]);
        }
      }
    }
  }

  return null;
}

function addExtra(
  extras: ChamberLink[],
  used: Set<string>,
  link: ChamberLink,
): boolean {
  if (used.has(linkKey(link))) return false;
  if (extras.some((extra) => sameRooms(extra, link))) return false;
  if (extras.length < 3) {
    extras.push(link);
    used.add(linkKey(link));
    return true;
  }
  return false;
}

/** Selecciona árbol, bucles y como máximo un pasillo ancho. */
export function selectLinks(
  candidates: readonly ChamberLink[],
  roomCount: number,
  rng: Rng,
  wantsWide: boolean,
  warnings: string[],
): LinkSelection {
  const sorted = [...candidates].sort(compareLinks);
  const union = new UnionFind(roomCount);
  const tree: ChamberLink[] = [];
  const used = new Set<string>();

  for (const link of sorted) {
    if (used.has(linkKey(link))) continue;
    if (union.union(link.roomA, link.roomB)) {
      tree.push(link);
      used.add(linkKey(link));
    }
  }

  if (tree.length < roomCount - 1) {
    warnings.push('El grafo de salas no quedó conexo con los enlaces disponibles.');
  }

  const available = sorted.filter((link) => !used.has(linkKey(link)));
  const loopBudget = roomCount <= 3 ? 0 : rng.int(4);
  const extras: ChamberLink[] = [];
  for (const link of available) {
    if (extras.length >= loopBudget) break;
    addExtra(extras, used, link);
  }

  let wide: ChamberLink | null = null;
  if (wantsWide && roomCount > 3) {
    const preferred = sorted.find((link) => link.length >= 3);
    if (preferred && used.has(linkKey(preferred))) {
      wide = preferred;
    } else if (preferred && addExtra(extras, used, preferred)) {
      wide = preferred;
    }
    if (!wide) {
      warnings.push('No hubo un enlace de longitud 3 para abrir el pasillo ancho.');
    }
  }

  const hasDirect = [...tree, ...extras].some((link) => link.length === 0);
  if (!hasDirect) {
    const direct = sorted.find(
      (link) => link.length === 0 && !used.has(linkKey(link)),
    );
    if (direct) {
      if (!addExtra(extras, used, direct) && extras.length > 0) {
        const replaceIndex = extras.findIndex((extra) => extra !== wide);
        if (replaceIndex >= 0) {
          used.delete(linkKey(extras[replaceIndex]));
          extras.splice(replaceIndex, 1, direct);
          used.add(linkKey(direct));
        }
      }
    } else {
      warnings.push('No se encontró una puerta directa entre salas.');
    }
  }

  return { tree, extras, wide };
}

/** Añade un pasillo ancho detectado por BFS como bucle extra. */
export function withWideFallback(
  selection: LinkSelection,
  candidate: ChamberLink,
): LinkSelection {
  if (selection.wide) return selection;
  const extras = [...selection.extras];
  const used = new Set<string>([...selection.tree, ...selection.extras].map(linkKey));
  const added = addExtra(extras, used, candidate);
  if (!added) return selection;
  return { ...selection, extras, wide: candidate };
}

/** Talla el carril lateral de un pasillo ancho sin invadir salas ni el borde. */
export function widenLink(
  link: ChamberLink,
  options: ResolvedChamberOptions,
  roomMask: ReadonlySet<string>,
): Point[] {
  const set = new Set(link.cells.map((cell) => pointKey(cell.x, cell.y)));
  for (const cell of link.cells) {
    const horizontal =
      set.has(pointKey(cell.x - 1, cell.y)) || set.has(pointKey(cell.x + 1, cell.y));
    const vertical =
      set.has(pointKey(cell.x, cell.y - 1)) || set.has(pointKey(cell.x, cell.y + 1));
    const attempts =
      horizontal && vertical
        ? [
            { x: cell.x - 1, y: cell.y },
            { x: cell.x + 1, y: cell.y },
            { x: cell.x, y: cell.y - 1 },
            { x: cell.x, y: cell.y + 1 },
          ]
        : horizontal
          ? [
              { x: cell.x, y: cell.y - 1 },
              { x: cell.x, y: cell.y + 1 },
            ]
          : [
              { x: cell.x - 1, y: cell.y },
              { x: cell.x + 1, y: cell.y },
            ];
    for (const next of attempts) {
      if (next.x <= 0 || next.y <= 0) continue;
      if (next.x >= options.mapWidth - 1 || next.y >= options.mapHeight - 1) continue;
      const key = pointKey(next.x, next.y);
      if (roomMask.has(key)) continue;
      set.add(key);
    }
  }
  return maskToPoints(set);
}
