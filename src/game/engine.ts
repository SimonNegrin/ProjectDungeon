import { isAlive } from './grid';
import { commitMove, validateMove } from './movement';
import { applyTerminal, resolveEndTurn } from './turn';
import { resolveAttack } from './combat';
import { planCursorTarget, type CursorBlockedReason } from './path';
import { BspMapGenerator } from './bsp';
import { DEFAULT_MAP_SEED, type GeneratedMap, type MapGenerator, type MapOptions } from './map';
import {
  ENEMY_MAX_HP,
  ENEMY_MAX_MP,
  MOVE_COST,
  PLAYER_MAX_HP,
  PLAYER_MAX_MP,
  type Command,
  type GameEvent,
  type GameState,
  type Position,
  type ReduceResult,
  type RejectionReason,
  type Unit,
} from './types';

export interface CreateInitialStateConfig {
  readonly seed?: number;
  readonly options?: MapOptions;
  readonly generator?: MapGenerator;
}

function createUnit(
  id: string,
  faction: Unit['faction'],
  position: Position,
): Unit {
  const isPlayer = faction === 'player';
  const maxHp = isPlayer ? PLAYER_MAX_HP : ENEMY_MAX_HP;
  const maxMp = isPlayer ? PLAYER_MAX_MP : ENEMY_MAX_MP;

  return {
    id,
    faction,
    x: position.x,
    y: position.y,
    hp: maxHp,
    maxHp,
    mp: maxMp,
    maxMp,
    actionAvailable: true,
  };
}

function isMapGenerator(value: unknown): value is MapGenerator {
  return (
    typeof value === 'object' &&
    value !== null &&
    'generate' in value &&
    typeof (value as { generate: unknown }).generate === 'function'
  );
}

function buildInitialState(
  generator: MapGenerator,
  seed: number,
  options: MapOptions | undefined,
): GameState {
  const map: GeneratedMap = generator.generate(seed, options);

  return {
    grid: { width: map.width, height: map.height, tiles: map.tiles },
    map,
    players: [createUnit('player-1', 'player', map.spawns.player)],
    enemies: [createUnit('enemy-1', 'enemy', map.spawns.enemy)],
    phase: 'player',
    turn: 1,
    status: 'playing',
  };
}

/**
 * Crea el estado inicial generando el mapa.
 *
 * Acepta la forma principal `createInitialState({ seed, options, generator })`
 * y, por compatibilidad con ADR-007, `createInitialState(generator, options)`.
 */
export function createInitialState(config?: CreateInitialStateConfig): GameState;
export function createInitialState(
  generator: MapGenerator,
  options?: MapOptions,
): GameState;
export function createInitialState(
  configOrGenerator: CreateInitialStateConfig | MapGenerator = {},
  maybeOptions?: MapOptions,
): GameState {
  if (isMapGenerator(configOrGenerator)) {
    return buildInitialState(
      configOrGenerator,
      DEFAULT_MAP_SEED,
      maybeOptions,
    );
  }

  const config = configOrGenerator;
  return buildInitialState(
    config.generator ?? new BspMapGenerator(),
    config.seed ?? DEFAULT_MAP_SEED,
    config.options,
  );
}

function reject(
  state: GameState,
  command: Command,
  reason: RejectionReason,
): ReduceResult {
  return {
    state,
    events: [{ type: 'CommandRejected', commandType: command.type, reason }],
  };
}

function reduceMove(
  state: GameState,
  command: Extract<Command, { type: 'Move' }>,
): ReduceResult {
  if (state.phase !== 'player') {
    return reject(state, command, 'wrong-phase');
  }

  const unit = state.players.find((player) => player.id === command.unitId);
  if (!unit) {
    return reject(state, command, 'unknown-unit');
  }
  if (!isAlive(unit)) {
    return reject(state, command, 'dead-unit');
  }
  if (unit.mp < MOVE_COST) {
    return reject(state, command, 'no-mp');
  }

  const validation = validateMove(state, unit, command.dx, command.dy);
  if (!validation.ok) {
    return reject(state, command, validation.reason);
  }

  return commitMove(state, unit, command.dx, command.dy);
}

function rejectionForBlockedPlan(
  reason: CursorBlockedReason | undefined,
): RejectionReason {
  switch (reason) {
    case 'out-of-bounds':
    case 'wall':
    case 'occupied':
    case 'no-path':
    case 'unknown-unit':
    case 'dead-unit':
      return reason;
    case 'blocked-object':
    case undefined:
      return 'invalid-target';
  }
}

type PathExecution =
  | {
      readonly ok: true;
      readonly state: GameState;
      readonly events: readonly GameEvent[];
    }
  | { readonly ok: false; readonly reason: RejectionReason };

/**
 * Recorre una lista de tiles contiguos reutilizando `validateMove`/`commitMove`.
 * No muta la entrada; si un paso falla devuelve el motivo para que el comando
 * completo se rechace sin dejar movimiento parcial.
 */
function executePathSteps(
  state: GameState,
  unitId: string,
  steps: readonly Position[],
): PathExecution {
  let current = state;
  const events: GameEvent[] = [];

  for (const step of steps) {
    const unit = current.players.find((candidate) => candidate.id === unitId);
    if (!unit) return { ok: false, reason: 'unknown-unit' };
    if (!isAlive(unit)) return { ok: false, reason: 'dead-unit' };

    const dx = step.x - unit.x;
    const dy = step.y - unit.y;
    const validation = validateMove(current, unit, dx, dy);
    if (!validation.ok) return { ok: false, reason: validation.reason };

    const result = commitMove(current, unit, dx, dy);
    current = result.state;
    events.push(...result.events);
  }

  return { ok: true, state: current, events };
}

function attackWithTerminal(
  state: GameState,
  events: GameEvent[],
  attackerId: string,
  targetId: string,
): ReduceResult | { readonly ok: false; readonly reason: RejectionReason } {
  const attack = resolveAttack(state, attackerId, targetId);
  if (!attack.ok) return { ok: false, reason: attack.reason };

  events.push(...attack.events);
  const next = applyTerminal(attack.state, events);
  return { state: next, events };
}

/**
 * `MoveTo` recalcula el plan con `planCursorTarget` a partir del tile recibido
 * (nunca confía en un camino del host), recorre hasta `min(coste, MP)` pasos y,
 * sobre un enemigo, ataca al llegar al tile de ataque si queda acción.
 *
 * Es atómico: cualquier rechazo devuelve el `state` original y un único
 * `CommandRejected`. El motivo `no-path`/`invalid-target` se añadió para este
 * comando; el resto reutiliza los motivos estables existentes.
 */
function reduceMoveTo(
  state: GameState,
  command: Extract<Command, { type: 'MoveTo' }>,
): ReduceResult {
  if (state.phase !== 'player') {
    return reject(state, command, 'wrong-phase');
  }

  const unit = state.players.find((player) => player.id === command.unitId);
  if (!unit) {
    return reject(state, command, 'unknown-unit');
  }
  if (!isAlive(unit)) {
    return reject(state, command, 'dead-unit');
  }

  const plan = planCursorTarget(state, command.unitId, command.target);

  if (plan.kind === 'player') {
    return reject(state, command, 'invalid-target');
  }
  if (plan.kind === 'blocked') {
    return reject(state, command, rejectionForBlockedPlan(plan.blockedReason));
  }

  if (plan.kind === 'floor') {
    const steps = plan.path.slice(0, Math.max(0, unit.mp));
    if (steps.length === 0) {
      return reject(state, command, 'no-mp');
    }

    const execution = executePathSteps(state, unit.id, steps);
    if (!execution.ok) {
      return reject(state, command, execution.reason);
    }
    return { state: execution.state, events: execution.events };
  }

  const enemy = state.enemies.find(
    (candidate) =>
      isAlive(candidate) &&
      candidate.x === command.target.x &&
      candidate.y === command.target.y,
  );
  if (!enemy) {
    return reject(state, command, 'target-not-found');
  }

  // Ya adyacente: atacar sin moverse ni gastar MP.
  if (plan.path.length === 0) {
    if (!unit.actionAvailable) {
      return reject(state, command, 'no-action');
    }

    const events: GameEvent[] = [];
    const result = attackWithTerminal(state, events, unit.id, enemy.id);
    if ('ok' in result) return reject(state, command, result.reason);
    return result;
  }

  const steps = plan.path.slice(0, Math.max(0, unit.mp));
  if (steps.length === 0) {
    return reject(state, command, 'no-mp');
  }

  const execution = executePathSteps(state, unit.id, steps);
  if (!execution.ok) {
    return reject(state, command, execution.reason);
  }

  const events: GameEvent[] = [...execution.events];
  const reachedAttackTile = steps.length === plan.path.length;

  if (reachedAttackTile && unit.actionAvailable) {
    const result = attackWithTerminal(execution.state, events, unit.id, enemy.id);
    if ('ok' in result) return reject(state, command, result.reason);
    return result;
  }

  return { state: execution.state, events };
}

function reduceAttack(
  state: GameState,
  command: Extract<Command, { type: 'Attack' }>,
): ReduceResult {
  if (state.phase !== 'player') {
    return reject(state, command, 'wrong-phase');
  }

  const attacker = state.players.find((player) => player.id === command.unitId);
  if (!attacker) {
    return reject(state, command, 'unknown-unit');
  }
  if (!isAlive(attacker)) {
    return reject(state, command, 'dead-unit');
  }

  const attack = resolveAttack(state, command.unitId, command.targetId);
  if (!attack.ok) {
    return reject(state, command, attack.reason);
  }

  const events: GameEvent[] = [...attack.events];
  const next = applyTerminal(attack.state, events);
  return { state: next, events };
}

/**
 * Reducción pura: recibe el estado y un comando y devuelve un estado nuevo
 * (o el mismo si se rechaza) más los eventos ocurridos. No muta la entrada.
 */
export function reduce(state: GameState, command: Command): ReduceResult {
  if (command.type === 'Restart') {
    return { state: createInitialState(), events: [{ type: 'GameRestarted' }] };
  }

  if (state.status !== 'playing') {
    return reject(state, command, 'game-over');
  }

  switch (command.type) {
    case 'Move':
      return reduceMove(state, command);
    case 'MoveTo':
      return reduceMoveTo(state, command);
    case 'Attack':
      return reduceAttack(state, command);
    case 'EndTurn':
      if (state.phase !== 'player') {
        return reject(state, command, 'wrong-phase');
      }
      return resolveEndTurn(state);
  }
}
