import { describe, expect, it } from 'vitest';
import {
  detectEnemiesAfterStep,
  reduce,
  type GameEvent,
  type GameState,
} from '../../../src/game/index';
import { buildMotionTimeline } from '../../../src/host/motion';
import {
  activeSpotMarkers,
  reconcileSpottedUnits,
  trackSpottedUnits,
} from '../../../src/host/spot';
import { makeGridWithWalls, makeState, makeUnit } from '../game/helpers';

function sentinel(id: string, x: number, y: number, awareness: 'dormant' | 'alert' | 'returning' = 'dormant') {
  return makeUnit({
    id,
    faction: 'enemy',
    enemyType: 'sentinel',
    x,
    y,
    awareness,
  });
}

function playerAt(x: number, y: number) {
  return makeUnit({ id: 'player-1', faction: 'player', x, y });
}

describe('feedback "!" de detección', () => {
  it('se activa con EnemySpotted en el paso que cruza la vista, no al cerrar el turno', () => {
    const state = makeState({
      players: [playerAt(4, 5)],
      enemies: [sentinel('enemy-1', 11, 5)],
    });

    const result = reduce(state, {
      type: 'MoveTo',
      unitId: 'player-1',
      target: { x: 7, y: 5 },
    });
    const timeline = buildMotionTimeline(result.events);

    expect(result.events.map((event) => event.type)).toEqual([
      'UnitMoved',
      'EnemySpotted',
      'AlarmRaised',
      'UnitMoved',
      'UnitMoved',
    ]);
    const spot = timeline.events.find((entry) => entry.event.type === 'EnemySpotted');
    expect(spot?.event).toMatchObject({
      unitId: 'enemy-1',
      playerId: 'player-1',
      step: { x: 5, y: 5 },
    });
    // El aviso se sitúa al terminar el primer paso y antes de empezar el segundo.
    expect(spot!.atMs).toBe(timeline.steps[0].pauseEndMs);
    expect(spot!.atMs).toBe(timeline.steps[1].startMs);

    const spotted = trackSpottedUnits(new Set<string>(), result.events);
    expect([...spotted]).toEqual(['enemy-1']);
    expect(activeSpotMarkers(result.state, spotted)).toEqual([
      { unitId: 'enemy-1', x: 11, y: 5 },
    ]);
  });

  it('persiste mientras el detector sigue alerta y se oculta al enfriarse o morir', () => {
    const spotted = new Set(['enemy-1']);
    const alert: GameState = makeState({
      players: [playerAt(5, 5)],
      enemies: [sentinel('enemy-1', 11, 5, 'alert')],
    });

    expect(activeSpotMarkers(alert, spotted)).toHaveLength(1);

    const returning: GameState = {
      ...alert,
      enemies: [{ ...alert.enemies[0], awareness: 'returning' }],
    };
    expect(activeSpotMarkers(returning, spotted)).toEqual([]);

    const dormant: GameState = {
      ...alert,
      enemies: [{ ...alert.enemies[0], awareness: 'dormant' }],
    };
    expect(activeSpotMarkers(dormant, spotted)).toEqual([]);

    const dead: GameState = {
      ...alert,
      enemies: [{ ...alert.enemies[0], hp: 0 }],
    };
    expect(activeSpotMarkers(dead, spotted)).toEqual([]);

    // Una nueva detección del mismo enemigo vuelve a mostrar el marcador.
    expect(activeSpotMarkers(alert, new Set(['enemy-1']))).toHaveLength(1);
    expect(activeSpotMarkers(alert, new Set<string>())).toEqual([]);
  });

  it('poda el detector al salir de alert y no reutiliza su "!" si luego lo alerta la onda', () => {
    const detection: GameEvent = {
      type: 'EnemySpotted',
      unitId: 'enemy-1',
      playerId: 'player-1',
      position: { x: 11, y: 5 },
      step: { x: 10, y: 5 },
    };
    const spotted = trackSpottedUnits(new Set<string>(), [detection]);
    const base: GameState = makeState({
      players: [playerAt(5, 5)],
      enemies: [sentinel('enemy-1', 11, 5, 'alert')],
    });
    expect(activeSpotMarkers(base, spotted)).toHaveLength(1);

    const returning: GameState = {
      ...base,
      enemies: [{ ...base.enemies[0], awareness: 'returning' }],
    };
    const afterReturning = reconcileSpottedUnits(returning, spotted);
    expect([...afterReturning]).toEqual([]);

    const dormant: GameState = {
      ...base,
      enemies: [{ ...base.enemies[0], awareness: 'dormant' }],
    };
    expect([...reconcileSpottedUnits(dormant, spotted)]).toEqual([]);

    // La onda vuelve a ponerlo en alerta sin emitir EnemySpotted: no hay "!".
    const waveAlerted: GameState = {
      ...base,
      enemies: [{ ...base.enemies[0], awareness: 'alert', hasShouted: true }],
    };
    expect(activeSpotMarkers(waveAlerted, afterReturning)).toEqual([]);

    // Una detección nueva sí vuelve a marcar al mismo detector.
    const reSpotted = trackSpottedUnits(afterReturning, [detection]);
    expect([...reSpotted]).toEqual(['enemy-1']);
    expect(activeSpotMarkers(waveAlerted, reSpotted)).toEqual([
      { unitId: 'enemy-1', x: 11, y: 5 },
    ]);
  });

  it('no muestra "!" a receptores de la onda que no emitieron EnemySpotted', () => {
    const state = makeState({
      grid: makeGridWithWalls([{ x: 6, y: 2 }]),
      players: [playerAt(3, 2)],
      enemies: [
        sentinel('enemy-1', 2, 2),
        makeUnit({
          id: 'enemy-2',
          faction: 'enemy',
          enemyType: 'sentinel',
          x: 10,
          y: 2,
          awareness: 'dormant',
        }),
      ],
    });

    const result = detectEnemiesAfterStep(state);

    expect(result.events.map((event) => event.type)).toEqual([
      'EnemySpotted',
      'AlarmRaised',
    ]);
    expect(result.events[0]).toMatchObject({ type: 'EnemySpotted', unitId: 'enemy-1' });
    // El receptor también queda alertado, pero solo el emisor inicia el episodio.
    expect(result.state.enemies[1]).toMatchObject({ awareness: 'alert' });

    const spotted = trackSpottedUnits(new Set<string>(), result.events);
    expect([...spotted]).toEqual(['enemy-1']);
    expect(activeSpotMarkers(result.state, spotted)).toEqual([
      { unitId: 'enemy-1', x: 2, y: 2 },
    ]);
  });
});
