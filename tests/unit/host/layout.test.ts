import { describe, expect, it } from 'vitest';
import {
  CANVAS_HEIGHT,
  CANVAS_WIDTH,
  FRAME_LOGICAL_HEIGHT,
  FRAME_LOGICAL_WIDTH,
  MAP_BACKING_SIZE,
  MAP_OFFSET_BACKING,
  MAP_OFFSET_LOGICAL,
  MAP_VIEWPORT,
  RENDER_SCALE,
  computeFrameLayout,
  computeUiLine,
  mapHeightToFramePercent,
  mapWidthToFramePercent,
  mapXToFramePercent,
  mapYToFramePercent,
} from '../../../src/host/layout';

describe('constantes del encuadre 16:9', () => {
  it('deriva un marco lógico de 739,555…×416 y un canvas interno 2218×1248', () => {
    expect(FRAME_LOGICAL_HEIGHT).toBe(416);
    expect(FRAME_LOGICAL_WIDTH).toBeCloseTo(739.555555, 5);
    expect(RENDER_SCALE).toBe(3);
    expect(CANVAS_WIDTH).toBe(2218);
    expect(CANVAS_HEIGHT).toBe(1248);
  });

  it('define un mapa cuadrado de 13×13 tiles centrado con laterales de 485 px de respaldo', () => {
    expect(MAP_VIEWPORT).toEqual({ width: 416, height: 416 });
    expect(MAP_BACKING_SIZE).toBe(1248);
    expect(MAP_OFFSET_BACKING).toBe(485);
    expect(CANVAS_WIDTH - MAP_BACKING_SIZE - MAP_OFFSET_BACKING).toBe(MAP_OFFSET_BACKING);
  });

  it('mantiene el offset de dibujo en píxeles enteros de respaldo', () => {
    expect(Number.isInteger(MAP_OFFSET_BACKING)).toBe(true);
    expect(MAP_OFFSET_LOGICAL * RENDER_SCALE).toBe(MAP_OFFSET_BACKING);
    // La desviación interna frente a 16:9 se queda por debajo del 0,05 %.
    const internalAspect = CANVAS_WIDTH / CANVAS_HEIGHT;
    expect(Math.abs(internalAspect - 16 / 9) / (16 / 9)).toBeLessThan(0.0005);
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

describe('grosor de línea de la UI', () => {
  it('es lineal respecto a la escala del marco, sin redondeo ni dpr', () => {
    expect(computeUiLine(32, 1)).toBe(1);
    expect(computeUiLine(32, 0.5)).toBe(0.5);
    expect(computeUiLine(32, 1.25)).toBe(1.25);
    expect(computeUiLine(32, 1.596153846)).toBeCloseTo(1.596153846, 10);
    // La firma ya no acepta dpr: solo tile y escala.
    expect(computeUiLine.length).toBe(2);
  });

  it('acepta valores fraccionarios y no los cuantiza a píxeles enteros', () => {
    const line = computeUiLine(32, 488.25 / 416);
    expect(Number.isInteger(line)).toBe(false);
    expect(line).toBeCloseTo(488.25 / 416, 10);
    expect(computeUiLine(32, 664 / 416)).not.toBe(computeUiLine(32, 665 / 416));
  });

  it('dos escalas cercanas producen valores cercanos y proporcionales', () => {
    const a = computeUiLine(32, 1.2);
    const b = computeUiLine(32, 1.2001);
    expect(b - a).toBeCloseTo(0.0001, 10);
    expect(b).toBeGreaterThan(a);
    expect(computeUiLine(32, 2) / computeUiLine(32, 1)).toBeCloseTo(2, 10);
  });

  it('escala con el tamaño de tile además de con la escala del marco', () => {
    expect(computeUiLine(64, 1)).toBe(2);
    expect(computeUiLine(16, 1)).toBe(0.5);
    expect(computeUiLine(48, 1.5)).toBeCloseTo(2.25, 10);
  });

  it('usa un fallback finito y seguro con entradas degeneradas', () => {
    const cases: Array<[number, number, number]> = [
      [0, 1, 1],
      [-32, 1, 1],
      [32, -1, 0],
      [32, Number.NaN, 0],
      [32, 0, 0],
      [Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY, 0],
    ];

    for (const [tileSize, scale, expected] of cases) {
      const line = computeUiLine(tileSize, scale);
      expect(Number.isFinite(line)).toBe(true);
      expect(line).toBeGreaterThanOrEqual(0);
      expect(line).toBe(expected);
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

  it('mide una casilla de 32 px como 4,3269… % horizontal y 7,6923… % vertical', () => {
    expect(mapWidthToFramePercent(32)).toBeCloseTo(4.3269230769, 8);
    expect(mapHeightToFramePercent(32)).toBeCloseTo(100 / 13, 10);
    expect(mapYToFramePercent(32)).toBeCloseTo(100 / 13, 10);
  });
});
