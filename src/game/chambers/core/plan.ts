/**
 * Punto de entrada puro del núcleo de chambers (REQ-011 R-002-R-010).
 *
 * `generateChamberPlan` devuelve solo geometría: semilla, rejilla, salas con
 * máscara, pasillos, puertas, bocas abiertas, bucles, paletas y avisos. No
 * incluye spawn, enemigos, entrada ni salida; eso corresponde a TASK-0045.
 */

import {
  classifyRoom,
  isFloorTile,
  type Corridor,
  type Door,
  type Room,
} from '../../map';
import type { Tile } from '../../types';
import type { Point } from './grid';
import {
  findLinks,
  findWideDetour,
  selectLinks,
  widenLink,
  withWideFallback,
  type ChamberLink,
  type LinkSelection,
} from './corridors';
import {
  placeDoors,
  type DoorCorridorShape,
  type DoorPlacement,
  type OpenMouth,
} from './doors';
import type { Box } from './grid';
import {
  buildCavernLayout,
  buildNormalLayout,
  type RawRoom,
  type RoomLayout,
} from './shapes';
import { resolveChamberOptions, type ChamberOptions, type ResolvedChamberOptions } from './options';
import { assignRoomPalettes, type RoomPalette } from './palettes';
import { createRng, GROWTH_SALT, hashSeed, normalizeSeed } from './rng';

export type { OpenMouth, OpenMouthReason } from './doors';
export type { RoomPalette } from './palettes';

export interface ChamberPlan {
  readonly seed: number;
  readonly width: number;
  readonly height: number;
  /** `Tile[]` de `src/game/types.ts` (`'floor' | 'wall'`). */
  readonly tiles: readonly Tile[];
  readonly rooms: readonly Room[];
  readonly corridors: readonly Corridor[];
  readonly doors: readonly Door[];
  readonly openMouths: readonly OpenMouth[];
  /** Conexiones extra sobre el árbol de salas (0-3). */
  readonly loops: number;
  readonly palettes: readonly RoomPalette[];
  readonly warnings: readonly string[];
  readonly options: ResolvedChamberOptions;
  /** Sala caverna, o `null` en mapas normales. */
  readonly cavernRoomId: number | null;
}

function roomMask(rooms: readonly RawRoom[]): Set<string> {
  const mask = new Set<string>();
  for (const room of rooms) {
    for (const cell of room.cells) mask.add(`${cell.x},${cell.y}`);
  }
  return mask;
}

function carveTiles(
  tiles: Tile[],
  width: number,
  height: number,
  cells: readonly Point[],
): void {
  for (const cell of cells) {
    if (cell.x <= 0 || cell.y <= 0) continue;
    if (cell.x >= width - 1 || cell.y >= height - 1) continue;
    tiles[cell.y * width + cell.x] = 'floor';
  }
}

function ensureGraphConnected(
  rooms: readonly RawRoom[],
  candidates: readonly ChamberLink[],
  selection: LinkSelection,
  warnings: string[],
): LinkSelection {
  if (rooms.length <= 1) return selection;
  const parent = Array.from({ length: rooms.length }, (_, index) => index);
  const find = (value: number): number => {
    let current = value;
    while (parent[current] !== current) {
      parent[current] = parent[parent[current]];
      current = parent[current];
    }
    return current;
  };
  const union = (a: number, b: number): boolean => {
    const rootA = find(a);
    const rootB = find(b);
    if (rootA === rootB) return false;
    parent[rootB] = rootA;
    return true;
  };

  const tree = [...selection.tree];
  const extras = [...selection.extras];
  for (const link of tree) union(link.roomA, link.roomB);
  for (const link of extras) union(link.roomA, link.roomB);

  for (const link of candidates) {
    if (find(link.roomA) === find(link.roomB)) continue;
    union(link.roomA, link.roomB);
    tree.push(link);
  }

  let roots = new Set<number>();
  for (let index = 0; index < rooms.length; index += 1) roots.add(find(index));
  if (roots.size > 1) {
    warnings.push('No se pudo conectar el grafo de salas con pasillos de 0-3 tiles.');
    roots = new Set();
  }

  return { tree, extras, wide: selection.wide };
}

function linkWideKey(link: ChamberLink): string {
  return `${link.roomA}:${link.roomB}:${link.cells.map((cell) => `${cell.x},${cell.y}`).join('|')}`;
}

/**
 * Genera el plan geométrico determinista de una mazmorra densa. Misma semilla y
 * opciones ⇒ misma estructura profunda, sin relojes ni estado global.
 */
export function generateChamberPlan(
  seedInput: number,
  input: ChamberOptions = {},
): ChamberPlan {
  const seed = normalizeSeed(seedInput);
  const resolved = resolveChamberOptions(input);
  const options = resolved.options;
  const warnings: string[] = [...resolved.warnings];

  const rng = createRng(hashSeed(seed, GROWTH_SALT));
  const wantsCavern = rng.chance(options.cavernChance / 100);
  const wideRoll = rng.chance(options.wideCorridorChance / 100);

  let layout: RoomLayout | null = null;
  if (wantsCavern) {
    layout = buildCavernLayout(rng, options, warnings);
  }
  const wantsWide = wideRoll && !(layout?.cavern ?? false);
  if (!layout) {
    layout = buildNormalLayout(rng, options, warnings, wantsWide);
  }

  const rawRooms = [...layout.rooms].sort(
    (a, b) => a.box.y - b.box.y || a.box.x - b.box.x || a.box.width - b.box.width,
  );
  if (rawRooms.length < 3) {
    warnings.push(`La generación produjo ${rawRooms.length} salas; se esperaban al menos 3.`);
  }
  const cavernRoomId = layout.cavern ? rawRooms.indexOf(layout.cavern) : null;

  const mask = roomMask(rawRooms);
  const candidates = findLinks(rawRooms, options);
  if (wantsWide && rawRooms.length > 3 && !candidates.some((link) => link.length >= 3)) {
    const detour = findWideDetour(rawRooms, mask, options);
    if (detour) candidates.push(detour);
  }

  let selection = selectLinks(candidates, rawRooms.length, rng, wantsWide, warnings);
  selection = ensureGraphConnected(rawRooms, candidates, selection, warnings);

  if (wantsWide && !selection.wide && rawRooms.length > 3) {
    const detour = findWideDetour(rawRooms, mask, options);
    if (detour) selection = withWideFallback(selection, detour);
  }

  const allLinks: ChamberLink[] = [...selection.tree, ...selection.extras];
  const wideKey = selection.wide ? linkWideKey(selection.wide) : null;
  const tiles = new Array<Tile>(options.mapWidth * options.mapHeight).fill('wall');
  for (const room of rawRooms) {
    carveTiles(tiles, options.mapWidth, options.mapHeight, room.cells);
  }

  const corridors: Corridor[] = [];
  for (let index = 0; index < allLinks.length; index += 1) {
    const link = allLinks[index];
    const isWide = wideKey !== null && linkWideKey(link) === wideKey;
    if (isWide) {
      const widened = widenLink(link, options, mask);
      carveTiles(tiles, options.mapWidth, options.mapHeight, widened);
    } else {
      carveTiles(tiles, options.mapWidth, options.mapHeight, link.cells);
    }
    corridors.push({
      id: index,
      fromRoomId: link.roomA,
      toRoomId: link.roomB,
      roomA: link.roomA,
      roomB: link.roomB,
      kind: selection.tree.includes(link) ? 'tree' : 'loop',
      width: isWide ? 2 : 1,
      doorEligible: !isWide,
      path: link.cells,
      cells: link.cells,
      length: link.length,
    });
  }

  const doorCorridors: DoorCorridorShape[] = corridors.map((corridor) => ({
    id: corridor.id ?? 0,
    cells: corridor.cells ?? corridor.path,
    width: corridor.width,
    length: corridor.length ?? corridor.path.length - 1,
    roomA: corridor.roomA ?? corridor.fromRoomId,
    roomB: corridor.roomB ?? corridor.toRoomId,
  }));
  const placement: DoorPlacement = placeDoors({
    rooms: rawRooms.map((room, index) => ({ id: index, cells: room.cells })),
    corridors: doorCorridors,
    tiles,
    width: options.mapWidth,
    height: options.mapHeight,
    seed,
  });
  warnings.push(...placement.warnings);

  const rooms: Room[] = rawRooms.map((room, index) => ({
    id: index,
    x: room.box.x,
    y: room.box.y,
    width: room.box.width,
    height: room.box.height,
    role: classifyRoom({ width: room.box.width, height: room.box.height }),
    cells: room.cells,
    area: room.cells.length,
  }));

  const palettes = assignRoomPalettes(seed, rooms);
  const loops = corridors.filter((corridor) => corridor.kind === 'loop').length;

  return {
    seed,
    width: options.mapWidth,
    height: options.mapHeight,
    tiles,
    rooms,
    corridors,
    doors: placement.doors,
    openMouths: placement.openMouths,
    loops,
    palettes,
    warnings: [...new Set(warnings)],
    options,
    cavernRoomId,
  };
}

/** Utilidad pura para consumidores que validan la rejilla antes de usarla. */
export function planFloorCount(plan: Pick<ChamberPlan, 'width' | 'height' | 'tiles'>): number {
  let count = 0;
  for (let y = 0; y < plan.height; y += 1) {
    for (let x = 0; x < plan.width; x += 1) {
      if (isFloorTile(plan, x, y)) count += 1;
    }
  }
  return count;
}

/** Caja de una sala para tests y consumidores de solo lectura. */
export function roomBox(room: Pick<Room, 'x' | 'y' | 'width' | 'height'>): Box {
  return { x: room.x, y: room.y, width: room.width, height: room.height };
}
