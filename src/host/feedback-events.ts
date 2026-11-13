import { ITEMS } from '../game/equipment';
import type { GameEvent, GameState } from '../game/types';
import { FEEDBACK_CONFIG } from './feedback-config';
import { activeCues, type FeedbackCue, type MotionTimeline } from './motion';

/** Banner textual de un cue; vive en DOM y puede persistir más allá del beat. */
export interface BannerFeedback {
  readonly text: string;
  readonly kind: 'pickup' | 'select-weapon' | 'phase' | 'turn' | 'separator';
  readonly durationMs: number;
}

/**
 * Texto y persistencia del banner de un cue. `AlarmRaised` usa el aviso del HUD
 * (REQ-004) y no duplica banner; su onda y destello van por `frameEffectsAt`.
 * `TurnEnded` solo llega aquí cuando la timeline no lo ha silenciado.
 */
export function bannerForCue(cue: FeedbackCue): BannerFeedback | null {
  switch (cue.kind) {
    case 'pickup': {
      if (!cue.data.itemId) return null;
      return {
        text: `+ ${ITEMS[cue.data.itemId].name}`,
        kind: 'pickup',
        durationMs: FEEDBACK_CONFIG.texts.bannerMs,
      };
    }
    case 'select-weapon': {
      if (!cue.data.itemId) return null;
      return {
        text: ITEMS[cue.data.itemId].name,
        kind: 'select-weapon',
        durationMs: FEEDBACK_CONFIG.texts.bannerMs,
      };
    }
    case 'enemy-phase':
      return {
        text: 'FASE ENEMIGA',
        kind: 'phase',
        durationMs: FEEDBACK_CONFIG.texts.enemyPhaseBannerMs,
      };
    case 'player-turn':
      return {
        text: 'TU TURNO',
        kind: 'turn',
        durationMs: FEEDBACK_CONFIG.texts.playerTurnBannerMs,
      };
    case 'turn-ended':
      return {
        text: '—',
        kind: 'separator',
        durationMs: FEEDBACK_CONFIG.durations.turnEndedMs,
      };
    default:
      return null;
  }
}

export type UnitMarkDirection = 'up' | 'down' | 'left' | 'right';

/** Marca efímera sobre un enemigo; `direction` solo aplica a la huida. */
export interface UnitMarkFeedback {
  readonly unitId: string;
  readonly kind: 'fled' | 'returned' | 'waited';
  readonly text: string;
  readonly direction: UnitMarkDirection | null;
  readonly durationMs: number;
}

/** Dirección de huida: desde la última posición conocida del jugador al enemigo. */
function fleeDirection(
  state: GameState,
  unitId: string,
): UnitMarkDirection | null {
  const enemy = state.enemies.find((unit) => unit.id === unitId);
  if (!enemy) return null;
  const origin = enemy.lastKnown ?? enemy.home;
  const dx = enemy.x - origin.x;
  const dy = enemy.y - origin.y;
  if (dx === 0 && dy === 0) return null;
  if (Math.abs(dx) >= Math.abs(dy)) return dx > 0 ? 'right' : 'left';
  return dy > 0 ? 'down' : 'up';
}

/**
 * Marca DOM de huida, regreso o espera. No conoce Canvas ni el reloj: el host
 * decide cuándo empieza y cuánto persiste con `durationMs`.
 */
export function unitMarkForEvent(
  event: GameEvent,
  state: GameState,
): UnitMarkFeedback | null {
  switch (event.type) {
    case 'EnemyFled':
      return {
        unitId: event.unitId,
        kind: 'fled',
        text: '!!',
        direction: fleeDirection(state, event.unitId),
        durationMs: FEEDBACK_CONFIG.texts.fledPersistMs,
      };
    case 'EnemyReturned':
      return {
        unitId: event.unitId,
        kind: 'returned',
        text: 'zzz',
        direction: null,
        durationMs: FEEDBACK_CONFIG.texts.returnedPersistMs,
      };
    case 'EnemyWaited':
      return {
        unitId: event.unitId,
        kind: 'waited',
        text: '...',
        direction: null,
        durationMs: FEEDBACK_CONFIG.texts.waitedPersistMs,
      };
    default:
      return null;
  }
}

const DIRECTION_ARROWS: Readonly<Record<UnitMarkDirection, string>> = {
  up: '↑',
  down: '↓',
  left: '←',
  right: '→',
};

/** Texto final de la marca; la dirección es un segundo canal además del texto. */
export function unitMarkText(mark: UnitMarkFeedback): string {
  return mark.direction ? `${mark.text}${DIRECTION_ARROWS[mark.direction]}` : mark.text;
}

/** Efectos de borde del marco en el reloj de presentación. */
export interface FrameEffects {
  /** Tinte del borde de la fase enemiga; 0 cuando no hay cue. */
  readonly enemyPhaseTint: number;
  /** Destello de borde de la alarma; parpadea dos frames. */
  readonly alarmBorder: boolean;
  /** Destello blanco inicial de fin de partida, de 0 a 1. */
  readonly gameEndedFlash: number;
}

export const EMPTY_FRAME_EFFECTS: FrameEffects = {
  enemyPhaseTint: 0,
  alarmBorder: false,
  gameEndedFlash: 0,
};

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

/**
 * Efectos de marco activos. Es puro y determinista: la onda y el destello de
 * alarma se apagan con el reloj de presentación, nunca con temporizadores.
 */
export function frameEffectsAt(
  timeline: MotionTimeline,
  elapsed: number,
): FrameEffects {
  let enemyPhaseTint = 0;
  let alarmBorder = false;
  let gameEndedFlash = 0;

  for (const cue of activeCues(timeline, elapsed)) {
    const t = elapsed - cue.atMs;
    if (cue.kind === 'enemy-phase') {
      const progress = cue.durationMs > 0 ? clamp01(t / cue.durationMs) : 1;
      enemyPhaseTint = Math.max(enemyPhaseTint, 0.55 * (1 - progress));
    } else if (cue.kind === 'alarm') {
      const frames = FEEDBACK_CONFIG.effects.alarmBorderFlashCount * 2;
      const frame = Math.floor(t / (cue.durationMs / frames));
      alarmBorder = alarmBorder || frame % 2 === 0;
    } else if (cue.kind === 'game-ended') {
      gameEndedFlash = Math.max(
        gameEndedFlash,
        clamp01(1 - t / FEEDBACK_CONFIG.durations.gameEndedFlashMs),
      );
    }
  }

  return { enemyPhaseTint, alarmBorder, gameEndedFlash };
}

/** Pulso de la ranura del arma mientras dura su cue de inventario. */
export interface WeaponSlotPulse {
  readonly slot: number;
  readonly durationMs: number;
}

export function weaponSlotPulseAt(
  timeline: MotionTimeline,
  elapsed: number,
): WeaponSlotPulse | null {
  for (const cue of activeCues(timeline, elapsed)) {
    // `DropItem`/`UnequipItem` reutilizan el cue `select-weapon`, pero no son un
    // cambio de arma: el pulso del HUD se limita a sus dos eventos originales.
    if (cue.eventType !== 'PickUp' && cue.eventType !== 'SelectWeapon') continue;
    return { slot: cue.data.slot ?? 0, durationMs: cue.durationMs };
  }
  return null;
}
