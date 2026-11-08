import { describe, expect, it } from 'vitest';
import {
  INITIAL_MP,
  PRESETS,
  SCENARIOS,
  WORLD,
  advanceMotion,
  buildDecisionPayload,
  buildTimeline,
  cameraForPosition,
  cameraForState,
  completedStepCount,
  createMotionState,
  floorVariantFor,
  mpLeft,
  normalizeParams,
  pathTiles,
  playMotion,
  resetMotion,
  stepDuration,
  visualPosition,
  type MotionParams,
  type MotionState,
} from './motion';

const shortParams: MotionParams = normalizeParams({
  preset: 'B',
  scenario: 'short',
  diagonal: 'constant-speed',
});

const longParams: MotionParams = normalizeParams({
  preset: 'B',
  scenario: 'long',
  diagonal: 'constant-speed',
});

function advanceLoop(state: MotionState, dt: number, times: number): MotionState {
  let current = state;
  for (let index = 0; index < times; index += 1) {
    current = advanceMotion(current, dt);
  }
  return current;
}

describe('presets y normalización de parámetros', () => {
  it('aplica los valores de A, B y C', () => {
    expect(normalizeParams({ preset: 'A', scenario: 'short' })).toMatchObject({
      preset: 'A',
      stepMs: PRESETS.A.stepMs,
      pauseMs: PRESETS.A.pauseMs,
    });
    expect(normalizeParams({ preset: 'B', scenario: 'long' })).toMatchObject({
      preset: 'B',
      stepMs: 125,
      pauseMs: 50,
    });
    expect(normalizeParams({ preset: 'C', scenario: 'short' })).toMatchObject({
      preset: 'C',
      stepMs: 160,
      pauseMs: 75,
    });
  });

  it('limita los sliders y normaliza los personalizados', () => {
    expect(
      normalizeParams({ preset: 'personalizado', stepMs: 999, pauseMs: -10 }),
    ).toMatchObject({ preset: 'personalizado', stepMs: 250, pauseMs: 0 });
    expect(
      normalizeParams({ preset: 'personalizado', stepMs: 1, pauseMs: 999 }),
    ).toMatchObject({ stepMs: 40, pauseMs: 200 });
    expect(
      normalizeParams({ preset: 'personalizado', stepMs: 130.6, pauseMs: 48.4 }),
    ).toMatchObject({ stepMs: 131, pauseMs: 48 });
  });

  it('cae a los valores por defecto si el número no es finito', () => {
    const normalized = normalizeParams({
      preset: 'personalizado',
      stepMs: Number.NaN,
      pauseMs: Number.POSITIVE_INFINITY,
    });
    expect(normalized.stepMs).toBe(PRESETS.B.stepMs);
    expect(normalized.pauseMs).toBe(PRESETS.B.pauseMs);
    expect(normalized.scenario).toBe('short');
    expect(normalized.diagonal).toBe('constant-speed');
  });

  it('un preset impone su paso y su pausa aunque lleguen valores distintos', () => {
    expect(
      normalizeParams({ preset: 'A', stepMs: 250, pauseMs: 200 }),
    ).toMatchObject({ preset: 'A', stepMs: 90, pauseMs: 30 });
  });
});

describe('duración de paso y diagonal', () => {
  it('un paso recto dura stepMs en ambos modos', () => {
    expect(stepDuration(false, 125, 'constant-speed')).toBe(125);
    expect(stepDuration(false, 125, 'constant-duration')).toBe(125);
  });

  it('la diagonal dura paso × √2 o lo mismo que un recto', () => {
    expect(stepDuration(true, 125, 'constant-speed')).toBeCloseTo(125 * Math.SQRT2, 6);
    expect(stepDuration(true, 125, 'constant-duration')).toBe(125);
  });

  it('el escenario largo incluye dos diagonales y la velocidad constante tarda más', () => {
    const speed = buildTimeline(longParams, 'long');
    const duration = buildTimeline(
      { ...longParams, diagonal: 'constant-duration' },
      'long',
    );

    expect(speed.steps.map((step) => step.diagonal)).toEqual([
      false,
      true,
      false,
      false,
      true,
      false,
    ]);
    expect(speed.steps[1].durationMs).toBeCloseTo(125 * Math.SQRT2, 6);
    expect(duration.steps[1].durationMs).toBe(125);
    expect(speed.totalMs).toBeGreaterThan(duration.totalMs);
  });

  it('el escenario corto no cambia con el modo de diagonal', () => {
    const speed = buildTimeline(shortParams, 'short');
    const duration = buildTimeline(
      { ...shortParams, diagonal: 'constant-duration' },
      'short',
    );
    expect(speed.totalMs).toBe(duration.totalMs);
  });
});

describe('pausa por tile', () => {
  it('incluye la pausa del primer tile y la del destino', () => {
    const timeline = buildTimeline(longParams, 'long');
    const pauses = timeline.phases.filter((phase) => phase.kind === 'pause');

    expect(pauses).toHaveLength(timeline.steps.length + 1);
    expect(pauses[0]).toMatchObject({
      stepIndex: 0,
      tile: SCENARIOS.long.start,
      durationMs: 50,
    });
    expect(pauses[pauses.length - 1]).toMatchObject({
      stepIndex: 6,
      tile: { x: 14, y: 9 },
      durationMs: 50,
    });
  });

  it('cada transición va seguida de su pausa y el total las suma todas', () => {
    const timeline = buildTimeline(longParams, 'long');
    for (let index = 0; index < timeline.phases.length; index += 1) {
      const phase = timeline.phases[index];
      if (phase.kind !== 'transition') continue;
      const next = timeline.phases[index + 1];
      expect(next.kind).toBe('pause');
      expect(next.durationMs).toBe(50);
      expect(next.startMs).toBe(phase.endMs);
    }

    const transitions = timeline.steps.reduce((sum, step) => sum + step.durationMs, 0);
    expect(timeline.totalMs).toBeCloseTo(transitions + 7 * 50, 6);
  });

  it('con pausa 0 las fases existen pero duran cero', () => {
    const timeline = buildTimeline(
      normalizeParams({
        preset: 'personalizado',
        scenario: 'short',
        stepMs: 125,
        pauseMs: 0,
      }),
      'short',
    );
    const pauses = timeline.phases.filter((phase) => phase.kind === 'pause');
    expect(pauses).toHaveLength(4);
    expect(pauses.every((phase) => phase.durationMs === 0)).toBe(true);
    expect(timeline.totalMs).toBeCloseTo(3 * 125, 6);
  });
});

describe('avance determinista del reloj', () => {
  it('deltas grandes y pequeños producen el mismo estado final', () => {
    const initial = createMotionState(shortParams);
    const large = advanceMotion(playMotion(initial), 800);
    const small = advanceLoop(playMotion(initial), 16, 50);

    expect(large.elapsedMs).toBe(575);
    expect(large.status).toBe('ready');
    expect(small.elapsedMs).toBe(large.elapsedMs);
    expect(small.status).toBe(large.status);
    expect(visualPosition(small)).toEqual(visualPosition(large));
    expect(mpLeft(small)).toBe(mpLeft(large));
  });

  it('no adelanta pasos con un delta enorme y termina en ready', () => {
    const ready = advanceMotion(playMotion(createMotionState(longParams)), 100_000);
    expect(ready.elapsedMs).toBe(ready.timeline.totalMs);
    expect(ready.status).toBe('ready');
    expect(completedStepCount(ready)).toBe(6);
    expect(mpLeft(ready)).toBe(0);

    // Sin salir de ready, nuevos avances no cambian nada.
    expect(advanceMotion(ready, 500)).toBe(ready);
  });

  it('el MP baja al completar cada paso, no al empezar', () => {
    const initial = playMotion(createMotionState(shortParams));
    expect(completedStepCount(initial)).toBe(0);
    expect(mpLeft(initial)).toBe(INITIAL_MP);

    const justBefore = advanceMotion(initial, 174);
    expect(justBefore.elapsedMs).toBe(174);
    expect(completedStepCount(justBefore)).toBe(0);
    expect(mpLeft(justBefore)).toBe(6);

    const completed = advanceMotion(justBefore, 1);
    expect(completedStepCount(completed)).toBe(1);
    expect(mpLeft(completed)).toBe(5);
  });

  it('recorre los 6 pasos con MP 6→0 y espera la pausa del destino', () => {
    let state = playMotion(createMotionState(longParams));
    const seen: number[] = [mpLeft(state)];

    for (const step of state.timeline.steps) {
      state = advanceMotion(state, step.endMs - state.elapsedMs);
      seen.push(mpLeft(state));
      expect(completedStepCount(state)).toBe(step.index + 1);
    }

    expect(seen).toEqual([6, 5, 4, 3, 2, 1, 0]);
    expect(state.status).toBe('playing');

    state = advanceMotion(state, 50);
    expect(state.status).toBe('ready');
  });

  it('reset vuelve a idle y play reinicia desde cero', () => {
    const played = advanceMotion(playMotion(createMotionState(shortParams)), 300);
    const reset = resetMotion(played);
    expect(reset.status).toBe('idle');
    expect(reset.elapsedMs).toBe(0);

    const replayed = playMotion(reset);
    expect(replayed.status).toBe('playing');
    expect(replayed.elapsedMs).toBe(0);
  });
});

describe('posición visual y cámara', () => {
  it('la cámara centra y limita con enteros en el escenario corto', () => {
    const initial = createMotionState(shortParams);
    expect(visualPosition(initial)).toEqual({
      x: 208,
      y: 208,
      tileX: 6,
      tileY: 6,
    });
    expect(cameraForState(initial)).toEqual({ x: 0, y: 0 });

    const ready = advanceMotion(playMotion(initial), 10_000);
    expect(visualPosition(ready)).toEqual({
      x: 304,
      y: 208,
      tileX: 9,
      tileY: 6,
    });
    expect(cameraForState(ready)).toEqual({ x: 96, y: 0 });
    expect(visualPosition(ready).x - cameraForState(ready).x).toBe(208);
  });

  it('en el escenario largo termina clampada a la derecha y descentrada', () => {
    const ready = advanceMotion(playMotion(createMotionState(longParams)), 10_000);
    const position = visualPosition(ready);
    const camera = cameraForState(ready);

    expect(position).toEqual({ x: 464, y: 304, tileX: 14, tileY: 9 });
    expect(camera).toEqual({ x: 224, y: 96 });
    expect(camera.x).toBe(WORLD.width - 416);
    expect(position.x - camera.x).toBeGreaterThan(208);
  });

  it('durante una transición la posición y la cámara son enteras', () => {
    const mid = advanceMotion(playMotion(createMotionState(longParams)), 300);
    const position = visualPosition(mid);
    const camera = cameraForState(mid);

    expect(mid.status).toBe('playing');
    expect(Number.isInteger(position.x)).toBe(true);
    expect(Number.isInteger(position.y)).toBe(true);
    expect(Number.isInteger(camera.x)).toBe(true);
    expect(Number.isInteger(camera.y)).toBe(true);
    expect(camera.x).toBeGreaterThanOrEqual(0);
    expect(camera.x).toBeLessThanOrEqual(224);
    expect(camera.y).toBeGreaterThanOrEqual(0);
    expect(camera.y).toBeLessThanOrEqual(224);

    // Está entre centros de tiles: no cae en un múltiplo de 32 + 16.
    expect((position.x - 16) % 32).not.toBe(0);
    expect((position.y - 16) % 32).not.toBe(0);
  });

  it('limita la cámara a los bordes del mundo con enteros', () => {
    expect(cameraForPosition({ x: -100, y: -100 })).toEqual({ x: 0, y: 0 });
    expect(cameraForPosition({ x: 9999, y: 9999 })).toEqual({ x: 224, y: 224 });
    expect(cameraForPosition({ x: 317.4, y: 290.6 })).toEqual({ x: 109, y: 83 });
  });
});

describe('determinismo del escenario', () => {
  it('el camino no depende de la semilla y el largo acaba en (14,9)', () => {
    expect(pathTiles('short')).toEqual([
      { x: 6, y: 6 },
      { x: 7, y: 6 },
      { x: 8, y: 6 },
      { x: 9, y: 6 },
    ]);
    expect(pathTiles('long')).toHaveLength(7);
    expect(pathTiles('long')[pathTiles('long').length - 1]).toEqual({ x: 14, y: 9 });
  });

  it('dos timelines con los mismos parámetros son iguales', () => {
    expect(buildTimeline(longParams, 'long')).toEqual(buildTimeline(longParams, 'long'));
    expect(createMotionState(shortParams)).toEqual(createMotionState(shortParams));
  });

  it('las variantes de suelo son reproducibles y válidas', () => {
    const first = Array.from({ length: 25 }, (_, index) =>
      floorVariantFor(279837264, index % 5, Math.floor(index / 5)),
    );
    const second = Array.from({ length: 25 }, (_, index) =>
      floorVariantFor(279837264, index % 5, Math.floor(index / 5)),
    );
    const other = Array.from({ length: 25 }, (_, index) =>
      floorVariantFor(1, index % 5, Math.floor(index / 5)),
    );

    expect(first).toEqual(second);
    expect(first.some((variant) => variant < 1 || variant > 3)).toBe(false);
    expect(first).not.toEqual(other);
  });
});

describe('decisión exportable', () => {
  it('lleva los valores reales y el modo de diagonal', () => {
    const custom = normalizeParams({
      preset: 'personalizado',
      scenario: 'long',
      stepMs: 150,
      pauseMs: 60,
      diagonal: 'constant-duration',
    });
    const payload = buildDecisionPayload(
      custom,
      279837264,
      'personalizado',
      'Se lee bien, pero probar 140 ms.',
      '2026-11-08T10:00:00.000Z',
    );

    expect(payload).toMatchObject({
      experiment: 'EXP-002',
      seed: 279837264,
      decision: 'personalizado',
      preset: 'personalizado',
      scenario: 'long',
      stepMs: 150,
      pauseMs: 60,
      diagonal: 'constant-duration',
      decidedAt: '2026-11-08T10:00:00.000Z',
    });
    expect(payload.parameters).toMatchObject({
      stepMs: 150,
      pauseMs: 60,
      diagonal: 'constant-duration',
      seed: 279837264,
      notes: 'Se lee bien, pero probar 140 ms.',
    });
  });
});
