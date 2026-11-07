import { describe, expect, it } from 'vitest';
import {
  CANVAS_HEIGHT,
  CANVAS_WIDTH,
  FRAME_LOGICAL_HEIGHT,
  FRAME_LOGICAL_WIDTH,
  MAP_BACKING_SIZE,
  MAP_OFFSET_BACKING,
  MAP_VIEWPORT,
  RENDER_SCALE,
  computeFrameLayout,
  mapHeightToFramePercent,
  mapWidthToFramePercent,
  mapXToFramePercent,
  mapYToFramePercent,
} from '../../../src/host/layout';

describe('constantes del encuadre 16:9', () => {
  it('deriva un marco lógico de 682,666…×384 y un canvas interno 2048×1152', () => {
    expect(FRAME_LOGICAL_HEIGHT).toBe(384);
    expect(FRAME_LOGICAL_WIDTH).toBeCloseTo(682.666666, 5);
    expect(RENDER_SCALE).toBe(3);
    expect(CANVAS_WIDTH).toBe(2048);
    expect(CANVAS_HEIGHT).toBe(1152);
  });

  it('define un mapa cuadrado de 12×12 tiles centrado con laterales de 448 px de respaldo', () => {
    expect(MAP_VIEWPORT).toEqual({ width: 384, height: 384 });
    expect(MAP_BACKING_SIZE).toBe(1152);
    expect(MAP_OFFSET_BACKING).toBe(448);
    expect(CANVAS_WIDTH - MAP_BACKING_SIZE - MAP_OFFSET_BACKING).toBe(MAP_OFFSET_BACKING);
  });
});

describe('layout de presentación', () => {
  it('llena un espacio 16:9 exacto sin bandas', () => {
    const layout = computeFrameLayout(1920, 1080);

    expect(layout.scale).toBeCloseTo(1920 / FRAME_LOGICAL_WIDTH, 10);
    expect(layout.width).toBeCloseTo(1920, 10);
    expect(layout.height).toBeCloseTo(1080, 10);
    expect(layout.left).toBeCloseTo(0, 10);
    expect(layout.top).toBeCloseTo(0, 10);
    expect(layout.width / layout.height).toBeCloseTo(16 / 9, 10);
  });

  it('añade bandas arriba y abajo cuando el espacio es más alto que 16:9', () => {
    const layout = computeFrameLayout(1000, 1000);

    expect(layout.width).toBeCloseTo(1000, 10);
    expect(layout.height).toBeCloseTo(562.5, 10);
    expect(layout.left).toBeCloseTo(0, 10);
    expect(layout.top).toBeCloseTo(218.75, 10);
    expect(layout.width / layout.height).toBeCloseTo(16 / 9, 10);
  });

  it('añade bandas a los lados cuando el espacio es más ancho que 16:9', () => {
    const layout = computeFrameLayout(1600, 600);

    expect(layout.width).toBeCloseTo((600 * 16) / 9, 10);
    expect(layout.height).toBeCloseTo(600, 10);
    expect(layout.left).toBeCloseTo((1600 - (600 * 16) / 9) / 2, 10);
    expect(layout.top).toBeCloseTo(0, 10);
    expect(layout.width / layout.height).toBeCloseTo(16 / 9, 10);
  });

  it('nunca se sale del espacio disponible', () => {
    for (const [width, height] of [
      [1280, 720],
      [800, 600],
      [320, 900],
      [5000, 300],
    ]) {
      const layout = computeFrameLayout(width, height);
      expect(layout.width).toBeLessThanOrEqual(width);
      expect(layout.height).toBeLessThanOrEqual(height);
      expect(layout.left).toBeGreaterThanOrEqual(0);
      expect(layout.top).toBeGreaterThanOrEqual(0);
      expect(layout.left + layout.width).toBeLessThanOrEqual(width);
      expect(layout.top + layout.height).toBeLessThanOrEqual(height);
    }
  });

  it('devuelve un marco vacío sin NaN ni división por cero con entradas degeneradas', () => {
    for (const [width, height] of [
      [0, 0],
      [-100, 200],
      [Number.NaN, 100],
      [100, Number.POSITIVE_INFINITY],
    ]) {
      const layout = computeFrameLayout(width, height);
      expect(layout).toEqual({ left: 0, top: 0, width: 0, height: 0, scale: 0 });
      expect(Number.isNaN(layout.left)).toBe(false);
      expect(Number.isNaN(layout.top)).toBe(false);
      expect(Number.isNaN(layout.width)).toBe(false);
      expect(Number.isNaN(layout.height)).toBe(false);
    }
  });
});

describe('porcentajes del feedback respecto al mapa', () => {
  it('sitúa el borde izquierdo del mapa en 21,875 % del marco', () => {
    expect(mapXToFramePercent(0)).toBeCloseTo(21.875, 10);
  });

  it('sitúa el borde derecho del mapa en 78,125 % del marco', () => {
    expect(mapXToFramePercent(MAP_VIEWPORT.width)).toBeCloseTo(78.125, 10);
  });

  it('mide una casilla de 32 px como 4,6875 % horizontal y 8,333… % vertical', () => {
    expect(mapWidthToFramePercent(32)).toBeCloseTo(4.6875, 10);
    expect(mapHeightToFramePercent(32)).toBeCloseTo(100 / 12, 10);
    expect(mapYToFramePercent(32)).toBeCloseTo(100 / 12, 10);
  });
});
