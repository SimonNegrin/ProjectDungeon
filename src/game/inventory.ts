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
import type { GameState, RejectionReason, Unit } from './types';

/** Instancia de un objeto del catálogo con ID estable y único. */
export interface ItemInstance {
  readonly id: string;
  readonly itemId: ItemId;
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

/** Contenedor con capacidad e instancias; sin cofres jugables en este corte. */
export interface Container {
  readonly id: string;
  readonly x: number;
  readonly y: number;
  readonly capacity: number;
  readonly items: readonly (ItemInstance | null)[];
}

/** Capacidad de mochila por defecto (REQ-018 R-010). */
export const DEFAULT_BACKPACK_CAPACITY = 8;

/** Coste en MP de recoger, equipar, desequipar o soltar (REQ-018 R-012/R-013). */
export const INVENTORY_OPERATION_COST = 1;

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
        : { id: instanceId(owner, 'weapon'), itemId: legacy.weaponId },
    armor:
      legacy.armorId === null
        ? null
        : { id: instanceId(owner, 'armor'), itemId: legacy.armorId },
    shield:
      legacy.shieldId === null
        ? null
        : { id: instanceId(owner, 'shield'), itemId: legacy.shieldId },
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
    items[index] = { id: instanceId(owner, `backpack-${index}`), itemId };
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

function groundItemAt(state: GameState, x: number, y: number): GroundItem | undefined {
  return groundItems(state).find((item) => item.x === x && item.y === y);
}

function spendMp(unit: Unit): Unit | null {
  if (unit.mp < INVENTORY_OPERATION_COST) return null;
  return { ...unit, mp: unit.mp - INVENTORY_OPERATION_COST };
}

function groundWithout(state: GameState, instance: string): readonly GroundItem[] {
  return groundItems(state).filter((item) => item.id !== instance);
}

/**
 * Recoger (suelo → mochila). Sin auto-equipar. Con la mochila llena se rechaza
 * sin tocar suelo ni mochila (REQ-026 R-010, REQ-018 R-013).
 */
export function pickUpItem(state: GameState, unitId: string): InventoryResult {
  const unit = state.players.find((candidate) => candidate.id === unitId);
  if (!unit) return fail('unknown-unit');

  const ground = groundItemAt(state, unit.x, unit.y);
  if (!ground) return fail('no-item');

  const nextUnit = spendMp(unit);
  if (!nextUnit) return fail('no-mp');

  const inventory = withBackpackItem(nextUnit.inventory, {
    id: ground.id,
    itemId: ground.itemId,
  });
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
    const ground = groundItemAt(state, unit.x, unit.y);
    if (!ground || ground.id !== source.itemId) return { error: 'no-item' };
    return {
      instance: { id: ground.id, itemId: ground.itemId },
      state: { ...state, groundItems: groundWithout(state, ground.id) },
      unit,
    };
  }

  const container = containerById(state, source.containerId);
  if (!container) return { error: 'unknown-container' };
  const index = container.items.findIndex((item) => item?.id === source.itemId);
  const instance = index < 0 ? null : container.items[index];
  if (!instance) return { error: 'no-item' };
  const items = [...container.items];
  items[index] = null;
  return {
    instance,
    state: replaceContainer(state, { ...container, items }),
    unit,
  };
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

  const nextUnit = spendMp(unit);
  if (!nextUnit) return fail('no-mp');

  return {
    ok: true,
    state: replaceUnit(
      {
        ...state,
        groundItems: [
          ...groundItems(state),
          { id: instance.id, itemId: instance.itemId, x: unit.x, y: unit.y },
        ],
      },
      { ...nextUnit, inventory, equipment },
    ),
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
    result.push({ id: item.id, itemId: item.itemId });
  }
  for (const container of state.containers ?? []) {
    for (const item of container.items) if (item) result.push(item);
  }
  return result;
}
