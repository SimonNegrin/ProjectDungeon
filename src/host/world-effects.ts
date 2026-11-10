import type { WeaponId } from '../game/equipment';
import type { Position } from '../game/types';
import { FEEDBACK_CONFIG } from './feedback-config';
import { activeCues, type FeedbackCue, type MotionTimeline } from './motion';

/**
 * Efectos de mundo de combate y muerte. Son datos puros en píxeles de tile: el
 * renderer los aplica al sprite y nunca mutan el estado del motor.
 */
export interface DefenseGesture {
  /** Lado del defensor por el que llega el ataque. */
  readonly side: 'left' | 'right' | 'up' | 'down';
  /** 0-1 dentro de la ventana del gesto. */
  readonly progress: number;
}

export interface UnitWorldEffect {
  /** Desplazamiento de la embestida/retroceso/sacudida, en píxeles. */
  readonly dx: number;
  readonly dy: number;
  readonly alpha: number;
  readonly visible: boolean;
  /** Opacidad del destello blanco; 0 si no hay destello. */
  readonly flash: number;
  readonly flashColor: string;
  readonly defense: DefenseGesture | null;
}

export type WorldEffects = ReadonlyMap<string, UnitWorldEffect>;

interface MutableEffect {
  dx: number;
  dy: number;
  alpha: number;
  visible: boolean;
  flash: number;
  defense: DefenseGesture | null;
}

const WHITE = '#ffffff';

function ensure(map: Map<string, MutableEffect>, unitId: string): MutableEffect {
  const existing = map.get(unitId);
  if (existing) return existing;
  const created: MutableEffect = {
    dx: 0,
    dy: 0,
    alpha: 1,
    visible: true,
    flash: 0,
    defense: null,
  };
  map.set(unitId, created);
  return created;
}

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

function unitDirection(from: Position, to: Position): Position {
  const dx = Math.sign(to.x - from.x);
  const dy = Math.sign(to.y - from.y);
  return { x: dx, y: dy };
}

/** Curva triangular de ida y vuelta, sin dependencias del reloj real. */
function outAndBack(t: number, outMs: number, returnMs: number): number {
  if (t <= 0) return 0;
  if (t < outMs) return clamp01(t / outMs);
  if (t < outMs + returnMs) return clamp01(1 - (t - outMs) / returnMs);
  return 0;
}

/** Sacudida alterna de 1 px; determinista por tramos. */
function shakeAt(t: number, durationMs: number, amountPx: number): number {
  if (t < 0 || t >= durationMs) return 0;
  return Math.floor(t / 40) % 2 === 0 ? amountPx : -amountPx;
}

function defenseSide(defender: Position, attacker: Position): DefenseGesture['side'] {
  const dx = attacker.x - defender.x;
  const dy = attacker.y - defender.y;
  if (Math.abs(dx) >= Math.abs(dy)) return dx < 0 ? 'left' : 'right';
  return dy < 0 ? 'up' : 'down';
}

function applyAttack(
  map: Map<string, MutableEffect>,
  cue: FeedbackCue,
  t: number,
): void {
  const effects = FEEDBACK_CONFIG.effects;
  const attackerTile = cue.data.attacker;
  const targetTile = cue.data.target ?? cue.anchor.tile;
  const targetId = cue.data.targetId;
  const attackerId = cue.data.attackerId;
  if (!attackerTile || !targetTile) return;

  // `unitDirection(from, to)` apunta de `from` hacia `to`: desde el atacante al
  // objetivo es el sentido de la embestida y, a la vez, el del retroceso del
  // defensor (alejarse del atacante).
  const towardTarget = unitDirection(attackerTile, targetTile);
  const awayFromAttacker = towardTarget;
  const hit = cue.data.hit === true;

  if (attackerId) {
    const attacker = ensure(map, attackerId);
    const lunge = outAndBack(
      t,
      effects.attackLungeMs,
      effects.attackLungeReturnMs,
    );
    attacker.dx += towardTarget.x * effects.attackLungePx * lunge;
    attacker.dy += towardTarget.y * effects.attackLungePx * lunge;
  }

  if (!targetId) return;
  const target = ensure(map, targetId);

  if (hit) {
    const knockback = outAndBack(
      t,
      effects.attackKnockbackMs,
      Math.max(0, cue.durationMs - effects.attackKnockbackMs),
    );
    target.dx += awayFromAttacker.x * effects.attackKnockbackPx * knockback;
    target.dy += awayFromAttacker.y * effects.attackKnockbackPx * knockback;

    // La sacudida va en el eje perpendicular al ataque para no confundirse con
    // el retroceso.
    const shake = shakeAt(t, effects.spriteShakeMs, effects.spriteShakePx);
    target.dx += towardTarget.y !== 0 ? shake : 0;
    target.dy += towardTarget.x !== 0 ? shake : 0;

    const flash = clamp01(1 - t / FEEDBACK_CONFIG.durations.attackFlashMs);
    target.flash = Math.max(target.flash, flash * 0.9);
  } else {
    // Esquiva: el defensor se aparta un píxel o dos y levanta escudo del lado
    // por el que llega el golpe. Sin destello ni sacudida de impacto.
    const dodge = outAndBack(
      t,
      effects.missDodgeMs,
      Math.max(0, cue.durationMs - effects.missDodgeMs),
    );
    target.dx += awayFromAttacker.x * effects.missDodgePx * dodge;
    target.dy += awayFromAttacker.y * effects.missDodgePx * dodge;
    if (t <= effects.defenseGestureMs) {
      target.defense = {
        side: defenseSide(targetTile, attackerTile),
        progress: clamp01(t / effects.defenseGestureMs),
      };
    }
  }
}

/** Parpadeo de avistamiento: el enemigo alterna visible en su cue. */
function applySpotted(
  map: Map<string, MutableEffect>,
  cue: FeedbackCue,
  t: number,
): void {
  const unitId = cue.data.unitId ?? cue.anchor.unitId;
  if (!unitId || cue.durationMs <= 0) return;
  const unit = ensure(map, unitId);
  const frames = FEEDBACK_CONFIG.effects.spottedBlinkFrames * 2;
  const frame = Math.floor(t / (cue.durationMs / frames));
  unit.visible = frame % 2 === 0;
}

function applyDeath(
  map: Map<string, MutableEffect>,
  cue: FeedbackCue,
  t: number,
): void {
  const effects = FEEDBACK_CONFIG.effects;
  const unitId = cue.data.unitId ?? cue.anchor.unitId;
  if (!unitId) return;
  const unit = ensure(map, unitId);

  const flashWindow = effects.deathFlashMs;
  if (t < flashWindow) {
    unit.flash = Math.max(unit.flash, 0.9 * (1 - t / flashWindow));
  }

  const blinkStart = flashWindow;
  const blinkPeriod = effects.deathBlinkMs * 2;
  const blinkEnd = blinkStart + blinkPeriod * effects.deathBlinkCount;
  if (t >= blinkStart && t < blinkEnd) {
    const cycle = (t - blinkStart) % blinkPeriod;
    // Se apaga la primera mitad de cada parpadeo y se enciende la segunda.
    unit.visible = cycle >= effects.deathBlinkMs;
  }

  const shake = shakeAt(t, effects.deathShakeMs, effects.deathShakePx);
  unit.dx += shake;

  const dissolveStart = Math.max(0, cue.durationMs - FEEDBACK_CONFIG.durations.deathDissolveMs);
  if (t >= dissolveStart) {
    unit.alpha = clamp01(
      1 - (t - dissolveStart) / FEEDBACK_CONFIG.durations.deathDissolveMs,
    );
  }
}

/**
 * Efectos activos en el reloj de presentación, indexados por `unitId`.
 *
 * - Impacto: embestida del atacante, destello y retroceso/sacudida del objetivo.
 * - Fallo: misma embestida y gesto de defensa; nunca destello ni sacudida.
 * - Muerte: destello, tres parpadeos, disolución de 300 ms y sacudida.
 */
export function worldEffectsAt(
  timeline: MotionTimeline,
  elapsed: number,
): WorldEffects {
  const map = new Map<string, MutableEffect>();
  for (const cue of activeCues(timeline, elapsed)) {
    const t = elapsed - cue.atMs;
    if (cue.kind === 'attack') applyAttack(map, cue, t);
    else if (cue.kind === 'death') applyDeath(map, cue, t);
    else if (cue.kind === 'spotted') applySpotted(map, cue, t);
  }

  const result = new Map<string, UnitWorldEffect>();
  for (const [unitId, effect] of map) {
    result.set(unitId, {
      dx: Math.round(effect.dx),
      dy: Math.round(effect.dy),
      alpha: effect.alpha,
      visible: effect.visible && effect.alpha > 0,
      flash: effect.flash,
      flashColor: WHITE,
      defense: effect.defense,
    });
  }
  return result;
}

/** Unidades con una muerte en curso (destello/parpadeo/disolución). */
export function deathEffectUnitIds(effects: WorldEffects): ReadonlySet<string> {
  return new Set(effects.keys());
}

/** Onda expansiva de alarma: anillo de dos tiles que sale del emisor. */
export interface AlarmWaveEffect {
  readonly tileX: number;
  readonly tileY: number;
  /** Radio actual en tiles; 0 al empezar y 2 al terminar el beat. */
  readonly radiusTiles: number;
  /** 0-1 dentro del cue; gobierna la intensidad del anillo. */
  readonly progress: number;
  /** Destello de borde activo en este frame del cue. */
  readonly borderFlash: boolean;
}

/**
 * Onda de `AlarmRaised` en el reloj de presentación. Empieza en la casilla del
 * emisor y crece hasta dos tiles durante los 500 ms del beat. No insinúa una
 * cadena: solo dibuja la onda del evento que el motor ya emitió.
 */
export function alarmEffectAt(
  timeline: MotionTimeline,
  elapsed: number,
): AlarmWaveEffect | null {
  for (const cue of activeCues(timeline, elapsed)) {
    if (cue.kind !== 'alarm') continue;
    const tile = cue.anchor.tile;
    if (!tile) return null;
    const t = elapsed - cue.atMs;
    const progress = clamp01(cue.durationMs > 0 ? t / cue.durationMs : 1);
    const frames = FEEDBACK_CONFIG.effects.alarmBorderFlashCount * 2;
    const frame = Math.floor(t / (cue.durationMs / frames));
    return {
      tileX: tile.x,
      tileY: tile.y,
      radiusTiles: progress * FEEDBACK_CONFIG.effects.alarmRadiusTiles,
      progress,
      borderFlash: frame % 2 === 0,
    };
  }
  return null;
}

/** Parpadeo del arma recogida: tres frames encendidos y tres apagados. */
export interface PickupWeaponEffect {
  readonly weaponId: WeaponId;
  readonly tileX: number;
  readonly tileY: number;
  /** `false` en los frames apagados; el arma sigue en la rejilla. */
  readonly visible: boolean;
}

export function pickupWeaponEffectAt(
  timeline: MotionTimeline,
  elapsed: number,
): PickupWeaponEffect | null {
  for (const cue of activeCues(timeline, elapsed)) {
    if (cue.kind !== 'pickup' || !cue.data.weaponId) continue;
    const tile = cue.anchor.tile;
    if (!tile) return null;
    const frames = FEEDBACK_CONFIG.effects.pickupBlinkFrames * 2;
    const t = elapsed - cue.atMs;
    const frame = Math.floor(t / (cue.durationMs / frames));
    return {
      weaponId: cue.data.weaponId,
      tileX: tile.x,
      tileY: tile.y,
      visible: frame % 2 === 0,
    };
  }
  return null;
}
