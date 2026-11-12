import { hasAction } from './actions';
import { isAlive, isInside, isWallAt } from './grid';
import {
  DIRECTIONS,
  commitMove,
  validateMove,
  type DirectionValue,
} from './movement';
import { hasLineOfSight, visiblePlayers } from './perception';
import type { GameState, Position, Unit } from './types';

/** Un paso cardinal o diagonal del plan de un enemigo. */
export interface EnemyStep {
  readonly dx: DirectionValue;
  readonly dy: DirectionValue;
}

export type EnemyPlan =
  | { readonly type: 'attack'; readonly targetId: string }
  | {
      readonly type: 'move';
      readonly steps: readonly EnemyStep[];
      /** Jugador al que atacar después de recorrer `steps`, si queda adyacente. */
      readonly attackTargetId?: string;
    }
  | { readonly type: 'wait' };

export function chebyshevDistance(a: Pick<Unit, 'x' | 'y'>, b: Pick<Unit, 'x' | 'y'>): number {
  return Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y));
}

function chooseNearestPlayer(enemy: Unit, players: readonly Unit[]): Unit {
  let nearest = players[0];
  let nearestDistance = chebyshevDistance(enemy, nearest);

  for (let index = 1; index < players.length; index += 1) {
    const candidate = players[index];
    const distance = chebyshevDistance(enemy, candidate);
    if (distance < nearestDistance) {
      nearest = candidate;
      nearestDistance = distance;
    }
  }

  return nearest;
}

function cellKey(x: number, y: number): string {
  return `${x},${y}`;
}

function isClearForPath(
  state: GameState,
  blocked: ReadonlySet<string>,
  x: number,
  y: number,
): boolean {
  return (
    isInside(state.grid, x, y) &&
    !isWallAt(state.grid, x, y) &&
    !blocked.has(cellKey(x, y))
  );
}

/**
 * Campo de distancias BFS desde una casilla objetivo. Bloquea muros y otras
 * unidades, pero deja libres la casilla objetivo y al enemigo que se mueve.
 * Respeta la regla de no cortar esquinas.
 */
function distanceField(
  state: GameState,
  target: Position,
  mover: Unit,
  targetUnitId?: string,
): number[][] {
  const { width, height } = state.grid;
  const distances: number[][] = Array.from({ length: height }, () =>
    Array<number>(width).fill(-1),
  );

  const blocked = new Set<string>();
  for (const unit of [...state.players, ...state.enemies]) {
    if (unit.hp <= 0) continue;
    if (unit.id === targetUnitId || unit.id === mover.id) continue;
    blocked.add(cellKey(unit.x, unit.y));
  }

  distances[target.y][target.x] = 0;
  const queue: Position[] = [{ x: target.x, y: target.y }];

  for (let head = 0; head < queue.length; head += 1) {
    const current = queue[head];
    const currentDistance = distances[current.y][current.x];

    for (const direction of DIRECTIONS) {
      const nx = current.x + direction.dx;
      const ny = current.y + direction.dy;

      if (!isClearForPath(state, blocked, nx, ny)) continue;
      if (distances[ny][nx] !== -1) continue;

      if (direction.dx !== 0 && direction.dy !== 0) {
        const sideAX = current.x + direction.dx;
        const sideAY = current.y;
        const sideBX = current.x;
        const sideBY = current.y + direction.dy;
        if (
          !isClearForPath(state, blocked, sideAX, sideAY) ||
          !isClearForPath(state, blocked, sideBX, sideBY)
        ) {
          continue;
        }
      }

      distances[ny][nx] = currentDistance + 1;
      queue.push({ x: nx, y: ny });
    }
  }

  return distances;
}

/** Elige el paso determinista que más acerca al campo de distancias. */
function stepAlongField(
  state: GameState,
  enemy: Unit,
  distances: number[][],
): EnemyStep | undefined {
  const currentDistance = distances[enemy.y][enemy.x];
  if (currentDistance < 0) {
    return undefined;
  }

  let best:
    | { readonly dx: DirectionValue; readonly dy: DirectionValue; readonly distance: number }
    | undefined;

  for (const direction of DIRECTIONS) {
    const validation = validateMove(state, enemy, direction.dx, direction.dy);
    if (!validation.ok) continue;

    const distance = distances[validation.to.y][validation.to.x];
    if (distance < 0 || distance >= currentDistance) continue;

    if (best === undefined || distance < best.distance) {
      best = { dx: direction.dx, dy: direction.dy, distance };
    }
  }

  return best ? { dx: best.dx, dy: best.dy } : undefined;
}

interface PathPlan {
  readonly steps: readonly EnemyStep[];
  readonly final: Unit;
}

/**
 * Recorre hasta `maxSteps` pasos descendiendo por el campo de distancias. La
 * simulación usa `commitMove` para que la ocupación y las esquinas se validen
 * igual que en la ejecución real, sin mutar el estado de entrada.
 */
function pathAlongField(
  state: GameState,
  enemy: Unit,
  distances: number[][],
  maxSteps: number,
): PathPlan {
  const steps: EnemyStep[] = [];
  let simulation = state;
  let current = enemy;

  for (let index = 0; index < maxSteps; index += 1) {
    const step = stepAlongField(simulation, current, distances);
    if (!step) break;

    const validation = validateMove(simulation, current, step.dx, step.dy);
    if (!validation.ok) break;

    simulation = commitMove(simulation, current, step.dx, step.dy).state;
    const moved = simulation.enemies.find((candidate) => candidate.id === current.id);
    if (!moved) break;

    steps.push(step);
    current = moved;
  }

  return { steps, final: current };
}

function planPathTo(
  state: GameState,
  enemy: Unit,
  target: Position,
): EnemyPlan {
  const targetUnitId = state.players.find(
    (player) => isAlive(player) && player.x === target.x && player.y === target.y,
  )?.id;
  const distances = distanceField(state, target, enemy, targetUnitId);
  const path = pathAlongField(state, enemy, distances, Math.max(0, enemy.mp));
  return path.steps.length > 0
    ? { type: 'move', steps: path.steps }
    : { type: 'wait' };
}

/**
 * Plan de alerta: ataca si ya está adyacente; si no, gasta el MP disponible
 * avanzando por BFS hacia la última posición conocida (o hacia el jugador más
 * cercano si la memoria está vacía) y ataca al terminar adyacente si conserva la
 * acción.
 */
function planAlert(state: GameState, enemy: Unit): EnemyPlan {
  const players = state.players.filter(isAlive);
  if (players.length === 0) return { type: 'wait' };

  const nearest = chooseNearestPlayer(enemy, players);
  if (chebyshevDistance(enemy, nearest) <= 1) {
    return { type: 'attack', targetId: nearest.id };
  }

  const target = enemy.lastKnown ?? { x: nearest.x, y: nearest.y };
  const targetUnitId = players.find(
    (player) => player.x === target.x && player.y === target.y,
  )?.id;
  const distances = distanceField(state, target, enemy, targetUnitId);
  const path = pathAlongField(state, enemy, distances, Math.max(0, enemy.mp));

  if (path.steps.length === 0) {
    return { type: 'wait' };
  }

  const adjacent = players.find(
    (player) => chebyshevDistance(path.final, player) <= 1,
  );
  return adjacent
    ? { type: 'move', steps: path.steps, attackTargetId: adjacent.id }
    : { type: 'move', steps: path.steps };
}

/** Regreso al puesto: avanza hasta `home` sin atacar. */
function planReturning(state: GameState, enemy: Unit): EnemyPlan {
  return planPathTo(state, enemy, enemy.home);
}

interface ReachableCell {
  readonly x: number;
  readonly y: number;
  readonly steps: readonly EnemyStep[];
}

/**
 * Casillas alcanzables con hasta `maxSteps` pasos, en orden BFS fijo (primero
 * la propia casilla y después el orden de `DIRECTIONS`). Ignora al propio
 * enemigo como bloqueo y respeta muros, unidades y esquinas.
 */
function reachableCells(
  state: GameState,
  enemy: Unit,
  maxSteps: number,
): readonly ReachableCell[] {
  const isFreeForMover = (x: number, y: number): boolean => {
    if (!isInside(state.grid, x, y) || isWallAt(state.grid, x, y)) return false;
    return ![...state.players, ...state.enemies].some(
      (unit) =>
        unit.id !== enemy.id && unit.hp > 0 && unit.x === x && unit.y === y,
    );
  };

  const cells: ReachableCell[] = [{ x: enemy.x, y: enemy.y, steps: [] }];
  const visited = new Set<string>([cellKey(enemy.x, enemy.y)]);
  const queue: number[] = [0];

  for (let head = 0; head < queue.length; head += 1) {
    const current = cells[queue[head]];
    if (current.steps.length >= maxSteps) continue;

    for (const direction of DIRECTIONS) {
      const nx = current.x + direction.dx;
      const ny = current.y + direction.dy;
      if (!isFreeForMover(nx, ny)) continue;

      if (direction.dx !== 0 && direction.dy !== 0) {
        if (
          !isFreeForMover(current.x + direction.dx, current.y) ||
          !isFreeForMover(current.x, current.y + direction.dy)
        ) {
          continue;
        }
      }

      const key = cellKey(nx, ny);
      if (visited.has(key)) continue;

      visited.add(key);
      cells.push({
        x: nx,
        y: ny,
        steps: [...current.steps, { dx: direction.dx, dy: direction.dy }],
      });
      queue.push(cells.length - 1);
    }
  }

  return cells;
}

function nearestVisibleDistance(
  position: Pick<Unit, 'x' | 'y'>,
  players: readonly Unit[],
): number {
  let nearest = Number.POSITIVE_INFINITY;
  for (const player of players) {
    nearest = Math.min(nearest, chebyshevDistance(position, player));
  }
  return nearest;
}

function breaksAllLinesOfSight(
  state: GameState,
  position: Pick<Unit, 'x' | 'y'>,
  players: readonly Unit[],
): boolean {
  return players.every((player) => !hasLineOfSight(state.grid, position, player));
}

/** Primera casilla del orden BFS con la mayor distancia al jugador más cercano. */
function bestByDistance(
  cells: readonly ReachableCell[],
  players: readonly Unit[],
): { readonly cell: ReachableCell; readonly distance: number } | undefined {
  let best: { cell: ReachableCell; distance: number } | undefined;
  for (const cell of cells) {
    const distance = nearestVisibleDistance(cell, players);
    if (best === undefined || distance > best.distance) {
      best = { cell, distance };
    }
  }
  return best;
}

/**
 * Huida determinista: entre las casillas alcanzables con el MP, prefiere las que
 * rompen la línea de visión de todos los jugadores visibles y, entre ellas, la
 * que maximiza la distancia al jugador más cercano. Si ninguna rompe la visión,
 * elige la que más se aleja; si no mejora, se queda y ataca si está adyacente.
 * Sin jugador visible, vuelve a su puesto.
 */
function planFlee(state: GameState, enemy: Unit): EnemyPlan {
  const visible = visiblePlayers(state, enemy);
  if (visible.length === 0) {
    return planReturning(state, enemy);
  }

  const players = state.players.filter(isAlive);
  const cells = reachableCells(state, enemy, Math.max(0, enemy.mp));
  const breakers = cells.filter((cell) => breaksAllLinesOfSight(state, cell, visible));
  const currentDistance = nearestVisibleDistance(enemy, visible);

  let chosen: ReachableCell | undefined;
  if (breakers.length > 0) {
    chosen = bestByDistance(breakers, visible)?.cell;
  } else {
    const best = bestByDistance(cells, visible);
    if (best && best.distance > currentDistance) {
      chosen = best.cell;
    }
  }

  if (!chosen || chosen.steps.length === 0) {
    const nearest = chooseNearestPlayer(enemy, players);
    return chebyshevDistance(enemy, nearest) <= 1
      ? { type: 'attack', targetId: nearest.id }
      : { type: 'wait' };
  }

  const final = { x: chosen.x, y: chosen.y };
  const adjacent = players.find(
    (player) => chebyshevDistance(final, player) <= 1,
  );
  return adjacent
    ? { type: 'move', steps: chosen.steps, attackTargetId: adjacent.id }
    : { type: 'move', steps: chosen.steps };
}

/**
 * Plan deterministico de la IA:
 * - dormido espera;
 * - en regreso vuelve a `home` sin atacar;
 * - en huida (solo cobarde) rompe la visión y se aleja, o vuelve a `home` si
 *   no ve a nadie;
 * - en alerta ataca si está adyacente; si no, gasta hasta todo el MP avanzando
 *   por BFS a `lastKnown` y ataca al llegar si conserva la acción;
 * - si no hay paso que acerque, espera.
 */
export function planEnemyAction(state: GameState, enemy: Unit): EnemyPlan {
  if (enemy.hp <= 0 || !hasAction(enemy)) {
    return { type: 'wait' };
  }
  if (enemy.awareness === 'dormant') {
    return { type: 'wait' };
  }

  if (enemy.awareness === 'returning') {
    return planReturning(state, enemy);
  }

  if (enemy.fleeing) {
    return planFlee(state, enemy);
  }

  return planAlert(state, enemy);
}
