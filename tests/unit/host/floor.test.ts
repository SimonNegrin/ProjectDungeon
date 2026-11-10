import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  BspMapGenerator,
  createInitialState,
  floorDistances,
  roomAt,
  type GeneratedMap,
} from '../../../src/game/index';
import { DECAL_RECTS } from '../../../src/host/assets';
import {
  AMBIENT_FAMILIES,
  AMBIENT_PALETTE,
  DECAL_FAMILIES,
  DECAL_WHITELIST,
  FLOOR_BASE,
  FLOOR_DENSITY,
  FLOOR_PALETTES,
  decorationHash,
  densityQuota,
  floorColor,
  floorColorFor,
  floorParity,
  paletteAt,
  planDecoration,
  roomAmbientFor,
  roomFocusesFor,
  roomPalettesFor,
  summarizeDecoration,
  type FloorAmbient,
  type FloorArea,
  type FloorPaletteId,
} from '../../../src/host/floor';
import { GameSession } from '../../../src/host/session';

const REFERENCE_SEED = 279837264;

const AMBIENTS: readonly FloorAmbient[] = [
  'humid',
  'death',
  'ruin',
  'vegetation',
  'mixed',
];

const PALETTES: readonly FloorPaletteId[] = [
  'neutral',
  'humid',
  'death',
  'ruin',
  'vegetation',
];

function referenceMap(): GeneratedMap {
  const map = createInitialState({
    seed: REFERENCE_SEED,
    generator: new BspMapGenerator(),
  }).map;
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

function hexToRgb(hex: string): readonly [number, number, number] {
  const value = Number.parseInt(hex.slice(1), 16);
  return [(value >>> 16) & 0xff, (value >>> 8) & 0xff, value & 0xff];
}

function luminance(hex: string): number {
  const [red, green, blue] = hexToRgb(hex);
  return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
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

  it('usa una base común y un segundo tono por paleta', () => {
    expect(FLOOR_BASE).toBe('#0d1519');
    expect(Object.keys(FLOOR_PALETTES).sort()).toEqual([...PALETTES].sort());
    const seconds = new Set<string>();
    for (const palette of PALETTES) {
      expect(FLOOR_PALETTES[palette].base).toBe(FLOOR_BASE);
      seconds.add(FLOOR_PALETTES[palette].second);
    }
    expect(seconds.size).toBe(5);
  });

  it('cada paleta tiene contraste de luminancia simple ≥ 12 y se lee en grises', () => {
    for (const palette of PALETTES) {
      const base = luminance(FLOOR_PALETTES[palette].base);
      const second = luminance(FLOOR_PALETTES[palette].second);
      expect(Math.abs(second - base), palette).toBeGreaterThanOrEqual(12);
    }
  });

  it('la paleta de muerte no es roja ni la de humedad verde', () => {
    const [deathRed, deathGreen, deathBlue] = hexToRgb(
      FLOOR_PALETTES.death.second,
    );
    expect(deathRed).toBeLessThan(deathGreen + 20);
    expect(deathRed).toBeLessThan(deathBlue + 20);

    const [humidRed, humidGreen, humidBlue] = hexToRgb(
      FLOOR_PALETTES.humid.second,
    );
    expect(humidGreen).toBeLessThan(humidRed + 30);
    expect(humidGreen).toBeLessThan(humidBlue + 15);
  });

  it('pinta paridad 0 con la base y paridad 1 con el segundo tono', () => {
    for (const palette of PALETTES) {
      expect(floorColor(2, 2, palette)).toBe(FLOOR_BASE);
      expect(floorColor(3, 2, palette)).toBe(FLOOR_PALETTES[palette].second);
    }
  });

  it('sin mapa sigue habiendo damero neutro', () => {
    expect(floorColorFor(undefined, 0, 0)).toBe(FLOOR_BASE);
    expect(floorColorFor(undefined, 1, 0)).toBe(
      FLOOR_PALETTES.neutral.second,
    );
    expect(paletteAt(undefined, 5, 2)).toBe('neutral');
  });
});

describe('ambientes y paletas por sala', () => {
  it('asigna un ambiente y una paleta deterministas a cada sala', () => {
    const map = referenceMap();
    const first = roomPalettesFor(map);
    const second = roomPalettesFor(map);

    expect(first).toEqual(second);
    expect(first).toHaveLength(map.rooms.length);
    for (const entry of first) {
      const room = map.rooms.find((item) => item.id === entry.roomId);
      expect(room).toBeDefined();
      if (!room) continue;
      expect(entry.ambient).toBe(roomAmbientFor(map, room));
      expect(entry.palette).toBe(AMBIENT_PALETTE[entry.ambient]);
      expect(entry.base).toBe(FLOOR_BASE);
      expect(entry.second).toBe(FLOOR_PALETTES[entry.palette].second);
    }
  });

  it('la semilla de referencia muestra humedad, muerte, ruina, vegetación y mixta', () => {
    const ambients = new Set(
      roomPalettesFor(referenceMap()).map((entry) => entry.ambient),
    );

    expect([...ambients].sort()).toEqual([...AMBIENTS].sort());
  });

  it('otra semilla cambia al menos un ambiente sin tocar la paridad', () => {
    const map = referenceMap();
    const other = createInitialState({
      seed: REFERENCE_SEED + 1,
      generator: new BspMapGenerator(),
    }).map;
    if (!other) throw new Error('La semilla alternativa debe generar mapa');

    const ambients = roomPalettesFor(map).map((entry) => entry.ambient);
    const otherAmbients = roomPalettesFor(other).map((entry) => entry.ambient);
    expect(otherAmbients).not.toEqual(ambients);
    expect(floorParity(7, 8)).toBe(1);
  });

  it('pasillos y umbrales de puerta usan la paleta neutra', () => {
    const map = referenceMap();
    for (const door of map.doors) {
      expect(paletteAt(map, door.x, door.y)).toBe('neutral');
    }

    let corridorSamples = 0;
    for (let y = 0; y < map.height && corridorSamples < 5; y += 1) {
      for (let x = 0; x < map.width && corridorSamples < 5; x += 1) {
        if (map.tiles[y * map.width + x] !== 'floor') continue;
        if (roomAt(map.rooms, x, y)) continue;
        expect(paletteAt(map, x, y)).toBe('neutral');
        corridorSamples += 1;
      }
    }
    expect(corridorSamples).toBeGreaterThan(0);
  });

  it('las paletas de sala solo se aplican dentro de sus tiles de suelo', () => {
    const map = referenceMap();
    for (const room of map.rooms) {
      const palette = AMBIENT_PALETTE[roomAmbientFor(map, room)];
      for (const door of map.doors) {
        if (
          door.x >= room.x &&
          door.y >= room.y &&
          door.x < room.x + room.width &&
          door.y < room.y + room.height
        ) {
          expect(paletteAt(map, door.x, door.y)).toBe('neutral');
        }
      }
      const center = {
        x: room.x + Math.floor(room.width / 2),
        y: room.y + Math.floor(room.height / 2),
      };
      if (map.tiles[center.y * map.width + center.x] === 'floor') {
        expect(paletteAt(map, center.x, center.y)).toBe(palette);
      }
    }
  });
});

describe('lista blanca y recuadros de decals', () => {
  const columns: Readonly<Record<string, number>> = {
    a: 0,
    b: 32,
    c: 64,
    d: 96,
    e: 128,
    f: 160,
    g: 192,
    l: 352,
    n: 416,
    o: 448,
    p: 480,
  };
  const rows: ReadonlyArray<readonly [number, readonly string[]]> = [
    [7, ['e', 'f', 'g']],
    [8, ['e', 'f', 'g']],
    [9, ['e', 'f', 'g']],
    [10, ['e', 'f', 'g']],
    [11, ['e', 'f', 'g']],
    [12, ['e', 'f', 'g']],
    [20, ['a', 'b', 'e', 'l', 'n', 'o', 'p']],
    [21, ['a', 'b']],
    [22, ['a', 'b']],
    [23, ['a', 'b', 'c', 'd']],
  ];

  it('mantiene los 33 recuadros de tiles.png y 31 decals ambientales', () => {
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
      expect(rect.sx % 32).toBe(0);
      expect(rect.sy % 32).toBe(0);
      actual.add(key(rect.sx, rect.sy));
    }

    expect(actual).toEqual(expected);
    expect(DECAL_WHITELIST).toHaveLength(31);
    expect(new Set(DECAL_WHITELIST.map((decal) => decal.id)).size).toBe(31);
    // Los cadáveres siguen disponibles para la presentación de muerte, pero no
    // se eligen como decoración ambiental.
    expect(DECAL_WHITELIST.some((decal) => decal.family === 'corpse')).toBe(false);
    expect(DECAL_RECTS.corpse22a).toMatchObject({ sx: 0, sy: 672 });
    expect(DECAL_RECTS.corpse22b).toMatchObject({ sx: 32, sy: 672 });
  });

  it('mapea las familias por la fila correcta: 9 tierra, 10 ladrillo azul, 11 huesos', () => {
    const byRow = (sy: number): ReadonlySet<string> =>
      new Set(
        DECAL_WHITELIST.filter((decal) => decal.rect.sy === sy).map(
          (decal) => decal.family,
        ),
      );

    expect(byRow(9 * 32 - 32)).toEqual(new Set(['dirt']));
    expect(byRow(10 * 32 - 32)).toEqual(new Set(['blueBrick']));
    expect(byRow(11 * 32 - 32)).toEqual(new Set(['bones']));
    expect(byRow(12 * 32 - 32)).toEqual(new Set(['redBrick']));
  });

  it('reparte las 31 entradas en familias planas sin props ni cultivos altos', () => {
    const byFamily = new Map<string, number>();
    for (const decal of DECAL_WHITELIST) {
      byFamily.set(decal.family, (byFamily.get(decal.family) ?? 0) + 1);
      expect(DECAL_FAMILIES[decal.family]).toContain(decal);
    }
    expect(Object.fromEntries(byFamily)).toEqual({
      pebbles: 3,
      grass: 3,
      dirt: 3,
      blueBrick: 3,
      bones: 3,
      redBrick: 3,
      plant: 7,
      mushroom: 2,
      blood: 4,
    });
  });
});

describe('focos de decoración', () => {
  it('cada sala tiene cero o entre uno y tres focos, deterministas y dentro de la sala', () => {
    const map = referenceMap();
    for (const room of map.rooms) {
      const first = roomFocusesFor(map, room);
      const second = roomFocusesFor(map, room);
      expect(second).toEqual(first);
      expect(first.length === 0 || (first.length >= 1 && first.length <= 3)).toBe(
        true,
      );
      for (const focus of first) {
        expect(focus.x).toBeGreaterThanOrEqual(room.x);
        expect(focus.y).toBeGreaterThanOrEqual(room.y);
        expect(focus.x).toBeLessThan(room.x + room.width);
        expect(focus.y).toBeLessThan(room.y + room.height);
        expect(focus.radius).toBeGreaterThanOrEqual(2);
      }
    }
  });

  it('algunas salas de la semilla de referencia son solo dispersas', () => {
    const map = referenceMap();
    const counts = map.rooms.map(
      (room) => roomFocusesFor(map, room).length,
    );
    expect(counts).toContain(0);
    expect(counts.some((count) => count > 0)).toBe(true);
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
      expect(roomAt(map.rooms, entry.x, entry.y) ? 'room' : 'corridor').toBe(
        entry.area,
      );
      expect(DECAL_WHITELIST).toContain(entry.decal);
    }
  });

  it('coloca como máximo un decal por tile', () => {
    const plan = planDecoration(referenceMap());
    const tiles = new Set(plan.map((entry) => key(entry.x, entry.y)));
    expect(tiles.size).toBe(plan.length);
  });

  it('etiqueta cada decal con el ambiente y la familia de su área', () => {
    const map = referenceMap();
    const plan = planDecoration(map);
    const roomAmbients = new Map(
      roomPalettesFor(map).map((entry) => [entry.roomId, entry.ambient]),
    );

    for (const entry of plan) {
      expect(DECAL_FAMILIES[entry.family]).toContain(entry.decal);
      const room = roomAt(map.rooms, entry.x, entry.y);
      if (entry.area === 'room' && room) {
        expect(entry.ambient).toBe(roomAmbients.get(room.id));
      } else {
        expect(entry.area).toBe('corridor');
        expect(entry.ambient).toBe('mixed');
      }
    }
  });

  it('mantiene una mezcla del 20-30 % en cada sala con ambiente dominante', () => {
    const map = referenceMap();
    const plan = planDecoration(map);
    let roomsChecked = 0;

    for (const room of map.rooms) {
      const ambient = roomAmbientFor(map, room);
      if (ambient === 'mixed') continue;
      const entries = plan.filter(
        (entry) => roomAt(map.rooms, entry.x, entry.y)?.id === room.id,
      );
      if (entries.length < 4) continue;
      const dominant = AMBIENT_FAMILIES[ambient];
      const mixed = entries.filter(
        (entry) => !dominant.includes(entry.family),
      ).length;
      const ratio = mixed / entries.length;
      expect(ratio, `Sala ${room.id} (${ambient})`).toBeGreaterThanOrEqual(0.2);
      expect(ratio, `Sala ${room.id} (${ambient})`).toBeLessThanOrEqual(0.3);
      roomsChecked += 1;
    }

    expect(roomsChecked).toBeGreaterThan(0);
  });

  it('agrupa parte de la decoración alrededor de los focos de cada sala', () => {
    const map = referenceMap();
    const plan = planDecoration(map);
    let focusedRooms = 0;

    for (const room of map.rooms) {
      const focuses = roomFocusesFor(map, room);
      if (focuses.length === 0) continue;
      const entries = plan.filter(
        (entry) => roomAt(map.rooms, entry.x, entry.y)?.id === room.id,
      );
      if (entries.length === 0) continue;
      focusedRooms += 1;
      const nearFocus = entries.filter((entry) =>
        focuses.some(
          (focus) =>
            Math.max(
              Math.abs(entry.x - focus.x),
              Math.abs(entry.y - focus.y),
            ) <= focus.radius,
        ),
      ).length;
      expect(nearFocus, `Sala ${room.id}`).toBeGreaterThan(0);
    }

    expect(focusedRooms).toBeGreaterThan(0);
  });

  it('las salas sin foco también reciben decoración dispersa', () => {
    const map = referenceMap();
    const plan = planDecoration(map);
    const scattered = map.rooms.filter(
      (room) => roomFocusesFor(map, room).length === 0,
    );

    expect(scattered.length).toBeGreaterThan(0);
    for (const room of scattered) {
      const count = plan.filter(
        (entry) => roomAt(map.rooms, entry.x, entry.y)?.id === room.id,
      ).length;
      expect(count, `Sala dispersa ${room.id}`).toBeGreaterThan(0);
    }
  });

  it('es determinista y otra semilla cambia decals sin cambiar el damero', () => {
    const map = referenceMap();
    const first = planDecoration(map);
    const second = planDecoration(map);
    expect(second).toEqual(first);
    expect(summarizeDecoration(second)).toEqual(summarizeDecoration(first));

    const other = createInitialState({
      seed: REFERENCE_SEED + 1,
      generator: new BspMapGenerator(),
    }).map;
    if (!other) throw new Error('La semilla alternativa debe generar mapa');
    expect(planDecoration(other)).not.toEqual(first);

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

  it('sin mapa hay damero pero cero decoración y paletas', () => {
    expect(planDecoration(undefined)).toEqual([]);
    expect(summarizeDecoration(planDecoration(undefined))).toEqual([]);
    expect(roomPalettesFor(undefined)).toEqual([]);
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
    const session = new GameSession({
      seed: REFERENCE_SEED,
      generator: new BspMapGenerator(),
    });
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
    expect(session.state.players[0]).toMatchObject({
      x: target.x,
      y: target.y,
    });
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
