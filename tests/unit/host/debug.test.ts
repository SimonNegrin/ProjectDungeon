import { describe, expect, it } from 'vitest';
import type { Camera } from '../../../src/host/camera';
import {
  cursorAtPlayer,
  deriveCursorStatus,
} from '../../../src/host/cursor';
import { createDebugApi } from '../../../src/host/debug';
import { planDecoration, summarizeDecoration } from '../../../src/host/floor';
import { GameSession } from '../../../src/host/session';
import { makeState } from '../game/helpers';

function setup() {
  const session = new GameSession(makeState());
  let camera: Camera = { x: 0, y: 0 };
  let lastEvents: ReturnType<GameSession['dispatch']>['events'] = [];
  const cursor = cursorAtPlayer(session.state.players[0]);

  const api = createDebugApi(
    () => ({
      state: session.state,
      camera,
      bounds: { maxX: 224, maxY: 224 },
      viewport: { width: 416, height: 416 },
      tileSize: 32,
      assetsLoaded: true,
      lastEvents,
      cursor: deriveCursorStatus(session.state, cursor),
    }),
    (command) => {
      const result = session.dispatch(command);
      lastEvents = result.events;
      camera = { x: 1, y: 2 };
      return result;
    },
  );

  return api;
}

function generatedSetup() {
  const session = new GameSession({ seed: 279837264 });
  let camera: Camera = { x: 0, y: 64 };
  let lastEvents: ReturnType<GameSession['dispatch']>['events'] = [];
  const cursor = cursorAtPlayer(session.state.players[0]);

  const api = createDebugApi(
    () => ({
      state: session.state,
      camera,
      bounds: { maxX: 608, maxY: 608 },
      viewport: { width: 416, height: 416 },
      tileSize: 32,
      assetsLoaded: true,
      lastEvents,
      cursor: deriveCursorStatus(session.state, cursor),
    }),
    (command) => {
      const result = session.dispatch(command);
      lastEvents = result.events;
      const player = result.state.players[0];
      camera = {
        x: Math.max(0, Math.round((player.x + 0.5) * 32 - 208)),
        y: Math.max(0, Math.round((player.y + 0.5) * 32 - 208)),
      };
      return result;
    },
  );

  return api;
}

describe('API de debug window.__game', () => {
  it('expone un snapshot serializable con cámara, viewport y últimos eventos', () => {
    const api = setup();

    const snapshot = api.snapshot();

    expect(snapshot.players[0]).toMatchObject({ id: 'player-1', x: 4, y: 4 });
    expect(snapshot.enemies[0]).toMatchObject({ id: 'enemy-1', x: 15, y: 15 });
    expect(snapshot.seed).toBeNull();
    expect(snapshot.rooms).toEqual([]);
    expect(snapshot.corridors).toEqual([]);
    expect(snapshot.doors).toEqual([]);
    expect(snapshot.spawns).toBeNull();
    expect(snapshot.decoration).toEqual([]);
    expect(snapshot.camera).toEqual({ x: 0, y: 0, maxX: 224, maxY: 224 });
    expect(snapshot.viewport).toEqual({ width: 416, height: 416 });
    expect(snapshot.tileSize).toBe(32);
    expect(snapshot.assetsLoaded).toBe(true);
    expect(snapshot.lastEvents).toEqual([]);
    expect(snapshot.cursor).toEqual({
      x: 4,
      y: 4,
      visible: true,
      kind: 'player',
      state: 'player',
      path: [],
    });
    expect(() => JSON.stringify(snapshot)).not.toThrow();
  });

  it('expone el estado de presentación y un avance determinista del reloj', () => {
    let advanced = 0;
    const animation = {
      animating: true,
      step: 1,
      totalSteps: 3,
      unitId: 'player-1',
      position: { x: 80, y: 96, tileX: 2, tileY: 3 },
      camera: { x: 16, y: 32 },
    } as const;
    const api = createDebugApi(
      () => ({
        state: makeState(),
        camera: { x: 0, y: 0 },
        bounds: { maxX: 224, maxY: 224 },
        viewport: { width: 416, height: 416 },
        tileSize: 32,
        assetsLoaded: true,
        lastEvents: [],
        cursor: deriveCursorStatus(makeState(), { x: 4, y: 4 }),
        animation,
      }),
      (command) => new GameSession(makeState()).dispatch(command),
      (ms) => {
        advanced += ms;
      },
    );

    expect(api.snapshot().animation).toEqual(animation);

    const after = api.advance(250);
    expect(advanced).toBe(250);
    expect(after.animation).toEqual(animation);
    expect(() => JSON.stringify(after)).not.toThrow();
  });

  it('sin animación el snapshot informa de presentación inactiva', () => {
    const snapshot = setup().snapshot();

    expect(snapshot.animation).toEqual({
      animating: false,
      step: 0,
      totalSteps: 0,
      unitId: null,
      position: null,
      camera: { x: 0, y: 0 },
    });
  });

  it('dispatch aplica el comando y devuelve snapshot y eventos serializables', () => {
    const api = setup();

    const result = api.dispatch({ type: 'Move', unitId: 'player-1', dx: 1, dy: 0 });

    expect(result.events).toHaveLength(1);
    expect(result.events[0]).toMatchObject({ type: 'UnitMoved', mpLeft: 5 });
    expect(result.snapshot.players[0]).toMatchObject({ x: 5, y: 4, mp: 5 });
    expect(result.snapshot.camera).toMatchObject({ x: 1, y: 2 });
    expect(result.snapshot.lastEvents).toEqual(result.events);
    expect(result.snapshot.cursor).toMatchObject({
      x: 4,
      y: 4,
      visible: true,
      kind: 'floor',
      state: 'reachable',
    });
    expect(result.snapshot.cursor.path).toEqual([{ x: 4, y: 4 }]);
    expect(() => JSON.stringify(result)).not.toThrow();
  });

  it('dispatch acepta MoveTo y devuelve snapshot y eventos serializables', () => {
    const api = generatedSetup();

    const result = api.dispatch({
      type: 'MoveTo',
      unitId: 'player-1',
      target: { x: 8, y: 8 },
    });

    expect(result.events.every((event) => event.type === 'UnitMoved')).toBe(true);
    expect(result.events).toHaveLength(2);
    expect(result.snapshot.players[0]).toMatchObject({ x: 8, y: 8, mp: 4 });
    expect(result.snapshot.cursor).toMatchObject({ x: 6, y: 8 });
    expect(() => JSON.stringify(result)).not.toThrow();
  });

  it('un comando rechazado devuelve CommandRejected sin lanzar', () => {
    const api = setup();
    const before = api.snapshot();

    const result = api.dispatch({
      type: 'Attack',
      unitId: 'player-1',
      targetId: 'enemy-1',
    });

    expect(result.events).toEqual([
      {
        type: 'CommandRejected',
        commandType: 'Attack',
        reason: 'target-not-adjacent',
      },
    ]);
    expect(result.snapshot.players).toEqual(before.players);
    expect(result.snapshot.enemies).toEqual(before.enemies);
    expect(result.snapshot.phase).toBe(before.phase);
    expect(result.snapshot.status).toBe(before.status);
  });

  it('el snapshot es una copia y no expone el estado vivo', () => {
    const api = setup();
    const snapshot = api.snapshot();
    const mutable = snapshot.players[0] as { x: number };
    mutable.x = 999;

    expect(api.snapshot().players[0].x).toBe(4);
  });
});

describe('snapshot del mapa generado', () => {
  it('expone semilla, salas, corredores, huecos y spawns', () => {
    const api = generatedSetup();

    const snapshot = api.snapshot();

    expect(snapshot.seed).toBe(279837264);
    expect(snapshot.grid).toMatchObject({ width: 32, height: 32 });
    expect(snapshot.grid.tiles).toHaveLength(32 * 32);
    expect(snapshot.rooms).toHaveLength(9);
    expect(snapshot.corridors).toHaveLength(10);
    expect(snapshot.doors).toHaveLength(18);
    expect(snapshot.spawns).toEqual({
      player: { x: 6, y: 8 },
      enemy: { x: 23, y: 28 },
      distance: 59,
    });
    expect(snapshot.rooms[0]).toMatchObject({ id: 0, x: 3, y: 4, width: 7, height: 9, role: 'large' });
    expect(snapshot.corridors.some((corridor) => corridor.width === 2)).toBe(true);
    expect(snapshot.doors.every((door) => door.orientation === 'horizontal' || door.orientation === 'vertical')).toBe(
      true,
    );
  });

  it('el snapshot completo sobrevive a un round-trip JSON', () => {
    const api = generatedSetup();
    const snapshot = api.snapshot();

    const roundTrip = JSON.parse(JSON.stringify(snapshot));

    expect(roundTrip.seed).toBe(snapshot.seed);
    expect(roundTrip.rooms).toEqual(snapshot.rooms);
    expect(roundTrip.corridors).toEqual(snapshot.corridors);
    expect(roundTrip.doors).toEqual(snapshot.doors);
    expect(roundTrip.spawns).toEqual(snapshot.spawns);
    expect(roundTrip.grid.tiles).toEqual(snapshot.grid.tiles);
    expect(roundTrip.cursor).toEqual(snapshot.cursor);
    expect(roundTrip.cursor).toMatchObject({ x: 6, y: 8, state: 'player' });
  });

  it('no expone el mapa vivo: mutar salas o spawns del snapshot no lo altera', () => {
    const api = generatedSetup();
    api.dispatch({ type: 'MoveTo', unitId: 'player-1', target: { x: 8, y: 8 } });
    const snapshot = api.snapshot();

    (snapshot.rooms[0] as { x: number }).x = 999;
    (snapshot.spawns!.player as { x: number }).x = 999;
    (snapshot.corridors[0].path[0] as { x: number }).x = 999;
    (snapshot.cursor.path[0] as { x: number }).x = 999;

    const fresh = api.snapshot();
    expect(fresh.rooms[0].x).toBe(3);
    expect(fresh.spawns?.player.x).toBe(6);
    expect(fresh.corridors[0].path[0].x).toBe(4);
    expect(fresh.cursor.path[0]).toEqual({ x: 7, y: 8 });
  });

  it('expone un resumen determinista de decoración que coincide con el render', () => {
    const api = generatedSetup();
    const map = new GameSession({ seed: 279837264 }).state.map;
    if (!map) throw new Error('La semilla de referencia debe generar mapa');

    const first = api.snapshot();
    const second = api.snapshot();

    expect(first.decoration).toEqual(second.decoration);
    expect(first.decoration).toEqual(
      summarizeDecoration(planDecoration(map)),
    );
    expect(first.decoration.length).toBeGreaterThan(0);
    for (const entry of first.decoration) {
      expect(Object.keys(entry).sort()).toEqual(['area', 'type', 'x', 'y']);
      expect(entry.area === 'room' || entry.area === 'corridor').toBe(true);
      expect(typeof entry.type).toBe('string');
    }
  });

  it('mutar el resumen de decoración no altera el estado ni el siguiente snapshot', () => {
    const api = generatedSetup();
    const snapshot = api.snapshot();
    const mutable = snapshot.decoration[0] as { x: number; type: string };
    mutable.x = 999;
    mutable.type = 'mutado';

    const fresh = api.snapshot();
    expect(fresh.decoration[0].x).not.toBe(999);
    expect(fresh.decoration[0].type).not.toBe('mutado');
  });

  it('dispatch de reinicio conserva semilla y mapa en el snapshot', () => {
    const api = generatedSetup();
    const before = api.snapshot();

    const result = api.dispatch({ type: 'Restart' });

    expect(result.events).toEqual([{ type: 'GameRestarted' }]);
    expect(result.snapshot.seed).toBe(before.seed);
    expect(result.snapshot.rooms).toEqual(before.rooms);
    expect(result.snapshot.spawns).toEqual(before.spawns);
  });
});
