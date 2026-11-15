/**
 * Tirada de saqueabilidad de un enemigo (REQ-034 R-002/R-003/T-002/T-003/T-008).
 *
 * Módulo puro: la tirada se deriva de la semilla de la partida y del ID estable
 * del enemigo, no lee ni avanza `state.rng` y no usa fuentes aleatorias del
 * entorno. El orden es estable: primero los huecos de `EQUIPMENT_SLOTS` y
 * después los índices de la mochila. Un objeto de política `progression` no
 * consume tirada y nace siempre saqueable; el resto usa el porcentaje declarado
 * en `LOOT_CHANCES`.
 */

import {
  EQUIPMENT_SLOTS,
  ITEMS,
  LOOT_CHANCES,
  type EquipmentSlot,
  type ItemDefinition,
} from './equipment';
import type { EquipmentSlots, Inventory, ItemInstance } from './inventory';
import { deriveLootRng, rollPercent } from './rng';
import type { RngState } from './types';

/** Equipo y mochila con la marca `lootable` ya aplicada. */
export interface LootRollResult {
  readonly equipment: EquipmentSlots;
  readonly inventory: Inventory;
}

interface RolledInstance {
  readonly instance: ItemInstance;
  readonly rng: RngState;
}

function policyOf(
  itemId: ItemInstance['itemId'],
  catalog: Readonly<Record<string, ItemDefinition>>,
) {
  return catalog[itemId]?.lootPolicy ?? 'common';
}

/** Aplica la política a una instancia; `progression` no consume tirada. */
function rollInstance(
  instance: ItemInstance,
  rng: RngState,
  catalog: Readonly<Record<string, ItemDefinition>>,
): RolledInstance {
  const policy = policyOf(instance.itemId, catalog);
  if (policy === 'progression') {
    return { instance: { ...instance, lootable: true }, rng };
  }
  const rolled = rollPercent(rng);
  return {
    instance: { ...instance, lootable: rolled.value < LOOT_CHANCES[policy] },
    rng: rolled.rng,
  };
}

/**
 * Tira por cada instancia del equipo y la mochila de un enemigo recién creado.
 * Devuelve copias con `lootable` fijado; nunca muta las entradas.
 */
export function rollEnemyLoot(
  seed: number,
  enemyId: string,
  equipment: EquipmentSlots,
  inventory: Inventory,
  catalog: Readonly<Record<string, ItemDefinition>> = ITEMS,
): LootRollResult {
  let rng = deriveLootRng(seed, enemyId);

  const slots = {} as Record<EquipmentSlot, ItemInstance | null>;
  for (const slot of EQUIPMENT_SLOTS) {
    const instance = equipment[slot];
    if (instance === null) {
      slots[slot] = null;
      continue;
    }
    const rolled = rollInstance(instance, rng, catalog);
    rng = rolled.rng;
    slots[slot] = rolled.instance;
  }

  const items = inventory.items.map((instance) => {
    if (instance === null) return null;
    const rolled = rollInstance(instance, rng, catalog);
    rng = rolled.rng;
    return rolled.instance;
  });

  return {
    equipment: slots,
    inventory: { capacity: inventory.capacity, items },
  };
}
