import type { GameState } from '../game/types';
import { FEEDBACK_CONFIG } from './feedback-config';
import { TILE_SIZE, type Viewport } from './geometry';
import { activeSpotMarkers } from './spot';

export interface SpotMarkerView {
  update(
    state: GameState,
    camera: { readonly x: number; readonly y: number },
    viewport: Viewport,
    spotted: ReadonlySet<string>,
  ): void;
  clear(): void;
}

/**
 * Vista DOM del "!" sobre el enemigo que ha iniciado la alerta. Vive dentro del
 * recorte del mapa; no revela el estado de los receptores de la onda ni de los
 * enemigos dormidos.
 *
 * Los nodos son estables por unidad (T-007): se crean una vez, se recolocan en
 * cada frame y no reinician su entrada. La animación de tres frames se dispara
 * al crear el nodo, que es el instante en que su cue empieza; el marcador
 * persiste mientras `spotted` lo mantenga.
 */
export function createSpotMarkerView(root: ParentNode): SpotMarkerView {
  const container = root.querySelector<HTMLElement>('[data-testid="spot-markers"]');
  if (!container) {
    throw new Error('Falta el contenedor [data-testid="spot-markers"].');
  }

  const nodes = new Map<string, HTMLElement>();

  const remove = (unitId: string): void => {
    nodes.get(unitId)?.remove();
    nodes.delete(unitId);
  };

  return {
    update(state, camera, viewport, spotted): void {
      const markers = activeSpotMarkers(state, spotted);
      const activeIds = new Set(markers.map((marker) => marker.unitId));

      for (const unitId of [...nodes.keys()]) {
        if (!activeIds.has(unitId)) remove(unitId);
      }

      for (const marker of markers) {
        let element = nodes.get(marker.unitId);
        if (!element) {
          element = document.createElement('span');
          element.className = 'spot-marker';
          element.dataset.testid = 'spot-marker';
          element.dataset.unitId = marker.unitId;
          element.textContent = '!';
          element.setAttribute('aria-hidden', 'true');
          element.style.setProperty(
            '--spot-entry-ms',
            `${FEEDBACK_CONFIG.durations.spottedMs}ms`,
          );
          nodes.set(marker.unitId, element);
          container.append(element);
        }

        element.style.left = `${
          (((marker.x + 0.5) * TILE_SIZE - camera.x) / viewport.width) * 100
        }%`;
        element.style.top = `${
          ((marker.y * TILE_SIZE - camera.y) / viewport.height) * 100
        }%`;
      }
    },
    clear(): void {
      for (const unitId of [...nodes.keys()]) remove(unitId);
      container.replaceChildren();
    },
  };
}
