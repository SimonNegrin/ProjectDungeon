import type { GameState } from '../game/types';
import { centerCameraOnTile, type Camera } from './camera';
import type { Viewport, WorldSize } from './geometry';

/** Duración v1 del paneo de relevo (REQ-031 R-005/R-022). */
export const CAMERA_PAN_MS = 300;

export type CameraPanKind = 'none' | 'jump' | 'pan';

/** Turno previo al cambio; `null` en el arranque, que salta directo. */
export interface CameraTurn {
  readonly activePlayerId: string | null;
  readonly round: number;
}

export interface CameraTransition {
  readonly kind: CameraPanKind;
  readonly durationMs: number;
  readonly from: Camera;
  readonly to: Camera;
  /** Jugador que ocupa el destino; `null` si no hay jugadores. */
  readonly playerId: string | null;
}

export interface CameraTransitionInput {
  readonly previous: CameraTurn | null;
  readonly finalState: GameState;
  readonly camera: Camera;
  readonly viewport: Viewport;
  readonly world: WorldSize;
  readonly tileSize?: number;
  readonly reducedMotion?: boolean;
}

/** Activo final con respaldo en `players[0]`; `undefined` sin jugadores. */
function targetPlayer(state: GameState) {
  if (state.activePlayerId !== null) {
    const active = state.players.find(
      (player) => player.id === state.activePlayerId,
    );
    if (active) return active;
  }
  return state.players[0];
}

function sameCamera(a: Camera, b: Camera): boolean {
  return a.x === b.x && a.y === b.y;
}

/**
 * Decide cómo llega la cámara al jugador activo final. Es puro: no toca DOM ni
 * estado. El destino siempre es el centro del activo, limitado al mundo.
 *
 * - Sin cambio de activo ni de ronda: no hay transición (`none`).
 * - Arranque de ronda 1, movimiento reducido, un solo jugador o destino ya
 *   centrado: salto directo (`jump`).
 * - Relevo o vuelta de la fase enemiga con más de un jugador: paneo (`pan`).
 */
export function planCameraTransition(
  input: CameraTransitionInput,
): CameraTransition {
  const target = targetPlayer(input.finalState);
  if (!target) {
    return {
      kind: 'none',
      durationMs: 0,
      from: { ...input.camera },
      to: { ...input.camera },
      playerId: null,
    };
  }

  const to = centerCameraOnTile(
    target,
    input.viewport,
    input.world,
    input.tileSize,
  );
  const base = {
    from: { ...input.camera },
    to,
    playerId: target.id,
  } as const;

  const activeChanged =
    input.previous !== null &&
    input.previous.activePlayerId !== input.finalState.activePlayerId;
  const roundChanged =
    input.previous !== null && input.previous.round !== input.finalState.round;

  // Arranque (ronda 1): no hay turno previo y la cámara aparece directa.
  if (input.previous === null) {
    return { kind: 'jump', durationMs: 0, ...base };
  }
  if (!activeChanged && !roundChanged) {
    return { kind: 'none', durationMs: 0, ...base };
  }
  if (input.reducedMotion === true) {
    return { kind: 'jump', durationMs: 0, ...base };
  }
  if (sameCamera(input.camera, to)) {
    return { kind: 'jump', durationMs: 0, ...base };
  }

  const multiplePlayers = input.finalState.players.length > 1;
  if (
    multiplePlayers &&
    (activeChanged || (roundChanged && input.finalState.round > 1))
  ) {
    return { kind: 'pan', durationMs: CAMERA_PAN_MS, ...base };
  }

  return { kind: 'jump', durationMs: 0, ...base };
}

/** Interpolación lineal redondeada a píxel entero. */
export function interpolateCamera(
  from: Camera,
  to: Camera,
  progress: number,
): Camera {
  const clamped = Math.min(1, Math.max(0, progress));
  return {
    x: Math.round(from.x + (to.x - from.x) * clamped),
    y: Math.round(from.y + (to.y - from.y) * clamped),
  };
}

/** Cámara del paneo en `elapsedMs`; fuera de rango se fija a los extremos. */
export function cameraPanAt(
  transition: Pick<CameraTransition, 'from' | 'to' | 'durationMs'>,
  elapsedMs: number,
): Camera {
  if (transition.durationMs <= 0) return { ...transition.to };
  return interpolateCamera(
    transition.from,
    transition.to,
    elapsedMs / transition.durationMs,
  );
}
