import { describe, expect, it } from 'vitest';
import {
  computeMetrics,
  connectivityPercentage,
  countWideFloor,
  createDungeon,
  fingerprint,
  isDoorValid,
  longestStraight,
  wallTileFor,
  type DungeonState,
  type Point,
  type VariantId,
} from './dungeon';

const variants: VariantId[] = ['bsp', 'random', 'hybrid'];
const seeds = [1, 123, 20261107];
const defaults = {
  width: 32,
  height: 32,
  roomTarget: 10,
  roomMin: 3,
  roomMax: 11,
  loopRatio: 20,
};

function roomAt(state: DungeonState, point: Point) {
  return (
    state.rooms.find(
      (room) =>
        point.x >= room.x &&
        point.y >= room.y &&
        point.x < room.x + room.width &&
        point.y < room.y + room.height,
    ) ?? null
  );
}

function overlapsWithPadding(a: DungeonState['rooms'][number], b: DungeonState['rooms'][number]): boolean {
  return (
    a.x - 1 < b.x + b.width &&
    b.x - 1 < a.x + a.width &&
    a.y - 1 < b.y + b.height &&
    b.y - 1 < a.y + a.height
  );
}

function isFloor(state: DungeonState, point: Point): boolean {
  return state.tiles[point.y * state.width + point.x] === 1;
}

function isDoor(state: DungeonState, point: Point): boolean {
  return state.doors.some((door) => door.x === point.x && door.y === point.y);
}

describe('PRNG y generación pura', () => {
  it('la misma semilla y opciones producen estados profundamente iguales', () => {
    for (const variant of variants) {
      const first = createDungeon(variant, 20261107, defaults);
      const second = createDungeon(variant, 20261107, defaults);
      expect(first).toEqual(second);
      expect(fingerprint(first)).toBe(fingerprint(second));
    }
  });

  it('semillas distintas cambian la huella de las tres variantes', () => {
    for (const variant of variants) {
      const first = createDungeon(variant, 1, defaults);
      const second = createDungeon(variant, 2, defaults);
      expect(fingerprint(first)).not.toBe(fingerprint(second));
    }
  });

  it('no usa Math.random ni relojes dentro de la generación', () => {
    const originalRandom = Math.random;
    let randomCalls = 0;
    Math.random = () => {
      randomCalls += 1;
      return originalRandom();
    };
    try {
      createDungeon('bsp', 123, defaults);
    } finally {
      Math.random = originalRandom;
    }
    expect(randomCalls).toBe(0);
  });
});

describe('mapas por defecto de A/B/C', () => {
  for (const variant of variants) {
    for (const seed of seeds) {
      it(`${variant} · semilla ${seed}: salas, conectividad, huecos y bucles`, () => {
        const state = createDungeon(variant, seed, defaults);

        expect(state.rooms.length).toBeGreaterThanOrEqual(8);
        expect(state.rooms.length).toBeLessThanOrEqual(12);

        for (const room of state.rooms) {
          expect(room.width).toBeGreaterThanOrEqual(defaults.roomMin);
          expect(room.height).toBeGreaterThanOrEqual(defaults.roomMin);
          expect(room.width).toBeLessThanOrEqual(defaults.roomMax);
          expect(room.height).toBeLessThanOrEqual(defaults.roomMax);
        }

        for (let first = 0; first < state.rooms.length; first += 1) {
          for (let second = first + 1; second < state.rooms.length; second += 1) {
            expect(
              overlapsWithPadding(state.rooms[first], state.rooms[second]),
              `salas ${first} y ${second} demasiado juntas`,
            ).toBe(false);
          }
        }

        expect(connectivityPercentage(state)).toBeCloseTo(100, 5);
        expect(state.loops).toBeGreaterThanOrEqual(1);
        expect(state.loops).toBeLessThanOrEqual(3);
        expect(state.doors.length).toBeGreaterThan(0);

        for (const room of state.rooms) {
          const doors = state.doors.filter((door) => door.roomId === room.id);
          expect(doors.length).toBeGreaterThanOrEqual(1);
          expect(doors.length).toBeLessThanOrEqual(3);
        }

        for (const door of state.doors) {
          expect(isDoorValid(state, door), `hueco inválido en ${door.x},${door.y}`).toBe(true);
        }

        for (const corridor of state.corridors) {
          expect(corridor.path.length).toBeGreaterThanOrEqual(3);
          for (const point of corridor.path) {
            expect(state.tiles[point.y * state.width + point.x]).toBe(1);
          }
        }

        expect(countWideFloor(state), 'no deben existir bloques 2×2 de pasillo').toBe(0);

        const playerRoom = roomAt(state, state.spawns.player);
        const enemyRoom = roomAt(state, state.spawns.enemy);
        expect(playerRoom).not.toBeNull();
        expect(enemyRoom).not.toBeNull();
        expect(playerRoom?.id).not.toBe(enemyRoom?.id);
        expect(isFloor(state, state.spawns.player)).toBe(true);
        expect(isFloor(state, state.spawns.enemy)).toBe(true);
        expect(isDoor(state, state.spawns.player)).toBe(false);
        expect(isDoor(state, state.spawns.enemy)).toBe(false);
        expect(state.spawns.distance).toBeGreaterThan(0);

        const metrics = computeMetrics(state);
        expect(metrics.map((metric) => metric.label)).toEqual(
          expect.arrayContaining([
            'Salas',
            'Área mín.',
            'Área mediana',
            'Área máx.',
            'Suelo',
            'Pasillos',
            'Esquinas',
            'Callejones',
            'Bucles',
            'Huecos',
            'Conectividad',
            'Distancia',
            'Tiempo',
            'Huella',
            'Ajuste',
          ]),
        );
      });
    }
  }
});

describe('pasillos y estructura', () => {
  for (const variant of variants) {
    it(`${variant}: hay pasillos con esquinas y al menos un tramo recto largo`, () => {
      const state = createDungeon(variant, 20261107, defaults);
      const cornerCount = state.corridors.filter((corridor) => {
        const points = corridor.path;
        let corners = 0;
        for (let index = 1; index < points.length - 1; index += 1) {
          const inX = Math.sign(points[index].x - points[index - 1].x);
          const inY = Math.sign(points[index].y - points[index - 1].y);
          const outX = Math.sign(points[index + 1].x - points[index].x);
          const outY = Math.sign(points[index + 1].y - points[index].y);
          if (inX !== outX || inY !== outY) corners += 1;
        }
        return corners > 0;
      }).length;
      expect(cornerCount).toBeGreaterThan(0);
      expect(Math.max(...state.corridors.map((corridor) => longestStraight(corridor.path)))).toBeGreaterThanOrEqual(5);
    });
  }

  it('la variante híbrida añade callejones de relleno sin romper la conectividad', () => {
    const plain = createDungeon('random', 20261107, defaults);
    const hybrid = createDungeon('hybrid', 20261107, defaults);
    const deadEnds = (state: DungeonState) => {
      let count = 0;
      for (let y = 1; y <= state.height - 2; y += 1) {
        for (let x = 1; x <= state.width - 2; x += 1) {
          const index = y * state.width + x;
          if (state.tiles[index] !== 1) continue;
          const room = roomAt(state, { x, y });
          if (room || isDoor(state, { x, y })) continue;
          const neighbours = [
            { x, y: y - 1 },
            { x: x + 1, y },
            { x, y: y + 1 },
            { x: x - 1, y },
          ].filter((point) => isFloor(state, point));
          if (neighbours.length === 1) count += 1;
        }
      }
      return count;
    };
    expect(deadEnds(hybrid)).toBeGreaterThanOrEqual(deadEnds(plain));
    expect(connectivityPercentage(hybrid)).toBeCloseTo(100, 5);
  });
});

describe('regla de muros', () => {
  it('usa side1 solo con suelo al sur y top en el resto', () => {
    const grid = {
      width: 4,
      height: 4,
      tiles: [
        0, 0, 0, 0,
        0, 1, 0, 0,
        0, 0, 0, 0,
        1, 0, 0, 0,
      ],
    };
    expect(wallTileFor(grid, 1, 0)).toBe('wallSide1');
    expect(wallTileFor(grid, 0, 0)).toBe('wallTop');
    expect(wallTileFor(grid, 1, 1)).toBe('wallTop');
    expect(wallTileFor(grid, 3, 2)).toBe('wallTop');
    expect(wallTileFor(grid, 0, 3)).toBe('wallTop');
  });

  it('nunca devuelve wallSide2 en mapas generados', () => {
    for (const variant of variants) {
      const state = createDungeon(variant, 123, defaults);
      for (let y = 0; y < state.height; y += 1) {
        for (let x = 0; x < state.width; x += 1) {
          if (state.tiles[y * state.width + x] === 1) continue;
          const tile = wallTileFor(state, x, y);
          expect(['wallTop', 'wallSide1']).toContain(tile);
          const southIsFloor =
            y + 1 < state.height && state.tiles[(y + 1) * state.width + x] === 1;
          expect(tile).toBe(southIsFloor ? 'wallSide1' : 'wallTop');
        }
      }
    }
  });
});

describe('validación de huecos', () => {
  it('rechaza un hueco si falta el muro perpendicular', () => {
    const state = createDungeon('random', 20261107, defaults);
    const door = state.doors[0];
    expect(isDoorValid(state, door)).toBe(true);

    const broken: DungeonState = { ...state, tiles: [...state.tiles] };
    const perpendicular =
      door.orientation === 'horizontal'
        ? { x: door.x - 1, y: door.y }
        : { x: door.x, y: door.y - 1 };
    broken.tiles[perpendicular.y * broken.width + perpendicular.x] = 1;
    expect(isDoorValid(broken, door)).toBe(false);
  });
});
