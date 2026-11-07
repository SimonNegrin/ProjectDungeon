import { isInside, isWallAt } from './grid';
import { DIRECTIONS, validateMove, type DirectionValue } from './movement';
import type { GameState, Position, Unit } from './types';

export type EnemyPlan =
  | { readonly type: 'attack'; readonly targetId: string }
  | { readonly type: 'move'; readonly dx: DirectionValue; readonly dy: DirectionValue }
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
 * Campo de distancias BFS desde el jugador objetivo. Bloquea muros y otras
 * unidades, pero deja libres al objetivo y al enemigo que se mueve. Respeta
 * la regla de no cortar esquinas.
 */
function distanceField(
  state: GameState,
  target: Unit,
  mover: Unit,
): number[][] {
  const { width, height } = state.grid;
  const distances: number[][] = Array.from({ length: height }, () =>
    Array<number>(width).fill(-1),
  );

  const blocked = new Set<string>();
  for (const unit of [...state.players, ...state.enemies]) {
    if (unit.hp <= 0) continue;
    if (unit.id === target.id || unit.id === mover.id) continue;
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

/**
 * Plan deterministico de la IA:
 * 1. elegir al jugador vivo más cercano (Chebyshev, desempate por índice);
 * 2. si está en rango, atacar;
 * 3. si no, avanzar una casilla siguiendo un campo BFS;
 * 4. si no hay paso que acerque, esperar.
 */
export function planEnemyAction(state: GameState, enemy: Unit): EnemyPlan {
  if (enemy.hp <= 0 || !enemy.actionAvailable) {
    return { type: 'wait' };
  }

  const players = state.players.filter((player) => player.hp > 0);
  if (players.length === 0) {
    return { type: 'wait' };
  }

  const target = chooseNearestPlayer(enemy, players);
  if (chebyshevDistance(enemy, target) <= 1) {
    return { type: 'attack', targetId: target.id };
  }

  const distances = distanceField(state, target, enemy);
  const currentDistance = distances[enemy.y][enemy.x];
  if (currentDistance < 0) {
    return { type: 'wait' };
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

  if (!best) {
    return { type: 'wait' };
  }

  return { type: 'move', dx: best.dx, dy: best.dy };
}
