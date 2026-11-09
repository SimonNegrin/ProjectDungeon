import { describe, expect, it, vi } from 'vitest';
import { classifyRoom, type Corridor, type Room } from '../../../src/game/map';
import type { Tile } from '../../../src/game/types';
import {
  EXIT_MIN_DISTANCE,
  buildRoomGraph,
  reservedExitCells,
  roomDistances,
  selectExit,
  type ExitMode,
} from '../../../src/game/chambers/core';

const WIDTH = 20;
const HEIGHT = 20;

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

function corridor(id: number, roomA: number, roomB: number): Corridor {
  return {
    id,
    fromRoomId: roomA,
    toRoomId: roomB,
    roomA,
    roomB,
    kind: 'tree',
    width: 1,
    doorEligible: true,
    path: [],
  };
}

function tilesFor(rooms: readonly Room[]): Tile[] {
  const tiles = new Array<Tile>(WIDTH * HEIGHT).fill('wall');
  for (const room of rooms) {
    for (const cell of room.cells ?? []) tiles[cell.y * WIDTH + cell.x] = 'floor';
  }
  return tiles;
}

function chainRooms(): Room[] {
  return [room(0, 1, 1, 3, 3), room(1, 8, 8, 3, 3), room(2, 16, 16, 3, 3)];
}

function spawnsFor(rooms: readonly Room[], roomId = 0) {
  const spawnRoom = rooms.find((candidate) => candidate.id === roomId) ?? rooms[0];
  const party = (spawnRoom.cells ?? []).slice(0, 6);
  return { roomId: spawnRoom.id, party, player: party[0] };
}

function exitFor(
  rooms: readonly Room[],
  corridors: readonly Corridor[],
  mode: ExitMode,
  seed = 5,
  spawns = spawnsFor(rooms),
) {
  return selectExit({
    rooms,
    doors: [],
    corridors,
    tiles: tilesFor(rooms),
    width: WIDTH,
    height: HEIGHT,
    spawns,
    seed,
    mode,
  });
}

describe('salida única de REQ-013', () => {
  it('expone la distancia mínima de grafo', () => {
    expect(EXIT_MIN_DISTANCE).toBe(2);
  });

  it('elige la sala más lejana en un mapa de 3 salas en cadena', () => {
    const rooms = chainRooms();
    const corridors = [corridor(0, 0, 1), corridor(1, 1, 2)];
    const graph = buildRoomGraph(rooms, corridors);
    const distances = roomDistances(0, graph);
    const result = exitFor(rooms, corridors, 'stairs-down');

    expect(distances.distance.get(0)).toBe(0);
    expect(distances.distance.get(1)).toBe(1);
    expect(distances.distance.get(2)).toBe(2);
    expect(result.exit).toMatchObject({
      roomId: 2,
      kind: 'stairs-down',
      distance: 2,
      path: [0, 1, 2],
      fallback: false,
    });
    expect(result.warnings).toEqual([]);
  });

  it('stairs-down y stairs-up usan suelo de la sala', () => {
    const rooms = chainRooms();
    const corridors = [corridor(0, 0, 1), corridor(1, 1, 2)];
    const tiles = tilesFor(rooms);

    for (const mode of ['stairs-down', 'stairs-up'] as const) {
      const result = exitFor(rooms, corridors, mode);
      expect(result.exit, mode).not.toBeNull();
      const exit = result.exit!;
      expect(exit.kind).toBe(mode);
      expect(exit.position).toEqual(exit.access);
      expect(tiles[exit.position.y * WIDTH + exit.position.x]).toBe('floor');
      expect(exit.tile).toBe(
        mode === 'stairs-down' ? 'staircase-down' : 'staircase-up',
      );
    }
  });

  it('door usa un muro del borde y deja el acceso interior sin abrir paso', () => {
    const rooms = chainRooms();
    const corridors = [corridor(0, 0, 1), corridor(1, 1, 2)];
    const tiles = tilesFor(rooms);
    const result = exitFor(rooms, corridors, 'door');

    expect(result.exit).toMatchObject({
      roomId: 2,
      kind: 'door',
      tile: 'exit-door',
      distance: 2,
    });
    const exit = result.exit!;
    const onBorder =
      exit.position.x === 0 ||
      exit.position.y === 0 ||
      exit.position.x === WIDTH - 1 ||
      exit.position.y === HEIGHT - 1;
    expect(onBorder).toBe(true);
    expect(tiles[exit.position.y * WIDTH + exit.position.x]).toBe('wall');
    expect(tiles[exit.access.y * WIDTH + exit.access.x]).toBe('floor');
    expect(
      Math.abs(exit.position.x - exit.access.x) +
        Math.abs(exit.position.y - exit.access.y),
    ).toBe(1);
    expect(reservedExitCells(exit)).toEqual(
      new Set([
        `${exit.position.x},${exit.position.y}`,
        `${exit.access.x},${exit.access.y}`,
      ]),
    );
  });

  it('door cae a stairs-down con aviso si ninguna sala a distancia ≥2 toca el borde', () => {
    const rooms = [room(0, 1, 1, 3, 3), room(1, 8, 8, 3, 3)];
    const corridors = [corridor(0, 0, 1)];
    const result = exitFor(rooms, corridors, 'door');

    expect(result.exit?.kind).toBe('stairs-down');
    expect(result.exit?.fallback).toBe(true);
    expect(result.warnings.join(' ')).toMatch(/distancia ≥2.*borde|borde.*stairs-down/i);
  });

  it('random es estable por semilla y elige uno de los tres modos', () => {
    const rooms = chainRooms();
    const corridors = [corridor(0, 0, 1), corridor(1, 1, 2)];
    const first = exitFor(rooms, corridors, 'random', 123);
    const second = exitFor(rooms, corridors, 'random', 123);

    expect(first).toEqual(second);
    expect(['door', 'stairs-down', 'stairs-up']).toContain(first.exit?.kind);
  });

  it('sin sala no-spawn alcanzable deja la salida vacía con aviso', () => {
    const rooms = [room(0, 1, 1, 3, 3)];
    const result = exitFor(rooms, [], 'stairs-down');

    expect(result.exit).toBeNull();
    expect(result.warnings.join(' ')).toMatch(/salida queda vacía/i);
    expect(reservedExitCells(null).size).toBe(0);
  });

  it('en empate de distancia prefiere el menor id y después la mayor área', () => {
    const rooms = [
      room(0, 1, 1, 3, 3),
      room(1, 8, 1, 3, 3),
      room(2, 8, 10, 4, 4),
    ];
    const corridors = [corridor(0, 0, 1), corridor(1, 0, 2)];
    const result = exitFor(rooms, corridors, 'stairs-down');

    expect(result.exit?.roomId).toBe(1);
  });

  it('es determinista, serializable y no usa Math.random', () => {
    const rooms = chainRooms();
    const corridors = [corridor(0, 0, 1), corridor(1, 1, 2)];
    const random = vi.spyOn(Math, 'random');
    try {
      const first = exitFor(rooms, corridors, 'random', 321);
      const second = exitFor(rooms, corridors, 'random', 321);
      expect(first).toEqual(second);
      expect(JSON.parse(JSON.stringify(first))).toEqual(first);
      expect(random).not.toHaveBeenCalled();
    } finally {
      random.mockRestore();
    }
  });
});
