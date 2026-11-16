import { describe, expect, it } from 'vitest';
import {
  ITEMS,
  TRAITS,
  powerScore,
  validateTraitCatalog,
  type ItemDefinition,
  type ItemId,
} from '../../../src/game/index';

/**
 * Valores provisionales de ADR-033 § valores provisionales para el poder de
 * cada trait del catálogo. Un cambio de balance debe actualizar esta tabla y el
 * ADR, no el motor.
 */
const TRAIT_POWER: Readonly<Record<string, number>> = {
  precise: 3,
  strong: 3,
  guarded: 3,
  'tough-skin': 3,
  'sharp-eye': 3,
  arcane: 3,
  vitality: 2,
  'mana-surge': 2,
  'action-surge': 6,
  frail: -3,
  slow: -6,
  'mana-drain': -2,
  brittle: -3,
  lifesteal: 5,
  'lifesteal-minor': 3,
  'circular-strike': 5,
  'wide-circular-strike': 8,
};

/**
 * Tabla de puntuación de los objetos del catálogo con la fórmula de ADR-033:
 * acierto + daño total + absorción + evasión + Σ poder de traits.
 */
const ITEM_POWER: Readonly<Record<ItemId, number>> = {
  sword: 6,
  axe: 7,
  dagger: 6,
  knife: 5,
  hammer: 6,
  'electric-sword': 7,
  'arcane-dagger': 7,
  armor: 1,
  plate: 2,
  shield: 1,
  'lifesteal-ring': 5,
  'mana-necklace': 2,
  'action-gloves': 6,
  'circular-mace': 10,
};

function cursedSword(): ItemDefinition {
  return {
    ...ITEMS.sword,
    id: 'cursed-sword' as ItemId,
    traits: [
      { id: 'frail', description: TRAITS.frail.description },
      { id: 'slow', description: TRAITS.slow.description },
    ],
  };
}

describe('poder declarado por trait (REQ-020 T-002, ADR-033)', () => {
  it('declara un poder entero con signo en todos los traits del catálogo', () => {
    expect(Object.keys(TRAITS)).toEqual(Object.keys(TRAIT_POWER));
    for (const [id, expected] of Object.entries(TRAIT_POWER)) {
      expect(TRAITS[id].poder, id).toBe(expected);
      expect(Number.isInteger(TRAITS[id].poder), id).toBe(true);
    }
    expect(validateTraitCatalog(TRAITS)).toEqual([]);
  });

  it('resta con los cuatro traits negativos', () => {
    for (const id of ['frail', 'slow', 'mana-drain', 'brittle'] as const) {
      expect(TRAITS[id].poder, id).toBeLessThan(0);
    }
    expect(TRAITS.frail.poder).toBe(-3);
    expect(TRAITS.slow.poder).toBe(-6);
    expect(TRAITS['mana-drain'].poder).toBe(-2);
    expect(TRAITS.brittle.poder).toBe(-3);
  });

  it('rechaza un trait sin poder o con poder no entero', () => {
    const sinPoder = { ...TRAITS.precise } as Record<string, unknown>;
    delete sinPoder.poder;
    expect(
      validateTraitCatalog({ precise: sinPoder as unknown as typeof TRAITS.precise }).map(
        (issue) => issue.rule,
      ),
    ).toContain('power');

    const fraccionario = { ...TRAITS.precise, poder: 1.5 };
    expect(validateTraitCatalog({ precise: fraccionario }).map((issue) => issue.rule)).toContain(
      'power',
    );
  });
});

describe('powerScore (REQ-020 T-003, ADR-033)', () => {
  it('puntúa de forma estable todos los objetos del catálogo', () => {
    expect(Object.keys(ITEMS)).toEqual(Object.keys(ITEM_POWER));
    for (const [id, item] of Object.entries(ITEMS)) {
      expect(powerScore(item), id).toBe(ITEM_POWER[id as ItemId]);
    }
  });

  it('es pura: dos llamadas dan el mismo número y no mutan el objeto', () => {
    for (const item of Object.values(ITEMS)) {
      const before = JSON.stringify(item);
      expect(powerScore(item), item.id).toBe(powerScore(item));
      expect(JSON.stringify(item), item.id).toBe(before);
    }
  });

  it('suma acierto, daño, absorción y evasión sin estado de partida', () => {
    expect(powerScore(ITEMS.sword)).toBe(3 + 3);
    expect(powerScore(ITEMS['electric-sword'])).toBe(3 + 3 + 1);
    expect(powerScore(ITEMS.plate)).toBe(2);
    expect(powerScore(ITEMS.shield)).toBe(1);
    expect(powerScore(ITEMS['circular-mace'])).toBe(2 + 3 + 5);
  });

  it('los malditos restan y pueden quedar por debajo de su base', () => {
    const cursed = cursedSword();
    expect(powerScore(cursed)).toBe(powerScore(ITEMS.sword) - 3 - 6);
    expect(powerScore(cursed)).toBeLessThan(powerScore(ITEMS.sword));
  });
});
