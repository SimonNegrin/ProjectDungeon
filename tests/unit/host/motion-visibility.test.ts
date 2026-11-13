import { describe, expect, it } from 'vitest';
import type { GameEvent, Position } from '../../../src/game/types';
import { FEEDBACK_CONFIG } from '../../../src/host/feedback-config';
import { TILE_SIZE } from '../../../src/host/geometry';
import {
  MOTION_CONFIG,
  buildMotionTimeline,
  cameraAt,
  focusUnitId,
  presentationState,
  visualPositions,
} from '../../../src/host/motion';
import { createViewportVisibility } from '../../../src/host/visibility';
import { makeState, makeUnit } from '../game/helpers';

function moved(
  unitId: string,
  from: Position,
  to: Position,
  mpLeft: number,
): GameEvent {
  return { type: 'UnitMoved', unitId, from, to, mpLeft };
}

const VIEWPORT = { width: 13 * TILE_SIZE, height: 13 * TILE_SIZE };
const WORLD = { width: 20 * TILE_SIZE, height: 20 * TILE_SIZE };
const ORIGIN = { x: 0, y: 0 };
const VISIBILITY = createViewportVisibility(
  ORIGIN,
  VIEWPORT,
  new Set(['player-1']),
);

describe('política de visibilidad del host', () => {
  it('considera visible un tile que intersecta el viewport y fuera el siguiente', () => {
    expect(VISIBILITY.isVisible({ x: 0, y: 0 })).toBe(true);
    expect(VISIBILITY.isVisible({ x: 12, y: 12 })).toBe(true);
    expect(VISIBILITY.isVisible({ x: 13, y: 5 })).toBe(false);
    expect(VISIBILITY.isVisible({ x: 5, y: 13 })).toBe(false);
  });

  it('distingue al jugador del resto de unidades para el foco de cámara', () => {
    expect(VISIBILITY.isPlayer('player-1')).toBe(true);
    expect(VISIBILITY.isPlayer('enemy-1')).toBe(false);
  });
});

describe('recorrido visible', () => {
  it('conserva el tween completo 125/70 y la cámara sigue al enemigo visible', () => {
    const timeline = buildMotionTimeline(
      [moved('enemy-1', { x: 5, y: 5 }, { x: 6, y: 5 }, 3)],
      { visibility: VISIBILITY },
    );

    expect(timeline.stepCount).toBe(1);
    expect(timeline.steps[0]).toMatchObject({
      durationMs: MOTION_CONFIG.stepMs,
      startMs: MOTION_CONFIG.pauseMs,
    });
    expect(timeline.totalMs).toBe(
      MOTION_CONFIG.pauseMs + MOTION_CONFIG.stepMs + MOTION_CONFIG.pauseMs,
    );
    expect(timeline.focusUnitIds).toEqual(['enemy-1']);
    expect(timeline.animatedUnitIds).toEqual(['enemy-1']);
    expect(focusUnitId(timeline, 0)).toBe('enemy-1');
  });
});

describe('atajo fuera de pantalla', () => {
  it('colapsa un grupo fuera/fuera en un beat de 150 ms sin pasos ni foco', () => {
    const events = [
      moved('enemy-1', { x: 18, y: 2 }, { x: 17, y: 2 }, 3),
      moved('enemy-1', { x: 17, y: 2 }, { x: 16, y: 2 }, 2),
      moved('enemy-1', { x: 16, y: 2 }, { x: 15, y: 2 }, 1),
    ];
    const finalState = makeState({
      players: [makeUnit({ id: 'player-1', faction: 'player', x: 1, y: 2 })],
      enemies: [makeUnit({ id: 'enemy-1', faction: 'enemy', x: 15, y: 2 })],
    });
    const timeline = buildMotionTimeline(events, {
      visibility: VISIBILITY,
      finalState,
    });

    expect(timeline.stepCount).toBe(0);
    expect(timeline.phases).toHaveLength(0);
    expect(timeline.focusUnitIds).toEqual([]);
    expect(timeline.animatedUnitIds).toEqual([]);
    expect(timeline.beats).toEqual([
      {
        eventType: 'UnitMoved',
        atMs: 0,
        beatMs: FEEDBACK_CONFIG.beats.enemyOffscreen,
        endMs: FEEDBACK_CONFIG.beats.enemyOffscreen,
      },
    ]);
    expect(timeline.totalMs).toBe(FEEDBACK_CONFIG.beats.enemyOffscreen);
    expect(timeline.cues).toHaveLength(1);
    expect(timeline.cues[0]).toMatchObject({ kind: 'move', durationMs: 0 });
    expect(timeline.cues[0].data).toMatchObject({
      unitId: 'enemy-1',
      from: { x: 18, y: 2 },
      to: { x: 15, y: 2 },
    });

    // Sin pasos no hay tween: el estado final se ve en cuanto empieza el beat.
    expect(visualPositions(timeline, 0).size).toBe(0);
    expect(presentationState(finalState, timeline, 0).enemies[0]).toMatchObject({
      x: 15,
      y: 2,
    });
    expect(cameraAt(timeline, 0, WORLD, VIEWPORT, ORIGIN)).toEqual(ORIGIN);
    expect(cameraAt(timeline, 149, WORLD, VIEWPORT, ORIGIN)).toEqual(ORIGIN);
  });

  it('mantiene el orden de las acciones alrededor del grupo colapsado', () => {
    const timeline = buildMotionTimeline(
      [
        { type: 'EnemyWaited', unitId: 'enemy-2' },
        moved('enemy-1', { x: 18, y: 2 }, { x: 17, y: 2 }, 3),
        moved('enemy-1', { x: 17, y: 2 }, { x: 16, y: 2 }, 2),
        { type: 'EnemyWaited', unitId: 'enemy-2' },
      ],
      { visibility: VISIBILITY },
    );

    expect(timeline.beats.map((beat) => beat.eventType)).toEqual([
      'EnemyWaited',
      'UnitMoved',
      'EnemyWaited',
    ]);
    expect(timeline.beats.map((beat) => beat.atMs)).toEqual([
      0,
      FEEDBACK_CONFIG.beats.waited,
      FEEDBACK_CONFIG.beats.waited + FEEDBACK_CONFIG.beats.enemyOffscreen,
    ]);
    expect(timeline.cues.map((cue) => cue.kind)).toEqual([
      'waited',
      'move',
      'waited',
    ]);
    expect(timeline.totalMs).toBe(
      2 * FEEDBACK_CONFIG.beats.waited + FEEDBACK_CONFIG.beats.enemyOffscreen,
    );
  });
});

describe('cruce del borde del viewport', () => {
  it('anima el recorrido completo sin mover la cámara si no es el jugador', () => {
    const timeline = buildMotionTimeline(
      [
        moved('enemy-1', { x: 14, y: 2 }, { x: 13, y: 2 }, 3),
        moved('enemy-1', { x: 13, y: 2 }, { x: 12, y: 2 }, 2),
      ],
      { visibility: VISIBILITY },
    );

    expect(timeline.stepCount).toBe(2);
    expect(timeline.animatedUnitIds).toEqual(['enemy-1']);
    expect(timeline.focusUnitIds).toEqual([]);
    expect(focusUnitId(timeline, 0)).toBeNull();
    expect(timeline.totalMs).toBe(
      MOTION_CONFIG.pauseMs +
        2 * (MOTION_CONFIG.stepMs + MOTION_CONFIG.pauseMs),
    );
    expect(visualPositions(timeline, 0).has('enemy-1')).toBe(true);

    const mid = MOTION_CONFIG.pauseMs + MOTION_CONFIG.stepMs / 2;
    expect(cameraAt(timeline, 0, WORLD, VIEWPORT, ORIGIN)).toEqual(ORIGIN);
    expect(cameraAt(timeline, mid, WORLD, VIEWPORT, ORIGIN)).toEqual(ORIGIN);
    expect(cameraAt(timeline, timeline.totalMs, WORLD, VIEWPORT, ORIGIN)).toEqual(
      ORIGIN,
    );
  });

  it('sí sigue al jugador cuando cruza el borde', () => {
    const timeline = buildMotionTimeline(
      [
        moved('player-1', { x: 14, y: 2 }, { x: 13, y: 2 }, 3),
        moved('player-1', { x: 13, y: 2 }, { x: 12, y: 2 }, 2),
      ],
      { visibility: VISIBILITY },
    );

    expect(timeline.focusUnitIds).toEqual(['player-1']);
    expect(focusUnitId(timeline, 0)).toBe('player-1');
    expect(
      cameraAt(timeline, timeline.totalMs, WORLD, VIEWPORT, ORIGIN),
    ).not.toEqual(ORIGIN);
  });
});

describe('movimiento reducido', () => {
  const attack: GameEvent = {
    type: 'AttackPerformed',
    attackerId: 'player-1',
    targetId: 'enemy-1',
    hit: true,
    damage: 5,
    targetHp: 0,
    rolls: { attack: 6, shield: 1, damage: 2, armor: 1 },
    damageBreakdown: [],
  };
  const died: GameEvent = { type: 'UnitDied', unitId: 'enemy-1' };
  const ended: GameEvent = { type: 'GameEnded', status: 'victory' };

  it('colapsa beats, pasos y pausas a 0 sin reordenar cues ni eventos', () => {
    const events: GameEvent[] = [
      moved('player-1', { x: 2, y: 2 }, { x: 3, y: 2 }, 5),
      moved('player-1', { x: 3, y: 2 }, { x: 4, y: 2 }, 4),
      attack,
      died,
      ended,
    ];
    const animated = buildMotionTimeline(events, { visibility: VISIBILITY });
    const reduced = buildMotionTimeline(events, {
      visibility: VISIBILITY,
      reducedMotion: true,
    });

    expect(reduced.totalMs).toBe(0);
    expect(reduced.blockingUntilMs).toBe(0);
    expect(reduced.beats.every((beat) => beat.beatMs === 0)).toBe(true);
    expect(reduced.steps.every((step) => step.durationMs === 0)).toBe(true);
    expect(reduced.phases.every((phase) => phase.durationMs === 0)).toBe(true);
    expect(reduced.cues.map((cue) => cue.eventType)).toEqual(
      animated.cues.map((cue) => cue.eventType),
    );
    expect(reduced.cues.map((cue) => cue.kind)).toEqual(
      animated.cues.map((cue) => cue.kind),
    );
    expect(reduced.events.map((entry) => entry.event.type)).toEqual(
      animated.events.map((entry) => entry.event.type),
    );
  });

  it('también colapsa a 0 el atajo fuera de pantalla', () => {
    const timeline = buildMotionTimeline(
      [moved('enemy-1', { x: 18, y: 2 }, { x: 17, y: 2 }, 3)],
      { visibility: VISIBILITY, reducedMotion: true },
    );

    expect(timeline.totalMs).toBe(0);
    expect(timeline.beats).toEqual([
      { eventType: 'UnitMoved', atMs: 0, beatMs: 0, endMs: 0 },
    ]);
  });

  it('aplica el estado final en el evento, sin esperar un beat', () => {
    const finalState = makeState({
      players: [makeUnit({ id: 'player-1', faction: 'player', x: 4, y: 2 })],
      enemies: [makeUnit({ id: 'enemy-1', faction: 'enemy', x: 6, y: 2, hp: 0 })],
      status: 'victory',
    });
    const timeline = buildMotionTimeline(
      [
        moved('player-1', { x: 2, y: 2 }, { x: 4, y: 2 }, 4),
        attack,
        died,
        ended,
      ],
      { visibility: VISIBILITY, reducedMotion: true, finalState },
    );

    const shown = presentationState(finalState, timeline, 0);
    expect(shown.enemies[0].hp).toBe(0);
    expect(shown.status).toBe('victory');
  });
});
