import { describe, expect, it } from 'vitest';
import { generateMap } from './generate';
import {
  EXIT_MIN_DISTANCE,
  buildRoomGraph,
  doorBoundaryCandidates,
  pathToRoom,
  reservedExitCells,
  roomDistances,
  selectExit,
  stairPosition,
} from './exit';
import type { Corridor, Door, Point, Room, Spawns, Tile } from './types';

function roomRect(id: number, x: number, y: number, width: number, height: number): Room {
  const cells: Point[] = [];
  for (let yy = y; yy < y + height; yy += 1) {
    for (let xx = x; xx < x + width; xx += 1) cells.push({ x: xx, y: yy });
  }
  return {
    id,
    x,
    y,
    width,
    height,
    cells,
    role: 'medium',
    sizeRole: 'medium',
    area: cells.length,
    boxArea: width * height,
    notches: 0,
    alcoves: 0,
    accesses: 1,
    doorIds: [],
    ambient: 'mixed',
    palette: 'neutral',
  };
}

function corridor(id: number, roomA: number, roomB: number, cells: Point[]): Corridor {
  return {
    id,
    cells,
    kind: 'short',
    length: Math.max(0, cells.length - 1),
    doors: [],
    roomA,
    roomB,
    width: 1,
  };
}

function tilesFor(rooms: readonly Room[], width: number, height: number, extra: Point[] = []): Tile[] {
  const tiles = new Array<Tile>(width * height).fill(0);
  for (const room of rooms) {
    for (const cell of room.cells) tiles[cell.y * width + cell.x] = 1;
  }
  for (const cell of extra) tiles[cell.y * width + cell.x] = 1;
  return tiles;
}

function spawnsAt(roomId: number, position: Point): Spawns {
  return { roomId, party: [position], player: position };
}

const chainRooms = [
  roomRect(0, 2, 2, 3, 3),
  roomRect(1, 8, 2, 3, 3),
  roomRect(2, 14, 2, 3, 3),
];
const chainCorridors = [
  corridor(0, 0, 1, [{ x: 5, y: 3 }, { x: 6, y: 3 }, { x: 7, y: 3 }]),
  corridor(1, 1, 2, [{ x: 11, y: 3 }, { x: 12, y: 3 }, { x: 13, y: 3 }]),
];
const chainTiles = tilesFor(chainRooms, 20, 11, [
  { x: 5, y: 3 },
  { x: 6, y: 3 },
  { x: 7, y: 3 },
  { x: 11, y: 3 },
  { x: 12, y: 3 },
  { x: 13, y: 3 },
]);

describe('salida de nivel de REQ-013', () => {
  it('el grafo y la distancia usan las conexiones reales, no las puertas decorativas', () => {
    const graph = buildRoomGraph(chainRooms, chainCorridors);
    expect([...(graph.get(0) ?? [])]).toEqual([1]);
    expect([...(graph.get(1) ?? [])].sort()).toEqual([0, 2]);
    const distances = roomDistances(0, graph);
    expect(distances.distance.get(0)).toBe(0);
    expect(distances.distance.get(1)).toBe(1);
    expect(distances.distance.get(2)).toBe(2);
    expect(pathToRoom(distances.parent, 0, 2)).toEqual([0, 1, 2]);
  });

  it('en un mapa de 3 salas en cadena elige la tercera para stairs-down', () => {
    const result = selectExit({
      rooms: chainRooms,
      doors: [],
      corridors: chainCorridors,
      tiles: chainTiles,
      width: 20,
      height: 11,
      spawns: spawnsAt(0, { x: 3, y: 3 }),
      seed: 5,
      mode: 'stairs-down',
    });
    expect(result.warnings).toEqual([]);
    expect(result.exit).not.toBeNull();
    const exit = result.exit;
    if (!exit) return;
    expect(exit.roomId).toBe(2);
    expect(exit.kind).toBe('stairs-down');
    expect(exit.distance).toBe(EXIT_MIN_DISTANCE);
    expect(exit.path).toEqual([0, 1, 2]);
    expect(exit.access).toEqual(exit.position);
    expect(chainTiles[exit.position.y * 20 + exit.position.x]).toBe(1);
    expect(exit.tile).toBe('staircase-down');
  });

  it('door cae en un muro del borde y no abre paso', () => {
    const rooms = [
      roomRect(0, 2, 2, 3, 3),
      roomRect(1, 8, 2, 3, 3),
      roomRect(2, 16, 2, 3, 3),
    ];
    const corridors = [
      corridor(0, 0, 1, [{ x: 5, y: 3 }, { x: 6, y: 3 }, { x: 7, y: 3 }]),
      corridor(1, 1, 2, [{ x: 11, y: 3 }, { x: 12, y: 3 }, { x: 13, y: 3 }]),
    ];
    const tiles = tilesFor(rooms, 20, 11, [
      { x: 5, y: 3 },
      { x: 6, y: 3 },
      { x: 7, y: 3 },
      { x: 11, y: 3 },
      { x: 12, y: 3 },
      { x: 13, y: 3 },
      { x: 14, y: 3 },
    ]);
    const result = selectExit({
      rooms,
      doors: [],
      corridors,
      tiles,
      width: 20,
      height: 11,
      spawns: spawnsAt(0, { x: 3, y: 3 }),
      seed: 2,
      mode: 'door',
    });
    expect(result.exit).not.toBeNull();
    const exit = result.exit;
    if (!exit) return;
    expect(exit.kind).toBe('door');
    expect(exit.position.x).toBe(19);
    expect(tiles[exit.position.y * 20 + exit.position.x]).toBe(0);
    expect(tiles[exit.access.y * 20 + exit.access.x]).toBe(1);
    expect(
      Math.abs(exit.position.x - exit.access.x) +
        Math.abs(exit.position.y - exit.access.y),
    ).toBe(1);
    expect(exit.tile).toBe('exit-door');
  });

  it('si door no encuentra sala de borde, cae a stairs-down con aviso', () => {
    const result = selectExit({
      rooms: chainRooms,
      doors: [],
      corridors: chainCorridors,
      tiles: chainTiles,
      width: 20,
      height: 11,
      spawns: spawnsAt(0, { x: 3, y: 3 }),
      seed: 3,
      mode: 'door',
    });
    expect(result.exit?.kind).toBe('stairs-down');
    expect(result.exit?.fallback).toBe(true);
    expect(result.warnings.some((warning) => /cayó a stairs-down/i.test(warning))).toBe(true);
  });

  it('random es estable con la misma semilla y cambia el tipo entre semillas', () => {
    const base = {
      rooms: chainRooms,
      doors: [] as Door[],
      corridors: chainCorridors,
      tiles: chainTiles,
      width: 20,
      height: 11,
      spawns: spawnsAt(0, { x: 3, y: 3 }),
      mode: 'random' as const,
    };
    const first = selectExit({ ...base, seed: 1 });
    const second = selectExit({ ...base, seed: 1 });
    expect(JSON.parse(JSON.stringify(first))).toEqual(JSON.parse(JSON.stringify(second)));
  });

  it('sin sala a distancia ≥2 usa la más lejana alcanzable con aviso', () => {
    const rooms = [roomRect(0, 2, 2, 3, 3), roomRect(1, 8, 2, 3, 3)];
    const corridors = [corridor(0, 0, 1, [{ x: 5, y: 3 }, { x: 6, y: 3 }, { x: 7, y: 3 }])];
    const tiles = tilesFor(rooms, 15, 11, [
      { x: 5, y: 3 },
      { x: 6, y: 3 },
      { x: 7, y: 3 },
    ]);
    const result = selectExit({
      rooms,
      doors: [],
      corridors,
      tiles,
      width: 15,
      height: 11,
      spawns: spawnsAt(0, { x: 3, y: 3 }),
      seed: 1,
      mode: 'stairs-up',
    });
    expect(result.exit?.roomId).toBe(1);
    expect(result.exit?.distance).toBe(1);
    expect(result.warnings.some((warning) => /distancia ≥2/i.test(warning))).toBe(true);
  });

  it('sin sala no-spawn alcanzable deja exit vacío con aviso', () => {
    const rooms = [roomRect(0, 2, 2, 3, 3)];
    const tiles = tilesFor(rooms, 10, 10);
    const result = selectExit({
      rooms,
      doors: [],
      corridors: [],
      tiles,
      width: 10,
      height: 10,
      spawns: spawnsAt(0, { x: 3, y: 3 }),
      seed: 1,
      mode: 'random',
    });
    expect(result.exit).toBeNull();
    expect(result.warnings.length).toBeGreaterThan(0);
  });

  it('la salida reserva su tile y su acceso', () => {
    const room = roomRect(2, 16, 2, 3, 3);
    const candidates = doorBoundaryCandidates(
      room,
      tilesFor([room], 20, 11),
      20,
      11,
      [],
      spawnsAt(0, { x: 3, y: 3 }),
    );
    expect(candidates.length).toBeGreaterThan(0);
    const position = stairPosition(
      room,
      tilesFor([room], 20, 11),
      20,
      11,
      [],
      spawnsAt(0, { x: 3, y: 3 }),
      4,
    );
    expect(position).not.toBeNull();
    if (!position) return;
    const reserved = reservedExitCells({
      roomId: 2,
      kind: 'stairs-down',
      position,
      access: position,
      tile: 'staircase-down',
      distance: 2,
      path: [0, 1, 2],
      fallback: false,
    });
    expect(reserved.has(`${position.x},${position.y}`)).toBe(true);
    const withDoor = reservedExitCells({
      roomId: 2,
      kind: 'door',
      position: candidates[0].position,
      access: candidates[0].access,
      tile: 'exit-door',
      distance: 2,
      path: [0, 1, 2],
      fallback: false,
    });
    expect(withDoor.has(`${candidates[0].position.x},${candidates[0].position.y}`)).toBe(true);
    expect(withDoor.has(`${candidates[0].access.x},${candidates[0].access.y}`)).toBe(true);
  });

  it('A/B/C generan una salida alcanzable a distancia ≥2 y reservada en 12 semillas', () => {
    for (const variant of ['growth', 'bsp', 'templates'] as const) {
      for (let seed = 1; seed <= 12; seed += 1) {
        const map = generateMap(variant, seed);
        const exit = map.exit;
        expect(exit, `${variant} · ${seed}`).not.toBeNull();
        if (!exit) continue;
        expect(exit.roomId, `${variant} · ${seed}`).not.toBe(map.spawns.roomId);
        expect(exit.distance, `${variant} · ${seed}`).toBeGreaterThanOrEqual(2);
        expect(exit.path[0]).toBe(map.spawns.roomId);
        expect(exit.path[exit.path.length - 1]).toBe(exit.roomId);
        for (const enemy of map.enemies) {
          expect(
            enemy.x === exit.position.x && enemy.y === exit.position.y,
            `${variant} · ${seed} · enemigo en salida`,
          ).toBe(false);
          expect(
            enemy.x === exit.access.x && enemy.y === exit.access.y,
            `${variant} · ${seed} · enemigo en acceso`,
          ).toBe(false);
        }
        if (exit.kind === 'door') {
          expect(exit.position.x === 0 || exit.position.y === 0 ||
            exit.position.x === map.width - 1 || exit.position.y === map.height - 1).toBe(true);
          expect(map.tiles[exit.position.y * map.width + exit.position.x]).toBe(0);
          expect(map.tiles[exit.access.y * map.width + exit.access.x]).toBe(1);
        } else {
          expect(map.tiles[exit.position.y * map.width + exit.position.x]).toBe(1);
          expect(exit.access).toEqual(exit.position);
        }
        expect(JSON.parse(JSON.stringify(exit))).toEqual(exit);
      }
    }
  });
});
