import { TILE_SIZE, type Viewport } from './geometry';

/**
 * Marco lógico 16:9. La altura sale de 13 tiles de 32 px y la anchura se
 * deriva de la proporción: 416 × 16/9 = 739,555… px lógicos.
 */
export const MAP_TILES_PER_AXIS = 13;
export const FRAME_LOGICAL_HEIGHT = MAP_TILES_PER_AXIS * TILE_SIZE;
export const FRAME_ASPECT_RATIO = 16 / 9;
export const FRAME_LOGICAL_WIDTH = FRAME_LOGICAL_HEIGHT * FRAME_ASPECT_RATIO;

/** Resolución interna de dibujo (3×). No es la escala de presentación. */
export const RENDER_SCALE = 3;
/**
 * El ancho interno se redondea a un número par para que el offset horizontal
 * del mapa caiga en píxeles enteros de respaldo. Con 2219 el offset sería
 * 485,5; 2218 deja 485 y una desviación interna de 16:9 inferior al 0,05 % que
 * absorbe la presentación CSS del marco.
 */
export const CANVAS_WIDTH = Math.round((FRAME_LOGICAL_WIDTH * RENDER_SCALE) / 2) * 2;
export const CANVAS_HEIGHT = FRAME_LOGICAL_HEIGHT * RENDER_SCALE;

/** Sub-viewport cuadrado del mapa: 13×13 tiles de 32 px lógicos. */
export const MAP_VIEWPORT: Viewport = {
  width: MAP_TILES_PER_AXIS * TILE_SIZE,
  height: MAP_TILES_PER_AXIS * TILE_SIZE,
};

export const MAP_BACKING_SIZE = MAP_VIEWPORT.width * RENDER_SCALE;
/** Offset de dibujo entero en píxeles de respaldo (485 con el canvas actual). */
export const MAP_OFFSET_BACKING = (CANVAS_WIDTH - MAP_BACKING_SIZE) / 2;
export const MAP_OFFSET_LOGICAL = MAP_OFFSET_BACKING / RENDER_SCALE;

/**
 * Desfase exacto del área del mapa dentro del marco lógico. Se usa para
 * posicionar overlay y feedback respecto al marco; difiere del offset de
 * dibujo en menos de 0,2 px lógicos por el redondeo entero del canvas.
 */
const MAP_FRAME_OFFSET_LOGICAL = (FRAME_LOGICAL_WIDTH - MAP_VIEWPORT.width) / 2;

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
 * Grosor de la línea de UI equivalente a un píxel de arte del mapa ya escalado.
 * Es lineal respecto a la escala del marco: no hay redondeo a píxel de
 * dispositivo ni a entero, y se acepta el render fraccionario (REQ-033 T-002).
 * Entradas no finitas o no positivas caen a un valor seguro sin NaN.
 */
export function computeUiLine(tileSize: number, frameScale: number): number {
  const safeTileSize = Number.isFinite(tileSize) && tileSize > 0 ? tileSize : TILE_SIZE;
  const safeScale = Number.isFinite(frameScale) && frameScale > 0 ? frameScale : 0;
  return safeScale * (safeTileSize / TILE_SIZE);
}

/**
 * Coordenadas del mapa expresadas como porcentaje del marco completo. El HUD y
 * el feedback viven fuera del mapa, así que se posicionan respecto al marco
 * usando estos porcentajes (el mapa empieza en el 21,875 % del ancho).
 */
export function mapXToFramePercent(mapX: number): number {
  return ((MAP_FRAME_OFFSET_LOGICAL + mapX) / FRAME_LOGICAL_WIDTH) * 100;
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
