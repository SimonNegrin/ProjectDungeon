import { describe, expect, it } from 'vitest';
import type { GameEvent } from '../../../src/game/types';
import { clampCamera } from '../../../src/host/camera';
import { TILE_SIZE } from '../../../src/host/geometry';
import {
  MOTION_CONFIG,
  advanceTimeline,
  buildMotionTimeline,
  cameraAt,
  completedSteps,
  currentStep,
  focusUnitId,
  presentationState,
  visualPosition,
  visualPositions,
} from '../../../src/host/motion';
import { makeState, makeUnit } from '../game/helpers';

function moved(
  unitId: string,
  from: { x: number; y: number },
  to: { x: number; y: number },
  mpLeft: number,
): GameEvent {
  return { type: 'UnitMoved', unitId, from, to, mpLeft };
}

const THREE_STRAIGHT: GameEvent[] = [
  moved('player-1', { x: 2, y: 2 }, { x: 3, y: 2 }, 5),
  moved('player-1', { x: 3, y: 2 }, { x: 4, y: 2 }, 4),
  moved('player-1', { x: 4, y: 2 }, { x: 5, y: 2 }, 3),
];

describe('configuración y construcción de la timeline', () => {
  it('usa una única configuración 125/70 y diagonal a duración constante', () => {
    expect(MOTION_CONFIG).toEqual({
      stepMs: 125,
      pauseMs: 70,
      diagonal: 'constant-duration',
    });
  });

  it('tres pasos rectos producen 125 ms por paso, 70 ms de pausa y n + 1 pausas', () => {
    const timeline = buildMotionTimeline(THREE_STRAIGHT);

    expect(timeline.stepCount).toBe(3);
    expect(timeline.totalMs).toBe(3 * 125 + 4 * 70);
    expect(timeline.steps.map((step) => step.durationMs)).toEqual([125, 125, 125]);
    expect(timeline.steps.map((step) => step.mpAfter)).toEqual([5, 4, 3]);
    expect(timeline.steps[0]).toMatchObject({
      startMs: 70,
      endMs: 195,
      pauseEndMs: 265,
      diagonal: false,
    });

    const pauses = timeline.phases.filter((phase) => phase.kind === 'pause');
    expect(pauses).toHaveLength(4);
    expect(pauses.map((pause) => pause.durationMs)).toEqual([70, 70, 70, 70]);
    expect(pauses.map((pause) => pause.tile)).toEqual([
      { x: 2, y: 2 },
      { x: 3, y: 2 },
      { x: 4, y: 2 },
      { x: 5, y: 2 },
    ]);
  });

  it('la diagonal también dura 125 ms y su transición es una línea recta', () => {
    const timeline = buildMotionTimeline([
      moved('player-1', { x: 4, y: 4 }, { x: 5, y: 5 }, 5),
    ]);
    const step = timeline.steps[0];

    expect(step.diagonal).toBe(true);
    expect(step.durationMs).toBe(125);

    const start = step.startMs;
    const middle = visualPosition(timeline, start + 62.5, 'player-1');
    expect(middle).toEqual({
      x: 4 * TILE_SIZE + TILE_SIZE,
      y: 4 * TILE_SIZE + TILE_SIZE,
      tileX: 5,
      tileY: 5,
    });

    const almost = visualPosition(timeline, start + 124, 'player-1');
    expect(almost?.x).toBe(5 * TILE_SIZE + 16);
  });

  it('la interpolación recta usa centros de tile y redondeo entero', () => {
    const timeline = buildMotionTimeline([
      moved('player-1', { x: 2, y: 2 }, { x: 3, y: 2 }, 5),
    ]);
    const start = timeline.steps[0].startMs;

    expect(visualPosition(timeline, 0, 'player-1')).toEqual({
      x: 2 * TILE_SIZE + 16,
      y: 2 * TILE_SIZE + 16,
      tileX: 2,
      tileY: 2,
    });
    expect(visualPosition(timeline, start + 62.5, 'player-1')).toEqual({
      x: 2 * TILE_SIZE + 32,
      y: 2 * TILE_SIZE + 16,
      tileX: 3,
      tileY: 2,
    });
    const position = visualPosition(timeline, start + 62.5, 'player-1');
    expect(Number.isInteger(position?.x)).toBe(true);
    expect(Number.isInteger(position?.y)).toBe(true);
  });

  it('cada grupo de unidad abre su propia pausa inicial y se anima en orden', () => {
    const events: GameEvent[] = [
      moved('enemy-1', { x: 6, y: 4 }, { x: 5, y: 4 }, 3),
      moved('enemy-2', { x: 9, y: 9 }, { x: 8, y: 9 }, 3),
    ];
    const timeline = buildMotionTimeline(events);

    expect(timeline.focusUnitIds).toEqual(['enemy-1', 'enemy-2']);
    expect(timeline.steps.map((step) => step.index)).toEqual([0, 1]);
    // Dos grupos de un paso: dos pausas iniciales y dos de destino.
    expect(timeline.phases.filter((phase) => phase.kind === 'pause')).toHaveLength(4);
    expect(timeline.totalMs).toBe(2 * (70 + 125 + 70));
    expect(timeline.steps[1].startMs).toBe(70 + 125 + 70 + 70);
  });

  it('un UnitMoved no contiguo abre grupo nuevo aunque sea la misma unidad', () => {
    const timeline = buildMotionTimeline([
      moved('player-1', { x: 2, y: 2 }, { x: 3, y: 2 }, 5),
      moved('player-1', { x: 8, y: 8 }, { x: 9, y: 8 }, 4),
    ]);

    expect(timeline.steps).toHaveLength(2);
    expect(timeline.phases.filter((phase) => phase.kind === 'pause')).toHaveLength(4);
  });

  it('los eventos que no son UnitMoved se secuencian al acabar el beat anterior', () => {
    const attack: GameEvent = {
      type: 'AttackPerformed',
      attackerId: 'player-1',
      targetId: 'enemy-1',
      hit: true,
      damage: 5,
      targetHp: 0,
      rolls: { attack: 6, shield: 1, damage: 2, armor: 1 },
    };
    const died: GameEvent = { type: 'UnitDied', unitId: 'enemy-1' };
    const ended: GameEvent = { type: 'GameEnded', status: 'victory' };
    const timeline = buildMotionTimeline([...THREE_STRAIGHT, attack, died, ended]);

    // Movimiento 655 ms; impacto 320; muerte 900; fin 800.
    expect(timeline.events.map((entry) => entry.atMs)).toEqual([655, 975, 1875]);
    expect(timeline.events.map((entry) => entry.event.type)).toEqual([
      'AttackPerformed',
      'UnitDied',
      'GameEnded',
    ]);
    expect(timeline.totalMs).toBe(655 + 320 + 900 + 800);
    expect(timeline.blockingUntilMs).toBe(timeline.totalMs);
  });

  it('sin UnitMoved la duración es 0 y los eventos quedan a tiempo 0', () => {
    const timeline = buildMotionTimeline([
      { type: 'CommandRejected', commandType: 'Attack', reason: 'target-not-adjacent' },
    ]);

    expect(timeline.totalMs).toBe(0);
    expect(timeline.stepCount).toBe(0);
    expect(timeline.events[0].atMs).toBe(0);
    expect(focusUnitId(timeline, 0)).toBeNull();
  });

  it('no muta los eventos de entrada y es determinista', () => {
    const events = THREE_STRAIGHT.map((event) =>
      event.type === 'UnitMoved'
        ? { ...event, from: { ...event.from }, to: { ...event.to } }
        : event,
    );
    const before = JSON.stringify(events);

    const first = buildMotionTimeline(events);
    const second = buildMotionTimeline(events);

    expect(first).toEqual(second);
    expect(JSON.stringify(events)).toBe(before);
  });
});

describe('reloj de presentación y cámara', () => {
  it('avanza en subtramos de 50 ms sin saltarse fases', () => {
    const timeline = buildMotionTimeline(THREE_STRAIGHT);

    expect(advanceTimeline(timeline, 0, 0)).toBe(0);
    expect(advanceTimeline(timeline, 0, 60)).toBe(60);
    expect(advanceTimeline(timeline, 0, 10_000)).toBe(timeline.totalMs);
    expect(advanceTimeline(timeline, 0, Number.NaN)).toBe(0);
    expect(advanceTimeline(timeline, 10, -50)).toBe(10);
  });

  it('completedSteps y currentStep describen el paso en curso', () => {
    const timeline = buildMotionTimeline(THREE_STRAIGHT);

    expect(completedSteps(timeline, 0)).toBe(0);
    expect(completedSteps(timeline, 195)).toBe(1);
    expect(completedSteps(timeline, 265)).toBe(1);
    expect(currentStep(timeline, 50)).toBeNull();
    expect(currentStep(timeline, 170)).toMatchObject({ index: 0 });
    expect(currentStep(timeline, timeline.totalMs)).toBeNull();
  });

  it('la cámara centra al sprite enfocado con offsets enteros', () => {
    const timeline = buildMotionTimeline([
      moved('player-1', { x: 6, y: 6 }, { x: 7, y: 6 }, 5),
    ]);
    const world = { width: 20 * TILE_SIZE, height: 20 * TILE_SIZE };
    const viewport = { width: 13 * TILE_SIZE, height: 13 * TILE_SIZE };

    expect(cameraAt(timeline, 0, world, viewport)).toEqual({ x: 0, y: 0 });

    const mid = cameraAt(timeline, 70 + 62.5, world, viewport);
    expect(mid).toEqual({ x: 16, y: 0 });
    expect(Number.isInteger(mid.x)).toBe(true);
    expect(Number.isInteger(mid.y)).toBe(true);
  });

  it('la cámara se limita a los bordes del mapa', () => {
    const timeline = buildMotionTimeline([
      moved('player-1', { x: 18, y: 18 }, { x: 18, y: 18 }, 5),
    ]);
    const world = { width: 20 * TILE_SIZE, height: 20 * TILE_SIZE };
    const viewport = { width: 13 * TILE_SIZE, height: 13 * TILE_SIZE };

    expect(cameraAt(timeline, 0, world, viewport)).toEqual({
      x: 224,
      y: 224,
    });
    expect(clampCamera({ x: 999, y: -5 }, world, viewport)).toEqual({ x: 224, y: 0 });
  });

  it('sin movimiento activo conserva la cámara y no enfoca el centro del mapa', () => {
    const attack: GameEvent = {
      type: 'AttackPerformed',
      attackerId: 'player-1',
      targetId: 'enemy-1',
      hit: true,
      damage: 4,
      targetHp: 2,
      rolls: { attack: 6, shield: 1, damage: 2, armor: 1 },
    };
    const timeline = buildMotionTimeline([attack]);
    const world = { width: 20 * TILE_SIZE, height: 20 * TILE_SIZE };
    const viewport = { width: 13 * TILE_SIZE, height: 13 * TILE_SIZE };
    const current = { x: 96, y: 32 };

    expect(timeline.phases).toHaveLength(0);
    expect(focusUnitId(timeline, 0)).toBeNull();
    expect(cameraAt(timeline, 0, world, viewport, current)).toEqual(current);
    // Sin cámara previa mantiene el comportamiento histórico: centro del mapa.
    expect(cameraAt(timeline, 0, world, viewport)).toEqual({ x: 112, y: 112 });
  });

  it('el pre-beat de fase conserva la cámara hasta que arranca el primer movedor', () => {
    const timeline = buildMotionTimeline([
      { type: 'EnemyPhaseStarted', turn: 2 },
      moved('enemy-1', { x: 6, y: 6 }, { x: 5, y: 6 }, 3),
      moved('enemy-2', { x: 9, y: 9 }, { x: 8, y: 9 }, 3),
    ]);
    const world = { width: 20 * TILE_SIZE, height: 20 * TILE_SIZE };
    const viewport = { width: 13 * TILE_SIZE, height: 13 * TILE_SIZE };
    const current = { x: 32, y: 96 };

    // Antes del primer paso no se enfoca a la última unidad de la timeline.
    expect(focusUnitId(timeline, 0)).toBe('enemy-1');
    expect(focusUnitId(timeline, 399)).toBe('enemy-1');
    expect(cameraAt(timeline, 0, world, viewport, current)).toEqual(current);
    expect(cameraAt(timeline, 399, world, viewport, current)).toEqual(current);

    // Al empezar la pausa del primer movedor la cámara ya lo sigue.
    expect(cameraAt(timeline, 400, world, viewport, current)).toEqual({ x: 0, y: 0 });
    expect(focusUnitId(timeline, 400)).toBe('enemy-1');
  });

  it('visualPositions incluye a todas las unidades animadas', () => {
    const timeline = buildMotionTimeline([
      moved('player-1', { x: 2, y: 2 }, { x: 3, y: 2 }, 5),
      moved('enemy-1', { x: 6, y: 6 }, { x: 5, y: 6 }, 3),
    ]);
    const positions = visualPositions(timeline, 0);

    expect([...positions.keys()]).toEqual(['player-1', 'enemy-1']);
    expect(positions.get('player-1')).toMatchObject({ x: 2 * TILE_SIZE + 16 });
  });
});

describe('estado derivado para HUD y render', () => {
  const finalState = makeState({
    players: [
      makeUnit({
        id: 'player-1',
        faction: 'player',
        x: 5,
        y: 2,
        mp: 3,
        actions: 1,
      }),
    ],
    enemies: [makeUnit({ id: 'enemy-1', faction: 'enemy', x: 7, y: 2, hp: 0 })],
    status: 'victory',
  });

  const attack: GameEvent = {
    type: 'AttackPerformed',
    attackerId: 'player-1',
    targetId: 'enemy-1',
    hit: true,
    damage: 5,
    targetHp: 0,
    rolls: { attack: 6, shield: 1, damage: 2, armor: 1 },
  };
  const events: GameEvent[] = [
    ...THREE_STRAIGHT,
    attack,
    { type: 'UnitDied', unitId: 'enemy-1' },
    { type: 'GameEnded', status: 'victory' },
  ];

  it('el MP baja paso a paso y coincide con el motor al final', () => {
    const timeline = buildMotionTimeline(events);
    const step0 = timeline.steps[0];

    expect(presentationState(finalState, timeline, 0).players[0].mp).toBe(6);
    expect(presentationState(finalState, timeline, step0.endMs).players[0].mp).toBe(5);
    const second = timeline.steps[1];
    expect(presentationState(finalState, timeline, second.endMs).players[0].mp).toBe(4);
    expect(presentationState(finalState, timeline, timeline.totalMs).players[0].mp).toBe(3);
  });

  it('el enemigo no pierde vida antes del ataque; después sí', () => {
    const timeline = buildMotionTimeline(events);
    const attack = timeline.events.find(
      (entry) => entry.event.type === 'AttackPerformed',
    );
    if (!attack) throw new Error('La timeline debe contener el ataque');
    const before = presentationState(finalState, timeline, attack.atMs - 1);
    const after = presentationState(finalState, timeline, attack.atMs);

    expect(before.enemies[0].hp).toBe(5);
    expect(before.status).toBe('playing');
    expect(after.enemies[0].hp).toBe(0);
  });

  it('la acción del atacante se consume al ocurrir su ataque', () => {
    const timeline = buildMotionTimeline(events);
    const attack = timeline.events.find(
      (entry) => entry.event.type === 'AttackPerformed',
    );
    if (!attack) throw new Error('La timeline debe contener el ataque');
    const before = presentationState(finalState, timeline, attack.atMs - 1);
    const after = presentationState(finalState, timeline, attack.atMs);

    expect(before.players[0].actions.remaining).toBe(2);
    expect(after.players[0].actions.remaining).toBe(1);
  });

  it('dos ataques seguidos conservan su beat y bajan las acciones 2→1→0', () => {
    const twoAttacks: GameEvent[] = [
      { type: 'PlayerTurnStarted', turn: 1 },
      {
        type: 'AttackPerformed',
        attackerId: 'player-1',
        targetId: 'enemy-1',
        hit: true,
        damage: 5,
        targetHp: 5,
        rolls: { attack: 6, shield: 1, damage: 2, armor: 1 },
      },
      {
        type: 'AttackPerformed',
        attackerId: 'player-1',
        targetId: 'enemy-1',
        hit: true,
        damage: 5,
        targetHp: 0,
        rolls: { attack: 6, shield: 1, damage: 2, armor: 1 },
      },
      { type: 'UnitDied', unitId: 'enemy-1' },
    ];
    const exhausted = makeState({
      players: [
        makeUnit({
          id: 'player-1',
          faction: 'player',
          x: 5,
          y: 2,
          mp: 3,
          actions: 0,
        }),
      ],
      enemies: [makeUnit({ id: 'enemy-1', faction: 'enemy', x: 6, y: 2, hp: 0 })],
      status: 'victory',
    });
    const timeline = buildMotionTimeline(twoAttacks);
    const attackEntries = timeline.events.filter(
      (entry) => entry.event.type === 'AttackPerformed',
    );

    expect(attackEntries.map((entry) => entry.event.type)).toEqual([
      'AttackPerformed',
      'AttackPerformed',
    ]);
    const attackBeats = timeline.beats.filter(
      (beat) => beat.eventType === 'AttackPerformed',
    );
    expect(attackBeats).toHaveLength(2);
    expect(attackBeats[1].atMs).toBeGreaterThanOrEqual(attackBeats[0].endMs);
    expect(presentationState(exhausted, timeline, 0).players[0].actions.remaining).toBe(2);
    expect(
      presentationState(exhausted, timeline, attackEntries[0].atMs).players[0].actions.remaining,
    ).toBe(1);
    expect(
      presentationState(exhausted, timeline, attackEntries[1].atMs).players[0].actions.remaining,
    ).toBe(0);
  });

  it('la fase enemiga se secuencia y PlayerTurnStarted devuelve el turno', () => {
    const enemyEvents: GameEvent[] = [
      { type: 'TurnEnded', turn: 1 },
      { type: 'EnemyPhaseStarted', turn: 1 },
      moved('enemy-1', { x: 7, y: 2 }, { x: 6, y: 2 }, 3),
      { type: 'PlayerTurnStarted', turn: 2 },
    ];
    const timeline = buildMotionTimeline(enemyEvents);
    const restored = makeState({
      players: [makeUnit({ id: 'player-1', faction: 'player', x: 5, y: 2 })],
      enemies: [makeUnit({ id: 'enemy-1', faction: 'enemy', x: 6, y: 2 })],
      turn: 2,
    });

    const atStart = presentationState(restored, timeline, 0);
    expect(atStart.phase).toBe('enemy');
    expect(atStart.turn).toBe(1);

    const atEnd = presentationState(restored, timeline, timeline.totalMs);
    expect(atEnd.phase).toBe('player');
    expect(atEnd.turn).toBe(2);
    expect(atEnd.players[0].actions.remaining).toBe(2);
  });

  it('con tiempo final el estado derivado coincide con el estado del motor', () => {
    const timeline = buildMotionTimeline(events);
    const finalPresentation = presentationState(finalState, timeline, timeline.totalMs);

    expect(finalPresentation.players).toEqual(finalState.players);
    expect(finalPresentation.enemies).toEqual(finalState.enemies);
    expect(finalPresentation.status).toBe(finalState.status);
  });

  it('durante la fase enemiga conserva el MP y la acción previos al fin de turno', () => {
    const enemyEvents: GameEvent[] = [
      { type: 'TurnEnded', turn: 1 },
      { type: 'EnemyPhaseStarted', turn: 1 },
      moved('enemy-1', { x: 7, y: 2 }, { x: 6, y: 2 }, 3),
      { type: 'PlayerTurnStarted', turn: 2 },
    ];
    const timeline = buildMotionTimeline(enemyEvents);
    const initialState = makeState({
      players: [
        makeUnit({
          id: 'player-1',
          faction: 'player',
          x: 5,
          y: 2,
          mp: 2,
          actions: 0,
        }),
      ],
      enemies: [makeUnit({ id: 'enemy-1', faction: 'enemy', x: 7, y: 2 })],
      turn: 1,
    });
    const restored = makeState({
      players: [makeUnit({ id: 'player-1', faction: 'player', x: 5, y: 2 })],
      enemies: [makeUnit({ id: 'enemy-1', faction: 'enemy', x: 6, y: 2 })],
      turn: 2,
    });

    const atStart = presentationState(restored, timeline, 0, initialState);
    expect(atStart.players[0]).toMatchObject({ mp: 2, actions: { remaining: 0 } });

    const atEnd = presentationState(restored, timeline, timeline.totalMs, initialState);
    expect(atEnd.players[0]).toMatchObject({ mp: 6, actions: { remaining: 2 } });
  });

  it('no muta el estado de entrada', () => {
    const timeline = buildMotionTimeline(events);
    const before = JSON.stringify(finalState);

    presentationState(finalState, timeline, 0);
    presentationState(finalState, timeline, timeline.totalMs);

    expect(JSON.stringify(finalState)).toBe(before);
  });
});
