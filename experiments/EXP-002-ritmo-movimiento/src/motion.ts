/**
 * Modelo puro de EXP-002: timeline de presentación del recorrido, cámara y
 * decisión. No conoce DOM, Canvas, `performance.now` ni `Math.random`.
 */

export const TILE_SIZE = 32;
export const VIEWPORT_COLUMNS = 13;
export const WORLD_COLUMNS = 20;
export const INITIAL_MP = 6;

export const VIEWPORT = {
  width: VIEWPORT_COLUMNS * TILE_SIZE,
  height: VIEWPORT_COLUMNS * TILE_SIZE,
} as const;

export const WORLD = {
  width: WORLD_COLUMNS * TILE_SIZE,
  height: WORLD_COLUMNS * TILE_SIZE,
} as const;

export const EXPERIMENT_QUESTION =
  '¿Qué duración de paso, pausa por tile y tratamiento de la diagonal hacen que recorrer el camino se sienta ágil y legible?';

export const EXPERIMENT_TITLE = 'Ritmo del movimiento animado';

export const PRESETS = {
  A: { label: 'A · Ágil', stepMs: 90, pauseMs: 30 },
  B: { label: 'B · Medio', stepMs: 125, pauseMs: 50 },
  C: { label: 'C · Pausado', stepMs: 160, pauseMs: 75 },
} as const;

export type PresetId = keyof typeof PRESETS;
export type PresetValue = PresetId | 'personalizado';
export type DiagonalMode = 'constant-speed' | 'constant-duration';
export type ScenarioId = 'short' | 'long';

export const STEP_MS_LIMITS = { min: 40, max: 250 } as const;
export const PAUSE_MS_LIMITS = { min: 0, max: 200 } as const;

export const DIAGONAL_OPTIONS: ReadonlyArray<{
  value: DiagonalMode;
  label: string;
}> = [
  { value: 'constant-speed', label: 'Velocidad constante (paso × √2)' },
  { value: 'constant-duration', label: 'Duración constante (igual que recto)' },
];

export type MotionParams = {
  preset: PresetValue;
  scenario: ScenarioId;
  stepMs: number;
  pauseMs: number;
  diagonal: DiagonalMode;
};

export type Direction = { readonly dx: number; readonly dy: number };

export type ScenarioDefinition = {
  readonly label: string;
  readonly description: string;
  readonly start: { readonly x: number; readonly y: number };
  readonly steps: ReadonlyArray<Direction>;
};

/**
 * El corto empieza en (6,6) para que el centro del tile coincida con el del
 * viewport y la cámara no tenga que limitarse en ningún punto. El largo acaba
 * en la columna 14 con la cámara clampada a `maxX = (20 − 13) × 32 = 224`.
 */
export const SCENARIOS: Record<ScenarioId, ScenarioDefinition> = {
  short: {
    label: 'Corto · 3 pasos rectos',
    description: 'Recorrido recto de 3 tiles con la cámara centrada todo el tiempo.',
    start: { x: 6, y: 6 },
    steps: [
      { dx: 1, dy: 0 },
      { dx: 1, dy: 0 },
      { dx: 1, dy: 0 },
    ],
  },
  long: {
    label: 'Largo · 6 pasos con diagonales',
    description: 'Dos diagonales y un tramo final contra el borde derecho del mapa.',
    start: { x: 8, y: 9 },
    steps: [
      { dx: 1, dy: 0 },
      { dx: 1, dy: -1 },
      { dx: 1, dy: 0 },
      { dx: 1, dy: 0 },
      { dx: 1, dy: 1 },
      { dx: 1, dy: 0 },
    ],
  },
};

function clampInteger(value: unknown, min: number, max: number, fallback: number): number {
  const numeric = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(numeric)) return fallback;
  return Math.min(max, Math.max(min, Math.round(numeric)));
}

/**
 * Normaliza los parámetros. Un preset A/B/C impone sus valores de paso y pausa;
 * `personalizado` respeta los valores recibidos y los limita a los sliders.
 */
export function normalizeParams(input: Partial<MotionParams> = {}): MotionParams {
  const scenario: ScenarioId = input.scenario === 'long' ? 'long' : 'short';
  const diagonal: DiagonalMode =
    input.diagonal === 'constant-duration' ? 'constant-duration' : 'constant-speed';
  const preset = input.preset;

  if (preset === 'A' || preset === 'B' || preset === 'C') {
    const values = PRESETS[preset];
    return {
      preset,
      scenario,
      stepMs: values.stepMs,
      pauseMs: values.pauseMs,
      diagonal,
    };
  }

  return {
    preset: 'personalizado',
    scenario,
    stepMs: clampInteger(input.stepMs, STEP_MS_LIMITS.min, STEP_MS_LIMITS.max, PRESETS.B.stepMs),
    pauseMs: clampInteger(input.pauseMs, PAUSE_MS_LIMITS.min, PAUSE_MS_LIMITS.max, PRESETS.B.pauseMs),
    diagonal,
  };
}

export const DEFAULT_PARAMS: MotionParams = normalizeParams({
  preset: 'B',
  scenario: 'short',
  diagonal: 'constant-speed',
});

export type MotionStep = {
  readonly index: number;
  readonly from: { readonly x: number; readonly y: number };
  readonly to: { readonly x: number; readonly y: number };
  readonly dx: number;
  readonly dy: number;
  readonly diagonal: boolean;
  readonly durationMs: number;
  readonly startMs: number;
  readonly endMs: number;
  readonly mpAfter: number;
};

export type PausePhase = {
  readonly kind: 'pause';
  readonly startMs: number;
  readonly endMs: number;
  readonly durationMs: number;
  readonly stepIndex: number;
  readonly tile: { readonly x: number; readonly y: number };
};

export type TransitionPhase = {
  readonly kind: 'transition';
  readonly startMs: number;
  readonly endMs: number;
  readonly durationMs: number;
  readonly stepIndex: number;
  readonly from: { readonly x: number; readonly y: number };
  readonly to: { readonly x: number; readonly y: number };
};

export type Phase = PausePhase | TransitionPhase;

export type MotionTimeline = {
  readonly totalMs: number;
  readonly steps: ReadonlyArray<MotionStep>;
  readonly phases: ReadonlyArray<Phase>;
  readonly pauseMs: number;
  readonly diagonal: DiagonalMode;
  readonly scenario: ScenarioId;
};

export type MotionStatus = 'idle' | 'playing' | 'ready';

export type MotionState = {
  readonly params: MotionParams;
  readonly timeline: MotionTimeline;
  readonly elapsedMs: number;
  readonly status: MotionStatus;
};

export function stepDuration(
  diagonal: boolean,
  stepMs: number,
  mode: DiagonalMode,
): number {
  return diagonal && mode === 'constant-speed' ? stepMs * Math.SQRT2 : stepMs;
}

/**
 * Construye la timeline completa. Cada tile tiene su pausa: la del inicio
 * (`stepIndex = 0`), las intermedias y la del destino (`stepIndex = steps`).
 */
export function buildTimeline(
  params: MotionParams,
  scenarioId: ScenarioId = params.scenario,
): MotionTimeline {
  const effective = normalizeParams({ ...params, scenario: scenarioId });
  const scenario = SCENARIOS[scenarioId];
  const phases: Phase[] = [];
  const steps: MotionStep[] = [];
  let tile = { ...scenario.start };
  let cursor = 0;

  phases.push({
    kind: 'pause',
    startMs: 0,
    endMs: effective.pauseMs,
    durationMs: effective.pauseMs,
    stepIndex: 0,
    tile: { ...tile },
  });
  cursor = effective.pauseMs;

  scenario.steps.forEach((direction, index) => {
    const next = { x: tile.x + direction.dx, y: tile.y + direction.dy };
    const diagonal = direction.dx !== 0 && direction.dy !== 0;
    const durationMs = stepDuration(diagonal, effective.stepMs, effective.diagonal);
    const startMs = cursor;
    const endMs = startMs + durationMs;

    steps.push({
      index,
      from: { ...tile },
      to: { ...next },
      dx: direction.dx,
      dy: direction.dy,
      diagonal,
      durationMs,
      startMs,
      endMs,
      mpAfter: Math.max(0, INITIAL_MP - index - 1),
    });

    phases.push({
      kind: 'transition',
      startMs,
      endMs,
      durationMs,
      stepIndex: index,
      from: { ...tile },
      to: { ...next },
    });

    cursor = endMs;
    const pauseEnd = cursor + effective.pauseMs;
    phases.push({
      kind: 'pause',
      startMs: cursor,
      endMs: pauseEnd,
      durationMs: effective.pauseMs,
      stepIndex: index + 1,
      tile: { ...next },
    });
    cursor = pauseEnd;
    tile = next;
  });

  return {
    totalMs: cursor,
    steps,
    phases,
    pauseMs: effective.pauseMs,
    diagonal: effective.diagonal,
    scenario: scenarioId,
  };
}

export function createMotionState(
  params: MotionParams,
  scenarioId: ScenarioId = params.scenario,
): MotionState {
  const effective = normalizeParams({ ...params, scenario: scenarioId });
  return {
    params: effective,
    timeline: buildTimeline(effective, scenarioId),
    elapsedMs: 0,
    status: 'idle',
  };
}

export function playMotion(state: MotionState): MotionState {
  return { ...state, elapsedMs: 0, status: 'playing' };
}

export function resetMotion(state: MotionState): MotionState {
  return { ...state, elapsedMs: 0, status: 'idle' };
}

/**
 * Avanza el reloj de presentación en subtramos de 50 ms como máximo, para que
 * un delta grande no salte fases ni pasos. Es determinista: no mira el reloj.
 */
export function advanceMotion(state: MotionState, dt: number): MotionState {
  if (state.status !== 'playing') return state;
  let remaining = Number.isFinite(dt) ? Math.max(0, dt) : 0;
  if (remaining === 0) return state;

  let elapsed = state.elapsedMs;
  const total = state.timeline.totalMs;

  while (remaining > 0) {
    const chunk = Math.min(50, remaining);
    elapsed = Math.min(total, elapsed + chunk);
    remaining -= chunk;
    if (elapsed >= total) break;
  }

  return {
    ...state,
    elapsedMs: elapsed,
    status: elapsed >= total ? 'ready' : 'playing',
  };
}

export function completedStepCount(state: MotionState): number {
  let count = 0;
  for (const step of state.timeline.steps) {
    if (state.elapsedMs + 1e-9 >= step.endMs) count += 1;
  }
  return count;
}

export function mpLeft(state: MotionState): number {
  return Math.max(0, INITIAL_MP - completedStepCount(state));
}

export type VisualPosition = {
  /** Centro del sprite en píxeles de mundo, redondeado a entero. */
  readonly x: number;
  readonly y: number;
  readonly tileX: number;
  readonly tileY: number;
};

function tileCenter(tile: { x: number; y: number }): { x: number; y: number } {
  return {
    x: tile.x * TILE_SIZE + TILE_SIZE / 2,
    y: tile.y * TILE_SIZE + TILE_SIZE / 2,
  };
}

/**
 * Posición visual: centro del sprite. En pausa coincide con el centro del tile;
 * en transición interpola en línea recta (también en diagonal) y redondea.
 */
export function visualPosition(state: MotionState): VisualPosition {
  const elapsed = Math.min(state.elapsedMs, state.timeline.totalMs);
  const lastStep = state.timeline.steps[state.timeline.steps.length - 1];
  let x = tileCenter(lastStep.to).x;
  let y = tileCenter(lastStep.to).y;

  if (elapsed < state.timeline.totalMs) {
    let phase: Phase | undefined;
    for (const candidate of state.timeline.phases) {
      if (elapsed < candidate.endMs) {
        phase = candidate;
        break;
      }
    }

    if (phase?.kind === 'pause') {
      const center = tileCenter(phase.tile);
      x = center.x;
      y = center.y;
    } else if (phase?.kind === 'transition') {
      const from = tileCenter(phase.from);
      const to = tileCenter(phase.to);
      const progress =
        phase.durationMs > 0
          ? Math.min(1, Math.max(0, (elapsed - phase.startMs) / phase.durationMs))
          : 1;
      x = from.x + (to.x - from.x) * progress;
      y = from.y + (to.y - from.y) * progress;
    }
  }

  const roundedX = Math.round(x);
  const roundedY = Math.round(y);
  return {
    x: roundedX,
    y: roundedY,
    tileX: Math.min(WORLD_COLUMNS - 1, Math.max(0, Math.floor(roundedX / TILE_SIZE))),
    tileY: Math.min(WORLD_COLUMNS - 1, Math.max(0, Math.floor(roundedY / TILE_SIZE))),
  };
}

export function cameraForPosition(
  position: { readonly x: number; readonly y: number },
  world: { readonly width: number; readonly height: number } = WORLD,
  viewport: { readonly width: number; readonly height: number } = VIEWPORT,
): { x: number; y: number } {
  const maxX = Math.max(0, world.width - viewport.width);
  const maxY = Math.max(0, world.height - viewport.height);
  return {
    x: Math.min(maxX, Math.max(0, Math.round(position.x - viewport.width / 2))),
    y: Math.min(maxY, Math.max(0, Math.round(position.y - viewport.height / 2))),
  };
}

export function cameraForState(state: MotionState): { x: number; y: number } {
  return cameraForPosition(visualPosition(state));
}

/** Variante de suelo determinista por semilla y tile (no usa azar). */
export function floorVariantFor(seed: number, x: number, y: number): 1 | 2 | 3 {
  let hash = 2166136261;
  hash ^= seed >>> 0;
  hash = Math.imul(hash, 16777619);
  hash ^= x + 1;
  hash = Math.imul(hash, 16777619);
  hash ^= y + 1;
  hash = Math.imul(hash, 16777619);
  hash ^= (x * 31 + y * 17) >>> 0;
  hash = Math.imul(hash, 16777619);
  return (((hash >>> 0) % 3) + 1) as 1 | 2 | 3;
}

export type TilePoint = { readonly x: number; readonly y: number };

/** Tiles del camino, incluido el inicio; no depende de la semilla. */
export function pathTiles(scenarioId: ScenarioId): TilePoint[] {
  const scenario = SCENARIOS[scenarioId];
  const tiles: TilePoint[] = [{ ...scenario.start }];
  let tile = { ...scenario.start };
  for (const direction of scenario.steps) {
    tile = { x: tile.x + direction.dx, y: tile.y + direction.dy };
    tiles.push(tile);
  }
  return tiles;
}

export type MotionDecisionPayload = {
  readonly experiment: 'EXP-002';
  readonly question: string;
  readonly seed: number;
  readonly decision: string;
  readonly notes: string;
  readonly decidedAt: string;
  readonly preset: PresetValue;
  readonly scenario: ScenarioId;
  readonly stepMs: number;
  readonly pauseMs: number;
  readonly diagonal: DiagonalMode;
  readonly parameters: {
    readonly preset: PresetValue;
    readonly scenario: ScenarioId;
    readonly stepMs: number;
    readonly pauseMs: number;
    readonly diagonal: DiagonalMode;
    readonly seed: number;
    readonly notes: string;
    readonly decidedAt: string;
  };
};

export function buildDecisionPayload(
  params: MotionParams,
  seed: number,
  decision: string,
  notes: string,
  decidedAt: string,
): MotionDecisionPayload {
  const effective = normalizeParams(params);
  return {
    experiment: 'EXP-002',
    question: EXPERIMENT_QUESTION,
    seed,
    decision,
    notes,
    decidedAt,
    preset: effective.preset,
    scenario: effective.scenario,
    stepMs: effective.stepMs,
    pauseMs: effective.pauseMs,
    diagonal: effective.diagonal,
    parameters: {
      preset: effective.preset,
      scenario: effective.scenario,
      stepMs: effective.stepMs,
      pauseMs: effective.pauseMs,
      diagonal: effective.diagonal,
      seed,
      notes,
      decidedAt,
    },
  };
}

export type TimelineSummary = {
  readonly totalMs: number;
  readonly elapsedMs: number;
  readonly steps: number;
  readonly diagonal: DiagonalMode;
};

export type MotionExperimentApi = {
  readonly id: string;
  readonly getParams: () => MotionParams;
  readonly setParams: (next: Partial<MotionParams>) => void;
  readonly getSeed: () => number;
  readonly setSeed: (seed: number) => void;
  readonly reset: () => void;
  readonly play: () => void;
  readonly step: (dt?: number) => void;
  readonly getState: () => MotionStatus;
  readonly getScenario: () => ScenarioId;
  readonly getStep: () => number;
  readonly getMpLeft: () => number;
  readonly getVisualPosition: () => VisualPosition;
  readonly getCamera: () => { x: number; y: number };
  readonly getPath: () => TilePoint[];
  readonly getTimeline: () => TimelineSummary;
  readonly getDecision: () => MotionDecisionPayload;
  readonly isAssetsReady: () => boolean;
  readonly snapshot: () => {
    params: MotionParams;
    seed: number;
    variants: Array<{ id: string; metrics: Array<{ label: string; value: string | number }> }>;
  };
};
