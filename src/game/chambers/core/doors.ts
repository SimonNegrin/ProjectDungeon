/**
 * Colocación validada de puertas del núcleo de chambers (REQ-011 R-009/T-014).
 *
 * Funciones puras y deterministas: sin DOM, sin relojes y sin `Math.random`.
 * Solo devuelve puertas que cumplen soporte de dos muros, suelo a ambos lados,
 * dos salas distintas, separación Chebyshev ≥3 y máximo una por pasillo. Todo
 * acceso descartado queda como boca abierta con un motivo legible.
 */

import type { Door, DoorOrientation } from '../../map';
import type { Tile } from '../../types';
import { chebyshev, inBounds, neighbors4, pointKey, type Point } from './grid';
import { doorStyleFor } from './palettes';

export const DOOR_MIN_SEPARATION = 3;

export type OpenMouthReason =
  | 'sin-soporte'
  | 'sin-suelo'
  | 'misma-sala'
  | 'separacion'
  | 'una-por-pasillo'
  | 'pasillo-ancho';

export interface DoorRoomShape {
  readonly id: number;
  readonly cells: readonly Point[];
}

export interface DoorCorridorShape {
  readonly id: number;
  readonly cells: readonly Point[];
  readonly width: 1 | 2;
  readonly length: number;
  readonly roomA: number;
  readonly roomB: number;
}

export interface DoorCandidate {
  readonly x: number;
  readonly y: number;
  readonly orientation: DoorOrientation;
  readonly roomA: number;
  readonly roomB: number;
}

export interface DoorPlacementInput {
  readonly rooms: readonly DoorRoomShape[];
  readonly corridors: readonly DoorCorridorShape[];
  readonly tiles: readonly Tile[];
  readonly width: number;
  readonly height: number;
  readonly seed: number;
}

export interface OpenMouth {
  readonly id: number;
  readonly x: number;
  readonly y: number;
  readonly orientation: DoorOrientation;
  readonly roomA: number;
  readonly roomB: number;
  readonly corridorId: number;
  readonly reason: OpenMouthReason;
}

export interface DoorPlacement {
  readonly doors: readonly Door[];
  readonly openMouths: readonly OpenMouth[];
  readonly warnings: readonly string[];
}

function isFloor(
  tiles: readonly Tile[],
  width: number,
  height: number,
  x: number,
  y: number,
): boolean {
  return inBounds(x, y, width, height) && tiles[y * width + x] === 'floor';
}

function isWall(
  tiles: readonly Tile[],
  width: number,
  height: number,
  x: number,
  y: number,
): boolean {
  return inBounds(x, y, width, height) && tiles[y * width + x] === 'wall';
}

/**
 * Valida una puerta contra la geometría final. Devuelve `null` si es válida o
 * el motivo por el que no puede dibujarse.
 */
export function validateDoorCandidate(
  candidate: DoorCandidate,
  tiles: readonly Tile[],
  width: number,
  height: number,
): OpenMouthReason | null {
  if (candidate.roomA === candidate.roomB) return 'misma-sala';
  if (!isFloor(tiles, width, height, candidate.x, candidate.y)) return 'sin-suelo';

  const perpendicular =
    candidate.orientation === 'vertical'
      ? [
          { x: candidate.x, y: candidate.y - 1 },
          { x: candidate.x, y: candidate.y + 1 },
        ]
      : [
          { x: candidate.x - 1, y: candidate.y },
          { x: candidate.x + 1, y: candidate.y },
        ];
  const axis =
    candidate.orientation === 'vertical'
      ? [
          { x: candidate.x - 1, y: candidate.y },
          { x: candidate.x + 1, y: candidate.y },
        ]
      : [
          { x: candidate.x, y: candidate.y - 1 },
          { x: candidate.x, y: candidate.y + 1 },
        ];

  // Dos muros en la línea del muro: soporte perpendicular al eje de paso.
  if (!perpendicular.every((point) => isWall(tiles, width, height, point.x, point.y))) {
    return 'sin-soporte';
  }
  // Suelo transitable a ambos lados del eje de paso.
  if (!axis.every((point) => isFloor(tiles, width, height, point.x, point.y))) {
    return 'sin-suelo';
  }
  return null;
}

function roomCenter(room: DoorRoomShape): Point {
  if (room.cells.length === 0) return { x: 0, y: 0 };
  const sum = room.cells.reduce(
    (accumulator, cell) => ({ x: accumulator.x + cell.x, y: accumulator.y + cell.y }),
    { x: 0, y: 0 },
  );
  return { x: sum.x / room.cells.length, y: sum.y / room.cells.length };
}

function distanceToCenterSquared(anchor: Point, center: Point): number {
  return (anchor.x - center.x) ** 2 + (anchor.y - center.y) ** 2;
}

function mouthNear(corridor: DoorCorridorShape, room: DoorRoomShape): Point | null {
  const roomMask = new Set(room.cells.map((cell) => pointKey(cell.x, cell.y)));
  const candidates = corridor.cells.filter((cell) =>
    neighbors4(cell.x, cell.y).some((next) => roomMask.has(pointKey(next.x, next.y))),
  );
  if (candidates.length === 0) return null;
  const center = roomCenter(room);
  return [...candidates].sort(
    (a, b) =>
      distanceToCenterSquared(a, center) - distanceToCenterSquared(b, center) ||
      a.y - b.y ||
      a.x - b.x,
  )[0];
}

function orientationFor(cell: Point, rooms: readonly DoorRoomShape[]): DoorOrientation {
  let horizontalPassage = false;
  let verticalPassage = false;
  for (const room of rooms) {
    for (const roomCell of room.cells) {
      if (roomCell.x === cell.x && Math.abs(roomCell.y - cell.y) === 1) {
        verticalPassage = true;
      }
      if (roomCell.y === cell.y && Math.abs(roomCell.x - cell.x) === 1) {
        horizontalPassage = true;
      }
    }
  }
  // Pasillo horizontal ⇒ puerta en un muro vertical; y viceversa.
  if (horizontalPassage && !verticalPassage) return 'vertical';
  if (verticalPassage && !horizontalPassage) return 'horizontal';
  return horizontalPassage ? 'vertical' : 'horizontal';
}

interface Endpoint {
  readonly cell: Point;
  readonly orientation: DoorOrientation;
  readonly roomId: number;
}

function endpointsFor(
  corridor: DoorCorridorShape,
  roomA: DoorRoomShape,
  roomB: DoorRoomShape,
): Endpoint[] {
  const mouthA = mouthNear(corridor, roomA);
  const mouthB = mouthNear(corridor, roomB);
  const cells: Array<{ cell: Point; roomId: number }> = [];
  if (mouthA) cells.push({ cell: mouthA, roomId: roomA.id });
  if (
    mouthB &&
    !cells.some((entry) => entry.cell.x === mouthB.x && entry.cell.y === mouthB.y)
  ) {
    cells.push({ cell: mouthB, roomId: roomB.id });
  }
  return cells.map((entry) => ({
    cell: entry.cell,
    orientation: orientationFor(entry.cell, [roomA, roomB]),
    roomId: entry.roomId,
  }));
}

function findRoom(rooms: readonly DoorRoomShape[], id: number): DoorRoomShape | null {
  return rooms.find((room) => room.id === id) ?? null;
}

function summarizeReasons(mouths: readonly OpenMouth[]): string {
  const counts = new Map<OpenMouthReason, number>();
  for (const mouth of mouths) {
    counts.set(mouth.reason, (counts.get(mouth.reason) ?? 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([reason, count]) => `${reason}: ${count}`)
    .join(' · ');
}

/**
 * Coloca como máximo una puerta por pasillo y respeta la separación global.
 * El resto de extremos quedan como bocas abiertas con motivo.
 */
export function placeDoors(input: DoorPlacementInput): DoorPlacement {
  const warnings: string[] = [];
  const doors: Door[] = [];
  const openMouths: OpenMouth[] = [];
  const placedCells: Point[] = [];
  let nextDoorId = 0;
  let nextMouthId = 0;

  const doorCorridors = input.corridors
    .filter((corridor) => corridor.width === 1)
    .sort((a, b) => a.id - b.id);
  const wideCorridors = input.corridors
    .filter((corridor) => corridor.width === 2)
    .sort((a, b) => a.id - b.id);

  for (const corridor of doorCorridors) {
    const roomA = findRoom(input.rooms, corridor.roomA);
    const roomB = findRoom(input.rooms, corridor.roomB);
    if (!roomA || !roomB) {
      warnings.push(`El pasillo ${corridor.id} referencia una sala inexistente.`);
      continue;
    }

    const evaluations = endpointsFor(corridor, roomA, roomB).map((endpoint) => ({
      endpoint,
      reason: validateDoorCandidate(
        {
          x: endpoint.cell.x,
          y: endpoint.cell.y,
          orientation: endpoint.orientation,
          roomA: corridor.roomA,
          roomB: corridor.roomB,
        },
        input.tiles,
        input.width,
        input.height,
      ),
    }));
    const valid = evaluations.filter((evaluation) => evaluation.reason === null);

    let chosen: (typeof evaluations)[number] | null = null;
    for (const evaluation of valid) {
      if (
        placedCells.every(
          (cell) => chebyshev(cell, evaluation.endpoint.cell) >= DOOR_MIN_SEPARATION,
        )
      ) {
        chosen = evaluation;
        break;
      }
    }

    if (chosen) {
      const cell = chosen.endpoint.cell;
      const roomId = chosen.endpoint.roomId;
      const otherRoom = roomId === corridor.roomA ? corridor.roomB : corridor.roomA;
      doors.push({
        id: nextDoorId,
        x: cell.x,
        y: cell.y,
        orientation: chosen.endpoint.orientation,
        roomId,
        style: doorStyleFor(input.seed, corridor.roomA, corridor.roomB, cell.x, cell.y),
        roomA: roomId,
        roomB: otherRoom,
        corridorId: corridor.id,
        direct: corridor.length === 0,
      });
      nextDoorId += 1;
      placedCells.push(cell);
    }

    for (const evaluation of evaluations) {
      if (chosen && evaluation === chosen) continue;
      const reason: OpenMouthReason =
        evaluation.reason ?? (chosen ? 'una-por-pasillo' : 'separacion');
      openMouths.push({
        id: nextMouthId,
        x: evaluation.endpoint.cell.x,
        y: evaluation.endpoint.cell.y,
        orientation: evaluation.endpoint.orientation,
        roomA: corridor.roomA,
        roomB: corridor.roomB,
        corridorId: corridor.id,
        reason,
      });
      nextMouthId += 1;
    }
  }

  for (const corridor of wideCorridors) {
    const roomA = findRoom(input.rooms, corridor.roomA);
    const roomB = findRoom(input.rooms, corridor.roomB);
    if (!roomA || !roomB) continue;
    const endpoints = endpointsFor(corridor, roomA, roomB);
    if (endpoints.length === 0 && corridor.cells.length > 0) {
      endpoints.push({
        cell: corridor.cells[0],
        orientation: orientationFor(corridor.cells[0], [roomA, roomB]),
        roomId: corridor.roomA,
      });
    }
    for (const endpoint of endpoints) {
      openMouths.push({
        id: nextMouthId,
        x: endpoint.cell.x,
        y: endpoint.cell.y,
        orientation: endpoint.orientation,
        roomA: corridor.roomA,
        roomB: corridor.roomB,
        corridorId: corridor.id,
        reason: 'pasillo-ancho',
      });
      nextMouthId += 1;
    }
  }

  if (doors.length === 0) {
    warnings.push(
      'Ningún acceso cumplió las reglas de puerta; todos quedaron como bocas abiertas.',
    );
  }
  const doorCells = new Set(doors.map((door) => pointKey(door.x, door.y)));
  const finalMouths = openMouths.filter(
    (mouth) => !doorCells.has(pointKey(mouth.x, mouth.y)),
  );
  if (finalMouths.length > 0) {
    warnings.push(
      `Se abrieron ${finalMouths.length} bocas sin puerta (${summarizeReasons(finalMouths)}).`,
    );
  }

  return { doors, openMouths: finalMouths, warnings };
}
