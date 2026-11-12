import { describe, expect, it } from 'vitest';
import type { MagicSchool, UnitStats } from '../../../src/game/index';
import { makeUnit } from './helpers';

describe('estado de atributos', () => {
  it('serializa los atributos inherentes, incluidas las acciones, y una magia multi-familia de nivel 1–4', () => {
    const magia: readonly MagicSchool[] = [
      { familia: 'fuego', nivel: 1 },
      { familia: 'hielo', nivel: 2 },
      { familia: 'veneno', nivel: 3 },
      { familia: 'rayo', nivel: 4 },
    ];
    const stats: UnitStats = {
      habilidad: 2,
      fuerza: 3,
      defensa: 1,
      resistencia: 4,
      punteria: 5,
      magia,
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
    });

    const roundTrip = JSON.parse(JSON.stringify(unit.stats)) as UnitStats;

    expect(roundTrip).toEqual(stats);
    expect(roundTrip.magia).toHaveLength(4);
    for (const family of roundTrip.magia) {
      expect(family.nivel).toBeGreaterThanOrEqual(1);
      expect(family.nivel).toBeLessThanOrEqual(4);
      expect(JSON.parse(JSON.stringify(family))).toEqual(family);
    }

    expect(unit.hp).toBe(6);
    expect(unit.maxHp).toBe(6);
    expect(unit.mp).toBe(8);
    expect(unit.maxMp).toBe(8);
  });
});
