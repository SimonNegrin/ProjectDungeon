import { describe, expect, it } from 'vitest';
import {
  cursorTransition,
  type CursorPlacement,
} from '../../../src/host/inventory-panel-view';

function placement(
  key: string,
  zone: string,
  x: number,
  y: number,
  width = 34,
): CursorPlacement {
  return { key, zone, center: { x, y }, width };
}

describe('modo del cursor superpuesto (R-030/R-031/T-014)', () => {
  it('la primera colocación es instantánea', () => {
    expect(
      cursorTransition(null, placement('backpack:0', 'backpack', 100, 100)),
    ).toBe('instant');
  });

  it('anima un vecino horizontal de la misma zona y fila', () => {
    expect(
      cursorTransition(
        placement('backpack:0', 'backpack', 100, 100),
        placement('backpack:1', 'backpack', 134, 100),
      ),
    ).toBe('animate');
  });

  it('anima también si la fila difiere menos de un píxel', () => {
    expect(
      cursorTransition(
        placement('backpack:0', 'backpack', 100, 100),
        placement('backpack:1', 'backpack', 134, 101),
      ),
    ).toBe('animate');
  });

  it('anima saltos horizontales largos dentro de la misma fila', () => {
    expect(
      cursorTransition(
        placement('backpack:0', 'backpack', 100, 100),
        placement('backpack:2', 'backpack', 168, 100),
      ),
    ).toBe('animate');
  });

  it('anima el cambio de fila y de columna', () => {
    expect(
      cursorTransition(
        placement('backpack:0', 'backpack', 100, 100),
        placement('backpack:2', 'backpack', 100, 134),
      ),
    ).toBe('animate');
    expect(
      cursorTransition(
        placement('backpack:1', 'backpack', 134, 100),
        placement('slot:armor', 'equipment', 100, 134),
      ),
    ).toBe('animate');
  });

  it('anima el cambio de zona entre equipamiento, bolsa y suelo', () => {
    expect(
      cursorTransition(
        placement('backpack:1', 'backpack', 134, 100),
        placement('ground:item-test-ground-0', 'right', 168, 100),
      ),
    ).toBe('animate');
  });

  it('salta al instante al reabrir, con scroll, resize o actualizar el modelo', () => {
    const previous = placement('backpack:0', 'backpack', 100, 100);
    const next = placement('backpack:1', 'backpack', 134, 100);
    for (const label of ['reapertura', 'scroll', 'resize', 'actualización']) {
      expect(
        cursorTransition(previous, next, { forceInstant: true }),
        label,
      ).toBe('instant');
    }
  });

  it('es instantáneo con movimiento reducido', () => {
    const previous = placement('backpack:0', 'backpack', 100, 100);
    const next = placement('backpack:1', 'backpack', 134, 100);
    expect(cursorTransition(previous, next, { reducedMotion: true })).toBe(
      'instant',
    );
  });

  it('no anima si la clave no cambió', () => {
    const previous = placement('backpack:0', 'backpack', 100, 100);
    expect(cursorTransition(previous, previous)).toBe('instant');
  });
});
