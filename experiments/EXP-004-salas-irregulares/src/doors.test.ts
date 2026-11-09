import { describe, expect, it } from 'vitest';
import { generateMap, validateMap } from './generate';
import { DOOR_MIN_SEPARATION, placeDoors, validateDoorCandidate } from './doors';
import type { DoorCorridorShape, DoorRoomShape } from './doors';
import type { Tile, VariantId } from './types';

const VARIANTS: VariantId[] = ['growth', 'bsp', 'templates'];
const SEEDS = Array.from({ length: 20 }, (_, index) => index + 1);

function grid(width: number, height: number, floors: Array<[number, number]>): Tile[] {
  const tiles = new Array<Tile>(width * height).fill(0);
  for (const [x, y] of floors) tiles[y * width + x] = 1;
  return tiles;
}

function room(id: number, cells: Array<[number, number]>): DoorRoomShape {
  return { id, cells: cells.map(([x, y]) => ({ x, y })) };
}

function corridor(
  id: number,
  roomA: number,
  roomB: number,
  cells: Array<[number, number]>,
  kind: DoorCorridorShape['kind'] = 'door',
): DoorCorridorShape {
  return {
    id,
    roomA,
    roomB,
    kind,
    length: Math.max(0, cells.length - 1),
    cells: cells.map(([x, y]) => ({ x, y })),
  };
}

describe('puertas validadas por geometría', () => {
  it('acepta una puerta directa con dos muros en la línea y suelo a ambos lados', () => {
    const width = 7;
    const height = 5;
    const rooms = [
      room(0, [
        [1, 1],
        [1, 2],
        [1, 3],
        [2, 1],
        [2, 2],
        [2, 3],
      ]),
      room(1, [
        [4, 1],
        [4, 2],
        [4, 3],
        [5, 1],
        [5, 2],
        [5, 3],
      ]),
    ];
    const tiles = grid(width, height, [
      ...rooms[0].cells.map((cell) => [cell.x, cell.y] as [number, number]),
      ...rooms[1].cells.map((cell) => [cell.x, cell.y] as [number, number]),
      [3, 2],
    ]);
    const result = placeDoors({
      rooms,
      corridors: [corridor(0, 0, 1, [[3, 2]])],
      tiles,
      width,
      height,
      seed: 1,
    });
    expect(result.doors).toHaveLength(1);
    expect(result.doors[0]).toMatchObject({
      x: 3,
      y: 2,
      orientation: 'vertical',
      roomA: 0,
      roomB: 1,
      direct: true,
    });
    expect(result.openMouths).toHaveLength(0);
    expect(validateDoorCandidate(result.doors[0], tiles, width, height)).toBeNull();
  });

  it('rechaza una puerta sin dos muros en la línea (soporte)', () => {
    const tiles = grid(7, 5, [
      [1, 2],
      [3, 2],
      [4, 2],
      [3, 1],
    ]);
    expect(
      validateDoorCandidate(
        { x: 3, y: 2, orientation: 'vertical', roomA: 0, roomB: 1 },
        tiles,
        7,
        5,
      ),
    ).toBe('sin-soporte');
  });

  it('rechaza una puerta sin suelo a ambos lados', () => {
    const tiles = grid(7, 5, [[3, 2], [2, 1], [2, 3], [4, 2]]);
    expect(
      validateDoorCandidate(
        { x: 3, y: 2, orientation: 'vertical', roomA: 0, roomB: 1 },
        tiles,
        7,
        5,
      ),
    ).toBe('sin-suelo');
  });

  it('rechaza una puerta que no conecta dos salas distintas', () => {
    const tiles = grid(7, 5, [[1, 2], [3, 2], [4, 2]]);
    expect(
      validateDoorCandidate(
        { x: 3, y: 2, orientation: 'vertical', roomA: 0, roomB: 0 },
        tiles,
        7,
        5,
      ),
    ).toBe('misma-sala');
  });

  it('con dos puertas a Chebyshev <3 conserva una y marca la otra como boca', () => {
    const width = 6;
    const height = 7;
    const rooms = [
      room(0, [[1, 2]]),
      room(1, [[3, 2]]),
      room(2, [[1, 4]]),
      room(3, [[3, 4]]),
    ];
    const tiles = grid(width, height, [
      [1, 2],
      [2, 2],
      [3, 2],
      [1, 4],
      [2, 4],
      [3, 4],
    ]);
    const result = placeDoors({
      rooms,
      corridors: [
        corridor(0, 0, 1, [[2, 2]]),
        corridor(1, 2, 3, [[2, 4]]),
      ],
      tiles,
      width,
      height,
      seed: 2,
    });
    expect(result.doors).toHaveLength(1);
    expect(
      Math.max(
        Math.abs(result.doors[0].x - 2),
        Math.abs(result.doors[0].y - 2),
      ),
    ).toBe(0);
    expect(result.openMouths.some((mouth) => mouth.reason === 'separacion')).toBe(true);
    expect(result.openMouths.some((mouth) => mouth.reason === 'una-por-pasillo')).toBe(false);
  });

  it('con dos extremos válidos en un pasillo solo deja una puerta', () => {
    const width = 8;
    const height = 4;
    const rooms = [room(0, [[1, 1]]), room(1, [[6, 1]])];
    const tiles = grid(width, height, [
      [1, 1],
      [2, 1],
      [3, 1],
      [4, 1],
      [5, 1],
      [6, 1],
    ]);
    const result = placeDoors({
      rooms,
      corridors: [corridor(0, 0, 1, [[2, 1], [3, 1], [4, 1], [5, 1]], 'short')],
      tiles,
      width,
      height,
      seed: 3,
    });
    expect(result.doors).toHaveLength(1);
    expect(result.openMouths).toHaveLength(1);
    expect(result.openMouths[0].reason).toBe('una-por-pasillo');
  });

  it('un pasillo ancho nunca lleva puerta y deja bocas con motivo', () => {
    const width = 9;
    const height = 6;
    const rooms = [room(0, [[1, 2]]), room(1, [[6, 2]])];
    const tiles = grid(width, height, [
      [1, 2],
      [2, 2],
      [3, 2],
      [4, 2],
      [5, 2],
      [6, 2],
      [2, 1],
      [3, 1],
      [4, 1],
      [5, 1],
    ]);
    const result = placeDoors({
      rooms,
      corridors: [
        corridor(0, 0, 1, [[2, 2], [3, 2], [4, 2], [5, 2]], 'wide'),
      ],
      tiles,
      width,
      height,
      seed: 4,
    });
    expect(result.doors).toHaveLength(0);
    expect(result.openMouths.length).toBeGreaterThanOrEqual(1);
    expect(result.openMouths.every((mouth) => mouth.reason === 'pasillo-ancho')).toBe(true);
  });

  it('es determinista: misma entrada, mismas puertas y bocas', () => {
    const rooms = [room(0, [[1, 2]]), room(1, [[4, 2]])];
    const tiles = grid(7, 5, [[1, 2], [2, 2], [3, 2], [4, 2]]);
    const input = {
      rooms,
      corridors: [corridor(0, 0, 1, [[2, 2], [3, 2]], 'short')],
      tiles,
      width: 7,
      height: 5,
      seed: 5,
    };
    expect(placeDoors(input)).toEqual(placeDoors(input));
  });

  it('todas las puertas de A/B/C son válidas, están separadas y no hay dos por pasillo', () => {
    const allowedReasons = new Set([
      'sin-soporte',
      'sin-suelo',
      'misma-sala',
      'separacion',
      'una-por-pasillo',
      'pasillo-ancho',
    ]);
    for (const variant of VARIANTS) {
      for (const seed of SEEDS) {
        const map = generateMap(variant, seed);
        expect(validateMap(map), `${variant} · ${seed}`).toEqual([]);
        for (const mouth of map.openMouths) {
          expect(allowedReasons.has(mouth.reason)).toBe(true);
          const corridor = map.corridors.find((item) => item.id === mouth.corridorId);
          if (corridor?.kind === 'wide') {
            expect(mouth.reason).toBe('pasillo-ancho');
          } else {
            expect(mouth.reason).not.toBe('pasillo-ancho');
          }
        }
        for (let first = 0; first < map.doors.length; first += 1) {
          for (let second = first + 1; second < map.doors.length; second += 1) {
            expect(
              Math.max(
                Math.abs(map.doors[first].x - map.doors[second].x),
                Math.abs(map.doors[first].y - map.doors[second].y),
              ),
            ).toBeGreaterThanOrEqual(DOOR_MIN_SEPARATION);
          }
        }
        for (const corridor of map.corridors) {
          const doors = map.doors.filter((door) => door.corridorId === corridor.id);
          expect(doors.length).toBeLessThanOrEqual(1);
          if (corridor.kind === 'wide') expect(doors).toHaveLength(0);
        }
      }
    }
  });
});
