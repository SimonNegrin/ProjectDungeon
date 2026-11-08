import type { Camera } from './camera';
import type { CursorStatus } from './cursor';
import { TILE_SIZE } from './geometry';
import { MAP_VIEWPORT } from './layout';

export interface CursorView {
  update(status: CursorStatus, camera: Camera): void;
}

function requireElement<T extends HTMLElement>(root: ParentNode, testId: string): T {
  const element = root.querySelector<T>(`[data-testid="${testId}"]`);
  if (!element) {
    throw new Error(`Falta el elemento con data-testid="${testId}"`);
  }
  return element;
}

/**
 * Convierte una coordenada de mundo al porcentaje del sub-viewport 13×13. El
 * contenedor `.map-overlay` ya recorta los puntos que caen fuera.
 */
function viewportPercent(world: number, viewportSize: number): number {
  return (world / viewportSize) * 100;
}

function positionTile(element: HTMLElement, x: number, y: number, camera: Camera): void {
  element.style.left = `${viewportPercent(x * TILE_SIZE - camera.x, MAP_VIEWPORT.width)}%`;
  element.style.top = `${viewportPercent(y * TILE_SIZE - camera.y, MAP_VIEWPORT.height)}%`;
  element.style.width = `${viewportPercent(TILE_SIZE, MAP_VIEWPORT.width)}%`;
  element.style.height = `${viewportPercent(TILE_SIZE, MAP_VIEWPORT.height)}%`;
}

/**
 * Vista DOM del cursor y de los puntos del camino. Vive en `.map-overlay`, que
 * recorta al viewport 13×13 y no intercepta clics.
 */
export function createCursorView(frame: ParentNode): CursorView {
  const cursor = requireElement(frame, 'cursor');
  const path = requireElement(frame, 'cursor-path');

  return {
    update(status: CursorStatus, camera: Camera): void {
      cursor.hidden = !status.visible;
      path.hidden = !status.visible;
      cursor.dataset.cursorState = status.state;
      cursor.dataset.cursorX = String(status.x);
      cursor.dataset.cursorY = String(status.y);

      if (!status.visible) {
        path.replaceChildren();
        return;
      }

      positionTile(cursor, status.x, status.y, camera);

      const points: HTMLElement[] = status.path.map((point, index) => {
        const dot = document.createElement('span');
        dot.className =
          index < status.strongSteps ? 'cursor-path-point is-strong' : 'cursor-path-point is-faded';
        dot.dataset.testid = 'cursor-path-point';
        dot.dataset.step = String(index + 1);
        dot.style.left = `${viewportPercent(
          (point.x + 0.5) * TILE_SIZE - camera.x,
          MAP_VIEWPORT.width,
        )}%`;
        dot.style.top = `${viewportPercent(
          (point.y + 0.5) * TILE_SIZE - camera.y,
          MAP_VIEWPORT.height,
        )}%`;
        return dot;
      });

      path.replaceChildren(...points);
    },
  };
}
