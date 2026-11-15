import { describe, expect, it } from 'vitest';
import { ITEMS } from '../../../src/game/equipment';
import { ROSTER, type ArchetypeId } from '../../../src/game/roster';
import {
  ARCHETYPE_VARIANT_CELLS,
  SHEET_STAT_IDS,
  buildArchetypeSheet,
} from '../../../src/host/archetype-sheet';
import { profileRows } from '../../../src/host/damage-labels';
import { createPlayerScreen } from '../../../src/host/player-screen';

const IDS = Object.keys(ROSTER) as ArchetypeId[];

function signed(value: number): string {
  if (value > 0) return `+${String(value)}`;
  if (value < 0) return `−${String(Math.abs(value))}`;
  return '0';
}

function expectedResistance(id: ArchetypeId): string {
  return profileRows(ROSTER[id].stats.resistencia)
    .map((row) => `${row.typeLabel} ${row.icon}`)
    .join(' · ');
}

function expectedWeapon(id: ArchetypeId): string {
  const entry = ROSTER[id];
  if (entry.equipment.weaponId !== null) {
    return ITEMS[entry.equipment.weaponId].name;
  }
  return entry.futureWeapon === null ? '—' : `${entry.futureWeapon} (futura)`;
}

describe('ficha de arquetipo: nueve filas inherentes', () => {
  it('los nueve arquetipos producen las nueve filas en orden', () => {
    expect(IDS).toHaveLength(9);
    expect(SHEET_STAT_IDS).toEqual([
      'habilidad',
      'fuerza',
      'defensa',
      'resistencia',
      'punteria',
      'magia',
      'pv',
      'mp',
      'acciones',
    ]);

    for (const id of IDS) {
      const sheet = buildArchetypeSheet(id);
      expect(sheet.id).toBe(id);
      expect(sheet.name).toBe(ROSTER[id].name);
      expect(sheet.stats.map((stat) => stat.id)).toEqual(SHEET_STAT_IDS);
      expect(sheet.stats).toHaveLength(9);
    }
  });

  it('cada valor sale del roster, no de una copia en el host', () => {
    for (const id of IDS) {
      const entry = ROSTER[id];
      const values = Object.fromEntries(
        buildArchetypeSheet(id).stats.map((stat) => [stat.id, stat.value]),
      );

      expect(values.habilidad).toBe(signed(entry.stats.habilidad));
      expect(values.fuerza).toBe(signed(entry.stats.fuerza));
      expect(values.defensa).toBe(signed(entry.stats.defensa));
      expect(values.resistencia).toBe(expectedResistance(id));
      expect(values.punteria).toBe(signed(entry.stats.punteria));
      expect(values.magia).toBe(String(entry.stats.magicLevel));
      expect(values.pv).toBe(String(entry.maxHp));
      expect(values.mp).toBe(String(entry.maxMp));
      expect(values.acciones).toBe(String(entry.stats.acciones));
    }
  });

  it('usa las etiquetas legibles y el signo tipográfico', () => {
    const sheet = buildArchetypeSheet('barbarian');
    expect(sheet.stats.map((stat) => stat.label)).toEqual([
      'Habilidad',
      'Fuerza',
      'Defensa',
      'Resistencia',
      'Puntería',
      'Nivel de magia',
      'PV',
      'MP',
      'Acciones',
    ]);
    expect(sheet.stats.find((stat) => stat.id === 'defensa')?.value).toBe('−1');
    expect(sheet.stats.find((stat) => stat.id === 'fuerza')?.value).toBe('+3');
  });
});

describe('ficha de arquetipo: arma y magia', () => {
  it('muestra el arma equipada o la futura con su sufijo', () => {
    expect(buildArchetypeSheet('warrior').weapon).toBe('Espada');
    expect(buildArchetypeSheet('barbarian').weapon).toBe('Hacha');
    expect(buildArchetypeSheet('rogue').weapon).toBe('Daga');
    expect(buildArchetypeSheet('cook').weapon).toBe('Cuchillo');
    expect(buildArchetypeSheet('archer').weapon).toBe('arco (futura)');
    expect(buildArchetypeSheet('mage').weapon).toBe('bastón (futura)');
    for (const id of IDS) {
      expect(buildArchetypeSheet(id).weapon).toBe(expectedWeapon(id));
    }
  });

  it('muestra el nivel único de magia del roster', () => {
    expect(buildArchetypeSheet('mage').magicLevel).toBe(4);
    expect(buildArchetypeSheet('cleric').magicLevel).toBe(3);
    expect(buildArchetypeSheet('spellblade').magicLevel).toBe(2);
    expect(buildArchetypeSheet('cook').magicLevel).toBe(1);
    expect(buildArchetypeSheet('warrior').magicLevel).toBe(0);
    expect(buildArchetypeSheet('barbarian').magicLevel).toBe(0);
    expect(buildArchetypeSheet('rogue').magicLevel).toBe(0);
    expect(buildArchetypeSheet('archer').magicLevel).toBe(0);
    expect(buildArchetypeSheet('farmer').magicLevel).toBe(0);
  });
});

describe('ficha de arquetipo: miniaturas', () => {
  it('cada ficha trae dos variantes de 32×32 con nombre accesible sin género', () => {
    for (const id of IDS) {
      const sheet = buildArchetypeSheet(id);
      expect(sheet.variants).toHaveLength(2);
      for (const [offset, variant] of sheet.variants.entries()) {
        expect(variant.variant).toBe(offset + 1);
        expect(variant.rect.sw).toBe(32);
        expect(variant.rect.sh).toBe(32);
        expect(variant.accessibleName).toBe(
          `${ROSTER[id].name}, variante ${offset + 1}`,
        );
        expect(variant.accessibleName).not.toMatch(
          /caballer|maga|sacerdote|esgrimidor|herrera|hechicera/i,
        );
      }
    }
  });

  it('las 18 celdas coinciden con la tabla de REQ-016 y caben en la rejilla', () => {
    const expected: Record<ArchetypeId, readonly [number, number, number, number]> = {
      warrior: [0, 32, 64, 32],
      barbarian: [0, 96, 160, 96],
      rogue: [96, 0, 128, 0],
      archer: [64, 0, 32, 0],
      mage: [32, 128, 0, 128],
      cleric: [96, 64, 32, 64],
      spellblade: [96, 96, 128, 96],
      cook: [96, 160, 128, 160],
      farmer: [0, 160, 0, 192],
    };

    let cells = 0;
    for (const id of IDS) {
      const [first, second] = ARCHETYPE_VARIANT_CELLS[id];
      expect([first.sx, first.sy, second.sx, second.sy]).toEqual(expected[id]);
      for (const rect of [first, second]) {
        expect(rect.sw).toBe(32);
        expect(rect.sh).toBe(32);
        expect(rect.sx % 32).toBe(0);
        expect(rect.sy % 32).toBe(0);
        expect(rect.sx).toBeGreaterThanOrEqual(0);
        expect(rect.sy).toBeGreaterThanOrEqual(0);
        expect(rect.sx).toBeLessThanOrEqual(192);
        expect(rect.sy).toBeLessThanOrEqual(192);
        cells += 1;
      }
      // La ficha consume la misma tabla que publica el modelo.
      expect(buildArchetypeSheet(id).variants.map((variant) => variant.rect)).toEqual(
        [first, second],
      );
    }
    expect(cells).toBe(18);
  });
});

describe('ficha de arquetipo: cambio de arquetipo', () => {
  it('vuelve la variante a 1 y la ficha coincide con el nuevo roster', () => {
    const screen = createPlayerScreen({ playerCount: 1, seed: 7 });
    screen.setArchetype('mage');
    screen.setVariant(2);
    expect(screen.state().players[0]).toMatchObject({
      archetypeId: 'mage',
      variant: 2,
    });

    screen.setArchetype('rogue');
    const draft = screen.state().players[0];
    expect(draft).toMatchObject({ archetypeId: 'rogue', variant: 1 });

    const sheet = buildArchetypeSheet(draft.archetypeId);
    expect(sheet.name).toBe(ROSTER.rogue.name);
    expect(sheet.weapon).toBe(expectedWeapon('rogue'));
    expect(sheet.magicLevel).toBe(ROSTER.rogue.stats.magicLevel);
    expect(sheet.stats.map((stat) => stat.value)).toEqual([
      signed(ROSTER.rogue.stats.habilidad),
      signed(ROSTER.rogue.stats.fuerza),
      signed(ROSTER.rogue.stats.defensa),
      expectedResistance('rogue'),
      signed(ROSTER.rogue.stats.punteria),
      String(ROSTER.rogue.stats.magicLevel),
      String(ROSTER.rogue.maxHp),
      String(ROSTER.rogue.maxMp),
      String(ROSTER.rogue.stats.acciones),
    ]);
  });
});
