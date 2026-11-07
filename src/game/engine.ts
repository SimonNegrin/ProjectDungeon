import { isAlive } from './grid';
import { commitMove, validateMove } from './movement';
import { applyTerminal, resolveEndTurn } from './turn';
import { resolveAttack } from './combat';
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
    case 'Attack':
      return reduceAttack(state, command);
    case 'EndTurn':
      if (state.phase !== 'player') {
        return reject(state, command, 'wrong-phase');
      }
      return resolveEndTurn(state);
  }
}
