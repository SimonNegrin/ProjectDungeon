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

function findEnemy(state: GameState, unitId: string): Unit | undefined {
  return state.enemies.find((candidate) => candidate.id === unitId);
}

function findUnit(state: GameState, unitId: string): Unit | undefined {
  return (
    state.players.find((candidate) => candidate.id === unitId) ??
    findEnemy(state, unitId)
  );
}

/** Tope defensivo: evita que un plan sin progreso bloquee la fase. */
const MAX_CHAINED_PLANS = 16;

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

/** Aplica un ataque del enemigo; devuelve `undefined` si el ataque no es válido. */
function chainAttack(
  state: GameState,
  enemyId: string,
  targetId: string,
): TurnResult | undefined {
  const attack = resolveAttack(state, enemyId, targetId);
  if (!attack.ok) {
    return undefined;
  }
  return { state: attack.state, events: attack.events };
}

function targetIsDown(state: GameState, targetId: string): boolean {
  const target = findUnit(state, targetId);
  return target === undefined || target.hp <= 0;
}

/**
 * Ejecuta la cola de acciones de un enemigo con el contador de REQ-026:
 * replanifica mientras le queden acciones, gasta una por ataque y no ataca al
 * moverse si está huyendo. La cola termina al esperar, morir, quedarse sin
 * acciones, no avanzar o matar al objetivo atacado.
 */
function applyEnemyPlan(state: GameState, enemy: Unit): TurnResult {
  const events: GameEvent[] = [];
  let next = state;

  for (let planCount = 0; planCount < MAX_CHAINED_PLANS; planCount += 1) {
    const current = findEnemy(next, enemy.id);
    if (!current || !isAlive(current) || !hasAction(current)) break;

    const plan = planEnemyAction(next, current);
    if (plan.type === 'wait') break;

    if (plan.type === 'attack') {
      const result = chainAttack(next, current.id, plan.targetId);
      if (!result) break;
      next = result.state;
      events.push(...result.events);
      if (targetIsDown(next, plan.targetId)) break;
      continue;
    }

    let moved = false;
    for (const step of plan.steps) {
      const mover = findEnemy(next, enemy.id);
      if (!mover || !isAlive(mover)) break;

      const validation = validateMove(next, mover, step.dx, step.dy);
      if (!validation.ok) break;

      const stepResult = commitMove(next, mover, step.dx, step.dy);
      next = stepResult.state;
      events.push(...stepResult.events);
      moved = true;
    }

    if (!moved) break;

    // Huir solo gasta MP mientras huye; ataca únicamente acorralado (plan de ataque).
    if (current.fleeing || !plan.attackTargetId) continue;

    const result = chainAttack(next, enemy.id, plan.attackTargetId);
    if (!result) break;
    next = result.state;
    events.push(...result.events);
    if (targetIsDown(next, plan.attackTargetId)) break;
  }

  if (events.length === 0) {
    events.push({ type: 'EnemyWaited', unitId: enemy.id });
  }

  return { state: next, events };
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
