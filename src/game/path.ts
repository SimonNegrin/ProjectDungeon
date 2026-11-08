import { findUnit, isAdjacent } from './combat';
import { isAlive } from './grid';
import {
  cellBlockReason,
  DIRECTIONS,
  type BlockingOptions,
  type CellBlockReason,
} from './movement';
import { MOVE_COST, type GameState, type Position, type Unit } from './types';

export type CursorTargetKind = 'player' | 'floor' | 'enemy' | 'blocked';

/** Motivo estable y serializable para que el HUD pueda traducirlo. */
export type CursorBlockedReason =
  | CellBlockReason
  | 'no-path'
  | 'unknown-unit'
  | 'dead-unit';

/**
 * Plan de un tile objetivo para la unidad que se mueve.
 *
 * `path` contiene los pasos posteriores al jugador, en orden, e incluye el tile
 * final o el tile de ataque. Nunca contiene el tile de salida ni el tile del
 * enemigo: un enemigo se representa por `attackTile`, la casilla libre adyacente
 * desde la que se puede atacar.
 */
export interface CursorTargetPlan {
  readonly kind: CursorTargetKind;
  readonly path: readonly Position[];
  readonly cost: number;
  readonly withinMp: boolean;
  readonly attackTile?: Position;
  readonly blockedReason?: CursorBlockedReason;
}

interface ReachablePath {
  readonly path: readonly Position[];
  readonly cost: number;
}

function blocked(reason: CursorBlockedReason): CursorTargetPlan {
  return {
    kind: 'blocked',
    path: [],
    cost: 0,
    withinMp: false,
    blockedReason: reason,
  };
}

function livingEnemyAt(state: GameState, x: number, y: number): Unit | undefined {
  return state.enemies.find((unit) => isAlive(unit) && unit.x === x && unit.y === y);
}

/**
 * BFS determinista desde `mover` hasta `target`. Respeta muros, unidades vivas,
 * objetos bloqueantes y la regla de no cortar esquinas. Los empates de camino se
 * resuelven con el orden de `DIRECTIONS`.
 */
function findPath(
  state: GameState,
  mover: Unit,
  target: Position,
  options?: BlockingOptions,
): ReachablePath | undefined {
  const { width, height } = state.grid;
  const startIndex = mover.y * width + mover.x;
  const targetIndex = target.y * width + target.x;
  const visited = new Uint8Array(width * height);
  const previous = new Int32Array(width * height).fill(-1);
  const queue: number[] = [startIndex];
  visited[startIndex] = 1;

  for (let head = 0; head < queue.length; head += 1) {
    const currentIndex = queue[head];
    if (currentIndex === targetIndex) break;

    const currentX = currentIndex % width;
    const currentY = Math.floor(currentIndex / width);

    for (const direction of DIRECTIONS) {
      const nextX = currentX + direction.dx;
      const nextY = currentY + direction.dy;

      if (cellBlockReason(state, nextX, nextY, options) !== undefined) continue;

      if (direction.dx !== 0 && direction.dy !== 0) {
        if (
          cellBlockReason(state, currentX + direction.dx, currentY, options) !== undefined ||
          cellBlockReason(state, currentX, currentY + direction.dy, options) !== undefined
        ) {
          continue;
        }
      }

      const nextIndex = nextY * width + nextX;
      if (visited[nextIndex] === 1) continue;

      visited[nextIndex] = 1;
      previous[nextIndex] = currentIndex;
      queue.push(nextIndex);
    }
  }

  if (visited[targetIndex] !== 1) return undefined;

  const reversed: Position[] = [];
  let index = targetIndex;
  while (index !== startIndex) {
    reversed.push({ x: index % width, y: Math.floor(index / width) });
    index = previous[index];
  }
  reversed.reverse();

  return { path: reversed, cost: reversed.length * MOVE_COST };
}

function planEnemy(
  state: GameState,
  mover: Unit,
  enemy: Unit,
  options?: BlockingOptions,
): CursorTargetPlan {
  // Ya adyacente: atacar sin moverse desde la posición actual.
  if (isAdjacent(mover, enemy)) {
    return {
      kind: 'enemy',
      path: [],
      cost: 0,
      withinMp: true,
      attackTile: { x: mover.x, y: mover.y },
    };
  }

  let best: { readonly path: readonly Position[]; readonly cost: number; readonly tile: Position } | undefined;

  for (const direction of DIRECTIONS) {
    const tile = { x: enemy.x + direction.dx, y: enemy.y + direction.dy };
    if (cellBlockReason(state, tile.x, tile.y, options) !== undefined) continue;

    const reachable = findPath(state, mover, tile, options);
    if (!reachable) continue;

    if (best === undefined || reachable.cost < best.cost) {
      best = { path: reachable.path, cost: reachable.cost, tile };
    }
  }

  if (!best) {
    return blocked('no-path');
  }

  return {
    kind: 'enemy',
    path: best.path,
    cost: best.cost,
    withinMp: best.cost <= mover.mp,
    attackTile: best.tile,
  };
}

/**
 * Clasifica un tile objetivo y, si procede, planifica el camino más corto desde
 * `unitId` hasta él. Función pura y determinista: no muta el estado y no usa
 * DOM, Canvas, input, aleatoriedad ni relojes.
 *
 * - `player`: el objetivo es la propia unidad; camino vacío y coste 0.
 * - `floor`: suelo libre; el camino termina en el objetivo.
 * - `enemy`: enemigo vivo; el camino termina en `attackTile`, nunca en su tile.
 * - `blocked`: muro, aliado, objeto bloqueante, fuera del mapa o sin camino.
 *
 * `withinMp` indica si el coste completo cabe en el MP actual; el camino se
 * devuelve completo aunque no quepa para que el host pueda dibujarlo atenuado.
 */
export function planCursorTarget(
  state: GameState,
  unitId: string,
  target: Position,
  options?: BlockingOptions,
): CursorTargetPlan {
  const mover = findUnit(state, unitId);
  if (!mover) return blocked('unknown-unit');
  if (!isAlive(mover)) return blocked('dead-unit');

  if (target.x === mover.x && target.y === mover.y) {
    return { kind: 'player', path: [], cost: 0, withinMp: true };
  }

  const blockage = cellBlockReason(state, target.x, target.y, options);
  if (blockage === 'occupied') {
    const enemy = livingEnemyAt(state, target.x, target.y);
    if (enemy) return planEnemy(state, mover, enemy, options);
    return blocked('occupied');
  }
  if (blockage) return blocked(blockage);

  const reachable = findPath(state, mover, target, options);
  if (!reachable) return blocked('no-path');

  return {
    kind: 'floor',
    path: reachable.path,
    cost: reachable.cost,
    withinMp: reachable.cost <= mover.mp,
  };
}
