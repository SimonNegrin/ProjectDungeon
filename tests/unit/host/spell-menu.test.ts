import { describe, expect, it } from 'vitest';
import { SPELLS } from '../../../src/game/spells';
import {
  buildSpellMenuModel,
  moveSpellSelection,
  spellAvailability,
  spellIndex,
  SPELL_ORDER,
} from '../../../src/host/spell-menu';
import { makeState, makeUnit } from '../game/helpers';
import { createPlayerFromArchetype } from '../../../src/game/roster';

function mage(options: {
  readonly magicLevel?: 0 | 1 | 2 | 3 | 4;
  readonly mana?: number;
  readonly spellsCast?: number;
}) {
  const unit =
    options.magicLevel === undefined || options.magicLevel === 4
      ? createPlayerFromArchetype('mage', { id: 'player-1', position: { x: 4, y: 4 } })
      : makeUnit({
          id: 'player-1',
          faction: 'player',
          x: 4,
          y: 4,
          magicLevel: options.magicLevel,
        });
  return {
    ...unit,
    mana: {
      current: options.mana ?? unit.mana.current,
      max: unit.mana.max,
    },
    spellsCast: options.spellsCast ?? 0,
  };
}

describe('disponibilidad de hechizos', () => {
  it('ordena los seis hechizos del catálogo de forma estable', () => {
    expect(SPELL_ORDER).toEqual([
      'electric-1',
      'fire-2',
      'electric-3',
      'fire-4',
      'healing-3',
      'resurrection-4',
    ]);
    for (const id of SPELL_ORDER) expect(SPELLS[id]).toBeDefined();
  });

  it('prioriza nivel, luego maná y luego tope', () => {
    const levelOne = mage({ magicLevel: 1, mana: 4 });
    for (const id of SPELL_ORDER) {
      const spell = SPELLS[id];
      expect(spellAvailability(levelOne, spell)).toBe(
        spell.minLevel > 1 ? 'level' : 'available',
      );
    }

    const dry = mage({ magicLevel: 4, mana: SPELLS['electric-1'].cost - 1 });
    expect(spellAvailability(dry, SPELLS['electric-1'])).toBe('mana');

    const capped = mage({ magicLevel: 4, mana: 16, spellsCast: 2 });
    expect(spellAvailability(capped, SPELLS['electric-1'])).toBe('limit');
  });

  it('etiqueta cada fila con nombre, nivel, coste y disponibilidad', () => {
    const state = makeState({ players: [mage({ magicLevel: 4, mana: 16 })] });
    const model = buildSpellMenuModel(state, {
      open: true,
      index: 0,
      selectedId: null,
    });

    expect(model.open).toBe(true);
    expect(model.items.map((item) => item.name)).toEqual([
      SPELLS['electric-1'].name,
      SPELLS['fire-2'].name,
      SPELLS['electric-3'].name,
      SPELLS['fire-4'].name,
      SPELLS['healing-3'].name,
      SPELLS['resurrection-4'].name,
    ]);
    expect(model.items.map((item) => item.minLevel)).toEqual(
      SPELL_ORDER.map((id) => SPELLS[id].minLevel),
    );
    expect(model.items.map((item) => item.cost)).toEqual(
      SPELL_ORDER.map((id) => SPELLS[id].cost),
    );
    expect(model.items.every((item) => item.availability === 'available')).toBe(
      true,
    );
    expect(model.items[0]).toMatchObject({
      availabilityLabel: 'disponible',
      selected: true,
    });
    expect(model.items.slice(1).every((item) => !item.selected)).toBe(true);
  });

  it('distingue la fila resaltada al abrir y el hechizo guardado al cerrar', () => {
    const state = makeState({ players: [mage({ magicLevel: 4, mana: 16 })] });
    const open = buildSpellMenuModel(state, {
      open: true,
      index: 2,
      selectedId: 'fire-2',
    });
    expect(open.items.find((item) => item.id === 'electric-3')?.selected).toBe(
      true,
    );
    expect(open.items.find((item) => item.id === 'fire-2')?.selected).toBe(
      false,
    );

    const closed = buildSpellMenuModel(state, {
      open: false,
      index: 2,
      selectedId: 'fire-2',
    });
    expect(closed.items.find((item) => item.id === 'fire-2')?.selected).toBe(
      true,
    );
    expect(closed.items.find((item) => item.id === 'electric-3')?.selected).toBe(
      false,
    );
  });

  it('navega con vuelta circular y localiza el índice', () => {
    expect(moveSpellSelection(0, -1, 6)).toBe(5);
    expect(moveSpellSelection(5, 1, 6)).toBe(0);
    expect(moveSpellSelection(1, 1, 6)).toBe(2);
    expect(spellIndex('healing-3')).toBe(4);
    expect(spellIndex(null)).toBe(-1);
  });
});
