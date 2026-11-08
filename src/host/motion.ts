import type { GameEvent, GameState, Position } from '../game/types';
import { clampCamera, type Camera } from './camera';
import { TILE_SIZE, type Viewport, type WorldSize } from './geometry';

/**
 * Configuración única de la presentación del movimiento. Los valores vienen de
 * la decisión de EXP-002: 125 ms por paso, 70 ms de pausa por tile (inicio,
 * intermedios y destino) y diagonal a duración constante.
 */
export const MOTION_CONFIG = {
  stepMs: 125,
  pauseMs: 70,
  diagonal: 'constant-duration',
} as const;

export type MotionDiagonal = (typeof MOTION_CONFIG)['diagonal'];

/** Subtramo máximo del reloj de presentación para no saltar fases. */
export const MAX_ADVANCE_CHUNK_MS = 50;

const EPSILON = 1e-9;

export interface MotionStep {
  readonly index: number;
  readonly unitId: string;
  readonly from: Position;
  readonly to: Position;
  readonly dx: number;
  readonly dy: number;
  readonly diagonal: boolean;
  readonly durationMs: number;
  readonly startMs: number;
  readonly endMs: number;
  /** Fin de la pausa posterior, ya en el tile de destino. */
  readonly pauseEndMs: number;
  readonly mpAfter: number;
}

export interface MotionPausePhase {
  readonly kind: 'pause';
  readonly startMs: number;
  readonly endMs: number;
  readonly durationMs: number;
  readonly stepIndex: number;
  readonly tile: Position;
  readonly unitId: string;
}

export interface MotionTransitionPhase {
  readonly kind: 'transition';
  readonly startMs: number;
  readonly endMs: number;
  readonly durationMs: number;
  readonly stepIndex: number;
  readonly from: Position;
  readonly to: Position;
  readonly unitId: string;
}

export type MotionPhase = MotionPausePhase | MotionTransitionPhase;

export interface MotionTimelineEvent {
  readonly atMs: number;
  readonly event: GameEvent;
}

export interface MotionTimeline {
  readonly steps: readonly MotionStep[];
  readonly phases: readonly MotionPhase[];
  /** Eventos que no son `UnitMoved`, situados en el reloj en que ocurren. */
  readonly events: readonly MotionTimelineEvent[];
  readonly totalMs: number;
  readonly focusUnitIds: readonly string[];
  readonly stepCount: number;
}

export interface VisualPosition {
  /** Centro del sprite en píxeles de mundo, redondeado a entero. */
  readonly x: number;
  readonly y: number;
  readonly tileX: number;
  readonly tileY: number;
}

function isDiagonal(from: Position, to: Position): boolean {
  return from.x !== to.x && from.y !== to.y;
}

function stepDurationMs(diagonal: boolean): number {
  if (!diagonal) return MOTION_CONFIG.stepMs;
  if (MOTION_CONFIG.diagonal === 'constant-duration') return MOTION_CONFIG.stepMs;
  return Math.round(MOTION_CONFIG.stepMs * Math.SQRT2);
}

function tileCenter(tile: Position): { x: number; y: number } {
  return {
    x: tile.x * TILE_SIZE + TILE_SIZE / 2,
    y: tile.y * TILE_SIZE + TILE_SIZE / 2,
  };
}

function toVisualPosition(centerX: number, centerY: number): VisualPosition {
  const x = Math.round(centerX);
  const y = Math.round(centerY);
  return {
    x,
    y,
    tileX: Math.floor(x / TILE_SIZE),
    tileY: Math.floor(y / TILE_SIZE),
  };
}

/**
 * Construye la timeline de presentación a partir de los eventos ordenados de la
 * acción. Es pura: no muta los eventos y no conoce reloj real ni DOM.
 *
 * Un `UnitMoved` contiguo de la misma unidad continúa el grupo: pausa inicial,
 * transición y pausa en el destino por cada paso, de modo que `n` pasos dejan
 * `n + 1` pausas. Los demás eventos se sitúan al final de la pausa vigente.
 */
export function buildMotionTimeline(events: readonly GameEvent[]): MotionTimeline {
  const steps: MotionStep[] = [];
  const phases: MotionPhase[] = [];
  const timedEvents: MotionTimelineEvent[] = [];
  const focusUnitIds: string[] = [];
  let clock = 0;
  let lastUnitId: string | undefined;
  let lastTo: Position | undefined;

  for (const event of events) {
    if (event.type !== 'UnitMoved') {
      timedEvents.push({ atMs: clock, event });
      continue;
    }

    const continuesGroup =
      lastUnitId === event.unitId &&
      lastTo !== undefined &&
      event.from.x === lastTo.x &&
      event.from.y === lastTo.y;

    if (!continuesGroup) {
      phases.push({
        kind: 'pause',
        startMs: clock,
        endMs: clock + MOTION_CONFIG.pauseMs,
        durationMs: MOTION_CONFIG.pauseMs,
        stepIndex: steps.length,
        tile: { ...event.from },
        unitId: event.unitId,
      });
      clock += MOTION_CONFIG.pauseMs;
    }

    if (!focusUnitIds.includes(event.unitId)) focusUnitIds.push(event.unitId);

    const diagonal = isDiagonal(event.from, event.to);
    const durationMs = stepDurationMs(diagonal);
    const startMs = clock;
    const endMs = startMs + durationMs;

    steps.push({
      index: steps.length,
      unitId: event.unitId,
      from: { ...event.from },
      to: { ...event.to },
      dx: event.to.x - event.from.x,
      dy: event.to.y - event.from.y,
      diagonal,
      durationMs,
      startMs,
      endMs,
      pauseEndMs: endMs + MOTION_CONFIG.pauseMs,
      mpAfter: event.mpLeft,
    });

    phases.push({
      kind: 'transition',
      startMs,
      endMs,
      durationMs,
      stepIndex: steps.length - 1,
      from: { ...event.from },
      to: { ...event.to },
      unitId: event.unitId,
    });

    clock = endMs;
    phases.push({
      kind: 'pause',
      startMs: clock,
      endMs: clock + MOTION_CONFIG.pauseMs,
      durationMs: MOTION_CONFIG.pauseMs,
      stepIndex: steps.length,
      tile: { ...event.to },
      unitId: event.unitId,
    });
    clock += MOTION_CONFIG.pauseMs;

    lastUnitId = event.unitId;
    lastTo = event.to;
  }

  return {
    steps,
    phases,
    events: timedEvents,
    totalMs: clock,
    focusUnitIds,
    stepCount: steps.length,
  };
}

/** Pasos cuya transición ya ha terminado a `elapsed`. */
export function completedSteps(timeline: MotionTimeline, elapsed: number): number {
  let count = 0;
  for (const step of timeline.steps) {
    if (elapsed + EPSILON >= step.endMs) count += 1;
  }
  return count;
}

/** Transición activa, o `null` si el reloj está en una pausa o al final. */
export function currentStep(
  timeline: MotionTimeline,
  elapsed: number,
): MotionStep | null {
  for (const step of timeline.steps) {
    if (elapsed + EPSILON >= step.startMs && elapsed < step.endMs) return step;
  }
  return null;
}

/** Unidad enfocada por la cámara: la del grupo activo o la última animada. */
export function focusUnitId(
  timeline: MotionTimeline,
  elapsed: number,
): string | null {
  for (const phase of timeline.phases) {
    if (elapsed + EPSILON >= phase.startMs && elapsed < phase.endMs) {
      return phase.unitId;
    }
  }
  return timeline.steps.at(-1)?.unitId ?? null;
}

/**
 * Posición visual de una unidad: centro del tile en pausa, interpolación
 * lineal recta (también en diagonal) en transición y redondeo a entero.
 */
export function visualPosition(
  timeline: MotionTimeline,
  elapsed: number,
  unitId: string,
): VisualPosition | null {
  const unitSteps = timeline.steps.filter((step) => step.unitId === unitId);
  if (unitSteps.length === 0) return null;

  let last = tileCenter(unitSteps[0].from);
  for (const step of unitSteps) {
    if (elapsed < step.startMs) {
      return toVisualPosition(tileCenter(step.from).x, tileCenter(step.from).y);
    }
    if (elapsed < step.endMs) {
      const from = tileCenter(step.from);
      const to = tileCenter(step.to);
      const progress =
        step.durationMs > 0
          ? Math.min(1, Math.max(0, (elapsed - step.startMs) / step.durationMs))
          : 1;
      return toVisualPosition(
        from.x + (to.x - from.x) * progress,
        from.y + (to.y - from.y) * progress,
      );
    }
    last = tileCenter(step.to);
  }

  return toVisualPosition(last.x, last.y);
}

/** Posiciones visuales de todas las unidades que participan en la timeline. */
export function visualPositions(
  timeline: MotionTimeline,
  elapsed: number,
): ReadonlyMap<string, VisualPosition> {
  const positions = new Map<string, VisualPosition>();
  for (const unitId of timeline.focusUnitIds) {
    const position = visualPosition(timeline, elapsed, unitId);
    if (position) positions.set(unitId, position);
  }
  return positions;
}

/**
 * Cámara de presentación: centra el sprite enfocado menos medio viewport,
 * redondea a píxel entero y limita a los bordes del mapa.
 */
export function cameraAt(
  timeline: MotionTimeline,
  elapsed: number,
  world: WorldSize,
  viewport: Viewport,
): Camera {
  const unitId = focusUnitId(timeline, elapsed);
  const position = unitId ? visualPosition(timeline, elapsed, unitId) : null;
  const targetX = position ? position.x : world.width / 2;
  const targetY = position ? position.y : world.height / 2;
  return clampCamera(
    {
      x: Math.round(targetX - viewport.width / 2),
      y: Math.round(targetY - viewport.height / 2),
    },
    world,
    viewport,
  );
}

/**
 * Avanza el reloj de presentación en subtramos de 50 ms como máximo. Un delta
 * grande recorre todas las fases sin saltárselas. Determinista: no mira relojes.
 */
export function advanceTimeline(
  timeline: MotionTimeline,
  elapsed: number,
  deltaMs: number,
): number {
  let remaining = Number.isFinite(deltaMs) ? Math.max(0, deltaMs) : 0;
  let next = Math.min(timeline.totalMs, Math.max(0, elapsed));

  while (remaining > EPSILON && next < timeline.totalMs) {
    const chunk = Math.min(MAX_ADVANCE_CHUNK_MS, remaining);
    next = Math.min(timeline.totalMs, next + chunk);
    remaining -= chunk;
  }

  return next;
}

function lastEventOfType<K extends GameEvent['type']>(
  timeline: MotionTimeline,
  type: K,
  elapsed: number,
): Extract<GameEvent, { type: K }> | undefined {
  let found: Extract<GameEvent, { type: K }> | undefined;
  for (const entry of timeline.events) {
    if (entry.atMs > elapsed + EPSILON) continue;
    if (entry.event.type === type) {
      found = entry.event as Extract<GameEvent, { type: K }>;
    }
  }
  return found;
}

/**
 * Estado derivado para HUD y render: parte del estado final del motor y
 * deshace los eventos que todavía no han ocurrido a `elapsed`. No muta el
 * estado de entrada.
 */
export function presentationState(
  state: GameState,
  timeline: MotionTimeline,
  elapsed: number,
  initialState?: GameState,
): GameState {
  let players = state.players;
  let enemies = state.enemies;

  // Deshacer en orden inverso los ataques que aún no han ocurrido restaura la
  // vida previa de cada objetivo, incluso con varios ataques encadenados.
  for (let index = timeline.events.length - 1; index >= 0; index -= 1) {
    const entry = timeline.events[index];
    if (entry.event.type !== 'AttackPerformed' || entry.atMs <= elapsed + EPSILON) {
      continue;
    }
    const { targetId, targetHp, damage } = entry.event;
    players = players.map((unit) =>
      unit.id === targetId ? { ...unit, hp: targetHp + damage } : unit,
    );
    enemies = enemies.map((unit) =>
      unit.id === targetId ? { ...unit, hp: targetHp + damage } : unit,
    );
  }

  const player = players[0];
  if (player) {
    const initialPlayer = initialState?.players.find((unit) => unit.id === player.id);
    const playerTurn = lastEventOfType(timeline, 'PlayerTurnStarted', elapsed);
    const playerSteps = timeline.steps.filter((step) => step.unitId === player.id);
    if (playerTurn) {
      players = players.map((unit) =>
        unit.id === player.id ? { ...unit, mp: player.mp } : unit,
      );
    } else if (playerSteps.length > 0) {
      const completed = playerSteps.filter(
        (step) => elapsed + EPSILON >= step.endMs,
      ).length;
      const initialMp = player.mp + playerSteps.length;
      const mp =
        completed === 0
          ? (initialPlayer?.mp ?? initialMp)
          : playerSteps[completed - 1].mpAfter;
      players = players.map((unit) => (unit.id === player.id ? { ...unit, mp } : unit));
    } else if (initialPlayer) {
      players = players.map((unit) =>
        unit.id === player.id ? { ...unit, mp: initialPlayer.mp } : unit,
      );
    }

    const attack = timeline.events.find(
      (entry) =>
        entry.event.type === 'AttackPerformed' && entry.event.attackerId === player.id,
    );
    if (attack || initialPlayer) {
      const occurred = attack ? attack.atMs <= elapsed + EPSILON : false;
      const actionAvailable = playerTurn
        ? player.actionAvailable
        : occurred
          ? false
          : (initialPlayer?.actionAvailable ?? true);
      players = players.map((unit) =>
        unit.id === player.id ? { ...unit, actionAvailable } : unit,
      );
    }
  }

  const enemyPhase = lastEventOfType(timeline, 'EnemyPhaseStarted', elapsed);
  const playerTurn = lastEventOfType(timeline, 'PlayerTurnStarted', elapsed);
  let phase = state.phase;
  let turn = state.turn;
  if (enemyPhase) {
    phase = 'enemy';
    turn = enemyPhase.turn;
  }
  if (playerTurn) {
    phase = 'player';
    turn = playerTurn.turn;
  }

  const gameEnded = lastEventOfType(timeline, 'GameEnded', elapsed);
  const status = gameEnded ? gameEnded.status : 'playing';

  return { ...state, players, enemies, phase, turn, status };
}
