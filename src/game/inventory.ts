/**
 * Inventario y equipo por instancias (REQ-018 T-002/T-003/T-005/T-006).
 *
 * Cada objeto es una instancia con ID propio y vive exactamente en un sitio:
 * un hueco de mochila, un hueco de equipo, el suelo o un contenedor. La verdad es
 * la contención: `Unit.inventory.items`, `Unit.equipment`, `GameState.groundItems`
 * y `GameState.containers`. La localización se deriva de ahí; no hay listas de
 * IDs paralelas.
 *
 * El módulo es puro: no conoce DOM, host, red ni relojes. Las cuatro operaciones
 * (recoger, equipar, desequipar y soltar) son atómicas, cuestan 1 MP y no gastan
 * acción. Validan sobre el estado resultante antes de construir la salida.
 */

import {
  ITEMS,
  type EquipmentSlot,
  type ItemDefinition,
  type ItemId,
} from './equipment';
import { hasAction, spendAction } from './actions';
import type { GameState, RejectionReason, Unit } from './types';

/** Instancia de un objeto del catálogo con ID estable y único. */
export interface ItemInstance {
  readonly id: string;
  readonly itemId: ItemId;
  /**
   * Saqueable al morir su portador (REQ-034 R-002); se fija al crear la
   * instancia y se conserva al moverse. Jugador, suelo y cofres nacen con `true`.
   */
  readonly lootable: boolean;
}

/** Crea una instancia con su marca de saqueabilidad; por defecto, saqueable. */
export function itemInstance(
  id: string,
  itemId: ItemId,
  lootable = true,
): ItemInstance {
  return { id, itemId, lootable };
}

/** Mochila personal de capacidad paramétrica; el equipo puesto no cuenta. */
export interface Inventory {
  readonly capacity: number;
  readonly items: readonly (ItemInstance | null)[];
}

/** Ocho huecos de equipo; cada uno guarda una instancia o `null`. */
export type EquipmentSlots = {
  readonly [Slot in EquipmentSlot]: ItemInstance | null;
};

/** Instancia colocada en el suelo de una casilla. */
export interface GroundItem extends ItemInstance {
  readonly x: number;
  readonly y: number;
}

/**
 * Contenedor con capacidad e instancias. Los cofres y fixtures sin `kind`
 * siguen siendo válidos: la ampliación de REQ-021/REQ-034 es aditiva.
 *
 * Riesgo asumido: REQ-020 puede revisar el modelo de contenedores antes de
 * publicar la v1 de guardado; `kind` y `corpseOf` son opcionales para no atar
 * ese diseño. No hay una segunda estructura de contenedores.
 */
export interface Container {
  readonly id: string;
  readonly x: number;
  readonly y: number;
  readonly capacity: number;
  readonly items: readonly (ItemInstance | null)[];
  /** Tipo de contenedor; ausente en cofres y fixtures anteriores. */
  readonly kind?: 'chest' | 'corpse';
  /** ID de la unidad cuyo cadáver es este contenedor (REQ-021 T-001). */
  readonly corpseOf?: string;
}

/** Capacidad de mochila por defecto (REQ-018 R-010). */
export const DEFAULT_BACKPACK_CAPACITY = 8;

/** Coste en MP de recoger, equipar, desequipar o soltar (REQ-018 R-012/R-013). */
export const INVENTORY_OPERATION_COST = 1;

/**
 * Recurso que paga una operación de inventario. Los vivos pagan 1 MP; el
 * fantasma paga una acción y 0 MP (REQ-021 R-002/R-005, REQ-026 R-010).
 */
export type InventoryCost = 'mp' | 'action';

/**
 * Coste de saquear un cadáver (REQ-034 R-006): gratis para el vivo y una acción
 * por objeto para el fantasma. Nunca gasta MP.
 */
export type ContainerTakeCost = 'none' | 'action';

export type InventorySource =
  | { readonly kind: 'backpack'; readonly index: number }
  | { readonly kind: 'ground'; readonly itemId: string }
  | { readonly kind: 'container'; readonly containerId: string; readonly itemId: string };

export type DropSource =
  | { readonly kind: 'backpack'; readonly index: number }
  | { readonly kind: 'slot'; readonly slot: EquipmentSlot };

export type InventoryResult =
  | { readonly ok: true; readonly state: GameState }
  | { readonly ok: false; readonly reason: RejectionReason };

function fail(reason: RejectionReason): InventoryResult {
  return { ok: false, reason };
}

export function instanceId(owner: string, suffix: string | number): string {
  return `item-${owner}-${suffix}`;
}

/** Ocho huecos vacíos, en el orden estable de `EQUIPMENT_SLOTS`. */
export function emptyEquipment(): EquipmentSlots {
  return {
    weapon: null,
    shield: null,
    armor: null,
    head: null,
    feet: null,
    hands: null,
    neck: null,
    ring: null,
  };
}

/** Mochila de capacidad fija con huecos `null`; el equipo puesto no cuenta. */
export function createInventory(capacity = DEFAULT_BACKPACK_CAPACITY): Inventory {
  return { capacity, items: Array.from({ length: capacity }, () => null) };
}

export function itemDefinition(itemId: ItemId) {
  return ITEMS[itemId];
}

/** Hueco de equipo que admite la definición de un objeto del catálogo. */
export function slotForItem(itemId: ItemId): EquipmentSlot {
  return ITEMS[itemId].slot;
}

export function equippedItem(
  equipment: EquipmentSlots,
  slot: EquipmentSlot,
): ItemInstance | null {
  return equipment[slot];
}

export function equippedItems(equipment: EquipmentSlots): readonly ItemInstance[] {
  return Object.values(equipment).filter(
    (instance): instance is ItemInstance => instance !== null,
  );
}

/** Definición del arma equipada, o `null` si el hueco está vacío. */
export function equippedWeaponId(unit: Pick<Unit, 'equipment'>): ItemId | null {
  return unit.equipment.weapon?.itemId ?? null;
}

export function equippedArmorId(unit: Pick<Unit, 'equipment'>): ItemId | null {
  return unit.equipment.armor?.itemId ?? null;
}

export function equippedShieldId(unit: Pick<Unit, 'equipment'>): ItemId | null {
  return unit.equipment.shield?.itemId ?? null;
}

/** Número de objetos guardados en la mochila. */
export function backpackCount(inventory: Inventory): number {
  return inventory.items.filter((item) => item !== null).length;
}

export function backpackFirstFree(inventory: Inventory): number {
  return inventory.items.findIndex((item) => item === null);
}

export function backpackHasRoom(inventory: Inventory): boolean {
  return backpackFirstFree(inventory) >= 0;
}

/**
 * Coloca una instancia en el primer hueco libre (o en `preferred` si sigue
 * libre). Devuelve `null` si no cabe; nunca muta la entrada.
 */
export function withBackpackItem(
  inventory: Inventory,
  item: ItemInstance,
  preferred?: number,
): Inventory | null {
  const items = [...inventory.items];
  const target =
    preferred !== undefined && preferred >= 0 && preferred < items.length && items[preferred] === null
      ? preferred
      : items.findIndex((candidate) => candidate === null);
  if (target < 0) return null;
  items[target] = item;
  return { capacity: inventory.capacity, items };
}

/** Vacía un hueco concreto; el hueco sigue existiendo. */
export function withoutBackpackItem(inventory: Inventory, index: number): Inventory {
  if (!Number.isInteger(index) || index < 0 || index >= inventory.items.length) {
    return inventory;
  }
  const items = [...inventory.items];
  items[index] = null;
  return { capacity: inventory.capacity, items };
}

/** Convierte el equipo inicial legacy del roster/bestiario a ocho huecos. */
export interface LegacyEquipmentInput {
  readonly weaponId: ItemId | null;
  readonly armorId: ItemId | null;
  readonly shieldId: ItemId | null;
  readonly actionsBonus?: number;
}

export function equipmentFromLegacy(
  owner: string,
  legacy: LegacyEquipmentInput,
): EquipmentSlots {
  return {
    ...emptyEquipment(),
    weapon:
      legacy.weaponId === null
        ? null
        : itemInstance(instanceId(owner, 'weapon'), legacy.weaponId),
    armor:
      legacy.armorId === null
        ? null
        : itemInstance(instanceId(owner, 'armor'), legacy.armorId),
    shield:
      legacy.shieldId === null
        ? null
        : itemInstance(instanceId(owner, 'shield'), legacy.shieldId),
  };
}

/** Mochila con instancias deterministas; usada por fixtures y tests. */
export function inventoryFromIds(
  owner: string,
  itemIds: readonly ItemId[],
  capacity = DEFAULT_BACKPACK_CAPACITY,
): Inventory {
  const inventory = createInventory(Math.max(capacity, itemIds.length));
  const items = [...inventory.items];
  itemIds.forEach((itemId, index) => {
    items[index] = itemInstance(instanceId(owner, `backpack-${index}`), itemId);
  });
  return { capacity: inventory.capacity, items };
}

function replaceUnit(state: GameState, unit: Unit): GameState {
  return {
    ...state,
    players: state.players.map((candidate) => (candidate.id === unit.id ? unit : candidate)),
  };
}

function replaceContainer(state: GameState, container: Container): GameState {
  return {
    ...state,
    containers: (state.containers ?? []).map((candidate) =>
      candidate.id === container.id ? container : candidate,
    ),
  };
}

function groundItems(state: GameState): readonly GroundItem[] {
  return state.groundItems ?? [];
}

function containerById(state: GameState, id: string): Container | undefined {
  return (state.containers ?? []).find((container) => container.id === id);
}

/**
 * Retira del estado el cadáver de enemigo que se ha quedado sin instancias
 * (REQ-034 T-007). El cadáver de jugador se conserva con huecos `null` como
 * objetivo de resurrección (REQ-021 R-007). Es la ruta única de retirada: los
 * cofres y fixtures sin `corpseOf` de enemigo nunca se eliminan aquí.
 */
function withoutEmptyEnemyCorpse(state: GameState, container: Container): GameState {
  if (container.kind !== 'corpse' || container.corpseOf === undefined) return state;
  if (container.items.some((item) => item !== null)) return state;
  const isEnemyCorpse = state.enemies.some((unit) => unit.id === container.corpseOf);
  if (!isEnemyCorpse) return state;
  return {
    ...state,
    containers: (state.containers ?? []).filter(
      (candidate) => candidate.id !== container.id,
    ),
  };
}

function groundItemAt(state: GameState, x: number, y: number): GroundItem | undefined {
  return groundItems(state).find((item) => item.x === x && item.y === y);
}

function spendMp(unit: Unit): Unit | null {
  if (unit.mp < INVENTORY_OPERATION_COST) return null;
  return { ...unit, mp: unit.mp - INVENTORY_OPERATION_COST };
}

/**
 * Paga el coste explícito de una operación. `mp` es el modo de los vivos y
 * `action` el del fantasma: ni gasta MP ni puede operar sin su única acción.
 */
function payInventoryCost(
  unit: Unit,
  cost: InventoryCost,
): { readonly unit: Unit } | { readonly reason: RejectionReason } {
  if (cost === 'action') {
    if (!hasAction(unit)) return { reason: 'no-action' };
    return { unit: spendAction(unit) };
  }
  const paid = spendMp(unit);
  return paid ? { unit: paid } : { reason: 'no-mp' };
}

function groundWithout(state: GameState, instance: string): readonly GroundItem[] {
  return groundItems(state).filter((item) => item.id !== instance);
}

/**
 * Recoger (suelo → mochila). Sin auto-equipar. Con la mochila llena se rechaza
 * sin tocar suelo ni mochila (REQ-026 R-010, REQ-018 R-013). El modo de coste
 * es explícito: `mp` para vivos y `action` para el fantasma.
 */
export function pickUpItem(
  state: GameState,
  unitId: string,
  cost: InventoryCost = 'mp',
): InventoryResult {
  const unit = state.players.find((candidate) => candidate.id === unitId);
  if (!unit) return fail('unknown-unit');

  const ground = groundItemAt(state, unit.x, unit.y);
  if (!ground) return fail('no-item');

  const charged = payInventoryCost(unit, cost);
  if ('reason' in charged) return fail(charged.reason);
  const nextUnit = charged.unit;

  const inventory = withBackpackItem(
    nextUnit.inventory,
    itemInstance(ground.id, ground.itemId, ground.lootable),
  );
  if (!inventory) return fail('inventory-full');

  return {
    ok: true,
    state: replaceUnit(
      { ...state, groundItems: groundWithout(state, ground.id) },
      { ...nextUnit, inventory },
    ),
  };
}

interface LocatedItem {
  readonly instance: ItemInstance;
  /** Estado tras retirar la instancia de su origen (aún sin tocar el equipo). */
  readonly state: GameState;
  readonly unit: Unit;
  /** Hueco de mochila liberado por el origen, si venía de la mochila. */
  readonly freedIndex?: number;
}

function locateSource(
  state: GameState,
  unit: Unit,
  source: InventorySource,
): LocatedItem | { readonly error: RejectionReason } {
  if (source.kind === 'backpack') {
    if (
      !Number.isInteger(source.index) ||
      source.index < 0 ||
      source.index >= unit.inventory.items.length
    ) {
      return { error: 'invalid-slot' };
    }
    const instance = unit.inventory.items[source.index];
    if (!instance) return { error: 'no-item' };
    const inventory = withoutBackpackItem(unit.inventory, source.index);
    return {
      instance,
      state,
      unit: { ...unit, inventory },
      freedIndex: source.index,
    };
  }

  if (source.kind === 'ground') {
    // Varias instancias pueden compartir casilla: el comando trae el ID exacto.
    const ground = groundItems(state).find(
      (item) =>
        item.id === source.itemId && item.x === unit.x && item.y === unit.y,
    );
    if (!ground) return { error: 'no-item' };
    return {
      instance: itemInstance(ground.id, ground.itemId, ground.lootable),
      state: { ...state, groundItems: groundWithout(state, ground.id) },
      unit,
    };
  }

  const container = containerById(state, source.containerId);
  if (!container) return { error: 'unknown-container' };
  // Saquear un cadáver exige estar en su mismo tile (REQ-034 R-006); un cofre
  // conserva su propia regla de apertura y no pasa por aquí.
  if (
    container.kind === 'corpse' &&
    (container.x !== unit.x || container.y !== unit.y)
  ) {
    return { error: 'not-same-tile' };
  }
  const index = container.items.findIndex((item) => item?.id === source.itemId);
  const instance = index < 0 ? null : container.items[index];
  if (!instance) return { error: 'no-item' };
  const items = [...container.items];
  items[index] = null;
  const updated: Container = { ...container, items };
  return {
    instance,
    state: withoutEmptyEnemyCorpse(replaceContainer(state, updated), updated),
    unit,
  };
}

function payTakeCost(
  unit: Unit,
  cost: ContainerTakeCost,
): { readonly unit: Unit } | { readonly reason: RejectionReason } {
  if (cost === 'none') return { unit };
  return payInventoryCost(unit, 'action');
}

/**
 * Saca un objeto de un cadáver-contenedor a la mochila (REQ-034 R-006/T-006).
 *
 * Reutiliza `locateSource`/`withBackpackItem`, la misma maquinaria que equipar:
 * no hay una segunda ruta de saqueo. El contenedor debe ser `kind: 'corpse'` y
 * estar en el tile de la unidad. Un vivo no paga; el fantasma paga una acción.
 * La retirada de la instancia ya aplica `withoutEmptyEnemyCorpse`.
 */
export function takeContainerItem(
  state: GameState,
  unitId: string,
  containerId: string,
  itemId: string,
  cost: ContainerTakeCost = 'none',
): InventoryResult {
  const unit = state.players.find((candidate) => candidate.id === unitId);
  if (!unit) return fail('unknown-unit');

  const container = containerById(state, containerId);
  if (!container || container.kind !== 'corpse') return fail('unknown-container');
  if (container.x !== unit.x || container.y !== unit.y) return fail('not-same-tile');

  const located = locateSource(state, unit, {
    kind: 'container',
    containerId,
    itemId,
  });
  if ('error' in located) return fail(located.error);

  const paid = payTakeCost(located.unit, cost);
  if ('reason' in paid) return fail(paid.reason);

  const inventory = withBackpackItem(paid.unit.inventory, located.instance);
  if (!inventory) return fail('inventory-full');

  return {
    ok: true,
    state: replaceUnit(located.state, { ...paid.unit, inventory }),
  };
}

/**
 * «Coger todo» de un cadáver (REQ-034 R-006, REQ-020 T-003): solo para un vivo,
 * gratis y atómico. Si el contenido no cabe entero en la mochila se rechaza sin
 * mover nada; si cabe, vacía el contenedor y aplica la retirada de cadáver.
 */
export function takeAllContainerItems(
  state: GameState,
  unitId: string,
  containerId: string,
): InventoryResult {
  const unit = state.players.find((candidate) => candidate.id === unitId);
  if (!unit) return fail('unknown-unit');

  const container = containerById(state, containerId);
  if (!container || container.kind !== 'corpse') return fail('unknown-container');
  if (container.x !== unit.x || container.y !== unit.y) return fail('not-same-tile');

  const instances = container.items.filter(
    (item): item is ItemInstance => item !== null,
  );
  const free = unit.inventory.capacity - backpackCount(unit.inventory);
  if (instances.length > free) return fail('inventory-full');

  let inventory = unit.inventory;
  for (const instance of instances) {
    const next = withBackpackItem(inventory, instance);
    if (!next) return fail('inventory-full');
    inventory = next;
  }

  const emptied: Container = { ...container, items: container.items.map(() => null) };
  const nextState = withoutEmptyEnemyCorpse(
    replaceContainer(state, emptied),
    emptied,
  );
  return { ok: true, state: replaceUnit(nextState, { ...unit, inventory }) };
}

/**
 * Equipar (mochila, suelo o contenedor → hueco). Valida categoría, manos y la
 * capacidad del estado resultante. Si el hueco está ocupado, el saliente va a la
 * mochila; si el entrante venía de la mochila, su hueco liberado es el que ocupa
 * el saliente. Un rechazo no mueve nada.
 */
export function equipItem(
  state: GameState,
  unitId: string,
  source: InventorySource,
  catalog: Readonly<Record<string, ItemDefinition>> = ITEMS,
): InventoryResult {
  const baseUnit = state.players.find((candidate) => candidate.id === unitId);
  if (!baseUnit) return fail('unknown-unit');

  const located = locateSource(state, baseUnit, source);
  if ('error' in located) return fail(located.error);

  const nextUnit = spendMp(located.unit);
  if (!nextUnit) return fail('no-mp');

  const definition = catalog[located.instance.itemId];
  if (!definition) return fail('no-item');
  const slot = definition.slot;
  if (!(slot in nextUnit.equipment)) return fail('wrong-slot');

  const currentWeapon = nextUnit.equipment.weapon;
  if (
    slot === 'shield' &&
    currentWeapon !== null &&
    catalog[currentWeapon.itemId]?.hands === 2
  ) {
    return fail('two-handed');
  }

  const target = nextUnit.equipment[slot];
  const equipment: EquipmentSlots = { ...nextUnit.equipment, [slot]: located.instance };
  const displaced: ItemInstance[] = [];
  let shieldDisplaced = false;
  if (target) displaced.push(target);

  // Un arma a dos manos manda el escudo a la mochila; si no cabe, rechazo entero.
  if (slot === 'weapon' && definition.hands === 2 && nextUnit.equipment.shield) {
    displaced.push(nextUnit.equipment.shield);
    shieldDisplaced = true;
  }
  const finalEquipment: EquipmentSlots = shieldDisplaced
    ? { ...equipment, shield: null }
    : equipment;

  let inventory = nextUnit.inventory;
  let preferred = located.freedIndex;
  for (const item of displaced) {
    const next = withBackpackItem(inventory, item, preferred);
    if (!next) return fail('inventory-full');
    inventory = next;
    preferred = undefined;
  }

  return {
    ok: true,
    state: replaceUnit({ ...located.state }, { ...nextUnit, equipment: finalEquipment, inventory }),
  };
}

/** Desequipar (hueco → mochila). Sin hueco libre se rechaza entero. */
export function unequipItem(
  state: GameState,
  unitId: string,
  slot: EquipmentSlot,
): InventoryResult {
  const unit = state.players.find((candidate) => candidate.id === unitId);
  if (!unit) return fail('unknown-unit');
  if (!(slot in unit.equipment)) return fail('invalid-slot');

  const instance = unit.equipment[slot];
  if (!instance) return fail('no-item');

  const nextUnit = spendMp(unit);
  if (!nextUnit) return fail('no-mp');

  const inventory = withBackpackItem(nextUnit.inventory, instance);
  if (!inventory) return fail('inventory-full');

  return {
    ok: true,
    state: replaceUnit(state, {
      ...nextUnit,
      inventory,
      equipment: { ...nextUnit.equipment, [slot]: null },
    }),
  };
}

/** Soltar (mochila o hueco → suelo del tile). Desequipa sin pasar por mochila. */
export function dropItem(
  state: GameState,
  unitId: string,
  source: DropSource,
  cost: InventoryCost = 'mp',
): InventoryResult {
  const unit = state.players.find((candidate) => candidate.id === unitId);
  if (!unit) return fail('unknown-unit');

  let instance: ItemInstance | null = null;
  let inventory = unit.inventory;
  let equipment = unit.equipment;

  if (source.kind === 'backpack') {
    if (
      !Number.isInteger(source.index) ||
      source.index < 0 ||
      source.index >= unit.inventory.items.length
    ) {
      return fail('invalid-slot');
    }
    instance = unit.inventory.items[source.index];
    if (!instance) return fail('no-item');
    inventory = withoutBackpackItem(unit.inventory, source.index);
  } else {
    if (!(source.slot in unit.equipment)) return fail('invalid-slot');
    instance = unit.equipment[source.slot];
    if (!instance) return fail('no-item');
    equipment = { ...unit.equipment, [source.slot]: null };
  }

  const nextUnit = payInventoryCost(unit, cost);
  if ('reason' in nextUnit) return fail(nextUnit.reason);

  return {
    ok: true,
    state: replaceUnit(
      {
        ...state,
        groundItems: [
          ...groundItems(state),
          {
            ...itemInstance(instance.id, instance.itemId, instance.lootable),
            x: unit.x,
            y: unit.y,
          },
        ],
      },
      { ...nextUnit.unit, inventory, equipment },
    ),
  };
}

/** Contenido seguro de una inspección: identidad, catálogo y saqueabilidad. */
export interface InspectedItem {
  readonly id: string;
  readonly itemId: ItemId;
  readonly lootable: boolean;
}

/** Resultado puro de inspeccionar un contenedor sin abrirlo. */
export interface ContainerInspection {
  readonly containerId: string;
  readonly items: readonly InspectedItem[];
}

/**
 * Contenido visible de un contenedor (REQ-021 R-006/T-005). Devuelve solo
 * identidad, catálogo y saqueabilidad de cada instancia: nunca `kind`,
 * `capacity`, `corpseOf`, posición, trampa ni apertura. No muta el estado.
 */
export function inspectContainer(
  state: GameState,
  containerId: string,
): ContainerInspection | null {
  const container = containerById(state, containerId);
  if (!container) return null;

  return {
    containerId: container.id,
    items: container.items
      .filter((item): item is ItemInstance => item !== null)
      .map(({ id, itemId, lootable }) => ({ id, itemId, lootable })),
  };
}

/** Localización legible de una instancia; útil para tests y snapshots. */
export type ItemLocation =
  | { readonly kind: 'backpack'; readonly unitId: string; readonly index: number }
  | { readonly kind: 'slot'; readonly unitId: string; readonly slot: EquipmentSlot }
  | { readonly kind: 'ground'; readonly x: number; readonly y: number }
  | { readonly kind: 'container'; readonly containerId: string; readonly index: number };

export function locateInstance(state: GameState, instance: string): ItemLocation | null {
  for (const unit of [...state.players, ...state.enemies]) {
    const index = unit.inventory.items.findIndex((item) => item?.id === instance);
    if (index >= 0) return { kind: 'backpack', unitId: unit.id, index };
    for (const slot of Object.keys(unit.equipment) as EquipmentSlot[]) {
      if (unit.equipment[slot]?.id === instance) {
        return { kind: 'slot', unitId: unit.id, slot };
      }
    }
  }
  const ground = groundItems(state).find((item) => item.id === instance);
  if (ground) return { kind: 'ground', x: ground.x, y: ground.y };
  for (const container of state.containers ?? []) {
    const index = container.items.findIndex((item) => item?.id === instance);
    if (index >= 0) return { kind: 'container', containerId: container.id, index };
  }
  return null;
}

/** Todas las instancias del estado, en orden estable; para invariantes y debug. */
export function allInstances(state: GameState): readonly ItemInstance[] {
  const result: ItemInstance[] = [];
  for (const unit of [...state.players, ...state.enemies]) {
    for (const item of unit.inventory.items) if (item) result.push(item);
    for (const item of equippedItems(unit.equipment)) result.push(item);
  }
  for (const item of state.groundItems ?? []) {
    result.push(itemInstance(item.id, item.itemId, item.lootable));
  }
  for (const container of state.containers ?? []) {
    for (const item of container.items) if (item) result.push(item);
  }
  return result;
}
