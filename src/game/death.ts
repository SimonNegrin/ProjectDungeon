/**
 * Muerte de jugador y de enemigo, y cadáver contenedor
 * (REQ-021 R-001/R-009/R-010/T-001, REQ-034 R-001/R-004/R-007/T-004).
 *
 * `hp === 0` sigue siendo la única señal de unidad muerta: no se añade un
 * estado paralelo ni se crea una lista de unidades muertas. Al morir un jugador,
 * su equipo y su mochila pasan sin tirada ni filtro a un `Container` de cadáver
 * en su casilla; la unidad permanece en `players` con su identidad, sin
 * objetos y marcada como fantasma controlable, lista para moverse y para la
 * resurrección (TASK-0148).
 *
 * Al morir un enemigo, solo sus instancias `lootable` pasan al cadáver; el
 * resto se descarta con la unidad. Sin saqueables no se crea contenedor. El
 * enemigo permanece en `enemies` con 0 PV, sin objetos y sin marca de fantasma
 * (REQ-034 T-004). El filtrado no lee ni avanza `state.rng`: la saqueabilidad
 * ya se decidió al crear al enemigo (TASK-0130).
 *
 * Es puro: no conoce DOM, host, red ni relojes.
 */

import { EQUIPMENT_SLOTS } from './equipment';
import { GHOST_ACTIONS } from './actions';
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
 * conserva identidad, posición y stats. El muerto pasa a fantasma controlable
 * (REQ-021 T-002): `ghost: true`, una acción y su MP sin regalar. Idempotente:
 * repetir sobre el mismo fantasma devuelve el estado tal cual.
 */
function settlePlayerDeath(state: GameState, unit: Unit): GameState {
  const containers = state.containers ?? [];
  const hasCorpse = containers.some((container) => container.corpseOf === unit.id);
  if (hasCorpse && unit.ghost === true) return state;

  const items = hasCorpse ? [] : transferableItems(unit);
  const corpse: Container = {
    id: corpseId(unit.id),
    x: unit.x,
    y: unit.y,
    capacity: items.length,
    items,
    kind: 'corpse',
    corpseOf: unit.id,
  };

  const ghost: Unit = {
    ...unit,
    hp: 0,
    ghost: true,
    actions: {
      max: GHOST_ACTIONS,
      remaining: Math.min(unit.actions.remaining, GHOST_ACTIONS),
    },
    equipment: emptyEquipment(),
    inventory: createInventory(unit.inventory.capacity),
  };

  return {
    ...state,
    players: state.players.map((candidate) =>
      candidate.id === unit.id ? ghost : candidate,
    ),
    containers: hasCorpse ? containers : [...containers, corpse],
  };
}

/** Sustituye un enemigo conservando el orden de `state.enemies`. */
function replaceEnemy(state: GameState, enemy: Unit): GameState {
  return {
    ...state,
    enemies: state.enemies.map((candidate) =>
      candidate.id === enemy.id ? enemy : candidate,
    ),
  };
}

/**
 * Asienta la muerte de un enemigo (REQ-034 T-004): transfiere solo las
 * instancias `lootable` a un cadáver en su casilla y descarta el resto con la
 * unidad. Sin saqueables no crea contenedor. Conserva identidad, posición y
 * stats; no marca `ghost` ni mueve al enemigo de `enemies`. Idempotente: si el
 * cadáver ya existe o la unidad ya está vacía, devuelve el estado tal cual.
 */
function settleEnemyDeath(state: GameState, enemy: Unit): GameState {
  const containers = state.containers ?? [];
  if (containers.some((container) => container.corpseOf === enemy.id)) {
    return state;
  }

  const candidates = transferableItems(enemy);
  const loot = candidates.filter((instance) => instance.lootable);
  const emptied: Unit = {
    ...enemy,
    hp: 0,
    equipment: emptyEquipment(),
    inventory: createInventory(enemy.inventory.capacity),
  };

  if (loot.length === 0) {
    // Ya vaciado en una llamada anterior: nada que cambiar ni que crear.
    if (candidates.length === 0) return state;
    return replaceEnemy(state, emptied);
  }

  const corpse: Container = {
    id: corpseId(enemy.id),
    x: enemy.x,
    y: enemy.y,
    capacity: loot.length,
    items: loot,
    kind: 'corpse',
    corpseOf: enemy.id,
  };

  return {
    ...replaceEnemy(state, emptied),
    containers: [...containers, corpse],
  };
}

/**
 * Asienta la muerte de una unidad. Busca primero en `players` y después en
 * `enemies`; solo actúa sobre unidades con 0 PV, y un id desconocido o una
 * unidad viva devuelven el estado tal cual. No lee ni avanza `state.rng`.
 */
export function settleUnitDeath(state: GameState, unitId: string): GameState {
  const player = state.players.find((candidate) => candidate.id === unitId);
  if (player) {
    if (isAlive(player)) return state;
    return settlePlayerDeath(state, player);
  }

  const enemy = state.enemies.find((candidate) => candidate.id === unitId);
  if (!enemy || enemy.hp !== 0) return state;
  return settleEnemyDeath(state, enemy);
}
