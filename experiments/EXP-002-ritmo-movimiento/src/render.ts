/**
 * Render Canvas 2D de EXP-002. Dibuja solo el recorte de 13×13 tiles sobre un
 * mundo de 20×20 con los tiles y sprites reales de 32rogues.
 */

import {
  GOBLIN_RECT,
  KNIGHT_RECT,
  TILE_RECTS,
  type SpriteRect,
} from '../../../src/host/assets';
import type { Tile } from '../../../src/game/types';
import { wallTileFor } from '../../../src/host/wall';
import {
  TILE_SIZE,
  VIEWPORT_COLUMNS,
  WORLD_COLUMNS,
  cameraForState,
  completedStepCount,
  floorVariantFor,
  mpLeft,
  visualPosition,
  type MotionState,
} from './motion';

export type MotionAssets = {
  readonly tiles: HTMLImageElement | null;
  readonly rogues: HTMLImageElement | null;
  readonly monsters: HTMLImageElement | null;
};

export const EMPTY_ASSETS: MotionAssets = {
  tiles: null,
  rogues: null,
  monsters: null,
};

export type MotionRenderOptions = {
  readonly ctx: CanvasRenderingContext2D;
  readonly width: number;
  readonly height: number;
  readonly seed: number;
  readonly state: MotionState;
  readonly assets: MotionAssets;
};

const GOBLIN_TILE = { x: 11, y: 11 } as const;

const FLOOR_COLOURS = ['#2d3038', '#30343c', '#343840'] as const;
const WALL_COLOURS = ['#0d1117', '#121821'] as const;

const WORLD_TILES: Tile[] = Array.from(
  { length: WORLD_COLUMNS * WORLD_COLUMNS },
  (_, index) => {
    const x = index % WORLD_COLUMNS;
    const y = Math.floor(index / WORLD_COLUMNS);
    return x === 0 || y === 0 || x === WORLD_COLUMNS - 1 || y === WORLD_COLUMNS - 1
      ? 'wall'
      : 'floor';
  },
);

const WALL_GRID = {
  width: WORLD_COLUMNS,
  height: WORLD_COLUMNS,
  tiles: WORLD_TILES,
};

function drawTile(
  ctx: CanvasRenderingContext2D,
  image: HTMLImageElement | null,
  rect: SpriteRect,
  dx: number,
  dy: number,
  fallback: string,
): void {
  if (!image) {
    ctx.fillStyle = fallback;
    ctx.fillRect(dx, dy, TILE_SIZE, TILE_SIZE);
    return;
  }
  ctx.drawImage(
    image,
    rect.sx,
    rect.sy,
    rect.sw,
    rect.sh,
    dx,
    dy,
    TILE_SIZE,
    TILE_SIZE,
  );
}

function drawSprite(
  ctx: CanvasRenderingContext2D,
  image: HTMLImageElement | null,
  rect: SpriteRect,
  centerX: number,
  centerY: number,
  fallback: string,
): void {
  const dx = Math.round(centerX - TILE_SIZE / 2);
  const dy = Math.round(centerY - TILE_SIZE / 2);
  if (!image) {
    ctx.fillStyle = fallback;
    ctx.fillRect(dx + 6, dy + 6, TILE_SIZE - 12, TILE_SIZE - 12);
    return;
  }
  ctx.drawImage(
    image,
    rect.sx,
    rect.sy,
    rect.sw,
    rect.sh,
    dx,
    dy,
    TILE_SIZE,
    TILE_SIZE,
  );
}

function drawPathDots(
  ctx: CanvasRenderingContext2D,
  state: MotionState,
): void {
  const visited = completedStepCount(state);
  for (const step of state.timeline.steps) {
    const centerX = step.to.x * TILE_SIZE + TILE_SIZE / 2;
    const centerY = step.to.y * TILE_SIZE + TILE_SIZE / 2;
    const isVisited = step.index < visited;
    ctx.beginPath();
    ctx.arc(centerX, centerY, 4, 0, Math.PI * 2);
    ctx.fillStyle = isVisited
      ? 'rgba(127, 179, 213, 0.16)'
      : 'rgba(127, 179, 213, 0.9)';
    ctx.fill();
    if (!isVisited) {
      ctx.lineWidth = 1;
      ctx.strokeStyle = 'rgba(237, 242, 247, 0.75)';
      ctx.stroke();
    }
  }
}

export function renderMotion(
  state: MotionState,
  options: MotionRenderOptions,
): void {
  const { ctx, width, height, seed, assets } = options;
  const camera = cameraForState(state);
  const position = visualPosition(state);
  const stepsDone = completedStepCount(state);

  ctx.imageSmoothingEnabled = false;
  ctx.fillStyle = '#080b10';
  ctx.fillRect(0, 0, width, height);

  ctx.save();
  ctx.translate(-camera.x, -camera.y);

  const minX = Math.max(0, Math.floor(camera.x / TILE_SIZE));
  const minY = Math.max(0, Math.floor(camera.y / TILE_SIZE));
  const maxX = Math.min(
    WORLD_COLUMNS - 1,
    Math.floor((camera.x + width - 1) / TILE_SIZE),
  );
  const maxY = Math.min(
    WORLD_COLUMNS - 1,
    Math.floor((camera.y + height - 1) / TILE_SIZE),
  );

  for (let y = minY; y <= maxY; y += 1) {
    for (let x = minX; x <= maxX; x += 1) {
      const dx = x * TILE_SIZE;
      const dy = y * TILE_SIZE;
      if (WORLD_TILES[y * WORLD_COLUMNS + x] === 'floor') {
        const variant = floorVariantFor(seed, x, y);
        drawTile(
          ctx,
          assets.tiles,
          TILE_RECTS[`floor${variant}`],
          dx,
          dy,
          FLOOR_COLOURS[variant - 1],
        );
      } else {
        const wall = wallTileFor(WALL_GRID, x, y);
        drawTile(
          ctx,
          assets.tiles,
          wall === 'wallSide1' ? TILE_RECTS.wallSide1 : TILE_RECTS.wallTop,
          dx,
          dy,
          wall === 'wallSide1' ? WALL_COLOURS[1] : WALL_COLOURS[0],
        );
      }
    }
  }

  drawPathDots(ctx, state);

  drawSprite(
    ctx,
    assets.monsters,
    GOBLIN_RECT,
    GOBLIN_TILE.x * TILE_SIZE + TILE_SIZE / 2,
    GOBLIN_TILE.y * TILE_SIZE + TILE_SIZE / 2,
    '#6b4b4b',
  );

  drawSprite(
    ctx,
    assets.rogues,
    KNIGHT_RECT,
    position.x,
    position.y,
    '#7fb3d5',
  );

  // El cursor solo se ve fuera de la reproducción, sobre el tile del jugador.
  if (state.status !== 'playing') {
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#f8fafc';
    ctx.strokeRect(
      position.tileX * TILE_SIZE + 1,
      position.tileY * TILE_SIZE + 1,
      TILE_SIZE - 2,
      TILE_SIZE - 2,
    );
  }

  ctx.restore();

  const canvas = ctx.canvas;
  canvas.dataset.state = state.status;
  canvas.dataset.step = String(stepsDone);
  canvas.dataset.mp = String(mpLeft(state));
  canvas.dataset.cursorVisible = state.status === 'playing' ? 'false' : 'true';
  canvas.dataset.camera = `${camera.x},${camera.y}`;
  canvas.dataset.position = `${position.x},${position.y}`;
  canvas.dataset.viewport = `${VIEWPORT_COLUMNS * TILE_SIZE}`;
  canvas.dataset.rendered = 'true';
}
