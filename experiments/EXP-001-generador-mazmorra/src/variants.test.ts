import { describe, expect, it } from 'vitest';
import {
  computeMetrics,
  connectivityPercentage,
  createDungeon,
  fingerprint,
  isLargeRoom,
  isSmallRoom,
  type DungeonState,
  type VariantId,
} from './dungeon';

const variants: VariantId[] = ['bsp', 'random', 'hybrid'];
const options = {
  width: 32,
  height: 32,
  roomTarget: 10,
  roomMin: 3,
  roomMax: 11,
  loopRatio: 20,
};

function assertUsableState(state: DungeonState): void {
  expect(state.rooms.length).toBeGreaterThanOrEqual(8);
  expect(state.rooms.length).toBeLessThanOrEqual(12);
  expect(state.doors.length).toBeGreaterThan(0);
  expect(state.corridors.length).toBeGreaterThanOrEqual(state.rooms.length - 1);
  expect(connectivityPercentage(state)).toBeCloseTo(100, 5);

  expect(state.rooms.filter(isLargeRoom).length).toBeGreaterThanOrEqual(2);
  expect(state.rooms.filter(isSmallRoom).length).toBeGreaterThanOrEqual(3);

  const metrics = computeMetrics(state);
  expect(metrics.length).toBeGreaterThan(8);
  expect(metrics.map((metric) => metric.label)).toEqual(
    expect.arrayContaining(['Grandes', 'Pequeñas']),
  );
  for (const metric of metrics) {
    expect(metric.label.length).toBeGreaterThan(0);
    expect(metric.value).not.toBe('');
    expect(metric.value).not.toBeUndefined();
  }
}

describe('integración de las tres variantes sin DOM', () => {
  it('A/B/C generan estado y métricas no vacías con la misma semilla', () => {
    const states = variants.map((variant) => createDungeon(variant, 20261107, options));
    for (const state of states) assertUsableState(state);
    for (const state of states) {
      expect(state.seed).toBe(20261107);
      expect(state.warnings.some((warning) => warning.includes('semilla'))).toBe(false);
    }
  });

  it('A/B/C cumplen 2 grandes y 3 pequeñas en tres semillas por defecto', () => {
    for (const variant of variants) {
      for (const seed of [1, 123, 20261107]) {
        const state = createDungeon(variant, seed, options);
        expect(state.rooms.length, `${variant} · ${seed}`).toBeGreaterThanOrEqual(8);
        expect(state.rooms.length, `${variant} · ${seed}`).toBeLessThanOrEqual(12);
        expect(state.rooms.filter(isLargeRoom).length, `${variant} · ${seed}`).toBeGreaterThanOrEqual(2);
        expect(state.rooms.filter(isSmallRoom).length, `${variant} · ${seed}`).toBeGreaterThanOrEqual(3);
        expect(connectivityPercentage(state)).toBeCloseTo(100, 5);
      }
    }
  });

  it('la huella de cada variante es estable entre llamadas', () => {
    for (const variant of variants) {
      const first = createDungeon(variant, 123, options);
      const second = createDungeon(variant, 123, options);
      expect(fingerprint(first)).toBe(fingerprint(second));
      expect(computeMetrics(first)).toEqual(computeMetrics(second));
    }
  });

  it('las tres variantes no producen el mismo mapa para la misma semilla', () => {
    const prints = variants.map((variant) => fingerprint(createDungeon(variant, 20261107, options)));
    expect(new Set(prints).size).toBe(3);
  });

  it('los parámetros extremos no rompen la página y exponen un aviso si normalizan', () => {
    const states = variants.map((variant) =>
      createDungeon(variant, 20261107, {
        ...options,
        roomTarget: 12,
        roomMin: 6,
        roomMax: 8,
        loopRatio: 40,
      }),
    );

    for (const state of states) {
      expect(state.rooms.length).toBeGreaterThan(0);
      expect(state.spawns.distance).toBeGreaterThanOrEqual(0);
      expect(state.doors.length).toBeGreaterThan(0);
      expect(
        state.warnings.some((warning) => /pequeñ/i.test(warning)),
        'debe avisar de que no se pueden reservar 3 salas pequeñas',
      ).toBe(true);
      const adjustment = computeMetrics(state).find((metric) => metric.label === 'Ajuste');
      expect(adjustment).toBeDefined();
      expect(String(adjustment?.value).length).toBeGreaterThan(0);
      expect(String(adjustment?.value)).toMatch(/pequeñ/i);
    }
  });
});
