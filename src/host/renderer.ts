import type { GameState, Unit } from '../game/types';
import {
  GOBLIN_RECT,
  KNIGHT_RECT,
  TILE_RECTS,
  type SpriteRect,
} from './assets';
import {
  TILE_SIZE,
  visibleTileRange,
  type PixelPosition,
  type Viewport,
} from './geometry';

/** Subconjunto de assets que necesita el render; permite dobles en tests. */
export interface SceneAssets {
  readonly tiles: CanvasImageSource;
  readonly rogues: CanvasImageSource;
  readonly monsters: CanvasImageSource;
}

const SPRITE_SIZE = 32;

function drawRect(
  ctx: CanvasRenderingContext2D,
  image: CanvasImageSource,
  rect: SpriteRect,
  dx: number,
  dy: number,
  size: number,
): void {
  ctx.drawImage(
    image,
    rect.sx,
    rect.sy,
    rect.sw,
    rect.sh,
    dx,
    dy,
    size,
    size,
  );
}

/** Variante determinista de suelo, sin aleatoriedad. */
function floorRectFor(tileX: number, tileY: number): SpriteRect {
  const variant = (tileX * 7 + tileY * 13) % 3;
  if (variant === 0) return TILE_RECTS.floor1;
  if (variant === 1) return TILE_RECTS.floor2;
  return TILE_RECTS.floor3;
}

/** Muro superior en la fila 0 y laterales alternos en el resto del borde. */
function wallRectFor(tileX: number, tileY: number): SpriteRect {
  if (tileY === 0) return TILE_RECTS.wallTop;
  return (tileX + tileY) % 2 === 0 ? TILE_RECTS.wallSide1 : TILE_RECTS.wallSide2;
}

function drawUnit(
  ctx: CanvasRenderingContext2D,
  image: CanvasImageSource,
  rect: SpriteRect,
  unit: Unit,
  tileSize: number,
): void {
  const dx = unit.x * tileSize + (tileSize - SPRITE_SIZE) / 2;
  const dy = unit.y * tileSize + (tileSize - SPRITE_SIZE) / 2;
  drawRect(ctx, image, rect, dx, dy, SPRITE_SIZE);
}

/**
 * Dibuja la sala y las entidades en un contexto 2D. Es una función de solo
 * lectura: recibe el estado del motor, la cámara y el viewport, y no conoce
 * comandos, reglas de movimiento, combate, turnos, teclado ni tiempo real.
 */
export function renderScene(
  ctx: CanvasRenderingContext2D,
  state: GameState,
  assets: SceneAssets,
  camera: PixelPosition,
  viewport: Viewport,
  tileSize: number = TILE_SIZE,
): void {
  ctx.imageSmoothingEnabled = false;
  ctx.fillStyle = '#080b10';
  ctx.fillRect(0, 0, viewport.width, viewport.height);

  ctx.save();
  ctx.translate(-camera.x, -camera.y);

  const range = visibleTileRange(camera, viewport, state.grid, tileSize);

  for (let y = range.minY; y <= range.maxY; y += 1) {
    for (let x = range.minX; x <= range.maxX; x += 1) {
      if (state.grid.tiles[y * state.grid.width + x] !== 'floor') continue;
      drawRect(ctx, assets.tiles, floorRectFor(x, y), x * tileSize, y * tileSize, tileSize);
    }
  }

  for (let y = range.minY; y <= range.maxY; y += 1) {
    for (let x = range.minX; x <= range.maxX; x += 1) {
      if (state.grid.tiles[y * state.grid.width + x] !== 'wall') continue;
      drawRect(ctx, assets.tiles, wallRectFor(x, y), x * tileSize, y * tileSize, tileSize);
    }
  }

  for (const enemy of state.enemies) {
    if (enemy.hp <= 0) continue;
    drawUnit(ctx, assets.monsters, GOBLIN_RECT, enemy, tileSize);
  }

  for (const player of state.players) {
    if (player.hp <= 0) continue;
    drawUnit(ctx, assets.rogues, KNIGHT_RECT, player, tileSize);
  }

  ctx.restore();
}
