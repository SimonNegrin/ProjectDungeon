/**
 * Generación determinista de cofres por sala y botín progresivo
 * (REQ-020 R-001/R-002/R-004/R-005/R-007/R-008/T-004; ADR-033).
 *
 * Módulo puro: deriva un PRNG propio de la semilla del mapa y no lee ni avanza
 * `state.rng`, así que el combate con la misma semilla no cambia. La profundidad
 * se acepta como parámetro y hoy vale 1 sin efecto (encadenado futuro).
 *
 * Reglas:
 * - Cada sala no-spawn tira `chestChance` de cofre y, si acierta, un
 *   `secondChestChance` de un segundo en la misma sala. Nunca sobre el acceso de
 *   spawn, la salida, una puerta, un muro, un enemigo, un arma ni otro cofre.
 * - Si el nivel no genera ningún cofre, se fuerza uno en la primera sala
 *   no-spawn con suelo libre.
 * - Contenido por cofre: dos objetos. El primero busca mejora real por hueco
 *   (la candidata más cercana al umbral del mejor equipo del grupo); sin mejora,
 *   cae a relleno. El segundo es relleno de la tabla común. La pieza de traits
 *   garantizada por nivel se reparte fuera de la curva en el primer cofre.
 */

import {
  EQUIPMENT_SLOTS,
  ITEMS,
  powerScore,
  type EquipmentSlot,
  type ItemDefinition,
  type ItemId,
} from './equipment';
import {
  itemInstance,
  type Container,
  type EquipmentSlots,
  type ItemInstance,
} from './inventory';
import {
  isFloorTile,
  mulberry32,
  normalizeSeed,
  type GeneratedMap,
  type Room,
} from './map';
import type { Position } from './types';

/** Capacidad fija de un cofre (REQ-020 R-010). */
export const CHEST_CAPACITY = 4;
/** Tirada de cofre por sala no-spawn (REQ-020 R-001). */
export const DEFAULT_CHEST_CHANCE = 50;
/** Tirada de segundo cofre en la misma sala (REQ-020 R-001). */
export const DEFAULT_SECOND_CHEST_CHANCE = 20;
/** Piezas de traits garantizadas por nivel (REQ-020 R-008). */
export const DEFAULT_TRAIT_PIECE_COUNT = 1;

/**
 * Las cuatro piezas de traits de REQ-019: entran al juego como botín especial de
 * cofre y fuera de la curva de mejora (ADR-033 § botín especial).
 */
export const TRAIT_PIECE_IDS: readonly ItemId[] = [
  'lifesteal-ring',
  'mana-necklace',
  'action-gloves',
  'circular-mace',
];

/** Sal propia del PRNG de cofres: no comparte estado con armas, enemigos ni combate. */
const CHEST_SALT = 0x3b6b1a7d;

export interface ChestLootOptions {
  /** Porcentaje de cofre por sala no-spawn; 50 por defecto. */
  readonly chestChance?: number;
  /** Porcentaje de segundo cofre en la misma sala; 20 por defecto. */
  readonly secondChestChance?: number;
  /** Piezas de traits garantizadas por nivel; 1 por defecto. */
  readonly traitPieceCount?: number;
  /** Profundidad reservada para el encadenado; hoy 1 y sin efecto. */
  readonly depth?: number;
  /**
   * Celdas ocupadas adicionales que ningún cofre puede pisar. Útil cuando el
   * generador no declara `map.enemies` y el motor coloca fichas por otra vía
   * (BSP con `placeMapEnemies`).
   */
  readonly blockedCells?: readonly Position[];
}

function key(x: number, y: number): string {
  return `${x},${y}`;
}

/** Celdas del suelo de una sala: máscara real o caja de compatibilidad. */
function roomCells(room: Room): readonly Position[] {
  if (room.cells) return room.cells;
  const cells: Position[] = [];
  for (let y = room.y; y < room.y + room.height; y += 1) {
    for (let x = room.x; x < room.x + room.width; x += 1) {
      cells.push({ x, y });
    }
  }
  return cells;
}

/** Celdas que ningún cofre puede ocupar: spawn, entrada, salida, puertas, fichas y armas. */
function staticBlockedKeys(map: GeneratedMap): Set<string> {
  const blocked = new Set<string>();
  for (const door of map.doors) blocked.add(key(door.x, door.y));
  const spawns = map.spawns;
  blocked.add(key(spawns.player.x, spawns.player.y));
  blocked.add(key(spawns.enemy.x, spawns.enemy.y));
  for (const cell of spawns.party ?? []) blocked.add(key(cell.x, cell.y));
  if (map.entrance) blocked.add(key(map.entrance.position.x, map.entrance.position.y));
  if (map.exit) {
    blocked.add(key(map.exit.position.x, map.exit.position.y));
    blocked.add(key(map.exit.access.x, map.exit.access.y));
  }
  for (const enemy of map.enemies ?? []) blocked.add(key(enemy.x, enemy.y));
  for (const weapon of map.weapons ?? []) blocked.add(key(weapon.x, weapon.y));
  return blocked;
}

/** Suelo libre de una sala: no muro y no bloqueado. */
function freeRoomCells(
  map: GeneratedMap,
  room: Room,
  blocked: ReadonlySet<string>,
): Position[] {
  const cells: Position[] = [];
  for (const cell of roomCells(room)) {
    if (!isFloorTile(map, cell.x, cell.y)) continue;
    if (blocked.has(key(cell.x, cell.y))) continue;
    cells.push(cell);
  }
  return cells;
}

/** Salas no-spawn en orden estable por id. */
function nonSpawnRooms(map: GeneratedMap): Room[] {
  return [...map.rooms]
    .filter((room) => room.id !== map.spawns.roomId)
    .sort((a, b) => a.id - b.id);
}

function pick<T>(rng: () => number, values: readonly T[]): T {
  return values[Math.floor(rng() * values.length)];
}

/**
 * Mejor puntuación equipada del grupo por hueco (REQ-020 R-006): el máximo de
 * `powerScore` de cada instancia equipada; un hueco vacío queda en 0 y admite
 * cualquier objeto.
 */
export function bestPowerBySlot(
  equipments: readonly EquipmentSlots[],
  catalog: Readonly<Record<string, ItemDefinition>> = ITEMS,
): Record<EquipmentSlot, number> {
  const best = {} as Record<EquipmentSlot, number>;
  for (const slot of EQUIPMENT_SLOTS) best[slot] = 0;
  for (const equipment of equipments) {
    for (const slot of EQUIPMENT_SLOTS) {
      const instance = equipment[slot];
      if (instance === null) continue;
      const definition = catalog[instance.itemId];
      if (definition === undefined) continue;
      best[slot] = Math.max(best[slot], powerScore(definition));
    }
  }
  return best;
}

/** Objetos comunes del catálogo, sin las piezas de traits (fuera de la curva). */
function commonPool(
  catalog: Readonly<Record<string, ItemDefinition>>,
  traitPieceIds: readonly ItemId[],
): ItemDefinition[] {
  const traitIds = new Set<string>(traitPieceIds);
  return Object.values(catalog)
    .filter((item) => item.lootPolicy === 'common' && !traitIds.has(item.id))
    .sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
}

/**
 * Candidata más cercana al umbral de su hueco (ADR-033 § decisión): la que
 * supera el mejor equipo del grupo con el menor margen; empate por id. `null`
 * si el catálogo no ofrece mejora.
 */
function selectUpgrade(
  best: Readonly<Record<EquipmentSlot, number>>,
  pool: readonly ItemDefinition[],
): ItemDefinition | null {
  let selected: ItemDefinition | null = null;
  let selectedMargin = Number.POSITIVE_INFINITY;
  for (const item of pool) {
    const margin = powerScore(item) - (best[item.slot] ?? 0);
    if (margin <= 0) continue;
    if (margin < selectedMargin) {
      selected = item;
      selectedMargin = margin;
    }
  }
  return selected;
}

interface Placement {
  readonly x: number;
  readonly y: number;
}

/**
 * Genera los cofres de un mapa con botín orientado al equipo del grupo. Es
 * determinista: misma semilla y mismo grupo dan los mismos cofres, posiciones y
 * contenido, sin tocar el RNG de combate.
 */
export function generateChests(
  map: GeneratedMap,
  equipments: readonly EquipmentSlots[],
  options: ChestLootOptions = {},
  catalog: Readonly<Record<string, ItemDefinition>> = ITEMS,
): readonly Container[] {
  const chestChance = options.chestChance ?? DEFAULT_CHEST_CHANCE;
  const secondChestChance = options.secondChestChance ?? DEFAULT_SECOND_CHEST_CHANCE;
  const traitPieceCount = options.traitPieceCount ?? DEFAULT_TRAIT_PIECE_COUNT;
  // `depth` se acepta como parámetro y hoy no altera el resultado.
  void options.depth;

  const rng = mulberry32(normalizeSeed(map.seed) ^ CHEST_SALT);
  const blocked = staticBlockedKeys(map);
  for (const cell of options.blockedCells ?? []) {
    blocked.add(key(cell.x, cell.y));
  }
  const rooms = nonSpawnRooms(map);

  const placements: Placement[] = [];

  const place = (room: Room): void => {
    const cells = freeRoomCells(map, room, blocked);
    if (cells.length === 0) return;
    const cell = cells[Math.floor(rng() * cells.length)];
    blocked.add(key(cell.x, cell.y));
    placements.push({ x: cell.x, y: cell.y });
  };

  for (const room of rooms) {
    if (rng() * 100 < chestChance) {
      place(room);
      if (rng() * 100 < secondChestChance) place(room);
    }
  }

  if (placements.length === 0) {
    const forced = rooms.find(
      (room) => freeRoomCells(map, room, blocked).length > 0,
    );
    if (forced) place(forced);
  }

  const best = bestPowerBySlot(equipments, catalog);
  const pool = commonPool(catalog, TRAIT_PIECE_IDS);
  const upgrade = selectUpgrade(best, pool);

  const rollFiller = (): ItemId => pick(rng, pool.map((item) => item.id));

  // Piezas de traits garantizadas por nivel, fuera de la curva: solo las que
  // existen en el catálogo, sin repetición mientras queden.
  const traitPool = TRAIT_PIECE_IDS.filter((id) => catalog[id] !== undefined);
  const pieceCount =
    traitPool.length === 0
      ? 0
      : Math.max(0, Math.min(traitPieceCount, placements.length));
  const traitPieces: ItemId[] = [];
  const available = [...traitPool];
  for (let piece = 0; piece < pieceCount; piece += 1) {
    if (available.length === 0) available.push(...traitPool);
    const idx = Math.floor(rng() * available.length);
    traitPieces.push(available[idx]);
    available.splice(idx, 1);
  }

  return placements.map((position, index) => {
    const id = `chest-${index + 1}`;
    const items: (ItemInstance | null)[] = Array.from(
      { length: CHEST_CAPACITY },
      () => null,
    );
    items[0] = itemInstance(`item-${id}-0`, upgrade ? upgrade.id : rollFiller());
    items[1] = itemInstance(
      `item-${id}-1`,
      index < pieceCount ? traitPieces[index] : rollFiller(),
    );
    return {
      id,
      x: position.x,
      y: position.y,
      capacity: CHEST_CAPACITY,
      items,
      kind: 'chest',
      opened: false,
    };
  });
}
