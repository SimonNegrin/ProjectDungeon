import { describe, expect, it } from 'vitest';
import {
  cycleZone,
  findNeighbor,
  firstInReadingOrder,
  nearestTo,
  type NavigationCell,
} from '../../../src/host/inventory-navigation';

function cell(
  key: string,
  x: number,
  y: number,
  zone = 'equipment',
): NavigationCell {
  return { key, zone, center: { x, y } };
}

const grid: readonly NavigationCell[] = [
  cell('slot:head', 50, 10),
  cell('slot:neck', 10, 30),
  cell('slot:ring', 90, 30),
  cell('slot:armor', 50, 50),
  cell('slot:shield', 10, 80),
  cell('slot:hands', 50, 80),
  cell('slot:weapon', 90, 80),
  cell('slot:feet', 50, 110),
  cell('backpack:0', 150, 30, 'backpack'),
  cell('backpack:1', 150, 50, 'backpack'),
  cell('ground:a', 250, 50, 'right'),
];

describe('navegación espacial del panel', () => {
  it('elige el objeto más próximo estrictamente en cada dirección', () => {
    expect(findNeighbor(grid, 'slot:armor', 'up')?.key).toBe('slot:head');
    expect(findNeighbor(grid, 'slot:armor', 'down')?.key).toBe('slot:hands');
    expect(findNeighbor(grid, 'slot:hands', 'down')?.key).toBe('slot:feet');
    expect(findNeighbor(grid, 'slot:armor', 'left')?.key).toBe('slot:neck');
    expect(findNeighbor(grid, 'slot:armor', 'right')?.key).toBe('slot:ring');
  });

  it('no elige objetos a la misma altura ni en sentido contrario (N-004)', () => {
    const aligned = [
      cell('origin', 50, 50),
      cell('same-height', 90, 50),
      cell('behind', 10, 50),
      cell('above', 50, 10),
    ];
    expect(findNeighbor(aligned, 'origin', 'down')).toBeNull();
    expect(findNeighbor(aligned, 'origin', 'up')?.key).toBe('above');
    expect(findNeighbor(grid, 'slot:neck', 'left')).toBeNull();
    expect(findNeighbor(grid, 'slot:armor', 'up')?.key).not.toBe('slot:neck');
  });

  it('en el borde no hay destino y el foco no rebota (N-006)', () => {
    expect(findNeighbor(grid, 'slot:head', 'up')).toBeNull();
    expect(findNeighbor(grid, 'slot:feet', 'down')).toBeNull();
    expect(findNeighbor(grid, 'ground:a', 'right')).toBeNull();
  });

  it('rompe empates por desviación perpendicular y después por orden de lectura', () => {
    const tie = [
      cell('origin', 50, 50),
      cell('left-near', 10, 20),
      cell('right-near', 90, 20),
      cell('reading-first', 50, 10),
    ];

    // Las tres están arriba a la misma distancia; gana la de menor |dx|.
    expect(findNeighbor(tie, 'origin', 'up')?.key).toBe('reading-first');

    const symmetric = [
      cell('origin', 50, 50),
      cell('b', 90, 10),
      cell('a', 10, 10),
    ];
    expect(findNeighbor(symmetric, 'origin', 'up')?.key).toBe('a');

    const sameReading = [
      cell('origin', 50, 50),
      cell('z', 10, 10),
      cell('a', 10, 10),
    ];
    expect(findNeighbor(sameReading, 'origin', 'up')?.key).toBe('a');
  });

  it('cruza de columna cuando el más próximo está al otro lado (N-003)', () => {
    expect(findNeighbor(grid, 'slot:ring', 'right')?.key).toBe('backpack:0');
    expect(findNeighbor(grid, 'backpack:1', 'right')?.key).toBe('ground:a');
  });

  it('el primer objeto por orden de lectura es arriba→abajo e izquierda→derecha', () => {
    expect(firstInReadingOrder(grid)?.key).toBe('slot:head');
    expect(
      firstInReadingOrder([
        cell('b', 90, 10),
        cell('a', 10, 10),
        cell('c', 10, 20),
      ])?.key,
    ).toBe('a');
  });

  it('reubica en el más próximo a un punto y desempata por lectura', () => {
    expect(nearestTo(grid, { x: 92, y: 82 })?.key).toBe('slot:weapon');
    expect(
      nearestTo(
        [cell('b', 90, 10), cell('a', 10, 10)],
        { x: 50, y: 10 },
      )?.key,
    ).toBe('a');
  });

  it('recorre zonas disponibles con Tab y Shift+Tab sin saltar las vacías', () => {
    const zones = ['equipment', 'backpack', 'right', 'actions', 'close'];
    expect(cycleZone(zones, 'equipment')).toBe('backpack');
    expect(cycleZone(zones, 'right')).toBe('actions');
    expect(cycleZone(zones, 'close')).toBe('equipment');
    expect(cycleZone(zones, 'equipment', true)).toBe('close');
    expect(cycleZone(['backpack', 'actions', 'close'], null)).toBe('backpack');
    expect(cycleZone([], 'equipment')).toBeNull();
  });
});
