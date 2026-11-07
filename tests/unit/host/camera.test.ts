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
const ROOM_WORLD: WorldSize = { width: 20 * 32, height: 20 * 32 };
const ROOM_GRID = { width: 20, height: 20 };
// Mundo sintético mayor que el viewport en ambos ejes: permite probar el
// centrado y el clamp de los cuatro bordes sin que la sala real 20x20 los oculte.
const LARGE_WORLD: WorldSize = { width: 40 * 32, height: 30 * 32 };

describe('geometría de casillas', () => {
  it('convierte casillas a píxeles de mundo', () => {
    expect(tileToPixel(0, 0)).toEqual({ x: 0, y: 0 });
    expect(tileToPixel(3, 2)).toEqual({ x: 96, y: 64 });
  });

  it('calcula el tamaño en píxeles de la sala 20x20', () => {
    expect(gridPixelSize(ROOM_GRID)).toEqual({ width: 640, height: 640 });
  });
});

describe('límites de la cámara', () => {
  it('deja 0 px horizontales y 40 px verticales de recorrido con 960x600', () => {
    expect(cameraBounds(ROOM_WORLD, VIEWPORT)).toEqual({ maxX: 0, maxY: 40 });
  });

  it('no tiene recorrido si el mundo es menor que el viewport', () => {
    expect(cameraBounds({ width: 640, height: 480 }, VIEWPORT)).toEqual({ maxX: 0, maxY: 0 });
  });

  it('limita la cámara a los cuatro bordes', () => {
    expect(clampCamera({ x: -400, y: -220 }, LARGE_WORLD, VIEWPORT)).toEqual({ x: 0, y: 0 });
    expect(clampCamera({ x: 496, y: 100 }, LARGE_WORLD, VIEWPORT)).toEqual({ x: 320, y: 100 });
    expect(clampCamera({ x: 48, y: 420 }, LARGE_WORLD, VIEWPORT)).toEqual({ x: 48, y: 360 });
    expect(clampCamera({ x: 496, y: 420 }, LARGE_WORLD, VIEWPORT)).toEqual({ x: 320, y: 360 });
  });

  it('en la sala 20x20 la cámara no se mueve en horizontal y se limita a 40 px en vertical', () => {
    expect(clampCamera({ x: 496, y: 420 }, ROOM_WORLD, VIEWPORT)).toEqual({ x: 0, y: 40 });
  });

  it('limita las cuatro esquinas', () => {
    // Arriba-izquierda.
    expect(centerCameraOnTile({ x: 2, y: 2 }, VIEWPORT, LARGE_WORLD)).toEqual({ x: 0, y: 0 });
    // Arriba-derecha.
    expect(centerCameraOnTile({ x: 38, y: 2 }, VIEWPORT, LARGE_WORLD)).toEqual({ x: 320, y: 0 });
    // Abajo-izquierda.
    expect(centerCameraOnTile({ x: 2, y: 28 }, VIEWPORT, LARGE_WORLD)).toEqual({ x: 0, y: 360 });
    // Abajo-derecha.
    expect(centerCameraOnTile({ x: 38, y: 28 }, VIEWPORT, LARGE_WORLD)).toEqual({
      x: 320,
      y: 360,
    });
  });
});

describe('seguimiento del jugador', () => {
  it('centra al jugador cuando no hay clamp', () => {
    const camera = centerCameraOnTile({ x: 16, y: 12 }, VIEWPORT, LARGE_WORLD);

    expect(camera).toEqual({ x: 48, y: 100 });
    // El centro de la casilla cae en el centro del viewport.
    expect((16 + 0.5) * 32 - camera.x).toBe(VIEWPORT.width / 2);
    expect((12 + 0.5) * 32 - camera.y).toBe(VIEWPORT.height / 2);
  });

  it('empieza en (0,0) con el spawn (4,4)', () => {
    expect(centerCameraOnTile({ x: 4, y: 4 }, VIEWPORT, ROOM_WORLD)).toEqual({ x: 0, y: 0 });
  });

  it('se detiene en el máximo (0,40) al acercarse al borde inferior', () => {
    expect(centerCameraOnTile({ x: 18, y: 18 }, VIEWPORT, ROOM_WORLD)).toEqual({ x: 0, y: 40 });
  });

  it('queda fija en (0,0) si el mundo es menor que el viewport', () => {
    const smallWorld: WorldSize = { width: 320, height: 240 };
    expect(centerCameraOnTile({ x: 5, y: 4 }, VIEWPORT, smallWorld)).toEqual({ x: 0, y: 0 });
  });

  it('devuelve siempre coordenadas enteras', () => {
    const oddViewport: Viewport = { width: 961, height: 601 };
    const camera = centerCameraOnTile({ x: 16, y: 12 }, oddViewport, LARGE_WORLD);

    expect(Number.isInteger(camera.x)).toBe(true);
    expect(Number.isInteger(camera.y)).toBe(true);
    expect(camera).toEqual({ x: 48, y: 100 });
  });
});

describe('rango visible de tiles', () => {
  it('cubre el viewport desde el origen sin salir de la rejilla', () => {
    expect(visibleTileRange({ x: 0, y: 0 }, VIEWPORT, ROOM_GRID)).toEqual({
      minX: 0,
      minY: 0,
      maxX: 19,
      maxY: 18,
    });
  });

  it('incluye el borde inferior derecho en la posición máxima de cámara', () => {
    expect(visibleTileRange({ x: 0, y: 40 }, VIEWPORT, ROOM_GRID)).toEqual({
      minX: 0,
      minY: 1,
      maxX: 19,
      maxY: 19,
    });
  });
});
