import { describe, expect, it } from 'vitest';
import type {
  EnemyPhaseEntry,
  GameEvent,
  GameState,
} from '../../../src/game/types';
import { FEEDBACK_CONFIG } from '../../../src/host/feedback-config';
import {
  bannerForCue,
  unitMarkForEvent,
} from '../../../src/host/feedback-events';
import { buildMotionTimeline, cameraAt } from '../../../src/host/motion';
import {
  enemyActorContextAt,
  enemyPhaseHasActions,
} from '../../../src/host/presentation';
import { GameSession } from '../../../src/host/session';
import { TILE_SIZE } from '../../../src/host/geometry';
import { makeState, makeUnit, rngForDice } from '../game/helpers';

function attackEvent(attackerId: string, targetId: string): GameEvent {
  return {
    type: 'AttackPerformed',
    attackerId,
    targetId,
    hit: true,
    damage: 1,
    targetHp: 19,
    rolls: { attack: 6, shield: 1, damage: 2, armor: 1 },
    damageBreakdown: [],
  };
}

function act(
  enemyId: string,
  targetId: string | null,
): EnemyPhaseEntry {
  return { enemyId, targetId, action: 'act' };
}

function wait(enemyId: string): EnemyPhaseEntry {
  return { enemyId, targetId: null, action: 'wait' };
}

const WORLD = { width: 20 * TILE_SIZE, height: 20 * TILE_SIZE };
const VIEWPORT = { width: 13 * TILE_SIZE, height: 13 * TILE_SIZE };

describe('aviso y presentación de la fase enemiga', () => {
  it('decide si hay acciones: solo un `act` abre el aviso', () => {
    expect(enemyPhaseHasActions(undefined)).toBe(false);
    expect(enemyPhaseHasActions([wait('enemy-1')])).toBe(false);
    expect(enemyPhaseHasActions([wait('enemy-1'), act('enemy-2', 'player-1')])).toBe(
      true,
    );
  });

  it('con acciones muestra «El master mueve» 800 ms y desaparece antes de actuar', () => {
    const timeline = buildMotionTimeline(
      [
        { type: 'EnemyPhaseStarted', turn: 1 },
        {
          type: 'UnitMoved',
          unitId: 'enemy-1',
          from: { x: 6, y: 5 },
          to: { x: 5, y: 5 },
          mpLeft: 4,
        },
      ],
      { enemyPhase: [act('enemy-1', 'player-1')] },
    );
    const cue = timeline.cues.find((candidate) => candidate.kind === 'enemy-phase');
    if (!cue) throw new Error('La fase con acciones debe producir su cue');

    expect(cue.atMs).toBe(0);
    expect(cue.durationMs).toBe(FEEDBACK_CONFIG.texts.enemyPhaseBannerMs);
    expect(FEEDBACK_CONFIG.texts.enemyPhaseBannerMs).toBe(800);
    expect(bannerForCue(cue)).toEqual({
      text: 'El master mueve',
      kind: 'phase',
      durationMs: 800,
    });
    expect(timeline.steps[0].startMs).toBeGreaterThanOrEqual(
      FEEDBACK_CONFIG.texts.enemyPhaseBannerMs,
    );
  });

  it('sin acciones omite el aviso y conserva las marcas de espera', () => {
    const state = makeState({
      enemies: [makeUnit({ id: 'enemy-1', faction: 'enemy', x: 10, y: 5 })],
    });
    const timeline = buildMotionTimeline(
      [
        { type: 'EnemyPhaseStarted', turn: 1 },
        { type: 'EnemyWaited', unitId: 'enemy-1' },
      ],
      { enemyPhase: [wait('enemy-1')] },
    );

    expect(timeline.cues.map((cue) => cue.kind)).toEqual(['waited']);
    expect(timeline.cues.some((cue) => cue.kind === 'enemy-phase')).toBe(false);
    expect(timeline.events.find((entry) => entry.event.type === 'EnemyPhaseStarted')?.atMs).toBe(0);
    const mark = unitMarkForEvent({ type: 'EnemyWaited', unitId: 'enemy-1' }, state);
    expect(mark).toMatchObject({ kind: 'waited', text: '...' });
  });

  it('solo el enemigo que actúa recibe contexto, cámara y HUD; el que espera se salta', () => {
    const state = makeState({
      players: [
        makeUnit({ id: 'player-1', faction: 'player', x: 5, y: 5 }),
        makeUnit({ id: 'player-2', faction: 'player', x: 7, y: 5 }),
      ],
      enemies: [
        makeUnit({ id: 'enemy-1', faction: 'enemy', x: 10, y: 5 }),
        makeUnit({ id: 'enemy-2', faction: 'enemy', x: 10, y: 10 }),
      ],
    });
    const enemyPhase = [wait('enemy-1'), act('enemy-2', 'player-1')];
    const timeline = buildMotionTimeline(
      [
        { type: 'EnemyPhaseStarted', turn: 1 },
        { type: 'EnemyWaited', unitId: 'enemy-1' },
        attackEvent('enemy-2', 'player-1'),
      ],
      { finalState: state, enemyPhase },
    );
    const attackAt = timeline.events.find(
      (entry) => entry.event.type === 'AttackPerformed',
    )?.atMs;
    if (attackAt === undefined) throw new Error('Falta el ataque');

    expect(enemyActorContextAt(enemyPhase, timeline, 0)).toBeNull();
    expect(enemyActorContextAt(enemyPhase, timeline, attackAt - 1)).toBeNull();
    expect(enemyActorContextAt(enemyPhase, timeline, attackAt)).toEqual({
      actorId: 'enemy-2',
      targetId: 'player-1',
    });
    expect(timeline.focusAnchors.map((anchor) => anchor.unitId)).toEqual([
      'enemy-2',
    ]);
    expect(timeline.focusUnitIds).not.toContain('enemy-1');

    // El atacante inmóvil recibe cámara en su ataque; el que espera no la mueve.
    const camera = cameraAt(timeline, attackAt, WORLD, VIEWPORT, { x: 0, y: 0 });
    expect(camera).toEqual({ x: 10 * TILE_SIZE + 16 - VIEWPORT.width / 2, y: 10 * TILE_SIZE + 16 - VIEWPORT.height / 2 });
  });

  it('encadena actor y objetivo en orden y actualiza la ventana', () => {
    const state = makeState({
      players: [
        makeUnit({ id: 'player-1', faction: 'player', x: 5, y: 5 }),
        makeUnit({ id: 'player-2', faction: 'player', x: 7, y: 5 }),
      ],
      enemies: [
        makeUnit({ id: 'enemy-1', faction: 'enemy', x: 4, y: 5 }),
        makeUnit({ id: 'enemy-2', faction: 'enemy', x: 8, y: 5 }),
      ],
    });
    const enemyPhase = [
      act('enemy-1', 'player-2'),
      act('enemy-2', 'player-1'),
    ];
    const timeline = buildMotionTimeline(
      [
        { type: 'EnemyPhaseStarted', turn: 2 },
        attackEvent('enemy-1', 'player-2'),
        attackEvent('enemy-2', 'player-1'),
      ],
      { finalState: state, enemyPhase },
    );
    const attacks = timeline.events.filter(
      (entry) => entry.event.type === 'AttackPerformed',
    );
    expect(attacks).toHaveLength(2);

    expect(enemyActorContextAt(enemyPhase, timeline, attacks[0].atMs)).toEqual({
      actorId: 'enemy-1',
      targetId: 'player-2',
    });
    expect(enemyActorContextAt(enemyPhase, timeline, attacks[1].atMs)).toEqual({
      actorId: 'enemy-2',
      targetId: 'player-1',
    });
  });
});

describe('integración de la fase enemiga', () => {
  it('la sesión propaga la traza y solo presenta al enemigo que ataca', () => {
    const state: GameState = makeState({
      players: [makeUnit({ id: 'player-1', faction: 'player', x: 5, y: 5 })],
      enemies: [
        makeUnit({
          id: 'enemy-1',
          faction: 'enemy',
          x: 6,
          y: 5,
          awareness: 'alert',
          lastKnown: { x: 5, y: 5 },
        }),
        makeUnit({
          id: 'enemy-2',
          faction: 'enemy',
          x: 18,
          y: 18,
          awareness: 'dormant',
        }),
      ],
      rng: rngForDice([6, 1, 2, 1]),
    });
    const session = new GameSession(state);
    const result = session.dispatch({ type: 'EndTurn' });

    expect(result.enemyPhase).toEqual([
      { enemyId: 'enemy-1', targetId: 'player-1', action: 'act' },
      { enemyId: 'enemy-2', targetId: null, action: 'wait' },
    ]);
    const timeline = buildMotionTimeline(result.events, {
      initialState: state,
      finalState: result.state,
      enemyPhase: result.enemyPhase,
    });

    expect(timeline.cues.some((cue) => cue.kind === 'enemy-phase')).toBe(true);
    expect(enemyActorContextAt(result.enemyPhase, timeline, 0)).toBeNull();
    expect(
      timeline.focusAnchors.every((anchor) => anchor.unitId === 'enemy-1'),
    ).toBe(true);
    expect(timeline.focusAnchors.length).toBeGreaterThan(0);

    const lastAttack = timeline.events
      .filter(
        (entry) =>
          entry.event.type === 'AttackPerformed' &&
          entry.event.attackerId === 'enemy-1',
      )
      .at(-1);
    if (!lastAttack) throw new Error('El enemigo alerta debe atacar');
    expect(
      enemyActorContextAt(result.enemyPhase, timeline, lastAttack.atMs),
    ).toEqual({ actorId: 'enemy-1', targetId: 'player-1' });
    const waited = timeline.events.find(
      (entry) => entry.event.type === 'EnemyWaited',
    );
    expect(waited?.event).toMatchObject({ unitId: 'enemy-2' });
  });
});
