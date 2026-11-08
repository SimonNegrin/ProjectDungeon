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
import {
  CANVAS_HEIGHT,
  CANVAS_WIDTH,
  MAP_OFFSET_LOGICAL,
  RENDER_SCALE,
} from './layout';
import { wallTileFor } from './wall';

/** Subconjunto de assets que necesita el render; permite dobles en tests. */
export interface SceneAssets {
  readonly tiles: CanvasImageSource;
  readonly rogues: CanvasImageSource;
  readonly monsters: CanvasImageSource;
}

/** Overrides visuales de presentación; no forman parte del estado del motor. */
export interface RenderOptions {
  /** Centro en píxeles enteros de cada unidad, por `unitId`. */
  readonly positions?: ReadonlyMap<string, PixelPosition>;
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

/**
 * Variante de suelo determinista por coordenada y semilla. El mismo estado
 * produce siempre los mismos recortes; no usa `Math.random` ni relojes.
 */
export function floorTileFor(tileX: number, tileY: number, seed = 0): SpriteRect {
  let hash = Math.imul(tileX, 0x1f123bb5);
  hash = (hash + Math.imul(tileY, 0x27d4eb2f)) | 0;
  hash = (hash + Math.imul(seed, 0x165667b1)) | 0;
  hash = Math.imul(hash ^ (hash >>> 15), 0x2545f491);
  const variant = ((hash ^ (hash >>> 16)) >>> 0) % 3;
  if (variant === 0) return TILE_RECTS.floor1;
  if (variant === 1) return TILE_RECTS.floor2;
  return TILE_RECTS.floor3;
}

function unitCenter(
  unit: Unit,
  tileSize: number,
  positions: ReadonlyMap<string, PixelPosition> | undefined,
): PixelPosition {
  const override = positions?.get(unit.id);
  if (override) return override;
  return {
    x: unit.x * tileSize + tileSize / 2,
    y: unit.y * tileSize + tileSize / 2,
  };
}

function isUnitVisible(
  center: PixelPosition,
  camera: PixelPosition,
  viewport: Viewport,
  tileSize: number,
): boolean {
  const left = center.x - tileSize / 2;
  const top = center.y - tileSize / 2;
  return (
    left + tileSize > camera.x &&
    left < camera.x + viewport.width &&
    top + tileSize > camera.y &&
    top < camera.y + viewport.height
  );
}

function drawUnit(
  ctx: CanvasRenderingContext2D,
  image: CanvasImageSource,
  rect: SpriteRect,
  center: PixelPosition,
): void {
  const dx = Math.round(center.x - SPRITE_SIZE / 2);
  const dy = Math.round(center.y - SPRITE_SIZE / 2);
  drawRect(ctx, image, rect, dx, dy, SPRITE_SIZE);
}

/**
 * Dibuja la sala y las entidades en un contexto 2D. Es una función de solo
 * lectura: recibe el estado del motor, la cámara y el viewport, y no conoce
 * comandos, reglas de movimiento, combate, turnos, teclado ni tiempo real.
 *
 * `options.positions` permite dibujar una unidad en un centro intermedio de
 * presentación sin mutar el estado; las unidades sin override usan su tile.
 */
export function renderScene(
  ctx: CanvasRenderingContext2D,
  state: GameState,
  assets: SceneAssets,
  camera: PixelPosition,
  viewport: Viewport,
  tileSize: number = TILE_SIZE,
  options: RenderOptions = {},
): void {
  ctx.imageSmoothingEnabled = false;

  // Fondo del marco completo: negro plano, también bajo los laterales.
  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  ctx.save();
  // Resolución interna 3× y desplazamiento del mapa al centro del marco. El
  // offset lógico 161,666… cae en 485 px enteros de respaldo.
  ctx.scale(RENDER_SCALE, RENDER_SCALE);
  ctx.translate(MAP_OFFSET_LOGICAL, 0);

  // El mapa es un cuadrado 1:1: todo lo que se dibuje fuera de él (laterales)
  // queda recortado y nunca recibe tiles, unidades ni arte.
  ctx.beginPath();
  ctx.rect(0, 0, viewport.width, viewport.height);
  ctx.clip();

  ctx.fillStyle = '#080b10';
  ctx.fillRect(0, 0, viewport.width, viewport.height);

  ctx.translate(-camera.x, -camera.y);

  const range = visibleTileRange(camera, viewport, state.grid, tileSize);
  const floorSeed = state.map?.seed ?? 0;

  for (let y = range.minY; y <= range.maxY; y += 1) {
    for (let x = range.minX; x <= range.maxX; x += 1) {
      if (state.grid.tiles[y * state.grid.width + x] !== 'floor') continue;
      drawRect(
        ctx,
        assets.tiles,
        floorTileFor(x, y, floorSeed),
        x * tileSize,
        y * tileSize,
        tileSize,
      );
    }
  }

  for (let y = range.minY; y <= range.maxY; y += 1) {
    for (let x = range.minX; x <= range.maxX; x += 1) {
      if (state.grid.tiles[y * state.grid.width + x] !== 'wall') continue;
      drawRect(
        ctx,
        assets.tiles,
        TILE_RECTS[wallTileFor(state.grid, x, y)],
        x * tileSize,
        y * tileSize,
        tileSize,
      );
    }
  }

  const positions = options.positions;

  for (const enemy of state.enemies) {
    if (enemy.hp <= 0) continue;
    const center = unitCenter(enemy, tileSize, positions);
    if (!isUnitVisible(center, camera, viewport, tileSize)) continue;
    drawUnit(ctx, assets.monsters, GOBLIN_RECT, center);
  }

  for (const player of state.players) {
    if (player.hp <= 0) continue;
    const center = unitCenter(player, tileSize, positions);
    if (!isUnitVisible(center, camera, viewport, tileSize)) continue;
    drawUnit(ctx, assets.rogues, KNIGHT_RECT, center);
  }

  ctx.restore();
}
