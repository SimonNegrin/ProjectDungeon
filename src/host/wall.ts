import type { Tile } from '../game/types';

export type WallTile = 'wallTop' | 'wallSide1';

export interface WallGrid {
  readonly width: number;
  readonly height: number;
  readonly tiles: readonly Tile[];
}

/**
 * Elige el tile de muro con la regla por borde de `REQ-003` R-008:
 * la cara vertical (`wallSide1`) solo aparece si el tile del sur es suelo
 * transitable; en cualquier otro caso se usa la tapa horizontal (`wallTop`).
 *
 * Es una función pura: no conoce Canvas, DOM ni el host, y nunca devuelve
 * `wallSide2`, que queda reservado.
 */
export function wallTileFor(grid: WallGrid, x: number, y: number): WallTile {
  const southY = y + 1;
  if (southY < 0 || southY >= grid.height) return 'wallTop';
  if (x < 0 || x >= grid.width) return 'wallTop';
  if (grid.tiles[southY * grid.width + x] === 'floor') return 'wallSide1';
  return 'wallTop';
}
