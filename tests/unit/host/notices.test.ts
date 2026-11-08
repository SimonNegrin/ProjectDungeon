import { describe, expect, it } from 'vitest';
import {
  NOTICE_MESSAGES,
  noticeForRejection,
  type NoticeCode,
} from '../../../src/host/notices';
import type { RejectionReason } from '../../../src/game/types';

describe('avisos de rechazo del HUD', () => {
  it('mantiene los cuatro textos aprobados en REQ-004 R-016', () => {
    expect(NOTICE_MESSAGES).toMatchObject({
      'invalid-target': 'Destino no válido',
      'enemy-out-of-range': 'Enemigo fuera de alcance',
      'no-action': 'Sin acción',
      'no-mp': 'Sin MP',
    });
  });

  it('incluye el aviso breve de alarma de REQ-009 R-011', () => {
    expect(NOTICE_MESSAGES['alarm-raised']).toBe('¡Alarma! Te han visto');
  });

  it.each<[RejectionReason, NoticeCode | undefined]>([
    ['no-mp', 'no-mp'],
    ['no-action', 'no-action'],
    ['target-not-adjacent', 'enemy-out-of-range'],
    ['target-not-found', 'enemy-out-of-range'],
    ['target-dead', 'enemy-out-of-range'],
    ['same-faction', 'enemy-out-of-range'],
    ['wall', 'invalid-target'],
    ['occupied', 'invalid-target'],
    ['no-path', 'invalid-target'],
    ['invalid-target', 'invalid-target'],
    ['out-of-bounds', 'invalid-target'],
    ['corner-cut', 'invalid-target'],
    ['invalid-direction', 'invalid-target'],
    ['wrong-phase', undefined],
    ['game-over', undefined],
  ])('traduce el rechazo %s a %s', (reason, expected) => {
    expect(noticeForRejection(reason)).toBe(expected);
  });
});
