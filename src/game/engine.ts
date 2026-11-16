import { createActions, hasAction } from './actions';
import { isAlive, isGhost } from './grid';
import {
  createInventory,
  dropItem,
  equipItem,
  equipmentFromLegacy,
  inspectContainer,
  itemInstance,
  pickUpItem,
  takeAllContainerItems,
  takeContainerItem,
  unequipItem,
  type InventoryCost,
  type InventorySource,
} from './inventory';
import { commitMove, validateMove } from './movement';
import { traitEquipmentEvents } from './stats';
import { applyTerminal, closeTurnAfterActiveDeath, resolveEndTurn } from './turn';
import { resolveAttack } from './combat';
import { castSpell } from './magic';import { planCursorTarget, type CursorBlockedReason } from './path';
import { detectEnemiesAfterStep } from './perception';
import { GrowthMapGenerator } from './chambers/variants/growth';
import { createRng } from './rng';
import { rollEnemyLoot } from './loot';
import { generateChests } from './chests';
import { BESTIARY, type EnemyType } from './bestiary';
import { placeMapEnemies } from './enemy-placement';
import { createMana } from './mana';
import {
  DEFAULT_PLAYER_CONFIGS,
  validateGameConfig,
  type GameConfig,
  type PlayerConfig,
} from './config';
import {
  DEFAULT_MAP_SEED,
  normalizeSeed,
  type GeneratedMap,
  type MapGenerator,
  type MapOptions,
} from './map';
import { createPlayerFromArchetype } from './roster';
import {
  MOVE_COST,
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
  /** Jugadores en orden de turno; sin lista, un Guerrero variante 1. */
  readonly players?: readonly PlayerConfig[];
}

/**
 * Crea un enemigo con las estadísticas y el equipo de la tabla del bestiario.
 * La saqueabilidad se tira al crear la instancia con un RNG derivado de la
 * semilla y del ID del enemigo (REQ-034 T-002/T-003).
 */
function createEnemy(
  id: string,
  position: Position,
  type: EnemyType,
  seed: number,
  home: Position = position,
): Unit {
  const definition = BESTIARY[type];
  const loot = rollEnemyLoot(
    seed,
    id,
    equipmentFromLegacy(id, definition.equipment),
    createInventory(),
  );

  return {
    id,
    nombre: definition.name,
    faction: 'enemy',
    enemyType: type,
    archetypeId: null,
    variant: null,
    x: position.x,
    y: position.y,
    hp: definition.maxHp,
    maxHp: definition.maxHp,
    baseMaxHp: definition.maxHp,
    mp: definition.maxMp,
    maxMp: definition.maxMp,
    baseMaxMp: definition.maxMp,
    mana: createMana(definition.stats.magicLevel),
    actions: createActions(definition.stats),
    spellsCast: 0,
    stats: definition.stats,
    equipment: loot.equipment,
    inventory: loot.inventory,
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
  gameConfig: GameConfig,
  options: MapOptions | undefined,
): GameState {
  // Validar antes de generar: una configuración inválida no crea mapa ni estado.
  const config = validateGameConfig(gameConfig);
  const seed = normalizeSeed(config.seed);
  const generated: GeneratedMap = generator.generate(seed, options);
  const mapEnemies = generated.enemies;
  // BSP no aporta `map.enemies`; su colocación histórica de 4 fichas sigue
  // viva como fallback. Un generador que sí los aporta (growth) los consume.
  const placement = mapEnemies === undefined ? placeMapEnemies(generated) : null;

  const party = generated.spawns.party;
  const players = config.players.map((player, index) =>
    createPlayerFromArchetype(player.archetypeId, {
      id: `player-${index + 1}`,
      // Con un generador sin seis huecos se usa el hueco 0 como respaldo
      // documentado; nunca se inventan posiciones sobre muros.
      position: party?.[index] ?? party?.[0] ?? generated.spawns.player,
      ...(player.name === '' ? {} : { name: player.name }),
      variant: player.variant,
    }),
  );
  // El mapa conserva las armas como dato de generación, pero el estado solo
  // expone la verdad nueva: instancias en el suelo.
  const { weapons: generatedWeapons = [], ...map } = generated;
  const groundItems = generatedWeapons.map((weapon) => ({
    ...itemInstance(`item-${weapon.id}`, weapon.weaponId),
    x: weapon.x,
    y: weapon.y,
  }));

  // Cofres por sala con botín orientado al equipo del grupo (REQ-020/ADR-033).
  // Se genera sobre el mapa completo (con armas) para no pisar ninguna celda
  // ocupada; usa un PRNG propio y no consume el RNG de combate. Cuando el
  // generador no declara `map.enemies` (BSP), las fichas colocadas por
  // `placeMapEnemies` se pasan como celdas bloqueadas.
  const chests = generateChests(
    generated,
    players.map((player) => player.equipment),
    placement
      ? { blockedCells: placement.map((enemy) => ({ x: enemy.x, y: enemy.y })) }
      : {},
  );

  return {
    grid: { width: map.width, height: map.height, tiles: map.tiles },
    map,
    groundItems,
    players,
    enemies:
      mapEnemies !== undefined
        ? mapEnemies.map((enemy) =>
            createEnemy(
              enemy.id,
              { x: enemy.x, y: enemy.y },
              enemy.type,
              seed,
              enemy.home,
            ),
          )
        : placement
          ? placement.map((enemy) => createEnemy(enemy.id, enemy, enemy.type, seed))
          : [createEnemy('enemy-1', map.spawns.enemy, 'sentinel', seed)],
    config: {
      seed,
      players: config.players.map((player) => ({ ...player })),
    },
    phase: 'player',
    activePlayerId: players[0]?.id ?? null,
    round: 1,
    status: 'playing',
    rng: createRng(map.seed),
    containers: chests,
  };
}

/**
 * Crea el estado inicial generando el mapa.
 *
 * Acepta la forma principal `createInitialState({ seed, options, generator,
 * players })` y, por compatibilidad con ADR-007, `createInitialState(generator,
 * options)`. Es la única ruta de construcción del estado inicial.
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
      { seed: DEFAULT_MAP_SEED, players: DEFAULT_PLAYER_CONFIGS },
      maybeOptions,
    );
  }

  const config = configOrGenerator;
  return buildInitialState(
    config.generator ?? new GrowthMapGenerator(),
    {
      seed: config.seed ?? DEFAULT_MAP_SEED,
      players: config.players ?? DEFAULT_PLAYER_CONFIGS,
    },
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

/**
 * Opciones de movimiento de una unidad: el fantasma comparte casilla con los
 * vivos y no los trata como bloqueo (REQ-021 R-003).
 */
function moveOptions(unit: Unit): { readonly ignoreUnits: true } | undefined {
  return isGhost(unit) ? { ignoreUnits: true } : undefined;
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
  if (unit.id !== state.activePlayerId) {
    return reject(state, command, 'not-active');
  }
  if (!isAlive(unit) && !isGhost(unit)) {
    return reject(state, command, 'dead-unit');
  }
  if (unit.mp < MOVE_COST) {
    return reject(state, command, 'no-mp');
  }

  const validation = validateMove(state, unit, command.dx, command.dy, moveOptions(unit));
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
    if (!isAlive(unit) && !isGhost(unit)) return { ok: false, reason: 'dead-unit' };

    const dx = step.x - unit.x;
    const dy = step.y - unit.y;
    const validation = validateMove(current, unit, dx, dy, moveOptions(unit));
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
  if (unit.id !== state.activePlayerId) {
    return reject(state, command, 'not-active');
  }
  if (!isAlive(unit) && !isGhost(unit)) {
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
  if (attacker.id !== state.activePlayerId) {
    return reject(state, command, 'not-active');
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
  if (caster.id !== state.activePlayerId) {
    return reject(state, command, 'not-active');
  }

  const result = castSpell(
    state,
    caster.id,
    command.spellId,
    command.target,
    command.targetId,
  );
  if (!result.ok) {
    return reject(state, command, result.reason);
  }

  const events: GameEvent[] = [...result.events];
  const next = applyTerminal(result.state, events);
  return { state: next, events };
}

/** Valida fase y unidad operativa; el fantasma solo entra donde se permite. */
function inventoryUnit(
  state: GameState,
  command: Command,
  unitId: string,
  allowGhost = false,
): { readonly ok: true; readonly unit: Unit } | { readonly ok: false; readonly result: ReduceResult } {
  if (state.phase !== 'player') {
    return { ok: false, result: reject(state, command, 'wrong-phase') };
  }
  const unit = state.players.find((player) => player.id === unitId);
  if (!unit) {
    return { ok: false, result: reject(state, command, 'unknown-unit') };
  }
  if (unit.id !== state.activePlayerId) {
    return { ok: false, result: reject(state, command, 'not-active') };
  }
  if (!isAlive(unit) && !(allowGhost && isGhost(unit))) {
    return { ok: false, result: reject(state, command, 'dead-unit') };
  }
  return { ok: true, unit };
}

function reduceInventory(
  state: GameState,
  command: Command,
  operation: () => { ok: true; state: GameState } | { ok: false; reason: RejectionReason },
): ReduceResult {
  const result = operation();
  if (!result.ok) return reject(state, command, result.reason);

  const events: GameEvent[] = [];
  for (const unit of state.players) {
    const next = result.state.players.find((candidate) => candidate.id === unit.id);
    if (next) events.push(...traitEquipmentEvents(unit, next));
  }
  for (const unit of state.enemies) {
    const next = result.state.enemies.find((candidate) => candidate.id === unit.id);
    if (next) events.push(...traitEquipmentEvents(unit, next));
  }
  return { state: result.state, events };
}

/** Los vivos pagan 1 MP; el fantasma paga su única acción (REQ-021/REQ-026). */
function inventoryCostFor(unit: Unit): InventoryCost {
  return isGhost(unit) ? 'action' : 'mp';
}

function reducePickUp(
  state: GameState,
  command: Extract<Command, { type: 'PickUp' }>,
): ReduceResult {
  const checked = inventoryUnit(state, command, command.unitId, true);
  if (!checked.ok) return checked.result;
  return reduceInventory(state, command, () =>
    pickUpItem(state, checked.unit.id, inventoryCostFor(checked.unit)),
  );
}

/**
 * `TakeItem` (REQ-034 R-006/T-006): saqueo de un cadáver del mismo tile. Un
 * vivo no paga acción ni MP; el fantasma paga una acción por objeto.
 */
function reduceTakeItem(
  state: GameState,
  command: Extract<Command, { type: 'TakeItem' }>,
): ReduceResult {
  const checked = inventoryUnit(state, command, command.unitId, true);
  if (!checked.ok) return checked.result;
  return reduceInventory(state, command, () =>
    takeContainerItem(
      state,
      checked.unit.id,
      command.containerId,
      command.itemId,
      isGhost(checked.unit) ? 'action' : 'none',
    ),
  );
}

/**
 * `TakeAll` (REQ-034 R-006): solo un vivo. El fantasma mueve un objeto por
 * acción y no dispone de «coger todo»; se rechaza sin cambios.
 */
function reduceTakeAll(
  state: GameState,
  command: Extract<Command, { type: 'TakeAll' }>,
): ReduceResult {
  if (state.phase !== 'player') {
    return reject(state, command, 'wrong-phase');
  }
  const unit = state.players.find((player) => player.id === command.unitId);
  if (!unit) return reject(state, command, 'unknown-unit');
  if (unit.id !== state.activePlayerId) {
    return reject(state, command, 'not-active');
  }
  if (!isAlive(unit)) {
    return reject(state, command, isGhost(unit) ? 'invalid-target' : 'dead-unit');
  }
  return reduceInventory(state, command, () =>
    takeAllContainerItems(state, unit.id, command.containerId),
  );
}

function reduceEquipItem(
  state: GameState,
  command: Extract<Command, { type: 'EquipItem' }>,
): ReduceResult {
  const checked = inventoryUnit(state, command, command.unitId);
  if (!checked.ok) return checked.result;

  const source: InventorySource =
    command.from === 'backpack'
      ? { kind: 'backpack', index: command.index }
      : command.from === 'ground'
        ? { kind: 'ground', itemId: command.itemId }
        : {
            kind: 'container',
            containerId: command.containerId,
            itemId: command.itemId,
          };
  return reduceInventory(state, command, () => equipItem(state, checked.unit.id, source));
}

function reduceUnequipItem(
  state: GameState,
  command: Extract<Command, { type: 'UnequipItem' }>,
): ReduceResult {
  const checked = inventoryUnit(state, command, command.unitId);
  if (!checked.ok) return checked.result;
  return reduceInventory(state, command, () =>
    unequipItem(state, checked.unit.id, command.slot),
  );
}

function reduceDropItem(
  state: GameState,
  command: Extract<Command, { type: 'DropItem' }>,
): ReduceResult {
  const checked = inventoryUnit(state, command, command.unitId, true);
  if (!checked.ok) return checked.result;
  const source =
    command.from === 'backpack'
      ? { kind: 'backpack' as const, index: command.index }
      : { kind: 'slot' as const, slot: command.slot };
  return reduceInventory(state, command, () =>
    dropItem(state, checked.unit.id, source, inventoryCostFor(checked.unit)),
  );
}

/** Puente hasta TASK-0095: `1`-`3` equipan los tres primeros huecos. */
function reduceSelectWeapon(
  state: GameState,
  command: Extract<Command, { type: 'SelectWeapon' }>,
): ReduceResult {
  const checked = inventoryUnit(state, command, command.unitId);
  if (!checked.ok) return checked.result;
  if (!Number.isInteger(command.slot) || command.slot < 1 || command.slot > 3) {
    return reject(state, command, 'invalid-slot');
  }
  return reduceInventory(state, command, () =>
    equipItem(state, checked.unit.id, { kind: 'backpack', index: command.slot - 1 }),
  );
}

/**
 * `InspectContainer` (REQ-021 R-006/T-005): solo fantasmas en fase de jugador.
 * Devuelve el contenido seguro sin abrir, sin mutar el estado, sin gastar
 * acción ni MP y sin revelar trampa.
 */
function reduceInspectContainer(
  state: GameState,
  command: Extract<Command, { type: 'InspectContainer' }>,
): ReduceResult {
  if (state.phase !== 'player') {
    return reject(state, command, 'wrong-phase');
  }

  const unit = state.players.find((player) => player.id === command.unitId);
  if (!unit) {
    return reject(state, command, 'unknown-unit');
  }
  if (unit.id !== state.activePlayerId) {
    return reject(state, command, 'not-active');
  }
  if (!isGhost(unit)) {
    return reject(state, command, 'not-ghost');
  }

  const inspection = inspectContainer(state, command.containerId);
  if (!inspection) {
    return reject(state, command, 'unknown-container');
  }

  return {
    state,
    events: [
      {
        type: 'ContainerInspected',
        unitId: unit.id,
        containerId: inspection.containerId,
        items: inspection.items,
      },
    ],
  };
}

/**
 * `EndTurn` cierra el turno del activo (REQ-031 T-002/T-003). Un `unitId`
 * explícito debe coincidir con `activePlayerId`; sin activo válido o con un
 * muerto sin fantasma se rechaza sin cambios.
 */
function reduceEndTurn(
  state: GameState,
  command: Extract<Command, { type: 'EndTurn' }>,
): ReduceResult {
  if (state.phase !== 'player') {
    return reject(state, command, 'wrong-phase');
  }

  const activeId = state.activePlayerId;
  if (activeId === null) {
    return reject(state, command, 'invalid-active');
  }
  const active = state.players.find((unit) => unit.id === activeId);
  if (!active) {
    return reject(state, command, 'invalid-active');
  }
  if (command.unitId !== undefined && command.unitId !== activeId) {
    return reject(state, command, 'not-active');
  }
  if (!isAlive(active) && !isGhost(active)) {
    return reject(state, command, 'dead-unit');
  }

  return resolveEndTurn(state);
}

type PlayCommand = Exclude<Command, { type: 'Restart' }>;

/**
 * Aplica el comando al estado sin cerrar el turno. `reduce` envuelve esta
 * función para añadir el cierre por muerte del activo (REQ-031 R-015).
 */
function dispatchCommand(state: GameState, command: PlayCommand): ReduceResult {
  switch (command.type) {
    case 'Move':
      return reduceMove(state, command);
    case 'MoveTo':
      return reduceMoveTo(state, command);
    case 'Attack':
      return reduceAttack(state, command);
    case 'PickUp':
      return reducePickUp(state, command);
    case 'TakeItem':
      return reduceTakeItem(state, command);
    case 'TakeAll':
      return reduceTakeAll(state, command);
    case 'EquipItem':
      return reduceEquipItem(state, command);
    case 'UnequipItem':
      return reduceUnequipItem(state, command);
    case 'DropItem':
      return reduceDropItem(state, command);
    case 'SelectWeapon':
      return reduceSelectWeapon(state, command);
    case 'CastSpell':
      return reduceCastSpell(state, command);
    case 'InspectContainer':
      return reduceInspectContainer(state, command);
    case 'EndTurn':
      return reduceEndTurn(state, command);
  }
}

/**
 * Reducción pura: recibe el estado y un comando y devuelve un estado nuevo
 * (o el mismo si se rechaza) más los eventos ocurridos. No muta la entrada.
 *
 * Si el activo estaba vivo antes del comando y la acción lo deja muerto sin
 * terminar la partida, cierra su turno después de resolver el comando completo
 * (REQ-031 R-015). `EndTurn` ya cierra el turno por su propia vía.
 */
export function reduce(state: GameState, command: Command): ReduceResult {
  if (command.type === 'Restart') {
    const config = state.config;
    return {
      state: config
        ? createInitialState({ seed: config.seed, players: config.players })
        : createInitialState(),
      events: [{ type: 'GameRestarted' }],
    };
  }

  if (state.status !== 'playing') {
    return reject(state, command, 'game-over');
  }

  const activeId = state.activePlayerId;
  const activeWasAlive =
    activeId !== null &&
    state.players.some((unit) => unit.id === activeId && isAlive(unit));

  const result = dispatchCommand(state, command);

  if (command.type === 'EndTurn' || !activeWasAlive || activeId === null) {
    return result;
  }

  const closed = closeTurnAfterActiveDeath(result.state, activeId);
  if (!closed) return result;

  return {
    state: closed.state,
    events: [...result.events, ...closed.events],
    ...(closed.enemyPhase === undefined ? {} : { enemyPhase: closed.enemyPhase }),
  };
}
