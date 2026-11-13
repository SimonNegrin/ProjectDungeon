import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  ARMORS,
  EQUIPMENT_SLOTS,
  ITEMS,
  ITEM_SHEET,
  SHIELDS,
  WEAPONS,
  armorValue,
  shieldValue,
  validateDamagePackets,
  validateItemCatalog,
  weaponDamage,
  weaponFor,
  type ItemDefinition,
  type ItemSpriteRect,
} from '../../../src/game/index';

const ITEM_IDS = [
  'sword',
  'axe',
  'dagger',
  'knife',
  'hammer',
  'electric-sword',
  'arcane-dagger',
  'armor',
  'plate',
  'shield',
] as const;

const WEAPON_IDS = [
  'sword',
  'axe',
  'dagger',
  'knife',
  'hammer',
  'electric-sword',
  'arcane-dagger',
] as const;

const itemsTxtPath = fileURLToPath(
  new URL('../../../public/assets/32rogues/items.txt', import.meta.url),
);
const itemsPngPath = fileURLToPath(
  new URL('../../../public/assets/32rogues/items.png', import.meta.url),
);

function readPngSize(path: string): { width: number; height: number } {
  const buffer = readFileSync(path);
  expect(buffer.subarray(0, 8).toString('hex')).toBe('89504e470d0a1a0a');
  return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
}

function readItemCells(): ReadonlyMap<string, ItemSpriteRect> {
  const cells = new Map<string, ItemSpriteRect>();
  for (const rawLine of readFileSync(itemsTxtPath, 'utf8').split(/\r?\n/)) {
    const line = rawLine.trim();
    const match = /^(\d+)\.([a-z])\.\s+(.+)$/.exec(line);
    if (match === null) continue;
    const row = Number(match[1]);
    const column = match[2];
    cells.set(line, {
      x: (column.charCodeAt(0) - 'a'.charCodeAt(0)) * ITEM_SHEET.cell,
      y: (row - 1) * ITEM_SHEET.cell,
      width: ITEM_SHEET.cell,
      height: ITEM_SHEET.cell,
    });
  }
  return cells;
}

/** Variante del catálogo para probar reglas de validación. */
function mutant(overrides: Partial<ItemDefinition>): ItemDefinition {
  return { ...ITEMS.sword, ...overrides };
}

function rulesFor(items: readonly ItemDefinition[]): readonly string[] {
  return validateItemCatalog(items).map((issue) => issue.rule);
}

describe('catálogo de objetos (REQ-018 T-001, REQ-029 T-002)', () => {
  it('conserva los diez IDs actuales como fuente única', () => {
    expect(Object.keys(ITEMS)).toEqual([...ITEM_IDS]);
    for (const [key, item] of Object.entries(ITEMS)) {
      expect(item.id, key).toBe(key);
      expect(item.name.length, key).toBeGreaterThan(0);
      expect(item.description.length, key).toBeGreaterThan(0);
      expect(item.traits, key).toEqual([]);
      expect(item.modifiers, key).toEqual({});
      expect(ITEM_SHEET.id, key).toBe(item.sprite.sheet);
    }
  });

  it('valida el catálogo completo sin incidencias', () => {
    expect(validateItemCatalog(Object.values(ITEMS))).toEqual([]);
  });

  it('rechaza IDs repetidos', () => {
    expect(rulesFor([ITEMS.sword, { ...ITEMS.sword, name: 'Espada 2' }])).toContain(
      'duplicate-id',
    );
  });

  it('exige categoría y hueco coherentes y deja vacíos los cinco huecos secundarios', () => {
    expect(EQUIPMENT_SLOTS).toEqual([
      'weapon',
      'shield',
      'armor',
      'head',
      'feet',
      'hands',
      'neck',
      'ring',
    ]);
    expect(new Set(EQUIPMENT_SLOTS).size).toBe(8);
    expect(rulesFor([{ ...ITEMS.armor, slot: 'weapon' }])).toContain('category-slot');

    const occupied = new Set(Object.values(ITEMS).map((item) => item.slot));
    expect(occupied).toEqual(new Set(['weapon', 'shield', 'armor']));
    for (const emptySlot of ['head', 'feet', 'hands', 'neck', 'ring'] as const) {
      expect(occupied.has(emptySlot), emptySlot).toBe(false);
    }
  });

  it('declara una mano en las siete armas actuales y admite dos manos en test', () => {
    for (const id of WEAPON_IDS) {
      expect(ITEMS[id].category, id).toBe('weapon');
      expect(ITEMS[id].slot, id).toBe('weapon');
      expect(ITEMS[id].hands, id).toBe(1);
    }
    for (const id of ['armor', 'plate', 'shield'] as const) {
      expect(ITEMS[id].hands, id).toBeUndefined();
    }

    const twoHanded = mutant({ hands: 2 });
    expect(twoHanded.hands).toBe(2);
    expect(validateItemCatalog([twoHanded])).toEqual([]);
    expect(rulesFor([mutant({ hands: 3 as unknown as 1 })])).toContain('hands');
  });

  it('mantiene los paquetes de daño de REQ-029 y rechaza los inválidos', () => {
    expect(ITEMS.sword.damagePackets).toEqual([{ type: 'slash', amount: 3 }]);
    expect(ITEMS.axe.damagePackets).toEqual([{ type: 'slash', amount: 5 }]);
    expect(ITEMS.dagger.damagePackets).toEqual([{ type: 'pierce', amount: 2 }]);
    expect(ITEMS.knife.damagePackets).toEqual([{ type: 'pierce', amount: 1 }]);
    expect(ITEMS.hammer.damagePackets).toEqual([{ type: 'blunt', amount: 4 }]);
    expect(ITEMS['electric-sword'].damagePackets).toEqual([
      { type: 'slash', amount: 3 },
      { type: 'electric', amount: 1 },
    ]);
    expect(ITEMS['arcane-dagger'].damagePackets).toEqual([
      { type: 'pierce', amount: 2 },
      { type: 'magic', amount: 1 },
    ]);
    for (const id of ['armor', 'plate', 'shield'] as const) {
      expect(ITEMS[id].damagePackets, id).toEqual([]);
    }

    const twoPhysical = mutant({
      damagePackets: [
        { type: 'slash', amount: 1 },
        { type: 'pierce', amount: 1 },
      ],
    });
    const twoElemental = mutant({
      damagePackets: [
        { type: 'magic', amount: 1 },
        { type: 'electric', amount: 1 },
      ],
    });
    const threePackets = mutant({
      damagePackets: [
        { type: 'slash', amount: 1 },
        { type: 'electric', amount: 1 },
        { type: 'magic', amount: 1 },
      ],
    });
    expect(validateDamagePackets(twoPhysical.damagePackets)).toBe(false);
    expect(validateDamagePackets(twoElemental.damagePackets)).toBe(false);
    expect(validateDamagePackets(threePackets.damagePackets)).toBe(false);
    expect(rulesFor([twoPhysical])).toContain('damage-packets');
    expect(rulesFor([twoElemental])).toContain('damage-packets');
    expect(rulesFor([threePackets])).toContain('damage-packets');
  });

  it('conserva acierto, absorción y evasión de las piezas actuales', () => {
    const accuracy: Readonly<Record<(typeof WEAPON_IDS)[number], number>> = {
      sword: 3,
      axe: 2,
      dagger: 4,
      knife: 4,
      hammer: 2,
      'electric-sword': 3,
      'arcane-dagger': 4,
    };
    for (const id of WEAPON_IDS) {
      expect(ITEMS[id].accuracy, id).toBe(accuracy[id]);
      expect(WEAPONS[id].accuracy, id).toBe(accuracy[id]);
    }
    expect(ITEMS.armor.absorption).toBe(1);
    expect(ITEMS.plate.absorption).toBe(2);
    expect(armorValue('armor')).toBe(1);
    expect(armorValue('plate')).toBe(2);
    expect(ITEMS.shield.evasion).toBe(1);
    expect(shieldValue('shield')).toBe(1);
    expect(weaponDamage(WEAPONS.sword)).toBe(3);
    expect(weaponDamage(WEAPONS['electric-sword'])).toBe(4);
  });

  it('deriva las vistas de REQ-010 del catálogo', () => {
    expect(Object.keys(WEAPONS)).toEqual([...WEAPON_IDS]);
    expect(Object.keys(ARMORS)).toEqual(['armor', 'plate']);
    expect(Object.keys(SHIELDS)).toEqual(['shield']);
    for (const id of WEAPON_IDS) {
      expect(WEAPONS[id]).toMatchObject({
        id,
        name: ITEMS[id].name,
        accuracy: ITEMS[id].accuracy,
        damagePackets: ITEMS[id].damagePackets,
      });
      expect(WEAPONS[id].estimatedV1, id).toBe(ITEMS[id].estimatedV1);
    }
    expect(weaponFor('sword')).toBe(WEAPONS.sword);
    expect(ARMORS.armor).toEqual({ id: 'armor', name: 'Armadura', armor: 1 });
    expect(ARMORS.plate).toEqual({ id: 'plate', name: 'Coraza', armor: 2 });
    expect(SHIELDS.shield).toEqual({ id: 'shield', name: 'Escudo', defense: 1 });
  });

  it('usa los sprites acordados y todos los recortes caen dentro de la hoja', () => {
    expect(ITEMS.sword.sprite.label).toBe('1.d. long sword');
    expect(ITEMS.shield.sprite.label).toBe('12.a. buckler');
    expect(ITEMS.armor.sprite.label).toBe('13.e. scale mail');

    const cells = readItemCells();
    const png = readPngSize(itemsPngPath);
    expect(png).toEqual({ width: ITEM_SHEET.width, height: ITEM_SHEET.height });

    for (const item of Object.values(ITEMS)) {
      const cell = cells.get(item.sprite.label);
      expect(cell, `${item.id}: ${item.sprite.label}`).toBeDefined();
      expect(item.sprite.rect, item.id).toEqual(cell);
      expect(item.sprite.rect.width, item.id).toBe(ITEM_SHEET.cell);
      expect(item.sprite.rect.height, item.id).toBe(ITEM_SHEET.cell);
      expect(item.sprite.rect.x, item.id).toBeGreaterThanOrEqual(0);
      expect(item.sprite.rect.y, item.id).toBeGreaterThanOrEqual(0);
      expect(item.sprite.rect.x + item.sprite.rect.width, item.id).toBeLessThanOrEqual(
        ITEM_SHEET.width,
      );
      expect(item.sprite.rect.y + item.sprite.rect.height, item.id).toBeLessThanOrEqual(
        ITEM_SHEET.height,
      );
    }
  });

  it('rechaza recortes incoherentes con la etiqueta o fuera de la hoja', () => {
    const mismatched = mutant({
      sprite: {
        sheet: 'items',
        label: '1.d. long sword',
        rect: { x: 128, y: 0, width: 32, height: 32 },
      },
    });
    const outOfBounds = mutant({
      sprite: {
        sheet: 'items',
        label: '99.a. fuera de hoja',
        rect: { x: 0, y: 0, width: 32, height: 32 },
      },
    });
    expect(rulesFor([mismatched])).toContain('sprite');
    expect(rulesFor([outOfBounds])).toContain('sprite');
  });

  it('deja traits vacío y rechaza traits con contenido en este corte', () => {
    for (const id of ITEM_IDS) {
      expect(ITEMS[id].traits, id).toEqual([]);
    }
    expect(
      rulesFor([mutant({ traits: [{ id: 'fuego', description: 'Trait futuro' }] })]),
    ).toContain('traits');
  });
});
