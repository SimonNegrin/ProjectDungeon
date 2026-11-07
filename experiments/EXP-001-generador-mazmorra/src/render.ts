/**
 * Render Canvas 2D de una mazmorra de EXP-001 con los tiles reales de 32rogues.
 * El módulo es DOM/Canvas; la generación vive en `dungeon.ts`.
 */

import { TILE_RECTS, type SpriteRect } from '../../../src/host/assets';
import { fingerprint, wallTileFor, type Door, type DungeonState } from './dungeon';

export type DungeonRenderContext = {
  ctx: CanvasRenderingContext2D;
  width: number;
  height: number;
  params: { showDoors?: unknown; [key: string]: unknown };
  seed: number;
  dpr: number;
};

const FLOOR_COLOURS = ['#2d3038', '#30343c', '#343840'] as const;
const WALL_COLOURS = ['#0d1117', '#121821'] as const;

function floorTileFor(seed: number, x: number, y: number): 1 | 2 | 3 {
  let hash = 2166136261;
  hash ^= seed >>> 0;
  hash = Math.imul(hash, 16777619);
  hash ^= x + 1;
  hash = Math.imul(hash, 16777619);
  hash ^= y + 1;
  hash = Math.imul(hash, 16777619);
  hash ^= (x * 31 + y * 17) >>> 0;
  hash = Math.imul(hash, 16777619);
  return ((hash >>> 0) % 3 + 1) as 1 | 2 | 3;
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

function drawRoomBounds(ctx: CanvasRenderingContext2D, state: DungeonState, tile: number, offsetX: number, offsetY: number): void {
  ctx.save();
  ctx.strokeStyle = 'rgba(127, 179, 213, 0.7)';
  ctx.lineWidth = Math.max(1, tile / 10);
  ctx.setLineDash([Math.max(2, tile * 0.28), Math.max(2, tile * 0.18)]);
  for (const room of state.rooms) {
    ctx.strokeRect(
      offsetX + room.x * tile + 0.5,
      offsetY + room.y * tile + 0.5,
      room.width * tile - 1,
      room.height * tile - 1,
    );
  }
  ctx.restore();
}

function drawDoor(ctx: CanvasRenderingContext2D, door: Door, tile: number, offsetX: number, offsetY: number): void {
  const centerX = offsetX + (door.x + 0.5) * tile;
  const centerY = offsetY + (door.y + 0.5) * tile;
  const length = Math.max(4, tile * 0.72);
  const thickness = Math.max(2, tile * 0.2);

  ctx.save();
  ctx.fillStyle = 'rgba(232, 184, 109, 0.28)';
  ctx.beginPath();
  ctx.arc(centerX, centerY, tile * 0.46, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#f0c987';
  if (door.orientation === 'horizontal') {
    ctx.fillRect(centerX - length / 2, centerY - thickness / 2, length, thickness);
  } else {
    ctx.fillRect(centerX - thickness / 2, centerY - length / 2, thickness, length);
  }
  ctx.restore();
}

function drawSpawn(
  ctx: CanvasRenderingContext2D,
  point: { x: number; y: number },
  tile: number,
  offsetX: number,
  offsetY: number,
  fill: string,
  label: string,
): void {
  const centerX = offsetX + (point.x + 0.5) * tile;
  const centerY = offsetY + (point.y + 0.5) * tile;
  const radius = Math.max(4, tile * 0.36);

  ctx.save();
  ctx.beginPath();
  ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.lineWidth = Math.max(1, tile * 0.1);
  ctx.strokeStyle = '#f8fafc';
  ctx.stroke();

  ctx.fillStyle = '#0d1117';
  ctx.font = `700 ${Math.max(7, Math.round(tile * 0.62))}px ui-sans-serif, system-ui, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, centerX, centerY + 0.5);
  ctx.restore();
}

export function renderDungeon(
  state: DungeonState,
  context: DungeonRenderContext,
  tilesImage: HTMLImageElement | null,
): void {
  const { ctx, width, height, params } = context;
  const showDoors = params.showDoors === undefined ? true : Boolean(params.showDoors);
  const tile = Math.max(1, Math.floor(Math.min(width / state.width, height / state.height)));
  const boardWidth = tile * state.width;
  const boardHeight = tile * state.height;
  const offsetX = Math.floor((width - boardWidth) / 2);
  const offsetY = Math.floor((height - boardHeight) / 2);

  ctx.imageSmoothingEnabled = false;

  ctx.fillStyle = '#080b10';
  ctx.fillRect(0, 0, width, height);

  ctx.save();
  ctx.translate(offsetX, offsetY);

  for (let y = 0; y < state.height; y += 1) {
    for (let x = 0; x < state.width; x += 1) {
      const index = y * state.width + x;
      const dx = x * tile;
      const dy = y * tile;
      if (state.tiles[index] === 1) {
        const variant = floorTileFor(state.seed, x, y);
        drawTile(ctx, tilesImage, TILE_RECTS[`floor${variant}`], dx, dy, tile, FLOOR_COLOURS[variant - 1]);
      } else {
        const wall = wallTileFor(state, x, y);
        drawTile(
          ctx,
          tilesImage,
          wall === 'wallSide1' ? TILE_RECTS.wallSide1 : TILE_RECTS.wallTop,
          dx,
          dy,
          tile,
          wall === 'wallSide1' ? WALL_COLOURS[1] : WALL_COLOURS[0],
        );
      }
    }
  }

  drawRoomBounds(ctx, state, tile, 0, 0);

  if (showDoors) {
    for (const door of state.doors) drawDoor(ctx, door, tile, 0, 0);
  }

  drawSpawn(ctx, state.spawns.player, tile, 0, 0, 'rgba(127, 179, 213, 0.95)', 'J');
  drawSpawn(ctx, state.spawns.enemy, tile, 0, 0, 'rgba(224, 122, 122, 0.95)', 'E');

  ctx.restore();

  const canvas = ctx.canvas;
  canvas.dataset.showDoors = showDoors ? 'true' : 'false';
  canvas.dataset.doors = String(state.doors.length);
  canvas.dataset.fingerprint = fingerprint(state);
}
