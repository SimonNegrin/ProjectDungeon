import { describe, expect, it } from 'vitest';
import { generateMap, validateMap } from './generate';
import { hasLineOfSight, placeSpawns } from './spawn';
import type { GeneratedMap, Room, VariantId } from './types';

const VARIANTS: VariantId[] = ['growth', 'bsp', 'templates'];
const SEEDS = Array.from({ length: 20 }, (_, index) => index + 1);

function freeCells(map: GeneratedMap, room: Room) {
  const doors = new Set(map.doors.map((door) => `${door.x},${door.y}`));
  return room.cells.filter((cell) => !doors.has(`${cell.x},${cell.y}`));
}

function roomDistance(map: GeneratedMap, room: Room): number {
  const sum = room.cells.reduce(
    (accumulator, cell) => ({
      x: accumulator.x + cell.x / room.cells.length,
      y: accumulator.y + cell.y / room.cells.length,
    }),
    { x: 0, y: 0 },
  );
  return Math.abs(sum.x - map.spawns.player.x) + Math.abs(sum.y - map.spawns.player.y);
}

function chebyshev(a: { x: number; y: number }, b: { x: number; y: number }): number {
  return Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y));
}

describe('spawn protegido y reparto de enemigos', () => {
  it('la sala de spawn tiene ≥6 huecos, sin puertas ni enemigos, y es la más protegida', () => {
    for (const variant of VARIANTS) {
      for (const seed of SEEDS) {
        const map = generateMap(variant, seed);
        const spawnRoom = map.rooms.find((room) => room.id === map.spawns.roomId);
        expect(spawnRoom, `${variant} · ${seed}`).toBeDefined();
        if (!spawnRoom) continue;

        expect(map.spawns.party.length).toBeGreaterThanOrEqual(6);
        expect(map.spawns.player).toEqual(map.spawns.party[0]);
        expect(new Set(map.spawns.party.map((hole) => `${hole.x},${hole.y}`)).size).toBe(
          map.spawns.party.length,
        );
        expect(map.enemies.some((enemy) => enemy.roomId === spawnRoom.id)).toBe(false);

        const doors = new Set(map.doors.map((door) => `${door.x},${door.y}`));
        for (const hole of map.spawns.party) {
          expect(map.tiles[hole.y * map.width + hole.x]).toBe(1);
          expect(doors.has(`${hole.x},${hole.y}`)).toBe(false);
          expect(map.enemies.some((enemy) => enemy.x === hole.x && enemy.y === hole.y)).toBe(false);
        }

        const viable = map.rooms
          .filter((room) => freeCells(map, room).length >= 6)
          .sort(
            (a, b) =>
              a.accesses - b.accesses ||
              b.area - a.area ||
              a.id - b.id,
          );
        if (viable.length > 0) {
          expect(spawnRoom.id, `${variant} · ${seed}`).toBe(viable[0].id);
          expect(spawnRoom.accesses).toBe(viable[0].accesses);
        }
      }
    }
  });

  it('los enemigos están en suelo, dentro de su sala, separados 2 y sin visión inicial al spawn', () => {
    for (const variant of VARIANTS) {
      for (const seed of SEEDS) {
        const map = generateMap(variant, seed);
        const spawnRoomId = map.spawns.roomId;

        for (const enemy of map.enemies) {
          expect(enemy.roomId).not.toBe(spawnRoomId);
          expect(map.tiles[enemy.y * map.width + enemy.x]).toBe(1);
          expect(enemy.home).toEqual({ x: enemy.x, y: enemy.y });
          const room = map.rooms.find((item) => item.id === enemy.roomId);
          expect(room?.cells.some((cell) => cell.x === enemy.x && cell.y === enemy.y)).toBe(true);
          for (const hole of map.spawns.party) {
            expect(
              hasLineOfSight(map.tiles, map.width, map.height, enemy, hole),
              `${variant} · ${seed} · enemigo ${enemy.id}`,
            ).toBe(false);
          }
        }

        for (let first = 0; first < map.enemies.length; first += 1) {
          for (let second = first + 1; second < map.enemies.length; second += 1) {
            expect(chebyshev(map.enemies[first], map.enemies[second])).toBeGreaterThanOrEqual(2);
          }
        }
      }
    }
  });

  it('el reparto respeta 0-1 salas vacías, máximo 2 por sala y composición de tipos', () => {
    for (const variant of VARIANTS) {
      for (const seed of SEEDS) {
        const map = generateMap(variant, seed);
        const nonSpawn = map.rooms.filter((room) => room.id !== map.spawns.roomId);
        const counts = nonSpawn.map(
          (room) => map.enemies.filter((enemy) => enemy.roomId === room.id).length,
        );
        const empty = counts.filter((count) => count === 0).length;

        expect(map.enemies.length).toBe(nonSpawn.length);
        expect(empty).toBeLessThanOrEqual(1);
        if (nonSpawn.length < 4) expect(empty).toBe(0);
        expect(Math.max(...counts)).toBeLessThanOrEqual(2);

        const sentinels = map.enemies.filter((enemy) => enemy.type === 'sentinel').length;
        const brutes = map.enemies.filter((enemy) => enemy.type === 'brute').length;
        const cowards = map.enemies.filter((enemy) => enemy.type === 'coward').length;
        const total = map.enemies.length;
        expect(cowards).toBeLessThanOrEqual(1);
        expect(brutes).toBeLessThanOrEqual(1);
        if (total === 0) {
          expect(sentinels).toBe(0);
        } else if (total === 1) {
          expect(sentinels).toBe(1);
          expect(brutes + cowards).toBe(0);
        } else {
          expect(cowards).toBe(1);
          expect(brutes).toBe(1);
          expect(sentinels).toBe(total - 2);
        }
      }
    }
  });

  it('el cobarde ocupa la sala más lejana y el bruto la siguiente', () => {
    for (const variant of VARIANTS) {
      for (const seed of SEEDS) {
        const map = generateMap(variant, seed);
        if (map.enemies.length < 3) continue;
        const occupied = map.rooms
          .filter((room) => map.enemies.some((enemy) => enemy.roomId === room.id))
          .sort((a, b) => roomDistance(map, b) - roomDistance(map, a) || a.id - b.id);
        const coward = map.enemies.find((enemy) => enemy.type === 'coward');
        const brute = map.enemies.find((enemy) => enemy.type === 'brute');
        expect(coward?.roomId, `${variant} · ${seed}`).toBe(occupied[0]?.id);
        expect(brute?.roomId, `${variant} · ${seed}`).toBe(occupied[1]?.id);
      }
    }
  });

  it('la sala vacía, si existe, es una hoja de un acceso cuando hay hojas disponibles', () => {
    for (const variant of VARIANTS) {
      for (const seed of SEEDS) {
        const map = generateMap(variant, seed);
        const empty = map.rooms.filter(
          (room) =>
            room.id !== map.spawns.roomId &&
            !map.enemies.some((enemy) => enemy.roomId === room.id),
        );
        if (empty.length === 0) continue;
        expect(empty).toHaveLength(1);
        const leaves = map.rooms.filter(
          (room) => room.id !== map.spawns.roomId && room.accesses === 1,
        );
        if (leaves.length > 0) expect(empty[0].accesses).toBe(1);
      }
    }
  });

  it('el fallback de spawn avisa y nunca deja unidades en muro o puerta', () => {
    const room: Room = {
      id: 0,
      x: 1,
      y: 1,
      width: 2,
      height: 2,
      cells: [
        { x: 1, y: 1 },
        { x: 2, y: 1 },
        { x: 1, y: 2 },
      ],
      role: 'small',
      sizeRole: 'small',
      area: 3,
      boxArea: 4,
      notches: 1,
      alcoves: 0,
      accesses: 0,
      doorIds: [],
      ambient: 'mixed',
      palette: 'neutral',
    };
    const tiles = [0, 0, 0, 0, 1, 1, 0, 1, 0] as const;
    const result = placeSpawns({
      rooms: [room],
      doors: [],
      corridors: [],
      tiles,
      width: 3,
      height: 3,
      minTiles: 6,
      seed: 1,
    });
    expect(result.warnings.length).toBeGreaterThan(0);
    expect(result.spawns.party.length).toBeLessThan(6);
    expect(result.spawns.party.length).toBeGreaterThan(0);
  });

  it('la línea de visión se bloquea con un muro y atraviesa una puerta abierta', () => {
    const open = [1, 1, 1, 1, 1, 1, 1, 1, 1] as const;
    expect(hasLineOfSight(open, 3, 3, { x: 0, y: 1 }, { x: 2, y: 1 })).toBe(true);
    const wall = [1, 0, 1, 1, 0, 1, 1, 0, 1] as const;
    expect(hasLineOfSight(wall, 3, 3, { x: 0, y: 1 }, { x: 2, y: 1 })).toBe(false);
  });

  it('los mapas por defecto no necesitan relajar spawn ni visión', () => {
    for (const variant of VARIANTS) {
      for (const seed of SEEDS) {
        const map = generateMap(variant, seed);
        const relevant = map.warnings.filter(
          (warning) =>
            /spawn|visión|huecos|separación/i.test(warning) &&
            !/pasillo ancho|pared compartida|BSP|plantilla|crecimiento/i.test(warning),
        );
        expect(relevant, `${variant} · ${seed}`).toEqual([]);
        expect(validateMap(map)).toEqual([]);
      }
    }
  });
});
