import { describe, expect, it } from 'vitest';
import type { Camera } from '../../../src/host/camera';
import { createDebugApi } from '../../../src/host/debug';
import { GameSession } from '../../../src/host/session';
import { makeState } from '../game/helpers';

function setup() {
  const session = new GameSession(makeState());
  let camera: Camera = { x: 0, y: 0 };
  let lastEvents: ReturnType<GameSession['dispatch']>['events'] = [];

  const api = createDebugApi(
    () => ({
      state: session.state,
      camera,
      bounds: { maxX: 256, maxY: 256 },
      viewport: { width: 384, height: 384 },
      tileSize: 32,
      assetsLoaded: true,
      lastEvents,
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

describe('API de debug window.__game', () => {
  it('expone un snapshot serializable con cámara, viewport y últimos eventos', () => {
    const api = setup();

    const snapshot = api.snapshot();

    expect(snapshot.players[0]).toMatchObject({ id: 'player-1', x: 4, y: 4 });
    expect(snapshot.enemies[0]).toMatchObject({ id: 'enemy-1', x: 15, y: 15 });
    expect(snapshot.camera).toEqual({ x: 0, y: 0, maxX: 256, maxY: 256 });
    expect(snapshot.viewport).toEqual({ width: 384, height: 384 });
    expect(snapshot.tileSize).toBe(32);
    expect(snapshot.assetsLoaded).toBe(true);
    expect(snapshot.lastEvents).toEqual([]);
    expect(() => JSON.stringify(snapshot)).not.toThrow();
  });

  it('dispatch aplica el comando y devuelve snapshot y eventos serializables', () => {
    const api = setup();

    const result = api.dispatch({ type: 'Move', unitId: 'player-1', dx: 1, dy: 0 });

    expect(result.events).toHaveLength(1);
    expect(result.events[0]).toMatchObject({ type: 'UnitMoved', mpLeft: 5 });
    expect(result.snapshot.players[0]).toMatchObject({ x: 5, y: 4, mp: 5 });
    expect(result.snapshot.camera).toMatchObject({ x: 1, y: 2 });
    expect(result.snapshot.lastEvents).toEqual(result.events);
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
