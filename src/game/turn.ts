import { hasAction, restoreActions } from './actions';
import { chooseNearestPlayer, planEnemyAction } from './ai';
import { resolveAttack } from './combat';
import { isAlive, isGhost } from './grid';
import { restoreMana } from './mana';
import { commitMove, validateMove } from './movement';
import { refreshEnemyAwareness } from './perception';
import type {
  EnemyPhaseEntry,
  GameEvent,
  GameState,
  GameStatus,
  Unit,
} from './types';

export interface TurnResult {
  readonly state: GameState;
  readonly events: readonly GameEvent[];
  /** Traza de la fase enemiga; ausente si no se ejecutó (REQ-031 T-004). */
  readonly enemyPhase?: readonly EnemyPhaseEntry[];
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

/**
 * Restaura MP, maná, acciones y cupo de hechizos al empezar el turno. El
 * fantasma también recibe sus recursos (REQ-021 R-002): su `maxMp` es el
 * intrínseco y su `actions.max` ya vale una.
 */
function restoreTurnResources(unit: Unit): Unit {
  return {
    ...restoreActions(restoreMana({ ...unit, mp: unit.maxMp })),
    spellsCast: 0,
  };
}

/**
 * Restaura únicamente al jugador activo (REQ-031 T-002). El parámetro
 * opcional permite restaurar un id concreto sin cambiar la firma histórica;
 * sin él se usa `activePlayerId`. Los muertos sin fantasma no se restauran.
 */
export function restorePlayerTurn(
  state: GameState,
  unitId: string | undefined = state.activePlayerId ?? undefined,
): GameState {
  return {
    ...state,
    phase: 'player',
    players: state.players.map((unit) =>
      unit.id === unitId && (isAlive(unit) || isGhost(unit))
        ? restoreTurnResources(unit)
        : unit,
    ),
  };
}

export function restoreEnemyTurn(state: GameState): GameState {
  return {
    ...state,
    phase: 'enemy',
    enemies: state.enemies.map((unit) =>
      isAlive(unit) ? restoreTurnResources(unit) : unit,
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

interface EnemyPlanResult extends TurnResult {
  readonly targetId: string | null;
  readonly acted: boolean;
}

/**
 * Ejecuta la cola de acciones de un enemigo con el contador de REQ-026:
 * replanifica mientras le queden acciones, gasta una por ataque y no ataca al
 * moverse si está huyendo. La cola termina al esperar, morir, quedarse sin
 * acciones, no avanzar o matar al objetivo atacado.
 *
 * Además devuelve el objetivo perseguido y si el enemigo actuó de verdad, para
 * exponer la fase enemiga sin que el host lea estado interno (T-004).
 */
function applyEnemyPlan(state: GameState, enemy: Unit): EnemyPlanResult {
  const events: GameEvent[] = [];
  let next = state;
  let targetId: string | null = null;

  for (let planCount = 0; planCount < MAX_CHAINED_PLANS; planCount += 1) {
    const current = findEnemy(next, enemy.id);
    if (!current || !isAlive(current) || !hasAction(current)) break;

    const plan = planEnemyAction(next, current);
    if (plan.type === 'wait') break;

    if (plan.type === 'attack') {
      targetId = plan.targetId;
      const result = chainAttack(next, current.id, plan.targetId);
      if (!result) break;
      next = result.state;
      events.push(...result.events);
      if (targetIsDown(next, plan.targetId)) break;
      continue;
    }

    // La persecución sin ataque adyacente informa del jugador más cercano.
    if (plan.attackTargetId) {
      targetId = plan.attackTargetId;
    } else if (targetId === null && current.awareness === 'alert' && !current.fleeing) {
      const alive = next.players.filter(isAlive);
      if (alive.length > 0) {
        targetId = chooseNearestPlayer(current, alive).id;
      }
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

  const acted = events.some(
    (event) =>
      (event.type === 'UnitMoved' && event.unitId === enemy.id) ||
      (event.type === 'AttackPerformed' && event.attackerId === enemy.id),
  );

  // Un `wait` no inventa objetivo aunque un plan bloqueado lo hubiera previsto.
  return { state: next, events, targetId: acted ? targetId : null, acted };
}

/**
 * Cierra el turno después de que el activo muera durante su propio turno
 * (REQ-031 R-015). El comando ya se ha resuelto completo; esto solo decide si
 * toca pasar el control. Devuelve `undefined` si la partida terminó, si el
 * activo cambió o si la unidad sigue viva o no existe. No emite nada por sí
 * mismo: delega en `resolveEndTurn` para conservar el orden de turno y la fase
 * enemiga de TASK-0146.
 */
export function closeTurnAfterActiveDeath(
  state: GameState,
  previousActiveId: string,
): TurnResult | undefined {
  if (state.status !== 'playing' || state.activePlayerId !== previousActiveId) {
    return undefined;
  }

  const unit = state.players.find((candidate) => candidate.id === previousActiveId);
  if (!unit || isAlive(unit)) {
    return undefined;
  }

  return resolveEndTurn(state);
}

/**
 * Cierra el turno del activo. Si queda otro jugador jugable (vivo o fantasma)
 * le pasa el control sin fase enemiga; si era el último, ejecuta una única fase
 * enemiga por ronda y, si la partida sigue, vuelve al primer jugable.
 */
export function resolveEndTurn(state: GameState): TurnResult {
  const events: GameEvent[] = [{ type: 'TurnEnded', turn: state.round }];
  const activeIndex = state.players.findIndex(
    (unit) => unit.id === state.activePlayerId,
  );
  const nextPlayer = state.players.find(
    (unit, index) =>
      index > activeIndex && (isAlive(unit) || isGhost(unit)),
  );

  if (nextPlayer) {
    const next = restorePlayerTurn(
      { ...state, activePlayerId: nextPlayer.id },
      nextPlayer.id,
    );
    events.push({ type: 'PlayerTurnStarted', turn: state.round });
    return { state: next, events };
  }

  let next = restoreEnemyTurn(state);
  events.push({ type: 'EnemyPhaseStarted', turn: state.round });
  const enemyPhase: EnemyPhaseEntry[] = [];
  const livingAtStart = next.enemies.filter(isAlive);

  for (const original of livingAtStart) {
    if (next.status !== 'playing') {
      enemyPhase.push({ enemyId: original.id, targetId: null, action: 'wait' });
      continue;
    }

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
    enemyPhase.push({
      enemyId: active.id,
      targetId: result.targetId,
      action: result.acted ? 'act' : 'wait',
    });

    const settled = settleReturning(next, active.id);
    if (settled) {
      next = settled.state;
      events.push(...settled.events);
    }

    next = applyTerminal(next, events);
  }

  if (next.status === 'playing') {
    const first = next.players.find((unit) => isAlive(unit) || isGhost(unit));
    next = {
      ...next,
      round: next.round + 1,
      activePlayerId: first?.id ?? null,
    };
    if (first) {
      next = restorePlayerTurn(next, first.id);
      events.push({ type: 'PlayerTurnStarted', turn: next.round });
    }
  }

  return { state: next, events, enemyPhase };
}
