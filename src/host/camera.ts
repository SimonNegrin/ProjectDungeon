import { TILE_SIZE, type PixelPosition, type Viewport, type WorldSize } from './geometry';

export interface Camera {
  readonly x: number;
  readonly y: number;
}

export interface CameraBounds {
  readonly maxX: number;
  readonly maxY: number;
}

/**
 * Desplazamiento máximo de la cámara: si el mundo es menor que el viewport no
 * hay recorrido y la cámara queda fija en el origen.
 */
export function cameraBounds(world: WorldSize, viewport: Viewport): CameraBounds {
  return {
    maxX: Math.max(0, world.width - viewport.width),
    maxY: Math.max(0, world.height - viewport.height),
  };
}

/** Limita una posición de cámara a los bordes del mundo. */
export function clampCamera(position: PixelPosition, world: WorldSize, viewport: Viewport): Camera {
  const bounds = cameraBounds(world, viewport);
  return {
    x: Math.min(Math.max(position.x, 0), bounds.maxX),
    y: Math.min(Math.max(position.y, 0), bounds.maxY),
  };
}

/**
 * Cámara que centra una casilla en el viewport y después se limita al mundo.
 * Redondea a enteros para que los tiles no caigan en posiciones fraccionarias.
 */
export function centerCameraOnTile(
  tile: PixelPosition,
  viewport: Viewport,
  world: WorldSize,
  tileSize: number = TILE_SIZE,
): Camera {
  const targetX = (tile.x + 0.5) * tileSize;
  const targetY = (tile.y + 0.5) * tileSize;
  return clampCamera(
    {
      x: Math.round(targetX - viewport.width / 2),
      y: Math.round(targetY - viewport.height / 2),
    },
    world,
    viewport,
  );
}
