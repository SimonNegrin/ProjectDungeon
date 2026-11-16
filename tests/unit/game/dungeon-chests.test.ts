import { describe, expect, it } from 'vitest';
import {
  BspMapGenerator,
  CHEST_CAPACITY,
  DEFAULT_CHEST_CHANCE,
  DEFAULT_MAP_SEED,
  DEFAULT_SECOND_CHEST_CHANCE,
  DEFAULT_TRAIT_PIECE_COUNT,
  ITEMS,
  TRAIT_PIECE_IDS,
  bestPowerBySlot,
  createInitialState,
  createRng,
  emptyEquipment,
  equipmentFromLegacy,
  generateChests,
  isFloorTile,
  roomAt,
  type EquipmentSlots,
  type GeneratedMap,
  type PlayerConfig,
  type PlayerVariant,
  type Position,
  type Room,
  type Tile,
} from '../../../src/game/index';
import { GrowthMapGenerator } from '../../../src/game/chambers/variants/growth';

/**
 * Grupo canónico (REQ-020): un Guerrero y un Bárbaro con equipo inicial legacy.
 * Se usa en los tests de determinismo y colocación; el umbral por hueco se
 * prueba aparte con un catálogo mínimo.
 */
const CANONICAL_GROUP: readonly EquipmentSlots[] = [
  equipmentFromLegacy('player-1', {
    weaponId: 'sword',
    armorId: 'armor',
    shieldId: 'shield',
  }),
  equipmentFromLegacy('player-2', {
    weaponId: 'axe',
    armorId: null,
    shieldId: null,
  }),
];

/** Mapa sintético con `roomCount` salas 4×4 y la 0 como spawn; sin fichas. */
function syntheticMap(seed: number, roomCount: number): GeneratedMap {
  const width = 40;
  const height = 20;
  const tiles: Tile[] = Array.from({ length: width * height }, () => 'wall');
  const rooms: Room[] = [];
  const cellsByRoom: Position[][] = [];

  for (let index = 0; index < roomCount; index += 1) {
    const x = 2 + (index % 5) * 8;
    const y = 2 + Math.floor(index / 5) * 8;
    const cells: Position[] = [];
    for (let cy = y; cy < y + 4; cy += 1) {
      for (let cx = x; cx < x + 4; cx += 1) {
        tiles[cy * width + cx] = 'floor';
        cells.push({ x: cx, y: cy });
      }
    }
    cellsByRoom.push(cells);
    rooms.push({
      id: index,
      x,
      y,
      width: 4,
      height: 4,
      role: 'small',
      cells,
      area: cells.length,
    });
  }

  const spawnAccess = cellsByRoom[0][0];
  const enemyCell = cellsByRoom[1][0];

  return {
    seed,
    width,
    height,
    tiles,
    rooms,
    corridors: [],
    doors: [],
    spawns: {
      roomId: 0,
      party: [spawnAccess],
      player: spawnAccess,
      enemy: enemyCell,
      distance: 0,
    },
    entrance: { roomId: 0, position: spawnAccess },
    exit: null,
    enemies: [],
    weapons: [],
    warnings: [],
    options: {
      mapWidth: width,
      mapHeight: height,
      roomTarget: roomCount,
      roomMin: 3,
      roomMax: 8,
      loopRatio: 0,
      wideCorridorCount: 0,
      wideCorridorWidth: 2,
    },
  };
}

function growthMap(seed: number): GeneratedMap {
  return new GrowthMapGenerator().generate(seed);
}

/** Celdas que ningún cofre puede ocupar en un mapa growth. */
function reservedKeys(map: GeneratedMap): Set<string> {
  const keys = new Set<string>();
  for (const door of map.doors) keys.add(`${door.x},${door.y}`);
  for (const cell of map.spawns.party ?? []) keys.add(`${cell.x},${cell.y}`);
  keys.add(`${map.spawns.player.x},${map.spawns.player.y}`);
  keys.add(`${map.spawns.enemy.x},${map.spawns.enemy.y}`);
  if (map.entrance) keys.add(`${map.entrance.position.x},${map.entrance.position.y}`);
  if (map.exit) {
    keys.add(`${map.exit.position.x},${map.exit.position.y}`);
    keys.add(`${map.exit.access.x},${map.exit.access.y}`);
  }
  for (const enemy of map.enemies ?? []) keys.add(`${enemy.x},${enemy.y}`);
  for (const weapon of map.weapons ?? []) keys.add(`${weapon.x},${weapon.y}`);
  return keys;
}

const PLAYER_ARCHETYPES: readonly PlayerConfig['archetypeId'][] = [
  'warrior',
  'barbarian',
  'rogue',
  'archer',
  'mage',
  'cleric',
];

describe('generación de cofres (REQ-020 R-001/R-002/R-004)', () => {
  it('es determinista: misma semilla y mismo grupo dan los mismos cofres', () => {
    const map = growthMap(279837264);
    const first = generateChests(map, CANONICAL_GROUP);
    const second = generateChests(map, CANONICAL_GROUP);

    expect(second).toEqual(first);
    expect(first.length).toBeGreaterThanOrEqual(1);
    expect(JSON.parse(JSON.stringify(first))).toEqual(first);
  });

  it('otra semilla cambia los cofres; otro grupo conserva posiciones pero cambia contenido', () => {
    const map = growthMap(279837264);
    const base = generateChests(map, CANONICAL_GROUP);
    const otherSeed = generateChests(growthMap(279837265), CANONICAL_GROUP);

    expect(otherSeed.map((chest) => ({ x: chest.x, y: chest.y }))).not.toEqual(
      base.map((chest) => ({ x: chest.x, y: chest.y })),
    );

    // Sin armas equipadas: cambia el contenido, no las posiciones.
    const emptyGroup: readonly EquipmentSlots[] = [emptyEquipment()];
    const otherGroup = generateChests(map, emptyGroup);
    expect(otherGroup.map((chest) => ({ x: chest.x, y: chest.y }))).toEqual(
      base.map((chest) => ({ x: chest.x, y: chest.y })),
    );
    expect(otherGroup.map((chest) => chest.items[0]?.itemId)).not.toEqual(
      base.map((chest) => chest.items[0]?.itemId),
    );
  });

  it('tira ~50 % por sala no-spawn sin segundo cofre', () => {
    const seeds = 400;
    let rooms = 0;
    let hits = 0;
    for (let seed = 1; seed <= seeds; seed += 1) {
      const map = syntheticMap(seed, 10);
      const chests = generateChests(map, CANONICAL_GROUP, {
        chestChance: 50,
        secondChestChance: 0,
      });
      rooms += 9;
      hits += chests.length;
    }
    const ratio = hits / rooms;
    expect(ratio).toBeGreaterThan(0.45);
    expect(ratio).toBeLessThan(0.55);
  });

  it('tira ~20 % de segundo cofre cuando la sala ya acertó', () => {
    const seeds = 400;
    let primary = 0;
    let second = 0;
    for (let seed = 1; seed <= seeds; seed += 1) {
      const map = syntheticMap(seed, 10);
      const chests = generateChests(map, CANONICAL_GROUP, {
        chestChance: 100,
        secondChestChance: 20,
      });
      const byRoom = new Map<number, number>();
      for (const chest of chests) {
        const room = roomAt(map.rooms, chest.x, chest.y);
        byRoom.set(room?.id ?? -1, (byRoom.get(room?.id ?? -1) ?? 0) + 1);
      }
      for (const count of byRoom.values()) {
        if (count >= 1) primary += 1;
        if (count >= 2) second += 1;
      }
    }
    expect(primary).toBe(seeds * 9);
    const ratio = second / primary;
    expect(ratio).toBeGreaterThan(0.15);
    expect(ratio).toBeLessThan(0.25);
  });

  it('fuerza un cofre si el nivel no generó ninguno', () => {
    for (let seed = 1; seed <= 40; seed += 1) {
      const map = syntheticMap(seed, 10);
      const chests = generateChests(map, CANONICAL_GROUP, {
        chestChance: 0,
        secondChestChance: 0,
      });
      expect(chests).toHaveLength(1);
      expect(roomAt(map.rooms, chests[0].x, chests[0].y)?.id).not.toBe(0);
    }
  });

  it('no consume el RNG de combate: el estado inicial conserva createRng(seed)', () => {
    const state = createInitialState({ seed: 279837264 });
    expect(state.rng).toEqual(createRng(279837264));
    expect(state.rng.state).toBe(0);
    expect(state.containers?.length).toBeGreaterThanOrEqual(1);
  });
});

describe('colocación válida (REQ-020 R-001/T-004)', () => {
  it('ningún cofre pisa spawn, salida, puerta, muro, enemigo, arma u otro cofre', () => {
    for (let seed = 1; seed <= 200; seed += 1) {
      const map = growthMap(seed);
      const chests = generateChests(map, CANONICAL_GROUP);
      const reserved = reservedKeys(map);
      const seen = new Set<string>();

      expect(chests.length, `semilla ${seed}`).toBeGreaterThanOrEqual(1);
      for (const chest of chests) {
        expect(isFloorTile(map, chest.x, chest.y), `semilla ${seed}`).toBe(true);
        const key = `${chest.x},${chest.y}`;
        expect(reserved.has(key), `semilla ${seed} ${key}`).toBe(false);
        expect(seen.has(key), `semilla ${seed} ${key}`).toBe(false);
        seen.add(key);
        const room = roomAt(map.rooms, chest.x, chest.y);
        expect(room, `semilla ${seed}`).toBeDefined();
        expect(room?.id, `semilla ${seed}`).not.toBe(map.spawns.roomId);
      }
    }
  });

  it('con el generador BSP ningún cofre pisa un enemigo colocado por placeMapEnemies', () => {
    const state = createInitialState({
      generator: new BspMapGenerator(),
      seed: DEFAULT_MAP_SEED,
    });

    expect(state.map?.enemies).toBeUndefined();
    expect(state.enemies).toHaveLength(4);

    const chests = state.containers ?? [];
    expect(chests.length).toBeGreaterThanOrEqual(1);

    const enemyKeys = new Set(state.enemies.map((enemy) => `${enemy.x},${enemy.y}`));
    for (const chest of chests) {
      expect(enemyKeys.has(`${chest.x},${chest.y}`), `cofre ${chest.id}`).toBe(false);
    }
  });

  it('integra 1-6 jugadores sin pisar spawn, salida, muro ni ocupante', () => {
    for (let seed = 1; seed <= 30; seed += 1) {
      for (let count = 1; count <= 6; count += 1) {
        const players: PlayerConfig[] = PLAYER_ARCHETYPES.slice(0, count).map(
          (archetypeId, index) => ({
            archetypeId,
            variant: (index % 2 === 0 ? 1 : 2) as PlayerVariant,
            name: '',
          }),
        );
        const state = createInitialState({ seed, players });
        const map = state.map;
        if (!map) throw new Error('El estado inicial debe incluir mapa');
        const reserved = reservedKeys(map);
        const chests = state.containers ?? [];
        const seen = new Set<string>();

        expect(chests.length).toBeGreaterThanOrEqual(1);
        for (const chest of chests) {
          expect(isFloorTile(map, chest.x, chest.y)).toBe(true);
          const key = `${chest.x},${chest.y}`;
          expect(reserved.has(key)).toBe(false);
          expect(seen.has(key)).toBe(false);
          seen.add(key);
          expect(roomAt(map.rooms, chest.x, chest.y)?.id).not.toBe(map.spawns.roomId);
          expect(chest.kind).toBe('chest');
          expect(chest.capacity).toBe(CHEST_CAPACITY);
          expect(chest.opened).toBe(false);
        }
      }
    }
  });
});

describe('contenido orientado al equipo (REQ-020 R-005/R-006/R-007/R-008)', () => {
  it('bestPowerBySlot toma el máximo por hueco y admite huecos vacíos', () => {
    const best = bestPowerBySlot(CANONICAL_GROUP);

    expect(best.weapon).toBe(7); // espada (6) frente a hacha (7)
    expect(best.armor).toBe(1);
    expect(best.shield).toBe(1);
    expect(best.ring).toBe(0);
    expect(best.neck).toBe(0);
    expect(best.hands).toBe(0);
  });

  it('elige la mejora más cercana al umbral de su hueco', () => {
    const map = syntheticMap(1, 4);
    const catalog = {
      sword: ITEMS.sword,
      axe: ITEMS.axe,
      dagger: ITEMS.dagger,
      armor: ITEMS.armor,
      plate: ITEMS.plate,
      shield: ITEMS.shield,
    };
    const group: readonly EquipmentSlots[] = [
      equipmentFromLegacy('player-1', {
        weaponId: 'axe',
        armorId: 'armor',
        shieldId: 'shield',
      }),
    ];

    const chests = generateChests(
      map,
      group,
      { chestChance: 100, secondChestChance: 0 },
      catalog,
    );

    // La mejor arma es hacha (7), armadura 1 y escudo 1: la única mejora con
    // margen 1 es la coraza (2 > 1); los huecos vacíos no tienen piezas en este
    // catálogo. Sin mejora posible, el primer objeto caería al relleno.
    expect(chests[0].items[0]?.itemId).toBe('plate');
  });

  it('el primer objeto cae a relleno común si no hay mejora en el catálogo', () => {
    const map = syntheticMap(1, 4);
    const catalog = { plate: ITEMS.plate };
    const group: readonly EquipmentSlots[] = [
      equipmentFromLegacy('player-1', {
        weaponId: null,
        armorId: 'plate',
        shieldId: null,
      }),
    ];

    const chests = generateChests(
      map,
      group,
      { chestChance: 100, secondChestChance: 0 },
      catalog,
    );

    // La coraza ya está equipada (umbral 2): no hay mejora y el objeto 0 es
    // relleno de la tabla común (la única pieza no de traits).
    expect(chests[0].items[0]?.itemId).toBe('plate');
    expect(chests[0].items[1]?.itemId).toBe('plate');
  });

  it('garantiza una pieza de traits por nivel fuera de la curva', () => {
    const map = growthMap(279837264);
    const chests = generateChests(map, CANONICAL_GROUP);

    const traitChests = chests.filter((chest) =>
      chest.items.some((item) => item !== null && TRAIT_PIECE_IDS.includes(item.itemId)),
    );
    expect(traitChests).toHaveLength(DEFAULT_TRAIT_PIECE_COUNT);
    expect(TRAIT_PIECE_IDS).toContain(traitChests[0].items[1]?.itemId);

    // Los demás objetos son relleno común, nunca piezas de traits.
    for (const chest of chests) {
      expect(chest.items).toHaveLength(CHEST_CAPACITY);
      expect(chest.items.filter((item) => item !== null)).toHaveLength(2);
      for (const item of chest.items) {
        if (item === null) continue;
        if (TRAIT_PIECE_IDS.includes(item.itemId)) continue;
        expect(ITEMS[item.itemId].lootPolicy).toBe('common');
      }
    }
  });

  it('las cuatro piezas de traits son alcanzables a lo largo de semillas', () => {
    const found = new Set<string>();
    for (let seed = 1; seed <= 2000 && found.size < TRAIT_PIECE_IDS.length; seed += 1) {
      const map = syntheticMap(seed, 4);
      const chests = generateChests(map, CANONICAL_GROUP, {
        chestChance: 100,
        secondChestChance: 0,
      });
      const piece = chests[0].items[1]?.itemId;
      if (piece && TRAIT_PIECE_IDS.includes(piece)) found.add(piece);
    }
    expect([...found].sort()).toEqual([...TRAIT_PIECE_IDS].sort());
  });

  it('el recuento de piezas es configurable', () => {
    const map = syntheticMap(1, 4);
    const two = generateChests(map, CANONICAL_GROUP, {
      chestChance: 100,
      secondChestChance: 0,
      traitPieceCount: 2,
    });
    const traits = two.flatMap((chest) => chest.items).filter(
      (item) => item !== null && TRAIT_PIECE_IDS.includes(item.itemId),
    );
    expect(traits).toHaveLength(2);
  });

  it('expone los porcentajes y el recuento por defecto como datos', () => {
    expect(DEFAULT_CHEST_CHANCE).toBe(50);
    expect(DEFAULT_SECOND_CHEST_CHANCE).toBe(20);
    expect(DEFAULT_TRAIT_PIECE_COUNT).toBe(1);
  });
});
