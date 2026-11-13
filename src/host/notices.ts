import type { RejectionReason } from '../game/types';
import { NOTICE_DURATION_MS } from './feedback-config';

export { NOTICE_DURATION_MS };

/** Motivos de aviso aprobados en REQ-004 R-016. */
export type NoticeCode =
  | 'invalid-target'
  | 'enemy-out-of-range'
  | 'no-action'
  | 'no-mp'
  | 'alarm-raised'
  | 'no-mana'
  | 'insufficient-level'
  | 'out-of-range'
  | 'no-line-of-sight'
  | 'spell-limit'
  | 'unknown-spell'
  | 'no-spell-selected';

export const NOTICE_MESSAGES: Readonly<Record<NoticeCode, string>> = {
  'invalid-target': 'Destino no válido',
  'enemy-out-of-range': 'Enemigo fuera de alcance',
  'no-action': 'Sin acción',
  'no-mp': 'Sin MP',
  'alarm-raised': '¡Alarma! Te han visto',
  'no-mana': 'Sin maná',
  'insufficient-level': 'Nivel de magia insuficiente',
  'out-of-range': 'Fuera de alcance',
  'no-line-of-sight': 'Sin línea de visión',
  'spell-limit': 'Tope de 2 hechizos por turno',
  'unknown-spell': 'Hechizo desconocido',
  'no-spell-selected': 'Sin hechizo seleccionado',
};

/** Traduce un rechazo del motor al aviso del HUD. Devuelve `undefined` cuando no
 * procede avisar (fase equivocada o partida terminada). Función pura.
 */
export function noticeForRejection(reason: RejectionReason): NoticeCode | undefined {
  switch (reason) {
    case 'no-mp':
      return 'no-mp';
    case 'no-action':
      return 'no-action';
    case 'no-mana':
      return 'no-mana';
    case 'insufficient-level':
      return 'insufficient-level';
    case 'out-of-range':
      return 'out-of-range';
    case 'no-line-of-sight':
      return 'no-line-of-sight';
    case 'spell-limit':
      return 'spell-limit';
    case 'unknown-spell':
      return 'unknown-spell';
    case 'target-not-adjacent':
    case 'target-not-found':
    case 'target-dead':
    case 'same-faction':
      return 'enemy-out-of-range';
    case 'wrong-phase':
    case 'game-over':
      return undefined;
    default:
      return 'invalid-target';
  }
}
