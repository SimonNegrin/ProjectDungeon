import { describe, expect, it, vi } from 'vitest';
import {
  ALARM_RADIUS,
  BspMapGenerator,
  DEFAULT_MAP_OPTIONS,
  DEFAULT_MAP_SEED,
  floorDistances,
  placeMapEnemies,
  roomAt,
  tileIndex,
  validateGeneratedMap,
  type GeneratedMap,
  type Room,
} from '../../../src/game/index';
import { hasLineOfSight } from '../../../src/game/perception';
import {
  SPAWN_MIN_TILES,
  SPAWN_RADIUS,
  chooseSpawnAccess,
  maxComponentSize,
  partyCapacity,
  roomAreaOf,
  type OpenMouth,
} from '../../../src/game/chambers/core';

const SEEDS = [DEFAULT_MAP_SEED, 1, 42, 1234, 987654, ...Array.from({ length: 20 }, (_, index) => index + 1)];

function wideMouths(map: GeneratedMap): OpenMouth[] {
  const mouths: OpenMouth[] = [];
  let id = 0;
  for (let index = 0; index < map.corridors.length; index += 1) {
    const corridor = map.corridors[index];
    if (corridor.width !== 2 || corridor.path.length < 2) continue;
    const points = [corridor.path[0], corridor.path[corridor.path.length - 1]];
    for (const point of points) {
      mouths.push({
        id,
        x: point.x,
        y: point.y,
        orientation: 'horizontal',
        roomA: corridor.fromRoomId,
        roomB: corridor.toRoomId,
        corridorId: index,
        reason: 'pasillo-ancho',
      });
      id += 1;
    }
  }
  return mouths;
}

function accessesFor(map: GeneratedMap, roomId: number): number {
  let accesses = map.doors.filter(
    (door) => door.roomA === roomId || door.roomB === roomId,
  ).length;
  for (const corridor of map.corridors) {
    if (
      corridor.width === 2 &&
      (corridor.fromRoomId === roomId || corridor.toRoomId === roomId)
    ) {
      // Una boca ancha ocupa dos tiles y pesa como dos accesos.
      accesses += 2;
    }
  }
  return accesses;
}

function capacityFor(map: GeneratedMap, room: Room): number {
  const access = chooseSpawnAccess(room, map.doors, wideMouths(map));
  return partyCapacity(
    room,
    map.doors,
    access,
    map.tiles,
    map.width,
    map.height,
    map.seed,
  );
}

function assertBspSpawnContract(map: GeneratedMap): void {
  const spawnRoom = roomAt(map.rooms, map.spawns.player.x, map.spawns.player.y);
  expect(spawnRoom).toBeDefined();
  const party = map.spawns.party ?? [];

  expect(spawnRoom?.id).toBe(map.spawns.roomId);
  expect(party).toHaveLength(SPAWN_MIN_TILES);
  expect(party[0]).toEqual(map.spawns.player);
  expect(maxComponentSize(party)).toBeLessThanOrEqual(2);
  for (const cell of party) {
    expect(roomAt(map.rooms, cell.x, cell.y)?.id).toBe(spawnRoom?.id);
    expect(
      Math.max(
        Math.abs(cell.x - map.spawns.player.x),
        Math.abs(cell.y - map.spawns.player.y),
      ),
    ).toBeLessThanOrEqual(SPAWN_RADIUS);
  }

  const viable = map.rooms.filter((room) => capacityFor(map, room) >= SPAWN_MIN_TILES);
  if (viable.length > 0) {
    const minimumAccesses = Math.min(...viable.map((room) => accessesFor(map, room.id)));
    expect(accessesFor(map, spawnRoom!.id)).toBe(minimumAccesses);
    const tied = viable.filter((room) => accessesFor(map, room.id) === minimumAccesses);
    const largestArea = Math.max(...map.rooms.map(roomAreaOf));
    if (tied.some((room) => roomAreaOf(room) !== largestArea)) {
      expect(roomAreaOf(spawnRoom!)).not.toBe(largestArea);
    }
  }

  const anchor = map.spawns.enemy;
  expect(roomAt(map.rooms, anchor.x, anchor.y)?.id).not.toBe(map.spawns.roomId);
  expect(
    map.doors.some((door) => door.x === anchor.x && door.y === anchor.y),
    'ancla sobre una puerta',
  ).toBe(false);
  expect(
    (map.weapons ?? []).some((weapon) => weapon.x === anchor.x && weapon.y === anchor.y),
    'ancla sobre un arma',
  ).toBe(false);
  expect(
    party.some((cell) => cell.x === anchor.x && cell.y === anchor.y),
    'ancla sobre un hueco de spawn',
  ).toBe(false);
  for (const hole of party) {
    expect(
      hasLineOfSight(map, anchor, hole),
      `ancla ve el spawn (${anchor.x},${anchor.y})`,
    ).toBe(false);
  }

  // El validador histórico no debe recibir la salida de BSP en este corte.
  expect(map.exit).toBeUndefined();
  expect(validateGeneratedMap(map).issues).toEqual([]);
}

function assertEnemiesContract(map: GeneratedMap): void {
  const enemies = placeMapEnemies(map);
  expect(enemies, `semilla ${map.seed}`).not.toBeNull();
  if (!enemies) return;

  expect(enemies).toHaveLength(4);
  expect(enemies.map((enemy) => enemy.id)).toEqual([
    'enemy-1',
    'enemy-2',
    'enemy-3',
    'enemy-4',
  ]);

  const roomIds = new Set<number>();
  const holes = map.spawns.party ?? [map.spawns.player];
  for (const enemy of enemies) {
    const room = roomAt(map.rooms, enemy.x, enemy.y);
    expect(room, `enemigo ${enemy.id} fuera de sala`).toBeDefined();
    expect(room?.id).not.toBe(map.spawns.roomId);
    expect(roomIds.has(room!.id), `sala repetida ${room!.id}`).toBe(false);
    roomIds.add(room!.id);
    for (const hole of holes) {
      expect(
        hasLineOfSight(map, enemy, hole),
        `enemigo ${enemy.id} ve el spawn`,
      ).toBe(false);
    }
  }

  let pairInsideAlarm = false;
  let isolated = false;
  for (let first = 0; first < enemies.length; first += 1) {
    let farFromEveryone = true;
    for (let second = 0; second < enemies.length; second += 1) {
      if (first === second) continue;
      const distance = Math.max(
        Math.abs(enemies[first].x - enemies[second].x),
        Math.abs(enemies[first].y - enemies[second].y),
      );
      expect(distance).toBeGreaterThanOrEqual(2);
      if (distance <= ALARM_RADIUS) {
        pairInsideAlarm = true;
        farFromEveryone = false;
      }
    }
    if (farFromEveryone) isolated = true;
  }
  expect(pairInsideAlarm).toBe(true);
  expect(isolated).toBe(true);
}

describe('BSP adopta el contrato de spawn de REQ-012', () => {
  it('la semilla de referencia usa el spawn protegido y conserva 4 enemigos', () => {
    const map = new BspMapGenerator().generate(DEFAULT_MAP_SEED, DEFAULT_MAP_OPTIONS);

    assertBspSpawnContract(map);
    assertEnemiesContract(map);
    expect(JSON.parse(JSON.stringify(map))).toEqual(map);
  });

  it('mantiene el contrato en 25 semillas alternativas', () => {
    const generator = new BspMapGenerator();
    for (const seed of SEEDS) {
      const map = generator.generate(seed, DEFAULT_MAP_OPTIONS);
      assertBspSpawnContract(map);
      assertEnemiesContract(map);
    }
  });

  it('spawns.enemy sigue serializado y no es la fuente de verdad', () => {
    const map = new BspMapGenerator().generate(DEFAULT_MAP_SEED, DEFAULT_MAP_OPTIONS);
    const enemies = placeMapEnemies(map);
    const anchorRoom = roomAt(map.rooms, map.spawns.enemy.x, map.spawns.enemy.y);
    const distances = floorDistances(map, map.spawns.player);
    const anchorDistance =
      distances[tileIndex(map.width, map.spawns.enemy.x, map.spawns.enemy.y)];

    expect(anchorRoom?.id).not.toBe(map.spawns.roomId);
    expect(anchorDistance).toBe(map.spawns.distance);
    expect(enemies).toHaveLength(4);
    expect(
      new Set(
        enemies?.map((enemy) => roomAt(map.rooms, enemy.x, enemy.y)?.id),
      ).size,
    ).toBe(4);
  });

  it('no usa Math.random ni añade salida', () => {
    const random = vi.spyOn(Math, 'random');
    try {
      const map = new BspMapGenerator().generate(DEFAULT_MAP_SEED, DEFAULT_MAP_OPTIONS);
      expect(map.exit).toBeUndefined();
      expect(random).not.toHaveBeenCalled();
    } finally {
      random.mockRestore();
    }
  });
});
