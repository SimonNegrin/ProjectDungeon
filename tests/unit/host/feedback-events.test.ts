import { describe, expect, it } from 'vitest';
import type { GameEvent, GameState } from '../../../src/game/types';
import { FEEDBACK_CONFIG } from '../../../src/host/feedback-config';
import {
  bannerForCue,
  frameEffectsAt,
  unitMarkForEvent,
  unitMarkText,
  weaponSlotPulseAt,
} from '../../../src/host/feedback-events';
import { buildMotionTimeline } from '../../../src/host/motion';
import type { PresentationEvent } from '../../../src/host/presentation';
import { makeState, makeUnit } from '../game/helpers';

function stateWithEnemy(
  enemy: Partial<Parameters<typeof makeUnit>[0]> = {},
  extra: Partial<GameState> = {},
): GameState {
  return makeState({
    enemies: [
      makeUnit({
        id: 'enemy-1',
        faction: 'enemy',
        x: 10,
        y: 5,
        awareness: 'alert',
        ...enemy,
      }),
    ],
    ...extra,
  });
}

describe('banners de inventario, fase y turno', () => {
  it('la recogida anuncia + <Arma> y el cambio de arma muestra su nombre', () => {
    const state = makeState();
    const pickup = buildMotionTimeline(
      [
        {
          type: 'PickUp',
          unitId: 'player-1',
          weaponId: 'dagger',
          slot: 2,
        } satisfies PresentationEvent,
      ],
      { finalState: state },
    );
    const select = buildMotionTimeline(
      [
        {
          type: 'SelectWeapon',
          unitId: 'player-1',
          weaponId: 'axe',
          slot: 2,
        } satisfies PresentationEvent,
      ],
      { finalState: state },
    );

    expect(bannerForCue(pickup.cues[0])).toEqual({
      text: '+ Daga',
      kind: 'pickup',
      durationMs: FEEDBACK_CONFIG.texts.bannerMs,
    });
    expect(bannerForCue(select.cues[0])).toEqual({
      text: 'Hacha',
      kind: 'select-weapon',
      durationMs: FEEDBACK_CONFIG.texts.bannerMs,
    });
  });

  it('las fases y el separador usan su persistencia y TurnEnded no tiene cue si calla', () => {
    const phase = buildMotionTimeline([{ type: 'EnemyPhaseStarted', turn: 1 }]);
    const turn = buildMotionTimeline([{ type: 'PlayerTurnStarted', turn: 2 }]);
    const separator = buildMotionTimeline([{ type: 'TurnEnded', turn: 1 }]);
    const silent = buildMotionTimeline([
      { type: 'TurnEnded', turn: 1 },
      { type: 'EnemyPhaseStarted', turn: 1 },
    ]);

    expect(bannerForCue(phase.cues[0])).toEqual({
      text: 'FASE ENEMIGA',
      kind: 'phase',
      durationMs: FEEDBACK_CONFIG.texts.enemyPhaseBannerMs,
    });
    expect(bannerForCue(turn.cues[0])).toEqual({
      text: 'TU TURNO',
      kind: 'turn',
      durationMs: FEEDBACK_CONFIG.texts.playerTurnBannerMs,
    });
    expect(bannerForCue(separator.cues[0])).toMatchObject({
      kind: 'separator',
      durationMs: FEEDBACK_CONFIG.durations.turnEndedMs,
    });
    expect(silent.cues.some((cue) => cue.kind === 'turn-ended')).toBe(false);
  });

  it('la alarma no duplica el aviso del HUD con un banner', () => {
    const timeline = buildMotionTimeline([
      { type: 'AlarmRaised', unitId: 'enemy-1', position: { x: 8, y: 8 } },
    ]);
    expect(bannerForCue(timeline.cues[0])).toBeNull();
  });
});

describe('pulso de la ranura del arma', () => {
  it('dura lo que su cue de inventario y desaparece al acabar', () => {
    const pickup = buildMotionTimeline([
      {
        type: 'PickUp',
        unitId: 'player-1',
        weaponId: 'dagger',
        slot: 2,
      } satisfies PresentationEvent,
    ]);

    expect(weaponSlotPulseAt(pickup, 0)).toEqual({
      slot: 2,
      durationMs: FEEDBACK_CONFIG.beats.pickup,
    });
    expect(weaponSlotPulseAt(pickup, 349)).not.toBeNull();
    expect(weaponSlotPulseAt(pickup, 350)).toBeNull();

    const select = buildMotionTimeline([
      {
        type: 'SelectWeapon',
        unitId: 'player-1',
        weaponId: 'axe',
        slot: 1,
      } satisfies PresentationEvent,
    ]);
    expect(weaponSlotPulseAt(select, 0)?.durationMs).toBe(
      FEEDBACK_CONFIG.beats.selectWeapon,
    );
  });
});

describe('efectos de marco', () => {
  it('el tinte de fase enemiga existe durante su cue y se apaga al acabar', () => {
    const timeline = buildMotionTimeline([{ type: 'EnemyPhaseStarted', turn: 1 }]);

    expect(frameEffectsAt(timeline, 0).enemyPhaseTint).toBeCloseTo(0.55, 5);
    expect(frameEffectsAt(timeline, 200).enemyPhaseTint).toBeCloseTo(0.275, 5);
    expect(frameEffectsAt(timeline, 400).enemyPhaseTint).toBe(0);
  });

  it('el borde de la alarma destella dos veces en 500 ms', () => {
    const timeline = buildMotionTimeline([
      { type: 'AlarmRaised', unitId: 'enemy-1', position: { x: 8, y: 8 } },
    ]);

    const samples = [0, 124, 125, 249, 250, 374, 375, 499].map(
      (ms) => frameEffectsAt(timeline, ms).alarmBorder,
    );
    expect(samples).toEqual([true, true, false, false, true, true, false, false]);
    expect(frameEffectsAt(timeline, 500).alarmBorder).toBe(false);
  });

  it('el destello de fin de partida decae en 120 ms', () => {
    const timeline = buildMotionTimeline([{ type: 'GameEnded', status: 'victory' }]);

    expect(frameEffectsAt(timeline, 0).gameEndedFlash).toBe(1);
    expect(frameEffectsAt(timeline, 60).gameEndedFlash).toBeCloseTo(0.5, 5);
    expect(frameEffectsAt(timeline, FEEDBACK_CONFIG.durations.gameEndedFlashMs).gameEndedFlash).toBe(0);
  });
});

describe('marcas de huida, regreso y espera', () => {
  it('la huida añade la dirección de alejamiento del último avistamiento', () => {
    const right = unitMarkForEvent(
      { type: 'EnemyFled', unitId: 'enemy-1' },
      stateWithEnemy({ lastKnown: { x: 8, y: 5 } }),
    );
    expect(right).toEqual({
      unitId: 'enemy-1',
      kind: 'fled',
      text: '!!',
      direction: 'right',
      durationMs: FEEDBACK_CONFIG.texts.fledPersistMs,
    });
    expect(unitMarkText(right!)).toBe('!!→');

    const up = unitMarkForEvent(
      { type: 'EnemyFled', unitId: 'enemy-1' },
      stateWithEnemy({ x: 8, y: 3, lastKnown: { x: 8, y: 5 } }),
    );
    expect(up?.direction).toBe('up');
    expect(unitMarkText(up!)).toBe('!!↑');
  });

  it('regreso y espera muestran zzz y ... con su persistencia', () => {
    const state = stateWithEnemy();
    const returned = unitMarkForEvent(
      { type: 'EnemyReturned', unitId: 'enemy-1' },
      state,
    );
    const waited = unitMarkForEvent(
      { type: 'EnemyWaited', unitId: 'enemy-1' },
      state,
    );

    expect(returned).toMatchObject({
      kind: 'returned',
      text: 'zzz',
      direction: null,
      durationMs: FEEDBACK_CONFIG.texts.returnedPersistMs,
    });
    expect(waited).toMatchObject({
      kind: 'waited',
      text: '...',
      durationMs: FEEDBACK_CONFIG.texts.waitedPersistMs,
    });
    expect(unitMarkText(returned!)).toBe('zzz');
  });

  it('otros eventos no producen marca', () => {
    const events: GameEvent[] = [
      { type: 'TurnEnded', turn: 1 },
      { type: 'EnemySpotted', unitId: 'enemy-1', playerId: 'player-1', position: { x: 8, y: 5 }, step: { x: 9, y: 5 } },
    ];
    for (const event of events) {
      expect(unitMarkForEvent(event, stateWithEnemy())).toBeNull();
    }
  });
});
