import { describe, expect, it } from 'vitest';
import type { GameEvent, GameState } from '../../../src/game/types';
import { BspMapGenerator, reduce } from '../../../src/game/index';
import {
  ATTACK_FLASH_MS,
  DAMAGE_FEEDBACK_MS,
  FEEDBACK_CONFIG,
  NOTICE_DURATION_MS,
} from '../../../src/host/feedback-config';
import { translateKey } from '../../../src/host/input';
import {
  MOTION_CONFIG,
  activeCues,
  advanceTimeline,
  buildMotionTimeline,
  dyingUnitIds,
  presentationState,
} from '../../../src/host/motion';
import { buildPresentationEvents } from '../../../src/host/presentation';
import { GameSession } from '../../../src/host/session';
import { makeState, makeUnit } from '../game/helpers';

function moved(
  unitId: string,
  from: { x: number; y: number },
  to: { x: number; y: number },
  mpLeft: number,
): GameEvent {
  return { type: 'UnitMoved', unitId, from, to, mpLeft };
}

function hitAttack(damage = 5, targetHp = 0): GameEvent {
  return {
    type: 'AttackPerformed',
    attackerId: 'player-1',
    targetId: 'enemy-1',
    hit: true,
    damage,
    targetHp,
    rolls: { attack: 6, shield: 1, damage: 2, armor: 1 },
    damageBreakdown: [],
  };
}

function combatState(): GameState {
  return makeState({
    players: [makeUnit({ id: 'player-1', faction: 'player', x: 5, y: 5 })],
    enemies: [makeUnit({ id: 'enemy-1', faction: 'enemy', x: 6, y: 5, hp: 0 })],
  });
}

describe('FEEDBACK_CONFIG única de REQ-017', () => {
  it('contiene los beats de la matriz y conserva MOTION_CONFIG 125/70', () => {
    expect(FEEDBACK_CONFIG.beats).toMatchObject({
      attackHit: 320,
      attackMiss: 300,
      death: 900,
      pickup: 350,
      selectWeapon: 250,
      spotted: 200,
      alarm: 500,
      fled: 300,
      returned: 250,
      waited: 200,
      enemyPhase: 400,
      playerTurn: 350,
      turnEnded: 250,
      gameEnded: 800,
      gameRestarted: 250,
      rejected: 0,
      enemyOffscreen: 150,
    });
    expect(MOTION_CONFIG).toEqual({
      stepMs: 125,
      pauseMs: 70,
      diagonal: 'constant-duration',
    });
  });

  it('incluye las duraciones de efecto, disolución y persistencia de REQ-017', () => {
    expect(FEEDBACK_CONFIG.durations).toMatchObject({
      attackFlashMs: 120,
      damageTextMs: 1000,
      deathFlashMs: 900,
      deathDissolveMs: 300,
      pickupMs: 350,
      selectWeaponMs: 250,
      spottedMs: 200,
      alarmMs: 500,
      fledMs: 300,
      returnedMs: 250,
      waitedMs: 200,
      enemyPhaseMs: 400,
      playerTurnMs: 350,
      turnEndedMs: 250,
      gameEndedMs: 800,
      gameRestartedMs: 250,
      rejectedShakeMs: 120,
    });
    expect(FEEDBACK_CONFIG.texts).toMatchObject({
      damageMs: 1000,
      bannerMs: 800,
      noticeMs: 1600,
      alarmNoticeMs: 1600,
      rejectedNoticeMs: 1600,
      fledPersistMs: 600,
      returnedPersistMs: 500,
      waitedPersistMs: 400,
      enemyPhaseBannerMs: 800,
      playerTurnBannerMs: 700,
    });
  });

  it('deriva los temporizadores existentes de la configuración única', () => {
    expect(DAMAGE_FEEDBACK_MS).toBe(FEEDBACK_CONFIG.texts.damageMs);
    expect(ATTACK_FLASH_MS).toBe(FEEDBACK_CONFIG.durations.attackFlashMs);
    expect(NOTICE_DURATION_MS).toBe(FEEDBACK_CONFIG.texts.noticeMs);
  });
});

describe('cues deterministas sobre la timeline', () => {
  it('genera un cue por evento con tipo, inicio, duración y ancla', () => {
    const events: GameEvent[] = [
      moved('player-1', { x: 2, y: 2 }, { x: 3, y: 2 }, 5),
      hitAttack(),
      { type: 'UnitDied', unitId: 'enemy-1' },
    ];
    const timeline = buildMotionTimeline(events);

    expect(timeline.cues.map((cue) => cue.kind)).toEqual([
      'move',
      'attack',
      'death',
    ]);
    expect(timeline.cues.map((cue) => cue.atMs)).toEqual([70, 265, 585]);
    expect(timeline.cues.map((cue) => cue.durationMs)).toEqual([125, 320, 900]);
    expect(timeline.cues[0].anchor).toEqual({
      unitId: 'player-1',
      tile: { x: 3, y: 2 },
    });
    expect(timeline.cues[1].anchor.unitId).toBe('enemy-1');
    expect(timeline.cues[1].data).toMatchObject({
      attackerId: 'player-1',
      targetId: 'enemy-1',
      hit: true,
      damage: 5,
      targetHp: 0,
      text: '-5',
    });
    expect(timeline.totalMs).toBe(265 + 320 + 900);
  });

  it('es pura y determinista: no muta eventos ni estado', () => {
    const events: GameEvent[] = [
      moved('player-1', { x: 2, y: 2 }, { x: 3, y: 2 }, 5),
      hitAttack(),
    ];
    const before = JSON.stringify(events);
    const first = buildMotionTimeline(events);
    const second = buildMotionTimeline(events);

    expect(first).toEqual(second);
    expect(JSON.stringify(events)).toBe(before);
  });

  it('TurnEnded calla si le sigue EnemyPhaseStarted y bloquea 250 ms si va solo', () => {
    const silent = buildMotionTimeline([
      { type: 'TurnEnded', turn: 1 },
      { type: 'EnemyPhaseStarted', turn: 1 },
    ]);
    expect(silent.cues.map((cue) => cue.kind)).toEqual(['enemy-phase']);
    expect(silent.totalMs).toBe(FEEDBACK_CONFIG.beats.enemyPhase);

    const alone = buildMotionTimeline([{ type: 'TurnEnded', turn: 1 }]);
    expect(alone.cues).toHaveLength(1);
    expect(alone.cues[0]).toMatchObject({
      kind: 'turn-ended',
      durationMs: FEEDBACK_CONFIG.beats.turnEnded,
    });
    expect(alone.totalMs).toBe(FEEDBACK_CONFIG.beats.turnEnded);
  });

  it('CommandRejected no alarga la timeline y conserva su cue no bloqueante', () => {
    const timeline = buildMotionTimeline([
      { type: 'CommandRejected', commandType: 'Attack', reason: 'target-not-adjacent' },
    ]);

    expect(timeline.totalMs).toBe(0);
    expect(timeline.blockingUntilMs).toBe(0);
    expect(timeline.cues[0]).toMatchObject({
      kind: 'rejected',
      atMs: 0,
      durationMs: FEEDBACK_CONFIG.durations.rejectedShakeMs,
      beatMs: 0,
    });
  });

  it('una cadena terminal ataque + muerte + fin dura ~2 s', () => {
    const timeline = buildMotionTimeline([
      hitAttack(),
      { type: 'UnitDied', unitId: 'enemy-1' },
      { type: 'GameEnded', status: 'victory' },
    ]);

    expect(timeline.totalMs).toBe(320 + 900 + 800);
  });

  it('activeCues devuelve solo los cues vivos en el reloj', () => {
    const timeline = buildMotionTimeline([
      hitAttack(),
      { type: 'UnitDied', unitId: 'enemy-1' },
    ]);

    expect(activeCues(timeline, 0).map((cue) => cue.kind)).toEqual(['attack']);
    expect(activeCues(timeline, 319).map((cue) => cue.kind)).toEqual(['attack']);
    expect(activeCues(timeline, 320).map((cue) => cue.kind)).toEqual(['death']);
    expect(activeCues(timeline, timeline.totalMs)).toEqual([]);
  });
});

describe('estado visible retrasado hasta su cue', () => {
  it('la unidad muerta se dibuja como viva hasta UnitDied', () => {
    const finalState = combatState();
    const events: GameEvent[] = [
      hitAttack(),
      { type: 'UnitDied', unitId: 'enemy-1' },
    ];
    const timeline = buildMotionTimeline(events);

    expect(dyingUnitIds(timeline, 0).has('enemy-1')).toBe(true);
    expect(dyingUnitIds(timeline, 319).has('enemy-1')).toBe(true);
    expect(dyingUnitIds(timeline, 320).has('enemy-1')).toBe(false);
    // El HUD puede mostrar PV 0 tras el impacto; el cadáver real llega en TASK-0058.
    expect(presentationState(finalState, timeline, 100).enemies[0].hp).toBe(0);
  });

  it('la recogida mantiene arma, inventario y MP hasta su cue', () => {
    const session = new GameSession({ seed: 279837264, generator: new BspMapGenerator() });
    const weapon = session.state.map?.weapons?.[0];
    if (!weapon) throw new Error('La semilla de referencia debe colocar armas');

    const initialState: GameState = {
      ...session.state,
      players: [{ ...session.state.players[0], x: weapon.x, y: weapon.y }],
    };
    const command = { type: 'PickUp' as const, unitId: 'player-1' };
    const result = reduce(initialState, command);
    const presentation = buildPresentationEvents(
      command,
      initialState,
      result.state,
      result.events,
    );
    const timeline = buildMotionTimeline(presentation, {
      initialState,
      finalState: result.state,
    });
    const cue = timeline.cues.find((entry) => entry.kind === 'pickup');
    if (!cue) throw new Error('La recogida debe producir un cue');

    const before = presentationState(result.state, timeline, cue.atMs - 1, initialState);
    const duringCue = presentationState(result.state, timeline, cue.atMs, initialState);
    const after = presentationState(
      result.state,
      timeline,
      cue.atMs + cue.durationMs,
      initialState,
    );

    // R-011: el arma sigue en el suelo y el inventario no cambia al empezar el
    // cue; el cambio se ve al acabar el beat.
    expect(before.players[0].weapons).toEqual(initialState.players[0].weapons);
    expect(before.players[0].equipment).toEqual(initialState.players[0].equipment);
    expect(before.players[0].mp).toBe(initialState.players[0].mp);
    expect(before.map?.weapons).toEqual(initialState.map?.weapons);
    expect(duringCue.players[0].weapons).toEqual(initialState.players[0].weapons);
    expect(duringCue.players[0].equipment).toEqual(initialState.players[0].equipment);
    expect(duringCue.players[0].mp).toBe(initialState.players[0].mp);
    expect(duringCue.map?.weapons).toEqual(initialState.map?.weapons);

    expect(after.players[0].weapons).toEqual(result.state.players[0].weapons);
    expect(after.players[0].equipment).toEqual(result.state.players[0].equipment);
    expect(after.players[0].mp).toBe(result.state.players[0].mp);
    expect(after.map?.weapons).toEqual(result.state.map?.weapons);
  });

  it('el cambio de arma se aplica al final del beat, no al inicio', () => {
    const initialState = makeState({
      players: [
        makeUnit({
          id: 'player-1',
          faction: 'player',
          x: 4,
          y: 4,
          weapons: ['sword', 'axe'],
          equipment: { weaponId: 'sword', armorId: 'armor', shieldId: 'shield' },
        }),
      ],
    });
    const command = {
      type: 'SelectWeapon' as const,
      unitId: 'player-1',
      slot: 2,
    };
    const result = reduce(initialState, command);
    const presentation = buildPresentationEvents(
      command,
      initialState,
      result.state,
      result.events,
    );
    const timeline = buildMotionTimeline(presentation, {
      initialState,
      finalState: result.state,
    });
    const cue = timeline.cues.find((entry) => entry.kind === 'select-weapon');
    if (!cue) throw new Error('El cambio de arma debe producir un cue');

    const before = presentationState(result.state, timeline, cue.atMs - 1, initialState);
    const duringCue = presentationState(result.state, timeline, cue.atMs, initialState);
    const after = presentationState(
      result.state,
      timeline,
      cue.atMs + cue.durationMs,
      initialState,
    );

    expect(before.players[0].equipment.weaponId).toBe('sword');
    expect(duringCue.players[0].equipment.weaponId).toBe('sword');
    expect(after.players[0].equipment.weaponId).toBe('axe');
  });

  it('fase enemiga, fin de partida y alarma usan el atMs secuenciado', () => {
    const restored = makeState({ turn: 2, status: 'victory' });
    const events: GameEvent[] = [
      moved('player-1', { x: 2, y: 2 }, { x: 3, y: 2 }, 5),
      { type: 'TurnEnded', turn: 1 },
      { type: 'EnemyPhaseStarted', turn: 1 },
      { type: 'AlarmRaised', unitId: 'enemy-1', position: { x: 8, y: 8 } },
      { type: 'GameEnded', status: 'victory' },
    ];
    const timeline = buildMotionTimeline(events);
    const enemyPhase = timeline.events.find(
      (entry) => entry.event.type === 'EnemyPhaseStarted',
    );
    const alarm = timeline.events.find((entry) => entry.event.type === 'AlarmRaised');
    const ended = timeline.events.find((entry) => entry.event.type === 'GameEnded');
    if (!enemyPhase || !alarm || !ended) throw new Error('Faltan eventos');

    expect(enemyPhase.atMs).toBe(timeline.totalMs - (400 + 500 + 800));
    expect(alarm.atMs).toBe(enemyPhase.atMs + 400);
    expect(ended.atMs).toBe(alarm.atMs + 500);

    const beforePhase = presentationState(restored, timeline, enemyPhase.atMs - 1);
    expect(beforePhase.phase).toBe('player');
    expect(beforePhase.turn).toBe(2);

    const afterPhase = presentationState(restored, timeline, enemyPhase.atMs);
    expect(afterPhase.phase).toBe('enemy');
    expect(afterPhase.turn).toBe(1);

    const beforeEnd = presentationState(restored, timeline, ended.atMs - 1);
    expect(beforeEnd.status).toBe('playing');
  });

  it('AlarmRaised no se adelanta al inicio cuando acompaña a un movimiento', () => {
    const timeline = buildMotionTimeline([
      moved('enemy-1', { x: 7, y: 2 }, { x: 6, y: 2 }, 3),
      { type: 'AlarmRaised', unitId: 'enemy-1', position: { x: 6, y: 2 } },
    ]);
    const alarmCue = timeline.cues.find((cue) => cue.kind === 'alarm');

    expect(alarmCue?.atMs).toBe(timeline.steps[0].pauseEndMs);
    expect(alarmCue?.atMs).toBeGreaterThan(0);
  });
});

describe('beat e input durante una acción sin movimiento', () => {
  it('un ataque sin movimiento crea un beat y descarta las intenciones', () => {
    const timeline = buildMotionTimeline([hitAttack()]);
    expect(timeline.totalMs).toBe(FEEDBACK_CONFIG.beats.attackHit);
    expect(advanceTimeline(timeline, 0, 10_000)).toBe(timeline.totalMs);

    const state = makeState();
    for (const key of ['d', ' ', 'f', 'g', '1', 'e']) {
      expect(
        translateKey({ key }, state, { x: 6, y: 5 }, { animating: true }),
      ).toEqual({ type: 'ignored', reason: 'animating' });
    }
    expect(translateKey({ key: 'F1' }, state, { x: 6, y: 5 }, { animating: true })).toEqual({
      type: 'toggle-debug',
    });
    expect(translateKey({ key: 'R' }, state, { x: 6, y: 5 }, { animating: true })).toEqual({
      type: 'command',
      command: { type: 'Restart' },
    });
  });
});

describe('eventos de presentación del host', () => {
  it('crea PickUp/SelectWeapon solo cuando el motor no emitió eventos y hubo cambio', () => {
    const initialState = makeState({
      players: [
        makeUnit({
          id: 'player-1',
          faction: 'player',
          x: 4,
          y: 4,
          weapons: ['sword', 'axe'],
          equipment: { weaponId: 'sword', armorId: 'armor', shieldId: 'shield' },
        }),
      ],
    });

    const select = { type: 'SelectWeapon' as const, unitId: 'player-1', slot: 2 };
    const selected = reduce(initialState, select);
    const selectedEvents = buildPresentationEvents(
      select,
      initialState,
      selected.state,
      selected.events,
    );
    expect(selected.events).toEqual([]);
    expect(selectedEvents).toEqual([
      { type: 'SelectWeapon', unitId: 'player-1', weaponId: 'axe', slot: 2 },
    ]);

    const same = { type: 'SelectWeapon' as const, unitId: 'player-1', slot: 1 };
    const sameResult = reduce(initialState, same);
    expect(
      buildPresentationEvents(same, initialState, sameResult.state, sameResult.events),
    ).toEqual([]);

    const rejected = reduce(initialState, {
      type: 'PickUp',
      unitId: 'player-1',
    });
    const rejectedEvents = buildPresentationEvents(
      { type: 'PickUp', unitId: 'player-1' },
      initialState,
      rejected.state,
      rejected.events,
    );
    expect(rejectedEvents).toEqual(rejected.events);
    expect(rejectedEvents.every((event) => event.type === 'CommandRejected')).toBe(true);
  });
});

describe('fin de partida y reinicio en su cue', () => {
  it('el overlay espera el beat de 800 ms de GameEnded', () => {
    const state = makeState({ status: 'victory' });
    const timeline = buildMotionTimeline([{ type: 'GameEnded', status: 'victory' }], {
      finalState: state,
    });
    const cue = timeline.cues.find((entry) => entry.kind === 'game-ended');
    if (!cue) throw new Error('GameEnded debe producir un cue');

    expect(presentationState(state, timeline, cue.atMs).status).toBe('playing');
    expect(presentationState(state, timeline, cue.atMs + 799).status).toBe('playing');
    expect(presentationState(state, timeline, cue.atMs + 800).status).toBe('victory');
    expect(timeline.totalMs).toBe(FEEDBACK_CONFIG.beats.gameEnded);
  });

  it('el reinicio dura 250 ms y no añade estado intermedio', () => {
    const state = makeState();
    const timeline = buildMotionTimeline([{ type: 'GameRestarted' }], {
      finalState: state,
    });

    expect(timeline.cues.map((cue) => cue.kind)).toEqual(['game-restarted']);
    expect(timeline.totalMs).toBe(FEEDBACK_CONFIG.durations.gameRestartedMs);
  });
});
