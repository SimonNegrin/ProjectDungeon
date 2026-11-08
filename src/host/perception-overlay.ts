import { alarmRadius, visionRadius } from '../game/perception';
import type { GameState } from '../game/types';
import { TILE_SIZE, type Viewport } from './geometry';

export type PerceptionRadiusKind = 'vision' | 'alarm';

/** Radio de depuración en tiles y centro del enemigo que lo proyecta. */
export interface PerceptionRadius {
  readonly unitId: string;
  readonly kind: PerceptionRadiusKind;
  readonly radius: number;
  readonly x: number;
  readonly y: number;
}

/**
 * Radios que muestra el overlay de debug. Con `enabled = false` no devuelve
 * ninguno: en juego normal no hay radios ni líneas de visión permanentes.
 * Función pura, verificable sin DOM.
 */
export function perceptionRadii(
  state: GameState,
  enabled: boolean,
): PerceptionRadius[] {
  if (!enabled) return [];

  const radii: PerceptionRadius[] = [];
  for (const enemy of state.enemies) {
    if (enemy.hp <= 0) continue;
    const vision = visionRadius(enemy);
    if (vision > 0) {
      radii.push({
        unitId: enemy.id,
        kind: 'vision',
        radius: vision,
        x: enemy.x,
        y: enemy.y,
      });
    }
    const alarm = alarmRadius(enemy);
    if (alarm > 0) {
      radii.push({
        unitId: enemy.id,
        kind: 'alarm',
        radius: alarm,
        x: enemy.x,
        y: enemy.y,
      });
    }
  }
  return radii;
}

export interface PerceptionOverlayView {
  update(
    state: GameState,
    camera: { readonly x: number; readonly y: number },
    viewport: Viewport,
    visible: boolean,
  ): void;
}

/**
 * Overlay DOM de radios de visión y alarma. Solo se rellena cuando el debug
 * `F1` está abierto; el contenedor y sus círculos quedan ocultos y vacíos en
 * juego normal.
 */
export function createPerceptionOverlayView(
  root: ParentNode,
): PerceptionOverlayView {
  const container = root.querySelector<HTMLElement>(
    '[data-testid="perception-overlay"]',
  );
  if (!container) {
    throw new Error('Falta el contenedor [data-testid="perception-overlay"].');
  }

  return {
    update(state, camera, viewport, visible): void {
      if (!visible) {
        container.hidden = true;
        container.replaceChildren();
        return;
      }

      const radii = perceptionRadii(state, true);
      const elements = radii.map((radius) => {
        const element = document.createElement('span');
        element.className = 'perception-radius';
        element.dataset.testid = 'debug-perception-radius';
        element.dataset.unitId = radius.unitId;
        element.dataset.kind = radius.kind;
        element.dataset.radius = String(radius.radius);
        element.style.left = `${
          (((radius.x + 0.5) * TILE_SIZE - camera.x) / viewport.width) * 100
        }%`;
        element.style.top = `${
          (((radius.y + 0.5) * TILE_SIZE - camera.y) / viewport.height) * 100
        }%`;
        element.style.width = `${
          ((radius.radius * 2 * TILE_SIZE) / viewport.width) * 100
        }%`;
        element.style.height = `${
          ((radius.radius * 2 * TILE_SIZE) / viewport.height) * 100
        }%`;
        return element;
      });

      container.hidden = false;
      container.replaceChildren(...elements);
    },
  };
}
