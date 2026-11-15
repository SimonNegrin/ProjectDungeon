import { describe, expect, it } from 'vitest';
import { cameraBounds, centerCameraOnTile, clampCamera } from '../../../src/host/camera';
import {
  CAMERA_PAN_MS,
  cameraPanAt,
  interpolateCamera,
  planCameraTransition,
  type CameraTurn,
} from '../../../src/host/camera-pan';
import {
  gridPixelSize,
  tileToPixel,
  visibleTileRange,
  type Viewport,
  type WorldSize,
} from '../../../src/host/geometry';
import { makeState, makeUnit } from '../game/helpers';

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

describe('paneo de cámara del relevo', () => {
  function twoPlayers(activePlayerId = 'player-1', round = 1) {
    return makeState({
      players: [
        makeUnit({ id: 'player-1', faction: 'player', x: 2, y: 2 }),
        makeUnit({ id: 'player-2', faction: 'player', x: 17, y: 17 }),
      ],
      activePlayerId,
      round,
    });
  }

  function plan(
    previous: CameraTurn | null,
    finalState: ReturnType<typeof twoPlayers>,
    camera = { x: 0, y: 0 },
    reducedMotion = false,
  ) {
    return planCameraTransition({
      previous,
      finalState,
      camera,
      viewport: VIEWPORT,
      world: gridPixelSize(finalState.grid),
      reducedMotion,
    });
  }

  const P1_CAMERA = { x: 0, y: 0 };
  const P2_CAMERA = { x: 224, y: 224 };

  it('apunta al activo final y usa players[0] como respaldo', () => {
    const finalState = twoPlayers('player-2');

    expect(plan(null, finalState, P1_CAMERA)).toMatchObject({
      playerId: 'player-2',
      to: P2_CAMERA,
    });

    const fallback = plan(null, twoPlayers('no-existe'), P1_CAMERA);
    expect(fallback.playerId).toBe('player-1');
    expect(fallback.to).toEqual(P1_CAMERA);
  });

  it('en ronda 1 arranca directo y sin cambio de turno no hay transición', () => {
    const state = twoPlayers();

    expect(plan(null, state, P1_CAMERA)).toMatchObject({
      kind: 'jump',
      durationMs: 0,
      from: P1_CAMERA,
      to: P1_CAMERA,
    });
    expect(
      plan({ activePlayerId: 'player-1', round: 1 }, state, P1_CAMERA),
    ).toMatchObject({
      kind: 'none',
      durationMs: 0,
    });
  });

  it('con dos jugadores el relevo hace un paneo de 300 ms hasta el siguiente', () => {
    const transition = plan(
      { activePlayerId: 'player-1', round: 1 },
      twoPlayers('player-2'),
      P1_CAMERA,
    );

    expect(transition).toMatchObject({
      kind: 'pan',
      durationMs: CAMERA_PAN_MS,
      from: P1_CAMERA,
      to: P2_CAMERA,
      playerId: 'player-2',
    });
    expect(CAMERA_PAN_MS).toBe(300);
  });

  it('la vuelta tras la fase enemiga panea al primer jugador en ronda 2', () => {
    const transition = plan(
      { activePlayerId: 'player-2', round: 1 },
      twoPlayers('player-1', 2),
      P2_CAMERA,
    );

    expect(transition).toMatchObject({
      kind: 'pan',
      durationMs: CAMERA_PAN_MS,
      from: P2_CAMERA,
      to: P1_CAMERA,
      playerId: 'player-1',
    });
  });

  it('con un solo jugador no hay paneo de relevo y la cámara vuelve a él', () => {
    const state = makeState({
      players: [makeUnit({ id: 'player-1', faction: 'player', x: 2, y: 2 })],
      activePlayerId: 'player-1',
      round: 2,
    });

    expect(
      plan({ activePlayerId: 'player-1', round: 1 }, state, P1_CAMERA),
    ).toMatchObject({
      kind: 'jump',
      durationMs: 0,
      to: P1_CAMERA,
      playerId: 'player-1',
    });
  });

  it('con movimiento reducido el cambio salta sin animación', () => {
    expect(
      plan(
        { activePlayerId: 'player-1', round: 1 },
        twoPlayers('player-2'),
        P1_CAMERA,
        true,
      ),
    ).toMatchObject({
      kind: 'jump',
      durationMs: 0,
      to: P2_CAMERA,
    });
  });

  it('si el destino ya es la cámara actual salta sin paneo', () => {
    const state = makeState({
      players: [
        makeUnit({ id: 'player-1', faction: 'player', x: 2, y: 2 }),
        makeUnit({ id: 'player-2', faction: 'player', x: 3, y: 2 }),
      ],
      activePlayerId: 'player-2',
    });

    expect(
      plan({ activePlayerId: 'player-1', round: 1 }, state, { x: 0, y: 0 }),
    ).toMatchObject({
      kind: 'jump',
      durationMs: 0,
      to: { x: 0, y: 0 },
    });
  });

  it('interpola en línea recta con redondeo a píxel entero', () => {
    const transition = {
      from: { x: 0, y: 0 },
      to: { x: 320, y: 320 },
      durationMs: CAMERA_PAN_MS,
    };

    expect(cameraPanAt(transition, -50)).toEqual({ x: 0, y: 0 });
    expect(cameraPanAt(transition, 0)).toEqual({ x: 0, y: 0 });
    expect(cameraPanAt(transition, 150)).toEqual({ x: 160, y: 160 });
    expect(cameraPanAt(transition, 300)).toEqual({ x: 320, y: 320 });
    expect(cameraPanAt(transition, 600)).toEqual({ x: 320, y: 320 });
    expect(interpolateCamera({ x: 0, y: 0 }, { x: 100, y: 50 }, 1 / 3)).toEqual({
      x: 33,
      y: 17,
    });
    expect(
      cameraPanAt({ from: { x: 0, y: 0 }, to: { x: 9, y: 9 }, durationMs: 0 }, 0),
    ).toEqual({ x: 9, y: 9 });
  });
});
