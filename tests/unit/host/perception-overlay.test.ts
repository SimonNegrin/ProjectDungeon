import { describe, expect, it } from 'vitest';
import { BspMapGenerator, createInitialState } from '../../../src/game/index';
import { perceptionRadii } from '../../../src/host/perception-overlay';
import { makeState, makeUnit } from '../game/helpers';

describe('radios de percepción del overlay de debug', () => {
  it('sin F1 no devuelve radios: el juego normal no dibuja círculos', () => {
    const state = createInitialState({ seed: 279837264 });

    expect(perceptionRadii(state, false)).toEqual([]);
  });

  it('con F1 expone visión 6/4/5 y alarma 8 de los 4 enemigos', () => {
    const state = createInitialState({
      seed: 279837264,
      generator: new BspMapGenerator(),
    });
    const radii = perceptionRadii(state, true);

    expect(radii).toHaveLength(8);
    expect(
      radii
        .filter((radius) => radius.kind === 'vision')
        .map((radius) => [radius.unitId, radius.radius]),
    ).toEqual([
      ['enemy-1', 6],
      ['enemy-2', 6],
      ['enemy-3', 4],
      ['enemy-4', 5],
    ]);
    expect(
      radii
        .filter((radius) => radius.kind === 'alarm')
        .map((radius) => [radius.unitId, radius.radius]),
    ).toEqual([
      ['enemy-1', 8],
      ['enemy-2', 8],
      ['enemy-3', 8],
      ['enemy-4', 8],
    ]);
  });

  it('no dibuja radios de enemigos muertos ni de unidades sin bestiario', () => {
    const state = makeState({
      enemies: [
        makeUnit({
          id: 'enemy-1',
          faction: 'enemy',
          enemyType: 'sentinel',
          x: 5,
          y: 5,
          hp: 0,
        }),
        makeUnit({ id: 'enemy-2', faction: 'enemy', x: 8, y: 8 }),
      ],
    });

    expect(perceptionRadii(state, true)).toEqual([]);
  });

  it('el centro de cada radio es la casilla del enemigo', () => {
    const state = createInitialState({ seed: 279837264 });
    const radii = perceptionRadii(state, true);
    const enemy = state.enemies[0];

    expect(radii[0]).toMatchObject({ unitId: enemy.id, x: enemy.x, y: enemy.y });
  });
});
