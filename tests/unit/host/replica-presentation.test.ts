import { describe, expect, it } from 'vitest';
import { reduce } from '../../../src/game/index';
import type { GameEvent } from '../../../src/game/types';
import {
  collectAttackFeedbacks,
  collectDamageFeedbacks,
} from '../../../src/host/feedback';
import { FEEDBACK_CONFIG } from '../../../src/host/feedback-config';
import { bannerForCue } from '../../../src/host/feedback-events';
import {
  activeCues,
  buildMotionTimeline,
  presentationState,
} from '../../../src/host/motion';
import { worldEffectsAt } from '../../../src/host/world-effects';
import { makeState, makeUnit, rngForDice } from '../game/helpers';

function missAttack(): GameEvent {
  return {
    type: 'AttackPerformed',
    attackerId: 'player-1',
    targetId: 'enemy-1',
    hit: false,
    damage: 0,
    targetHp: 10,
    rolls: { attack: 1, shield: 6, damage: null, armor: null },
    damageBreakdown: [],
  };
}

function replica(hit = true): GameEvent {
  return {
    type: 'ReplicaPerformed',
    attackerId: 'enemy-1',
    targetId: 'player-1',
    hit,
    damage: hit ? 4 : 0,
    targetHp: hit ? 16 : 20,
    rolls: hit
      ? { attack: 6, shield: 1, damage: 2, armor: 1 }
      : { attack: 1, shield: 6, damage: null, armor: null },
    damageBreakdown: [],
  };
}

function board(options: { playerHp?: number; enemyHp?: number } = {}) {
  return makeState({
    players: [
      makeUnit({
        id: 'player-1',
        faction: 'player',
        x: 5,
        y: 5,
        hp: options.playerHp ?? 20,
        mp: 6,
        actions: 2,
      }),
    ],
    enemies: [
      makeUnit({
        id: 'enemy-1',
        faction: 'enemy',
        x: 6,
        y: 5,
        hp: options.enemyHp ?? 10,
        mp: 4,
        actions: 2,
      }),
    ],
  });
}

describe('cue propio de la réplica (REQ-027 T-006)', () => {
  it('tiene beat, duración y datos de ataque sin texto propio', () => {
    const timeline = buildMotionTimeline([missAttack(), replica()], {
      finalState: board({ playerHp: 16 }),
    });

    expect(timeline.cues.map((cue) => cue.kind)).toEqual(['attack', 'replica']);
    const cue = timeline.cues[1];
    expect(cue).toMatchObject({
      kind: 'replica',
      eventType: 'ReplicaPerformed',
      atMs: FEEDBACK_CONFIG.beats.attackMiss,
      durationMs: FEEDBACK_CONFIG.beats.replica,
      beatMs: FEEDBACK_CONFIG.beats.replica,
      anchor: { unitId: 'player-1', tile: { x: 5, y: 5 } },
    });
    expect(cue.data).toEqual({
      attackerId: 'enemy-1',
      targetId: 'player-1',
      hit: true,
      damage: 4,
      targetHp: 16,
      rolls: { attack: 6, shield: 1, damage: 2, armor: 1 },
      attacker: { x: 6, y: 5 },
      target: { x: 5, y: 5 },
    });
    expect(cue.data.text).toBeUndefined();
    expect(bannerForCue(cue)).toBeNull();
    expect(FEEDBACK_CONFIG.beats.replica).toBeGreaterThan(0);
  });

  it('la réplica va después del fallo y antes de la siguiente acción', () => {
    const nextHit: GameEvent = {
      type: 'AttackPerformed',
      attackerId: 'player-1',
      targetId: 'enemy-1',
      hit: true,
      damage: 3,
      targetHp: 7,
      rolls: { attack: 6, shield: 1, damage: 2, armor: 1 },
      damageBreakdown: [],
    };
    const timeline = buildMotionTimeline([missAttack(), replica(), nextHit], {
      finalState: board({ playerHp: 16 }),
    });

    expect(timeline.events.map((entry) => entry.event.type)).toEqual([
      'AttackPerformed',
      'ReplicaPerformed',
      'AttackPerformed',
    ]);
    expect(timeline.beats.map((beat) => beat.eventType)).toEqual([
      'AttackPerformed',
      'ReplicaPerformed',
      'AttackPerformed',
    ]);
    expect(timeline.cues.map((cue) => cue.kind)).toEqual([
      'attack',
      'replica',
      'attack',
    ]);
    const [attack, replicaEntry, next] = timeline.events;
    expect(replicaEntry.atMs).toBeGreaterThanOrEqual(
      attack.atMs + FEEDBACK_CONFIG.beats.attackMiss,
    );
    expect(next.atMs).toBeGreaterThanOrEqual(
      replicaEntry.atMs + FEEDBACK_CONFIG.beats.replica,
    );
  });

  it('no añade texto de daño ni de fallo para la réplica', () => {
    const state = board({ playerHp: 16 });

    expect(collectAttackFeedbacks([replica()], state)).toEqual([]);
    expect(collectDamageFeedbacks([replica()], state)).toEqual([]);
  });
});

describe('PV del objetivo retrasados hasta el cue de réplica', () => {
  it('el jugador no pierde PV hasta que se presenta la réplica del enemigo', () => {
    const finalState = board({ playerHp: 16 });
    const timeline = buildMotionTimeline([missAttack(), replica()], { finalState });
    const entry = timeline.events.find(
      (candidate) => candidate.event.type === 'ReplicaPerformed',
    );
    if (!entry) throw new Error('La timeline debe contener la réplica');

    expect(presentationState(finalState, timeline, 0).players[0].hp).toBe(20);
    expect(presentationState(finalState, timeline, entry.atMs - 1).players[0].hp).toBe(20);
    expect(presentationState(finalState, timeline, entry.atMs).players[0].hp).toBe(16);
  });

  it('el enemigo no pierde PV hasta que se presenta la réplica del jugador', () => {
    const playerReplica: GameEvent = {
      type: 'ReplicaPerformed',
      attackerId: 'player-1',
      targetId: 'enemy-1',
      hit: true,
      damage: 4,
      targetHp: 6,
      rolls: { attack: 6, shield: 1, damage: 2, armor: 1 },
      damageBreakdown: [],
    };
    const enemyMiss: GameEvent = {
      type: 'AttackPerformed',
      attackerId: 'enemy-1',
      targetId: 'player-1',
      hit: false,
      damage: 0,
      targetHp: 20,
      rolls: { attack: 1, shield: 6, damage: null, armor: null },
      damageBreakdown: [],
    };
    const finalState = board({ enemyHp: 6 });
    const timeline = buildMotionTimeline([enemyMiss, playerReplica], { finalState });
    const entry = timeline.events.find(
      (candidate) => candidate.event.type === 'ReplicaPerformed',
    );
    if (!entry) throw new Error('La timeline debe contener la réplica');

    expect(presentationState(finalState, timeline, entry.atMs - 1).enemies[0].hp).toBe(10);
    expect(presentationState(finalState, timeline, entry.atMs).enemies[0].hp).toBe(6);
  });

  it('un golpe letal no infla los PV previos al deshacerlo con estado inicial', () => {
    const initialState = board({ enemyHp: 3 });
    const finalState = board({ enemyHp: 0 });
    // Daño 4 sobre 3 PV: la vida final es 0, pero antes del cue eran 3, no 4.
    const lethal: GameEvent = {
      type: 'AttackPerformed',
      attackerId: 'player-1',
      targetId: 'enemy-1',
      hit: true,
      damage: 4,
      targetHp: 0,
      rolls: { attack: 6, shield: 1, damage: 2, armor: 1 },
      damageBreakdown: [],
    };
    const timeline = buildMotionTimeline(
      [lethal, { type: 'UnitDied', unitId: 'enemy-1' }],
      { initialState, finalState },
    );
    const entry = timeline.events[0];

    expect(
      presentationState(finalState, timeline, entry.atMs - 1, initialState)
        .enemies[0].hp,
    ).toBe(3);
    expect(presentationState(finalState, timeline, entry.atMs, initialState).enemies[0].hp).toBe(0);
  });

  it('la réplica no consume acciones ni MP del defensor', () => {
    const finalState = board({ enemyHp: 6 });
    const timeline = buildMotionTimeline(
      [
        {
          type: 'AttackPerformed',
          attackerId: 'enemy-1',
          targetId: 'player-1',
          hit: false,
          damage: 0,
          targetHp: 20,
          rolls: { attack: 1, shield: 6, damage: null, armor: null },
          damageBreakdown: [],
        },
        {
          type: 'ReplicaPerformed',
          attackerId: 'player-1',
          targetId: 'enemy-1',
          hit: true,
          damage: 4,
          targetHp: 6,
          rolls: { attack: 6, shield: 1, damage: 2, armor: 1 },
          damageBreakdown: [],
        },
      ],
      { finalState },
    );

    for (const entry of timeline.events) {
      const player = presentationState(finalState, timeline, entry.atMs).players[0];
      expect(player).toMatchObject({ mp: 6, actions: { remaining: 2 } });
    }
  });
});

describe('animación de ataque girada hacia el atacante', () => {
  it('la embestida sale del defensor que replica hacia el atacante original', () => {
    const finalState = board({ playerHp: 16 });
    const timeline = buildMotionTimeline([replica()], { finalState });
    const effect = worldEffectsAt(timeline, 90);

    // El enemigo (6,5) replica y embiste hacia el jugador (5,5).
    expect(effect.get('enemy-1')?.dx).toBe(-FEEDBACK_CONFIG.effects.attackLungePx);
    expect(effect.get('player-1')?.flash).toBeGreaterThan(0);
  });

  it('una réplica fallida muestra esquiva sin destello de impacto', () => {
    const finalState = board();
    const timeline = buildMotionTimeline([replica(false)], { finalState });
    const effect = worldEffectsAt(timeline, 90).get('player-1');

    expect(effect?.flash).toBe(0);
    expect(effect?.defense?.side).toBe('right');
  });
});

describe('movimiento reducido y secuencia completa', () => {
  it('sin animación el cue dura 0, no queda activo y el estado final es el mismo', () => {
    const finalState = board({ playerHp: 16 });
    const timeline = buildMotionTimeline([missAttack(), replica()], {
      finalState,
      reducedMotion: true,
    });

    expect(timeline.cues.map((cue) => cue.beatMs)).toEqual([0, 0]);
    expect(timeline.cues.map((cue) => cue.durationMs)).toEqual([0, 0]);
    expect(activeCues(timeline, 0)).toEqual([]);
    expect(timeline.totalMs).toBe(0);
    expect(presentationState(finalState, timeline, 0).players[0].hp).toBe(16);
  });

  it('fallo + réplica + siguiente ataque conservan el orden y los PV por cue', () => {
    const initial = makeState({
      players: [
        makeUnit({ id: 'player-1', faction: 'player', x: 5, y: 5, mp: 6, actions: 2 }),
      ],
      enemies: [
        makeUnit({ id: 'enemy-1', faction: 'enemy', x: 6, y: 5, mp: 4, actions: 2 }),
      ],
      rng: rngForDice([1, 6]),
    });
    const first = reduce(initial, {
      type: 'Attack',
      unitId: 'player-1',
      targetId: 'enemy-1',
    });
    expect(first.events.map((event) => event.type)).toEqual([
      'AttackPerformed',
      'ReplicaPerformed',
    ]);

    const second = reduce(first.state, {
      type: 'Attack',
      unitId: 'player-1',
      targetId: 'enemy-1',
    });

    const events = [...first.events, ...second.events];
    // Un fallo puede disparar réplica y el siguiente ataque puede volver a
    // fallar; el orden siempre es ataque → réplica y nunca se adelanta.
    expect(events[0].type).toBe('AttackPerformed');
    expect(events[1].type).toBe('ReplicaPerformed');
    expect(events[2].type).toBe('AttackPerformed');

    const timeline = buildMotionTimeline(events, {
      initialState: initial,
      finalState: second.state,
    });
    expect(timeline.cues.map((cue) => cue.kind)).toEqual(
      events.map((event) =>
        event.type === 'AttackPerformed' ? 'attack' : 'replica',
      ),
    );

    const replicaEntry = timeline.events.find(
      (entry) => entry.event.type === 'ReplicaPerformed',
    );
    if (!replicaEntry || replicaEntry.event.type !== 'ReplicaPerformed') {
      throw new Error('La timeline debe contener la réplica');
    }
    const target = { ...replicaEntry.event };
    const id = target.targetId;
    const hpAt = (elapsed: number): number => {
      const state = presentationState(second.state, timeline, elapsed);
      const unit =
        state.players.find((candidate) => candidate.id === id) ??
        state.enemies.find((candidate) => candidate.id === id);
      if (!unit) throw new Error(`Falta ${id} en el estado presentado`);
      return unit.hp;
    };

    expect(hpAt(replicaEntry.atMs - 1)).toBe(target.targetHp + target.damage);
    expect(hpAt(replicaEntry.atMs)).toBe(target.targetHp);
  });
});
