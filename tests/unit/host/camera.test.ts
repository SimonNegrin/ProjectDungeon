import { describe, expect, it } from 'vitest';
import { cameraBounds, centerCameraOnTile, clampCamera } from '../../../src/host/camera';
import {
  gridPixelSize,
  tileToPixel,
  visibleTileRange,
  type Viewport,
  type WorldSize,
} from '../../../src/host/geometry';

const VIEWPORT: Viewport = { width: 416, height: 416 };
const ROOM_WORLD: WorldSize = { width: 20 * 32, height: 20 * 32 };
const ROOM_GRID = { width: 20, height: 20 };
// Mundo real del mapa generado: 32×32 tiles de 32 px.
const MAP_GRID = { width: 32, height: 32 };
const MAP_WORLD: WorldSize = { width: 32 * 32, height: 32 * 32 };
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
  it('deja 224 px de recorrido en ambos ejes con viewport 416x416 y mundo 640x640', () => {
    expect(cameraBounds(ROOM_WORLD, VIEWPORT)).toEqual({ maxX: 224, maxY: 224 });
  });

  it('no tiene recorrido si el mundo es menor que el viewport', () => {
    expect(cameraBounds({ width: 320, height: 240 }, VIEWPORT)).toEqual({ maxX: 0, maxY: 0 });
  });

  it('limita la cámara a los cuatro bordes', () => {
    expect(clampCamera({ x: -400, y: -220 }, LARGE_WORLD, VIEWPORT)).toEqual({ x: 0, y: 0 });
    expect(clampCamera({ x: 999, y: 100 }, LARGE_WORLD, VIEWPORT)).toEqual({ x: 864, y: 100 });
    expect(clampCamera({ x: 48, y: 999 }, LARGE_WORLD, VIEWPORT)).toEqual({ x: 48, y: 544 });
    expect(clampCamera({ x: 999, y: 999 }, LARGE_WORLD, VIEWPORT)).toEqual({ x: 864, y: 544 });
  });

  it('en la sala 20x20 la cámara se limita a 224 px en ambos ejes', () => {
    expect(clampCamera({ x: 999, y: 999 }, ROOM_WORLD, VIEWPORT)).toEqual({ x: 224, y: 224 });
  });

  it('el mapa 32x32 mide 1024 px y deja 608 px de recorrido', () => {
    expect(gridPixelSize(MAP_GRID)).toEqual({ width: 1024, height: 1024 });
    expect(cameraBounds(MAP_WORLD, VIEWPORT)).toEqual({ maxX: 608, maxY: 608 });
  });

  it('limita la cámara a los cuatro bordes del mapa 32x32', () => {
    expect(clampCamera({ x: -1, y: -1 }, MAP_WORLD, VIEWPORT)).toEqual({ x: 0, y: 0 });
    expect(clampCamera({ x: 609, y: 0 }, MAP_WORLD, VIEWPORT)).toEqual({ x: 608, y: 0 });
    expect(clampCamera({ x: 0, y: 609 }, MAP_WORLD, VIEWPORT)).toEqual({ x: 0, y: 608 });
    expect(clampCamera({ x: 10000, y: 10000 }, MAP_WORLD, VIEWPORT)).toEqual({
      x: 608,
      y: 608,
    });
  });

  it('limita las cuatro esquinas', () => {
    // Arriba-izquierda.
    expect(centerCameraOnTile({ x: 2, y: 2 }, VIEWPORT, LARGE_WORLD)).toEqual({ x: 0, y: 0 });
    // Arriba-derecha.
    expect(centerCameraOnTile({ x: 38, y: 2 }, VIEWPORT, LARGE_WORLD)).toEqual({ x: 864, y: 0 });
    // Abajo-izquierda.
    expect(centerCameraOnTile({ x: 2, y: 28 }, VIEWPORT, LARGE_WORLD)).toEqual({ x: 0, y: 544 });
    // Abajo-derecha.
    expect(centerCameraOnTile({ x: 38, y: 28 }, VIEWPORT, LARGE_WORLD)).toEqual({
      x: 864,
      y: 544,
    });
  });
});

describe('seguimiento del jugador', () => {
  it('centra al jugador cuando no hay clamp', () => {
    const camera = centerCameraOnTile({ x: 16, y: 12 }, VIEWPORT, LARGE_WORLD);

    expect(camera).toEqual({ x: 320, y: 192 });
    // El centro de la casilla cae en el centro del viewport.
    expect((16 + 0.5) * 32 - camera.x).toBe(VIEWPORT.width / 2);
    expect((12 + 0.5) * 32 - camera.y).toBe(VIEWPORT.height / 2);
  });

  it('la cámara centrada cae siempre en múltiplos de 32 px', () => {
    for (const tile of [
      { x: 6, y: 8 },
      { x: 9, y: 11 },
      { x: 16, y: 12 },
      { x: 16, y: 16 },
    ]) {
      const camera = centerCameraOnTile(tile, VIEWPORT, LARGE_WORLD);
      expect(camera.x % 32).toBe(0);
      expect(camera.y % 32).toBe(0);
    }
  });

  it('empieza en (0,0) con el spawn (4,4)', () => {
    expect(centerCameraOnTile({ x: 4, y: 4 }, VIEWPORT, ROOM_WORLD)).toEqual({ x: 0, y: 0 });
  });

  it('centra el spawn (6,8) del mapa generado en (0,64)', () => {
    expect(centerCameraOnTile({ x: 6, y: 8 }, VIEWPORT, MAP_WORLD)).toEqual({ x: 0, y: 64 });
  });

  it('centra al jugador lejos de los bordes del mapa 32x32', () => {
    const camera = centerCameraOnTile({ x: 16, y: 16 }, VIEWPORT, MAP_WORLD);

    expect(camera).toEqual({ x: 320, y: 320 });
    expect((16 + 0.5) * 32 - camera.x).toBe(VIEWPORT.width / 2);
    expect((16 + 0.5) * 32 - camera.y).toBe(VIEWPORT.height / 2);
  });

  it('se detiene en el máximo (224,224) al acercarse al borde inferior derecho', () => {
    expect(centerCameraOnTile({ x: 18, y: 18 }, VIEWPORT, ROOM_WORLD)).toEqual({
      x: 224,
      y: 224,
    });
  });

  it('queda fija en (0,0) si el mundo es menor que el viewport', () => {
    const smallWorld: WorldSize = { width: 320, height: 240 };
    expect(centerCameraOnTile({ x: 5, y: 4 }, VIEWPORT, smallWorld)).toEqual({ x: 0, y: 0 });
  });

  it('devuelve siempre coordenadas enteras', () => {
    const oddViewport: Viewport = { width: 385, height: 385 };
    const camera = centerCameraOnTile({ x: 16, y: 12 }, oddViewport, LARGE_WORLD);

    expect(Number.isInteger(camera.x)).toBe(true);
    expect(Number.isInteger(camera.y)).toBe(true);
    expect(camera).toEqual({ x: 336, y: 208 });
  });
});

describe('rango visible de tiles', () => {
  it('muestra exactamente 13x13 tiles desde el origen sin salir de la rejilla', () => {
    expect(visibleTileRange({ x: 0, y: 0 }, VIEWPORT, ROOM_GRID)).toEqual({
      minX: 0,
      minY: 0,
      maxX: 12,
      maxY: 12,
    });
  });

  it('mantiene 13x13 tiles en la posición máxima de cámara', () => {
    expect(visibleTileRange({ x: 224, y: 224 }, VIEWPORT, ROOM_GRID)).toEqual({
      minX: 7,
      minY: 7,
      maxX: 19,
      maxY: 19,
    });
  });

  it('muestra exactamente 13x13 tiles en el arranque y en el máximo del mapa 32x32', () => {
    // Con la cámara centrada en múltiplos de 32, el `ceil` coincide con el
    // borde del tile y el rango es 13 columnas/filas exactas, sin medios tiles.
    expect(visibleTileRange({ x: 0, y: 64 }, VIEWPORT, MAP_GRID)).toEqual({
      minX: 0,
      minY: 2,
      maxX: 12,
      maxY: 14,
    });
    expect(visibleTileRange({ x: 608, y: 608 }, VIEWPORT, MAP_GRID)).toEqual({
      minX: 19,
      minY: 19,
      maxX: 31,
      maxY: 31,
    });
  });

  it('conserva 13x13 tiles en los cuatro bordes del mapa 32x32', () => {
    for (const camera of [
      { x: 0, y: 0 },
      { x: 608, y: 0 },
      { x: 0, y: 608 },
      { x: 608, y: 608 },
    ]) {
      const range = visibleTileRange(camera, VIEWPORT, MAP_GRID);
      expect(range.maxX - range.minX + 1).toBe(13);
      expect(range.maxY - range.minY + 1).toBe(13);
    }
  });
});
