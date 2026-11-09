import { describe, expect, it } from 'vitest';
import { BESTIARY, BspMapGenerator, createInitialState } from '../../../src/game/index';
import { perceptionRadii } from '../../../src/host/perception-overlay';
import { makeState, makeUnit } from '../game/helpers';

describe('radios de percepción del overlay de debug', () => {
  it('sin F1 no devuelve radios: el juego normal no dibuja círculos', () => {
    const state = createInitialState({ seed: 279837264 });

    expect(perceptionRadii(state, false)).toEqual([]);
  });

  it('con F1 expone visión y alarma de los 4 enemigos desde el bestiario', () => {
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
    ).toEqual(
      state.enemies.map((enemy) => [
        enemy.id,
        BESTIARY[enemy.enemyType!].vision,
      ]),
    );
    expect(
      radii
        .filter((radius) => radius.kind === 'alarm')
        .map((radius) => [radius.unitId, radius.radius]),
    ).toEqual(
      state.enemies.map((enemy) => [
        enemy.id,
        BESTIARY[enemy.enemyType!].alarm,
      ]),
    );
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
