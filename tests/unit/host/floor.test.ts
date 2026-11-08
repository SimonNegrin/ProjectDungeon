import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  createInitialState,
  floorDistances,
  roomAt,
  type GeneratedMap,
} from '../../../src/game/index';
import { DECAL_RECTS } from '../../../src/host/assets';
import {
  DECAL_WHITELIST,
  FLOOR_DENSITY,
  FLOOR_TINT,
  decorationHash,
  densityQuota,
  floorParity,
  floorTintStyle,
  planDecoration,
  summarizeDecoration,
  type FloorArea,
} from '../../../src/host/floor';
import { GameSession } from '../../../src/host/session';

const REFERENCE_SEED = 279837264;

function referenceMap(): GeneratedMap {
  const map = createInitialState({ seed: REFERENCE_SEED }).map;
  if (!map) throw new Error('La semilla de referencia debe generar mapa');
  return map;
}

function key(x: number, y: number): string {
  return `${x},${y}`;
}

function eligibleCounts(map: GeneratedMap): Record<FloorArea, number> {
  const excluded = new Set<string>();
  for (const door of map.doors) excluded.add(key(door.x, door.y));
  excluded.add(key(map.spawns.player.x, map.spawns.player.y));
  excluded.add(key(map.spawns.enemy.x, map.spawns.enemy.y));

  const counts: Record<FloorArea, number> = { room: 0, corridor: 0 };
  for (let y = 0; y < map.height; y += 1) {
    for (let x = 0; x < map.width; x += 1) {
      if (map.tiles[y * map.width + x] !== 'floor') continue;
      if (excluded.has(key(x, y))) continue;
      const area: FloorArea = roomAt(map.rooms, x, y) ? 'room' : 'corridor';
      counts[area] += 1;
    }
  }
  return counts;
}

describe('damero de suelo', () => {
  it('usa la paridad global (x + y) % 2 y alterna entre tiles adyacentes', () => {
    for (let y = 0; y < 12; y += 1) {
      for (let x = 0; x < 12; x += 1) {
        expect(floorParity(x, y)).toBe((x + y) % 2);
        if (x > 0) expect(floorParity(x, y)).not.toBe(floorParity(x - 1, y));
        if (y > 0) expect(floorParity(x, y)).not.toBe(floorParity(x, y - 1));
      }
    }
  });

  it('la paridad no depende de la semilla ni se reinicia por sala', () => {
    expect(floorParity(3, 4)).toBe(1);
    expect(floorParity(4, 4)).toBe(0);
    expect(floorParity(7, 8)).toBe(1);
    expect(floorParity(8, 8)).toBe(0);
    expect(floorParity(0, 0)).toBe(floorParity(32, 32));
  });

  it('expone una única configuración de tinte gris-azul sutil', () => {
    expect(FLOOR_TINT.alpha).toBeGreaterThanOrEqual(0.08);
    expect(FLOOR_TINT.alpha).toBeLessThanOrEqual(0.12);
    expect(FLOOR_TINT.blue).toBeGreaterThan(FLOOR_TINT.green);
    expect(FLOOR_TINT.green).toBeGreaterThan(FLOOR_TINT.red);
    expect(floorTintStyle()).toBe(
      `rgba(${FLOOR_TINT.red}, ${FLOOR_TINT.green}, ${FLOOR_TINT.blue}, ${FLOOR_TINT.alpha})`,
    );
  });

  it('el tinte aclara la piedra y mantiene diferencia de luminancia', () => {
    // Base de piedra del tileset 32rogues (#0c1317).
    const base = [12, 19, 23];
    const alpha = FLOOR_TINT.alpha;
    const tinted = [FLOOR_TINT.red, FLOOR_TINT.green, FLOOR_TINT.blue].map(
      (channel, index) => base[index] * (1 - alpha) + channel * alpha,
    );
    const luminance = (channels: readonly number[]): number =>
      0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
    expect(luminance(tinted)).toBeGreaterThan(luminance(base) * 1.15);
  });
});

describe('lista blanca y recuadros de decals', () => {
  it('contiene exactamente las celdas aprobadas de tiles.png', () => {
    const columns: Readonly<Record<string, number>> = {
      a: 0,
      b: 32,
      c: 64,
      d: 96,
      e: 128,
      f: 160,
      g: 192,
    };
    const rows: ReadonlyArray<readonly [number, readonly string[]]> = [
      [7, ['e', 'f', 'g']],
      [8, ['e', 'f', 'g']],
      [9, ['e', 'f', 'g']],
      [10, ['e', 'f', 'g']],
      [11, ['e', 'f', 'g']],
      [21, ['a', 'b']],
      [22, ['a', 'b']],
      [23, ['a', 'b', 'c', 'd']],
    ];

    const expected = new Set<string>();
    for (const [row, cols] of rows) {
      for (const column of cols) {
        expected.add(key(columns[column], (row - 1) * 32));
      }
    }

    const actual = new Set<string>();
    for (const rect of Object.values(DECAL_RECTS)) {
      expect(rect.sw).toBe(32);
      expect(rect.sh).toBe(32);
      actual.add(key(rect.sx, rect.sy));
    }

    expect(actual).toEqual(expected);
    expect(DECAL_WHITELIST).toHaveLength(23);
    expect(new Set(DECAL_WHITELIST.map((decal) => decal.id)).size).toBe(23);
  });

  it('cada familia usa solo sus recuadros aprobados', () => {
    const byFamily = new Map<string, number>();
    for (const decal of DECAL_WHITELIST) {
      byFamily.set(decal.family, (byFamily.get(decal.family) ?? 0) + 1);
      expect(decal.rect.sw).toBe(32);
      expect(decal.rect.sh).toBe(32);
      expect(decal.rect.sx % 32).toBe(0);
      expect(decal.rect.sy % 32).toBe(0);
    }
    expect(Object.fromEntries(byFamily)).toEqual({
      dirt: 6,
      grass: 3,
      bones: 8,
      blood: 4,
      mushroom: 2,
    });
  });
});

describe('planificación determinista de decoración', () => {
  it('respeta las densidades de referencia sobre tiles elegibles', () => {
    const map = referenceMap();
    const plan = planDecoration(map);
    const eligible = eligibleCounts(map);
    const decorated: Record<FloorArea, number> = { room: 0, corridor: 0 };
    for (const entry of plan) decorated[entry.area] += 1;

    expect(eligible.room).toBeGreaterThan(0);
    expect(eligible.corridor).toBeGreaterThan(0);
    expect(decorated.room / eligible.room).toBeGreaterThanOrEqual(
      FLOOR_DENSITY.room.min - 1e-9,
    );
    expect(decorated.room / eligible.room).toBeLessThanOrEqual(
      FLOOR_DENSITY.room.max + 1e-9,
    );
    expect(decorated.corridor / eligible.corridor).toBeGreaterThanOrEqual(
      FLOOR_DENSITY.corridor.min - 1e-9,
    );
    expect(decorated.corridor / eligible.corridor).toBeLessThanOrEqual(
      FLOOR_DENSITY.corridor.max + 1e-9,
    );
  });

  it('la cuota entera cae siempre dentro del rango cuando existe un entero válido', () => {
    for (let eligible = 0; eligible <= 500; eligible += 1) {
      for (const range of [FLOOR_DENSITY.room, FLOOR_DENSITY.corridor]) {
        const quota = densityQuota(eligible, range);
        const minCount = Math.ceil(range.min * eligible - 1e-9);
        const maxCount = Math.floor(range.max * eligible + 1e-9);
        expect(quota).toBeLessThanOrEqual(eligible);
        if (maxCount >= minCount) {
          expect(quota).toBeGreaterThanOrEqual(minCount);
          expect(quota).toBeLessThanOrEqual(maxCount);
        }
      }
    }
  });

  it('nunca decora umbrales, apariciones, muros ni fuera de rango', () => {
    const map = referenceMap();
    const plan = planDecoration(map);
    const doors = new Set(map.doors.map((door) => key(door.x, door.y)));
    const spawns = new Set([
      key(map.spawns.player.x, map.spawns.player.y),
      key(map.spawns.enemy.x, map.spawns.enemy.y),
    ]);

    for (const entry of plan) {
      expect(map.tiles[entry.y * map.width + entry.x]).toBe('floor');
      expect(doors.has(key(entry.x, entry.y))).toBe(false);
      expect(spawns.has(key(entry.x, entry.y))).toBe(false);
      expect(roomAt(map.rooms, entry.x, entry.y) ? 'room' : 'corridor').toBe(entry.area);
      expect(DECAL_WHITELIST).toContain(entry.decal);
    }
  });

  it('coloca como máximo un decal por tile', () => {
    const plan = planDecoration(referenceMap());
    const tiles = new Set(plan.map((entry) => key(entry.x, entry.y)));
    expect(tiles.size).toBe(plan.length);
  });

  it('es determinista y otra semilla cambia decals sin cambiar el damero', () => {
    const map = referenceMap();
    const first = planDecoration(map);
    const second = planDecoration(map);
    expect(second).toEqual(first);
    expect(summarizeDecoration(second)).toEqual(summarizeDecoration(first));

    const other = createInitialState({ seed: REFERENCE_SEED + 1 }).map;
    if (!other) throw new Error('La semilla alternativa debe generar mapa');
    expect(planDecoration(other)).not.toEqual(first);

    // La paridad no depende de la semilla: es la misma función global.
    for (const entry of first) {
      expect(floorParity(entry.x, entry.y)).toBe((entry.x + entry.y) % 2);
    }
  });

  it('el hash de decoración es estable, sensible a coordenada y sal', () => {
    expect(decorationHash(REFERENCE_SEED, 3, 4, 1)).toBe(
      decorationHash(REFERENCE_SEED, 3, 4, 1),
    );
    expect(decorationHash(REFERENCE_SEED, 3, 4, 1)).not.toBe(
      decorationHash(REFERENCE_SEED, 4, 4, 1),
    );
    expect(decorationHash(REFERENCE_SEED, 3, 4, 1)).not.toBe(
      decorationHash(REFERENCE_SEED, 3, 4, 2),
    );
    expect(decorationHash(REFERENCE_SEED, 3, 4, 1)).not.toBe(
      decorationHash(REFERENCE_SEED + 1, 3, 4, 1),
    );
  });

  it('sin mapa hay damero pero cero decoración', () => {
    expect(planDecoration(undefined)).toEqual([]);
    expect(summarizeDecoration(planDecoration(undefined))).toEqual([]);
    // La paridad sigue disponible sin mapa.
    expect(floorParity(5, 2)).toBe(1);
  });

  it('no muta el mapa y no usa Math.random ni Date.now', () => {
    const map = referenceMap();
    const before = JSON.stringify(map);
    const frozen = deepFreeze(structuredClone(map));
    expect(() => planDecoration(frozen)).not.toThrow();
    expect(JSON.stringify(map)).toBe(before);

    const source = readFileSync(
      new URL('../../../src/host/floor.ts', import.meta.url),
      'utf8',
    );
    expect(source).not.toMatch(/Math\.random\s*\(/);
    expect(source).not.toMatch(/Date\.now\s*\(/);
    expect(source).not.toMatch(/^\s*(?:document|window)\./m);
    expect(source).not.toMatch(/getContext\s*\(/);
  });

  it('un MoveTo puede terminar en un tile decorado sin bloquear ni cambiar el estado', () => {
    const session = new GameSession({ seed: REFERENCE_SEED });
    const map = session.state.map;
    if (!map) throw new Error('La semilla de referencia debe generar mapa');
    const player = session.state.players[0];
    const plan = planDecoration(map);
    const distances = floorDistances(map, { x: player.x, y: player.y });
    const target = plan.find((entry) => {
      const distance = distances[entry.y * map.width + entry.x];
      return distance > 0 && distance <= player.mp;
    });

    expect(target).toBeDefined();
    if (!target) return;

    const gridBefore = JSON.stringify(session.state.grid);
    const planBefore = JSON.stringify(plan);

    const result = session.dispatch({
      type: 'MoveTo',
      unitId: player.id,
      target: { x: target.x, y: target.y },
    });

    expect(
      result.events.filter((event) => event.type === 'CommandRejected'),
    ).toEqual([]);
    expect(session.state.players[0]).toMatchObject({ x: target.x, y: target.y });
    expect(JSON.stringify(session.state.grid)).toBe(gridBefore);
    expect(JSON.stringify(planDecoration(session.state.map))).toBe(planBefore);
  });
});

function deepFreeze<T>(value: T): T {
  if (value !== null && typeof value === 'object') {
    for (const key of Object.keys(value)) {
      deepFreeze((value as Record<string, unknown>)[key]);
    }
    Object.freeze(value);
  }
  return value;
}
