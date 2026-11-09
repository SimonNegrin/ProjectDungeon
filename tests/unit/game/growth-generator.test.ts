import { describe, expect, it, vi } from 'vitest';
import {
  BESTIARY,
  BspMapGenerator,
  createInitialState,
  createRoomGrid,
  DEFAULT_MAP_SEED,
  floorDistances,
  isFloorTile,
  MAP_WEAPON_SPECS,
  reduce,
  roomAt,
  tileIndex,
  type GeneratedMap,
  type MapGenerator,
} from '../../../src/game/index';
import {
  GrowthMapGenerator,
  validateGrowthMap,
} from '../../../src/game/chambers/variants/growth';

const PERF_SEED = 2738263054;
const DEFAULT_WIDTH = 22;
const DEFAULT_HEIGHT = 18;

function generatedMap(seed = DEFAULT_MAP_SEED): GeneratedMap {
  return new GrowthMapGenerator().generate(seed);
}

describe('GrowthMapGenerator', () => {
  it('expone id growth y devuelve un contrato completo y serializable', () => {
    const generator = new GrowthMapGenerator();
    const asInterface: MapGenerator = generator;
    const map = generator.generate(PERF_SEED);

    expect(asInterface.id).toBe('growth');
    expect(map.seed).toBe(PERF_SEED);
    expect(map.width).toBe(DEFAULT_WIDTH);
    expect(map.height).toBe(DEFAULT_HEIGHT);
    expect(map.tiles).toHaveLength(DEFAULT_WIDTH * DEFAULT_HEIGHT);
    expect(map.tiles.every((tile) => tile === 'floor' || tile === 'wall')).toBe(true);

    expect(map.rooms.length).toBeGreaterThanOrEqual(4);
    for (const room of map.rooms) {
      expect(room.cells, `sala ${room.id}`).toBeDefined();
      expect(room.area).toBe(room.cells?.length);
      expect(room.role).toBeTypeOf('string');
    }
    expect(map.corridors.length).toBeGreaterThan(0);
    expect(map.doors.length).toBeGreaterThan(0);
    for (const door of map.doors) {
      expect(door.roomA).toBe(door.roomId);
      expect(door.roomB).not.toBe(door.roomA);
      expect(door.style).toBeTypeOf('string');
    }

    expect(map.spawns.roomId).toBeDefined();
    expect(map.spawns.party).toHaveLength(6);
    expect(map.spawns.party?.[0]).toEqual(map.spawns.player);
    expect(roomAt(map.rooms, map.spawns.player.x, map.spawns.player.y)?.id).toBe(
      map.spawns.roomId,
    );

    expect(map.entrance).toEqual({
      roomId: map.spawns.roomId,
      position: map.spawns.player,
    });
    expect(map.exit).not.toBeNull();
    expect(map.exit?.roomId).not.toBe(map.spawns.roomId);
    expect(map.enemies?.length).toBeGreaterThanOrEqual(10);
    expect(map.enemies?.length).toBeLessThanOrEqual(12);

    expect(map.options.mapWidth).toBe(DEFAULT_WIDTH);
    expect(map.options.mapHeight).toBe(DEFAULT_HEIGHT);
    expect(map.options.roomMin).toBeLessThanOrEqual(map.options.roomMax);
    expect(Array.isArray(map.warnings)).toBe(true);

    expect(JSON.parse(JSON.stringify(map))).toEqual(map);
    expect(validateGrowthMap(map).issues).toEqual([]);
  });

  it('expone bocas abiertas, puntos calientes y caverna sin tocar el contrato BSP', () => {
    const map = generatedMap(PERF_SEED);
    const doorKeys = new Set(map.doors.map((door) => `${door.x},${door.y}`));

    expect(Array.isArray(map.openMouths)).toBe(true);
    expect(Array.isArray(map.hotspots)).toBe(true);
    expect(map.cavernRoomId === null || typeof map.cavernRoomId === 'number').toBe(true);
    for (const mouth of map.openMouths ?? []) {
      expect(doorKeys.has(`${mouth.x},${mouth.y}`), `boca ${mouth.x},${mouth.y}`).toBe(false);
      expect(isFloorTile(map, mouth.x, mouth.y), `boca ${mouth.x},${mouth.y}`).toBe(true);
      expect([
        'sin-soporte',
        'sin-suelo',
        'misma-sala',
        'separacion',
        'una-por-pasillo',
        'pasillo-ancho',
      ]).toContain(mouth.reason);
      expect(map.rooms.some((room) => room.id === mouth.roomA)).toBe(true);
      expect(map.rooms.some((room) => room.id === mouth.roomB)).toBe(true);
    }
    for (const hotspot of map.hotspots ?? []) {
      expect(isFloorTile(map, hotspot.x, hotspot.y), `hotspot ${hotspot.x},${hotspot.y}`).toBe(
        true,
      );
      expect(roomAt(map.rooms, hotspot.x, hotspot.y)?.id).toBe(hotspot.roomId);
      expect(['rincon', 'sin-LOS', 'ambos']).toContain(hotspot.reason);
    }
    const hidden = (map.enemies ?? []).filter((enemy) => enemy.hidden);
    const occupied = (map.hotspots ?? []).filter((hotspot) => hotspot.occupied);
    expect(occupied.length).toBe(hidden.length);
    expect(occupied.every((hotspot) => hotspot.eligible)).toBe(true);

    const bsp = new BspMapGenerator().generate(PERF_SEED);
    expect(bsp.openMouths).toBeUndefined();
    expect(bsp.hotspots).toBeUndefined();
    expect(bsp.cavernRoomId).toBeUndefined();
  });

  it('marca una sala caverna cuando se fuerza la variante', () => {
    const map = new GrowthMapGenerator().generate(PERF_SEED, {
      cavernChance: 100,
      wideCorridorChance: 0,
    });

    expect(typeof map.cavernRoomId).toBe('number');
    const cavern = map.rooms.find((room) => room.id === map.cavernRoomId);
    expect(cavern).toBeDefined();
    expect(map.rooms.length).toBe(3);
  });

  it('el jugador inicial es party[0] y los enemigos conservan tipo, home y emboscada', () => {
    const state = createInitialState({
      seed: PERF_SEED,
      generator: new GrowthMapGenerator(),
    });
    const map = state.map!;

    expect(state.players[0]).toMatchObject({
      x: map.spawns.party![0].x,
      y: map.spawns.party![0].y,
    });
    expect(state.enemies).toHaveLength(map.enemies!.length);
    for (const [index, enemy] of state.enemies.entries()) {
      const source = map.enemies![index];
      expect(enemy).toMatchObject({
        id: source.id,
        enemyType: source.type,
        x: source.x,
        y: source.y,
        home: source.home,
      });
    }
  });

  it('es determinista: misma semilla y opciones producen estructuras profundamente iguales', () => {
    const options = { mapWidth: 22, mapHeight: 18, roomCount: 5 };
    const first = new GrowthMapGenerator().generate(PERF_SEED, options);
    const second = new GrowthMapGenerator().generate(PERF_SEED, options);

    expect(second).toEqual(first);
    expect(JSON.stringify(second)).toBe(JSON.stringify(first));
    expect(first.weapons).toHaveLength(2);
    expect(second.weapons).toEqual(first.weapons);
    expect(new GrowthMapGenerator().generate(PERF_SEED + 1).tiles).not.toEqual(
      first.tiles,
    );
  });

  it('respeta opciones de tamaño y recuento sin cambiar los valores por defecto', () => {
    const map = new GrowthMapGenerator().generate(PERF_SEED, {
      mapWidth: 24,
      mapHeight: 20,
      roomCount: 6,
      cavernChance: 0,
    });

    expect(map.width).toBe(24);
    expect(map.height).toBe(20);
    expect(map.rooms).toHaveLength(6);
    expect(map.options.mapWidth).toBe(24);
    expect(map.options.mapHeight).toBe(20);
    expect(map.options.roomTarget).toBe(6);

    const fallback = new GrowthMapGenerator().generate(PERF_SEED);
    expect(fallback.width).toBe(22);
    expect(fallback.height).toBe(18);
    expect(fallback.options.roomTarget).toBe(5);
  });

  it('no llama a Math.random', () => {
    const random = vi.spyOn(Math, 'random');
    try {
      new GrowthMapGenerator().generate(PERF_SEED);
      expect(random).not.toHaveBeenCalled();
    } finally {
      random.mockRestore();
    }
  });

  it('genera enemigos del mapa con tipo, home y sala coherentes', () => {
    const map = generatedMap(PERF_SEED);
    const enemies = map.enemies ?? [];
    const distances = floorDistances(map, map.spawns.player);

    expect(enemies.length).toBeGreaterThan(0);
    expect(map.spawns.enemy).toEqual({ x: enemies[0].x, y: enemies[0].y });
    expect(map.spawns.distance).toBe(
      distances[tileIndex(map.width, enemies[0].x, enemies[0].y)],
    );

    const ids = new Set<string>();
    for (const enemy of enemies) {
      expect(ids.has(enemy.id), `enemigo duplicado ${enemy.id}`).toBe(false);
      ids.add(enemy.id);
      expect(BESTIARY[enemy.type]).toBeDefined();
      expect(enemy.home).toEqual({ x: enemy.x, y: enemy.y });
      expect(roomAt(map.rooms, enemy.x, enemy.y)?.id).toBe(enemy.roomId);
      expect(enemy.roomId).not.toBe(map.spawns.roomId);
      expect(typeof enemy.hidden).toBe('boolean');
      expect(typeof enemy.interior).toBe('boolean');
    }
  });

  it('coloca exactamente el hacha y la daga fuera de spawn, puertas, salida y enemigos', () => {
    const map = generatedMap(PERF_SEED);
    const weapons = map.weapons ?? [];

    expect(weapons).toHaveLength(2);
    expect(weapons.map((weapon) => weapon.weaponId)).toEqual(['axe', 'dagger']);
    expect(weapons.map((weapon) => weapon.id)).toEqual(
      MAP_WEAPON_SPECS.map((spec) => spec.id),
    );

    const distances = floorDistances(map, map.spawns.player);
    const doorKeys = new Set(map.doors.map((door) => `${door.x},${door.y}`));
    const spawnKeys = new Set([
      ...(map.spawns.party ?? []).map((cell) => `${cell.x},${cell.y}`),
      `${map.spawns.player.x},${map.spawns.player.y}`,
      `${map.spawns.enemy.x},${map.spawns.enemy.y}`,
    ]);
    const exitKeys = new Set([
      `${map.exit?.position.x},${map.exit?.position.y}`,
      `${map.exit?.access.x},${map.exit?.access.y}`,
    ]);
    const enemyKeys = new Set(
      (map.enemies ?? []).map((enemy) => `${enemy.x},${enemy.y}`),
    );
    const roomIds = new Set<number>();

    for (const weapon of weapons) {
      const key = `${weapon.x},${weapon.y}`;
      expect(isFloorTile(map, weapon.x, weapon.y), weapon.id).toBe(true);
      expect(
        distances[tileIndex(map.width, weapon.x, weapon.y)],
        weapon.id,
      ).toBeGreaterThan(0);

      const room = roomAt(map.rooms, weapon.x, weapon.y);
      expect(room, weapon.id).toBeDefined();
      expect(room?.id, weapon.id).not.toBe(map.spawns.roomId);
      if (room) roomIds.add(room.id);

      expect(doorKeys.has(key), `${weapon.id} puerta`).toBe(false);
      expect(spawnKeys.has(key), `${weapon.id} spawn`).toBe(false);
      expect(exitKeys.has(key), `${weapon.id} salida`).toBe(false);
      expect(enemyKeys.has(key), `${weapon.id} enemigo`).toBe(false);
    }

    expect(roomIds.size).toBe(2);
  });

  it('genera 22×18 en menos de 50 ms con la semilla de playtest', () => {
    const generator = new GrowthMapGenerator();
    generator.generate(PERF_SEED);
    generator.generate(PERF_SEED);

    const iterations = 5;
    const start = performance.now();
    for (let index = 0; index < iterations; index += 1) {
      generator.generate(PERF_SEED);
    }
    const average = (performance.now() - start) / iterations;

    console.log(
      `growth perf seed=${PERF_SEED} ${DEFAULT_WIDTH}x${DEFAULT_HEIGHT} avg=${average.toFixed(2)}ms`,
    );
    expect(average).toBeLessThan(50);
  });
});

describe('createInitialState con growth por defecto', () => {
  it('usa GrowthMapGenerator y consume los enemigos de map.enemies', () => {
    const state = createInitialState({ seed: PERF_SEED });
    const map = state.map;
    if (!map) throw new Error('El estado inicial debe incluir mapa');

    expect(map).toEqual(new GrowthMapGenerator().generate(PERF_SEED));
    expect(state.grid).toMatchObject({ width: DEFAULT_WIDTH, height: DEFAULT_HEIGHT });
    expect(state.players[0]).toMatchObject({
      x: map.spawns.player.x,
      y: map.spawns.player.y,
    });

    const mapEnemies = map.enemies ?? [];
    expect(mapEnemies.length).toBeGreaterThan(0);
    expect(state.enemies).toHaveLength(mapEnemies.length);
    expect(state.enemies.map((enemy) => enemy.id)).toEqual(
      mapEnemies.map((enemy) => enemy.id),
    );
    for (let index = 0; index < mapEnemies.length; index += 1) {
      const source = mapEnemies[index];
      const unit = state.enemies[index];
      expect(unit).toMatchObject({
        id: source.id,
        enemyType: source.type,
        x: source.x,
        y: source.y,
        home: source.home,
        faction: 'enemy',
        hp: BESTIARY[source.type].maxHp,
      });
    }
  });

  it('expone las dos armas del catálogo por defecto y permite recogerlas desde su celda', () => {
    const state = createInitialState();
    const weapons = state.map?.weapons ?? [];

    expect(weapons).toHaveLength(2);
    expect(weapons.map((weapon) => weapon.weaponId)).toEqual(['axe', 'dagger']);

    const weapon = weapons[0];
    const onWeapon = {
      ...state,
      players: [{ ...state.players[0], x: weapon.x, y: weapon.y }],
    };
    const picked = reduce(onWeapon, { type: 'PickUp', unitId: 'player-1' });

    expect(picked.state.players[0].weapons).toEqual(['sword', weapon.weaponId]);
    expect(picked.state.players[0].equipment.weaponId).toBe(weapon.weaponId);
    expect(
      picked.state.map?.weapons?.some((entry) => entry.id === weapon.id),
    ).toBe(false);
    expect(picked.state.map?.weapons).toHaveLength(1);
    expect(JSON.parse(JSON.stringify(picked.state.map))).toEqual(picked.state.map);
  });

  it('mantiene BSP inyectado con 32×32 y exactamente cuatro enemigos', () => {
    const state = createInitialState({
      generator: new BspMapGenerator(),
      seed: DEFAULT_MAP_SEED,
    });

    expect(state.grid).toMatchObject({ width: 32, height: 32 });
    expect(state.enemies).toHaveLength(4);
    expect(state.enemies.map((enemy) => enemy.id)).toEqual([
      'enemy-1',
      'enemy-2',
      'enemy-3',
      'enemy-4',
    ]);
  });

  it('consume map.enemies aunque el generador inyectado no tenga salas', () => {
    const grid = createRoomGrid(20, 20);
    const customEnemy = {
      id: 'custom-brute',
      type: 'brute' as const,
      x: 4,
      y: 4,
      roomId: 0,
      home: { x: 3, y: 3 },
      hidden: true,
      interior: false,
    };
    const stub: MapGenerator = {
      id: 'stub-enemies',
      generate: () => ({
        seed: 99,
        width: grid.width,
        height: grid.height,
        tiles: grid.tiles,
        rooms: [],
        corridors: [],
        doors: [],
        spawns: {
          player: { x: 5, y: 5 },
          enemy: { x: 6, y: 5 },
          distance: 1,
        },
        enemies: [customEnemy],
        warnings: [],
        options: {
          mapWidth: 20,
          mapHeight: 20,
          roomTarget: 4,
          roomMin: 3,
          roomMax: 8,
          loopRatio: 0,
          wideCorridorCount: 0,
          wideCorridorWidth: 2,
        },
      }),
    };

    const state = createInitialState({ generator: stub, seed: 99 });

    expect(state.enemies).toHaveLength(1);
    expect(state.enemies[0]).toMatchObject({
      id: 'custom-brute',
      enemyType: 'brute',
      x: 4,
      y: 4,
      home: { x: 3, y: 3 },
      hp: BESTIARY.brute.maxHp,
    });
  });

  it('serializa el estado growth y lo conserva tras un turno', () => {
    const state = createInitialState({ seed: PERF_SEED });
    const parsed = JSON.parse(JSON.stringify(state));
    expect(parsed).toEqual(state);

    const result = reduce(parsed, { type: 'EndTurn' });
    expect(result.state.map).toEqual(state.map);
    expect(JSON.parse(JSON.stringify(result.state))).toEqual(result.state);
    expect(validateGrowthMap(result.state.map!).ok).toBe(true);
  });
});

describe('validateGrowthMap', () => {
  it('acepta el mapa growth de referencia', () => {
    const validation = validateGrowthMap(generatedMap(PERF_SEED));
    expect(validation.issues).toEqual([]);
    expect(validation.ok).toBe(true);
  });

  it('rechaza una máscara con área incoherente', () => {
    const map = generatedMap(PERF_SEED);
    const [first, ...rest] = map.rooms;
    const broken = {
      ...map,
      rooms: [{ ...first, area: (first.area ?? 0) + 1 }, ...rest],
    };

    const validation = validateGrowthMap(broken);
    expect(validation.ok).toBe(false);
    expect(validation.issues.join(' ')).toContain('área');
  });

  it('rechaza un corredor que pasa por muro', () => {
    const map = generatedMap(PERF_SEED);
    const corridor = map.corridors.find((entry) => entry.path.length > 0);
    if (!corridor) throw new Error('La semilla de referencia debe tener corredores');
    const tiles = [...map.tiles];
    const cell = corridor.path[0];
    tiles[tileIndex(map.width, cell.x, cell.y)] = 'wall';
    const broken = { ...map, tiles };

    const validation = validateGrowthMap(broken);
    expect(validation.ok).toBe(false);
    expect(validation.issues.join(' ')).toContain('muro');
  });

  it('rechaza un grupo de spawn sin party[0] como jugador', () => {
    const map = generatedMap(PERF_SEED);
    const party = [...(map.spawns.party ?? [])];
    party[0] = party[1];
    const broken = {
      ...map,
      spawns: { ...map.spawns, party },
    };

    const validation = validateGrowthMap(broken);
    expect(validation.ok).toBe(false);
    expect(validation.issues.join(' ')).toMatch(/party\[0\]|repite/);
  });

  it('rechaza un arma sobre muro', () => {
    const map = generatedMap(PERF_SEED);
    const weapons = [...(map.weapons ?? [])];
    const wallIndex = map.tiles.findIndex((tile) => tile === 'wall');
    const wallX = wallIndex % map.width;
    const wallY = Math.floor(wallIndex / map.width);
    const broken = {
      ...map,
      weapons: [{ ...weapons[0], x: wallX, y: wallY }, ...weapons.slice(1)],
    };

    const validation = validateGrowthMap(broken);
    expect(validation.ok).toBe(false);
    expect(validation.issues.join(' ')).toContain('muro');
  });

  it('rechaza un arma solapada con un enemigo', () => {
    const map = generatedMap(PERF_SEED);
    const weapons = [...(map.weapons ?? [])];
    const enemy = map.enemies?.[0];
    if (!enemy) throw new Error('La semilla de referencia debe tener enemigos');
    const broken = {
      ...map,
      weapons: [{ ...weapons[0], x: enemy.x, y: enemy.y }, ...weapons.slice(1)],
    };

    const validation = validateGrowthMap(broken);
    expect(validation.ok).toBe(false);
    expect(validation.issues.join(' ')).toContain('enemigo');
  });

  it('rechaza un enemigo con home distinto de su posición', () => {
    const map = generatedMap(PERF_SEED);
    const enemies = [...(map.enemies ?? [])];
    const first = enemies[0];
    const broken = {
      ...map,
      enemies: [
        {
          ...first,
          home: { x: first.home.x + 1, y: first.home.y },
        },
        ...enemies.slice(1),
      ],
    };

    const validation = validateGrowthMap(broken);
    expect(validation.ok).toBe(false);
    expect(validation.issues.join(' ')).toContain('home');
  });
});

describe('barrido de 200 semillas de growth completo', () => {
  it('mantiene el contrato y el validador sin incidencias', () => {
    const generator = new GrowthMapGenerator();
    let failures = 0;

    for (let seed = 1; seed <= 200; seed += 1) {
      const map = generator.generate(seed);
      const validation = validateGrowthMap(map);
      if (!validation.ok) {
        failures += 1;
        console.log(`seed=${seed} issues=${validation.issues.join(' | ')}`);
      }
      expect(validation.issues, `semilla ${seed}`).toEqual([]);
      expect(map.width, `semilla ${seed}`).toBe(22);
      expect(map.height, `semilla ${seed}`).toBe(18);
      expect(map.spawns.party, `semilla ${seed}`).toHaveLength(6);
      console.log(
        `seed ${seed} rooms=${map.rooms.length} doors=${map.doors.length} ` +
          `exit=${map.exit?.kind ?? 'null'}:${map.exit?.distance ?? '-'} ` +
          `enemies=${map.enemies?.length ?? 0} warnings=${map.warnings.length}`,
      );
    }

    expect(failures).toBe(0);
  });
});
