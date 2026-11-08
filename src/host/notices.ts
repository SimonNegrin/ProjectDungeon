import type { RejectionReason } from '../game/types';

/** Motivos de aviso aprobados en REQ-004 R-016. */
export type NoticeCode =
  | 'invalid-target'
  | 'enemy-out-of-range'
  | 'no-action'
  | 'no-mp';

export const NOTICE_MESSAGES: Readonly<Record<NoticeCode, string>> = {
  'invalid-target': 'Destino no válido',
  'enemy-out-of-range': 'Enemigo fuera de alcance',
  'no-action': 'Sin acción',
  'no-mp': 'Sin MP',
};

/** Duración del aviso breve del HUD. */
export const NOTICE_DURATION_MS = 1600;

/**
 * Traduce un rechazo del motor al aviso del HUD. Devuelve `undefined` cuando no
 * procede avisar (fase equivocada o partida terminada). Función pura.
 */
export function noticeForRejection(reason: RejectionReason): NoticeCode | undefined {
  switch (reason) {
    case 'no-mp':
      return 'no-mp';
    case 'no-action':
      return 'no-action';
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
