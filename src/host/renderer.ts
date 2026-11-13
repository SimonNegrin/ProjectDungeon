import { ITEMS, type WeaponId } from '../game/equipment';
import type { GameState, Unit } from '../game/types';
import type { Door, DoorStyle, Exit } from '../game/map';
import {
  GOBLIN_RECT,
  KNIGHT_RECT,
  TILE_RECTS,
  corpseRectFor,
  type SpriteRect,
} from './assets';
import {
  TILE_SIZE,
  visibleTileRange,
  type PixelPosition,
  type Viewport,
} from './geometry';
import { floorColorFor, planDecoration } from './floor';
import {
  CANVAS_HEIGHT,
  CANVAS_WIDTH,
  MAP_OFFSET_LOGICAL,
  RENDER_SCALE,
} from './layout';
import { wallTileFor } from './wall';
import type {
  AlarmWaveEffect,
  PickupItemEffect,
  UnitWorldEffect,
  WorldEffects,
} from './world-effects';

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
  /**
   * Unidades cuya muerte aún no se ha presentado: se dibujan como vivas sin
   * inventar PV ni tocar la rejilla.
   */
  readonly dyingUnitIds?: ReadonlySet<string>;
  /** Efectos de mundo de impacto, fallo y muerte, en píxeles de tile. */
  readonly effects?: WorldEffects;
  /** Onda expansiva de alarma desde el emisor. */
  readonly alarm?: AlarmWaveEffect | null;
  /** Objeto recogido: el frame apagado lo conserva pero no lo dibuja. */
  readonly pickupItem?: PickupItemEffect | null;
  /** Capa de `F1`: máscaras, límites, spawn, salida, pasillos y puntos calientes. */
  readonly debug?: boolean;
}

const SPRITE_SIZE = 32;

/** Colores de puerta por estilo; mismo criterio que `EXP-004`. */
const DOOR_COLORS: Readonly<Record<DoorStyle, { frame: string; leaf: string }>> = {
  wood: { frame: '#6b4423', leaf: '#c88a4a' },
  metal: { frame: '#4e5d6b', leaf: '#a9bece' },
  grated: { frame: '#3d4a55', leaf: '#7c8c99' },
};

/**
 * Recorte local de las escaleras de 32rogues (`tiles.txt` 17.h y 17.i).
 * Producción aún no lo expone en `assets.ts`, así que se mantiene aquí como en
 * `EXP-004` para no añadir arte ni cambiar el catálogo de tiles.
 */
const STAIR_RECTS = {
  'stairs-down': { sx: 224, sy: 512, sw: 32, sh: 32 },
  'stairs-up': { sx: 256, sy: 512, sw: 32, sh: 32 },
} as const satisfies Record<'stairs-down' | 'stairs-up', SpriteRect>;

const EXIT_GOLD = '#f2c14e';
/** Ámbar de la paleta para la onda de alarma. */
export const ALARM_COLOR = '#e8b86d';
const ROOM_TINTS: readonly string[] = [
  'rgba(127, 179, 213, 0.13)',
  'rgba(232, 184, 109, 0.13)',
  'rgba(159, 211, 168, 0.13)',
  'rgba(224, 122, 122, 0.13)',
  'rgba(186, 154, 224, 0.13)',
];
const HOTSPOT_COLORS: Readonly<Record<string, string>> = {
  rincon: '#f2c14e',
  'sin-LOS': '#c084fc',
  ambos: '#fb7185',
};

/**
 * Formas planas provisionales de las armas del mapa (sin assets). Son solo
 * presentación: el arma, su posición y su ID vienen del estado del motor.
 */
export const WEAPON_SHAPE_COLORS = {
  handle: '#8a5a2b',
  axeBlade: '#b9c2cc',
  daggerBlade: '#d7dde5',
  guard: '#c9a227',
} as const;

function drawWeaponShape(
  ctx: CanvasRenderingContext2D,
  weaponId: string,
  x: number,
  y: number,
  tileSize: number,
): void {
  if (weaponId === 'axe') {
    ctx.fillStyle = WEAPON_SHAPE_COLORS.handle;
    ctx.fillRect(x + tileSize * 0.44, y + tileSize * 0.24, tileSize * 0.12, tileSize * 0.56);
    ctx.fillStyle = WEAPON_SHAPE_COLORS.axeBlade;
    ctx.fillRect(x + tileSize * 0.18, y + tileSize * 0.2, tileSize * 0.4, tileSize * 0.2);
    ctx.fillRect(x + tileSize * 0.54, y + tileSize * 0.26, tileSize * 0.16, tileSize * 0.16);
    return;
  }

  // Daga (y cualquier arma melee sin forma propia todavía): hoja corta y guarda.
  ctx.fillStyle = WEAPON_SHAPE_COLORS.handle;
  ctx.fillRect(x + tileSize * 0.45, y + tileSize * 0.5, tileSize * 0.1, tileSize * 0.32);
  ctx.fillStyle = WEAPON_SHAPE_COLORS.daggerBlade;
  ctx.fillRect(x + tileSize * 0.45, y + tileSize * 0.12, tileSize * 0.1, tileSize * 0.4);
  ctx.fillStyle = WEAPON_SHAPE_COLORS.guard;
  ctx.fillRect(x + tileSize * 0.34, y + tileSize * 0.5, tileSize * 0.32, tileSize * 0.06);
}

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

function spriteOrigin(
  center: PixelPosition,
  effect: UnitWorldEffect | undefined,
): PixelPosition {
  return {
    x: Math.round(center.x - SPRITE_SIZE / 2 + (effect?.dx ?? 0)),
    y: Math.round(center.y - SPRITE_SIZE / 2 + (effect?.dy ?? 0)),
  };
}

/**
 * Dibuja el sprite con el efecto de presentación: desplazamiento, alfa y
 * destello blanco. El estado del motor no se toca.
 */
function drawUnitWithEffect(
  ctx: CanvasRenderingContext2D,
  image: CanvasImageSource,
  rect: SpriteRect,
  center: PixelPosition,
  effect: UnitWorldEffect | undefined,
): void {
  if (effect && (!effect.visible || effect.alpha <= 0)) return;
  const { x: dx, y: dy } = spriteOrigin(center, effect);
  const previousAlpha = ctx.globalAlpha ?? 1;
  if (effect && effect.alpha < 1) ctx.globalAlpha = previousAlpha * effect.alpha;
  drawRect(ctx, image, rect, dx, dy, SPRITE_SIZE);
  ctx.globalAlpha = previousAlpha;

  if (effect && effect.flash > 0) {
    ctx.globalAlpha = previousAlpha * effect.flash;
    ctx.fillStyle = effect.flashColor;
    ctx.fillRect(dx, dy, SPRITE_SIZE, SPRITE_SIZE);
    ctx.globalAlpha = previousAlpha;
  }
}

/** Color único del gesto de defensa: gris claro, legible en escala de grises. */
export const DEFENSE_GESTURE_COLOR = '#e2e8f0';

/**
 * Escudo/esquiva en gris claro: legible en escala de grises, sin destello. Se
 * dibuja en el borde interior del tile del defensor, no fuera de él.
 */
function drawDefenseGesture(
  ctx: CanvasRenderingContext2D,
  dx: number,
  dy: number,
  gesture: UnitEffectDefense,
  previousAlpha: number,
): void {
  const thickness = 2;
  const margin = 5;
  const length = SPRITE_SIZE - margin * 2;
  ctx.globalAlpha = previousAlpha * 0.92;
  ctx.fillStyle = DEFENSE_GESTURE_COLOR;
  if (gesture.side === 'left' || gesture.side === 'right') {
    const x = gesture.side === 'left' ? dx : dx + SPRITE_SIZE - thickness;
    ctx.fillRect(x, dy + margin, thickness, length);
  } else {
    const y = gesture.side === 'up' ? dy : dy + SPRITE_SIZE - thickness;
    ctx.fillRect(dx + margin, y, length, thickness);
  }
  ctx.globalAlpha = previousAlpha;
}

type UnitEffectDefense = NonNullable<UnitWorldEffect['defense']>;

/** Cadáver de presentación: decal sobre el suelo, bajo las unidades. */
function drawCorpse(
  ctx: CanvasRenderingContext2D,
  assets: SceneAssets,
  unit: Unit,
  tileSize: number,
): void {
  drawRect(
    ctx,
    assets.tiles,
    corpseRectFor(unit),
    unit.x * tileSize,
    unit.y * tileSize,
    tileSize,
  );
}

function tileVisible(x: number, y: number, range: ReturnType<typeof visibleTileRange>): boolean {
  return x >= range.minX && x <= range.maxX && y >= range.minY && y <= range.maxY;
}

/** Dibuja una puerta válida con el estilo de su hueco; nunca una boca abierta. */
function drawDoor(
  ctx: CanvasRenderingContext2D,
  door: Door,
  range: ReturnType<typeof visibleTileRange>,
  tileSize: number,
  debug: boolean,
): void {
  if (!tileVisible(door.x, door.y, range)) return;
  const colors = DOOR_COLORS[door.style ?? 'wood'];
  const x = door.x * tileSize;
  const y = door.y * tileSize;
  const pad = Math.max(1, tileSize * 0.14);
  const frame = Math.max(1.5, tileSize * 0.16);

  if (door.orientation === 'vertical') {
    ctx.fillStyle = colors.frame;
    ctx.fillRect(x + tileSize * 0.34, y + pad, frame, tileSize - pad * 2);
    ctx.fillRect(x + tileSize * 0.66 - frame, y + pad, frame, tileSize - pad * 2);
    ctx.fillStyle = colors.leaf;
    ctx.fillRect(x + tileSize * 0.4, y + pad * 1.5, tileSize * 0.2, tileSize - pad * 3);
    if ((door.style ?? 'wood') === 'grated') {
      ctx.fillStyle = colors.frame;
      for (let step = 1; step <= 3; step += 1) {
        ctx.fillRect(
          x + tileSize * 0.38,
          y + (tileSize * step) / 4,
          tileSize * 0.24,
          Math.max(1, tileSize * 0.05),
        );
      }
    }
  } else {
    ctx.fillStyle = colors.frame;
    ctx.fillRect(x + pad, y + tileSize * 0.34, tileSize - pad * 2, frame);
    ctx.fillRect(x + pad, y + tileSize * 0.66 - frame, tileSize - pad * 2, frame);
    ctx.fillStyle = colors.leaf;
    ctx.fillRect(x + pad * 1.5, y + tileSize * 0.4, tileSize - pad * 3, tileSize * 0.2);
    if ((door.style ?? 'wood') === 'grated') {
      ctx.fillStyle = colors.frame;
      for (let step = 1; step <= 3; step += 1) {
        ctx.fillRect(
          x + (tileSize * step) / 4,
          y + tileSize * 0.38,
          Math.max(1, tileSize * 0.05),
          tileSize * 0.24,
        );
      }
    }
  }

  if (debug) {
    ctx.fillStyle = 'rgba(8, 11, 16, 0.78)';
    ctx.fillRect(x + pad, y + tileSize * 0.02, tileSize - pad * 2, tileSize * 0.22);
    ctx.fillStyle = '#f8fafc';
    ctx.font = `700 ${Math.max(6, Math.round(tileSize * 0.2))}px ui-monospace, monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(
      (door.style ?? 'wood').slice(0, 1).toUpperCase(),
      x + tileSize / 2,
      y + tileSize * 0.13,
    );
  }
}

/** Escaleras y puerta de salida: se distingue de una puerta decorativa. */
function drawExit(
  ctx: CanvasRenderingContext2D,
  exit: Exit,
  assets: SceneAssets,
  range: ReturnType<typeof visibleTileRange>,
  tileSize: number,
): void {
  if (!tileVisible(exit.position.x, exit.position.y, range)) return;
  const x = exit.position.x * tileSize;
  const y = exit.position.y * tileSize;

  if (exit.kind === 'door') {
    const pad = Math.max(1, tileSize * 0.1);
    ctx.fillStyle = EXIT_GOLD;
    ctx.fillRect(x + pad, y + pad, tileSize - pad * 2, tileSize - pad * 2);
    ctx.fillStyle = '#3b2a12';
    ctx.fillRect(x + pad * 2, y + pad * 2, tileSize - pad * 4, tileSize - pad * 4);
    ctx.fillStyle = '#fbbf24';
    ctx.fillRect(
      x + tileSize * 0.44,
      y + tileSize * 0.44,
      Math.max(1, tileSize * 0.12),
      Math.max(1, tileSize * 0.12),
    );
    ctx.fillStyle = '#fef3c7';
    ctx.fillRect(x + 1, y + 1, tileSize - 2, Math.max(1, tileSize * 0.06));
  } else {
    const rect = STAIR_RECTS[exit.kind];
    ctx.drawImage(
      assets.tiles,
      rect.sx,
      rect.sy,
      rect.sw,
      rect.sh,
      x,
      y,
      tileSize,
      tileSize,
    );
    const steps = 4;
    for (let step = 0; step < steps; step += 1) {
      const width = tileSize * (0.68 - step * 0.13);
      const height = Math.max(1.5, tileSize * 0.065);
      const stepX = x + (tileSize - width) / 2;
      const stepY =
        exit.kind === 'stairs-down'
          ? y + tileSize * (0.2 + step * 0.16)
          : y + tileSize * (0.7 - step * 0.16);
      ctx.fillStyle =
        step % 2 === 0 ? 'rgba(254, 243, 199, 0.92)' : 'rgba(242, 193, 78, 0.92)';
      ctx.fillRect(stepX, stepY, width, height);
    }
    ctx.fillStyle = EXIT_GOLD;
    ctx.fillRect(x + 1, y + 1, tileSize - 2, Math.max(1, tileSize * 0.06));
  }
}

/**
 * Onda de alarma: anillo cuadrado de dos tiles que sale del emisor. Se dibuja
 * con cuatro rectángulos planos, sin degradados ni partículas.
 */
function drawAlarmWave(
  ctx: CanvasRenderingContext2D,
  wave: AlarmWaveEffect,
  tileSize: number,
): void {
  if (wave.radiusTiles <= 0) return;
  const centerX = (wave.tileX + 0.5) * tileSize;
  const centerY = (wave.tileY + 0.5) * tileSize;
  const half = wave.radiusTiles * tileSize;
  const thickness = Math.max(1, Math.round(tileSize * 0.08));
  const left = Math.round(centerX - half);
  const top = Math.round(centerY - half);
  const size = Math.round(half * 2);
  const previousAlpha = ctx.globalAlpha ?? 1;

  ctx.globalAlpha = previousAlpha * Math.max(0.2, 1 - wave.progress);
  ctx.fillStyle = ALARM_COLOR;
  ctx.fillRect(left, top, size, thickness);
  ctx.fillRect(left, top + size - thickness, size, thickness);
  ctx.fillRect(left, top, thickness, size);
  ctx.fillRect(left + size - thickness, top, thickness, size);
  ctx.globalAlpha = previousAlpha;
}

function drawBorder(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  color: string,
  thickness = 1,
): void {
  ctx.fillStyle = color;
  ctx.fillRect(x, y, width, thickness);
  ctx.fillRect(x, y + height - thickness, width, thickness);
  ctx.fillRect(x, y, thickness, height);
  ctx.fillRect(x + width - thickness, y, thickness, height);
}

function drawDebugLabel(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  size: number,
  color = '#dbeafe',
): void {
  ctx.font = `700 ${Math.max(6, Math.round(size))}px ui-monospace, monospace`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  const width = ctx.measureText(text).width + 6;
  ctx.fillStyle = 'rgba(8, 11, 16, 0.78)';
  ctx.fillRect(x, y, width, size + 4);
  ctx.fillStyle = color;
  ctx.fillText(text, x + 3, y + 2);
}

/**
 * Capa de `F1` bajo las unidades: máscaras y límites de sala, corredores con su
 * anchura y la caverna. No interviene en el juego normal.
 */
function drawDebugUnderlay(
  ctx: CanvasRenderingContext2D,
  state: GameState,
  range: ReturnType<typeof visibleTileRange>,
  tileSize: number,
): void {
  const map = state.map;
  if (!map) return;

  map.rooms.forEach((room, index) => {
    ctx.fillStyle = ROOM_TINTS[index % ROOM_TINTS.length];
    for (const cell of room.cells ?? []) {
      if (!tileVisible(cell.x, cell.y, range)) continue;
      ctx.fillRect(cell.x * tileSize, cell.y * tileSize, tileSize, tileSize);
    }
    if (room.x > range.maxX || room.y > range.maxY) return;
    drawBorder(
      ctx,
      room.x * tileSize + 0.5,
      room.y * tileSize + 0.5,
      room.width * tileSize - 1,
      room.height * tileSize - 1,
      'rgba(127, 179, 213, 0.8)',
    );
  });

  for (const corridor of map.corridors) {
    const color =
      corridor.width === 2
        ? 'rgba(232, 184, 109, 0.95)'
        : 'rgba(127, 179, 213, 0.35)';
    for (const cell of corridor.cells ?? corridor.path) {
      if (!tileVisible(cell.x, cell.y, range)) continue;
      drawBorder(
        ctx,
        cell.x * tileSize + 0.5,
        cell.y * tileSize + 0.5,
        tileSize - 1,
        tileSize - 1,
        color,
      );
    }
  }

  const cavernId = map.cavernRoomId;
  if (cavernId !== undefined && cavernId !== null) {
    const cavern = map.rooms.find((room) => room.id === cavernId);
    if (cavern) {
      drawBorder(
        ctx,
        cavern.x * tileSize + 1,
        cavern.y * tileSize + 1,
        cavern.width * tileSize - 2,
        cavern.height * tileSize - 2,
        'rgba(186, 154, 224, 0.95)',
        2,
      );
    }
  }
}

/**
 * Capa de `F1` sobre las unidades: spawn de 6, accesos, entrada/salida, puertas
 * con motivo, bocas sin puerta y puntos calientes.
 */
function drawDebugOverlay(
  ctx: CanvasRenderingContext2D,
  state: GameState,
  range: ReturnType<typeof visibleTileRange>,
  tileSize: number,
): void {
  const map = state.map;
  if (!map) return;

  const spawnRoom =
    map.spawns.roomId === undefined
      ? undefined
      : map.rooms.find((room) => room.id === map.spawns.roomId);
  if (spawnRoom) {
    ctx.fillStyle = 'rgba(127, 179, 213, 0.18)';
    for (const cell of spawnRoom.cells ?? []) {
      if (!tileVisible(cell.x, cell.y, range)) continue;
      ctx.fillRect(cell.x * tileSize, cell.y * tileSize, tileSize, tileSize);
    }
    drawBorder(
      ctx,
      spawnRoom.x * tileSize + 0.5,
      spawnRoom.y * tileSize + 0.5,
      spawnRoom.width * tileSize - 1,
      spawnRoom.height * tileSize - 1,
      'rgba(127, 179, 213, 0.9)',
      2,
    );
  }

  const party = map.spawns.party ?? [map.spawns.player];
  party.forEach((hole, index) => {
    if (!tileVisible(hole.x, hole.y, range)) return;
    const radius = Math.max(2, tileSize * (index === 0 ? 0.38 : 0.28));
    ctx.fillStyle = index === 0 ? 'rgba(127, 179, 213, 0.95)' : 'rgba(232, 184, 109, 0.9)';
    ctx.fillRect(
      hole.x * tileSize + tileSize / 2 - radius,
      hole.y * tileSize + tileSize / 2 - radius,
      radius * 2,
      radius * 2,
    );
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(
      hole.x * tileSize + tileSize / 2 - radius,
      hole.y * tileSize + tileSize / 2 - radius,
      radius * 2,
      Math.max(1, tileSize * 0.08),
    );
    ctx.fillStyle = '#0d1117';
    ctx.font = `700 ${Math.max(6, Math.round(tileSize * 0.42))}px ui-sans-serif, system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(
      index === 0 ? 'J' : String(index + 1),
      hole.x * tileSize + tileSize / 2,
      hole.y * tileSize + tileSize / 2 + 0.5,
    );
    ctx.fillStyle = '#dbeafe';
    ctx.font = `600 ${Math.max(6, Math.round(tileSize * 0.22))}px ui-monospace, monospace`;
    ctx.fillText(
      `${hole.x},${hole.y}`,
      hole.x * tileSize + tileSize / 2,
      hole.y * tileSize + tileSize * 0.12,
    );
  });

  for (const door of map.doors) {
    if (!tileVisible(door.x, door.y, range)) continue;
    drawBorder(
      ctx,
      door.x * tileSize + 1,
      door.y * tileSize + 1,
      tileSize - 2,
      tileSize - 2,
      'rgba(248, 250, 252, 0.7)',
    );
  }

  for (const mouth of map.openMouths ?? []) {
    if (!tileVisible(mouth.x, mouth.y, range)) continue;
    const color =
      mouth.reason === 'pasillo-ancho'
        ? 'rgba(232, 184, 109, 0.95)'
        : 'rgba(224, 122, 122, 0.95)';
    drawBorder(
      ctx,
      mouth.x * tileSize + 1.5,
      mouth.y * tileSize + 1.5,
      tileSize - 3,
      tileSize - 3,
      color,
    );
    drawDebugLabel(
      ctx,
      mouth.reason,
      mouth.x * tileSize,
      mouth.y * tileSize - Math.max(7, tileSize * 0.3),
      Math.max(5, tileSize * 0.18),
      '#fecaca',
    );
  }

  if (map.entrance) {
    const point = map.entrance.position;
    if (tileVisible(point.x, point.y, range)) {
      const x = point.x * tileSize;
      const y = point.y * tileSize;
      drawBorder(ctx, x + 2, y + 2, tileSize - 4, tileSize - 4, '#7dd3fc', 2);
      drawDebugLabel(ctx, 'entrada', x, y - Math.max(8, tileSize * 0.32), Math.max(6, tileSize * 0.2), '#dbeafe');
    }
  }

  if (map.exit) {
    const exit = map.exit;
    if (tileVisible(exit.position.x, exit.position.y, range)) {
      const x = exit.position.x * tileSize;
      const y = exit.position.y * tileSize;
      drawBorder(ctx, x + 1, y + 1, tileSize - 2, tileSize - 2, EXIT_GOLD);
      drawDebugLabel(
        ctx,
        `salida ${exit.kind} · R${exit.roomId} · d${exit.distance}`,
        x,
        y - Math.max(8, tileSize * 0.32),
        Math.max(6, tileSize * 0.2),
        EXIT_GOLD,
      );
      for (const roomId of exit.path) {
        const room = map.rooms.find((candidate) => candidate.id === roomId);
        if (!room) continue;
        drawBorder(
          ctx,
          room.x * tileSize + 2,
          room.y * tileSize + 2,
          room.width * tileSize - 4,
          room.height * tileSize - 4,
          'rgba(242, 193, 78, 0.65)',
        );
      }
    }
  }

  for (const hotspot of map.hotspots ?? []) {
    if (!tileVisible(hotspot.x, hotspot.y, range)) continue;
    const color = HOTSPOT_COLORS[hotspot.reason] ?? '#f2c14e';
    const centerX = hotspot.x * tileSize + tileSize / 2;
    const centerY = hotspot.y * tileSize + tileSize / 2;
    const radius = Math.max(2, tileSize * 0.18);
    ctx.fillStyle = hotspot.eligible ? color : 'transparent';
    if (hotspot.eligible) {
      ctx.fillRect(centerX - radius, centerY - radius, radius * 2, radius * 2);
    }
    drawBorder(
      ctx,
      centerX - radius,
      centerY - radius,
      radius * 2,
      radius * 2,
      color,
    );
    if (hotspot.occupied) {
      drawBorder(
        ctx,
        centerX - radius * 1.55,
        centerY - radius * 1.55,
        radius * 3.1,
        radius * 3.1,
        '#f8fafc',
      );
    }
  }

  for (const enemy of map.enemies ?? []) {
    if (!tileVisible(enemy.x, enemy.y, range)) continue;
    if (enemy.hidden) {
      drawBorder(
        ctx,
        enemy.x * tileSize + tileSize * 0.12,
        enemy.y * tileSize + tileSize * 0.12,
        tileSize * 0.76,
        tileSize * 0.76,
        '#f472b6',
      );
    }
    drawDebugLabel(
      ctx,
      `s${enemy.roomId} · ${enemy.type}${enemy.hidden ? ' · H' : ''}`,
      enemy.x * tileSize,
      enemy.y * tileSize - Math.max(7, tileSize * 0.3),
      Math.max(5, tileSize * 0.18),
      enemy.hidden ? '#f9a8d4' : '#f8fafc',
    );
  }
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

  // Damero programático: un relleno plano por tile de suelo, con la base común
  // y el segundo tono de la paleta de su sala. Ni muros ni tiles no
  // transitables reciben color de suelo.
  for (let y = range.minY; y <= range.maxY; y += 1) {
    for (let x = range.minX; x <= range.maxX; x += 1) {
      if (state.grid.tiles[y * state.grid.width + x] !== 'floor') continue;
      ctx.fillStyle = floorColorFor(state.map, x, y);
      ctx.fillRect(x * tileSize, y * tileSize, tileSize, tileSize);
    }
  }

  // Decals planos deterministas, siempre por encima del suelo y por debajo de
  // muros, unidades y de las capas DOM de camino/cursor.
  for (const decoration of planDecoration(state.map)) {
    if (decoration.x < range.minX || decoration.x > range.maxX) continue;
    if (decoration.y < range.minY || decoration.y > range.maxY) continue;
    drawRect(
      ctx,
      assets.tiles,
      decoration.decal.rect,
      decoration.x * tileSize,
      decoration.y * tileSize,
      tileSize,
    );
  }

  const positions = options.positions;
  const dyingUnitIds = options.dyingUnitIds;
  const effects = options.effects;

  // Cadáveres de presentación: sobre los decals y bajo muros/unidades. Se
  // dibujan desde la unidad muerta que conserva el motor, sin escribir en la
  // rejilla. Durante el cue de muerte aún no hay cadáver: manda el efecto.
  for (const unit of [...state.enemies, ...state.players]) {
    if (unit.hp > 0) continue;
    if (dyingUnitIds?.has(unit.id)) continue;
    if (effects?.has(unit.id)) continue;
    if (!tileVisible(unit.x, unit.y, range)) continue;
    drawCorpse(ctx, assets, unit, tileSize);
  }

  const debug = options.debug ?? false;
  if (debug) drawDebugUnderlay(ctx, state, range, tileSize);

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

  // Puertas válidas y salida de nivel; las bocas abiertas nunca dibujan puerta.
  for (const door of state.map?.doors ?? []) {
    drawDoor(ctx, door, range, tileSize, debug);
  }
  if (state.map?.exit) {
    drawExit(ctx, state.map.exit, assets, range, tileSize);
  }

  // Objetos del suelo: por ahora solo las armas tienen forma plana provisional.
  // Durante la recogida el objeto sigue en el suelo y parpadea: el frame apagado
  // no lo dibuja, pero el estado conserva su tile hasta el final del beat.
  const pickupItem = options.pickupItem ?? null;
  for (const item of state.groundItems ?? []) {
    if (ITEMS[item.itemId].category !== 'weapon') continue;
    if (item.x < range.minX || item.x > range.maxX) continue;
    if (item.y < range.minY || item.y > range.maxY) continue;
    if (
      pickupItem?.itemId === item.itemId &&
      pickupItem.tileX === item.x &&
      pickupItem.tileY === item.y &&
      !pickupItem.visible
    ) {
      continue;
    }
    drawWeaponShape(
      ctx,
      item.itemId as WeaponId,
      item.x * tileSize,
      item.y * tileSize,
      tileSize,
    );
  }

  for (const enemy of state.enemies) {
    const effect = effects?.get(enemy.id);
    if (enemy.hp <= 0 && !dyingUnitIds?.has(enemy.id) && !effect) continue;
    const center = unitCenter(enemy, tileSize, positions);
    if (!isUnitVisible(center, camera, viewport, tileSize)) continue;
    drawUnitWithEffect(ctx, assets.monsters, GOBLIN_RECT, center, effect);
  }

  for (const player of state.players) {
    const effect = effects?.get(player.id);
    if (player.hp <= 0 && !dyingUnitIds?.has(player.id) && !effect) continue;
    const center = unitCenter(player, tileSize, positions);
    if (!isUnitVisible(center, camera, viewport, tileSize)) continue;
    drawUnitWithEffect(ctx, assets.rogues, KNIGHT_RECT, center, effect);
  }

  // Gesto de defensa en una pasada posterior a todas las unidades: el atacante
  // se dibuja detrás o delante según el orden de las listas y podría tapar el
  // borde del defensor. Aquí queda siempre por encima, dentro de su tile.
  for (const unit of [...state.enemies, ...state.players]) {
    const effect = effects?.get(unit.id);
    if (!effect?.defense) continue;
    if (!effect.visible || effect.alpha <= 0) continue;
    const center = unitCenter(unit, tileSize, positions);
    if (!isUnitVisible(center, camera, viewport, tileSize)) continue;
    const { x, y } = spriteOrigin(center, effect);
    drawDefenseGesture(ctx, x, y, effect.defense, ctx.globalAlpha ?? 1);
  }

  if (options.alarm) drawAlarmWave(ctx, options.alarm, tileSize);

  if (debug) drawDebugOverlay(ctx, state, range, tileSize);

  ctx.restore();
}
