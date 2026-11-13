import { describe, expect, it } from 'vitest';
import type { UnitStats } from '../../../src/game/index';
import { makeUnit } from './helpers';

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
