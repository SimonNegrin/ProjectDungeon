import { describe, expect, it } from 'vitest';
import { KEYS_HELP } from '../../../src/host/hud';
import { isManagedKey, translateKey } from '../../../src/host/input';
import {
  KEY_BINDINGS,
  formatKeyHelp,
  keyCodesLabel,
  keyLabel,
} from '../../../src/host/keymap';
import { makeState } from '../game/helpers';

describe('mapa único de teclas', () => {
  it('no repite ningún código entre vinculaciones', () => {
    const seen = new Set<string>();
    for (const binding of KEY_BINDINGS) {
      for (const code of binding.codes) {
        expect(seen.has(code), `${code} está repetido`).toBe(false);
        seen.add(code);
      }
    }
  });

  it('normaliza y genera las etiquetas visibles', () => {
    expect(keyLabel('arrowup')).toBe('↑');
    expect(keyLabel('arrowleft')).toBe('←');
    expect(keyLabel('arrowdown')).toBe('↓');
    expect(keyLabel('arrowright')).toBe('→');
    expect(keyLabel('escape')).toBe('Esc');
    expect(keyLabel(' ')).toBe('Espacio');
    expect(keyLabel('enter')).toBe('Enter');
    expect(keyLabel('w')).toBe('W');
    expect(keyCodesLabel(KEY_BINDINGS[0])).toBe('W/↑');
  });

  it('cada código de movimiento del catálogo produce la intención de cursor correcta', () => {
    const state = makeState();
    const cursor = { x: 4, y: 4 };
    const cursors = KEY_BINDINGS.filter((binding) => binding.cursor !== undefined);
    expect(cursors).toHaveLength(4);

    for (const binding of cursors) {
      for (const code of binding.codes) {
        expect(translateKey({ key: code }, state, cursor)).toEqual({
          type: 'cursor',
          dx: binding.cursor!.dx,
          dy: binding.cursor!.dy,
        });
      }
    }
  });

  it('la ayuda del HUD deriva del catálogo y contiene todas las etiquetas', () => {
    expect(formatKeyHelp()).toBe(KEYS_HELP);
    for (const binding of KEY_BINDINGS) {
      expect(KEYS_HELP).toContain(binding.label);
    }
    expect(KEYS_HELP).toContain('Espacio/Enter');
    expect(KEYS_HELP).toContain('F1');
    expect(KEYS_HELP).toContain('F2');
    expect(KEYS_HELP).not.toContain('reiniciar');
    expect(KEYS_HELP).not.toContain('R ');
  });

  it('bloquea el navegador con las teclas gestionadas y deja R fuera', () => {
    for (const binding of KEY_BINDINGS) {
      for (const code of binding.codes) {
        expect(isManagedKey(code)).toBe(true);
      }
    }
    expect(isManagedKey('r')).toBe(false);
    expect(isManagedKey('R')).toBe(false);
    expect(KEY_BINDINGS.flatMap((binding) => binding.codes)).not.toContain('r');
  });

  it('Esc abre la pausa y R ya no reinicia', () => {
    const state = makeState();
    expect(translateKey({ key: 'Escape' }, state, { x: 4, y: 4 })).toEqual({
      type: 'pause-toggle',
    });
    expect(translateKey({ key: 'r' }, state, { x: 4, y: 4 })).toEqual({
      type: 'ignored',
      reason: 'unmapped',
    });
    expect(translateKey({ key: 'R' }, state, { x: 4, y: 4 })).toEqual({
      type: 'ignored',
      reason: 'unmapped',
    });
    expect(
      translateKey({ key: 'Escape' }, state, { x: 4, y: 4 }, { animating: true }),
    ).toEqual({ type: 'pause-toggle' });
  });
});
