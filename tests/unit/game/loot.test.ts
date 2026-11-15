import { describe, expect, it } from 'vitest';
import {
  EQUIPMENT_SLOTS,
  ITEMS,
  LOOT_CHANCES,
  createInitialState,
  createInventory,
  createRng,
  deriveLootRng,
  equipmentFromLegacy,
  inventoryFromIds,
  itemInstance,
  normalizeSeed,
  rollEnemyLoot,
  rollPercent,
  validateItemCatalog,
  type EquipmentSlots,
  type ItemDefinition,
  type LootPolicy,
  type RngState,
} from '../../../src/game/index';

/** Enemigo con un solo objeto común para medir la tirada. */
function oneItem(owner: string): EquipmentSlots {
  return equipmentFromLegacy(owner, {
    weaponId: 'sword',
    armorId: null,
    shieldId: null,
  });
}

/** Enemigo con espada y escudo: dos objetos del mismo portador. */
function twoItems(owner: string): EquipmentSlots {
  return equipmentFromLegacy(owner, {
    weaponId: 'sword',
    armorId: null,
    shieldId: 'shield',
  });
}

function marks(equipment: EquipmentSlots): readonly (boolean | null)[] {
  return EQUIPMENT_SLOTS.map((slot) => equipment[slot]?.lootable ?? null);
}

/** Semilla cuya primera tirada de botín cumple el predicado. */
function seedWithRoll(identity: string, predicate: (value: number) => boolean): number {
  for (let seed = 1; seed <= 500; seed += 1) {
    if (predicate(rollPercent(deriveLootRng(seed, identity)).value)) return seed;
  }
  throw new Error('No se encontró semilla con la tirada pedida');
}

const PROGRESSION_CATALOG: Readonly<Record<string, ItemDefinition>> = {
  ...ITEMS,
  sword: { ...ITEMS.sword, lootPolicy: 'progression' },
};

describe('RNG de botín derivado (REQ-034 R-012, T-002)', () => {
  it('la misma semilla e identidad dan el mismo estado de RNG', () => {
    expect(deriveLootRng(279837264, 'enemy-1')).toEqual(
      deriveLootRng(279837264, 'enemy-1'),
    );
    expect(deriveLootRng(279837264, 'enemy-1')).not.toEqual(
      deriveLootRng(279837264, 'enemy-2'),
    );
    expect(deriveLootRng(279837264, 'enemy-1')).not.toEqual(
      deriveLootRng(279837265, 'enemy-1'),
    );
    expect(deriveLootRng(4294967297, 'enemy-1').seed).toBe(normalizeSeed(4294967297));
  });

  it('rollPercent devuelve 0..99 y avanza el contador sin mutar la entrada', () => {
    const start: RngState = deriveLootRng(1017, 'enemy-1');
    const first = rollPercent(start);

    expect(first.value).toBeGreaterThanOrEqual(0);
    expect(first.value).toBeLessThan(100);
    expect(first.rng).not.toEqual(start);
    expect(start.state).toBe(deriveLootRng(1017, 'enemy-1').state);
    expect(rollPercent(start).value).toBe(first.value);
  });

  it('crear enemigos no consume ni altera el RNG principal', () => {
    const seed = 279837264;
    const state = createInitialState({ seed });

    expect(state.rng).toEqual(createRng(seed));
    expect(state.rng.state).toBe(0);

    let main = createRng(seed);
    let fromState = state.rng;
    for (let roll = 0; roll < 5; roll += 1) {
      const expected = rollPercent(main);
      const actual = rollPercent(fromState);
      expect(actual.value).toBe(expected.value);
      main = expected.rng;
      fromState = actual.rng;
    }
  });
});

describe('tirada por instancia del enemigo (REQ-034 R-002/R-003/T-003)', () => {
  it('la misma semilla e ID de enemigo producen las mismas marcas', () => {
    const first = rollEnemyLoot(1017, 'enemy-1', twoItems('enemy-1'), createInventory());
    const second = rollEnemyLoot(1017, 'enemy-1', twoItems('enemy-1'), createInventory());

    expect(second).toEqual(first);
    expect(marks(first.equipment)).toHaveLength(8);

    const other = rollEnemyLoot(1017, 'enemy-2', twoItems('enemy-2'), createInventory());
    expect(other).not.toEqual(first);
  });

  it('el orden de tirada de otros enemigos no altera las marcas de uno dado', () => {
    const alone = rollEnemyLoot(77, 'enemy-3', twoItems('enemy-3'), createInventory());
    rollEnemyLoot(77, 'enemy-1', twoItems('enemy-1'), createInventory());
    rollEnemyLoot(77, 'enemy-2', twoItems('enemy-2'), createInventory());
    const after = rollEnemyLoot(77, 'enemy-3', twoItems('enemy-3'), createInventory());

    expect(after).toEqual(alone);
  });

  it('dos objetos del mismo enemigo pueden caer de forma distinta', () => {
    const found = Array.from({ length: 200 }, (_, index) => index + 1).some((seed) => {
      const rolled = rollEnemyLoot(seed, 'enemy-1', twoItems('enemy-1'), createInventory());
      return rolled.equipment.weapon?.lootable !== rolled.equipment.shield?.lootable;
    });

    expect(found).toBe(true);
  });

  it('un objeto común cae en torno al 25 % de las semillas', () => {
    const total = 400;
    let lootable = 0;
    for (let seed = 1; seed <= total; seed += 1) {
      const rolled = rollEnemyLoot(seed, 'enemy-1', oneItem('enemy-1'), createInventory());
      if (rolled.equipment.weapon?.lootable === true) lootable += 1;
    }
    const ratio = lootable / total;

    expect(LOOT_CHANCES.common).toBe(25);
    expect(ratio).toBeGreaterThan(0.2);
    expect(ratio).toBeLessThan(0.3);
  });

  it('la mochila del enemigo también se tira en orden estable', () => {
    const rolled = rollEnemyLoot(
      1017,
      'enemy-1',
      equipmentFromLegacy('enemy-1', {
        weaponId: null,
        armorId: null,
        shieldId: null,
      }),
      inventoryFromIds('enemy-1', ['axe', 'dagger']),
    );

    expect(rolled.inventory.items).toHaveLength(8);
    expect(rolled.inventory.items[0]?.itemId).toBe('axe');
    expect(rolled.inventory.items[1]?.itemId).toBe('dagger');
    expect(typeof rolled.inventory.items[0]?.lootable).toBe('boolean');
  });
});

describe('política de botín por objeto (REQ-034 R-008, T-001, T-008)', () => {
  it('progression nace siempre saqueable, sin consumir tirada', () => {
    for (let seed = 1; seed <= 64; seed += 1) {
      const rolled = rollEnemyLoot(
        seed,
        'enemy-1',
        oneItem('enemy-1'),
        createInventory(),
        PROGRESSION_CATALOG,
      );
      expect(rolled.equipment.weapon?.lootable).toBe(true);
    }

    const identity = 'enemy-1';
    const hitSeed = seedWithRoll(identity, (value) => value < LOOT_CHANCES.common);
    const missSeed = seedWithRoll(identity, (value) => value >= LOOT_CHANCES.common);

    for (const [seed, expected] of [
      [hitSeed, true],
      [missSeed, false],
    ] as const) {
      const rolled = rollEnemyLoot(
        seed,
        identity,
        twoItems(identity),
        createInventory(),
        PROGRESSION_CATALOG,
      );
      // La espada es progression: no gasta tirada y el escudo usa la primera.
      expect(rolled.equipment.weapon?.lootable).toBe(true);
      expect(rolled.equipment.shield?.lootable).toBe(expected);

      const common = rollEnemyLoot(seed, identity, twoItems(identity), createInventory());
      expect(common.equipment.weapon?.lootable).toBe(expected);
    }
  });

  it('un catálogo con política desconocida se rechaza como dato', () => {
    const unknown = validateItemCatalog([
      { ...ITEMS.sword, lootPolicy: 'rare' as unknown as LootPolicy },
    ]);
    const missing = validateItemCatalog([
      { ...ITEMS.sword, lootPolicy: undefined as unknown as LootPolicy },
    ]);

    expect(unknown.map((issue) => issue.rule)).toContain('loot-policy');
    expect(missing.map((issue) => issue.rule)).toContain('loot-policy');
  });
});

describe('marca por defecto de las instancias nuevas (REQ-034 T-001/T-003)', () => {
  it('itemInstance nace saqueable salvo que se diga lo contrario', () => {
    expect(itemInstance('item-1', 'sword').lootable).toBe(true);
    expect(itemInstance('item-1', 'sword', false).lootable).toBe(false);
  });

  it('equipo y mochila construidos por los helpers nacen saqueables', () => {
    const equipment = twoItems('enemy-1');
    expect(marks(equipment).filter((mark) => mark !== null)).toEqual([true, true]);
    expect(
      inventoryFromIds('player-1', ['axe', 'dagger']).items
        .filter((item) => item !== null)
        .every((item) => item?.lootable === true),
    ).toBe(true);
  });
});
