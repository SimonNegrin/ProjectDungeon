/** Utilidades puras de rejilla, cajas y conectividad. Sin DOM ni estado global. */

import type { Point, Tile } from './types';

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

/** Comprueba que ninguna caja invade el borde del mapa. */
export function boxInside(box: Box, width: number, height: number, margin = 1): boolean {
  return (
    box.x >= margin &&
    box.y >= margin &&
    box.x + box.width <= width - margin &&
    box.y + box.height <= height - margin
  );
}

export function pointsToMask(cells: readonly Point[]): Set<string> {
  return new Set(cells.map((cell) => pointKey(cell.x, cell.y)));
}

export function sortPoints(cells: Iterable<Point>): Point[] {
  return [...cells].sort((a, b) => (a.y === b.y ? a.x - b.x : a.y - b.y));
}

export function maskToPoints(mask: ReadonlySet<string>): Point[] {
  const points: Point[] = [];
  for (const key of mask) {
    const [x, y] = key.split(',').map(Number);
    points.push({ x, y });
  }
  return sortPoints(points);
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

/** Anchura máxima de una caja admisible para un mapa con margen. */
export function maxBoxWidth(mapWidth: number, margin = 1): number {
  return mapWidth - margin * 2;
}

export function maxBoxHeight(mapHeight: number, margin = 1): number {
  return mapHeight - margin * 2;
}

/** BFS ortogonal sobre una máscara de suelo. Devuelve cuántas celdas alcanza. */
export function reachableCount(start: Point, floor: (x: number, y: number) => boolean): number {
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

/** Suelo alcanzable desde `start` sobre el array `tiles`. */
export function floodFloor(
  tiles: readonly Tile[],
  width: number,
  height: number,
  start: Point,
): boolean[] {
  const seen = new Array<boolean>(width * height).fill(false);
  if (!inBounds(start.x, start.y, width, height)) return seen;
  if (tiles[start.y * width + start.x] !== 1) return seen;
  const queue: Point[] = [start];
  seen[start.y * width + start.x] = true;
  for (let index = 0; index < queue.length; index += 1) {
    const current = queue[index];
    for (const next of neighbors4(current.x, current.y)) {
      if (!inBounds(next.x, next.y, width, height)) continue;
      const tileIndex = next.y * width + next.x;
      if (seen[tileIndex] || tiles[tileIndex] !== 1) continue;
      seen[tileIndex] = true;
      queue.push(next);
    }
  }
  return seen;
}

/**
 * Regla de muro por borde: `wallSide1` solo si hay suelo justo al sur; en el
 * resto se usa `wallTop`. Devuelve `null` para una celda de suelo.
 */
export function wallTileKind(
  tiles: readonly Tile[],
  width: number,
  height: number,
  x: number,
  y: number,
): 'wallTop' | 'wallSide1' | null {
  if (tiles[y * width + x] === 1) return null;
  const south = y + 1 < height ? tiles[(y + 1) * width + x] : 0;
  return south === 1 ? 'wallSide1' : 'wallTop';
}

/**
 * Detecta una celda de suelo que solo podría alcanzarse en diagonal: no tiene
 * ningún vecino ortogonal de suelo, pero sí al menos uno diagonal. La
 * conectividad ortogonal global se valida aparte.
 */
export function hasDiagonalLeak(
  tiles: readonly Tile[],
  width: number,
  height: number,
): boolean {
  const diagonals = [
    { dx: 1, dy: 1 },
    { dx: 1, dy: -1 },
    { dx: -1, dy: 1 },
    { dx: -1, dy: -1 },
  ];
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (tiles[y * width + x] !== 1) continue;
      let orthogonal = false;
      for (const next of neighbors4(x, y)) {
        if (!inBounds(next.x, next.y, width, height)) continue;
        if (tiles[next.y * width + next.x] === 1) orthogonal = true;
      }
      if (orthogonal) continue;
      for (const { dx, dy } of diagonals) {
        const nx = x + dx;
        const ny = y + dy;
        if (!inBounds(nx, ny, width, height)) continue;
        if (tiles[ny * width + nx] === 1) return true;
      }
    }
  }
  return false;
}
