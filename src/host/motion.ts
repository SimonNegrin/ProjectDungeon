import type {
  AttackRolls,
  CommandType,
  GameEndStatus,
  GameEvent,
  GameState,
  Position,
  RejectionReason,
  Unit,
} from '../game/types';
import type { WeaponId } from '../game/equipment';
import { clampCamera, type Camera } from './camera';
import { FEEDBACK_CONFIG } from './feedback-config';
import { TILE_SIZE, type Viewport, type WorldSize } from './geometry';
import type { PresentationEvent } from './presentation';

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
  readonly event: PresentationEvent;
}

/** Tipo de cue de presentación; uno por evento visible de la matriz REQ-017. */
export type FeedbackCueKind =
  | 'move'
  | 'attack'
  | 'death'
  | 'pickup'
  | 'select-weapon'
  | 'spotted'
  | 'alarm'
  | 'fled'
  | 'returned'
  | 'waited'
  | 'enemy-phase'
  | 'player-turn'
  | 'turn-ended'
  | 'game-ended'
  | 'game-restarted'
  | 'rejected';

/** Ancla de un cue: unidad y/o tile de mundo. Puede faltar en eventos globales. */
export interface FeedbackAnchor {
  readonly unitId: string | null;
  readonly tile: Position | null;
}

/** Datos de presentación de un cue. Siempre serializables. */
export interface FeedbackCueData {
  readonly unitId?: string;
  readonly targetId?: string;
  readonly attackerId?: string;
  readonly playerId?: string;
  readonly weaponId?: WeaponId;
  readonly slot?: number;
  readonly hit?: boolean;
  readonly damage?: number;
  readonly targetHp?: number;
  readonly text?: string;
  readonly rolls?: AttackRolls;
  readonly turn?: number;
  readonly status?: GameEndStatus;
  readonly commandType?: CommandType;
  readonly reason?: RejectionReason;
  readonly mpAfter?: number;
  readonly from?: Position;
  readonly to?: Position;
  /** Posición del atacante y del objetivo en el momento del impacto/fallo. */
  readonly attacker?: Position;
  readonly target?: Position;
}

export interface FeedbackCue {
  readonly kind: FeedbackCueKind;
  readonly eventType: PresentationEvent['type'];
  readonly atMs: number;
  readonly durationMs: number;
  /** Beat del evento; puede ser mayor que la duración visual. */
  readonly beatMs: number;
  readonly anchor: FeedbackAnchor;
  readonly data: FeedbackCueData;
}

export interface FeedbackBeat {
  readonly eventType: PresentationEvent['type'];
  readonly atMs: number;
  readonly beatMs: number;
  readonly endMs: number;
}

/**
 * Política de visibilidad y foco decidida por el host con la cámara y el
 * viewport. El constructor de la timeline no la deduce de un reloj ni del
 * estado: la recibe y se limita a clasificar cada recorrido.
 */
export interface MotionVisibilityPolicy {
  /** ¿El tile cae dentro del viewport en el instante de la acción? */
  readonly isVisible: (tile: Position) => boolean;
  /** ¿La unidad es el jugador y puede arrastrar la cámara al cruzar? */
  readonly isPlayer: (unitId: string) => boolean;
}

export interface BuildTimelineOptions {
  readonly initialState?: GameState;
  readonly finalState?: GameState;
  /** Sin política se conserva el comportamiento histórico (todo visible). */
  readonly visibility?: MotionVisibilityPolicy;
  /** Colapsa beats, pasos y pausas a 0 sin reordenar eventos ni cues. */
  readonly reducedMotion?: boolean;
}

export interface MotionTimeline {
  readonly steps: readonly MotionStep[];
  readonly phases: readonly MotionPhase[];
  /** Eventos que no son `UnitMoved`, situados en el reloj en que ocurren. */
  readonly events: readonly MotionTimelineEvent[];
  /** Cues deterministas de feedback, alineados con el mismo reloj. */
  readonly cues: readonly FeedbackCue[];
  /** Beat por evento, en orden de presentación. */
  readonly beats: readonly FeedbackBeat[];
  readonly totalMs: number;
  /** Fin del último beat; gobierna cuándo vuelve el input. */
  readonly blockingUntilMs: number;
  /** Unidades que la cámara puede seguir. */
  readonly focusUnitIds: readonly string[];
  /** Unidades con pasos visuales, aunque no reciban foco de cámara. */
  readonly animatedUnitIds: readonly string[];
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

function stepDurationMs(diagonal: boolean, reducedMotion: boolean): number {
  if (reducedMotion) return 0;
  if (!diagonal) return MOTION_CONFIG.stepMs;
  if (MOTION_CONFIG.diagonal === 'constant-duration') return MOTION_CONFIG.stepMs;
  return Math.round(MOTION_CONFIG.stepMs * Math.SQRT2);
}

/** Pausa de tile; el modo reducido la colapsa para no animar el recorrido. */
function pauseDurationMs(reducedMotion: boolean): number {
  return reducedMotion ? 0 : MOTION_CONFIG.pauseMs;
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

function unitTile(state: GameState | undefined, unitId: string | null | undefined): Position | null {
  if (!state || !unitId) return null;
  const unit =
    state.players.find((candidate) => candidate.id === unitId) ??
    state.enemies.find((candidate) => candidate.id === unitId);
  return unit ? { x: unit.x, y: unit.y } : null;
}

function anchorFor(
  unitId: string | null,
  state: GameState | undefined,
  tile?: Position,
): FeedbackAnchor {
  return {
    unitId,
    tile: tile ? { ...tile } : unitTile(state, unitId),
  };
}

/** Beat mínimo de cada evento visible de la matriz REQ-017. */
function beatForEvent(
  event: PresentationEvent,
  next: PresentationEvent | undefined,
  reducedMotion: boolean,
): number {
  if (reducedMotion) return 0;
  switch (event.type) {
    case 'AttackPerformed':
      return event.hit
        ? FEEDBACK_CONFIG.beats.attackHit
        : FEEDBACK_CONFIG.beats.attackMiss;
    case 'UnitDied':
      return FEEDBACK_CONFIG.beats.death;
    case 'TurnEnded':
      return next?.type === 'EnemyPhaseStarted'
        ? 0
        : FEEDBACK_CONFIG.beats.turnEnded;
    case 'EnemyPhaseStarted':
      return FEEDBACK_CONFIG.beats.enemyPhase;
    case 'PlayerTurnStarted':
      return FEEDBACK_CONFIG.beats.playerTurn;
    case 'EnemyWaited':
      return FEEDBACK_CONFIG.beats.waited;
    case 'GameEnded':
      return FEEDBACK_CONFIG.beats.gameEnded;
    case 'GameRestarted':
      return FEEDBACK_CONFIG.beats.gameRestarted;
    case 'EnemySpotted':
      return FEEDBACK_CONFIG.beats.spotted;
    case 'EnemyReturned':
      return FEEDBACK_CONFIG.beats.returned;
    case 'EnemyFled':
      return FEEDBACK_CONFIG.beats.fled;
    case 'AlarmRaised':
      return FEEDBACK_CONFIG.beats.alarm;
    case 'CommandRejected':
      return FEEDBACK_CONFIG.beats.rejected;
    case 'PickUp':
      return FEEDBACK_CONFIG.beats.pickup;
    case 'SelectWeapon':
      return FEEDBACK_CONFIG.beats.selectWeapon;
    case 'UnitMoved':
      return MOTION_CONFIG.stepMs + MOTION_CONFIG.pauseMs;
  }
}

/** Duración visual del cue; el beat puede ser mayor. */
function cueDurationMs(event: PresentationEvent, beatMs: number): number {
  if (event.type === 'CommandRejected') {
    return FEEDBACK_CONFIG.durations.rejectedShakeMs;
  }
  return beatMs;
}

/**
 * `TurnEnded` es la única excepción silenciosa aprobada: calla cuando le sigue
 * `EnemyPhaseStarted` para no duplicar el banner de fase.
 */
function hasCue(event: PresentationEvent, next: PresentationEvent | undefined): boolean {
  return !(event.type === 'TurnEnded' && next?.type === 'EnemyPhaseStarted');
}

function cueForEvent(
  event: PresentationEvent,
  atMs: number,
  beatMs: number,
  options: BuildTimelineOptions,
): FeedbackCue {
  const finalState = options.finalState;
  const initialState = options.initialState;
  const base = {
    eventType: event.type,
    atMs,
    durationMs: cueDurationMs(event, beatMs),
    beatMs,
  } as const;

  switch (event.type) {
    case 'AttackPerformed': {
      const state = finalState ?? initialState;
      const anchor = anchorFor(event.targetId, state);
      const attacker = unitTile(state, event.attackerId);
      return {
        ...base,
        kind: 'attack',
        anchor,
        data: {
          attackerId: event.attackerId,
          targetId: event.targetId,
          hit: event.hit,
          damage: event.damage,
          targetHp: event.targetHp,
          text: event.hit ? `-${event.damage}` : 'Fallo',
          rolls: { ...event.rolls },
          ...(attacker ? { attacker } : {}),
          ...(anchor.tile ? { target: anchor.tile } : {}),
        },
      };
    }
    case 'UnitDied':
      return {
        ...base,
        kind: 'death',
        anchor: anchorFor(event.unitId, finalState ?? initialState),
        data: { unitId: event.unitId },
      };
    case 'PickUp':
      return {
        ...base,
        kind: 'pickup',
        anchor: anchorFor(event.unitId, finalState),
        data: { unitId: event.unitId, weaponId: event.weaponId, slot: event.slot },
      };
    case 'SelectWeapon':
      return {
        ...base,
        kind: 'select-weapon',
        anchor: anchorFor(event.unitId, finalState),
        data: { unitId: event.unitId, weaponId: event.weaponId, slot: event.slot },
      };
    case 'EnemySpotted':
      return {
        ...base,
        kind: 'spotted',
        anchor: anchorFor(event.unitId, finalState, event.position),
        data: { unitId: event.unitId, playerId: event.playerId },
      };
    case 'AlarmRaised':
      return {
        ...base,
        kind: 'alarm',
        anchor: anchorFor(event.unitId, finalState, event.position),
        data: { unitId: event.unitId },
      };
    case 'EnemyFled':
      return {
        ...base,
        kind: 'fled',
        anchor: anchorFor(event.unitId, finalState),
        data: { unitId: event.unitId },
      };
    case 'EnemyReturned':
      return {
        ...base,
        kind: 'returned',
        anchor: anchorFor(event.unitId, finalState),
        data: { unitId: event.unitId },
      };
    case 'EnemyWaited':
      return {
        ...base,
        kind: 'waited',
        anchor: anchorFor(event.unitId, finalState),
        data: { unitId: event.unitId },
      };
    case 'EnemyPhaseStarted':
      return {
        ...base,
        kind: 'enemy-phase',
        anchor: { unitId: null, tile: null },
        data: { turn: event.turn },
      };
    case 'PlayerTurnStarted':
      return {
        ...base,
        kind: 'player-turn',
        anchor: { unitId: null, tile: null },
        data: { turn: event.turn },
      };
    case 'TurnEnded':
      return {
        ...base,
        kind: 'turn-ended',
        anchor: { unitId: null, tile: null },
        data: { turn: event.turn },
      };
    case 'GameEnded':
      return {
        ...base,
        kind: 'game-ended',
        anchor: { unitId: null, tile: null },
        data: { status: event.status },
      };
    case 'GameRestarted':
      return {
        ...base,
        kind: 'game-restarted',
        anchor: { unitId: null, tile: null },
        data: {},
      };
    case 'CommandRejected':
      return {
        ...base,
        kind: 'rejected',
        anchor: { unitId: null, tile: null },
        data: { commandType: event.commandType, reason: event.reason },
      };
    case 'UnitMoved':
      // El builder trata el movimiento por separado para conservar sus fases.
      return {
        ...base,
        kind: 'move',
        anchor: anchorFor(event.unitId, finalState, event.to),
        data: { unitId: event.unitId, mpAfter: event.mpLeft, from: event.from, to: event.to },
      };
  }
}

type MoveVisibility = 'inside' | 'outside' | 'crossing';

/** Clasifica un recorrido completo por sus extremos; el host decide con la cámara. */
function classifyMove(
  from: Position,
  to: Position,
  visibility: MotionVisibilityPolicy | undefined,
): MoveVisibility {
  if (!visibility) return 'inside';
  const fromVisible = visibility.isVisible(from);
  const toVisible = visibility.isVisible(to);
  if (!fromVisible && !toVisible) return 'outside';
  if (fromVisible !== toVisible) return 'crossing';
  return 'inside';
}

/**
 * Construye la timeline de presentación a partir de los eventos ordenados de la
 * acción. Es pura: no muta los eventos y no conoce reloj real ni DOM.
 *
 * Los `UnitMoved` contiguos de la misma unidad forman un recorrido. Si la
 * política de visibilidad dice que empieza y termina fuera del viewport, el
 * grupo se colapsa en un beat de 150 ms sin pasos ni foco de cámara; si cruza el
 * borde, conserva el recorrido completo y solo el jugador arrastra la cámara.
 * Sin política se mantiene el comportamiento histórico: todo visible y seguido.
 *
 * Un grupo visible deja pausa inicial, transición y pausa en el destino por
 * cada paso, de modo que `n` pasos dejan `n + 1` pausas. Los eventos que no son
 * `UnitMoved` se secuencian al acabar el beat del anterior. `CommandRejected` no
 * bloquea y `TurnEnded` calla si le sigue `EnemyPhaseStarted`.
 */
export function buildMotionTimeline(
  events: readonly PresentationEvent[],
  options: BuildTimelineOptions = {},
): MotionTimeline {
  const steps: MotionStep[] = [];
  const phases: MotionPhase[] = [];
  const timedEvents: MotionTimelineEvent[] = [];
  const cues: FeedbackCue[] = [];
  const beats: FeedbackBeat[] = [];
  const focusUnitIds: string[] = [];
  const animatedUnitIds: string[] = [];
  const reducedMotion = options.reducedMotion === true;
  const pauseMs = pauseDurationMs(reducedMotion);
  let clock = 0;

  for (let index = 0; index < events.length; index += 1) {
    const event = events[index];

    if (event.type !== 'UnitMoved') {
      const atMs = clock;
      const next = events[index + 1];
      const beatMs = beatForEvent(event, next, reducedMotion);

      timedEvents.push({ atMs, event });
      if (hasCue(event, next)) {
        cues.push(cueForEvent(event, atMs, beatMs, options));
      }
      beats.push({
        eventType: event.type,
        atMs,
        beatMs,
        endMs: atMs + beatMs,
      });
      clock = atMs + beatMs;
      continue;
    }

    // Recorrido contiguo de una unidad: mismo id y cada paso arranca donde
    // acabó el anterior. Un `UnitMoved` no contiguo abre un grupo nuevo.
    const group: Extract<PresentationEvent, { type: 'UnitMoved' }>[] = [event];
    let groupEnd = index;
    while (groupEnd + 1 < events.length) {
      const candidate = events[groupEnd + 1];
      if (
        candidate.type !== 'UnitMoved' ||
        candidate.unitId !== event.unitId
      ) {
        break;
      }
      const last = group[group.length - 1];
      if (candidate.from.x !== last.to.x || candidate.from.y !== last.to.y) {
        break;
      }
      group.push(candidate);
      groupEnd += 1;
    }
    index = groupEnd;

    const first = group[0];
    const last = group[group.length - 1];
    const visibility = classifyMove(first.from, last.to, options.visibility);

    // Fuera de pantalla: un único beat, sin tween por tile ni foco. La posición
    // final ya se dibuja en el estado de presentación al empezar el beat.
    if (visibility === 'outside') {
      const atMs = clock;
      const beatMs = reducedMotion ? 0 : FEEDBACK_CONFIG.beats.enemyOffscreen;
      cues.push({
        kind: 'move',
        eventType: event.type,
        atMs,
        durationMs: 0,
        beatMs,
        anchor: anchorFor(last.unitId, options.finalState, last.to),
        data: {
          unitId: last.unitId,
          mpAfter: last.mpLeft,
          from: { ...first.from },
          to: { ...last.to },
        },
      });
      beats.push({
        eventType: event.type,
        atMs,
        beatMs,
        endMs: atMs + beatMs,
      });
      clock = atMs + beatMs;
      continue;
    }

    // El cruce se anima completo, pero la cámara solo sigue al jugador. Una
    // unidad visible dentro del viewport sí puede arrastrar la cámara.
    const focus =
      visibility === 'inside' ||
      (visibility === 'crossing' &&
        options.visibility?.isPlayer(last.unitId) === true);
    if (focus && !focusUnitIds.includes(last.unitId)) {
      focusUnitIds.push(last.unitId);
    }
    if (!animatedUnitIds.includes(last.unitId)) {
      animatedUnitIds.push(last.unitId);
    }

    phases.push({
      kind: 'pause',
      startMs: clock,
      endMs: clock + pauseMs,
      durationMs: pauseMs,
      stepIndex: steps.length,
      tile: { ...first.from },
      unitId: first.unitId,
    });
    clock += pauseMs;

    for (const move of group) {
      const diagonal = isDiagonal(move.from, move.to);
      const durationMs = stepDurationMs(diagonal, reducedMotion);
      const startMs = clock;
      const endMs = startMs + durationMs;

      steps.push({
        index: steps.length,
        unitId: move.unitId,
        from: { ...move.from },
        to: { ...move.to },
        dx: move.to.x - move.from.x,
        dy: move.to.y - move.from.y,
        diagonal,
        durationMs,
        startMs,
        endMs,
        pauseEndMs: endMs + pauseMs,
        mpAfter: move.mpLeft,
      });

      phases.push({
        kind: 'transition',
        startMs,
        endMs,
        durationMs,
        stepIndex: steps.length - 1,
        from: { ...move.from },
        to: { ...move.to },
        unitId: move.unitId,
      });

      cues.push({
        kind: 'move',
        eventType: move.type,
        atMs: startMs,
        durationMs,
        beatMs: durationMs + pauseMs,
        anchor: anchorFor(move.unitId, options.finalState, move.to),
        data: {
          unitId: move.unitId,
          mpAfter: move.mpLeft,
          from: { ...move.from },
          to: { ...move.to },
        },
      });
      beats.push({
        eventType: move.type,
        atMs: startMs,
        beatMs: durationMs + pauseMs,
        endMs: endMs + pauseMs,
      });

      clock = endMs;
      phases.push({
        kind: 'pause',
        startMs: clock,
        endMs: clock + pauseMs,
        durationMs: pauseMs,
        stepIndex: steps.length,
        tile: { ...move.to },
        unitId: move.unitId,
      });
      clock += pauseMs;
    }
  }

  return {
    steps,
    phases,
    events: timedEvents,
    cues,
    beats,
    totalMs: clock,
    blockingUntilMs: clock,
    focusUnitIds,
    animatedUnitIds,
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

/**
 * Última unidad que ya ha empezado a presentarse a `elapsed`. Antes del primer
 * paso no hay ninguna: la cámara debe conservarse hasta que el grupo arranque.
 */
function startedFocusUnitId(
  timeline: MotionTimeline,
  elapsed: number,
): { readonly unitId: string | null; readonly started: boolean } {
  let unitId: string | null = null;
  let started = false;
  for (const phase of timeline.phases) {
    if (elapsed + EPSILON < phase.startMs) break;
    // Los pasos de un cruce enemigo se animan, pero no mueven la cámara.
    if (!timeline.focusUnitIds.includes(phase.unitId)) continue;
    unitId = phase.unitId;
    started = true;
  }
  return { unitId, started };
}

/**
 * Unidad enfocada por la cámara: la del grupo activo o la última que ya empezó.
 * Antes del primer paso devuelve la primera unidad que se moverá, pero
 * `cameraAt` conserva la cámara actual hasta que esa fase arranca.
 */
export function focusUnitId(
  timeline: MotionTimeline,
  elapsed: number,
): string | null {
  const { unitId, started } = startedFocusUnitId(timeline, elapsed);
  if (started) return unitId;
  const first = timeline.steps.find((step) =>
    timeline.focusUnitIds.includes(step.unitId),
  );
  return first?.unitId ?? null;
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
  for (const unitId of timeline.animatedUnitIds) {
    const position = visualPosition(timeline, elapsed, unitId);
    if (position) positions.set(unitId, position);
  }
  return positions;
}

/**
 * Cámara de presentación: centra el sprite enfocado menos medio viewport,
 * redondea a píxel entero y limita a los bordes del mapa. Antes de que arranque
 * la primera fase (beat de ataque, recogida, cambio de arma o pre-beat de fase)
 * no hay movimiento activo y se conserva la cámara actual.
 */
export function cameraAt(
  timeline: MotionTimeline,
  elapsed: number,
  world: WorldSize,
  viewport: Viewport,
  current?: Camera,
): Camera {
  const { unitId, started } = startedFocusUnitId(timeline, elapsed);
  const position =
    started && unitId ? visualPosition(timeline, elapsed, unitId) : null;
  if (!position) {
    if (current) return clampCamera(current, world, viewport);
    return clampCamera(
      {
        x: Math.round(world.width / 2 - viewport.width / 2),
        y: Math.round(world.height / 2 - viewport.height / 2),
      },
      world,
      viewport,
    );
  }
  return clampCamera(
    {
      x: Math.round(position.x - viewport.width / 2),
      y: Math.round(position.y - viewport.height / 2),
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

/** Cues activos en el reloj de presentación. Intervalo `[atMs, atMs + duración)`. */
export function activeCues(
  timeline: MotionTimeline,
  elapsed: number,
): readonly FeedbackCue[] {
  return timeline.cues.filter(
    (cue) =>
      elapsed + EPSILON >= cue.atMs &&
      elapsed + EPSILON < cue.atMs + cue.durationMs,
  );
}

/**
 * Unidades cuya muerte aún no se ha presentado. El render las dibuja como vivas
 * hasta su cue de `UnitDied` sin inventar PV ni tocar la rejilla.
 */
export function dyingUnitIds(
  timeline: MotionTimeline,
  elapsed: number,
): ReadonlySet<string> {
  const ids = new Set<string>();
  for (const entry of timeline.events) {
    if (entry.event.type === 'UnitDied' && entry.atMs > elapsed + EPSILON) {
      ids.add(entry.event.unitId);
    }
  }
  return ids;
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
 * Deshace las acciones de los ataques que aún no han ocurrido. El estado final
 * ya las consumió todas; devolver una por cada ataque futuro reconstruye la
 * secuencia real (2→1→0) sin agruparlas en el primer beat.
 */
function withFutureActions(
  unit: Unit,
  timeline: MotionTimeline,
  elapsed: number,
): Unit {
  let remaining = unit.actions.remaining;
  for (const entry of timeline.events) {
    if (
      entry.event.type === 'AttackPerformed' &&
      entry.event.attackerId === unit.id &&
      entry.atMs > elapsed + EPSILON
    ) {
      remaining = Math.min(unit.actions.max, remaining + 1);
    }
  }
  if (remaining === unit.actions.remaining) return unit;
  return { ...unit, actions: { ...unit.actions, remaining } };
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
  let map = state.map;

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

  players = players.map((unit) => withFutureActions(unit, timeline, elapsed));
  enemies = enemies.map((unit) => withFutureActions(unit, timeline, elapsed));

  // La recogida y el cambio de arma se aplican al acabar su beat, no al
  // empezar el cue (R-011/R-012). Hasta entonces se conserva el inventario, el
  // arma equipada, el MP y el arma del suelo iniciales. Se deshace en orden
  // inverso para encadenar varios cambios.
  for (let index = timeline.events.length - 1; index >= 0; index -= 1) {
    const entry = timeline.events[index];
    const event = entry.event;
    if (event.type !== 'PickUp' && event.type !== 'SelectWeapon') continue;
    const cue = timeline.cues.find(
      (candidate) =>
        candidate.eventType === event.type && candidate.atMs === entry.atMs,
    );
    const appliedAt = cue ? cue.atMs + cue.durationMs : entry.atMs;
    if (appliedAt <= elapsed + EPSILON) continue;

    if (event.type === 'PickUp') {
      const initialPlayer = initialState?.players.find(
        (unit) => unit.id === event.unitId,
      );
      if (initialPlayer) {
        players = players.map((unit) =>
          unit.id === initialPlayer.id
            ? {
                ...unit,
                mp: initialPlayer.mp,
                weapons: initialPlayer.weapons,
                equipment: initialPlayer.equipment,
              }
            : unit,
        );
      }

      const initialWeapon = initialState?.map?.weapons?.find(
        (weapon) => weapon.weaponId === event.weaponId,
      );
      if (initialWeapon && map) {
        const weapons = map.weapons ?? [];
        if (!weapons.some((weapon) => weapon.id === initialWeapon.id)) {
          const initialOrder = initialState?.map?.weapons ?? [];
          const insertAt = initialOrder.findIndex(
            (weapon) => weapon.id === initialWeapon.id,
          );
          const nextWeapons = [...weapons];
          nextWeapons.splice(
            insertAt < 0 ? nextWeapons.length : Math.min(insertAt, nextWeapons.length),
            0,
            initialWeapon,
          );
          map = { ...map, weapons: nextWeapons };
        }
      }
    } else if (event.type === 'SelectWeapon') {
      const initialPlayer = initialState?.players.find(
        (unit) => unit.id === event.unitId,
      );
      if (initialPlayer) {
        players = players.map((unit) =>
          unit.id === initialPlayer.id
            ? { ...unit, equipment: initialPlayer.equipment }
            : unit,
        );
      }
    }
  }

  const player = players[0];
  if (player) {
    const initialPlayer = initialState?.players.find((unit) => unit.id === player.id);
    const playerTurn = lastEventOfType(timeline, 'PlayerTurnStarted', elapsed);
    const playerSteps = timeline.steps.filter((step) => step.unitId === player.id);
    const pickupOccurred = timeline.events.some((entry) => {
      if (entry.event.type !== 'PickUp' || entry.event.unitId !== player.id) {
        return false;
      }
      const cue = timeline.cues.find(
        (candidate) =>
          candidate.eventType === 'PickUp' && candidate.atMs === entry.atMs,
      );
      const appliedAt = cue ? cue.atMs + cue.durationMs : entry.atMs;
      return appliedAt <= elapsed + EPSILON;
    });
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
    } else if (initialPlayer && !pickupOccurred) {
      players = players.map((unit) =>
        unit.id === player.id ? { ...unit, mp: initialPlayer.mp } : unit,
      );
    }

    let actions = player.actions;
    if (!playerTurn && initialPlayer) {
      const attacksOccurred = timeline.events.filter(
        (entry) =>
          entry.event.type === 'AttackPerformed' &&
          entry.event.attackerId === player.id &&
          entry.atMs <= elapsed + EPSILON,
      ).length;
      actions = {
        ...initialPlayer.actions,
        remaining: Math.max(0, initialPlayer.actions.remaining - attacksOccurred),
      };
    }
    players = players.map((unit) =>
      unit.id === player.id ? { ...unit, actions } : unit,
    );
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

  // El fin de partida se aplica al acabar su beat: el overlay espera 800 ms
  // desde el evento, no aparece al inicio del cue (R-018).
  const gameEnded = timeline.cues.find(
    (cue) =>
      cue.kind === 'game-ended' &&
      cue.atMs + cue.durationMs <= elapsed + EPSILON,
  );
  const status = gameEnded?.data.status ?? 'playing';

  return { ...state, map, players, enemies, phase, turn, status };
}
