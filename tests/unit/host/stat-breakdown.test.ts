import { describe, expect, it } from 'vitest';
import {
  ITEMS,
  effectiveStats,
  emptyEquipment,
  itemInstance,
  synchronizeUnitResources,
  type Unit,
} from '../../../src/game/index';
import { makeUnit } from '../game/helpers';
import { statBreakdown } from '../../../src/host/stat-breakdown';

function unitWith(
  slots: Partial<Record<keyof ReturnType<typeof emptyEquipment>, string>>,
  options: Partial<Parameters<typeof makeUnit>[0]> = {},
): Unit {
  const equipment = { ...emptyEquipment() };
  for (const [slot, itemId] of Object.entries(slots)) {
    if (itemId !== undefined) {
      equipment[slot as keyof typeof equipment] = itemInstance(
        `item-${slot}`,
        itemId as Parameters<typeof itemInstance>[1],
      );
    }
  }
  return synchronizeUnitResources(
    makeUnit({
      id: 'player-1',
      faction: 'player',
      x: 4,
      y: 4,
      equipmentSlots: equipment,
      ...options,
    }),
  );
}

describe('desglose de stats del portador', () => {
  it('separa inherente, equipo y traits y copia el total del motor', () => {
    const unit = unitWith(
      {
        weapon: 'circular-mace',
        ring: 'lifesteal-ring',
        neck: 'mana-necklace',
        hands: 'action-gloves',
      },
      { hp: 10, maxHp: 20 },
    );
    const rows = statBreakdown(unit);
    const profile = effectiveStats(unit);

    expect(rows.map((row) => row.id)).toEqual([
      'habilidad',
      'fuerza',
      'defensa',
      'punteria',
      'resistencia',
      'magia',
      'pvMax',
      'mpMax',
      'acciones',
    ]);
    expect(rows.find((row) => row.id === 'mpMax')).toMatchObject({
      inherent: '6',
      equipment: '+0',
      traits: '+2',
      total: '8',
    });
    expect(rows.find((row) => row.id === 'acciones')).toMatchObject({
      inherent: '2',
      equipment: '+0',
      traits: '+1',
      total: '3',
    });
    expect(rows.find((row) => row.id === 'habilidad')?.total).toBe(
      String(profile.stats.habilidad),
    );
    expect(rows.find((row) => row.id === 'pvMax')?.total).toBe(
      String(profile.maxHp),
    );
    expect(rows.find((row) => row.id === 'mpMax')?.total).toBe(
      String(profile.maxMp),
    );
    expect(rows.find((row) => row.id === 'acciones')?.total).toBe(
      String(profile.actionsMax),
    );
  });

  it('incluye los modificadores de objeto en la columna de equipo', () => {
    const armor = ITEMS.armor as unknown as {
      modifiers: Record<string, number>;
    };
    const original = armor.modifiers;
    try {
      armor.modifiers = { defensa: 2 };
      const unit = unitWith({ armor: 'armor' });
      const row = statBreakdown(unit).find((entry) => entry.id === 'defensa');
      expect(row).toMatchObject({
        inherent: '1',
        equipment: '+2',
        traits: '+0',
        total: '3',
      });
    } finally {
      armor.modifiers = original;
    }
  });

  it('marca el recorte del tope de acciones sin ocultar las fuentes', () => {
    const unit = unitWith(
      { hands: 'action-gloves' },
      { stats: { acciones: 4 } },
    );
    const row = statBreakdown(unit).find((entry) => entry.id === 'acciones');
    expect(row).toMatchObject({
      inherent: '4',
      equipment: '+0',
      traits: '+1',
      total: '4',
    });
    expect(row?.note).toContain('recortado');
  });
});
