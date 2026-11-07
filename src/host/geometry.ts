export const TILE_SIZE = 32;

export interface Viewport {
  readonly width: number;
  readonly height: number;
}

export interface PixelPosition {
  readonly x: number;
  readonly y: number;
}

export interface WorldSize {
  readonly width: number;
  readonly height: number;
}

export interface TileRange {
  readonly minX: number;
  readonly minY: number;
  readonly maxX: number;
  readonly maxY: number;
}

/** Esquina superior izquierda de una casilla en píxeles de mundo. */
export function tileToPixel(tileX: number, tileY: number, tileSize: number = TILE_SIZE): PixelPosition {
  return { x: tileX * tileSize, y: tileY * tileSize };
}

/** Tamaño en píxeles de una rejilla completa. */
export function gridPixelSize(
  grid: { readonly width: number; readonly height: number },
  tileSize: number = TILE_SIZE,
): WorldSize {
  return { width: grid.width * tileSize, height: grid.height * tileSize };
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/**
 * Rango inclusivo de casillas que intersectan el viewport de la cámara.
 * Nunca devuelve índices fuera de la rejilla.
 */
export function visibleTileRange(
  camera: PixelPosition,
  viewport: Viewport,
  grid: { readonly width: number; readonly height: number },
  tileSize: number = TILE_SIZE,
): TileRange {
  const minX = clamp(Math.floor(camera.x / tileSize), 0, grid.width - 1);
  const minY = clamp(Math.floor(camera.y / tileSize), 0, grid.height - 1);
  const maxX = clamp(Math.ceil((camera.x + viewport.width) / tileSize) - 1, 0, grid.width - 1);
  const maxY = clamp(Math.ceil((camera.y + viewport.height) / tileSize) - 1, 0, grid.height - 1);

  return { minX, minY, maxX, maxY };
}
