import { describe, expect, it, vi } from 'vitest';
import {
  BspMapGenerator,
  DEFAULT_MAP_OPTIONS,
  DEFAULT_MAP_SEED,
  clamp,
  classifyRoom,
  connectivityPercentage,
  countPathCorners,
  countWideFloor,
  floorDistances,
  isFloorTile,
  isLargeRoom,
  isOrthogonalPath,
  isSmallRoom,
  longestStraight,
  maxDeadEndLength,
  placeMapWeapons,
  resolveMapOptions,
  roomAt,
  roomsOverlap,
  roomsWithoutSeparation,
  tileIndex,
  validateGeneratedMap,
  wideCorridorStretch,
  type Corridor,
  type Door,
  type GeneratedMap,
  type MapGenerator,
  type Room,
  type Tile,
} from '../../../src/game/index';

const generator = new BspMapGenerator();
const reference = generator.generate(DEFAULT_MAP_SEED, DEFAULT_MAP_OPTIONS);

function floorCount(map: GeneratedMap): number {
  return map.tiles.filter((tile) => tile === 'floor').length;
}

function roomMaxDistance(
  map: GeneratedMap,
  room: Room,
  distances: Int32Array,
): number {
  let best = -1;
  for (let y = room.y; y < room.y + room.height; y += 1) {
    for (let x = room.x; x < room.x + room.width; x += 1) {
      const distance = distances[tileIndex(map.width, x, y)];
      if (distance > best) best = distance;
    }
  }
  return best;
}

function buildMapWithTiles(
  width: number,
  height: number,
  floors: ReadonlyArray<readonly [number, number]>,
  rooms: readonly Room[],
  spawns: GeneratedMap['spawns'],
): GeneratedMap {
  const tiles: Tile[] = new Array<Tile>(width * height).fill('wall');
  for (const [x, y] of floors) {
    tiles[tileIndex(width, x, y)] = 'floor';
  }
  return {
    seed: 0,
    width,
    height,
    tiles,
    rooms,
    corridors: [],
    doors: [],
    spawns,
    warnings: [],
    options: DEFAULT_MAP_OPTIONS,
  };
}

describe('opciones del mapa', () => {
  it('usa la configuración de referencia de EXP-001 por defecto', () => {
    const resolved = resolveMapOptions();

    expect(resolved.warnings).toEqual([]);
    expect(resolved.options).toEqual({
      mapWidth: 32,
      mapHeight: 32,
      roomTarget: 9,
      roomMin: 4,
      roomMax: 11,
      loopRatio: 20,
      wideCorridorCount: 0,
      wideCorridorWidth: 2,
    });
    expect(DEFAULT_MAP_OPTIONS).toEqual(resolved.options);
  });

  it('expone la interfaz MapGenerator con id bsp', () => {
    const asInterface: MapGenerator = generator;

    expect(asInterface.id).toBe('bsp');
    expect(typeof asInterface.generate).toBe('function');
    expect(asInterface.generate(DEFAULT_MAP_SEED, DEFAULT_MAP_OPTIONS).seed).toBe(
      DEFAULT_MAP_SEED,
    );
  });

  it('normaliza valores fuera de rango con avisos y no lanza', () => {
    const resolved = resolveMapOptions({
      mapWidth: 10,
      mapHeight: 4,
      roomTarget: 20,
      roomMin: 2,
      roomMax: 20,
      loopRatio: 23,
      wideCorridorCount: 1,
      wideCorridorWidth: 9,
    });

    expect(resolved.options.mapWidth).toBe(20);
    expect(resolved.options.mapHeight).toBe(20);
    expect(resolved.options.roomTarget).toBe(12);
    expect(resolved.options.roomMin).toBe(3);
    expect(resolved.options.roomMax).toBe(11);
    expect(resolved.options.loopRatio).toBe(25);
    expect(resolved.options.wideCorridorCount).toBe(1);
    expect(resolved.options.wideCorridorWidth).toBe(2);
    expect(resolved.warnings.length).toBeGreaterThan(0);
    expect(resolved.warnings.join(' ')).toMatch(/pasillos? anchos?/i);
  });

  it('acepta wideCorridorCount 1 y 2 y normaliza el ancho a 2', () => {
    const forcedOne = generator.generate(DEFAULT_MAP_SEED, {
      ...DEFAULT_MAP_OPTIONS,
      wideCorridorCount: 1,
    });
    expect(forcedOne.options.wideCorridorCount).toBe(1);
    expect(forcedOne.corridors.filter((corridor) => corridor.width === 2)).toHaveLength(1);

    const forcedTwo = generator.generate(DEFAULT_MAP_SEED, {
      ...DEFAULT_MAP_OPTIONS,
      wideCorridorCount: 2,
      wideCorridorWidth: 2,
    });
    expect(forcedTwo.options.wideCorridorCount).toBe(2);
    const wideTwo = forcedTwo.corridors.filter((corridor) => corridor.width === 2);
    expect(wideTwo.length).toBeGreaterThanOrEqual(1);
    expect(wideTwo.length).toBeLessThanOrEqual(2);

    const normalized = resolveMapOptions({ wideCorridorWidth: 3 });
    expect(normalized.options.wideCorridorWidth).toBe(2);
    expect(normalized.warnings.join(' ')).toMatch(/ancho de pasillo ancho/i);
  });
});

describe('determinismo', () => {
  it('la misma semilla y opciones producen un mapa profundamente igual', () => {
    const first = generator.generate(DEFAULT_MAP_SEED, DEFAULT_MAP_OPTIONS);
    const second = generator.generate(DEFAULT_MAP_SEED, DEFAULT_MAP_OPTIONS);

    expect(JSON.stringify(second)).toBe(JSON.stringify(first));
    expect(second).toEqual(first);
    expect(second.doors).toEqual(first.doors);
    expect(second.corridors).toEqual(first.corridors);
    expect(second.doors.length).toBeGreaterThan(0);
  });

  it('semillas distintas producen diferencias estructurales', () => {
    const other = generator.generate(1, DEFAULT_MAP_OPTIONS);

    const sameTiles = JSON.stringify(other.tiles) === JSON.stringify(reference.tiles);
    const sameRooms = JSON.stringify(other.rooms) === JSON.stringify(reference.rooms);
    expect(sameTiles && sameRooms).toBe(false);
  });

  it('las opciones forman parte del resultado y cambian el mapa', () => {
    const smaller = generator.generate(DEFAULT_MAP_SEED, {
      ...DEFAULT_MAP_OPTIONS,
      roomTarget: 8,
    });

    expect(smaller.options.roomTarget).toBe(8);
    expect(smaller.rooms.length).toBeLessThanOrEqual(8);
    expect(JSON.stringify(smaller.rooms)).not.toBe(JSON.stringify(reference.rooms));
  });
});

describe('estructura del mapa de referencia', () => {
  it('mide 32x32, está cerrado por muro y expone los datos del mapa', () => {
    expect(reference.width).toBe(32);
    expect(reference.height).toBe(32);
    expect(reference.seed).toBe(DEFAULT_MAP_SEED);
    expect(reference.tiles).toHaveLength(32 * 32);
    expect(Array.isArray(reference.tiles)).toBe(true);
    expect(reference.tiles.every((tile) => tile === 'floor' || tile === 'wall')).toBe(true);

    for (let x = 0; x < reference.width; x += 1) {
      expect(reference.tiles[tileIndex(reference.width, x, 0)]).toBe('wall');
      expect(reference.tiles[tileIndex(reference.width, x, reference.height - 1)]).toBe('wall');
    }
    for (let y = 0; y < reference.height; y += 1) {
      expect(reference.tiles[tileIndex(reference.width, 0, y)]).toBe('wall');
      expect(reference.tiles[tileIndex(reference.width, reference.width - 1, y)]).toBe('wall');
    }
  });

  it('tiene entre 8 y 12 salas con los roles mínimos y dimensiones válidas', () => {
    expect(reference.rooms.length).toBeGreaterThanOrEqual(8);
    expect(reference.rooms.length).toBeLessThanOrEqual(12);

    for (const room of reference.rooms) {
      expect(room.width).toBeGreaterThanOrEqual(DEFAULT_MAP_OPTIONS.roomMin);
      expect(room.width).toBeLessThanOrEqual(DEFAULT_MAP_OPTIONS.roomMax);
      expect(room.height).toBeGreaterThanOrEqual(DEFAULT_MAP_OPTIONS.roomMin);
      expect(room.height).toBeLessThanOrEqual(DEFAULT_MAP_OPTIONS.roomMax);
      expect(room.role).toBe(classifyRoom(room));
    }

    expect(reference.rooms.filter(isLargeRoom).length).toBeGreaterThanOrEqual(2);
    expect(reference.rooms.filter(isSmallRoom).length).toBeGreaterThanOrEqual(3);
  });

  it('no tiene salas solapadas y deja al menos un tile de muro entre ellas', () => {
    expect(roomsOverlap(reference.rooms)).toBeNull();
    expect(roomsWithoutSeparation(reference.rooms)).toBeNull();
  });

  it('cada sala tiene al menos una salida de pasillo', () => {
    for (const room of reference.rooms) {
      const hasExit = reference.corridors.some(
        (corridor) =>
          corridor.fromRoomId === room.id || corridor.toRoomId === room.id,
      );
      expect(hasExit, `sala ${room.id} sin salida`).toBe(true);
    }
  });

  it('los corredores son estrechos o anchos, ortogonales y forman un árbol más bucles', () => {
    expect(reference.corridors.length).toBeGreaterThan(0);
    for (const corridor of reference.corridors) {
      expect(corridor.width === 1 || corridor.width === 2).toBe(true);
      expect(corridor.doorEligible).toBe(corridor.width === 1);
      expect(corridor.kind === 'tree' || corridor.kind === 'loop').toBe(true);
      expect(isOrthogonalPath(corridor.path)).toBe(true);
      expect(corridor.path.length).toBeGreaterThanOrEqual(3);
    }

    const tree = reference.corridors.filter((corridor) => corridor.kind === 'tree');
    const loops = reference.corridors.filter((corridor) => corridor.kind === 'loop');
    expect(tree).toHaveLength(reference.rooms.length - 1);
    expect(loops).toHaveLength(2);
  });

  it('incluye un tramo recto largo y un corredor con dos o más esquinas', () => {
    const straight = Math.max(
      0,
      ...reference.corridors.map((corridor) => longestStraight(corridor.path)),
    );
    const corners = Math.max(
      0,
      ...reference.corridors.map((corridor) => countPathCorners(corridor.path)),
    );

    expect(straight).toBeGreaterThanOrEqual(5);
    expect(corners).toBeGreaterThanOrEqual(2);
  });

  it('no tiene callejones sin salida de más de 4 tiles', () => {
    expect(maxDeadEndLength(reference)).toBeLessThanOrEqual(4);
  });

  it('todas las celdas de suelo son alcanzables desde el jugador', () => {
    expect(connectivityPercentage(reference, reference.spawns.player)).toBe(100);
    expect(floorCount(reference)).toBeGreaterThan(0);
  });

  it('pasa el validador estructural completo', () => {
    const validation = validateGeneratedMap(reference);
    expect(validation.issues).toEqual([]);
    expect(validation.ok).toBe(true);
  });
});

function endpointOrientation(
  corridor: Corridor,
  atStart: boolean,
): { x: number; y: number; roomId: number; orientation: Door['orientation'] } {
  const path = corridor.path;
  const point = atStart ? path[0] : path[path.length - 1];
  const neighbour = atStart ? path[1] : path[path.length - 2];
  return {
    x: point.x,
    y: point.y,
    roomId: atStart ? corridor.fromRoomId : corridor.toRoomId,
    orientation:
      Math.sign(neighbour.y - point.y) !== 0 ? 'horizontal' : 'vertical',
  };
}

describe('huecos de puerta', () => {
  it('cada sala tiene entre 1 y 3 huecos y ninguna puerta está en pasillo ancho', () => {
    const counts = new Map<number, number>();
    for (const door of reference.doors) {
      counts.set(door.roomId, (counts.get(door.roomId) ?? 0) + 1);
    }
    for (const room of reference.rooms) {
      const count = counts.get(room.id) ?? 0;
      expect(count, `sala ${room.id}`).toBeGreaterThanOrEqual(1);
      expect(count, `sala ${room.id}`).toBeLessThanOrEqual(3);
    }

    const wideCells = new Set<string>();
    for (const corridor of reference.corridors) {
      if (corridor.width !== 2) continue;
      for (const point of corridor.path) wideCells.add(`${point.x},${point.y}`);
    }

    for (const door of reference.doors) {
      expect(reference.tiles[tileIndex(reference.width, door.x, door.y)]).toBe('floor');
      expect(wideCells.has(`${door.x},${door.y}`)).toBe(false);
      const horizontal = door.orientation === 'horizontal';
      if (horizontal) {
        expect(reference.tiles[tileIndex(reference.width, door.x - 1, door.y)]).toBe('wall');
        expect(reference.tiles[tileIndex(reference.width, door.x + 1, door.y)]).toBe('wall');
      } else {
        expect(reference.tiles[tileIndex(reference.width, door.x, door.y - 1)]).toBe('wall');
        expect(reference.tiles[tileIndex(reference.width, door.x, door.y + 1)]).toBe('wall');
      }
    }

    const keys = reference.doors.map((door) => `${door.x},${door.y}`);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('cada hueco coincide con un extremo de corredor estrecho y su orientación', () => {
    const endpoints = new Map<
      string,
      Array<{ x: number; y: number; roomId: number; orientation: Door['orientation'] }>
    >();
    for (const corridor of reference.corridors) {
      if (corridor.width !== 1) continue;
      for (const atStart of [true, false]) {
        const endpoint = endpointOrientation(corridor, atStart);
        const key = `${endpoint.x},${endpoint.y}`;
        const list = endpoints.get(key) ?? [];
        list.push(endpoint);
        endpoints.set(key, list);
      }
    }

    for (const door of reference.doors) {
      const matching = (endpoints.get(`${door.x},${door.y}`) ?? []).find(
        (endpoint) => endpoint.roomId === door.roomId,
      );
      expect(matching, `puerta ${door.x},${door.y}`).toBeDefined();
      expect(door.orientation).toBe(matching?.orientation);
    }
  });

  it('detecta una orientación incoherente con el eje del muro', () => {
    const door = reference.doors[0];
    const broken: GeneratedMap = {
      ...reference,
      doors: [
        {
          ...door,
          orientation: door.orientation === 'horizontal' ? 'vertical' : 'horizontal',
        },
        ...reference.doors.slice(1),
      ],
    };

    const validation = validateGeneratedMap(broken);
    expect(validation.ok).toBe(false);
    expect(validation.issues.join(' ')).toContain('orientación');
  });

  it('detecta un hueco sin muro lateral', () => {
    const door = reference.doors[0];
    const tiles = [...reference.tiles];
    if (door.orientation === 'horizontal') {
      tiles[tileIndex(reference.width, door.x - 1, door.y)] = 'floor';
    } else {
      tiles[tileIndex(reference.width, door.x, door.y - 1)] = 'floor';
    }
    const broken: GeneratedMap = { ...reference, tiles };

    const validation = validateGeneratedMap(broken);
    expect(validation.ok).toBe(false);
    expect(validation.issues.join(' ')).toContain('esquina o sin muro lateral');
  });

  it('detecta un hueco duplicado', () => {
    const broken: GeneratedMap = {
      ...reference,
      doors: [...reference.doors, reference.doors[0]],
    };

    const validation = validateGeneratedMap(broken);
    expect(validation.ok).toBe(false);
    expect(validation.issues.join(' ')).toContain('duplicada');
  });

  it('detecta una puerta fabricada sobre un pasillo ancho', () => {
    const wide = reference.corridors.find((corridor) => corridor.width === 2);
    expect(wide).toBeDefined();
    const point = wide?.path[Math.floor((wide.path.length - 1) / 2)];
    expect(point).toBeDefined();
    const fakeDoor: Door = {
      x: point?.x ?? 0,
      y: point?.y ?? 0,
      orientation: 'horizontal',
      roomId: wide?.fromRoomId ?? 0,
    };
    const broken: GeneratedMap = {
      ...reference,
      doors: [...reference.doors, fakeDoor],
    };

    const validation = validateGeneratedMap(broken);
    expect(validation.ok).toBe(false);
    expect(validation.issues.join(' ')).toContain('pasillo ancho');
  });
});

describe('pasillos anchos', () => {
  it('hay 1 o 2 pasillos de 2 tiles con al menos 4 tiles de carril real', () => {
    const wide = reference.corridors.filter((corridor) => corridor.width === 2);
    expect(wide.length).toBeGreaterThanOrEqual(1);
    expect(wide.length).toBeLessThanOrEqual(2);

    for (const corridor of wide) {
      expect(corridor.doorEligible).toBe(false);
      expect(corridor.path.length).toBeGreaterThanOrEqual(4);
      expect(wideCorridorStretch(reference, corridor)).toBeGreaterThanOrEqual(4);
      expect(connectivityPercentage(reference, reference.spawns.player)).toBe(100);
    }
    expect(countWideFloor(reference)).toBe(0);
  });

  it('cada sala conserva al menos un acceso estrecho con hueco', () => {
    for (const room of reference.rooms) {
      const narrowAccess = reference.corridors.some(
        (corridor) =>
          corridor.width === 1 &&
          (corridor.fromRoomId === room.id || corridor.toRoomId === room.id),
      );
      const narrowDoor = reference.doors.some((door) => door.roomId === room.id);
      expect(narrowAccess, `sala ${room.id} sin acceso estrecho`).toBe(true);
      expect(narrowDoor, `sala ${room.id} sin hueco`).toBe(true);
    }
  });

  it('varía el número y la posición de pasillos anchos entre semillas, siempre 1-2', () => {
    const counts = new Set<number>();
    const positions = new Set<string>();
    for (let seed = 0; seed < 16; seed += 1) {
      const map = generator.generate(seed, DEFAULT_MAP_OPTIONS);
      const wide = map.corridors.filter((corridor) => corridor.width === 2);
      expect(wide.length, `semilla ${seed}`).toBeGreaterThanOrEqual(1);
      expect(wide.length, `semilla ${seed}`).toBeLessThanOrEqual(2);
      expect(validateGeneratedMap(map).ok, `semilla ${seed}`).toBe(true);
      counts.add(wide.length);
      for (const corridor of wide) {
        positions.add(
          `${corridor.fromRoomId}-${corridor.toRoomId}:${corridor.path[0].x},${corridor.path[0].y}`,
        );
      }
    }
    expect([...counts].sort()).toEqual([1, 2]);
    expect(positions.size).toBeGreaterThan(2);
  });

  it('la misma semilla reproduce huecos y pasillos anchos exactamente', () => {
    const first = generator.generate(12345, DEFAULT_MAP_OPTIONS);
    const second = generator.generate(12345, DEFAULT_MAP_OPTIONS);
    expect(second.doors).toEqual(first.doors);
    expect(second.corridors).toEqual(first.corridors);
  });

  it('un width 2 sin carril real se detecta sobre la geometría', () => {
    const room: Room = { id: 0, x: 2, y: 2, width: 3, height: 3, role: 'small' };
    const floors: Array<readonly [number, number]> = [];
    for (let y = 2; y < 5; y += 1) {
      for (let x = 2; x < 5; x += 1) floors.push([x, y]);
    }
    for (let x = 8; x < 16; x += 1) floors.push([x, 10]);
    const base = buildMapWithTiles(20, 20, floors, [room], {
      player: { x: 3, y: 3 },
      enemy: { x: 3, y: 3 },
      distance: 0,
    });
    const path = Array.from({ length: 8 }, (_, index) => ({ x: 8 + index, y: 10 }));
    const fake: Corridor = {
      fromRoomId: 0,
      toRoomId: 0,
      kind: 'tree',
      width: 2,
      doorEligible: false,
      path,
    };
    const withoutLane: GeneratedMap = { ...base, corridors: [fake] };
    expect(wideCorridorStretch(withoutLane, fake)).toBe(0);

    const withLaneFloors = [...floors];
    for (let x = 8; x < 16; x += 1) withLaneFloors.push([x, 11]);
    const withLane = buildMapWithTiles(20, 20, withLaneFloors, [room], {
      player: { x: 3, y: 3 },
      enemy: { x: 3, y: 3 },
      distance: 0,
    });
    const declared: GeneratedMap = { ...withLane, corridors: [fake] };
    expect(wideCorridorStretch(declared, fake)).toBe(8);
  });

  it('un 2x2 con corredor ancho declarado no cuenta y uno suelto sí', () => {
    const room: Room = { id: 0, x: 2, y: 2, width: 3, height: 3, role: 'small' };
    const floors: Array<readonly [number, number]> = [];
    for (let y = 2; y < 5; y += 1) {
      for (let x = 2; x < 5; x += 1) floors.push([x, y]);
    }
    for (let x = 8; x < 13; x += 1) {
      floors.push([x, 10], [x, 11]);
    }
    const base = buildMapWithTiles(20, 20, floors, [room], {
      player: { x: 3, y: 3 },
      enemy: { x: 3, y: 3 },
      distance: 0,
    });
    const path = Array.from({ length: 5 }, (_, index) => ({ x: 8 + index, y: 10 }));
    const declared: GeneratedMap = {
      ...base,
      corridors: [
        {
          fromRoomId: 0,
          toRoomId: 0,
          kind: 'tree',
          width: 2,
          doorEligible: false,
          path,
        },
      ],
    };
    expect(countWideFloor(declared)).toBe(0);
    expect(countWideFloor(base)).toBeGreaterThan(0);
  });
});

describe('apariciones', () => {
  it('coloca al jugador en una sala con salida y al enemigo en la más lejana', () => {
    const spawns = reference.spawns;
    const playerRoom = roomAt(reference.rooms, spawns.player.x, spawns.player.y);
    const enemyRoom = roomAt(reference.rooms, spawns.enemy.x, spawns.enemy.y);

    expect(playerRoom).toBeDefined();
    expect(enemyRoom).toBeDefined();
    expect(playerRoom?.id).not.toBe(enemyRoom?.id);

    expect(
      reference.corridors.some(
        (corridor) =>
          corridor.fromRoomId === playerRoom?.id || corridor.toRoomId === playerRoom?.id,
      ),
    ).toBe(true);

    const distances = floorDistances(reference, spawns.player);
    const enemyDistance = distances[tileIndex(reference.width, spawns.enemy.x, spawns.enemy.y)];
    expect(spawns.distance).toBe(enemyDistance);
    expect(spawns.distance).toBeGreaterThanOrEqual(12);

    let farthestOther = -1;
    for (const room of reference.rooms) {
      if (room.id === playerRoom?.id) continue;
      farthestOther = Math.max(farthestOther, roomMaxDistance(reference, room, distances));
    }
    expect(enemyRoom ? roomMaxDistance(reference, enemyRoom, distances) : -1).toBe(farthestOther);
  });

  it('coloca al enemigo fuera del viewport inicial de 13x13 sobre suelo', () => {
    const { player, enemy } = reference.spawns;
    const originX = clamp(player.x - 6, 0, reference.width - 13);
    const originY = clamp(player.y - 6, 0, reference.height - 13);

    const outside =
      enemy.x < originX ||
      enemy.x > originX + 12 ||
      enemy.y < originY ||
      enemy.y > originY + 12;
    expect(outside).toBe(true);

    expect(reference.tiles[tileIndex(reference.width, player.x, player.y)]).toBe('floor');
    expect(reference.tiles[tileIndex(reference.width, enemy.x, enemy.y)]).toBe('floor');
  });
});

describe('armas del mapa', () => {
  const weapons = reference.weapons ?? [];

  it('coloca el hacha y la daga como entidades con ID, posición y arma', () => {
    expect(weapons.map((weapon) => weapon.weaponId).sort()).toEqual(['axe', 'dagger']);
    expect(new Set(weapons.map((weapon) => weapon.id)).size).toBe(2);

    for (const weapon of weapons) {
      expect(Number.isInteger(weapon.x)).toBe(true);
      expect(Number.isInteger(weapon.y)).toBe(true);
      expect(weapon.x).toBeGreaterThanOrEqual(0);
      expect(weapon.y).toBeGreaterThanOrEqual(0);
      expect(weapon.x).toBeLessThan(reference.width);
      expect(weapon.y).toBeLessThan(reference.height);
    }
  });

  it('usa dos salas distintas y ninguna es la sala inicial', () => {
    const playerRoom = roomAt(
      reference.rooms,
      reference.spawns.player.x,
      reference.spawns.player.y,
    );
    expect(playerRoom).toBeDefined();

    const roomIds = weapons.map((weapon) => {
      const room = roomAt(reference.rooms, weapon.x, weapon.y);
      expect(room, `arma ${weapon.id} fuera de sala`).toBeDefined();
      expect(room?.id).not.toBe(playerRoom?.id);
      return room?.id;
    });

    expect(new Set(roomIds).size).toBe(2);
  });

  it('es alcanzable y no ocupa muro, puerta ni aparición', () => {
    const distances = floorDistances(reference, reference.spawns.player);
    const doorKeys = new Set(reference.doors.map((door) => `${door.x},${door.y}`));
    const spawnKeys = new Set([
      `${reference.spawns.player.x},${reference.spawns.player.y}`,
      `${reference.spawns.enemy.x},${reference.spawns.enemy.y}`,
    ]);

    for (const weapon of weapons) {
      expect(isFloorTile(reference, weapon.x, weapon.y), weapon.id).toBe(true);
      expect(
        distances[tileIndex(reference.width, weapon.x, weapon.y)],
        weapon.id,
      ).toBeGreaterThan(0);
      expect(doorKeys.has(`${weapon.x},${weapon.y}`), weapon.id).toBe(false);
      expect(spawnKeys.has(`${weapon.x},${weapon.y}`), weapon.id).toBe(false);
    }
  });

  it('es determinista y otra semilla cambia la colocación', () => {
    const again = generator.generate(DEFAULT_MAP_SEED, DEFAULT_MAP_OPTIONS);
    expect(again.weapons).toEqual(weapons);

    const other = generator.generate(1234, DEFAULT_MAP_OPTIONS);
    expect(other.weapons).toHaveLength(2);
    expect(other.weapons).not.toEqual(weapons);
  });

  it('admite celdas bloqueadas opcionales sin cambiar las armas BSP por defecto', () => {
    const first = weapons[0];
    if (!first) throw new Error('La semilla de referencia debe colocar armas');
    const restricted = placeMapWeapons(reference, {
      blockedCells: [{ x: first.x, y: first.y }],
    });

    expect(restricted).toHaveLength(2);
    expect(restricted.map((weapon) => weapon.weaponId).sort()).toEqual([
      'axe',
      'dagger',
    ]);
    expect(
      restricted.some(
        (weapon) => weapon.x === first.x && weapon.y === first.y,
      ),
    ).toBe(false);
    expect(
      generator.generate(DEFAULT_MAP_SEED, DEFAULT_MAP_OPTIONS).weapons,
    ).toEqual(weapons);
  });

  it('no usa Math.random ni altera los spawns de la semilla de referencia', () => {
    const random = vi.spyOn(Math, 'random');
    try {
      const map = generator.generate(DEFAULT_MAP_SEED, DEFAULT_MAP_OPTIONS);
      expect(map.spawns).toEqual(reference.spawns);
      expect(map.spawns.party?.[0]).toEqual(map.spawns.player);
      expect(random).not.toHaveBeenCalled();
    } finally {
      random.mockRestore();
    }
  });
});

describe('serialización y validadores negativos', () => {
  it('el mapa es JSON-safe y sobrevive al round-trip', () => {
    const parsed = JSON.parse(JSON.stringify(reference)) as GeneratedMap;

    expect(parsed).toEqual(reference);
    expect(parsed.doors).toEqual(reference.doors);
    expect(parsed.doors.length).toBeGreaterThan(0);
    expect(parsed.corridors.some((corridor) => corridor.width === 2)).toBe(true);
    expect(Array.isArray(parsed.tiles)).toBe(true);
  });

  it('detecta salas solapadas fabricadas a mano', () => {
    const first = reference.rooms[0];
    const second = reference.rooms[1];
    const brokenRooms: readonly Room[] = [
      first,
      { ...second, x: first.x, y: first.y },
      ...reference.rooms.slice(2),
    ];
    const broken: GeneratedMap = { ...reference, rooms: brokenRooms };

    expect(roomsOverlap(brokenRooms)).not.toBeNull();
    const validation = validateGeneratedMap(broken);
    expect(validation.ok).toBe(false);
    expect(validation.issues.join(' ')).toContain('se solapan');
  });

  it('detecta un mapa sin conectividad total', () => {
    const room: Room = { id: 0, x: 2, y: 2, width: 3, height: 3, role: 'small' };
    const floors: Array<readonly [number, number]> = [];
    for (let y = 2; y < 5; y += 1) {
      for (let x = 2; x < 5; x += 1) floors.push([x, y]);
    }
    for (let y = 10; y < 13; y += 1) {
      for (let x = 10; x < 13; x += 1) floors.push([x, y]);
    }
    const broken = buildMapWithTiles(20, 20, floors, [room], {
      player: { x: 3, y: 3 },
      enemy: { x: 11, y: 11 },
      distance: 8,
    });

    const validation = validateGeneratedMap(broken);
    expect(validation.ok).toBe(false);
    expect(validation.issues.join(' ')).toContain('Conectividad');
  });

  it('detecta bloques 2x2 de suelo fuera de salas', () => {
    const room: Room = { id: 0, x: 2, y: 2, width: 3, height: 3, role: 'small' };
    const floors: Array<readonly [number, number]> = [];
    for (let y = 2; y < 5; y += 1) {
      for (let x = 2; x < 5; x += 1) floors.push([x, y]);
    }
    floors.push([8, 8], [9, 8], [8, 9], [9, 9]);
    const broken = buildMapWithTiles(20, 20, floors, [room], {
      player: { x: 3, y: 3 },
      enemy: { x: 3, y: 3 },
      distance: 0,
    });

    expect(countWideFloor(broken)).toBeGreaterThan(0);
    const validation = validateGeneratedMap(broken);
    expect(validation.ok).toBe(false);
    expect(validation.issues.join(' ')).toContain('2×2');
  });
});

describe('otros tamaños', () => {
  it('genera 24x24 con 8-12 salas y conectividad total', () => {
    const map = generator.generate(DEFAULT_MAP_SEED, {
      ...DEFAULT_MAP_OPTIONS,
      mapWidth: 24,
      mapHeight: 24,
    });

    expect(map.width).toBe(24);
    expect(map.height).toBe(24);
    expect(map.tiles).toHaveLength(24 * 24);
    expect(map.rooms.length).toBeGreaterThanOrEqual(8);
    expect(map.rooms.length).toBeLessThanOrEqual(12);
    expect(validateGeneratedMap(map).ok).toBe(true);

    const wide = map.corridors.filter((corridor) => corridor.width === 2);
    if (wide.length === 0) {
      expect(map.warnings.join(' ')).toMatch(/pasillos? anchos?/i);
    } else {
      expect(wide.length).toBeLessThanOrEqual(2);
      for (const corridor of wide) {
        expect(wideCorridorStretch(map, corridor)).toBeGreaterThanOrEqual(4);
      }
    }

    if (map.rooms.filter(isLargeRoom).length < 2 || map.rooms.filter(isSmallRoom).length < 3) {
      expect(map.warnings.join(' ')).toContain('No se pudo garantizar');
    }
  });

  it('genera 40x40 con los roles mínimos y conectividad total', () => {
    const map = generator.generate(DEFAULT_MAP_SEED, {
      ...DEFAULT_MAP_OPTIONS,
      mapWidth: 40,
      mapHeight: 40,
    });

    expect(map.width).toBe(40);
    expect(map.height).toBe(40);
    expect(map.rooms.length).toBeGreaterThanOrEqual(8);
    expect(map.rooms.length).toBeLessThanOrEqual(12);
    expect(map.rooms.filter(isLargeRoom).length).toBeGreaterThanOrEqual(2);
    expect(map.rooms.filter(isSmallRoom).length).toBeGreaterThanOrEqual(3);
    expect(validateGeneratedMap(map).ok).toBe(true);
    const wide = map.corridors.filter((corridor) => corridor.width === 2);
    expect(wide.length).toBeGreaterThanOrEqual(1);
    expect(wide.length).toBeLessThanOrEqual(2);
  });
});

describe('rendimiento', () => {
  it('genera la semilla de referencia por debajo de 100 ms', () => {
    const perfGenerator = new BspMapGenerator();
    // Calentamiento: mide la función pura, nunca dentro del generador.
    perfGenerator.generate(DEFAULT_MAP_SEED, DEFAULT_MAP_OPTIONS);

    const times: number[] = [];
    for (let run = 0; run < 3; run += 1) {
      const start = performance.now();
      perfGenerator.generate(DEFAULT_MAP_SEED, DEFAULT_MAP_OPTIONS);
      times.push(performance.now() - start);
    }

    const sorted = [...times].sort((a, b) => a - b);
    const median = sorted[1];
    const maximum = Math.max(...times);

    // Valores reales visibles en la salida de tests para el informe.
    console.log(
      `[map-performance] seed=${DEFAULT_MAP_SEED} runs=${times
        .map((time) => time.toFixed(2))
        .join(',')} median=${median.toFixed(2)} max=${maximum.toFixed(2)}`,
    );

    expect(median).toBeLessThan(100);
    expect(maximum).toBeLessThan(100);
  });
});
