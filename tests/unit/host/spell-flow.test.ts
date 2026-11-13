import { describe, expect, it } from 'vitest';
import { reduce } from '../../../src/game/engine';
import { SPELLS } from '../../../src/game/spells';
import type { GameState } from '../../../src/game/types';
import { buildHudModel } from '../../../src/host/hud';
import { makeState, makeUnit } from '../game/helpers';

function mageState(): GameState {
  return makeState({
    players: [
      makeUnit({
        id: 'player-1',
        faction: 'player',
        x: 5,
        y: 5,
        hp: 20,
        maxHp: 20,
        magicLevel: 4,
        mana: { current: 16, max: 16 },
        actions: 2,
      }),
    ],
    enemies: [
      makeUnit({
        id: 'enemy-1',
        faction: 'enemy',
        x: 8,
        y: 5,
        hp: 30,
        maxHp: 30,
      }),
    ],
  });
}

function cast(state: GameState, spellId: keyof typeof SPELLS, x = 8, y = 5) {
  return reduce(state, {
    type: 'CastSpell',
    unitId: 'player-1',
    spellId,
    target: { x, y },
  });
}

describe('flujo de hechizos a través del motor y el HUD', () => {
  it('lanza dos hechizos con dos acciones y rechaza el tercero sin gastar', () => {
    const start = mageState();
    const electric = SPELLS['electric-1'];
    const fire = SPELLS['fire-2'];

    const first = cast(start, 'electric-1');
    expect(first.events[0]).toMatchObject({
      type: 'SpellCast',
      spellId: 'electric-1',
    });
    expect(first.state.players[0]).toMatchObject({
      mana: { current: 16 - electric.cost, max: 16 },
      actions: { remaining: 1, max: 2 },
      spellsCast: 1,
    });

    const second = cast(first.state, 'fire-2');
    expect(second.events[0]).toMatchObject({
      type: 'SpellCast',
      spellId: 'fire-2',
    });
    expect(second.state.players[0]).toMatchObject({
      mana: { current: 16 - electric.cost - fire.cost, max: 16 },
      actions: { remaining: 0, max: 2 },
      spellsCast: 2,
    });

    const before = {
      mana: second.state.players[0].mana,
      actions: second.state.players[0].actions,
      spellsCast: second.state.players[0].spellsCast,
      rng: second.state.rng,
      enemyHp: second.state.enemies[0].hp,
    };
    const third = cast(second.state, 'electric-1');

    expect(third.events).toEqual([
      {
        type: 'CommandRejected',
        commandType: 'CastSpell',
        reason: 'no-action',
      },
    ]);
    expect(third.state).toBe(second.state);
    expect(third.state.players[0]).toMatchObject({
      mana: before.mana,
      actions: before.actions,
      spellsCast: before.spellsCast,
    });
    expect(third.state.rng).toEqual(before.rng);
    expect(third.state.enemies[0].hp).toBe(before.enemyHp);
  });

  it('recarga maná y acciones al turno siguiente y el HUD lo refleja', () => {
    const start = mageState();
    const afterFirst = cast(start, 'electric-1').state;
    const afterSecond = cast(afterFirst, 'fire-2').state;

    expect(buildHudModel(afterSecond).playerMana).toBe('10/16');
    expect(buildHudModel(afterSecond).action).toBe('0/2');

    const ended = reduce(afterSecond, { type: 'EndTurn' });
    const model = buildHudModel(ended.state);
    expect(ended.state.players[0].mana).toEqual({ current: 16, max: 16 });
    expect(model.playerMana).toBe('16/16');
    expect(model.action).toBe('2/2');
  });

  it('un rechazo por maná, nivel, alcance o LOS no consume recurso ni RNG', () => {
    const base = mageState();

    const dry: GameState = {
      ...base,
      players: [{ ...base.players[0], mana: { current: 1, max: 16 } }],
    };
    const noMana = cast(dry, 'electric-1');
    expect(noMana.events).toEqual([
      {
        type: 'CommandRejected',
        commandType: 'CastSpell',
        reason: 'no-mana',
      },
    ]);
    expect(noMana.state).toBe(dry);

    const lowLevel: GameState = {
      ...base,
      players: [
        {
          ...base.players[0],
          stats: { ...base.players[0].stats, magicLevel: 1 },
          mana: { current: 4, max: 4 },
        },
      ],
    };
    const noLevel = cast(lowLevel, 'fire-2');
    expect(noLevel.events).toEqual([
      {
        type: 'CommandRejected',
        commandType: 'CastSpell',
        reason: 'insufficient-level',
      },
    ]);
    expect(noLevel.state).toBe(lowLevel);

    const far: GameState = {
      ...base,
      enemies: [{ ...base.enemies[0], x: 12, y: 5 }],
    };
    const outOfRange = cast(far, 'electric-1', 12, 5);
    expect(outOfRange.events).toEqual([
      {
        type: 'CommandRejected',
        commandType: 'CastSpell',
        reason: 'out-of-range',
      },
    ]);
    expect(outOfRange.state).toBe(far);
  });
});
