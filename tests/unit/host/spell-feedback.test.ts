import { describe, expect, it } from 'vitest';
import type { GameEvent, GameState } from '../../../src/game/types';
import { collectAttackFeedbacks } from '../../../src/host/feedback';
import { FEEDBACK_CONFIG } from '../../../src/host/feedback-config';
import { buildMotionTimeline, presentationState } from '../../../src/host/motion';
import { makeState, makeUnit } from '../game/helpers';

function state(): GameState {
  return makeState({
    players: [
      makeUnit({ id: 'player-1', faction: 'player', x: 5, y: 5, magicLevel: 4 }),
      makeUnit({ id: 'player-2', faction: 'player', x: 7, y: 5, hp: 8 }),
    ],
    enemies: [makeUnit({ id: 'enemy-1', faction: 'enemy', x: 6, y: 5 })],
  });
}

function damageEvent(hit: boolean): GameEvent {
  return {
    type: 'SpellCast',
    casterId: 'player-1',
    spellId: 'electric-1',
    targetId: 'enemy-1',
    target: { x: 6, y: 5 },
    effect: 'damage',
    hit,
    damage: hit ? 4 : 0,
    targetHp: hit ? 6 : 10,
    rolls: { attack: 6, shield: 1, damage: hit ? 3 : null, armor: hit ? 1 : null },
    damageBreakdown: hit
      ? [
          {
            type: 'electric',
            amount: 2,
            damageRoll: 3,
            resistanceRoll: 1,
            raw: 4,
            band: 'normal',
            multiplier: 1,
            damage: 4,
          },
        ]
      : [],
  };
}

const HEAL: GameEvent = {
  type: 'SpellCast',
  casterId: 'player-1',
  spellId: 'healing-3',
  targetId: 'player-2',
  target: { x: 7, y: 5 },
  effect: 'heal',
  healing: 4,
  targetHp: 12,
};

const RESURRECT: GameEvent = {
  type: 'SpellCast',
  casterId: 'player-1',
  spellId: 'resurrection-4',
  targetId: 'player-2',
  target: { x: 7, y: 5 },
  effect: 'resurrect',
  targetHp: 12,
};

describe('feedback de hechizos', () => {
  it('el impacto reutiliza -N y desglose con beat propio', () => {
    const timeline = buildMotionTimeline([damageEvent(true)], {
      finalState: state(),
    });
    const cue = timeline.cues.find((candidate) => candidate.kind === 'spell');

    expect(cue).toMatchObject({
      kind: 'spell',
      eventType: 'SpellCast',
      beatMs: FEEDBACK_CONFIG.beats.spellHit,
      data: {
        effect: 'damage',
        hit: true,
        damage: 4,
        targetHp: 6,
        text: '-4',
        target: { x: 6, y: 5 },
        attacker: { x: 5, y: 5 },
      },
    });
  });

  it('el fallo usa `Fallo` y un beat sin desglose', () => {
    const timeline = buildMotionTimeline([damageEvent(false)], {
      finalState: state(),
    });
    const cue = timeline.cues.find((candidate) => candidate.kind === 'spell');

    expect(cue).toMatchObject({
      beatMs: FEEDBACK_CONFIG.beats.spellMiss,
      data: { effect: 'damage', hit: false, damage: 0, text: 'Fallo' },
    });
  });

  it('curación y resurrección tienen beat y texto legible sin daño', () => {
    const heal = buildMotionTimeline([HEAL], { finalState: state() });
    const healCue = heal.cues.find((candidate) => candidate.kind === 'spell');
    expect(healCue).toMatchObject({
      beatMs: FEEDBACK_CONFIG.beats.spellHeal,
      data: {
        effect: 'heal',
        healing: 4,
        targetHp: 12,
        text: '+4',
        target: { x: 7, y: 5 },
      },
    });

    const resurrect = buildMotionTimeline([RESURRECT], { finalState: state() });
    const resurrectionCue = resurrect.cues.find(
      (candidate) => candidate.kind === 'spell',
    );
    expect(resurrectionCue).toMatchObject({
      beatMs: FEEDBACK_CONFIG.beats.spellResurrect,
      data: {
        effect: 'resurrect',
        targetHp: 12,
        text: 'Vuelve 12 PV',
        target: { x: 7, y: 5 },
      },
    });
  });

  it('los hechizos no producen texto ni desglose de ataque', () => {
    expect(collectAttackFeedbacks([damageEvent(true), HEAL, RESURRECT], state())).toEqual([]);
  });

  it('el estado de presentación descuenta maná y acción del hechizo', () => {
    const initial = state();
    const final: GameState = {
      ...initial,
      players: initial.players.map((unit) =>
        unit.id === 'player-1'
          ? {
              ...unit,
              mana: { current: 14, max: 16 },
              actions: { ...unit.actions, remaining: 1 },
              spellsCast: 1,
            }
          : unit,
      ),
      enemies: initial.enemies.map((enemy) => ({ ...enemy, hp: 6 })),
    };
    const timeline = buildMotionTimeline([damageEvent(true)], {
      initialState: initial,
      finalState: final,
    });

    const atCue = presentationState(final, timeline, 0, initial);
    expect(atCue.players[0]).toMatchObject({
      mana: { current: 14, max: 16 },
      actions: { remaining: 1, max: 2 },
      spellsCast: 1,
    });
    expect(atCue.enemies[0].hp).toBe(6);
  });
});
