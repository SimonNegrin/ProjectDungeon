import { describe, expect, it } from 'vitest';
import { hasDiagonalLeak, wallTileKind } from './grid';
import { generateMap, validateMap } from './generate';
import type { GeneratedMap, VariantId } from './types';

const VARIANTS: VariantId[] = ['growth', 'bsp', 'templates'];
const SEEDS = [279837264, 1, 2, 3, 42, 123, 999, 20261107];

function ratio(room: GeneratedMap['rooms'][number]): number {
  return room.area / room.boxArea;
}

function minRoomDistance(map: GeneratedMap, roomA: number, roomB: number): number {
  const a = map.rooms.find((room) => room.id === roomA);
  const b = map.rooms.find((room) => room.id === roomB);
  if (!a || !b) return Number.POSITIVE_INFINITY;
  let best = Number.POSITIVE_INFINITY;
  for (const cellA of a.cells) {
    for (const cellB of b.cells) {
      best = Math.min(best, Math.abs(cellA.x - cellB.x) + Math.abs(cellA.y - cellB.y));
    }
  }
  return best;
}

describe('formas, muros y conexiones', () => {
  it('los mapas son conexos, sin diagonales sueltas y con el borde cerrado', () => {
    for (const variant of VARIANTS) {
      for (const seed of SEEDS) {
        const map = generateMap(variant, seed);
        expect(validateMap(map), `${variant} · ${seed}`).toEqual([]);
        expect(hasDiagonalLeak(map.tiles, map.width, map.height)).toBe(false);
        expect(map.tiles[0]).toBe(0);
        expect(map.tiles[map.width - 1]).toBe(0);
        expect(map.tiles[(map.height - 1) * map.width]).toBe(0);
        expect(map.tiles[map.height * map.width - 1]).toBe(0);
      }
    }
  });

  it('hay al menos una sala no rectangular, muescas y una relación área/caja razonable', () => {
    for (const variant of VARIANTS) {
      for (const seed of SEEDS) {
        const map = generateMap(variant, seed);
        const nonRect = map.rooms.filter((room) => room.area < room.boxArea);
        expect(nonRect.length, `${variant} · ${seed}`).toBeGreaterThanOrEqual(1);
        expect(map.rooms.reduce((sum, room) => sum + room.notches, 0)).toBeGreaterThanOrEqual(3);
        for (const room of nonRect) {
          expect(ratio(room), `${variant} · ${seed} · sala ${room.id}`).toBeGreaterThanOrEqual(0.55);
          expect(ratio(room), `${variant} · ${seed} · sala ${room.id}`).toBeLessThanOrEqual(0.92);
        }
      }
    }
  });

  it('hay al menos una sala grande y una pequeña en mapas sin caverna', () => {
    for (const variant of VARIANTS) {
      for (const seed of SEEDS) {
        const map = generateMap(variant, seed);
        if (map.stats.cavernRooms > 0) continue;
        expect(map.stats.largeRooms, `${variant} · ${seed}`).toBeGreaterThanOrEqual(1);
        expect(map.stats.smallRooms, `${variant} · ${seed}`).toBeGreaterThanOrEqual(1);
      }
    }
  });

  it('hay una puerta directa entre salas vecinas y la distancia entre suelos es 2', () => {
    for (const variant of VARIANTS) {
      for (const seed of SEEDS) {
        const map = generateMap(variant, seed);
        const direct = map.doors.find((door) => door.direct);
        expect(direct, `${variant} · ${seed}`).toBeDefined();
        if (!direct) continue;
        expect(minRoomDistance(map, direct.roomA, direct.roomB)).toBe(2);
      }
    }
  });

  it('los pasillos miden 0-3, los bucles 0-3 y los anchos cumplen 2 tiles y longitud ≥3', () => {
    for (const variant of VARIANTS) {
      for (const seed of SEEDS) {
        const map = generateMap(variant, seed);
        for (const corridor of map.corridors) {
          expect(corridor.length).toBeGreaterThanOrEqual(0);
          expect(corridor.length).toBeLessThanOrEqual(3);
          if (corridor.kind === 'wide') {
            expect(corridor.width).toBe(2);
            expect(corridor.length).toBeGreaterThanOrEqual(3);
            expect(corridor.doors).toHaveLength(0);
          }
        }
        expect(map.loops).toBeGreaterThanOrEqual(0);
        expect(map.loops).toBeLessThanOrEqual(3);
        expect(map.doors.every((door) => ['horizontal', 'vertical'].includes(door.orientation))).toBe(true);
        expect(map.doors.every((door) => ['wood', 'metal', 'grated'].includes(door.style))).toBe(true);
      }
    }
  });

  it('el estilo de puerta es estable por semilla y hay al menos dos estilos en el conjunto', () => {
    const styles = new Set<string>();
    for (const variant of VARIANTS) {
      const first = generateMap(variant, 20261107);
      const second = generateMap(variant, 20261107);
      const firstStyles = first.doors.map((door) => `${door.x},${door.y}:${door.style}`);
      const secondStyles = second.doors.map((door) => `${door.x},${door.y}:${door.style}`);
      expect(firstStyles).toEqual(secondStyles);
      for (const door of first.doors) styles.add(door.style);
    }
    expect(styles.size).toBeGreaterThanOrEqual(2);
  });

  it('la regla de muro por borde usa wallSide1 solo con suelo al sur', () => {
    const tiles = [0, 0, 0, 0, 1, 0, 0, 0, 0] as const;
    expect(wallTileKind(tiles, 3, 3, 1, 0)).toBe('wallSide1');
    expect(wallTileKind(tiles, 3, 3, 1, 1)).toBeNull();
    expect(wallTileKind(tiles, 3, 3, 0, 0)).toBe('wallTop');
  });

  it('el pasillo ancho aparece en 30 semillas con una frecuencia de 1/3 aproximada', () => {
    let wideMaps = 0;
    let totalMaps = 0;

    for (const variant of VARIANTS) {
      for (let seed = 1; seed <= 30; seed += 1) {
        const map = generateMap(variant, seed);
        totalMaps += 1;
        const wide = map.corridors.filter((corridor) => corridor.kind === 'wide');
        expect(wide.length).toBeLessThanOrEqual(1);
        if (wide.length === 1) {
          wideMaps += 1;
          expect(wide[0].doors).toHaveLength(0);
        }
      }
    }

    expect(wideMaps / totalMaps).toBeGreaterThanOrEqual(0.25);
    expect(wideMaps / totalMaps).toBeLessThanOrEqual(0.4);
  });

  it('la caverna aparece en 60 semillas con una frecuencia de 1/6 aproximada', () => {
    for (const variant of VARIANTS) {
      let cavernMaps = 0;
      for (let seed = 1; seed <= 60; seed += 1) {
        const map = generateMap(variant, seed);
        if (map.stats.cavernRooms === 0) continue;
        cavernMaps += 1;
        expect(map.rooms.length).toBeGreaterThanOrEqual(2);
        expect(map.rooms.length).toBeLessThanOrEqual(3);
        expect(map.stats.cavernShare).toBeGreaterThanOrEqual(0.55);
        const cavern = map.rooms.find((room) => room.sizeRole === 'cavern');
        expect(cavern?.notches).toBeGreaterThanOrEqual(4);
      }
      expect(cavernMaps / 60, `${variant} · caverna`).toBeGreaterThanOrEqual(0.1);
      expect(cavernMaps / 60, `${variant} · caverna`).toBeLessThanOrEqual(0.2);
    }
  });
});
