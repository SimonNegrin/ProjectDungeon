import { planCursorTarget, type CursorTargetKind } from '../game/path';
import type { GameState, Grid, Position, Unit } from '../game/types';
import {
  TILE_SIZE,
  visibleTileRange,
  type PixelPosition,
  type TileRange,
  type Viewport,
} from './geometry';

/**
 * Estado de presentación del cursor derivado del plan de `planCursorTarget`.
 * No es estado del motor: vive solo en el host y se expone en el snapshot.
 */
export type CursorState = 'player' | 'reachable' | 'too-far' | 'invalid' | 'enemy';

export interface CursorStatus {
  readonly x: number;
  readonly y: number;
  readonly visible: boolean;
  readonly kind: CursorTargetKind;
  readonly state: CursorState;
  /** Pasos posteriores al jugador; vacío si el cursor no es visible. */
  readonly path: readonly Position[];
  readonly cost: number;
  readonly withinMp: boolean;
  readonly attackTile?: Position;
  /** Primeros pasos que caben en el MP actual y se dibujan en tono fuerte. */
  readonly strongSteps: number;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/** Posición inicial del cursor: el tile de la unidad activa. */
export function cursorAtPlayer(player: Pick<Unit, 'x' | 'y'> | undefined): Position {
  return player ? { x: player.x, y: player.y } : { x: 0, y: 0 };
}

/** Rango de tiles que intersecta el viewport actual de la cámara. */
export function cursorRange(
  camera: PixelPosition,
  viewport: Viewport,
  grid: Pick<Grid, 'width' | 'height'>,
  tileSize: number = TILE_SIZE,
): TileRange {
  return visibleTileRange(camera, viewport, grid, tileSize);
}

/**
 * Mueve el cursor un tile si el destino sigue dentro del viewport. No hay wrap:
 * en el borde la posición no cambia. No conoce muros ni unidades.
 */
export function moveCursor(
  cursor: Position,
  dx: number,
  dy: number,
  range: TileRange,
): Position {
  const next = { x: cursor.x + dx, y: cursor.y + dy };
  if (
    next.x < range.minX ||
    next.x > range.maxX ||
    next.y < range.minY ||
    next.y > range.maxY
  ) {
    return cursor;
  }
  return next;
}

/** Recoloca el cursor al tile visible más cercano tras mover la cámara. */
export function clampCursorToRange(cursor: Position, range: TileRange): Position {
  const clamped = {
    x: clamp(cursor.x, range.minX, range.maxX),
    y: clamp(cursor.y, range.minY, range.maxY),
  };
  return clamped.x === cursor.x && clamped.y === cursor.y ? cursor : clamped;
}

/** Clamp del cursor contra el viewport de la cámara. */
export function clampCursorToViewport(
  cursor: Position,
  camera: PixelPosition,
  viewport: Viewport,
  grid: Pick<Grid, 'width' | 'height'>,
  tileSize: number = TILE_SIZE,
): Position {
  return clampCursorToRange(cursor, cursorRange(camera, viewport, grid, tileSize));
}

/** El cursor solo es visible e interactivo en la fase del jugador en juego. */
export function isCursorInteractive(state: GameState): boolean {
  return state.status === 'playing' && state.phase === 'player';
}

function presentationState(
  kind: CursorTargetKind,
  withinMp: boolean,
): CursorState {
  if (kind === 'player') return 'player';
  if (kind === 'enemy') return 'enemy';
  if (kind === 'blocked') return 'invalid';
  return withinMp ? 'reachable' : 'too-far';
}

/**
 * Deriva el estado visual, el camino y los pasos fuertes del cursor a partir de
 * `planCursorTarget`. El host no reclasifica ni calcula caminos por su cuenta.
 */
export function deriveCursorStatus(state: GameState, cursor: Position): CursorStatus {
  const player = state.players.find((unit) => unit.hp > 0);
  const visible = isCursorInteractive(state);

  if (!player) {
    return {
      x: cursor.x,
      y: cursor.y,
      visible: false,
      kind: 'blocked',
      state: 'invalid',
      path: [],
      cost: 0,
      withinMp: false,
      strongSteps: 0,
    };
  }

  const plan = planCursorTarget(state, player.id, cursor);
  const path = visible ? plan.path : [];

  return {
    x: cursor.x,
    y: cursor.y,
    visible,
    kind: plan.kind,
    state: presentationState(plan.kind, plan.withinMp),
    path,
    cost: plan.cost,
    withinMp: plan.withinMp,
    attackTile: plan.attackTile,
    strongSteps: visible ? Math.min(plan.cost, Math.max(0, player.mp)) : 0,
  };
}
