import { describe, expect, it } from 'vitest';
import {
  ITEMS,
  aggregateEffectiveStats,
  effectiveStats,
  equipmentFromLegacy,
  type ItemDefinition,
  type UnitStats,
} from '../../../src/game/index';
import { makeUnit } from './helpers';

const BASE: UnitStats = {
  habilidad: 1,
  fuerza: 1,
  defensa: 1,
  resistencia: {},
  punteria: 0,
  magicLevel: 0,
  acciones: 2,
};

describe('estado de atributos', () => {
  it('serializa los atributos inherentes, incluidas las acciones, y el nivel de magia 0–4', () => {
    const stats: UnitStats = {
      habilidad: 2,
      fuerza: 3,
      defensa: 1,
      resistencia: { electric: 'resistant' },
      punteria: 5,
      magicLevel: 4,
      acciones: 2,
    };
    const unit = makeUnit({
      id: 'player-1',
      faction: 'player',
      x: 5,
      y: 5,
      stats,
      hp: 6,
      maxHp: 6,
      mp: 8,
      maxMp: 8,
      mana: { current: 4, max: 16 },
    });

    const roundTrip = JSON.parse(JSON.stringify(unit.stats)) as UnitStats;

    expect(roundTrip).toEqual(stats);
    expect(Number.isInteger(roundTrip.magicLevel)).toBe(true);
    expect(roundTrip.magicLevel).toBeGreaterThanOrEqual(0);
    expect(roundTrip.magicLevel).toBeLessThanOrEqual(4);

    expect(unit.hp).toBe(6);
    expect(unit.maxHp).toBe(6);
    expect(unit.mp).toBe(8);
    expect(unit.maxMp).toBe(8);
    expect(unit.mana).toEqual({ current: 4, max: 16 });
    expect(unit.mana.current).toBeLessThanOrEqual(unit.mana.max);
  });
});

describe('agregación única de stats efectivos (REQ-018 T-004)', () => {
  it('suma modificadores sintéticos sobre los atributos inherentes', () => {
    const synthetic: ItemDefinition = {
      ...ITEMS.armor,
      id: 'synthetic-armor' as ItemDefinition['id'],
      modifiers: { habilidad: 1, fuerza: 2, defensa: -1, punteria: 3, acciones: 1 },
    };

    const profile = aggregateEffectiveStats(BASE, [synthetic]);

    expect(profile.stats).toEqual({
      ...BASE,
      habilidad: 2,
      fuerza: 3,
      defensa: 0,
      punteria: 3,
      acciones: 3,
    });
    expect(profile.actionsBonus).toBe(1);
  });

  it('agrega acierto del arma, evasión del escudo y absorción de la armadura', () => {
    const profile = aggregateEffectiveStats(BASE, [
      ITEMS.sword,
      ITEMS.shield,
      ITEMS.armor,
    ]);

    expect(profile.accuracy).toBe(ITEMS.sword.accuracy);
    expect(profile.evasion).toBe(ITEMS.shield.evasion);
    expect(profile.absorption).toBe(ITEMS.armor.absorption);
    expect(profile.damagePackets).toEqual(ITEMS.sword.damagePackets);
  });

  it('deriva el perfil de una unidad desde sus ocho huecos', () => {
    const unit = makeUnit({
      id: 'player-1',
      faction: 'player',
      x: 4,
      y: 4,
      equipmentSlots: equipmentFromLegacy('player-1', {
        weaponId: 'axe',
        armorId: 'plate',
        shieldId: 'shield',
      }),
    });

    const profile = effectiveStats(unit);

    expect(profile.weapon?.id).toBe('axe');
    expect(profile.shield?.id).toBe('shield');
    expect(profile.armor?.id).toBe('plate');
    expect(profile.accuracy).toBe(ITEMS.axe.accuracy);
    expect(profile.evasion).toBe(ITEMS.shield.evasion);
    expect(profile.absorption).toBe(ITEMS.plate.absorption);
  });
});
