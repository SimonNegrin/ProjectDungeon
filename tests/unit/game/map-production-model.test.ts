import { describe, expect, it } from 'vitest';
import {
  BspMapGenerator,
  createInitialState,
  createRoomGrid,
  DEFAULT_MAP_OPTIONS,
  DEFAULT_MAP_SEED,
  dedupePath,
  DOOR_STYLES,
  pathLength,
  roomAt,
  roomContains,
  validateGeneratedMap,
  type GeneratedMap,
  type MapGenerator,
  type Position,
  type Room,
} from '../../../src/game/index';

const generator = new BspMapGenerator();
const reference = generator.generate(DEFAULT_MAP_SEED, DEFAULT_MAP_OPTIONS);

function byPathOrder(a: Position, b: Position): number {
  return a.y - b.y || a.x - b.x;
}

describe('sala con máscara y caja', () => {
  it('usa la máscara para pertenencia y deja fuera las celdas de la caja sin suelo', () => {
    const cells: Position[] = [
      { x: 2, y: 2 },
      { x: 3, y: 2 },
      { x: 2, y: 3 },
    ];
    const notched: Room = {
      id: 0,
      x: 2,
      y: 2,
      width: 3,
      height: 3,
      role: 'small',
      cells,
      area: cells.length,
    };

    expect(roomContains(notched, 2, 2)).toBe(true);
    expect(roomContains(notched, 3, 2)).toBe(true);
    expect(roomContains(notched, 3, 3)).toBe(false);
    expect(roomAt([notched], 3, 3)).toBeUndefined();
    expect(roomAt([notched], 2, 3)).toBe(notched);
  });

  it('conserva el fallback de caja para fixtures sin máscara', () => {
    const legacy: Room = { id: 0, x: 2, y: 2, width: 3, height: 3, role: 'small' };

    expect(roomContains(legacy, 3, 3)).toBe(true);
    expect(roomContains(legacy, 5, 3)).toBe(false);
  });

  it('BSP rellena cells y area con la máscara rectangular ordenada', () => {
    for (const room of reference.rooms) {
      const cells = room.cells;
      expect(cells, `sala ${room.id} sin máscara`).toBeDefined();
      expect(room.area).toBe(cells?.length);
      expect(cells?.length).toBe(room.width * room.height);

      const ordered = [...(cells ?? [])].sort(byPathOrder);
      expect(cells).toEqual(ordered);
      for (const cell of cells ?? []) {
        expect(reference.tiles[cell.y * reference.width + cell.x]).toBe('floor');
        expect(roomContains(room, cell.x, cell.y)).toBe(true);
        expect(roomAt(reference.rooms, cell.x, cell.y)?.id).toBe(room.id);
      }
    }
  });

  it('el validador entiende la máscara y no acepta un área incoherente', () => {
    expect(validateGeneratedMap(reference).ok).toBe(true);

    const brokenRooms = reference.rooms.map((room, index) =>
      index === 0 ? { ...room, area: (room.area ?? 0) + 1 } : room,
    );
    const validation = validateGeneratedMap({ ...reference, rooms: brokenRooms });

    expect(validation.ok).toBe(false);
    expect(validation.issues.join(' ')).toContain('área');
  });
});

describe('serialización del modelo de producción', () => {
  it('todo el mapa, incluidas máscaras y campos nuevos, sobrevive al round-trip', () => {
    const parsed = JSON.parse(JSON.stringify(reference)) as GeneratedMap;

    expect(parsed).toEqual(reference);
    expect(parsed.rooms[0].cells).toEqual(reference.rooms[0].cells);
    expect(parsed.rooms[0].area).toBe(reference.rooms[0].area);
    expect(parsed.corridors[0].cells).toEqual(reference.corridors[0].cells);
    expect(parsed.spawns.party).toEqual(reference.spawns.party);
    expect(parsed.doors[0].style).toBe(reference.doors[0].style);
  });

  it('varias semillas generan mapas válidos con todos los campos nuevos', () => {
    for (const seed of [0, 1, 42, 1234]) {
      const map = generator.generate(seed, DEFAULT_MAP_OPTIONS);
      expect(validateGeneratedMap(map).issues, `semilla ${seed}`).toEqual([]);
      for (const room of map.rooms) {
        expect(room.cells, `semilla ${seed} sala ${room.id}`).toBeDefined();
        expect(room.area, `semilla ${seed} sala ${room.id}`).toBe(room.cells?.length);
      }
      for (const corridor of map.corridors) {
        expect(corridor.cells, `semilla ${seed}`).toBeDefined();
        expect(corridor.length, `semilla ${seed}`).toBeGreaterThan(0);
      }
    }
  });
});

describe('pasillos con extremos', () => {
  it('expone id, roomA/roomB, cells y length sin perder el contrato heredado', () => {
    for (let index = 0; index < reference.corridors.length; index += 1) {
      const corridor = reference.corridors[index];
      const expectedCells = dedupePath(corridor.path);

      expect(corridor.id).toBe(index);
      expect(corridor.roomA).toBe(corridor.fromRoomId);
      expect(corridor.roomB).toBe(corridor.toRoomId);
      expect(corridor.cells).toEqual(expectedCells);
      const cells = corridor.cells ?? [];
      expect(corridor.length).toBe(pathLength(expectedCells));
      expect(corridor.length).toBe(cells.length - 1);

      expect(cells[0]).toEqual(corridor.path[0]);
      expect(cells[cells.length - 1]).toEqual(corridor.path[corridor.path.length - 1]);
    }
  });

  it('cada extremo queda pegado a la sala que declara', () => {
    for (const corridor of reference.corridors) {
      const cells = corridor.cells ?? [];
      expect(cells.length).toBeGreaterThanOrEqual(2);

      const start = cells[0];
      const second = cells[1];
      const startRoom = roomAt(
        reference.rooms,
        start.x - Math.sign(second.x - start.x),
        start.y - Math.sign(second.y - start.y),
      );
      expect(startRoom?.id, `inicio de ${corridor.fromRoomId}->${corridor.toRoomId}`).toBe(
        corridor.fromRoomId,
      );

      const end = cells[cells.length - 1];
      const beforeEnd = cells[cells.length - 2];
      const endRoom = roomAt(
        reference.rooms,
        end.x - Math.sign(beforeEnd.x - end.x),
        end.y - Math.sign(beforeEnd.y - end.y),
      );
      expect(endRoom?.id, `fin de ${corridor.fromRoomId}->${corridor.toRoomId}`).toBe(
        corridor.toRoomId,
      );
    }
  });
});

describe('puertas entre salas distintas', () => {
  it('BSP rellena id, style, roomA/roomB, direct y corridorId', () => {
    expect(reference.doors.length).toBeGreaterThan(0);
    for (const door of reference.doors) {
      expect(door.id).toBeTypeOf('number');
      expect(DOOR_STYLES).toContain(door.style);
      expect(door.roomA).toBe(door.roomId);
      expect(door.roomB).not.toBe(door.roomA);
      expect(door.direct).toBeTypeOf('boolean');
      expect(door.corridorId).toBeTypeOf('number');

      const corridor = reference.corridors[door.corridorId ?? -1];
      expect(corridor).toBeDefined();
      expect([corridor.fromRoomId, corridor.toRoomId].sort()).toEqual(
        [door.roomA, door.roomB].sort(),
      );
    }
  });

  it('es determinista y conserva los huecos de BSP', () => {
    const again = generator.generate(DEFAULT_MAP_SEED, DEFAULT_MAP_OPTIONS);

    expect(again.doors).toEqual(reference.doors);
    expect(again.doors.map((door) => `${door.x},${door.y}`)).toEqual(
      reference.doors.map((door) => `${door.x},${door.y}`),
    );
  });

  it('el validador rechaza una puerta que conecta dos veces la misma sala', () => {
    const door = reference.doors[0];
    const broken = {
      ...reference,
      doors: [{ ...door, roomB: door.roomA }, ...reference.doors.slice(1)],
    };

    const validation = validateGeneratedMap(broken);
    expect(validation.ok).toBe(false);
    expect(validation.issues.join(' ')).toMatch(/salas distintas|conecta dos veces/);
  });
});

describe('spawns: sala, grupo de 6 y alias player', () => {
  it('BSP rellena roomId y party, con party[0] como alias profundo de player', () => {
    const spawns = reference.spawns;
    const playerRoom = roomAt(reference.rooms, spawns.player.x, spawns.player.y);

    expect(spawns.roomId).toBe(playerRoom?.id);
    expect(spawns.party).toHaveLength(6);
    expect(spawns.party?.[0]).toEqual(spawns.player);

    const keys = new Set((spawns.party ?? []).map((cell) => `${cell.x},${cell.y}`));
    expect(keys.size).toBe(6);
    for (const cell of spawns.party ?? []) {
      expect(reference.tiles[cell.y * reference.width + cell.x]).toBe('floor');
      expect(roomAt(reference.rooms, cell.x, cell.y)?.id).toBe(spawns.roomId);
    }
  });

  it('el motor coloca al jugador en party[0] y cae a player si falta party', () => {
    const grid = createRoomGrid(20, 20);
    const party: Position[] = [
      { x: 7, y: 7 },
      { x: 8, y: 7 },
      { x: 7, y: 8 },
      { x: 8, y: 8 },
      { x: 9, y: 7 },
      { x: 9, y: 8 },
    ];
    const stubWithParty: MapGenerator = {
      id: 'stub-party',
      generate: () => ({
        seed: 1,
        width: grid.width,
        height: grid.height,
        tiles: grid.tiles,
        rooms: [],
        corridors: [],
        doors: [],
        spawns: {
          roomId: 0,
          party,
          player: { x: 5, y: 5 },
          enemy: { x: 6, y: 5 },
          distance: 1,
        },
        warnings: [],
        options: DEFAULT_MAP_OPTIONS,
      }),
    };
    const stubWithoutParty: MapGenerator = {
      id: 'stub-player',
      generate: () => ({
        seed: 1,
        width: grid.width,
        height: grid.height,
        tiles: grid.tiles,
        rooms: [],
        corridors: [],
        doors: [],
        spawns: {
          player: { x: 5, y: 5 },
          enemy: { x: 6, y: 5 },
          distance: 1,
        },
        warnings: [],
        options: DEFAULT_MAP_OPTIONS,
      }),
    };

    const withParty = createInitialState({ generator: stubWithParty });
    expect(withParty.players[0]).toMatchObject({ x: 7, y: 7 });

    const withoutParty = createInitialState({ generator: stubWithoutParty });
    expect(withoutParty.players[0]).toMatchObject({ x: 5, y: 5 });
  });
});

describe('validadores sin relajar BSP', () => {
  it('los negativos históricos siguen fallando con el mismo motivo', () => {
    const door = reference.doors[0];

    const swappedOrientation: GeneratedMap = {
      ...reference,
      doors: [
        {
          ...door,
          orientation: door.orientation === 'horizontal' ? 'vertical' : 'horizontal',
        },
        ...reference.doors.slice(1),
      ],
    };
    expect(validateGeneratedMap(swappedOrientation).issues.join(' ')).toContain('orientación');

    const lateral = [...reference.tiles];
    if (door.orientation === 'horizontal') {
      lateral[door.y * reference.width + door.x - 1] = 'floor';
    } else {
      lateral[(door.y - 1) * reference.width + door.x] = 'floor';
    }
    expect(
      validateGeneratedMap({ ...reference, tiles: lateral }).issues.join(' '),
    ).toContain('esquina o sin muro lateral');

    expect(
      validateGeneratedMap({
        ...reference,
        doors: [...reference.doors, reference.doors[0]],
      }).issues.join(' '),
    ).toContain('duplicada');

    const first = reference.rooms[0];
    const second = reference.rooms[1];
    expect(
      validateGeneratedMap({
        ...reference,
        rooms: [first, { ...second, x: first.x, y: first.y }, ...reference.rooms.slice(2)],
      }).issues.join(' '),
    ).toContain('se solapan');
  });

  it('el mapa de referencia sigue pasando el validador completo', () => {
    const validation = validateGeneratedMap(reference);

    expect(validation.issues).toEqual([]);
    expect(validation.ok).toBe(true);
  });
});
