import type { GameState } from '../game/types';
import { FEEDBACK_CONFIG } from './feedback-config';
import type { BannerFeedback, FrameEffects, UnitMarkFeedback } from './feedback-events';
import { unitMarkText } from './feedback-events';
import { TILE_SIZE, type Viewport } from './geometry';

function requireElement<T extends HTMLElement>(root: ParentNode, testId: string): T {
  const element = root.querySelector<T>(`[data-testid="${testId}"]`);
  if (!element) {
    throw new Error(`Falta el elemento con data-testid="${testId}"`);
  }
  return element;
}

function viewportPercent(world: number, viewportSize: number): number {
  return (world / viewportSize) * 100;
}

export interface BannerView {
  update(banner: BannerFeedback | null): void;
  clear(): void;
}

/** Banner textual único: el más reciente sustituye al anterior. */
export function createBannerView(frame: ParentNode): BannerView {
  const element = requireElement(frame, 'feedback-banner');
  let currentText: string | null = null;
  let currentKind: string | null = null;

  const hide = (): void => {
    element.hidden = true;
    element.textContent = '';
    delete element.dataset.bannerKind;
    currentText = null;
    currentKind = null;
  };

  return {
    update(banner): void {
      if (!banner) {
        if (currentText !== null) hide();
        return;
      }
      if (banner.text === currentText && banner.kind === currentKind) return;
      currentText = banner.text;
      currentKind = banner.kind;
      element.textContent = banner.text;
      element.dataset.bannerKind = banner.kind;
      element.hidden = false;
    },
    clear(): void {
      hide();
    },
  };
}

export interface TimedUnitMark extends UnitMarkFeedback {
  remainingMs: number;
}

export interface UnitMarkerView {
  update(
    marks: readonly TimedUnitMark[],
    state: GameState,
    camera: { readonly x: number; readonly y: number },
    viewport: Viewport,
  ): void;
  clear(): void;
}

function unitVisible(
  x: number,
  y: number,
  camera: { readonly x: number; readonly y: number },
  viewport: Viewport,
): boolean {
  const left = x * TILE_SIZE - camera.x;
  const top = y * TILE_SIZE - camera.y;
  return left + TILE_SIZE > 0 && left < viewport.width && top + TILE_SIZE > 0 && top < viewport.height;
}

/**
 * Marcas `!!↑`, `zzz` y `...` sobre los enemigos visibles. Nodos estables por
 * unidad: la marca nueva reutiliza el nodo y no reinicia el render completo.
 */
export function createUnitMarkerView(frame: ParentNode): UnitMarkerView {
  const container = requireElement(frame, 'unit-marks');
  const nodes = new Map<string, HTMLElement>();

  const remove = (unitId: string): void => {
    nodes.get(unitId)?.remove();
    nodes.delete(unitId);
  };

  const hide = (element: HTMLElement): void => {
    element.hidden = true;
    element.textContent = '';
    delete element.dataset.markKind;
  };

  return {
    update(marks, state, camera, viewport): void {
      const activeIds = new Set(marks.map((mark) => mark.unitId));
      for (const unitId of [...nodes.keys()]) {
        if (!activeIds.has(unitId)) remove(unitId);
      }

      for (const mark of marks) {
        const enemy = state.enemies.find((unit) => unit.id === mark.unitId);
        let element = nodes.get(mark.unitId);
        if (!enemy || enemy.hp <= 0 || !unitVisible(enemy.x, enemy.y, camera, viewport)) {
          if (element) hide(element);
          continue;
        }

        if (!element) {
          element = document.createElement('span');
          element.className = 'unit-mark';
          element.dataset.testid = 'unit-mark';
          element.dataset.unitId = mark.unitId;
          element.setAttribute('aria-hidden', 'true');
          nodes.set(mark.unitId, element);
          container.append(element);
        }

        element.hidden = false;
        element.dataset.markKind = mark.kind;
        element.textContent = unitMarkText(mark);
        element.style.left = `${
          viewportPercent((enemy.x + 0.5) * TILE_SIZE - camera.x, viewport.width)
        }%`;
        element.style.top = `${viewportPercent(enemy.y * TILE_SIZE - camera.y, viewport.height)}%`;
      }
    },
    clear(): void {
      for (const unitId of [...nodes.keys()]) remove(unitId);
      container.replaceChildren();
    },
  };
}

export interface FrameEffectView {
  update(effects: FrameEffects): void;
  clear(): void;
}

/** Tinte y destellos de borde; nunca cubre la rejilla ni el cursor. */
export function createFrameEffectView(frame: ParentNode): FrameEffectView {
  const element = requireElement(frame, 'frame-effects');

  const apply = (
    effect: 'none' | 'enemy-phase' | 'alarm' | 'game-ended',
    opacity: number,
  ): void => {
    element.dataset.effect = effect;
    element.style.opacity = String(Math.max(0, Math.min(1, opacity)));
  };

  return {
    update(effects): void {
      if (effects.gameEndedFlash > 0) {
        element.style.borderColor = '#ffffff';
        apply('game-ended', effects.gameEndedFlash);
        return;
      }
      if (effects.alarmBorder) {
        element.style.borderColor = '#e8b86d';
        apply('alarm', 1);
        return;
      }
      if (effects.enemyPhaseTint > 0) {
        element.style.borderColor = '#7fb3d5';
        apply('enemy-phase', effects.enemyPhaseTint);
        return;
      }
      apply('none', 0);
    },
    clear(): void {
      apply('none', 0);
    },
  };
}

export interface ScreenFadeView {
  play(): void;
  clear(): void;
  isFading(): boolean;
}

export interface ScreenFadeViewOptions {
  /** En movimiento reducido el reinicio no funde: se cierra en el mismo evento. */
  readonly reducedMotion?: boolean;
}

/**
 * Fundido a negro del reinicio. La duración sale de `FEEDBACK_CONFIG` y la
 * animación CSS se retira con `animationend`, sin `setTimeout`. Con movimiento
 * reducido el fundido se omite y el estado final queda visible al instante.
 */
export function createScreenFadeView(
  frame: ParentNode,
  options: ScreenFadeViewOptions = {},
): ScreenFadeView {
  const element = requireElement(frame, 'screen-fade');
  const reducedMotion = options.reducedMotion === true;

  element.style.animationDuration = `${FEEDBACK_CONFIG.durations.gameRestartedMs}ms`;
  element.addEventListener('animationend', () => {
    element.hidden = true;
    element.classList.remove('is-fading');
  });

  const clear = (): void => {
    element.hidden = true;
    element.classList.remove('is-fading');
  };

  return {
    play(): void {
      if (reducedMotion) {
        clear();
        return;
      }
      element.hidden = false;
      element.classList.remove('is-fading');
      // Reinicia la animación CSS al repetir el reinicio.
      void element.offsetWidth;
      element.classList.add('is-fading');
    },
    clear,
    isFading(): boolean {
      return !element.hidden && element.classList.contains('is-fading');
    },
  };
}
