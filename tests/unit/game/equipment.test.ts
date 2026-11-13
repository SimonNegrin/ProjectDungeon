import { describe, expect, it } from 'vitest';
import {
  WEAPONS,
  validateDamagePackets,
  weaponDamage,
} from '../../../src/game/index';

describe('armas nuevas de REQ-029 § contenido estimado v1', () => {
  it('el martillo declara acierto +2 y contundente 4', () => {
    expect(WEAPONS.hammer).toEqual({
      id: 'hammer',
      name: 'Martillo',
      accuracy: 2,
      damagePackets: [{ type: 'blunt', amount: 4 }],
      estimatedV1: true,
    });
    expect(weaponDamage(WEAPONS.hammer)).toBe(4);
  });

  it('la espada electrizada declara acierto +3, filo 3 y eléctrico 1', () => {
    expect(WEAPONS['electric-sword']).toEqual({
      id: 'electric-sword',
      name: 'Espada electrizada',
      accuracy: 3,
      damagePackets: [
        { type: 'slash', amount: 3 },
        { type: 'electric', amount: 1 },
      ],
      estimatedV1: true,
    });
  });

  it('la daga arcana declara acierto +4, punzante 2 y mágico 1', () => {
    expect(WEAPONS['arcane-dagger']).toEqual({
      id: 'arcane-dagger',
      name: 'Daga arcana',
      accuracy: 4,
      damagePackets: [
        { type: 'pierce', amount: 2 },
        { type: 'magic', amount: 1 },
      ],
      estimatedV1: true,
    });
  });

  it('las tres pasan la validación del catálogo', () => {
    for (const weapon of [
      WEAPONS.hammer,
      WEAPONS['electric-sword'],
      WEAPONS['arcane-dagger'],
    ]) {
      expect(validateDamagePackets(weapon.damagePackets), weapon.id).toBe(true);
    }
  });

  it('las armas existentes conservan sus valores y no se marcan estimadas', () => {
    expect(WEAPONS.sword).toMatchObject({
      accuracy: 3,
      damagePackets: [{ type: 'slash', amount: 3 }],
    });
    expect(WEAPONS.axe).toMatchObject({
      accuracy: 2,
      damagePackets: [{ type: 'slash', amount: 5 }],
    });
    expect(WEAPONS.dagger).toMatchObject({
      accuracy: 4,
      damagePackets: [{ type: 'pierce', amount: 2 }],
    });
    expect(WEAPONS.knife).toMatchObject({
      accuracy: 4,
      damagePackets: [{ type: 'pierce', amount: 1 }],
    });
    for (const id of ['sword', 'axe', 'dagger', 'knife'] as const) {
      expect(WEAPONS[id].estimatedV1, id).toBeUndefined();
    }
  });
});
