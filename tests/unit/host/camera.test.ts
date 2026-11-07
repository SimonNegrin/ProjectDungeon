import { describe, expect, it } from 'vitest';
import { cameraBounds, centerCameraOnTile, clampCamera } from '../../../src/host/camera';
import {
  gridPixelSize,
  tileToPixel,
  visibleTileRange,
  type Viewport,
  type WorldSize,
} from '../../../src/host/geometry';

const VIEWPORT: Viewport = { width: 960, height: 600 };
const WORLD: WorldSize = { width: 32 * 32, height: 24 * 32 };
const GRID = { width: 32, height: 24 };

describe('geometría de casillas', () => {
  it('convierte casillas a píxeles de mundo', () => {
    expect(tileToPixel(0, 0)).toEqual({ x: 0, y: 0 });
    expect(tileToPixel(3, 2)).toEqual({ x: 96, y: 64 });
  });

  it('calcula el tamaño en píxeles de la sala 32x24', () => {
    expect(gridPixelSize(GRID)).toEqual({ width: 1024, height: 768 });
  });
});

describe('límites de la cámara', () => {
  it('deja 64 px horizontales y 168 px verticales de recorrido con 960x600', () => {
    expect(cameraBounds(WORLD, VIEWPORT)).toEqual({ maxX: 64, maxY: 168 });
  });

  it('no tiene recorrido si el mundo es menor que el viewport', () => {
    expect(cameraBounds({ width: 640, height: 480 }, VIEWPORT)).toEqual({ maxX: 0, maxY: 0 });
  });

  it('limita la cámara a los cuatro bordes', () => {
    expect(clampCamera({ x: -400, y: -220 }, WORLD, VIEWPORT)).toEqual({ x: 0, y: 0 });
    expect(clampCamera({ x: 496, y: 100 }, WORLD, VIEWPORT)).toEqual({ x: 64, y: 100 });
    expect(clampCamera({ x: 48, y: 420 }, WORLD, VIEWPORT)).toEqual({ x: 48, y: 168 });
    expect(clampCamera({ x: 496, y: 420 }, WORLD, VIEWPORT)).toEqual({ x: 64, y: 168 });
  });

  it('limita las cuatro esquinas', () => {
    // Arriba-izquierda: el jugador nace en (2,2).
    expect(centerCameraOnTile({ x: 2, y: 2 }, VIEWPORT, WORLD)).toEqual({ x: 0, y: 0 });
    // Arriba-derecha.
    expect(centerCameraOnTile({ x: 30, y: 2 }, VIEWPORT, WORLD)).toEqual({ x: 64, y: 0 });
    // Abajo-izquierda.
    expect(centerCameraOnTile({ x: 2, y: 22 }, VIEWPORT, WORLD)).toEqual({ x: 0, y: 168 });
    // Abajo-derecha.
    expect(centerCameraOnTile({ x: 30, y: 22 }, VIEWPORT, WORLD)).toEqual({ x: 64, y: 168 });
  });
});

describe('seguimiento del jugador', () => {
  it('centra al jugador cuando no hay clamp', () => {
    const camera = centerCameraOnTile({ x: 16, y: 12 }, VIEWPORT, WORLD);

    expect(camera).toEqual({ x: 48, y: 100 });
    // El centro de la casilla cae en el centro del viewport.
    expect((16 + 0.5) * 32 - camera.x).toBe(VIEWPORT.width / 2);
    expect((12 + 0.5) * 32 - camera.y).toBe(VIEWPORT.height / 2);
  });

  it('empieza en (0,0) con el spawn (2,2)', () => {
    expect(centerCameraOnTile({ x: 2, y: 2 }, VIEWPORT, WORLD)).toEqual({ x: 0, y: 0 });
  });

  it('se detiene en el máximo (64,168) al acercarse al borde inferior derecho', () => {
    expect(centerCameraOnTile({ x: 30, y: 22 }, VIEWPORT, WORLD)).toEqual({ x: 64, y: 168 });
  });

  it('queda fija en (0,0) si el mundo es menor que el viewport', () => {
    const smallWorld: WorldSize = { width: 320, height: 240 };
    expect(centerCameraOnTile({ x: 5, y: 4 }, VIEWPORT, smallWorld)).toEqual({ x: 0, y: 0 });
  });

  it('devuelve siempre coordenadas enteras', () => {
    const oddViewport: Viewport = { width: 961, height: 601 };
    const camera = centerCameraOnTile({ x: 16, y: 12 }, oddViewport, WORLD);

    expect(Number.isInteger(camera.x)).toBe(true);
    expect(Number.isInteger(camera.y)).toBe(true);
    expect(camera).toEqual({ x: 48, y: 100 });
  });
});

describe('rango visible de tiles', () => {
  it('cubre el viewport desde el origen sin salir de la rejilla', () => {
    expect(visibleTileRange({ x: 0, y: 0 }, VIEWPORT, GRID)).toEqual({
      minX: 0,
      minY: 0,
      maxX: 29,
      maxY: 18,
    });
  });

  it('incluye el borde inferior derecho en la posición máxima de cámara', () => {
    expect(visibleTileRange({ x: 64, y: 168 }, VIEWPORT, GRID)).toEqual({
      minX: 2,
      minY: 5,
      maxX: 31,
      maxY: 23,
    });
  });
});
