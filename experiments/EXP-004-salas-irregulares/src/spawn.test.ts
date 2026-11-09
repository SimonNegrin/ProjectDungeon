import { describe, expect, it } from 'vitest';
import { generateMap, validateMap } from './generate';
import {
  ENEMY_SEPARATION,
  SPAWN_MIN_TILES,
  SPAWN_RADIUS,
  SPAWN_SEPARATION,
  assignEnemyTypes,
  distributeEnemyBudget,
  enemyTotalFor,
  enemyTypeCounts,
  hasLineOfSight,
  placeSpawns,
} from './spawn';
import type { GeneratedMap, Point, Room, VariantId } from './types';

const VARIANTS: VariantId[] = ['growth', 'bsp', 'templates'];
const SEEDS = Array.from({ length: 20 }, (_, index) => index + 1);

function freeCells(map: GeneratedMap, room: Room): Point[] {
  const doors = new Set(map.doors.map((door) => `${door.x},${door.y}`));
  return room.cells.filter((cell) => !doors.has(`${cell.x},${cell.y}`));
}

function chebyshev(a: Point, b: Point): number {
  return Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y));
}

function center(room: Room): Point {
  const sum = room.cells.reduce(
    (accumulator, cell) => ({
      x: accumulator.x + cell.x / room.cells.length,
      y: accumulator.y + cell.y / room.cells.length,
    }),
    { x: 0, y: 0 },
  );
  return sum;
}

function distanceToCenterSquared(anchor: Point, room: Room): number {
  const roomCenter = center(room);
  return (anchor.x - roomCenter.x) ** 2 + (anchor.y - roomCenter.y) ** 2;
}

function interiorCellNextTo(anchor: Point, room: Room): Point | null {
  const cells = room.cells
    .filter(
      (cell) =>
        Math.abs(cell.x - anchor.x) + Math.abs(cell.y - anchor.y) === 1,
    )
    .sort(
      (a, b) =>
        distanceToCenterSquared(a, room) - distanceToCenterSquared(b, room) ||
        a.y - b.y ||
        a.x - b.x,
    );
  return cells[0] ?? null;
}

function expectedAccess(map: GeneratedMap, room: Room): Point {
  const doors = map.doors
    .filter((door) => door.roomA === room.id || door.roomB === room.id)
    .sort(
      (a, b) =>
        distanceToCenterSquared(a, room) - distanceToCenterSquared(b, room) ||
        a.id - b.id,
    );
  for (const door of doors) {
    const access = interiorCellNextTo(door, room);
    if (access) return access;
  }
  const mouths = map.openMouths
    .filter((mouth) => mouth.roomA === room.id || mouth.roomB === room.id)
    .sort(
      (a, b) =>
        distanceToCenterSquared(a, room) - distanceToCenterSquared(b, room) ||
        a.id - b.id,
    );
  for (const mouth of mouths) {
    const access = interiorCellNextTo(mouth, room);
    if (access) return access;
  }
  return [...room.cells].sort(
    (a, b) =>
      distanceToCenterSquared(a, room) - distanceToCenterSquared(b, room) ||
      a.y - b.y ||
      a.x - b.x,
  )[0];
}

function hasSpawnRelaxWarning(map: GeneratedMap): boolean {
  return map.warnings.some((warning) =>
    /radio 3|sala completa|separación|huecos libres|Ninguna sala/i.test(warning),
  );
}

describe('spawn alrededor del acceso y enemigos por superficie/jugadores', () => {
  it('la sala de spawn es la más protegida entre las que tienen ≥6 huecos', () => {
    for (const variant of VARIANTS) {
      for (const seed of SEEDS) {
        const map = generateMap(variant, seed);
        const spawnRoom = map.rooms.find((room) => room.id === map.spawns.roomId);
        expect(spawnRoom, `${variant} · ${seed}`).toBeDefined();
        if (!spawnRoom) continue;

        const viable = map.rooms
          .filter((room) => freeCells(map, room).length >= SPAWN_MIN_TILES)
          .sort(
            (a, b) =>
              a.accesses - b.accesses ||
              freeCells(map, b).length - freeCells(map, a).length ||
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

  it('party[0] es el acceso junto a la puerta más cercana al centro o, si no hay, junto a la boca', () => {
    for (const variant of VARIANTS) {
      for (const seed of SEEDS) {
        const map = generateMap(variant, seed);
        const spawnRoom = map.rooms.find((room) => room.id === map.spawns.roomId);
        if (!spawnRoom) continue;
        expect(map.spawns.player, `${variant} · ${seed}`).toEqual(map.spawns.party[0]);
        expect(map.spawns.player, `${variant} · ${seed}`).toEqual(
          expectedAccess(map, spawnRoom),
        );
        expect(
          spawnRoom.cells.some(
            (cell) =>
              cell.x === map.spawns.player.x && cell.y === map.spawns.player.y,
          ),
          `${variant} · ${seed} · acceso dentro de la sala`,
        ).toBe(true);
      }
    }
  });

  it('los huecos son distintos, de suelo, dentro de la sala y fuera de puertas/enemigos', () => {
    for (const variant of VARIANTS) {
      for (const seed of SEEDS) {
        const map = generateMap(variant, seed);
        const spawnRoom = map.rooms.find((room) => room.id === map.spawns.roomId);
        expect(spawnRoom).toBeDefined();
        if (!spawnRoom) continue;

        expect(map.spawns.party.length).toBeGreaterThanOrEqual(SPAWN_MIN_TILES);
        expect(
          new Set(map.spawns.party.map((hole) => `${hole.x},${hole.y}`)).size,
        ).toBe(map.spawns.party.length);
        const doors = new Set(map.doors.map((door) => `${door.x},${door.y}`));

        for (const hole of map.spawns.party) {
          expect(map.tiles[hole.y * map.width + hole.x]).toBe(1);
          expect(spawnRoom.cells.some((cell) => cell.x === hole.x && cell.y === hole.y)).toBe(true);
          expect(doors.has(`${hole.x},${hole.y}`)).toBe(false);
          expect(
            map.enemies.some((enemy) => enemy.x === hole.x && enemy.y === hole.y),
          ).toBe(false);
        }
      }
    }
  });

  it('sin fallback, el grupo queda a radio 2 y separado 2; con fallback hay aviso', () => {
    for (const variant of VARIANTS) {
      for (const seed of SEEDS) {
        const map = generateMap(variant, seed);
        if (hasSpawnRelaxWarning(map)) continue;
        for (const hole of map.spawns.party.slice(1)) {
          expect(
            chebyshev(hole, map.spawns.player),
            `${variant} · ${seed} · radio`,
          ).toBeLessThanOrEqual(SPAWN_RADIUS);
        }
        for (let first = 0; first < map.spawns.party.length; first += 1) {
          for (let second = first + 1; second < map.spawns.party.length; second += 1) {
            expect(
              chebyshev(map.spawns.party[first], map.spawns.party[second]),
              `${variant} · ${seed} · separación`,
            ).toBeGreaterThanOrEqual(SPAWN_SEPARATION);
          }
        }
      }
    }
  });

  it('el fallback de una sala pequeña avisa y nunca deja huecos repetidos o en muro', () => {
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
      openMouths: [],
      tiles,
      width: 3,
      height: 3,
      minTiles: 6,
      seed: 1,
    });
    expect(result.warnings.length).toBeGreaterThan(0);
    expect(result.spawns.party.length).toBeLessThan(6);
    expect(result.spawns.party.length).toBeGreaterThan(0);
    expect(result.spawns.player).toEqual(result.spawns.party[0]);
    for (const hole of result.spawns.party) {
      expect(tiles[hole.y * 3 + hole.x]).toBe(1);
    }
  });

  it('T sigue la fórmula, incluidos factores a 0 y cambios de P', () => {
    for (const variant of VARIANTS) {
      for (const seed of SEEDS) {
        const map = generateMap(variant, seed);
        const { enemy } = map.stats;
        expect(enemy.surfaceN).toBe(map.stats.roomFloor);
        expect(enemy.playersP).toBe(3);
        expect(enemy.surfaceFactor).toBe(0.02);
        expect(enemy.playersFactor).toBe(1.35);
        expect(enemy.surfaceTerm).toBe(Math.ceil(0.02 * enemy.surfaceN));
        expect(enemy.playersTerm).toBe(Math.ceil(1.35 * 3));
        expect(enemy.total).toBe(enemy.surfaceTerm + enemy.playersTerm);
        expect(enemy.total).toBe(
          enemyTotalFor(enemy.surfaceN, 3, 0.02, 1.35),
        );
      }
    }

    for (const variant of VARIANTS) {
      const zero = generateMap(variant, 7, {
        enemySurfaceFactor: 0,
        enemyPlayersFactor: 0,
      });
      expect(zero.stats.enemy.total).toBe(0);
      expect(zero.enemies).toHaveLength(0);
    }

    for (const variant of VARIANTS) {
      const custom = generateMap(variant, 9, {
        enemySurfaceFactor: 0.05,
        enemyPlayersFactor: 2,
        numPlayers: 5,
      });
      expect(custom.stats.enemy.total).toBe(
        Math.ceil(0.05 * custom.stats.roomFloor) + Math.ceil(2 * 5),
      );
    }
  });

  it('el reparto usa mayor resto, mínimo 1, spawn 0 y suma T', () => {
    for (const variant of VARIANTS) {
      for (const seed of SEEDS) {
        const map = generateMap(variant, seed);
        const { enemy } = map.stats;
        const nonSpawn = map.rooms.filter((room) => room.id !== map.spawns.roomId);

        expect(enemy.planned).toBeLessThanOrEqual(enemy.total);
        expect(enemy.perRoom.reduce((sum, value) => sum + value, 0)).toBe(enemy.planned);
        expect(enemy.perRoom[map.spawns.roomId]).toBe(0);
        if (enemy.planned >= nonSpawn.length) {
          for (const room of nonSpawn) {
            expect(enemy.perRoom[room.id], `${variant} · ${seed} · sala ${room.id}`).toBeGreaterThanOrEqual(1);
          }
          expect(map.stats.emptyRooms).toBe(0);
        }
      }
    }

    const rooms: Room[] = [100, 50, 25, 10].map((area, index) => ({
      id: index,
      x: 0,
      y: 0,
      width: 1,
      height: 1,
      cells: [{ x: index, y: 0 }],
      role: index === 0 ? 'spawn' : 'medium',
      sizeRole: 'medium',
      area,
      boxArea: area,
      notches: 0,
      alcoves: 0,
      accesses: 1,
      doorIds: [],
      ambient: 'mixed',
      palette: 'neutral',
    }));
    const { budgets, warnings } = distributeEnemyBudget(rooms, 0, 7);
    expect(warnings).toEqual([]);
    expect(budgets.get(0)).toBe(0);
    expect([...(budgets.values())].reduce((sum, value) => sum + value, 0)).toBe(7);
    expect(budgets.get(1)).toBeGreaterThanOrEqual(budgets.get(2) ?? 0);
    expect(budgets.get(2)).toBeGreaterThanOrEqual(budgets.get(3) ?? 0);
  });

  it('reparte 60/20/20 con redondeo y prioridades de cobarde/bruto', () => {
    expect(enemyTypeCounts(10)).toEqual({ sentinels: 6, brutes: 2, cowards: 2 });
    expect(enemyTypeCounts(4)).toEqual({ sentinels: 2, brutes: 1, cowards: 1 });
    expect(enemyTypeCounts(3)).toEqual({ sentinels: 1, brutes: 1, cowards: 1 });
    expect(enemyTypeCounts(2)).toEqual({ sentinels: 2, brutes: 0, cowards: 0 });
    expect(enemyTypeCounts(0)).toEqual({ sentinels: 0, brutes: 0, cowards: 0 });

    const priorities = [
      { id: 0, area: 10, distance: 1 },
      { id: 1, area: 100, distance: 5 },
      { id: 2, area: 20, distance: 9 },
    ];
    const budgets = new Map<number, number>([
      [0, 1],
      [1, 3],
      [2, 2],
    ]);
    const assignments = assignEnemyTypes(priorities, budgets, enemyTypeCounts(6));
    const coward = assignments.find((assignment) => assignment.type === 'coward');
    const brute = assignments.find((assignment) => assignment.type === 'brute');
    expect(coward?.roomId).toBe(2);
    expect(brute?.roomId).toBe(1);
    expect(assignments.filter((assignment) => assignment.type === 'sentinel')).toHaveLength(4);
  });

  it('los enemigos caen en su sala, separados 2 y sin visión salvo aviso de relajación', () => {
    for (const variant of VARIANTS) {
      for (const seed of SEEDS) {
        const map = generateMap(variant, seed);
        const visionRelaxed = map.warnings.some((warning) =>
          /relajó la línea de visión/i.test(warning),
        );
        for (const enemy of map.enemies) {
          expect(enemy.roomId).not.toBe(map.spawns.roomId);
          expect(map.tiles[enemy.y * map.width + enemy.x]).toBe(1);
          expect(enemy.home).toEqual({ x: enemy.x, y: enemy.y });
          const room = map.rooms.find((item) => item.id === enemy.roomId);
          expect(
            room?.cells.some((cell) => cell.x === enemy.x && cell.y === enemy.y),
          ).toBe(true);
        }
        for (let first = 0; first < map.enemies.length; first += 1) {
          for (let second = first + 1; second < map.enemies.length; second += 1) {
            expect(
              chebyshev(map.enemies[first], map.enemies[second]),
              `${variant} · ${seed} · separación`,
            ).toBeGreaterThanOrEqual(ENEMY_SEPARATION);
          }
        }
        if (!visionRelaxed) {
          for (const enemy of map.enemies) {
            for (const hole of map.spawns.party) {
              expect(
                hasLineOfSight(map.tiles, map.width, map.height, enemy, hole),
                `${variant} · ${seed} · enemigo ${enemy.id}`,
              ).toBe(false);
            }
          }
        }
        expect(validateMap(map), `${variant} · ${seed}`).toEqual([]);
      }
    }
  });

  it('los mapas por defecto no relajan la separación y solo relajan visión si es imposible, con aviso', () => {
    for (const variant of VARIANTS) {
      for (const seed of SEEDS) {
        const map = generateMap(variant, seed);
        expect(
          map.warnings.filter((warning) => /no pudo colocar|separación de enemigos/i.test(warning)),
          `${variant} · ${seed} · separación`,
        ).toEqual([]);
        const visionRelaxed = map.warnings.some((warning) =>
          /relajó la línea de visión/i.test(warning),
        );
        for (let first = 0; first < map.enemies.length; first += 1) {
          for (let second = first + 1; second < map.enemies.length; second += 1) {
            expect(
              chebyshev(map.enemies[first], map.enemies[second]),
              `${variant} · ${seed} · separación`,
            ).toBeGreaterThanOrEqual(ENEMY_SEPARATION);
          }
        }
        if (!visionRelaxed) {
          for (const enemy of map.enemies) {
            for (const hole of map.spawns.party) {
              expect(
                hasLineOfSight(map.tiles, map.width, map.height, enemy, hole),
                `${variant} · ${seed} · enemigo ${enemy.id}`,
              ).toBe(false);
            }
          }
        }
        expect(validateMap(map), `${variant} · ${seed}`).toEqual([]);
      }
    }
  });

  it('la línea de visión se bloquea con un muro y atraviesa una puerta abierta', () => {
    const open = [1, 1, 1, 1, 1, 1, 1, 1, 1] as const;
    expect(hasLineOfSight(open, 3, 3, { x: 0, y: 1 }, { x: 2, y: 1 })).toBe(true);
    const wall = [1, 0, 1, 1, 0, 1, 1, 0, 1] as const;
    expect(hasLineOfSight(wall, 3, 3, { x: 0, y: 1 }, { x: 2, y: 1 })).toBe(false);
  });
});
