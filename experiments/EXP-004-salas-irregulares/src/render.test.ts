import { describe, expect, it } from 'vitest';
import { doorViewPosition } from './render';

describe('puertas en la vista 13×13', () => {
  it('resta el origen del viewport y descarta las puertas fuera', () => {
    const view = { x: 4, y: 3, width: 13, height: 13 };
    expect(doorViewPosition({ x: 5, y: 4 }, view, 16)).toEqual({ x: 16, y: 16 });
    expect(doorViewPosition({ x: 4, y: 3 }, view, 16)).toEqual({ x: 0, y: 0 });
    expect(doorViewPosition({ x: 3, y: 4 }, view, 16)).toBeNull();
    expect(doorViewPosition({ x: 5, y: 16 }, view, 16)).toBeNull();
  });

  it('la puerta del mapa completo usa el mismo origen', () => {
    const view = { x: 0, y: 0, width: 22, height: 18 };
    expect(doorViewPosition({ x: 7, y: 9 }, view, 20)).toEqual({ x: 140, y: 180 });
  });
});
