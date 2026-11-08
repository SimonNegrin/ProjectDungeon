import type { GameState } from '../game/types';
import { TILE_SIZE, type Viewport } from './geometry';
import { activeSpotMarkers } from './spot';

export interface SpotMarkerView {
  update(
    state: GameState,
    camera: { readonly x: number; readonly y: number },
    viewport: Viewport,
    spotted: ReadonlySet<string>,
  ): void;
}

/**
 * Vista DOM del "!" sobre el enemigo que ha iniciado la alerta. Vive dentro del
 * recorte del mapa; no revela el estado de los receptores de la onda ni de los
 * enemigos dormidos.
 */
export function createSpotMarkerView(root: ParentNode): SpotMarkerView {
  const container = root.querySelector<HTMLElement>('[data-testid="spot-markers"]');
  if (!container) {
    throw new Error('Falta el contenedor [data-testid="spot-markers"].');
  }

  return {
    update(state, camera, viewport, spotted): void {
      const markers = activeSpotMarkers(state, spotted);
      const elements: HTMLElement[] = [];

      for (const marker of markers) {
        const element = document.createElement('span');
        element.className = 'spot-marker';
        element.dataset.testid = 'spot-marker';
        element.dataset.unitId = marker.unitId;
        element.textContent = '!';
        element.setAttribute('aria-hidden', 'true');
        element.style.left = `${
          (((marker.x + 0.5) * TILE_SIZE - camera.x) / viewport.width) * 100
        }%`;
        element.style.top = `${
          ((marker.y * TILE_SIZE - camera.y) / viewport.height) * 100
        }%`;
        elements.push(element);
      }

      container.replaceChildren(...elements);
    },
  };
}
