import { describe, expect, it } from 'vitest';
import { createInitialState } from '../../../src/game/index';
import type { Tile } from '../../../src/game/types';
import { wallTileFor } from '../../../src/host/wall';

interface TestGrid {
  readonly width: number;
  readonly height: number;
  readonly tiles: readonly Tile[];
}

function grid(rows: readonly string[]): TestGrid {
  return {
    width: rows[0].length,
    height: rows.length,
    tiles: rows.flatMap((row) => [...row].map((cell) => (cell === '#' ? 'wall' : 'floor'))),
  };
}

describe('wallTileFor', () => {
  it('usa wallSide1 cuando el sur es suelo', () => {
    const world = grid(['##', '#.', '..']);

    expect(wallTileFor(world, 1, 1)).toBe('wallSide1');
  });

  it('usa wallTop cuando el sur es muro', () => {
    const world = grid(['##', '##', '##']);

    expect(wallTileFor(world, 1, 1)).toBe('wallTop');
    expect(wallTileFor(world, 1, 0)).toBe('wallTop');
  });

  it('usa wallTop si el sur queda fuera de la rejilla', () => {
    const world = grid(['..', '#.']);

    expect(wallTileFor(world, 0, world.height - 1)).toBe('wallTop');
  });

  it('usa wallTop aunque haya suelo al norte, este u oeste si el sur es muro', () => {
    const world = grid(['...', '.#.', '###']);

    expect(wallTileFor(world, 1, 1)).toBe('wallTop');
  });

  it('usa wallTop en un muro aislado rodeado de muro', () => {
    const world = grid(['###', '#.#', '###']);

    expect(wallTileFor(world, 1, 1)).toBe('wallTop');
  });

  it('usa wallTop si la columna queda fuera de la rejilla', () => {
    const world = grid(['..', '..']);

    expect(wallTileFor(world, -1, 0)).toBe('wallTop');
    expect(wallTileFor(world, 2, 0)).toBe('wallTop');
  });

  it('nunca devuelve wallSide2 en el mapa generado de referencia', () => {
    const state = createInitialState({ seed: 279837264 });
    const values = new Set<string>();

    for (let y = 0; y < state.grid.height; y += 1) {
      for (let x = 0; x < state.grid.width; x += 1) {
        values.add(wallTileFor(state.grid, x, y));
      }
    }

    expect(values).toEqual(new Set(['wallTop', 'wallSide1']));
    expect(values.has('wallSide2')).toBe(false);
  });

  it('coincide con la regla en todo el mapa generado', () => {
    const state = createInitialState({ seed: 279837264 });
    const { width, height, tiles } = state.grid;

    let sideCount = 0;
    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        const expected =
          y + 1 < height && tiles[(y + 1) * width + x] === 'floor' ? 'wallSide1' : 'wallTop';
        expect(wallTileFor(state.grid, x, y), `tile (${x},${y})`).toBe(expected);
        if (expected === 'wallSide1') sideCount += 1;
      }
    }

    expect(sideCount).toBeGreaterThan(0);
  });
});
