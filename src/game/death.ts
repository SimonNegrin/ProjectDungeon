/**
 * Muerte de jugador y cadáver contenedor (REQ-021 R-001/R-009/R-010/T-001).
 *
 * `hp === 0` sigue siendo la única señal de unidad muerta: no se añade un
 * estado paralelo ni se crea una lista de unidades muertas. Al morir un jugador,
 * su equipo y su mochila pasan sin tirada ni filtro a un `Container` de cadáver
 * en su casilla; la unidad permanece en `players` con su identidad y sin
 * objetos, lista para la resurrección (TASK-0148).
 *
 * Es puro: no conoce DOM, host, red ni relojes, y no lee ni avanza `state.rng`.
 * Los enemigos no generan cadáver en este corte (TASK-0133).
 */

import { EQUIPMENT_SLOTS } from './equipment';
import { isAlive } from './grid';
import {
  createInventory,
  emptyEquipment,
  type Container,
  type ItemInstance,
} from './inventory';
import type { GameState, Unit } from './types';

/** ID estable del cadáver de una unidad. */
export function corpseId(unitId: string): string {
  return `corpse-${unitId}`;
}

/**
 * Instancias a transferir, en orden estable: primero los huecos de
 * `EQUIPMENT_SLOTS` (solo los no nulos) y después la mochila. No hay `null`
 * intermedios: la contención es la única verdad.
 */
function transferableItems(unit: Unit): readonly ItemInstance[] {
  const items: ItemInstance[] = [];
  for (const slot of EQUIPMENT_SLOTS) {
    const instance = unit.equipment[slot];
    if (instance !== null) items.push(instance);
  }
  for (const instance of unit.inventory.items) {
    if (instance !== null) items.push(instance);
  }
  return items;
}

/**
 * Asienta la muerte de un jugador: crea su cadáver, vacía equipo y mochila y
 * conserva identidad, posición y stats. Idempotente: si ya existe un contenedor
 * con `corpseOf === unitId` no cambia nada. Un enemigo, una unidad viva o un id
 * desconocido devuelven el estado tal cual.
 */
export function settleUnitDeath(state: GameState, unitId: string): GameState {
  const unit = state.players.find((candidate) => candidate.id === unitId);
  if (!unit || isAlive(unit)) return state;

  const containers = state.containers ?? [];
  if (containers.some((container) => container.corpseOf === unitId)) return state;

  const items = transferableItems(unit);
  const corpse: Container = {
    id: corpseId(unit.id),
    x: unit.x,
    y: unit.y,
    capacity: items.length,
    items,
    kind: 'corpse',
    corpseOf: unit.id,
  };

  const emptied: Unit = {
    ...unit,
    hp: 0,
    equipment: emptyEquipment(),
    inventory: createInventory(unit.inventory.capacity),
  };

  return {
    ...state,
    players: state.players.map((candidate) =>
      candidate.id === unit.id ? emptied : candidate,
    ),
    containers: [...containers, corpse],
  };
}
