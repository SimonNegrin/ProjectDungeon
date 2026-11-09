/**
 * Utilidades puras de rejilla, cajas y conectividad del núcleo de chambers.
 *
 * Sin DOM, sin relojes y sin estado global mutable. Las coordenadas son tiles
 * del mapa; el borde del mapa no forma parte del interior transitable.
 */

import type { Position } from '../../types';

export type Point = Position;

export interface Box {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

export function pointKey(x: number, y: number): string {
  return `${x},${y}`;
}

export function samePoint(a: Point, b: Point): boolean {
  return a.x === b.x && a.y === b.y;
}

export function boxContains(box: Box, x: number, y: number): boolean {
  return x >= box.x && y >= box.y && x < box.x + box.width && y < box.y + box.height;
}

export function boxArea(box: Box): number {
  return box.width * box.height;
}

/** Distancia Manhattan entre cajas; 0 si se tocan o solapan. */
export function boxGap(a: Box, b: Box): number {
  const gapX = Math.max(0, Math.max(a.x, b.x) - Math.min(a.x + a.width, b.x + b.width));
  const gapY = Math.max(0, Math.max(a.y, b.y) - Math.min(a.y + a.height, b.y + b.height));
  return gapX + gapY;
}

export function boxesOverlap(a: Box, b: Box): boolean {
  return (
    a.x < b.x + b.width &&
    b.x < a.x + a.width &&
    a.y < b.y + b.height &&
    b.y < a.y + a.height
  );
}

/** Comprueba que la caja deja al menos `margin` tiles hasta cada borde. */
export function boxInside(box: Box, width: number, height: number, margin = 1): boolean {
  return (
    box.x >= margin &&
    box.y >= margin &&
    box.x + box.width <= width - margin &&
    box.y + box.height <= height - margin
  );
}

export function neighbors4(x: number, y: number): Point[] {
  return [
    { x: x + 1, y },
    { x: x - 1, y },
    { x, y: y + 1 },
    { x, y: y - 1 },
  ];
}

export function inBounds(x: number, y: number, width: number, height: number): boolean {
  return x >= 0 && y >= 0 && x < width && y < height;
}

export function sortPoints(cells: Iterable<Point>): Point[] {
  return [...cells].sort((a, b) => (a.y === b.y ? a.x - b.x : a.y - b.y));
}

export function pointsToMask(cells: readonly Point[]): Set<string> {
  return new Set(cells.map((cell) => pointKey(cell.x, cell.y)));
}

export function maskToPoints(mask: ReadonlySet<string>): Point[] {
  const points: Point[] = [];
  for (const key of mask) {
    const [x, y] = key.split(',').map(Number);
    points.push({ x, y });
  }
  return sortPoints(points);
}

export function chebyshev(a: Point, b: Point): number {
  return Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y));
}

export function manhattan(a: Point, b: Point): number {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}

/** BFS ortogonal sobre una máscara; devuelve cuántas celdas alcanza. */
export function reachableCount(
  start: Point,
  floor: (x: number, y: number) => boolean,
): number {
  if (!floor(start.x, start.y)) return 0;
  const seen = new Set<string>([pointKey(start.x, start.y)]);
  const queue: Point[] = [start];
  for (let index = 0; index < queue.length; index += 1) {
    const current = queue[index];
    for (const next of neighbors4(current.x, current.y)) {
      const key = pointKey(next.x, next.y);
      if (seen.has(key) || !floor(next.x, next.y)) continue;
      seen.add(key);
      queue.push(next);
    }
  }
  return seen.size;
}

/** Una máscara no vacía es conexa si un BFS alcanza todas sus celdas. */
export function maskIsConnected(cells: readonly Point[]): boolean {
  if (cells.length === 0) return false;
  const mask = pointsToMask(cells);
  const start = cells[0];
  return reachableCount(start, (x, y) => mask.has(pointKey(x, y))) === cells.length;
}

export class UnionFind {
  private readonly parent: number[];

  constructor(size: number) {
    this.parent = Array.from({ length: size }, (_, index) => index);
  }

  find(value: number): number {
    let current = value;
    while (this.parent[current] !== current) {
      this.parent[current] = this.parent[this.parent[current]];
      current = this.parent[current];
    }
    return current;
  }

  union(a: number, b: number): boolean {
    const rootA = this.find(a);
    const rootB = this.find(b);
    if (rootA === rootB) return false;
    this.parent[rootB] = rootA;
    return true;
  }
}

/** Longitud en pasos de una ruta ortogonal. */
export function pathLength(path: readonly Point[]): number {
  return Math.max(0, path.length - 1);
}
