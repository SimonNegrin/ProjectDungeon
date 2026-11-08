import { isFloorAt, isInside, isOccupied } from './grid';
import {
  MOVE_COST,
  type GameEvent,
  type GameState,
  type Position,
  type RejectionReason,
  type Unit,
} from './types';

export type DirectionValue = -1 | 0 | 1;

export interface Direction {
  readonly dx: DirectionValue;
  readonly dy: DirectionValue;
}

/**
 * Orden fijo de direcciones. La IA lo usa para desempatar de forma determinista:
 * primero las cardinales (norte, este, sur, oeste) y después las diagonales
 * (noreste, sureste, suroeste, noroeste).
 */
export const DIRECTIONS: readonly Direction[] = [
  { dx: 0, dy: -1 },
  { dx: 1, dy: 0 },
  { dx: 0, dy: 1 },
  { dx: -1, dy: 0 },
  { dx: 1, dy: -1 },
  { dx: 1, dy: 1 },
  { dx: -1, dy: 1 },
  { dx: -1, dy: -1 },
];

export type MoveValidation =
  | { readonly ok: true; readonly to: Position }
  | { readonly ok: false; readonly reason: RejectionReason };

/** Motivo por el que una casilla no se puede ocupar. */
export type CellBlockReason = 'out-of-bounds' | 'wall' | 'occupied' | 'blocked-object';

export interface BlockingOptions {
  /**
   * Hook opcional para futuros objetos que impidan ocupar una casilla. Se deja
   * fuera de `GameState` en este corte; si se pasa, la planificación y
   * `validateMove` comparten el mismo predicado.
   */
  readonly isBlockingObject?: (state: GameState, x: number, y: number) => boolean;
}

/**
 * Predicado único de bloqueo compartido por `validateMove` y la planificación
 * de camino. No muta el estado.
 */
export function cellBlockReason(
  state: GameState,
  x: number,
  y: number,
  options?: BlockingOptions,
): CellBlockReason | undefined {
  if (!isInside(state.grid, x, y)) return 'out-of-bounds';
  if (!isFloorAt(state.grid, x, y)) return 'wall';
  if (isOccupied(state, x, y)) return 'occupied';
  if (options?.isBlockingObject?.(state, x, y)) return 'blocked-object';
  return undefined;
}

function isFreeCell(
  state: GameState,
  x: number,
  y: number,
  options?: BlockingOptions,
): boolean {
  return cellBlockReason(state, x, y, options) === undefined;
}

export function isValidDirection(dx: number, dy: number): boolean {
  return (
    Number.isInteger(dx) &&
    Number.isInteger(dy) &&
    Math.abs(dx) <= 1 &&
    Math.abs(dy) <= 1 &&
    !(dx === 0 && dy === 0)
  );
}

/**
 * Valida una casilla de movimiento sin comprobar MP, fase ni acción.
 * Las diagonales exigen libres las dos casillas ortogonales adyacentes.
 */
export function validateMove(
  state: GameState,
  unit: Unit,
  dx: number,
  dy: number,
  options?: BlockingOptions,
): MoveValidation {
  if (!isValidDirection(dx, dy)) {
    return { ok: false, reason: 'invalid-direction' };
  }

  const to = { x: unit.x + dx, y: unit.y + dy };
  const blockage = cellBlockReason(state, to.x, to.y, options);
  if (blockage) {
    // Sin hook, `blocked-object` no puede darse; se mantiene el motivo histórico.
    return { ok: false, reason: blockage === 'blocked-object' ? 'occupied' : blockage };
  }

  if (dx !== 0 && dy !== 0) {
    if (
      !isFreeCell(state, unit.x + dx, unit.y, options) ||
      !isFreeCell(state, unit.x, unit.y + dy, options)
    ) {
      return { ok: false, reason: 'corner-cut' };
    }
  }

  return { ok: true, to };
}

export interface MoveResult {
  readonly state: GameState;
  readonly events: readonly GameEvent[];
}

/**
 * Aplica un movimiento ya validado. No muta el estado de entrada.
 */
export function commitMove(
  state: GameState,
  unit: Unit,
  dx: number,
  dy: number,
): MoveResult {
  const to = { x: unit.x + dx, y: unit.y + dy };
  const moved: Unit = {
    ...unit,
    x: to.x,
    y: to.y,
    mp: unit.mp - MOVE_COST,
  };

  const players = state.players.map((candidate) => (candidate.id === unit.id ? moved : candidate));
  const enemies = state.enemies.map((candidate) => (candidate.id === unit.id ? moved : candidate));

  return {
    state: { ...state, players, enemies },
    events: [
      {
        type: 'UnitMoved',
        unitId: unit.id,
        from: { x: unit.x, y: unit.y },
        to,
        mpLeft: moved.mp,
      },
    ],
  };
}
