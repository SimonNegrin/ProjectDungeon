import { describe, expect, it } from 'vitest';
import { createPlayerFromArchetype } from '../../../src/game/roster';
import { buildDebugModel, buildHudModel } from '../../../src/host/hud';
import type { CursorStatus } from '../../../src/host/cursor';
import { makeState, makeUnit } from '../game/helpers';

const CURSOR: CursorStatus = {
  x: 5,
  y: 5,
  visible: true,
  kind: 'player',
  state: 'player',
  path: [],
  cost: 0,
  withinMp: true,
  strongSteps: 0,
};

function mage(manaCurrent = 16) {
  const unit = createPlayerFromArchetype('mage', {
    id: 'player-1',
    position: { x: 5, y: 5 },
  });
  return { ...unit, mana: { current: manaCurrent, max: unit.mana.max } };
}

describe('HUD de magia y maná', () => {
  it('muestra nivel 0 y maná 0/0 sin romper el modelo del jugador', () => {
    const state = makeState({
      players: [makeUnit({ id: 'player-1', faction: 'player', x: 5, y: 5 })],
    });

    expect(buildHudModel(state)).toMatchObject({
      playerMagic: '0',
      playerMana: '0/0',
      playerHp: '20/20',
      playerMp: '6/6',
    });
  });

  it('muestra los niveles 0-4 y el maná actual/máximo derivado', () => {
    for (const level of [0, 1, 2, 3, 4] as const) {
      const unit = makeUnit({
        id: 'player-1',
        faction: 'player',
        x: 5,
        y: 5,
        magicLevel: level,
      });
      const model = buildHudModel(makeState({ players: [unit] }));

      expect(model.playerMagic).toBe(String(level));
      expect(model.playerMana).toBe(`${level * 4}/${level * 4}`);
    }
  });

  it('muestra magia y maná del enemigo bajo el cursor y guiones sin enemigo', () => {
    const state = makeState({
      players: [mage(10)],
      enemies: [
        makeUnit({
          id: 'enemy-1',
          faction: 'enemy',
          x: 6,
          y: 5,
          magicLevel: 2,
          mana: { current: 5, max: 8 },
        }),
      ],
    });

    expect(buildHudModel(state, { x: 6, y: 5 })).toMatchObject({
      cursorEnemyMagic: '2',
      cursorEnemyMana: '5/8',
    });
    expect(buildHudModel(state, { x: 5, y: 5 })).toMatchObject({
      cursorEnemyMagic: '—',
      cursorEnemyMana: '—/—',
    });
    expect(buildHudModel(state)).toMatchObject({
      cursorEnemyMagic: '—',
      cursorEnemyMana: '—/—',
    });
  });

  it('el debug expone magia y maná del jugador y de todos los enemigos', () => {
    const state = makeState({
      players: [mage(12)],
      enemies: [
        makeUnit({
          id: 'enemy-1',
          faction: 'enemy',
          x: 6,
          y: 5,
          magicLevel: 3,
          mana: { current: 7, max: 12 },
        }),
        makeUnit({
          id: 'enemy-2',
          faction: 'enemy',
          x: 7,
          y: 5,
          hp: 0,
          magicLevel: 1,
          mana: { current: 0, max: 4 },
        }),
      ],
    });

    const text = buildDebugModel(
      state,
      { x: 0, y: 0 },
      { maxX: 224, maxY: 224 },
      { width: 416, height: 416 },
      [],
      CURSOR,
    ).lines.join('\n');

    expect(text).toContain('Magia 4 · Maná 12/16');
    expect(text).toContain('Magia enemiga enemy-1: Magia 3 · Maná 7/12');
    expect(text).toContain('Magia enemiga enemy-2: Magia 1 · Maná 0/4');
  });
});
