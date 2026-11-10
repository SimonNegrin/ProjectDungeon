import type {
  AttackRolls,
  CommandType,
  GameEndStatus,
  GameEvent,
  GameState,
  Position,
  RejectionReason,
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

export interface BuildTimelineOptions {
  readonly initialState?: GameState;
  readonly finalState?: GameState;
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
): number {
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
      const anchor = anchorFor(event.targetId, finalState ?? initialState);
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

/**
 * Construye la timeline de presentación a partir de los eventos ordenados de la
 * acción. Es pura: no muta los eventos y no conoce reloj real ni DOM.
 *
 * Un `UnitMoved` contiguo de la misma unidad continúa el grupo: pausa inicial,
 * transición y pausa en el destino por cada paso, de modo que `n` pasos dejan
 * `n + 1` pausas. Los eventos que no son `UnitMoved` se secuencian: cada uno
 * empieza al acabar el beat del anterior. `CommandRejected` no bloquea y
 * `TurnEnded` calla si le sigue `EnemyPhaseStarted`.
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
  let clock = 0;
  let lastUnitId: string | undefined;
  let lastTo: Position | undefined;

  for (let index = 0; index < events.length; index += 1) {
    const event = events[index];

    if (event.type !== 'UnitMoved') {
      const atMs = clock;
      const next = events[index + 1];
      const beatMs = beatForEvent(event, next);

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

    cues.push({
      kind: 'move',
      eventType: event.type,
      atMs: startMs,
      durationMs,
      beatMs: durationMs + MOTION_CONFIG.pauseMs,
      anchor: anchorFor(event.unitId, options.finalState, event.to),
      data: {
        unitId: event.unitId,
        mpAfter: event.mpLeft,
        from: { ...event.from },
        to: { ...event.to },
      },
    });
    beats.push({
      eventType: event.type,
      atMs: startMs,
      beatMs: durationMs + MOTION_CONFIG.pauseMs,
      endMs: endMs + MOTION_CONFIG.pauseMs,
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
    cues,
    beats,
    totalMs: clock,
    blockingUntilMs: clock,
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
  return timeline.steps[0]?.unitId ?? null;
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

  // La recogida y el cambio de arma se aplican en su cue. Hasta entonces se
  // conserva el inventario, el arma equipada, el MP y el arma del suelo
  // iniciales. Se deshace en orden inverso para encadenar varios cambios.
  for (let index = timeline.events.length - 1; index >= 0; index -= 1) {
    const entry = timeline.events[index];
    if (entry.atMs <= elapsed + EPSILON) continue;
    const event = entry.event;

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
    const pickupOccurred = timeline.events.some(
      (entry) =>
        entry.event.type === 'PickUp' &&
        entry.event.unitId === player.id &&
        entry.atMs <= elapsed + EPSILON,
    );
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

  return { ...state, map, players, enemies, phase, turn, status };
}
