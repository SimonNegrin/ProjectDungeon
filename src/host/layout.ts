import { TILE_SIZE, type Viewport } from './geometry';

/**
 * Marco lógico 16:9. La altura sale de 12 tiles de 32 px y la anchura se
 * deriva de la proporción: 384 × 16/9 = 682,666… px lógicos.
 */
export const MAP_TILES_PER_AXIS = 12;
export const FRAME_LOGICAL_HEIGHT = MAP_TILES_PER_AXIS * TILE_SIZE;
export const FRAME_ASPECT_RATIO = 16 / 9;
export const FRAME_LOGICAL_WIDTH = FRAME_LOGICAL_HEIGHT * FRAME_ASPECT_RATIO;

/** Resolución interna de dibujo (3×). No es la escala de presentación. */
export const RENDER_SCALE = 3;
export const CANVAS_WIDTH = Math.round(FRAME_LOGICAL_WIDTH * RENDER_SCALE);
export const CANVAS_HEIGHT = FRAME_LOGICAL_HEIGHT * RENDER_SCALE;

/** Sub-viewport cuadrado del mapa: 12×12 tiles de 32 px lógicos. */
export const MAP_VIEWPORT: Viewport = {
  width: MAP_TILES_PER_AXIS * TILE_SIZE,
  height: MAP_TILES_PER_AXIS * TILE_SIZE,
};

export const MAP_BACKING_SIZE = MAP_VIEWPORT.width * RENDER_SCALE;
export const MAP_OFFSET_BACKING = (CANVAS_WIDTH - MAP_BACKING_SIZE) / 2;
export const MAP_OFFSET_LOGICAL = MAP_OFFSET_BACKING / RENDER_SCALE;

export interface FrameLayout {
  /** Posición del marco dentro del espacio disponible. */
  readonly left: number;
  readonly top: number;
  /** Tamaño en píxeles CSS del marco presentado. */
  readonly width: number;
  readonly height: number;
  /** Escala de presentación aplicada al marco lógico. */
  readonly scale: number;
}

function nonNegativeFinite(value: number): number {
  return Number.isFinite(value) && value > 0 ? value : 0;
}

/**
 * Ajusta el marco 16:9 al máximo tamaño que cabe en el espacio disponible,
 * centrado y sin deformarlo. Si el espacio no coincide con 16:9, el sobrante
 * queda como bandas negras a los lados o arriba/abajo. Las entradas no
 * positivas, infinitas o NaN devuelven un marco vacío sin NaN ni divisiones por
 * cero.
 */
export function computeFrameLayout(
  availableWidth: number,
  availableHeight: number,
): FrameLayout {
  const width = nonNegativeFinite(availableWidth);
  const height = nonNegativeFinite(availableHeight);
  if (width === 0 || height === 0) {
    return { left: 0, top: 0, width: 0, height: 0, scale: 0 };
  }

  const rawScale = Math.min(width / FRAME_LOGICAL_WIDTH, height / FRAME_LOGICAL_HEIGHT);
  const scale = Number.isFinite(rawScale) && rawScale > 0 ? rawScale : 0;
  const frameWidth = FRAME_LOGICAL_WIDTH * scale;
  const frameHeight = FRAME_LOGICAL_HEIGHT * scale;

  return {
    left: (width - frameWidth) / 2,
    top: (height - frameHeight) / 2,
    width: frameWidth,
    height: frameHeight,
    scale,
  };
}

/**
 * Coordenadas del mapa expresadas como porcentaje del marco completo. El HUD y
 * el feedback viven fuera del mapa, así que se posicionan respecto al marco
 * usando estos porcentajes (el mapa empieza en el 21,875 % del ancho).
 */
export function mapXToFramePercent(mapX: number): number {
  return ((MAP_OFFSET_LOGICAL + mapX) / FRAME_LOGICAL_WIDTH) * 100;
}

export function mapYToFramePercent(mapY: number): number {
  return (mapY / FRAME_LOGICAL_HEIGHT) * 100;
}

export function mapWidthToFramePercent(mapWidth: number): number {
  return (mapWidth / FRAME_LOGICAL_WIDTH) * 100;
}

export function mapHeightToFramePercent(mapHeight: number): number {
  return (mapHeight / FRAME_LOGICAL_HEIGHT) * 100;
}
