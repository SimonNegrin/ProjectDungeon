import { describe, expect, it } from 'vitest';
import { DEFAULT_MAP_SEED } from '../../../src/game/map';
import { nextSeed, parseSeedParam } from '../../../src/host/seed';

const UINT32_MAX = 0xffff_ffff;

describe('parseSeedParam', () => {
  it('usa la semilla por defecto sin aviso cuando no hay parámetro', () => {
    expect(parseSeedParam('')).toEqual({ seed: DEFAULT_MAP_SEED });
    expect(parseSeedParam('?debug=1')).toEqual({ seed: DEFAULT_MAP_SEED });
  });

  it('acepta un entero válido de la URL', () => {
    expect(parseSeedParam('?seed=279837264')).toEqual({ seed: 279837264 });
    expect(parseSeedParam('?otro=1&seed=42')).toEqual({ seed: 42 });
  });

  it('no usa la semilla por defecto cuando la URL trae una válida', () => {
    expect(parseSeedParam('?seed=42').seed).toBe(42);
    expect(parseSeedParam('?seed=42').seed).not.toBe(DEFAULT_MAP_SEED);
  });

  it('admite signo y normaliza a 32 bits sin signo', () => {
    expect(parseSeedParam('?seed=+7')).toEqual({ seed: 7 });
    expect(parseSeedParam('?seed=-1')).toEqual({ seed: UINT32_MAX });
    expect(parseSeedParam('?seed=4294967296')).toEqual({ seed: 0 });
  });

  it.each([
    'abc',
    '1.5',
    '1e9',
    '',
    ' 5',
    '5 ',
    '0x10',
    '1,5',
  ])('usa la semilla por defecto y avisa con el valor inválido %j', (value) => {
    const parsed = parseSeedParam(`?seed=${value}`);

    expect(parsed.seed).toBe(DEFAULT_MAP_SEED);
    expect(parsed.warning).toBeTruthy();
    expect(parsed.warning).toContain('inválida');
    if (value.length > 0) expect(parsed.warning).toContain(value);
  });

  it('trata un espacio escapado como inválido', () => {
    const parsed = parseSeedParam('?seed=%20');

    expect(parsed.seed).toBe(DEFAULT_MAP_SEED);
    expect(parsed.warning).toBeTruthy();
    expect(parsed.warning).toContain('inválida');
  });

  it('no rompe con un escapado inválido', () => {
    const parsed = parseSeedParam('?seed=%E0%A4%A');

    expect(parsed.seed).toBe(DEFAULT_MAP_SEED);
    expect(parsed.warning).toBeTruthy();
  });
});

describe('nextSeed', () => {
  it('devuelve un entero sin signo de 32 bits distinto de la semilla anterior', () => {
    const samples = [0, 0.25, 0.5, 0.75, 0.999999];

    for (const sample of samples) {
      const seed = nextSeed(12345, () => sample);
      expect(Number.isInteger(seed)).toBe(true);
      expect(seed).toBeGreaterThanOrEqual(0);
      expect(seed).toBeLessThanOrEqual(UINT32_MAX);
      expect(seed).not.toBe(12345);
    }
  });

  it('evita repetir la semilla incluso con un random que cae en ella', () => {
    // 0.5 * 2^32 = 2147483648.
    expect(nextSeed(2147483648, () => 0.5)).toBe(2147483649);
  });

  it('sin random inyectado sigue devolviendo una semilla válida y distinta', () => {
    for (const previous of [0, 1, DEFAULT_MAP_SEED, UINT32_MAX]) {
      const seed = nextSeed(previous);
      expect(Number.isInteger(seed)).toBe(true);
      expect(seed).toBeGreaterThanOrEqual(0);
      expect(seed).toBeLessThanOrEqual(UINT32_MAX);
      expect(seed).not.toBe(previous);
    }
  });
});
