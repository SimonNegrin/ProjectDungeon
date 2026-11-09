import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  DOOR_STYLES,
  classifyRoom,
  type Corridor,
  type Door,
  type Room,
} from '../../../src/game/map';
import {
  AMBIENT_ORDER,
  DOOR_MIN_SEPARATION,
  generateChamberPlan,
  maxNotchDepth,
  placeDoors,
  resolveChamberOptions,
  validateDoorCandidate,
  type ChamberPlan,
  type OpenMouthReason,
} from '../../../src/game/chambers/core';

const CORE_DIR = join(process.cwd(), 'src/game/chambers/core');
const DEFAULT_SEEDS = Array.from({ length: 20 }, (_, index) => index + 1);
const CAVERN_SEEDS = Array.from({ length: 60 }, (_, index) => index + 1);

function planConnectivity(plan: ChamberPlan): {
  reachable: number;
  total: number;
  percentage: number;
  components: number;
} {
  const total = plan.tiles.filter((tile) => tile === 'floor').length;
  const seen = new Set<number>();
  let components = 0;
  let reachable = 0;
  for (let start = 0; start < plan.tiles.length; start += 1) {
    if (plan.tiles[start] !== 'floor' || seen.has(start)) continue;
    components += 1;
    const queue = [start];
    seen.add(start);
    for (let index = 0; index < queue.length; index += 1) {
      const current = queue[index];
      const x = current % plan.width;
      const y = Math.floor(current / plan.width);
      for (const [dx, dy] of [
        [0, -1],
        [1, 0],
        [0, 1],
        [-1, 0],
      ] as const) {
        const nx = x + dx;
        const ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= plan.width || ny >= plan.height) continue;
        const next = ny * plan.width + nx;
        if (plan.tiles[next] !== 'floor' || seen.has(next)) continue;
        seen.add(next);
        queue.push(next);
      }
    }
    if (components === 1) reachable = queue.length;
  }
  return {
    reachable,
    total,
    percentage: total === 0 ? 0 : (reachable / total) * 100,
    components,
  };
}

function maskConnected(room: Room): boolean {
  const cells = room.cells ?? [];
  if (cells.length === 0) return false;
  const keys = new Set(cells.map((cell) => `${cell.x},${cell.y}`));
  const seen = new Set<string>([`${cells[0].x},${cells[0].y}`]);
  const queue = [cells[0]];
  for (let index = 0; index < queue.length; index += 1) {
    const current = queue[index];
    for (const [dx, dy] of [
      [0, -1],
      [1, 0],
      [0, 1],
      [-1, 0],
    ] as const) {
      const key = `${current.x + dx},${current.y + dy}`;
      if (!keys.has(key) || seen.has(key)) continue;
      seen.add(key);
      queue.push({ x: current.x + dx, y: current.y + dy });
    }
  }
  return seen.size === cells.length;
}

function roomsConnected(plan: ChamberPlan): boolean {
  const parent = Array.from({ length: plan.rooms.length }, (_, index) => index);
  const find = (value: number): number => {
    let current = value;
    while (parent[current] !== current) {
      parent[current] = parent[parent[current]];
      current = parent[current];
    }
    return current;
  };
  for (const corridor of plan.corridors) {
    const a = find(corridor.fromRoomId);
    const b = find(corridor.toRoomId);
    if (a !== b) parent[b] = a;
  }
  const root = find(0);
  return plan.rooms.every((room) => find(room.id) === root);
}

function nonRectRooms(plan: ChamberPlan): Room[] {
  return plan.rooms.filter((room) => (room.cells?.length ?? 0) < room.width * room.height);
}

function notchCount(room: Room): number {
  const mask = new Set((room.cells ?? []).map((cell) => `${cell.x},${cell.y}`));
  let count = 0;
  for (let y = room.y; y < room.y + room.height; y += 1) {
    for (let x = room.x; x < room.x + room.width; x += 1) {
      if (mask.has(`${x},${y}`)) continue;
      if (
        [
          [0, -1],
          [1, 0],
          [0, 1],
          [-1, 0],
        ].some(([dx, dy]) => mask.has(`${x + dx},${y + dy}`))
      ) {
        count += 1;
      }
    }
  }
  return count;
}

function doorValid(plan: ChamberPlan, door: Door): boolean {
  return (
    validateDoorCandidate(
      {
        x: door.x,
        y: door.y,
        orientation: door.orientation,
        roomA: door.roomA ?? door.roomId,
        roomB: door.roomB ?? door.roomId,
      },
      plan.tiles,
      plan.width,
      plan.height,
    ) === null
  );
}

describe('opciones de chambers', () => {
  it('usa los valores aprobados de REQ-011 v4', () => {
    const { options, warnings } = resolveChamberOptions();
    expect(warnings).toEqual([]);
    expect(options).toEqual({
      mapWidth: 22,
      mapHeight: 18,
      roomCount: 5,
      roomMin: 3,
      roomMax: 8,
      corridorMaxLength: 3,
      wideCorridorChance: 33,
      wallThickness: 1,
      cavernChance: 15,
      spawnMinTiles: 6,
    });
  });

  it('corrige opciones extremas con avisos y nunca lanza', () => {
    const { options, warnings } = resolveChamberOptions({
      mapWidth: -5,
      mapHeight: Number.NaN,
      roomCount: 99,
      roomMin: 12,
      roomMax: 1,
      corridorMaxLength: 9,
      wideCorridorChance: 900,
      wallThickness: 7,
      cavernChance: -20,
      spawnMinTiles: 40,
    });
    expect(warnings.length).toBeGreaterThan(0);
    expect(options.mapWidth).toBe(12);
    expect(options.mapHeight).toBe(18);
    expect(options.roomCount).toBe(6);
    expect(options.roomMin).toBeLessThanOrEqual(options.roomMax);
    expect(options.corridorMaxLength).toBe(3);
    expect(options.wideCorridorChance).toBe(100);
    expect(options.wallThickness).toBe(2);
    expect(options.cavernChance).toBe(0);
    expect(options.spawnMinTiles).toBe(12);

    const plan = generateChamberPlan(42, {
      mapWidth: 12,
      mapHeight: 10,
      roomCount: 99,
      roomMin: 12,
      roomMax: 1,
      corridorMaxLength: 9,
      wallThickness: 7,
      cavernChance: 0,
    });
    expect(plan.warnings.length).toBeGreaterThan(0);
    expect(plan.rooms.length).toBeGreaterThanOrEqual(3);
    expect(plan.tiles).toHaveLength(plan.width * plan.height);
  });
});

describe('formas, muescas y recuentos', () => {
  it('genera 4-6 salas normales con máscaras conexas y al menos una no rectangular', () => {
    for (const seed of DEFAULT_SEEDS) {
      const plan = generateChamberPlan(seed, { cavernChance: 0 });
      expect(plan.rooms.length, `seed ${seed}`).toBeGreaterThanOrEqual(4);
      expect(plan.rooms.length, `seed ${seed}`).toBeLessThanOrEqual(6);
      for (const room of plan.rooms) {
        expect(room.cells?.length, `seed ${seed} · sala ${room.id}`).toBeGreaterThan(0);
        expect(room.area, `seed ${seed} · sala ${room.id}`).toBe(room.cells?.length);
        expect(maskConnected(room), `seed ${seed} · sala ${room.id}`).toBe(true);
        expect(room.role, `seed ${seed}`).toBe(
          classifyRoom({ width: room.width, height: room.height }),
        );
      }
      expect(nonRectRooms(plan).length, `seed ${seed}`).toBeGreaterThanOrEqual(1);
      const notches = plan.rooms.reduce((sum, room) => sum + notchCount(room), 0);
      expect(notches, `seed ${seed}`).toBeGreaterThanOrEqual(3);
      for (const room of nonRectRooms(plan)) {
        const ratio = (room.cells?.length ?? 0) / (room.width * room.height);
        expect(ratio, `seed ${seed} · sala ${room.id}`).toBeGreaterThanOrEqual(0.55);
        expect(ratio, `seed ${seed} · sala ${room.id}`).toBeLessThanOrEqual(0.92);
      }
      expect(plan.rooms.some((room) => room.role === 'large'), `seed ${seed}`).toBe(true);
      expect(plan.rooms.some((room) => room.role === 'small'), `seed ${seed}`).toBe(true);
    }
  });

  it('genera 16×14 y 32×32 sin cambios de código y cierra el borde', () => {
    for (const [width, height] of [
      [16, 14],
      [32, 32],
    ] as const) {
      const plan = generateChamberPlan(1234, { mapWidth: width, mapHeight: height });
      expect(plan.width).toBe(width);
      expect(plan.height).toBe(height);
      expect(plan.tiles).toHaveLength(width * height);
      expect(plan.rooms.length).toBeGreaterThanOrEqual(3);
      expect(plan.rooms.length).toBeLessThanOrEqual(6);
      const connectivity = planConnectivity(plan);
      expect(connectivity.percentage, `${width}×${height}`).toBeCloseTo(100, 5);
      for (let x = 0; x < width; x += 1) {
        expect(plan.tiles[x]).toBe('wall');
        expect(plan.tiles[(height - 1) * width + x]).toBe('wall');
      }
      for (let y = 0; y < height; y += 1) {
        expect(plan.tiles[y * width]).toBe('wall');
        expect(plan.tiles[y * width + width - 1]).toBe('wall');
      }
    }
  });

  it('respeta roomCount 4/6 y el grosor de muro 2', () => {
    for (const roomCount of [4, 6]) {
      const plan = generateChamberPlan(77, { roomCount, cavernChance: 0 });
      expect(plan.rooms.length).toBe(roomCount);
      expect(planConnectivity(plan).percentage).toBeCloseTo(100, 5);
    }
    for (let seed = 1; seed <= 12; seed += 1) {
      const plan = generateChamberPlan(seed, { wallThickness: 2, cavernChance: 0 });
      expect(plan.rooms.length).toBeGreaterThanOrEqual(4);
      expect(plan.rooms.length).toBeLessThanOrEqual(6);
      expect(planConnectivity(plan).percentage).toBeCloseTo(100, 5);
      let narrowGap = false;
      for (let first = 0; first < plan.rooms.length; first += 1) {
        for (let second = first + 1; second < plan.rooms.length; second += 1) {
          const a = plan.rooms[first];
          const b = plan.rooms[second];
          const gapX = Math.max(
            0,
            Math.max(a.x, b.x) - Math.min(a.x + a.width, b.x + b.width),
          );
          const gapY = Math.max(
            0,
            Math.max(a.y, b.y) - Math.min(a.y + a.height, b.y + b.height),
          );
          const overlapX = Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x);
          const overlapY = Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y);
          if ((gapX === 2 && overlapY > 0) || (gapY === 2 && overlapX > 0)) {
            narrowGap = true;
          }
        }
      }
      expect(narrowGap, `seed ${seed} · muro 2`).toBe(true);
      for (const door of plan.doors) expect(doorValid(plan, door)).toBe(true);
    }
  });

  it('la caverna forzada tiene exactamente 3 salas', () => {
    for (let seed = 1; seed <= 10; seed += 1) {
      const plan = generateChamberPlan(seed, { cavernChance: 100, wideCorridorChance: 0 });
      expect(plan.cavernRoomId, `seed ${seed}`).not.toBeNull();
      expect(plan.rooms.length, `seed ${seed}`).toBe(3);
      expect(planConnectivity(plan).percentage, `seed ${seed}`).toBeCloseTo(100, 5);
    }
  });

  it('las muescas tienen 1-2 tiles de fondo', () => {
    for (const seed of DEFAULT_SEEDS) {
      const plan = generateChamberPlan(seed, { cavernChance: 0 });
      for (const room of plan.rooms) {
        const box = { x: room.x, y: room.y, width: room.width, height: room.height };
        expect(maxNotchDepth(room.cells ?? [], box), `seed ${seed} · sala ${room.id}`).toBeLessThanOrEqual(2);
      }
    }
  });

  it('la caverna aparece en 10-20 % de 60 semillas y tiene exactamente 3 salas', () => {
    let cavernMaps = 0;
    for (const seed of CAVERN_SEEDS) {
      const plan = generateChamberPlan(seed);
      if (plan.cavernRoomId === null) {
        expect(plan.rooms.length, `seed ${seed}`).toBeGreaterThanOrEqual(4);
        expect(plan.rooms.length, `seed ${seed}`).toBeLessThanOrEqual(6);
        continue;
      }
      cavernMaps += 1;
      expect(plan.rooms.length, `seed ${seed}`).toBe(3);
      const cavern = plan.rooms[plan.cavernRoomId];
      expect(cavern, `seed ${seed}`).toBeDefined();
      const totalRoomFloor = plan.rooms.reduce((sum, room) => sum + (room.area ?? 0), 0);
      expect((cavern.area ?? 0) / totalRoomFloor, `seed ${seed}`).toBeGreaterThanOrEqual(0.55);
      expect(notchCount(cavern), `seed ${seed}`).toBeGreaterThanOrEqual(4);
    }
    expect(cavernMaps / CAVERN_SEEDS.length).toBeGreaterThanOrEqual(0.1);
    expect(cavernMaps / CAVERN_SEEDS.length).toBeLessThanOrEqual(0.2);
  });
});

describe('pasillos, bucles y conectividad', () => {
  it('los pasillos miden 0-3, el grafo es conexo y hay 0-3 bucles', () => {
    for (const seed of DEFAULT_SEEDS) {
      const plan = generateChamberPlan(seed);
      for (const corridor of plan.corridors) {
        expect(corridor.length, `seed ${seed}`).toBeGreaterThanOrEqual(0);
        expect(corridor.length, `seed ${seed}`).toBeLessThanOrEqual(3);
      }
      expect(plan.loops, `seed ${seed}`).toBeGreaterThanOrEqual(0);
      expect(plan.loops, `seed ${seed}`).toBeLessThanOrEqual(3);
      expect(roomsConnected(plan), `seed ${seed}`).toBe(true);
      const connectivity = planConnectivity(plan);
      expect(connectivity.total, `seed ${seed}`).toBeGreaterThan(0);
      expect(connectivity.percentage, `seed ${seed}`).toBeCloseTo(100, 5);
      expect(connectivity.components, `seed ${seed}`).toBe(1);
    }
  });

  it('el pasillo ancho aparece en 25-40 % de 60 semillas, como máximo uno y sin puertas', () => {
    let wideMaps = 0;
    for (const seed of CAVERN_SEEDS) {
      const plan = generateChamberPlan(seed);
      const wide = plan.corridors.filter((corridor) => corridor.width === 2);
      expect(wide.length, `seed ${seed}`).toBeLessThanOrEqual(1);
      if (wide.length === 1) {
        wideMaps += 1;
        expect(wide[0].length, `seed ${seed}`).toBeGreaterThanOrEqual(3);
        expect(wide[0].doorEligible, `seed ${seed}`).toBe(false);
        expect(plan.doors.some((door) => door.corridorId === wide[0].id), `seed ${seed}`).toBe(false);
      }
    }
    expect(wideMaps / CAVERN_SEEDS.length).toBeGreaterThanOrEqual(0.25);
    expect(wideMaps / CAVERN_SEEDS.length).toBeLessThanOrEqual(0.4);
  });
});

describe('puertas', () => {
  const REASONS: readonly OpenMouthReason[] = [
    'sin-soporte',
    'sin-suelo',
    'misma-sala',
    'separacion',
    'una-por-pasillo',
    'pasillo-ancho',
  ];

  it('solo devuelve puertas con soporte, suelo a ambos lados y dos salas distintas', () => {
    for (const seed of CAVERN_SEEDS) {
      const plan = generateChamberPlan(seed);
      for (const door of plan.doors) {
        expect(door.roomA, `seed ${seed}`).not.toBe(door.roomB);
        expect(doorValid(plan, door), `seed ${seed} · puerta ${door.id}`).toBe(true);
        expect(DOOR_STYLES).toContain(door.style);
      }
      for (const mouth of plan.openMouths) {
        expect(REASONS, `seed ${seed} · boca ${mouth.id}`).toContain(mouth.reason);
      }
    }
  });

  it('respeta separación Chebyshev ≥3 y máximo una puerta por pasillo', () => {
    for (const seed of CAVERN_SEEDS) {
      const plan = generateChamberPlan(seed);
      for (let first = 0; first < plan.doors.length; first += 1) {
        for (let second = first + 1; second < plan.doors.length; second += 1) {
          const a = plan.doors[first];
          const b = plan.doors[second];
          const distance = Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y));
          expect(distance, `seed ${seed}`).toBeGreaterThanOrEqual(DOOR_MIN_SEPARATION);
        }
      }
      const byCorridor = new Map<number, number>();
      for (const door of plan.doors) {
        const id = door.corridorId ?? -1;
        byCorridor.set(id, (byCorridor.get(id) ?? 0) + 1);
      }
      for (const count of byCorridor.values()) expect(count).toBe(1);
      const wideIds = new Set(
        plan.corridors
          .filter((corridor: Corridor) => corridor.width === 2)
          .map((corridor) => corridor.id),
      );
      for (const door of plan.doors) {
        expect(wideIds.has(door.corridorId), `seed ${seed}`).toBe(false);
      }
    }
  });

  it('hay una pareja de salas con 1-2 tiles de muro y una puerta válida', () => {
    for (const seed of DEFAULT_SEEDS) {
      const plan = generateChamberPlan(seed);
      expect(plan.doors.length, `seed ${seed}`).toBeGreaterThan(0);
      const validPair = plan.doors.some((door) => {
        const a = plan.rooms.find((room) => room.id === door.roomA);
        const b = plan.rooms.find((room) => room.id === door.roomB);
        if (!a || !b) return false;
        const gapX = Math.max(0, Math.max(a.x, b.x) - Math.min(a.x + a.width, b.x + b.width));
        const gapY = Math.max(0, Math.max(a.y, b.y) - Math.min(a.y + a.height, b.y + b.height));
        const overlapX = Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x);
        const overlapY = Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y);
        return (
          (gapX >= 1 && gapX <= 2 && overlapY > 0) ||
          (gapY >= 1 && gapY <= 2 && overlapX > 0)
        );
      });
      expect(validPair, `seed ${seed}`).toBe(true);
    }
  });

  it('valida los motivos negativos de una boca abierta con casos sintéticos', () => {
    const tiles = new Array(25).fill('wall') as Array<'floor' | 'wall'>;
    tiles[2 * 5 + 1] = 'floor';
    tiles[2 * 5 + 2] = 'floor';
    tiles[2 * 5 + 3] = 'floor';
    tiles[1 * 5 + 2] = 'wall';
    tiles[3 * 5 + 2] = 'wall';
    expect(
      validateDoorCandidate(
        { x: 2, y: 2, orientation: 'vertical', roomA: 0, roomB: 1 },
        tiles,
        5,
        5,
      ),
    ).toBeNull();
    expect(
      validateDoorCandidate(
        { x: 2, y: 2, orientation: 'vertical', roomA: 0, roomB: 0 },
        tiles,
        5,
        5,
      ),
    ).toBe('misma-sala');
    tiles[1 * 5 + 2] = 'floor';
    expect(
      validateDoorCandidate(
        { x: 2, y: 2, orientation: 'vertical', roomA: 0, roomB: 1 },
        tiles,
        5,
        5,
      ),
    ).toBe('sin-soporte');
    tiles[1 * 5 + 2] = 'wall';
    tiles[2 * 5 + 1] = 'wall';
    expect(
      validateDoorCandidate(
        { x: 2, y: 2, orientation: 'vertical', roomA: 0, roomB: 1 },
        tiles,
        5,
        5,
      ),
    ).toBe('sin-suelo');
  });

  it('coloca una sola puerta por pasillo y convierte el resto en bocas con motivo', () => {
    const width = 9;
    const height = 6;
    const tiles = new Array<'floor' | 'wall'>(width * height).fill('wall');
    const floor = (x: number, y: number): void => {
      tiles[y * width + x] = 'floor';
    };
    floor(2, 2);
    floor(3, 2);
    floor(4, 2);
    floor(5, 2);
    const placement = placeDoors({
      rooms: [
        { id: 0, cells: [{ x: 2, y: 2 }] },
        { id: 1, cells: [{ x: 5, y: 2 }] },
      ],
      corridors: [
        {
          id: 0,
          cells: [
            { x: 3, y: 2 },
            { x: 4, y: 2 },
          ],
          width: 1,
          length: 1,
          roomA: 0,
          roomB: 1,
        },
      ],
      tiles,
      width,
      height,
      seed: 11,
    });
    expect(placement.doors).toHaveLength(1);
    expect(placement.openMouths.some((mouth) => mouth.reason === 'una-por-pasillo')).toBe(true);
    const repeated = placeDoors({
      rooms: [
        { id: 0, cells: [{ x: 2, y: 2 }] },
        { id: 1, cells: [{ x: 5, y: 2 }] },
      ],
      corridors: [
        {
          id: 0,
          cells: [
            { x: 3, y: 2 },
            { x: 4, y: 2 },
          ],
          width: 1,
          length: 1,
          roomA: 0,
          roomB: 1,
        },
      ],
      tiles,
      width,
      height,
      seed: 11,
    });
    expect(repeated.doors).toEqual(placement.doors);
  });

  it('rechaza una segunda puerta a distancia Chebyshev <3', () => {
    const width = 7;
    const height = 7;
    const tiles = new Array<'floor' | 'wall'>(width * height).fill('wall');
    const floor = (x: number, y: number): void => {
      tiles[y * width + x] = 'floor';
    };
    for (const [x, y] of [
      [2, 2],
      [3, 2],
      [4, 2],
      [2, 4],
      [3, 4],
      [4, 4],
    ] as const) {
      floor(x, y);
    }
    const placement = placeDoors({
      rooms: [
        { id: 0, cells: [{ x: 2, y: 2 }] },
        { id: 1, cells: [{ x: 4, y: 2 }] },
        { id: 2, cells: [{ x: 2, y: 4 }] },
        { id: 3, cells: [{ x: 4, y: 4 }] },
      ],
      corridors: [
        { id: 0, cells: [{ x: 3, y: 2 }], width: 1, length: 0, roomA: 0, roomB: 1 },
        { id: 1, cells: [{ x: 3, y: 4 }], width: 1, length: 0, roomA: 2, roomB: 3 },
      ],
      tiles,
      width,
      height,
      seed: 12,
    });
    expect(placement.doors).toHaveLength(1);
    expect(placement.openMouths.some((mouth) => mouth.reason === 'separacion')).toBe(true);
    const [door] = placement.doors;
    expect(door.roomA).toBe(door.roomId);
  });

  it('no dibuja puertas en un pasillo ancho', () => {
    const width = 9;
    const height = 6;
    const tiles = new Array<'floor' | 'wall'>(width * height).fill('wall');
    const floor = (x: number, y: number): void => {
      tiles[y * width + x] = 'floor';
    };
    for (const [x, y] of [
      [2, 2],
      [3, 2],
      [4, 2],
      [5, 2],
    ] as const) {
      floor(x, y);
    }
    const placement = placeDoors({
      rooms: [
        { id: 0, cells: [{ x: 2, y: 2 }] },
        { id: 1, cells: [{ x: 5, y: 2 }] },
      ],
      corridors: [
        {
          id: 0,
          cells: [
            { x: 3, y: 2 },
            { x: 4, y: 2 },
          ],
          width: 2,
          length: 3,
          roomA: 0,
          roomB: 1,
        },
      ],
      tiles,
      width,
      height,
      seed: 13,
    });
    expect(placement.doors).toHaveLength(0);
    expect(placement.openMouths.every((mouth) => mouth.reason === 'pasillo-ancho')).toBe(true);
  });
});

describe('paletas y estilos', () => {
  it('asigna una paleta y ambiente por sala completa', () => {
    const plan = generateChamberPlan(7);
    expect(plan.palettes).toHaveLength(plan.rooms.length);
    for (const [index, palette] of plan.palettes.entries()) {
      expect(palette.roomId).toBe(plan.rooms[index].id);
      expect(AMBIENT_ORDER).toContain(palette.ambient);
      expect(['neutral', 'humid', 'death', 'ruin', 'vegetation']).toContain(palette.palette);
    }
    expect(generateChamberPlan(7).palettes).toEqual(plan.palettes);
  });

  it('los estilos son estables por semilla y hay al menos tres disponibles', () => {
    const first = generateChamberPlan(20261107);
    const second = generateChamberPlan(20261107);
    expect(first.doors.map((door) => `${door.x},${door.y}:${door.style}`)).toEqual(
      second.doors.map((door) => `${door.x},${door.y}:${door.style}`),
    );
    const styles = new Set<string>();
    for (let seed = 1; seed <= 40; seed += 1) {
      for (const door of generateChamberPlan(seed).doors) {
        styles.add(String(door.style));
      }
    }
    expect(styles.size).toBeGreaterThanOrEqual(3);
  });
});

describe('determinismo y pureza', () => {
  it('la misma semilla produce el mismo plan y semillas distintas cambian la geometría', () => {
    const first = generateChamberPlan(2738263054);
    const second = generateChamberPlan(2738263054);
    expect(first).toEqual(second);
    expect(JSON.parse(JSON.stringify(first))).toEqual(first);
    const other = generateChamberPlan(2738263055);
    expect(other.tiles).not.toEqual(first.tiles);
  });

  it('no usa Math.random, relojes, DOM ni imports prohibidos', () => {
    const original = Math.random;
    let randomCalls = 0;
    Math.random = () => {
      randomCalls += 1;
      return original();
    };
    try {
      generateChamberPlan(123);
    } finally {
      Math.random = original;
    }
    expect(randomCalls).toBe(0);

    const files = readdirSync(CORE_DIR).filter((file) => file.endsWith('.ts'));
    expect(files.length).toBeGreaterThan(0);
    for (const file of files) {
      const source = readFileSync(join(CORE_DIR, file), 'utf8');
      expect(source, file).not.toMatch(/Math\.random\s*\(|Date\.now\s*\(|performance\.now\s*\(/);
      expect(source, file).not.toMatch(/from\s+['"][^'"]*(?:experiments|variants|bsp|templates|host)[^'"]*['"]/);
      expect(source, file).not.toMatch(/switch\s*\(\s*variant/);
    }
    const gameIndex = readFileSync(join(process.cwd(), 'src/game/index.ts'), 'utf8');
    expect(gameIndex).not.toContain('chambers');
  });
});
