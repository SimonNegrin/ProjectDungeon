import { describe, expect, it } from 'vitest';
import { reduce } from '../../../src/game/engine';
import { SPELLS } from '../../../src/game/spells';
import type { Unit } from '../../../src/game/types';
import { translateKey } from '../../../src/host/input';
import {
  buildSpellMenuModel,
  moveSpellSelection,
  spellAvailability,
  spellIndex,
  spellMeta,
  spellRangeLabel,
  SPELL_ORDER,
} from '../../../src/host/spell-menu';
import { makeState, makeUnit } from '../game/helpers';
import { createPlayerFromArchetype } from '../../../src/game/roster';

function mage(options: {
  readonly id?: string;
  readonly magicLevel?: 0 | 1 | 2 | 3 | 4;
  readonly mana?: number;
  readonly spellsCast?: number;
}) {
  const id = options.id ?? 'player-1';
  const unit =
    options.magicLevel === undefined || options.magicLevel === 4
      ? createPlayerFromArchetype('mage', { id, position: { x: 4, y: 4 } })
      : makeUnit({
          id,
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

/** Disponibilidad esperada derivada del catálogo y de los recursos del lanzador. */
function availabilityFor(caster: Unit): readonly string[] {
  return SPELL_ORDER.map((id) => {
    const spell = SPELLS[id];
    if (caster.stats.magicLevel < spell.minLevel) return 'level';
    if (caster.mana.current < spell.cost) return 'mana';
    return 'available';
  });
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

  it('etiqueta cada fila con nombre, nivel, coste, alcance y disponibilidad', () => {
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
    expect(model.items.map((item) => item.range)).toEqual(
      SPELL_ORDER.map((id) => SPELLS[id].range),
    );
    expect(model.items.map((item) => item.meta)).toEqual(
      SPELL_ORDER.map((id) => spellMeta(SPELLS[id])),
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

  it('describe una casilla y un rango con el alcance del catálogo', () => {
    expect(spellRangeLabel(SPELLS['healing-3'].range)).toBe(
      `alcance ${SPELLS['healing-3'].range.min}`,
    );
    expect(spellRangeLabel(SPELLS['electric-1'].range)).toBe(
      `alcance ${SPELLS['electric-1'].range.min}–${SPELLS['electric-1'].range.max}`,
    );

    const model = buildSpellMenuModel(
      makeState({ players: [mage({ magicLevel: 4, mana: 16 })] }),
      { open: true, index: 0, selectedId: null },
    );
    for (const id of ['healing-3', 'resurrection-4'] as const) {
      const item = model.items.find((candidate) => candidate.id === id);
      expect(item, `Falta ${id} en la lista`).toBeDefined();
      expect(item?.cost).toBe(SPELLS[id].cost);
      expect(item?.range).toEqual(SPELLS[id].range);
      expect(item?.meta).toContain(` ${SPELLS[id].cost} maná`);
      expect(item?.meta).toContain(`alcance ${SPELLS[id].range.max}`);
    }
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

  it('el Cocinero de nivel 1 ve Eléctrico I disponible y Fuego II por nivel', () => {
    const cook = createPlayerFromArchetype('cook', {
      id: 'player-1',
      position: { x: 4, y: 4 },
    });
    const model = buildSpellMenuModel(
      makeState({ players: [cook] }),
      { open: true, index: 0, selectedId: null },
    );

    expect(model.items.find((item) => item.id === 'electric-1')).toMatchObject({
      availability: 'available',
      availabilityLabel: 'disponible',
    });
    expect(model.items.find((item) => item.id === 'fire-2')).toMatchObject({
      availability: 'level',
      availabilityLabel: 'nivel',
    });
  });

  it('usa el nivel y el maná del jugador activo, no los del primer jugador', () => {
    const first = mage({ id: 'player-1', magicLevel: 0 });
    const second = mage({ id: 'player-2', magicLevel: 2, mana: 3 });
    const model = buildSpellMenuModel(
      makeState({
        players: [first, second],
        activePlayerId: 'player-2',
      }),
      { open: true, index: 0, selectedId: null },
    );

    expect(model.items.map((item) => item.availability)).toEqual(
      availabilityFor(second),
    );
    expect(
      model.items.find((item) => item.id === 'electric-1')?.availability,
    ).toBe('available');
    expect(model.items.find((item) => item.id === 'fire-2')?.availability).toBe(
      'mana',
    );
    expect(
      model.items.find((item) => item.id === 'electric-3')?.availability,
    ).toBe('level');
  });

  it('con el activo en el primero usa sus valores, no los del segundo', () => {
    const first = mage({ id: 'player-1', magicLevel: 2, mana: 3 });
    const second = mage({ id: 'player-2', magicLevel: 0 });
    const model = buildSpellMenuModel(
      makeState({
        players: [first, second],
        activePlayerId: 'player-1',
      }),
      { open: true, index: 0, selectedId: null },
    );

    expect(model.items.map((item) => item.availability)).toEqual(
      availabilityFor(first),
    );
  });

  it('sin activo no cae al primer jugador y la lista queda sin lanzador', () => {
    const first = mage({ id: 'player-1', magicLevel: 1, mana: 4 });
    const second = mage({ id: 'player-2', magicLevel: 0 });
    const model = buildSpellMenuModel(
      makeState({
        players: [first, second],
        activePlayerId: null,
      }),
      { open: true, index: 0, selectedId: null },
    );

    expect(model.items.every((item) => item.availability === 'level')).toBe(
      true,
    );
    expect(
      model.items.every((item) => item.availabilityLabel === 'nivel'),
    ).toBe(true);
  });

  it('cambiar de turno con N recalcula la disponibilidad del nuevo activo', () => {
    const first = mage({ id: 'player-1', magicLevel: 0 });
    const second = mage({ id: 'player-2', magicLevel: 1, mana: 4 });
    const state = makeState({
      players: [first, second],
      enemies: [],
      activePlayerId: 'player-1',
    });
    const selection = { open: true, index: 0, selectedId: null } as const;

    const before = buildSpellMenuModel(state, selection);
    expect(before.items.every((item) => item.availability === 'level')).toBe(
      true,
    );

    const endTurn = translateKey({ key: 'n' }, state, { x: 4, y: 4 });
    if (endTurn.type !== 'command') {
      throw new Error(`N no produjo un comando: ${endTurn.type}`);
    }
    const next = reduce(state, endTurn.command).state;
    expect(next.activePlayerId).toBe('player-2');

    const after = buildSpellMenuModel(next, selection);
    expect(after.items.map((item) => item.availability)).toEqual(
      availabilityFor(second),
    );

    const backTurn = translateKey({ key: 'n' }, next, { x: 4, y: 4 });
    if (backTurn.type !== 'command') {
      throw new Error(`N no produjo un comando: ${backTurn.type}`);
    }
    const back = reduce(next, backTurn.command).state;
    expect(back.activePlayerId).toBe('player-1');
    expect(
      buildSpellMenuModel(back, selection).items.map(
        (item) => item.availability,
      ),
    ).toEqual(availabilityFor(first));
  });

  it('navega con vuelta circular y localiza el índice', () => {
    expect(moveSpellSelection(0, -1, 6)).toBe(5);
    expect(moveSpellSelection(5, 1, 6)).toBe(0);
    expect(moveSpellSelection(1, 1, 6)).toBe(2);
    expect(spellIndex('healing-3')).toBe(4);
    expect(spellIndex(null)).toBe(-1);
  });
});
