import { planEnemyAction } from './ai';
import { resolveAttack } from './combat';
import { isAlive } from './grid';
import { commitMove, validateMove } from './movement';
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
      isAlive(unit) ? { ...unit, mp: unit.maxMp, actionAvailable: true } : unit,
    ),
  };
}

export function restoreEnemyTurn(state: GameState): GameState {
  return {
    ...state,
    phase: 'enemy',
    enemies: state.enemies.map((unit) =>
      isAlive(unit) ? { ...unit, mp: unit.maxMp, actionAvailable: true } : unit,
    ),
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
    const validation = validateMove(state, enemy, plan.dx, plan.dy);
    if (!validation.ok) {
      return { state, events: [{ type: 'EnemyWaited', unitId: enemy.id }] };
    }
    return commitMove(state, enemy, plan.dx, plan.dy);
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

    const result = applyEnemyPlan(next, enemy);
    next = result.state;
    events.push(...result.events);
    next = applyTerminal(next, events);
  }

  if (next.status === 'playing') {
    next = restorePlayerTurn({ ...next, turn: next.turn + 1 });
    events.push({ type: 'PlayerTurnStarted', turn: next.turn });
  }

  return { state: next, events };
}
