/**
 * Render Canvas 2D de EXP-004 con el tileset real de 32rogues.
 *
 * Dibuja el mapa completo y, para la variante seleccionada, una vista de juego
 * 13×13 centrada en el spawn. Las puertas son decorativas y se dibujan debajo
 * de las unidades; la capa de debug es conmutable.
 */

import { TILE_RECTS } from '../../../src/host/assets';
import { FLOOR_PALETTES } from '../../../src/host/floor';
import { fingerprint } from './generate';
import { wallTileKind } from './grid';
import type {
  Door,
  Enemy,
  Exit,
  FloorPaletteId,
  GeneratedMap,
  Hotspot,
  Point,
  Room,
  VariantId,
} from './types';

export interface ExperimentAssets {
  readonly tiles: HTMLImageElement | null;
  readonly monsters: HTMLImageElement | null;
}

interface SpriteRect {
  readonly sx: number;
  readonly sy: number;
  readonly sw: number;
  readonly sh: number;
}

export interface RenderParams {
  readonly [key: string]: unknown;
}

export interface ExperimentRenderContext {
  readonly ctx: CanvasRenderingContext2D;
  readonly width: number;
  readonly height: number;
  readonly params: RenderParams;
  readonly seed: number;
  readonly dpr: number;
}

const VIEW_SIZE = 13;
const ROOM_TINTS: readonly string[] = [
  'rgba(127, 179, 213, 0.13)',
  'rgba(232, 184, 109, 0.13)',
  'rgba(159, 211, 168, 0.13)',
  'rgba(224, 122, 122, 0.13)',
  'rgba(186, 154, 224, 0.13)',
];

const DOOR_COLORS: Readonly<Record<Door['style'], { frame: string; leaf: string }>> = {
  wood: { frame: '#6b4423', leaf: '#c88a4a' },
  metal: { frame: '#4e5d6b', leaf: '#a9bece' },
  grated: { frame: '#3d4a55', leaf: '#7c8c99' },
};

const ENEMY_COLORS: Readonly<Record<Enemy['type'], string>> = {
  sentinel: '#7fb3d5',
  brute: '#e07a7a',
  coward: '#e8b86d',
};

/**
 * Recorte local de las escaleras de 32rogues (`tiles.txt` 17.h y 17.i).
 * No se añade a `src/host/assets.ts` porque producción no cambia en este corte.
 */
const STAIR_RECTS = {
  'stairs-down': { sx: 224, sy: 512, sw: 32, sh: 32 },
  'stairs-up': { sx: 256, sy: 512, sw: 32, sh: 32 },
} as const;

const EXIT_GOLD = '#f2c14e';

const VARIANT_LABEL: Readonly<Record<VariantId, string>> = {
  growth: 'A · crecimiento',
  bsp: 'B · BSP',
  templates: 'C · plantillas',
};

function flag(params: RenderParams, key: string, fallback: boolean): boolean {
  const value = params[key];
  return value === undefined ? fallback : Boolean(value);
}

function parityColor(palette: FloorPaletteId, x: number, y: number): string {
  const colors = FLOOR_PALETTES[palette];
  return (x + y) % 2 === 0 ? colors.base : colors.second;
}

function drawTile(
  ctx: CanvasRenderingContext2D,
  image: HTMLImageElement | null,
  rect: SpriteRect,
  dx: number,
  dy: number,
  size: number,
  fallback: string,
): void {
  if (!image) {
    ctx.fillStyle = fallback;
    ctx.fillRect(dx, dy, size, size);
    return;
  }
  ctx.drawImage(image, rect.sx, rect.sy, rect.sw, rect.sh, dx, dy, size, size);
}

function roomMap(map: GeneratedMap): Map<string, Room> {
  const cells = new Map<string, Room>();
  for (const room of map.rooms) {
    for (const cell of room.cells) cells.set(`${cell.x},${cell.y}`, room);
  }
  return cells;
}

function doorMap(map: GeneratedMap): Map<string, Door> {
  return new Map(map.doors.map((door) => [`${door.x},${door.y}`, door]));
}

function drawFloorAndWalls(
  ctx: CanvasRenderingContext2D,
  map: GeneratedMap,
  assets: ExperimentAssets,
  tile: number,
  offsetX: number,
  offsetY: number,
  view: { x: number; y: number; width: number; height: number },
): void {
  const rooms = roomMap(map);
  const doors = doorMap(map);

  for (let y = view.y; y < view.y + view.height; y += 1) {
    for (let x = view.x; x < view.x + view.width; x += 1) {
      if (x < 0 || y < 0 || x >= map.width || y >= map.height) continue;
      const dx = offsetX + (x - view.x) * tile;
      const dy = offsetY + (y - view.y) * tile;
      const tileIndex = y * map.width + x;
      if (map.tiles[tileIndex] === 1) {
        const door = doors.get(`${x},${y}`);
        const room = door ? undefined : rooms.get(`${x},${y}`);
        ctx.fillStyle = parityColor(room?.palette ?? 'neutral', x, y);
        ctx.fillRect(dx, dy, tile, tile);
      } else {
        const kind = wallTileKind(map.tiles, map.width, map.height, x, y);
        drawTile(
          ctx,
          assets.tiles,
          kind === 'wallSide1' ? TILE_RECTS.wallSide1 : TILE_RECTS.wallTop,
          dx,
          dy,
          tile,
          kind === 'wallSide1' ? '#101820' : '#0a0f14',
        );
      }
    }
  }
}

export interface ViewRect {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

/** Posición de una puerta relativa al viewport, o `null` si queda fuera. */
export function doorViewPosition(
  door: Pick<Door, 'x' | 'y'>,
  view: ViewRect,
  tile: number,
): { x: number; y: number } | null {
  if (
    door.x < view.x ||
    door.y < view.y ||
    door.x >= view.x + view.width ||
    door.y >= view.y + view.height
  ) {
    return null;
  }
  return {
    x: (door.x - view.x) * tile,
    y: (door.y - view.y) * tile,
  };
}

function drawDoor(
  ctx: CanvasRenderingContext2D,
  door: Door,
  tile: number,
  offsetX: number,
  offsetY: number,
  view: ViewRect,
  showStyle: boolean,
): void {
  const position = doorViewPosition(door, view, tile);
  if (!position) return;
  const colors = DOOR_COLORS[door.style];
  const x = offsetX + position.x;
  const y = offsetY + position.y;
  const pad = Math.max(1, tile * 0.14);
  const frame = Math.max(1.5, tile * 0.16);

  ctx.save();
  if (door.orientation === 'vertical') {
    ctx.fillStyle = colors.frame;
    ctx.fillRect(x + tile * 0.34, y + pad, frame, tile - pad * 2);
    ctx.fillRect(x + tile * 0.66 - frame, y + pad, frame, tile - pad * 2);
    ctx.fillStyle = colors.leaf;
    ctx.fillRect(x + tile * 0.4, y + pad * 1.5, tile * 0.2, tile - pad * 3);
    if (door.style === 'grated') {
      ctx.fillStyle = colors.frame;
      for (let step = 1; step <= 3; step += 1) {
        ctx.fillRect(x + tile * 0.38, y + (tile * step) / 4, tile * 0.24, Math.max(1, tile * 0.05));
      }
    }
  } else {
    ctx.fillStyle = colors.frame;
    ctx.fillRect(x + pad, y + tile * 0.34, tile - pad * 2, frame);
    ctx.fillRect(x + pad, y + tile * 0.66 - frame, tile - pad * 2, frame);
    ctx.fillStyle = colors.leaf;
    ctx.fillRect(x + pad * 1.5, y + tile * 0.4, tile - pad * 3, tile * 0.2);
    if (door.style === 'grated') {
      ctx.fillStyle = colors.frame;
      for (let step = 1; step <= 3; step += 1) {
        ctx.fillRect(x + (tile * step) / 4, y + tile * 0.38, Math.max(1, tile * 0.05), tile * 0.24);
      }
    }
  }

  if (showStyle) {
    ctx.fillStyle = 'rgba(8, 11, 16, 0.78)';
    ctx.fillRect(x + pad, y + tile * 0.02, tile - pad * 2, tile * 0.22);
    ctx.fillStyle = '#f8fafc';
    ctx.font = `700 ${Math.max(6, Math.round(tile * 0.2))}px ui-monospace, monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(door.style.slice(0, 1).toUpperCase(), x + tile / 2, y + tile * 0.13);
  }
  ctx.restore();
}

function drawOpenMouths(
  ctx: CanvasRenderingContext2D,
  map: GeneratedMap,
  tile: number,
  offsetX: number,
  offsetY: number,
  view: { x: number; y: number; width: number; height: number },
  debug: boolean,
): void {
  for (const mouth of map.openMouths) {
    if (
      mouth.x < view.x ||
      mouth.y < view.y ||
      mouth.x >= view.x + view.width ||
      mouth.y >= view.y + view.height
    ) {
      continue;
    }
    const x = offsetX + (mouth.x - view.x) * tile;
    const y = offsetY + (mouth.y - view.y) * tile;
    const wide = mouth.reason === 'pasillo-ancho';
    ctx.save();
    ctx.strokeStyle = wide ? 'rgba(232, 184, 109, 0.95)' : 'rgba(224, 122, 122, 0.95)';
    ctx.lineWidth = Math.max(1, tile * 0.1);
    ctx.setLineDash([Math.max(2, tile * 0.2), Math.max(1, tile * 0.14)]);
    ctx.strokeRect(x + 1.5, y + 1.5, tile - 3, tile - 3);
    ctx.setLineDash([]);
    if (debug) {
      ctx.fillStyle = 'rgba(8, 11, 16, 0.78)';
      ctx.fillRect(x, y - Math.max(7, tile * 0.28), tile + 4, Math.max(7, tile * 0.26));
      ctx.fillStyle = '#fecaca';
      ctx.font = `700 ${Math.max(5, Math.round(tile * 0.18))}px ui-monospace, monospace`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(mouth.reason, x + tile / 2, y - Math.max(3, tile * 0.14));
    }
    ctx.restore();
  }
}

function drawSpawnRoom(
  ctx: CanvasRenderingContext2D,
  room: Room,
  tile: number,
  offsetX: number,
  offsetY: number,
  view: { x: number; y: number; width: number; height: number },
): void {
  ctx.save();
  ctx.fillStyle = 'rgba(127, 179, 213, 0.18)';
  for (const cell of room.cells) {
    if (
      cell.x < view.x ||
      cell.y < view.y ||
      cell.x >= view.x + view.width ||
      cell.y >= view.y + view.height
    ) {
      continue;
    }
    ctx.fillRect(
      offsetX + (cell.x - view.x) * tile,
      offsetY + (cell.y - view.y) * tile,
      tile,
      tile,
    );
  }
  ctx.strokeStyle = 'rgba(127, 179, 213, 0.75)';
  ctx.lineWidth = Math.max(1, tile * 0.08);
  ctx.strokeRect(
    offsetX + (room.x - view.x) * tile + 0.5,
    offsetY + (room.y - view.y) * tile + 0.5,
    room.width * tile - 1,
    room.height * tile - 1,
  );
  ctx.restore();
}

function drawSpawnHoles(
  ctx: CanvasRenderingContext2D,
  map: GeneratedMap,
  tile: number,
  offsetX: number,
  offsetY: number,
  view: { x: number; y: number; width: number; height: number },
  debug: boolean,
): void {
  const party = map.spawns.party;
  party.forEach((hole, index) => {
    if (
      hole.x < view.x ||
      hole.y < view.y ||
      hole.x >= view.x + view.width ||
      hole.y >= view.y + view.height
    ) {
      return;
    }
    const centerX = offsetX + (hole.x - view.x + 0.5) * tile;
    const centerY = offsetY + (hole.y - view.y + 0.5) * tile;
    const radius = Math.max(2, tile * (index === 0 ? 0.38 : 0.28));
    ctx.save();
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
    ctx.fillStyle = index === 0 ? 'rgba(127, 179, 213, 0.95)' : 'rgba(232, 184, 109, 0.9)';
    ctx.fill();
    ctx.lineWidth = Math.max(1, tile * 0.07);
    ctx.strokeStyle = '#f8fafc';
    ctx.stroke();
    ctx.fillStyle = '#0d1117';
    ctx.font = `700 ${Math.max(6, Math.round(tile * 0.48))}px ui-sans-serif, system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(index === 0 ? 'J' : String(index + 1), centerX, centerY + 0.5);
    if (debug) {
      ctx.fillStyle = '#dbeafe';
      ctx.font = `600 ${Math.max(6, Math.round(tile * 0.24))}px ui-monospace, monospace`;
      ctx.fillText(`${hole.x},${hole.y}`, centerX, centerY - tile * 0.42);
    }
    ctx.restore();
  });
}

function inView(
  point: Point,
  view: { x: number; y: number; width: number; height: number },
): boolean {
  return (
    point.x >= view.x &&
    point.y >= view.y &&
    point.x < view.x + view.width &&
    point.y < view.y + view.height
  );
}

function drawEntrance(
  ctx: CanvasRenderingContext2D,
  map: GeneratedMap,
  tile: number,
  offsetX: number,
  offsetY: number,
  view: { x: number; y: number; width: number; height: number },
  debug: boolean,
): void {
  const point = map.entrance.position;
  if (!inView(point, view)) return;
  const centerX = offsetX + (point.x - view.x + 0.5) * tile;
  const centerY = offsetY + (point.y - view.y + 0.5) * tile;
  ctx.save();
  ctx.beginPath();
  ctx.arc(centerX, centerY, Math.max(4, tile * 0.44), 0, Math.PI * 2);
  ctx.lineWidth = Math.max(1, tile * 0.09);
  ctx.strokeStyle = '#7dd3fc';
  ctx.stroke();
  ctx.fillStyle = '#0c4a6e';
  ctx.beginPath();
  ctx.arc(centerX - tile * 0.34, centerY - tile * 0.34, Math.max(3, tile * 0.2), 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#e0f2fe';
  ctx.lineWidth = Math.max(1, tile * 0.05);
  ctx.stroke();
  ctx.fillStyle = '#e0f2fe';
  ctx.font = `800 ${Math.max(5, Math.round(tile * 0.26))}px ui-sans-serif, system-ui, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('E', centerX - tile * 0.34, centerY - tile * 0.34 + 0.5);
  if (debug) {
    ctx.fillStyle = '#dbeafe';
    ctx.font = `600 ${Math.max(6, Math.round(tile * 0.22))}px ui-monospace, monospace`;
    ctx.fillText('entrada', centerX, centerY - tile * 0.55);
  }
  ctx.restore();
}

function drawStairs(
  ctx: CanvasRenderingContext2D,
  exit: Exit,
  tile: number,
  offsetX: number,
  offsetY: number,
  view: { x: number; y: number; width: number; height: number },
  assets: ExperimentAssets,
): void {
  const x = offsetX + (exit.position.x - view.x) * tile;
  const y = offsetY + (exit.position.y - view.y) * tile;
  const rect = STAIR_RECTS[exit.kind === 'stairs-up' ? 'stairs-up' : 'stairs-down'];
  ctx.save();
  if (assets.tiles) {
    ctx.drawImage(assets.tiles, rect.sx, rect.sy, rect.sw, rect.sh, x, y, tile, tile);
  } else {
    ctx.fillStyle = 'rgba(8, 11, 16, 0.72)';
    ctx.fillRect(x + 1, y + 1, tile - 2, tile - 2);
  }
  // Refuerzo programático: el recorte de escalera del tileset es muy oscuro a
  // 32 px; unas huellas doradas hacen legible el sentido de la escalera.
  const steps = 4;
  for (let step = 0; step < steps; step += 1) {
    const width = tile * (0.68 - step * 0.13);
    const height = Math.max(1.5, tile * 0.065);
    const stepX = x + (tile - width) / 2;
    const stepY =
      exit.kind === 'stairs-down'
        ? y + tile * (0.2 + step * 0.16)
        : y + tile * (0.7 - step * 0.16);
    ctx.fillStyle = step % 2 === 0 ? 'rgba(254, 243, 199, 0.92)' : 'rgba(242, 193, 78, 0.92)';
    ctx.fillRect(stepX, stepY, width, height);
  }
  ctx.strokeStyle = EXIT_GOLD;
  ctx.lineWidth = Math.max(1, tile * 0.08);
  ctx.strokeRect(x + 1, y + 1, tile - 2, tile - 2);
  ctx.fillStyle = EXIT_GOLD;
  ctx.font = `800 ${Math.max(6, Math.round(tile * 0.3))}px ui-sans-serif, system-ui, sans-serif`;
  ctx.textAlign = 'right';
  ctx.textBaseline = 'top';
  ctx.fillText(exit.kind === 'stairs-down' ? '▼' : '▲', x + tile - 2, y + 1);
  ctx.restore();
}

function drawExit(
  ctx: CanvasRenderingContext2D,
  map: GeneratedMap,
  tile: number,
  offsetX: number,
  offsetY: number,
  view: { x: number; y: number; width: number; height: number },
  assets: ExperimentAssets,
  debug: boolean,
): void {
  const exit = map.exit;
  if (!exit) return;

  if (debug) {
    for (const roomId of exit.path) {
      const room = map.rooms.find((item) => item.id === roomId);
      if (!room) continue;
      ctx.save();
      ctx.strokeStyle = 'rgba(242, 193, 78, 0.85)';
      ctx.lineWidth = Math.max(1, tile * 0.09);
      ctx.setLineDash([Math.max(2, tile * 0.28), Math.max(1, tile * 0.2)]);
      ctx.strokeRect(
        offsetX + (room.x - view.x) * tile + 2,
        offsetY + (room.y - view.y) * tile + 2,
        room.width * tile - 4,
        room.height * tile - 4,
      );
      ctx.restore();
    }
  }

  if (!inView(exit.position, view)) return;

  if (exit.kind === 'door') {
    const x = offsetX + (exit.position.x - view.x) * tile;
    const y = offsetY + (exit.position.y - view.y) * tile;
    const pad = Math.max(1, tile * 0.1);
    ctx.save();
    ctx.fillStyle = EXIT_GOLD;
    ctx.fillRect(x + pad, y + pad, tile - pad * 2, tile - pad * 2);
    ctx.fillStyle = '#3b2a12';
    ctx.fillRect(x + pad * 2, y + pad * 2, tile - pad * 4, tile - pad * 4);
    ctx.fillStyle = '#fbbf24';
    ctx.beginPath();
    ctx.arc(x + tile * 0.5, y + tile * 0.5, Math.max(1, tile * 0.09), 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#fef3c7';
    ctx.lineWidth = Math.max(1, tile * 0.06);
    ctx.strokeRect(x + 1, y + 1, tile - 2, tile - 2);
    ctx.restore();
  } else {
    drawStairs(ctx, exit, tile, offsetX, offsetY, view, assets);
  }

  if (debug) {
    const x = offsetX + (exit.position.x - view.x) * tile;
    const y = offsetY + (exit.position.y - view.y) * tile;
    ctx.save();
    ctx.fillStyle = 'rgba(8, 11, 16, 0.82)';
    const text = `salida ${exit.kind} · R${exit.roomId} · d${exit.distance}`;
    ctx.font = `700 ${Math.max(6, Math.round(tile * 0.2))}px ui-monospace, monospace`;
    const width = ctx.measureText(text).width + 6;
    ctx.fillRect(x - width / 2 + tile / 2, y - Math.max(8, tile * 0.32), width, Math.max(8, tile * 0.26));
    ctx.fillStyle = EXIT_GOLD;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, x + tile / 2, y - Math.max(4, tile * 0.19));
    ctx.restore();
  }
}

function drawHotspots(
  ctx: CanvasRenderingContext2D,
  hotspots: readonly Hotspot[],
  tile: number,
  offsetX: number,
  offsetY: number,
  view: { x: number; y: number; width: number; height: number },
): void {
  for (const hotspot of hotspots) {
    const point = { x: hotspot.x, y: hotspot.y };
    if (!inView(point, view)) continue;
    const centerX = offsetX + (hotspot.x - view.x + 0.5) * tile;
    const centerY = offsetY + (hotspot.y - view.y + 0.5) * tile;
    const radius = Math.max(2, tile * 0.18);
    const color =
      hotspot.reason === 'ambos'
        ? '#fb7185'
        : hotspot.reason === 'sin-LOS'
          ? '#c084fc'
          : '#f2c14e';
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(centerX, centerY - radius);
    ctx.lineTo(centerX + radius, centerY);
    ctx.lineTo(centerX, centerY + radius);
    ctx.lineTo(centerX - radius, centerY);
    ctx.closePath();
    if (hotspot.eligible) {
      ctx.fillStyle = color;
      ctx.fill();
    }
    ctx.lineWidth = Math.max(1, tile * 0.06);
    ctx.strokeStyle = color;
    ctx.stroke();
    if (hotspot.occupied) {
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius * 1.55, 0, Math.PI * 2);
      ctx.strokeStyle = '#f8fafc';
      ctx.setLineDash([Math.max(1, tile * 0.08), Math.max(1, tile * 0.06)]);
      ctx.stroke();
      ctx.setLineDash([]);
    }
    ctx.restore();
  }
}

function drawEnemies(
  ctx: CanvasRenderingContext2D,
  map: GeneratedMap,
  tile: number,
  offsetX: number,
  offsetY: number,
  view: { x: number; y: number; width: number; height: number },
  debug: boolean,
): void {
  for (const enemy of map.enemies) {
    if (
      enemy.x < view.x ||
      enemy.y < view.y ||
      enemy.x >= view.x + view.width ||
      enemy.y >= view.y + view.height
    ) {
      continue;
    }
    const centerX = offsetX + (enemy.x - view.x + 0.5) * tile;
    const centerY = offsetY + (enemy.y - view.y + 0.5) * tile;
    ctx.save();
    ctx.beginPath();
    ctx.arc(centerX, centerY, Math.max(2, tile * 0.36), 0, Math.PI * 2);
    ctx.fillStyle = ENEMY_COLORS[enemy.type];
    ctx.fill();
    ctx.lineWidth = Math.max(1, tile * 0.08);
    ctx.strokeStyle = 'rgba(8, 11, 16, 0.9)';
    ctx.stroke();
    if (enemy.hidden) {
      ctx.beginPath();
      ctx.arc(centerX, centerY, Math.max(3, tile * 0.46), 0, Math.PI * 2);
      ctx.strokeStyle = '#f472b6';
      ctx.lineWidth = Math.max(1, tile * 0.07);
      ctx.setLineDash([Math.max(1, tile * 0.1), Math.max(1, tile * 0.07)]);
      ctx.stroke();
      ctx.setLineDash([]);
    }
    ctx.fillStyle = '#0d1117';
    ctx.font = `800 ${Math.max(6, Math.round(tile * 0.42))}px ui-sans-serif, system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(enemy.type.slice(0, 1).toUpperCase(), centerX, centerY + 0.5);
    if (debug) {
      ctx.fillStyle = enemy.hidden ? '#f9a8d4' : '#f8fafc';
      ctx.font = `600 ${Math.max(6, Math.round(tile * 0.22))}px ui-monospace, monospace`;
      ctx.fillText(
        `s${enemy.roomId} · ${enemy.type}${enemy.hidden ? ' · H' : ''}`,
        centerX,
        centerY - tile * 0.45,
      );
    }
    ctx.restore();
  }
}

function drawDebug(
  ctx: CanvasRenderingContext2D,
  map: GeneratedMap,
  tile: number,
  offsetX: number,
  offsetY: number,
  view: { x: number; y: number; width: number; height: number },
): void {
  ctx.save();
  map.rooms.forEach((room, index) => {
    ctx.fillStyle = ROOM_TINTS[index % ROOM_TINTS.length];
    for (const cell of room.cells) {
      if (
        cell.x < view.x ||
        cell.y < view.y ||
        cell.x >= view.x + view.width ||
        cell.y >= view.y + view.height
      ) {
        continue;
      }
      ctx.fillRect(
        offsetX + (cell.x - view.x) * tile,
        offsetY + (cell.y - view.y) * tile,
        tile,
        tile,
      );
    }
    ctx.strokeStyle = 'rgba(127, 179, 213, 0.8)';
    ctx.lineWidth = Math.max(1, tile * 0.06);
    ctx.setLineDash([Math.max(2, tile * 0.24), Math.max(1, tile * 0.16)]);
    ctx.strokeRect(
      offsetX + (room.x - view.x) * tile + 0.5,
      offsetY + (room.y - view.y) * tile + 0.5,
      room.width * tile - 1,
      room.height * tile - 1,
    );
    ctx.setLineDash([]);
    ctx.fillStyle = '#dbeafe';
    ctx.font = `700 ${Math.max(6, Math.round(tile * 0.25))}px ui-monospace, monospace`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(
      `R${room.id} ${room.role} · A${room.accesses} · N${room.notches}`,
      offsetX + (room.x - view.x) * tile + 2,
      offsetY + (room.y - view.y) * tile + 2,
    );
  });

  for (const corridor of map.corridors) {
    if (corridor.kind !== 'wide') continue;
    ctx.strokeStyle = 'rgba(232, 184, 109, 0.95)';
    ctx.lineWidth = Math.max(1, tile * 0.12);
    for (const cell of corridor.cells) {
      if (
        cell.x < view.x ||
        cell.y < view.y ||
        cell.x >= view.x + view.width ||
        cell.y >= view.y + view.height
      ) {
        continue;
      }
      ctx.strokeRect(
        offsetX + (cell.x - view.x) * tile + 0.5,
        offsetY + (cell.y - view.y) * tile + 0.5,
        tile - 1,
        tile - 1,
      );
    }
  }

  for (const room of map.rooms) {
    if (room.role === 'cavern' || room.sizeRole === 'cavern') {
      ctx.strokeStyle = 'rgba(186, 154, 224, 0.95)';
      ctx.lineWidth = Math.max(2, tile * 0.12);
      ctx.strokeRect(
        offsetX + (room.x - view.x) * tile + 1,
        offsetY + (room.y - view.y) * tile + 1,
        room.width * tile - 2,
        room.height * tile - 2,
      );
    }
  }
  ctx.restore();
}

function drawLabel(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  size: number,
  color = '#dbeafe',
): void {
  ctx.save();
  ctx.font = `700 ${Math.max(8, Math.round(size))}px ui-sans-serif, system-ui, sans-serif`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillStyle = 'rgba(8, 11, 16, 0.72)';
  const width = ctx.measureText(text).width + 8;
  ctx.fillRect(x, y, width, size + 4);
  ctx.fillStyle = color;
  ctx.fillText(text, x + 4, y + 2);
  ctx.restore();
}

function drawMap(
  ctx: CanvasRenderingContext2D,
  map: GeneratedMap,
  assets: ExperimentAssets,
  params: RenderParams,
  area: { x: number; y: number; width: number; height: number },
  view: { x: number; y: number; width: number; height: number },
  label: string,
): void {
  const tile = Math.max(
    1,
    Math.floor(Math.min(area.width / view.width, area.height / view.height)),
  );
  const boardWidth = tile * view.width;
  const boardHeight = tile * view.height;
  const offsetX = area.x + Math.floor((area.width - boardWidth) / 2);
  const offsetY = area.y + Math.floor((area.height - boardHeight) / 2);
  const debug = flag(params, 'showDebug', false);
  const showDoors = flag(params, 'showDoors', true);
  const showSpawn = flag(params, 'showSpawn', true);
  const showEnemies = flag(params, 'showEnemies', true);

  ctx.fillStyle = '#080b10';
  ctx.fillRect(area.x, area.y, area.width, area.height);

  ctx.save();
  ctx.beginPath();
  ctx.rect(area.x, area.y, area.width, area.height);
  ctx.clip();

  ctx.save();
  ctx.beginPath();
  ctx.rect(offsetX, offsetY, boardWidth, boardHeight);
  ctx.clip();
  drawFloorAndWalls(ctx, map, assets, tile, offsetX, offsetY, view);

  if (showSpawn) {
    const spawnRoom = map.rooms.find((room) => room.id === map.spawns.roomId);
    if (spawnRoom) drawSpawnRoom(ctx, spawnRoom, tile, offsetX, offsetY, view);
  }

  if (showDoors) {
    for (const door of map.doors) drawDoor(ctx, door, tile, offsetX, offsetY, view, debug);
    drawOpenMouths(ctx, map, tile, offsetX, offsetY, view, debug);
  }

  if (debug) drawDebug(ctx, map, tile, offsetX, offsetY, view);
  drawExit(ctx, map, tile, offsetX, offsetY, view, assets, debug);
  if (debug) drawHotspots(ctx, map.hotspots, tile, offsetX, offsetY, view);
  if (showSpawn) drawSpawnHoles(ctx, map, tile, offsetX, offsetY, view, debug);
  drawEntrance(ctx, map, tile, offsetX, offsetY, view, debug);
  if (showEnemies) drawEnemies(ctx, map, tile, offsetX, offsetY, view, debug);
  ctx.restore();

  drawLabel(ctx, label, area.x + 4, area.y + 4, Math.max(9, area.height * 0.035));
  ctx.restore();
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function renderExperiment(
  map: GeneratedMap,
  context: ExperimentRenderContext,
  assets: ExperimentAssets,
): void {
  const { ctx, width, height, params } = context;
  ctx.imageSmoothingEnabled = false;
  ctx.fillStyle = '#080b10';
  ctx.fillRect(0, 0, width, height);

  const selected = String(params.variant ?? 'growth') === map.variant;
  const split = selected ? 0.68 : 1;
  const mapArea = { x: 0, y: 0, width, height: Math.floor(height * split) };
  const fullView = { x: 0, y: 0, width: map.width, height: map.height };
  drawMap(
    ctx,
    map,
    assets,
    params,
    mapArea,
    fullView,
    `${VARIANT_LABEL[map.variant]} · semilla ${map.seed}`,
  );

  if (!selected) {
    const hintY = Math.floor(height * split) + 8;
    ctx.fillStyle = 'rgba(21, 27, 35, 0.9)';
    ctx.fillRect(0, hintY, width, height - hintY);
    ctx.fillStyle = '#9aa7b8';
    ctx.font = `600 ${Math.max(9, Math.round(height * 0.026))}px ui-sans-serif, system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(
      `Vista 13×13: elige la variante ${VARIANT_LABEL[map.variant]} en el control`,
      width / 2,
      hintY + (height - hintY) / 2,
    );
  } else {
    const playArea = {
      x: 0,
      y: Math.floor(height * split) + 4,
      width,
      height: height - Math.floor(height * split) - 4,
    };
    const player = map.spawns.player;
    const viewWidth = Math.min(VIEW_SIZE, map.width);
    const viewHeight = Math.min(VIEW_SIZE, map.height);
    const startX = clamp(player.x - Math.floor(VIEW_SIZE / 2), 0, Math.max(0, map.width - viewWidth));
    const startY = clamp(player.y - Math.floor(VIEW_SIZE / 2), 0, Math.max(0, map.height - viewHeight));
    drawMap(
      ctx,
      map,
      assets,
      params,
      playArea,
      { x: startX, y: startY, width: viewWidth, height: viewHeight },
      `${VIEW_SIZE}×${VIEW_SIZE} · spawn`,
    );
  }

  const canvas = ctx.canvas;
  canvas.dataset.variant = map.variant;
  canvas.dataset.seed = String(map.seed);
  canvas.dataset.fingerprint = fingerprint(map);
  canvas.dataset.doors = String(map.doors.length);
  canvas.dataset.openMouths = String(map.openMouths.length);
  canvas.dataset.spawnHoles = String(map.spawns.party.length);
  canvas.dataset.spawnAccess = `${map.spawns.player.x},${map.spawns.player.y}`;
  canvas.dataset.enemies = String(map.enemies.length);
  canvas.dataset.enemyTotal = String(map.stats.enemy.total);
  canvas.dataset.enemySurface = String(map.stats.enemy.surfaceN);
  canvas.dataset.enemyPlayers = String(map.stats.enemy.playersP);
  canvas.dataset.rooms = String(map.rooms.length);
  canvas.dataset.cavern = String(map.stats.cavernRooms > 0);
  canvas.dataset.wide = String(map.stats.wideCount);
  canvas.dataset.spawnIsLargest = String(map.stats.spawnIsLargest);
  canvas.dataset.spawnComponents = String(map.stats.spawnComponentsMax);
  canvas.dataset.enemyComponents = String(map.stats.enemyComponentsMax);
  canvas.dataset.interiorEnemies = String(map.stats.interiorEnemies);
  canvas.dataset.borderEnemies = String(map.stats.borderEnemies);
  canvas.dataset.hiddenEnemies = String(map.stats.hiddenEnemies);
  canvas.dataset.hotspots = String(map.stats.hotspotsTotal);
  canvas.dataset.hotspotsEligible = String(map.stats.hotspotsEligible);
  canvas.dataset.hotspotsOccupied = String(map.stats.hotspotOccupied);
  canvas.dataset.entrance = `${map.entrance.position.x},${map.entrance.position.y}`;
  canvas.dataset.exitKind = map.exit?.kind ?? 'none';
  canvas.dataset.exitRoom = map.exit ? String(map.exit.roomId) : 'none';
  canvas.dataset.exitDistance = map.exit ? String(map.exit.distance) : 'none';
  canvas.dataset.exitPosition = map.exit
    ? `${map.exit.position.x},${map.exit.position.y}`
    : 'none';
  canvas.dataset.exitAccess = map.exit
    ? `${map.exit.access.x},${map.exit.access.y}`
    : 'none';
  canvas.dataset.debug = flag(params, 'showDebug', false) ? 'true' : 'false';
  canvas.dataset.rendered = 'true';
}
