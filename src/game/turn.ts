import { hasAction, restoreActions } from './actions';
import { planEnemyAction } from './ai';
import { resolveAttack } from './combat';
import { isAlive } from './grid';
import { commitMove, validateMove } from './movement';
import { refreshEnemyAwareness } from './perception';
import type { GameEvent, GameState, GameStatus, Unit } from './types';

export interface TurnResult {
  readonly state: GameState;
  readonly events: readonly GameEvent[];
}

export function evaluateStatus(state: GameState): GameStatus {
  if (!state.players.some(isAlive)) {
    return 'defeat';
  }
  if (!state.enemies.some(isAlive)) {
    return 'victory';
  }
  return 'playing';
}

/**
 * Si el estado acaba de terminar la partida, fija el estado final y emite
 * `GameEnded` una sola vez. Es determinista y no muta la entrada.
 */
export function applyTerminal(state: GameState, events: GameEvent[]): GameState {
  if (state.status !== 'playing') {
    return state;
  }

  const status = evaluateStatus(state);
  if (status === 'playing') {
    return state;
  }

  events.push({ type: 'GameEnded', status });
  return { ...state, status };
}

export function restorePlayerTurn(state: GameState): GameState {
  return {
    ...state,
    phase: 'player',
    players: state.players.map((unit) =>
      isAlive(unit)
        ? restoreActions({ ...unit, mp: unit.maxMp })
        : unit,
    ),
  };
}

export function restoreEnemyTurn(state: GameState): GameState {
  return {
    ...state,
    phase: 'enemy',
    enemies: state.enemies.map((unit) =>
      isAlive(unit)
        ? restoreActions({ ...unit, mp: unit.maxMp })
        : unit,
    ),
  };
}

function replaceEnemy(state: GameState, enemy: Unit): GameState {
  return {
    ...state,
    enemies: state.enemies.map((candidate) =>
      candidate.id === enemy.id ? enemy : candidate,
    ),
  };
}

/**
 * Un enemigo en regreso que acaba de llegar a su puesto queda dormido en la
 * misma fase. Devuelve `undefined` si no hay transición.
 */
function settleReturning(
  state: GameState,
  unitId: string,
): { readonly state: GameState; readonly events: readonly GameEvent[] } | undefined {
  const enemy = state.enemies.find((candidate) => candidate.id === unitId);
  if (
    !enemy ||
    !isAlive(enemy) ||
    enemy.awareness !== 'returning' ||
    enemy.x !== enemy.home.x ||
    enemy.y !== enemy.home.y
  ) {
    return undefined;
  }

  const sleeping: Unit = {
    ...enemy,
    awareness: 'dormant',
    fleeing: false,
    lastKnown: null,
    alertTurns: 0,
    hasShouted: false,
  };

  return {
    state: replaceEnemy(state, sleeping),
    events: [{ type: 'EnemyReturned', unitId }],
  };
}

function applyEnemyPlan(state: GameState, enemy: Unit): TurnResult {
  const plan = planEnemyAction(state, enemy);

  if (plan.type === 'attack') {
    const attack = resolveAttack(state, enemy.id, plan.targetId);
    if (!attack.ok) {
      return { state, events: [{ type: 'EnemyWaited', unitId: enemy.id }] };
    }
    return { state: attack.state, events: attack.events };
  }

  if (plan.type === 'move') {
    const events: GameEvent[] = [];
    let next = state;

    for (const step of plan.steps) {
      const current = next.enemies.find((candidate) => candidate.id === enemy.id);
      if (!current || !isAlive(current)) break;

      const validation = validateMove(next, current, step.dx, step.dy);
      if (!validation.ok) break;

      const moved = commitMove(next, current, step.dx, step.dy);
      next = moved.state;
      events.push(...moved.events);
    }

    if (plan.attackTargetId) {
      const attacker = next.enemies.find((candidate) => candidate.id === enemy.id);
      if (attacker && isAlive(attacker) && hasAction(attacker)) {
        const attack = resolveAttack(next, enemy.id, plan.attackTargetId);
        if (attack.ok) {
          next = attack.state;
          events.push(...attack.events);
        }
      }
    }

    if (events.length === 0) {
      events.push({ type: 'EnemyWaited', unitId: enemy.id });
    }

    return { state: next, events };
  }

  return { state, events: [{ type: 'EnemyWaited', unitId: enemy.id }] };
}

/**
 * Cierra la fase del jugador, restaura y ejecuta la fase enemiga completa en
 * orden de índice, comprueba el final y, si la partida sigue, devuelve el
 * control al jugador restaurando MP y acción.
 */
export function resolveEndTurn(state: GameState): TurnResult {
  const events: GameEvent[] = [{ type: 'TurnEnded', turn: state.turn }];
  let next = restoreEnemyTurn(state);
  events.push({ type: 'EnemyPhaseStarted', turn: state.turn });

  for (const original of next.enemies) {
    if (next.status !== 'playing') break;
    if (!isAlive(original)) continue;

    const enemy = next.enemies.find((candidate) => candidate.id === original.id);
    if (!enemy || !isAlive(enemy)) continue;

    const awareness = refreshEnemyAwareness(next, enemy);
    let active = enemy;
    if (awareness.changed) {
      active = awareness.unit;
      next = replaceEnemy(next, active);
      if (awareness.returned) {
        events.push({ type: 'EnemyReturned', unitId: active.id });
      }
    }

    const result = applyEnemyPlan(next, active);
    next = result.state;
    events.push(...result.events);

    const settled = settleReturning(next, active.id);
    if (settled) {
      next = settled.state;
      events.push(...settled.events);
    }

    next = applyTerminal(next, events);
  }

  if (next.status === 'playing') {
    next = restorePlayerTurn({ ...next, turn: next.turn + 1 });
    events.push({ type: 'PlayerTurnStarted', turn: next.turn });
  }

  return { state: next, events };
}
