import type { Position } from '../game/types';
import type { Camera } from './camera';
import { TILE_SIZE, type Viewport } from './geometry';
import type { MotionVisibilityPolicy } from './motion';

/**
 * Política de visibilidad del host para la presentación. La construye quien
 * conoce cámara, viewport y jugador; `motion.ts` se limita a recibirla. Un tile
 * se considera visible si su rectángulo intersecta el viewport, igual que las
 * capas DOM superpuestas.
 */
export function createViewportVisibility(
  camera: Camera,
  viewport: Viewport,
  playerIds: ReadonlySet<string>,
): MotionVisibilityPolicy {
  return {
    isVisible(tile: Position): boolean {
      const left = tile.x * TILE_SIZE - camera.x;
      const top = tile.y * TILE_SIZE - camera.y;
      return (
        left + TILE_SIZE > 0 &&
        left < viewport.width &&
        top + TILE_SIZE > 0 &&
        top < viewport.height
      );
    },
    isPlayer(unitId: string): boolean {
      return playerIds.has(unitId);
    },
  };
}
