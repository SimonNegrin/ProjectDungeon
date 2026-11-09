import { describe, expect, it, vi } from 'vitest';
import { classifyRoom, type Door, type Room } from '../../../src/game/map';
import type { Tile } from '../../../src/game/types';
import {
  SPAWN_FALLBACK_RADIUS,
  SPAWN_MAX_COMPONENT,
  SPAWN_MIN_TILES,
  SPAWN_RADIUS,
  chooseSpawnAccess,
  componentSizeWith,
  maxComponentSize,
  partyCapacity,
  placeSpawns,
  type OpenMouth,
} from '../../../src/game/chambers/core';

function room(id: number, x: number, y: number, width: number, height: number): Room {
  const cells = [];
  for (let cellY = y; cellY < y + height; cellY += 1) {
    for (let cellX = x; cellX < x + width; cellX += 1) {
      cells.push({ x: cellX, y: cellY });
    }
  }
  return {
    id,
    x,
    y,
    width,
    height,
    role: classifyRoom({ width, height }),
    cells,
    area: cells.length,
  };
}

function door(id: number, x: number, y: number, roomA: number, roomB: number): Door {
  return {
    id,
    x,
    y,
    orientation: 'vertical',
    roomId: roomA,
    roomA,
    roomB,
  };
}

function tilesFor(rooms: readonly Room[], width: number, height: number): Tile[] {
  const tiles = new Array<Tile>(width * height).fill('wall');
  for (const room of rooms) {
    for (const cell of room.cells ?? []) tiles[cell.y * width + cell.x] = 'floor';
  }
  return tiles;
}

function spawn(
  rooms: readonly Room[],
  doors: readonly Door[] = [],
  width = 20,
  height = 20,
  seed = 7,
) {
  return placeSpawns({
    rooms,
    doors,
    openMouths: [],
    tiles: tilesFor(rooms, width, height),
    width,
    height,
    minTiles: SPAWN_MIN_TILES,
    seed,
  });
}

describe('spawn protegido de REQ-012', () => {
  it('expone los valores aprobados', () => {
    expect(SPAWN_MIN_TILES).toBe(6);
    expect(SPAWN_RADIUS).toBe(2);
    expect(SPAWN_FALLBACK_RADIUS).toBe(3);
    expect(SPAWN_MAX_COMPONENT).toBe(2);
  });

  it('elige la sala con menos accesos y evita la mayor en empate', () => {
    const largest = room(0, 1, 1, 8, 8);
    const tied = room(1, 10, 1, 6, 6);
    const other = room(2, 1, 10, 6, 6);
    const extra = room(3, 10, 10, 6, 6);
    const result = spawn(
      [largest, tied, other, extra],
      [
        door(0, 0, 3, 0, 1),
        door(1, 9, 12, 0, 2),
        door(2, 0, 12, 2, 3),
      ],
    );

    expect(result.spawns.roomId).toBe(tied.id);
    expect(result.spawns.party).toHaveLength(SPAWN_MIN_TILES);
  });

  it('no cuenta las bocas estrechas que acompañan a una puerta', () => {
    // P (id 0) y Q (id 1) empatan con el cómputo antiguo (puerta + boca ancha
    // estrecha). La regla aprobada deja a Q con 0 accesos y a P con 1, así que Q
    // gana aunque sea la sala mayor; el cómputo antiguo evitaba la mayor y elegía P.
    const protectedRoom = room(0, 1, 1, 5, 5);
    const largest = room(1, 12, 1, 7, 7);
    const annex = room(2, 8, 12, 2, 2);
    const doors = [door(0, 1, 3, 0, 2)];
    const openMouths: OpenMouth[] = [
      // Pasillo estrecho con puerta: la boca del otro extremo no suma acceso.
      {
        id: 0,
        x: 2,
        y: 7,
        orientation: 'vertical',
        roomA: 0,
        roomB: 2,
        corridorId: 0,
        reason: 'una-por-pasillo',
      },
      // Pasillo estrecho sin puerta: sus dos bocas tampoco son accesos de R-001.
      {
        id: 1,
        x: 11,
        y: 3,
        orientation: 'vertical',
        roomA: 1,
        roomB: 2,
        corridorId: 1,
        reason: 'separacion',
      },
      {
        id: 2,
        x: 11,
        y: 4,
        orientation: 'vertical',
        roomA: 1,
        roomB: 2,
        corridorId: 1,
        reason: 'separacion',
      },
    ];

    const result = placeSpawns({
      rooms: [protectedRoom, largest, annex],
      doors,
      openMouths,
      tiles: tilesFor([protectedRoom, largest, annex], 22, 18),
      width: 22,
      height: 18,
      minTiles: SPAWN_MIN_TILES,
      seed: 7,
    });

    expect(result.spawns.roomId).toBe(largest.id);
    expect(result.spawns.party).toHaveLength(SPAWN_MIN_TILES);
  });

  it('elige la sala mayor solo si es la única más protegida', () => {
    const largest = room(0, 1, 1, 8, 8);
    const other = room(1, 10, 1, 6, 6);
    const tiny = room(2, 1, 12, 2, 2);
    const result = spawn(
      [largest, other, tiny],
      [
        door(0, 0, 3, 0, 1),
        door(1, 9, 3, 1, 2),
      ],
    );

    expect(result.spawns.roomId).toBe(largest.id);
  });

  it('party[0] es el acceso junto a la puerta más cercana al centro', () => {
    const saloon = room(0, 2, 2, 6, 6);
    const far = room(1, 12, 2, 6, 6);
    const doors = [
      door(0, 1, 4, 0, 1),
      door(1, 9, 6, 0, 1),
      door(2, 11, 4, 1, 0),
      door(3, 11, 6, 1, 0),
    ];
    const result = spawn([saloon, far], doors);

    expect(result.spawns.roomId).toBe(saloon.id);
    expect(result.spawns.player).toEqual(chooseSpawnAccess(saloon, doors, []));
    expect(result.spawns.party?.[0]).toEqual(result.spawns.player);
    expect(result.spawns.player).toEqual({ x: 2, y: 4 });
  });

  it('coloca seis huecos distintos a radio 2 con componentes ≤2', () => {
    const saloon = room(0, 1, 1, 7, 7);
    const result = spawn([saloon]);
    const party = result.spawns.party ?? [];

    expect(party).toHaveLength(SPAWN_MIN_TILES);
    expect(new Set(party.map((cell) => `${cell.x},${cell.y}`)).size).toBe(6);
    expect(maxComponentSize(party)).toBeLessThanOrEqual(SPAWN_MAX_COMPONENT);
    for (const cell of party.slice(1)) {
      expect(
        Math.max(
          Math.abs(cell.x - result.spawns.player.x),
          Math.abs(cell.y - result.spawns.player.y),
        ),
      ).toBeLessThanOrEqual(SPAWN_RADIUS);
    }
    expect(result.warnings).toEqual([]);
  });

  it('si radio 2 no llega a 6, amplía a radio 3 con aviso', () => {
    const cells = [
      { x: 10, y: 10 },
      { x: 8, y: 8 },
      { x: 12, y: 8 },
      { x: 8, y: 12 },
      { x: 12, y: 12 },
      { x: 7, y: 10 },
      { x: 10, y: 7 },
      { x: 13, y: 10 },
      { x: 10, y: 13 },
    ];
    const saloon: Room = {
      id: 0,
      x: 7,
      y: 7,
      width: 7,
      height: 7,
      role: 'medium',
      cells,
      area: cells.length,
    };
    const result = spawn([saloon], [], 15, 15);
    const party = result.spawns.party ?? [];

    expect(party).toHaveLength(SPAWN_MIN_TILES);
    expect(result.spawns.player).toEqual({ x: 10, y: 10 });
    expect(
      result.warnings.some((warning) => /radio 3/i.test(warning)),
    ).toBe(true);
    expect(maxComponentSize(party)).toBeLessThanOrEqual(SPAWN_MAX_COMPONENT);
    for (const cell of party.slice(1)) {
      const distance = Math.max(
        Math.abs(cell.x - result.spawns.player.x),
        Math.abs(cell.y - result.spawns.player.y),
      );
      expect(distance).toBeLessThanOrEqual(SPAWN_FALLBACK_RADIUS);
    }
  });

  it('si no caben 6 huecos devuelve los posibles con aviso', () => {
    const tiny = room(0, 1, 1, 2, 3);
    const result = spawn([tiny], [], 5, 5);

    expect(result.spawns.party?.length).toBeLessThan(SPAWN_MIN_TILES);
    expect(result.spawns.party?.length).toBeGreaterThanOrEqual(1);
    expect(result.spawns.player).toEqual(result.spawns.party?.[0]);
    expect(maxComponentSize(result.spawns.party ?? [])).toBeLessThanOrEqual(
      SPAWN_MAX_COMPONENT,
    );
    expect(result.warnings.some((warning) => /huecos libres/i.test(warning))).toBe(
      true,
    );
  });

  it('partyCapacity mide el máximo con componentes ≤2', () => {
    const saloon = room(0, 1, 1, 7, 7);
    const access = { x: 4, y: 4 };
    expect(
      partyCapacity(
        saloon,
        [],
        access,
        tilesFor([saloon], 10, 10),
        10,
        10,
        1,
      ),
    ).toBeGreaterThanOrEqual(SPAWN_MIN_TILES);
    expect(componentSizeWith([], { x: 4, y: 4 })).toBe(1);
    expect(
      componentSizeWith(
        [
          { x: 4, y: 4 },
          { x: 5, y: 4 },
        ],
        { x: 6, y: 4 },
      ),
    ).toBe(3);
    expect(
      maxComponentSize([
        { x: 0, y: 0 },
        { x: 1, y: 0 },
        { x: 5, y: 5 },
        { x: 6, y: 5 },
      ]),
    ).toBe(2);
  });

  it('es determinista, serializable y no usa Math.random', () => {
    const saloon = room(0, 1, 1, 7, 7);
    const random = vi.spyOn(Math, 'random');
    try {
      const first = spawn([saloon], [], 20, 20, 99);
      const second = spawn([saloon], [], 20, 20, 99);
      expect(first).toEqual(second);
      expect(JSON.parse(JSON.stringify(first))).toEqual(first);
      expect(random).not.toHaveBeenCalled();
    } finally {
      random.mockRestore();
    }
  });
});
