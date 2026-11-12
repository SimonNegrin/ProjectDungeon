import { createActions, hasAction } from './actions';
import { isAlive } from './grid';
import { commitMove, validateMove } from './movement';
import { applyTerminal, resolveEndTurn } from './turn';
import { resolveAttack } from './combat';
import { castSpell } from './magic';
import { planCursorTarget, type CursorBlockedReason } from './path';
import { detectEnemiesAfterStep } from './perception';
import { GrowthMapGenerator } from './chambers/variants/growth';
import { createRng } from './rng';
import { BESTIARY, type EnemyType } from './bestiary';
import { placeMapEnemies } from './enemy-placement';
import { createMana } from './mana';
import { DEFAULT_MAP_SEED, type GeneratedMap, type MapGenerator, type MapOptions } from './map';
import { createPlayerFromArchetype } from './roster';
import {
  MAX_WEAPONS,
  MOVE_COST,
  PICKUP_COST,
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

/** Crea un enemigo con las estadísticas y el equipo de la tabla del bestiario. */
function createEnemy(
  id: string,
  position: Position,
  type: EnemyType,
  home: Position = position,
): Unit {
  const definition = BESTIARY[type];

  return {
    id,
    nombre: definition.name,
    faction: 'enemy',
    enemyType: type,
    archetypeId: null,
    x: position.x,
    y: position.y,
    hp: definition.maxHp,
    maxHp: definition.maxHp,
    mp: definition.maxMp,
    maxMp: definition.maxMp,
    mana: createMana(definition.stats.magicLevel),
    actions: createActions(definition.stats, definition.equipment),
    spellsCast: 0,
    stats: definition.stats,
    equipment: definition.equipment,
    weapons:
      definition.equipment.weaponId === null ? [] : [definition.equipment.weaponId],
    awareness: 'dormant',
    fleeing: false,
    home: { x: home.x, y: home.y },
    lastKnown: null,
    alertTurns: 0,
    hasShouted: false,
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
  const mapEnemies = map.enemies;
  // BSP no aporta `map.enemies`; su colocación histórica de 4 fichas sigue
  // viva como fallback. Un generador que sí los aporta (growth) los consume.
  const placement = mapEnemies === undefined ? placeMapEnemies(map) : null;

  const playerPosition = map.spawns.party?.[0] ?? map.spawns.player;

  return {
    grid: { width: map.width, height: map.height, tiles: map.tiles },
    map,
    players: [
      createPlayerFromArchetype('warrior', {
        id: 'player-1',
        position: playerPosition,
      }),
    ],
    enemies:
      mapEnemies !== undefined
        ? mapEnemies.map((enemy) =>
            createEnemy(
              enemy.id,
              { x: enemy.x, y: enemy.y },
              enemy.type,
              enemy.home,
            ),
          )
        : placement
          ? placement.map((enemy) => createEnemy(enemy.id, enemy, enemy.type))
          : [createEnemy('enemy-1', map.spawns.enemy, 'sentinel')],
    phase: 'player',
    turn: 1,
    status: 'playing',
    rng: createRng(map.seed),
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
    config.generator ?? new GrowthMapGenerator(),
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

/**
 * Aplica un paso ya validado del jugador y evalúa la percepción enemiga
 * inmediatamente después. El evento `EnemySpotted` va después del `UnitMoved`
 * del paso que cruza la vista.
 */
function commitPlayerStep(
  state: GameState,
  unit: Unit,
  dx: number,
  dy: number,
): { readonly state: GameState; readonly events: readonly GameEvent[] } {
  const moved = commitMove(state, unit, dx, dy);
  const detected = detectEnemiesAfterStep(moved.state);
  return {
    state: detected.state,
    events: [...moved.events, ...detected.events],
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

  const step = commitPlayerStep(state, unit, command.dx, command.dy);
  return { state: step.state, events: step.events };
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

    const result = commitPlayerStep(current, unit, dx, dy);
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
    if (!hasAction(unit)) {
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

  if (reachedAttackTile && hasAction(unit)) {
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
 * `CastSpell` valida la fase en el motor, como el resto de comandos, y delega
 * la resolución atómica en `magic.castSpell`. Un rechazo devuelve el estado
 * original sin consumir acción, maná, RNG ni cupo.
 */
function reduceCastSpell(
  state: GameState,
  command: Extract<Command, { type: 'CastSpell' }>,
): ReduceResult {
  if (state.phase !== 'player') {
    return reject(state, command, 'wrong-phase');
  }

  const caster = state.players.find((player) => player.id === command.unitId);
  if (!caster) {
    return reject(state, command, 'unknown-unit');
  }

  const result = castSpell(
    state,
    caster.id,
    command.spellId,
    command.target,
  );
  if (!result.ok) {
    return reject(state, command, result.reason);
  }

  const events: GameEvent[] = [...result.events];
  const next = applyTerminal(result.state, events);
  return { state: next, events };
}

function reducePickUp(
  state: GameState,
  command: Extract<Command, { type: 'PickUp' }>,
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

  const map = state.map;
  if (!map) {
    return reject(state, command, 'no-weapon');
  }

  const weapon = map.weapons?.find(
    (candidate) => candidate.x === unit.x && candidate.y === unit.y,
  );
  if (!weapon) {
    return reject(state, command, 'no-weapon');
  }
  if (unit.mp < PICKUP_COST) {
    return reject(state, command, 'no-mp');
  }

  const alreadyOwned = unit.weapons.includes(weapon.weaponId);
  if (!alreadyOwned && unit.weapons.length >= MAX_WEAPONS) {
    return reject(state, command, 'inventory-full');
  }

  const nextUnit: Unit = {
    ...unit,
    mp: unit.mp - PICKUP_COST,
    weapons: alreadyOwned ? unit.weapons : [...unit.weapons, weapon.weaponId],
    equipment: { ...unit.equipment, weaponId: weapon.weaponId },
  };

  return {
    state: {
      ...state,
      players: state.players.map((candidate) =>
        candidate.id === unit.id ? nextUnit : candidate,
      ),
      map: {
        ...map,
        weapons: (map.weapons ?? []).filter((candidate) => candidate.id !== weapon.id),
      },
    },
    events: [],
  };
}

function reduceSelectWeapon(
  state: GameState,
  command: Extract<Command, { type: 'SelectWeapon' }>,
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
  if (
    !Number.isInteger(command.slot) ||
    command.slot < 1 ||
    command.slot > MAX_WEAPONS
  ) {
    return reject(state, command, 'invalid-slot');
  }

  const weaponId = unit.weapons[command.slot - 1];
  if (!weaponId) {
    return reject(state, command, 'invalid-slot');
  }
  if (unit.equipment.weaponId === weaponId) {
    return { state, events: [] };
  }

  const nextUnit: Unit = {
    ...unit,
    equipment: { ...unit.equipment, weaponId },
  };

  return {
    state: {
      ...state,
      players: state.players.map((candidate) =>
        candidate.id === unit.id ? nextUnit : candidate,
      ),
    },
    events: [],
  };
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
    case 'PickUp':
      return reducePickUp(state, command);
    case 'SelectWeapon':
      return reduceSelectWeapon(state, command);
    case 'CastSpell':
      return reduceCastSpell(state, command);
    case 'EndTurn':
      if (state.phase !== 'player') {
        return reject(state, command, 'wrong-phase');
      }
      return resolveEndTurn(state);
  }
}
