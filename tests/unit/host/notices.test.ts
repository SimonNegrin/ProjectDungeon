import { describe, expect, it } from 'vitest';
import {
  NOTICE_MESSAGES,
  noticeForRejection,
  type NoticeCode,
} from '../../../src/host/notices';
import type { RejectionReason } from '../../../src/game/types';

describe('avisos de rechazo del HUD', () => {
  it('mantiene los textos aprobados y añade los motivos de hechizo', () => {
    expect(NOTICE_MESSAGES).toEqual({
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
    });
  });

  it.each<[RejectionReason, NoticeCode | undefined]>([
    ['no-mp', 'no-mp'],
    ['no-action', 'no-action'],
    ['no-mana', 'no-mana'],
    ['insufficient-level', 'insufficient-level'],
    ['out-of-range', 'out-of-range'],
    ['no-line-of-sight', 'no-line-of-sight'],
    ['spell-limit', 'spell-limit'],
    ['unknown-spell', 'unknown-spell'],
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
