import { describe, expect, it } from 'vitest';
import {
  connectivityPercentage,
  fingerprint,
  generateMap,
  resolveOptions,
  roomAtCell,
  validateMap,
} from './generate';
import type { VariantId } from './types';

const VARIANTS: VariantId[] = ['growth', 'bsp', 'templates'];
const SEEDS = Array.from({ length: 24 }, (_, index) => index + 1);
const REFERENCE_SEED = 279837264;

describe('contrato y determinismo de A/B/C', () => {
  it('la misma semilla y opciones producen mapas profundamente iguales', () => {
    for (const variant of VARIANTS) {
      for (const seed of SEEDS) {
        expect(generateMap(variant, seed)).toEqual(generateMap(variant, seed));
      }
    }
  });

  it('la huella y las métricas son estables', () => {
    for (const variant of VARIANTS) {
      const first = generateMap(variant, REFERENCE_SEED);
      const second = generateMap(variant, REFERENCE_SEED);
      expect(fingerprint(first)).toBe(fingerprint(second));
      expect(first.stats).toEqual(second.stats);
    }
  });

  it('semillas distintas cambian la huella de cada variante', () => {
    for (const variant of VARIANTS) {
      expect(fingerprint(generateMap(variant, 1))).not.toBe(
        fingerprint(generateMap(variant, 2)),
      );
    }
  });

  it('no usa Math.random dentro de la generación', () => {
    const original = Math.random;
    let calls = 0;
    Math.random = () => {
      calls += 1;
      return original();
    };
    try {
      for (const variant of VARIANTS) generateMap(variant, 123);
    } finally {
      Math.random = original;
    }
    expect(calls).toBe(0);
  });

  it('el contrato mínimo es serializable y tiene las claves esperadas', () => {
    for (const variant of VARIANTS) {
      const map = generateMap(variant, REFERENCE_SEED);
      expect(map.seed).toBe(REFERENCE_SEED);
      expect(map.variant).toBe(variant);
      expect(map.width).toBe(22);
      expect(map.height).toBe(18);
      expect(map.tiles).toHaveLength(map.width * map.height);
      expect(map.rooms.length).toBeGreaterThanOrEqual(4);
      expect(map.rooms.length).toBeLessThanOrEqual(6);
      expect(map.doors.length).toBeGreaterThan(0);
      expect(Array.isArray(map.openMouths)).toBe(true);
      expect(map.corridors.length).toBeGreaterThan(0);
      expect(map.spawns.party.length).toBeGreaterThanOrEqual(6);
      expect(map.spawns.player).toEqual(map.spawns.party[0]);
      expect(map.entrance.roomId).toBe(map.spawns.roomId);
      expect(map.entrance.position).toEqual(map.spawns.party[0]);
      expect(map.exit).not.toBeNull();
      if (map.exit) {
        expect(['door', 'stairs-down', 'stairs-up']).toContain(map.exit.kind);
        expect(map.exit.roomId).not.toBe(map.spawns.roomId);
        expect(['exit-door', 'staircase-down', 'staircase-up']).toContain(map.exit.tile);
      }
      expect(Array.isArray(map.hotspots)).toBe(true);
      expect(map.enemies.every((enemy) => typeof enemy.hidden === 'boolean')).toBe(true);
      expect(map.enemies.length).toBeGreaterThan(0);
      expect(map.palettes.length).toBe(map.rooms.length);
      expect(map.stats.roomCount).toBe(map.rooms.length);
      expect(map.stats.validDoors).toBe(map.doors.length);
      expect(map.stats.openMouths).toBe(map.openMouths.length);
      expect(map.stats.enemy.surfaceN).toBe(map.stats.roomFloor);
      expect(map.stats.enemy.playersP).toBe(map.options.numPlayers);
      expect(map.stats.enemy.total).toBe(
        map.stats.enemy.surfaceTerm + map.stats.enemy.playersTerm,
      );
      expect(map.options.enemySurfaceFactor).toBe(0.02);
      expect(map.options.enemyPlayersFactor).toBe(1.35);
      expect(map.options.numPlayers).toBe(3);
      expect(Array.isArray(map.warnings)).toBe(true);
      expect(JSON.parse(JSON.stringify(map))).toEqual(map);
    }
  });

  it('cumple el recuento de salas: normales 4-6, caverna 3 y mínimo global 3', () => {
    for (const variant of VARIANTS) {
      for (const seed of [REFERENCE_SEED, ...SEEDS]) {
        const map = generateMap(variant, seed);
        expect(map.rooms.length, `${variant} · ${seed}`).toBeGreaterThanOrEqual(3);
        if (map.stats.cavernRooms > 0) {
          expect(map.rooms.length, `${variant} · ${seed} · caverna`).toBe(3);
        } else {
          expect(map.rooms.length, `${variant} · ${seed} · normal`).toBeGreaterThanOrEqual(4);
          expect(map.rooms.length, `${variant} · ${seed} · normal`).toBeLessThanOrEqual(6);
        }
      }
    }
  });

  it('la semilla de referencia y 24 semillas validan el mapa sin incidencias', () => {
    for (const variant of VARIANTS) {
      for (const seed of [REFERENCE_SEED, ...SEEDS]) {
        const map = generateMap(variant, seed);
        expect(validateMap(map), `${variant} · ${seed}`).toEqual([]);
        expect(connectivityPercentage(map)).toBeCloseTo(100, 5);
      }
    }
  });

  it('las opciones extremas se corrigen con warnings y no rompen el contrato', () => {
    const { warnings, options } = resolveOptions({
      mapWidth: 12,
      mapHeight: 10,
      roomCount: 2,
      roomMin: 6,
      roomMax: 3,
      corridorMaxLength: 9,
      wideCorridorChance: 150,
      wallThickness: 5,
      megaRoomChance: -5,
      spawnMinTiles: 12,
      enemySurfaceFactor: 5,
      enemyPlayersFactor: -2,
      numPlayers: 99,
    });
    expect(warnings.length).toBeGreaterThan(0);
    expect(options.enemySurfaceFactor).toBe(0.1);
    expect(options.enemyPlayersFactor).toBe(0);
    expect(options.numPlayers).toBe(6);

    const v3 = resolveOptions({
      hiddenEnemyChance: 5,
      exitMode: 'inventado',
    });
    expect(v3.options.hiddenEnemyChance).toBe(1);
    expect(v3.options.exitMode).toBe('random');
    expect(v3.warnings.length).toBeGreaterThan(0);

    for (const mode of ['door', 'stairs-down', 'stairs-up', 'random'] as const) {
      expect(resolveOptions({ exitMode: mode }).options.exitMode).toBe(mode);
    }

    for (const variant of VARIANTS) {
      const map = generateMap(variant, 42, {
        mapWidth: 12,
        mapHeight: 10,
        roomCount: 2,
        roomMin: 6,
        roomMax: 3,
        corridorMaxLength: 9,
        wideCorridorChance: 150,
        wallThickness: 5,
        megaRoomChance: -5,
        spawnMinTiles: 12,
        enemySurfaceFactor: 5,
        enemyPlayersFactor: -2,
        numPlayers: 99,
      });
      expect(map.warnings.length).toBeGreaterThan(0);
      expect(map.rooms.length).toBeGreaterThan(0);
      expect(map.tiles).toHaveLength(map.width * map.height);
      expect(map.stats.enemy.playersP).toBe(6);
    }
  });

  it('roomAtCell devuelve la sala de una muesca y null para caja sin suelo', () => {
    const map = generateMap('growth', REFERENCE_SEED);
    const room = map.rooms.find((item) => item.notches > 0) ?? map.rooms[0];
    const cell = room.cells[0];
    expect(roomAtCell(map, cell.x, cell.y)?.id).toBe(room.id);

    for (let y = room.y; y < room.y + room.height; y += 1) {
      for (let x = room.x; x < room.x + room.width; x += 1) {
        if (room.cells.some((item) => item.x === x && item.y === y)) continue;
        expect(roomAtCell(map, x, y)).toBeNull();
        return;
      }
    }
  });
});
