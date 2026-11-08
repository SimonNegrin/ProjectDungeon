import { describe, expect, it } from 'vitest';
import { reduce } from '../../../src/game/index';
import {
  collectAttackFeedbacks,
  collectDamageFeedbacks,
} from '../../../src/host/feedback';
import { makeState, makeUnit, rngForDice } from '../game/helpers';

describe('feedback de ataque', () => {
  it('convierte AttackPerformed en daño y posición del objetivo', () => {
    const state = makeState({
      players: [makeUnit({ id: 'player-1', faction: 'player', x: 5, y: 5 })],
      enemies: [makeUnit({ id: 'enemy-1', faction: 'enemy', x: 6, y: 5 })],
      rng: rngForDice([6, 1, 2, 1]),
    });
    const result = reduce(state, {
      type: 'Attack',
      unitId: 'player-1',
      targetId: 'enemy-1',
    });

    expect(collectDamageFeedbacks(result.events, result.state)).toEqual([
      { targetId: 'enemy-1', damage: 5, x: 6, y: 5 },
    ]);
  });

  it('también produce feedback para el ataque enemigo', () => {
    const state = makeState({
      players: [makeUnit({ id: 'player-1', faction: 'player', x: 5, y: 5 })],
      enemies: [makeUnit({ id: 'enemy-1', faction: 'enemy', x: 6, y: 5 })],
      rng: rngForDice([6, 1, 3, 3]),
    });
    const result = reduce(state, { type: 'EndTurn' });

    expect(collectDamageFeedbacks(result.events, result.state)).toEqual([
      { targetId: 'player-1', damage: 3, x: 5, y: 5 },
    ]);
  });

  it('no inventa feedback sin ataques', () => {
    const state = makeState();

    expect(collectDamageFeedbacks([], state)).toEqual([]);
    expect(collectAttackFeedbacks([], state)).toEqual([]);
  });
});

describe('feedback de impacto y fallo', () => {
  it('un impacto usa el texto ASCII -N y conserva daño, vida y tiradas', () => {
    const state = makeState({
      players: [makeUnit({ id: 'player-1', faction: 'player', x: 5, y: 5 })],
      enemies: [makeUnit({ id: 'enemy-1', faction: 'enemy', x: 6, y: 5 })],
      rng: rngForDice([6, 1, 2, 1]),
    });
    const result = reduce(state, {
      type: 'Attack',
      unitId: 'player-1',
      targetId: 'enemy-1',
    });

    expect(collectAttackFeedbacks(result.events, result.state)).toEqual([
      {
        targetId: 'enemy-1',
        hit: true,
        damage: 5,
        targetHp: 5,
        rolls: { attack: 6, shield: 1, damage: 2, armor: 1 },
        text: '-5',
        x: 6,
        y: 5,
      },
    ]);
  });

  it('un fallo produce Fallo con texto y sin tiradas de daño', () => {
    const state = makeState({
      players: [makeUnit({ id: 'player-1', faction: 'player', x: 5, y: 5 })],
      enemies: [makeUnit({ id: 'enemy-1', faction: 'enemy', x: 6, y: 5 })],
      rng: rngForDice([1, 6]),
    });
    const result = reduce(state, {
      type: 'Attack',
      unitId: 'player-1',
      targetId: 'enemy-1',
    });

    const [feedback] = collectAttackFeedbacks(result.events, result.state);

    expect(feedback).toMatchObject({
      targetId: 'enemy-1',
      hit: false,
      damage: 0,
      targetHp: 10,
      rolls: { attack: 1, shield: 6, damage: null, armor: null },
      text: 'Fallo',
      x: 6,
      y: 5,
    });
  });
});
