import { describe, expect, it } from 'vitest';
import type { GameEvent, GameState } from '../../../src/game/types';
import { FEEDBACK_CONFIG } from '../../../src/host/feedback-config';
import { buildMotionTimeline } from '../../../src/host/motion';
import { worldEffectsAt } from '../../../src/host/world-effects';
import { makeState, makeUnit } from '../game/helpers';

function attack(hit: boolean): GameEvent {
  return {
    type: 'AttackPerformed',
    attackerId: 'player-1',
    targetId: 'enemy-1',
    hit,
    damage: hit ? 5 : 0,
    targetHp: hit ? 0 : 10,
    rolls: hit
      ? { attack: 6, shield: 1, damage: 2, armor: 1 }
      : { attack: 1, shield: 6, damage: null, armor: null },
  };
}

function deadState(): GameState {
  return makeState({
    players: [makeUnit({ id: 'player-1', faction: 'player', x: 5, y: 5 })],
    enemies: [makeUnit({ id: 'enemy-1', faction: 'enemy', x: 6, y: 5, hp: 0 })],
  });
}

describe('efectos de mundo de impacto y fallo', () => {
  it('el impacto produce embestida, destello, retroceso y sacudida', () => {
    const timeline = buildMotionTimeline([attack(true)], {
      finalState: deadState(),
    });

    const peak = worldEffectsAt(timeline, 90);
    const attacker = peak.get('player-1');
    const target = peak.get('enemy-1');

    expect(attacker?.dx).toBe(FEEDBACK_CONFIG.effects.attackLungePx);
    expect(target?.flash).toBeGreaterThan(0);
    expect(Math.abs(target?.dx ?? 0)).toBeGreaterThan(0);
    expect(Math.abs(target?.dy ?? 0)).toBe(FEEDBACK_CONFIG.effects.spriteShakePx);
    expect(target?.defense).toBeNull();
  });

  it('el destello dura 80-120 ms y desaparece sin alargar el beat', () => {
    const timeline = buildMotionTimeline([attack(true)], {
      finalState: deadState(),
    });

    expect(worldEffectsAt(timeline, 100).get('enemy-1')?.flash).toBeGreaterThan(0);
    expect(worldEffectsAt(timeline, 120).get('enemy-1')?.flash).toBe(0);
    expect(timeline.cues[0].durationMs).toBe(FEEDBACK_CONFIG.beats.attackHit);
  });

  it('el fallo muestra gesto de defensa sin destello ni sacudida de impacto', () => {
    const timeline = buildMotionTimeline([attack(false)], {
      finalState: deadState(),
    });

    const effect = worldEffectsAt(timeline, 90).get('enemy-1');
    expect(effect?.flash).toBe(0);
    expect(effect?.defense).not.toBeNull();
    expect(effect?.defense?.side).toBe('left');
    expect(effect?.dy).toBe(0);
  });
});

describe('dirección del retroceso y de la esquiva', () => {
  function directionState(
    attacker: { x: number; y: number },
    target: { x: number; y: number },
  ): GameState {
    return makeState({
      players: [
        makeUnit({ id: 'player-1', faction: 'player', x: attacker.x, y: attacker.y }),
      ],
      enemies: [makeUnit({ id: 'enemy-1', faction: 'enemy', x: target.x, y: target.y })],
    });
  }

  function targetEffect(
    hit: boolean,
    attacker: { x: number; y: number },
    target: { x: number; y: number },
  ) {
    const timeline = buildMotionTimeline([attack(hit)], {
      finalState: directionState(attacker, target),
    });
    return worldEffectsAt(timeline, 90).get('enemy-1');
  }

  it('el impacto aleja al defensor en horizontal, vertical y diagonal', () => {
    const east = targetEffect(true, { x: 5, y: 5 }, { x: 6, y: 5 });
    expect(east?.dx).toBeGreaterThan(0);

    const west = targetEffect(true, { x: 6, y: 5 }, { x: 5, y: 5 });
    expect(west?.dx).toBeLessThan(0);

    const south = targetEffect(true, { x: 5, y: 5 }, { x: 5, y: 6 });
    expect(south?.dy).toBeGreaterThan(0);

    const diagonal = targetEffect(true, { x: 5, y: 5 }, { x: 6, y: 6 });
    expect(diagonal?.dx).toBeGreaterThan(0);
    expect(diagonal?.dy).toBeGreaterThan(0);
  });

  it('la esquiva aleja al defensor en horizontal, vertical y diagonal', () => {
    const east = targetEffect(false, { x: 5, y: 5 }, { x: 6, y: 5 });
    expect(east?.dx).toBeGreaterThan(0);

    const west = targetEffect(false, { x: 6, y: 5 }, { x: 5, y: 5 });
    expect(west?.dx).toBeLessThan(0);

    const south = targetEffect(false, { x: 5, y: 5 }, { x: 5, y: 6 });
    expect(south?.dy).toBeGreaterThan(0);

    const diagonal = targetEffect(false, { x: 5, y: 5 }, { x: 6, y: 6 });
    expect(diagonal?.dx).toBeGreaterThan(0);
    expect(diagonal?.dy).toBeGreaterThan(0);
  });
});

describe('efectos de mundo de muerte', () => {
  function deathTimeline() {
    return buildMotionTimeline(
      [attack(true), { type: 'UnitDied', unitId: 'enemy-1' } as GameEvent],
      { finalState: deadState() },
    );
  }

  it('empieza con destello y encadena tres parpadeos', () => {
    const timeline = deathTimeline();
    const deathAt = timeline.cues.find((cue) => cue.kind === 'death')!.atMs;

    expect(worldEffectsAt(timeline, deathAt).get('enemy-1')?.flash).toBeGreaterThan(0);
    for (const offset of [130, 290, 450]) {
      expect(
        worldEffectsAt(timeline, deathAt + offset).get('enemy-1')?.visible,
      ).toBe(false);
    }
    for (const offset of [210, 370, 530]) {
      expect(
        worldEffectsAt(timeline, deathAt + offset).get('enemy-1')?.visible,
      ).toBe(true);
    }
  });

  it('disuelve en los últimos 300 ms y deja de ser efecto al terminar', () => {
    const timeline = deathTimeline();
    const deathCue = timeline.cues.find((cue) => cue.kind === 'death')!;

    const half = worldEffectsAt(
      timeline,
      deathCue.atMs +
        FEEDBACK_CONFIG.beats.death -
        FEEDBACK_CONFIG.durations.deathDissolveMs / 2,
    ).get('enemy-1');
    expect(half?.alpha).toBeCloseTo(0.5, 1);

    expect(
      worldEffectsAt(timeline, deathCue.atMs + FEEDBACK_CONFIG.beats.death),
    ).toEqual(new Map());
  });
});
