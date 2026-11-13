import { describe, expect, it } from 'vitest';
import {
  ITEMS,
  createInventory,
  equipmentFromLegacy,
  equipItem,
  allInstances,
  inventoryFromIds,
  locateInstance,
  reduce,
  type Container,
  type EquipmentSlots,
  type GameState,
  type ItemDefinition,
  type ItemId,
} from '../../../src/game/index';
import { makeState, makeUnit } from './helpers';

function slots(
  owner: string,
  weaponId: ItemId | null = 'sword',
  armorId: ItemId | null = null,
  shieldId: ItemId | null = null,
): EquipmentSlots {
  return equipmentFromLegacy(owner, { weaponId, armorId, shieldId });
}

function inventorySlots(state: GameState): readonly (string | null)[] {
  return state.players[0].inventory.items.map((item) => item?.itemId ?? null);
}

function backpackIds(state: GameState): readonly string[] {
  return state.players[0].inventory.items.flatMap((item) =>
    item === null ? [] : [item.itemId],
  );
}

const GREATSWORD: ItemDefinition = {
  ...ITEMS.sword,
  id: 'greatsword' as ItemId,
  name: 'Mandoble',
  hands: 2,
};

const SYNTHETIC_CATALOG: Readonly<Record<string, ItemDefinition>> = {
  ...ITEMS,
  greatsword: GREATSWORD,
};

describe('instancias, localización y serialización (REQ-018 T-002/T-003)', () => {
  it('cada instancia está exactamente en una localización y los IDs son únicos', () => {
    const container: Container = {
      id: 'chest-1',
      x: 9,
      y: 9,
      capacity: 2,
      items: [{ id: 'item-chest-sword', itemId: 'sword' }, null],
    };
    const state = makeState({
      players: [
        makeUnit({
          id: 'player-1',
          faction: 'player',
          x: 4,
          y: 4,
          equipmentSlots: slots('player-1', 'sword', 'armor', 'shield'),
          inventory: inventoryFromIds('player-1', ['axe', 'dagger']),
        }),
      ],
      groundItems: [{ id: 'item-ground-knife', itemId: 'knife', x: 4, y: 4 }],
      containers: [container],
    });

    const instances = allInstances(state);
    const ids = instances.map((item) => item.id);
    expect(new Set(ids).size).toBe(ids.length);

    expect(locateInstance(state, 'item-player-1-weapon')).toEqual({
      kind: 'slot',
      unitId: 'player-1',
      slot: 'weapon',
    });
    expect(locateInstance(state, 'item-player-1-backpack-0')).toEqual({
      kind: 'backpack',
      unitId: 'player-1',
      index: 0,
    });
    expect(locateInstance(state, 'item-ground-knife')).toEqual({
      kind: 'ground',
      x: 4,
      y: 4,
    });
    expect(locateInstance(state, 'item-chest-sword')).toEqual({
      kind: 'container',
      containerId: 'chest-1',
      index: 0,
    });
    expect(locateInstance(state, 'item-inexistente')).toBeNull();
  });

  it('serializa instancias, localización, capacidad y mochila sin pérdida', () => {
    const state = makeState({
      players: [
        makeUnit({
          id: 'player-1',
          faction: 'player',
          x: 4,
          y: 4,
          equipmentSlots: slots('player-1', 'axe', null, 'shield'),
          inventory: inventoryFromIds('player-1', ['sword', 'dagger'], 4),
        }),
      ],
      groundItems: [{ id: 'item-ground-hammer', itemId: 'hammer', x: 6, y: 6 }],
      containers: [
        {
          id: 'chest-1',
          x: 8,
          y: 8,
          capacity: 2,
          items: [{ id: 'item-chest-knife', itemId: 'knife' }, null],
        },
      ],
    });

    const roundTrip = JSON.parse(JSON.stringify(state)) as GameState;

    expect(roundTrip).toEqual(state);
    expect(roundTrip.players[0].equipment.weapon?.itemId).toBe('axe');
    expect(roundTrip.players[0].inventory).toEqual({
      capacity: 4,
      items: [
        { id: 'item-player-1-backpack-0', itemId: 'sword' },
        { id: 'item-player-1-backpack-1', itemId: 'dagger' },
        null,
        null,
      ],
    });
    expect(roundTrip.groundItems).toEqual(state.groundItems);
    expect(roundTrip.containers).toEqual(state.containers);
  });

  it('usa capacidad 8 por defecto y acepta una capacidad alternativa', () => {
    expect(createInventory().capacity).toBe(8);
    expect(createInventory().items).toHaveLength(8);
    expect(createInventory(3).capacity).toBe(3);
    expect(createInventory(3).items).toHaveLength(3);

    const small = makeUnit({
      id: 'player-1',
      faction: 'player',
      x: 4,
      y: 4,
      inventory: createInventory(3),
    });
    expect(small.inventory.capacity).toBe(3);
  });
});

describe('equipar y desequipar (REQ-018 T-005)', () => {
  it('equipa desde un hueco libre de mochila con 1 MP y 0 acciones', () => {
    const state = makeState({
      players: [
        makeUnit({
          id: 'player-1',
          faction: 'player',
          x: 4,
          y: 4,
          equipmentSlots: slots('player-1', null),
          inventory: inventoryFromIds('player-1', ['sword']),
          mp: 4,
          actions: 1,
        }),
      ],
    });

    const result = reduce(state, {
      type: 'EquipItem',
      unitId: 'player-1',
      from: 'backpack',
      index: 0,
    });

    expect(result.events).toEqual([]);
    expect(result.state.players[0].equipment.weapon?.itemId).toBe('sword');
    expect(result.state.players[0].inventory.items[0]).toBeNull();
    expect(result.state.players[0].mp).toBe(3);
    expect(result.state.players[0].actions.remaining).toBe(1);
  });

  it('con la mochila llena, equipar desde la mochila intercambia en el hueco liberado', () => {
    const state = makeState({
      players: [
        makeUnit({
          id: 'player-1',
          faction: 'player',
          x: 4,
          y: 4,
          equipmentSlots: slots('player-1', 'dagger'),
          inventory: inventoryFromIds('player-1', ['sword', 'axe'], 2),
        }),
      ],
    });

    const result = reduce(state, {
      type: 'EquipItem',
      unitId: 'player-1',
      from: 'backpack',
      index: 0,
    });

    expect(result.events).toEqual([]);
    expect(result.state.players[0].equipment.weapon?.itemId).toBe('sword');
    expect(inventorySlots(result.state)).toEqual(['dagger', 'axe']);
    expect(result.state.players[0].inventory.items[0]?.id).toBe(
      'item-player-1-weapon',
    );
  });

  it('equipar desde el suelo con hueco libre va directo al hueco', () => {
    const state = makeState({
      players: [
        makeUnit({
          id: 'player-1',
          faction: 'player',
          x: 4,
          y: 4,
          equipmentSlots: slots('player-1', null),
        }),
      ],
      groundItems: [{ id: 'item-ground-sword', itemId: 'sword', x: 4, y: 4 }],
    });

    const result = reduce(state, {
      type: 'EquipItem',
      unitId: 'player-1',
      from: 'ground',
      itemId: 'item-ground-sword',
    });

    expect(result.events).toEqual([]);
    expect(result.state.players[0].equipment.weapon?.id).toBe('item-ground-sword');
    expect(result.state.groundItems).toEqual([]);
    expect(result.state.players[0].mp).toBe(5);
  });

  it('equipar desde el suelo con el hueco ocupado y la mochila llena se rechaza entero', () => {
    const state = makeState({
      players: [
        makeUnit({
          id: 'player-1',
          faction: 'player',
          x: 4,
          y: 4,
          equipmentSlots: slots('player-1', 'dagger'),
          inventory: inventoryFromIds('player-1', ['axe', 'knife'], 2),
        }),
      ],
      groundItems: [{ id: 'item-ground-sword', itemId: 'sword', x: 4, y: 4 }],
    });

    const result = reduce(state, {
      type: 'EquipItem',
      unitId: 'player-1',
      from: 'ground',
      itemId: 'item-ground-sword',
    });

    expect(result.state).toBe(state);
    expect(result.events).toEqual([
      { type: 'CommandRejected', commandType: 'EquipItem', reason: 'inventory-full' },
    ]);
    expect(result.state.groundItems).toHaveLength(1);
    expect(inventorySlots(result.state)).toEqual(['axe', 'knife']);
  });

  it('equipa por ID la segunda instancia de un tile con dos objetos', () => {
    const state = makeState({
      players: [
        makeUnit({
          id: 'player-1',
          faction: 'player',
          x: 4,
          y: 4,
          equipmentSlots: slots('player-1', null),
        }),
      ],
      groundItems: [
        { id: 'item-ground-sword', itemId: 'sword', x: 4, y: 4 },
        { id: 'item-ground-axe', itemId: 'axe', x: 4, y: 4 },
      ],
    });

    const result = reduce(state, {
      type: 'EquipItem',
      unitId: 'player-1',
      from: 'ground',
      itemId: 'item-ground-axe',
    });

    expect(result.events).toEqual([]);
    expect(result.state.players[0].equipment.weapon?.id).toBe('item-ground-axe');
    expect(result.state.groundItems).toEqual([
      { id: 'item-ground-sword', itemId: 'sword', x: 4, y: 4 },
    ]);
  });

  it('rechaza equipar del suelo un ID que no está en el tile', () => {
    const state = makeState({
      players: [
        makeUnit({
          id: 'player-1',
          faction: 'player',
          x: 4,
          y: 4,
          equipmentSlots: slots('player-1', null),
        }),
      ],
      groundItems: [
        { id: 'item-ground-sword', itemId: 'sword', x: 4, y: 4 },
        { id: 'item-ground-axe', itemId: 'axe', x: 5, y: 4 },
      ],
    });

    const result = reduce(state, {
      type: 'EquipItem',
      unitId: 'player-1',
      from: 'ground',
      itemId: 'item-ground-axe',
    });

    expect(result.state).toBe(state);
    expect(result.events).toEqual([
      { type: 'CommandRejected', commandType: 'EquipItem', reason: 'no-item' },
    ]);
    expect(result.state.groundItems).toHaveLength(2);
  });

  it('equipar desde el suelo con hueco ocupado y un hueco libre intercambia', () => {
    const state = makeState({
      players: [
        makeUnit({
          id: 'player-1',
          faction: 'player',
          x: 4,
          y: 4,
          equipmentSlots: slots('player-1', 'dagger'),
          inventory: inventoryFromIds('player-1', ['axe'], 2),
        }),
      ],
      groundItems: [{ id: 'item-ground-sword', itemId: 'sword', x: 4, y: 4 }],
    });

    const result = reduce(state, {
      type: 'EquipItem',
      unitId: 'player-1',
      from: 'ground',
      itemId: 'item-ground-sword',
    });

    expect(result.events).toEqual([]);
    expect(result.state.players[0].equipment.weapon?.itemId).toBe('sword');
    expect(backpackIds(result.state)).toEqual(['axe', 'dagger']);
    expect(result.state.groundItems).toEqual([]);
  });

  it('con el contenedor lleno, equipar desde él se rechaza sin mover nada', () => {
    const state = makeState({
      players: [
        makeUnit({
          id: 'player-1',
          faction: 'player',
          x: 4,
          y: 4,
          equipmentSlots: slots('player-1', 'dagger'),
          inventory: inventoryFromIds('player-1', ['axe'], 1),
        }),
      ],
      containers: [
        {
          id: 'chest-1',
          x: 5,
          y: 4,
          capacity: 1,
          items: [{ id: 'item-chest-sword', itemId: 'sword' }],
        },
      ],
    });

    const result = reduce(state, {
      type: 'EquipItem',
      unitId: 'player-1',
      from: 'container',
      containerId: 'chest-1',
      itemId: 'item-chest-sword',
    });

    expect(result.state).toBe(state);
    expect(result.events).toEqual([
      { type: 'CommandRejected', commandType: 'EquipItem', reason: 'inventory-full' },
    ]);
    expect(result.state.containers?.[0].items[0]?.id).toBe('item-chest-sword');
    expect(result.state.players[0].equipment.weapon?.itemId).toBe('dagger');
  });

  it('equipar desde un contenedor sintético con hueco libre y con hueco ocupado', () => {
    const free = makeState({
      players: [
        makeUnit({
          id: 'player-1',
          faction: 'player',
          x: 4,
          y: 4,
          equipmentSlots: slots('player-1', null),
        }),
      ],
      containers: [
        {
          id: 'chest-1',
          x: 5,
          y: 4,
          capacity: 2,
          items: [{ id: 'item-chest-sword', itemId: 'sword' }, null],
        },
      ],
    });

    const equipped = reduce(free, {
      type: 'EquipItem',
      unitId: 'player-1',
      from: 'container',
      containerId: 'chest-1',
      itemId: 'item-chest-sword',
    });

    expect(equipped.events).toEqual([]);
    expect(equipped.state.players[0].equipment.weapon?.id).toBe('item-chest-sword');
    expect(equipped.state.containers?.[0].items[0]).toBeNull();

    const occupied = makeState({
      players: [
        makeUnit({
          id: 'player-1',
          faction: 'player',
          x: 4,
          y: 4,
          equipmentSlots: slots('player-1', 'dagger'),
          inventory: inventoryFromIds('player-1', ['axe']),
        }),
      ],
      containers: [
        {
          id: 'chest-1',
          x: 5,
          y: 4,
          capacity: 1,
          items: [{ id: 'item-chest-sword', itemId: 'sword' }],
        },
      ],
    });

    const swapped = reduce(occupied, {
      type: 'EquipItem',
      unitId: 'player-1',
      from: 'container',
      containerId: 'chest-1',
      itemId: 'item-chest-sword',
    });

    expect(swapped.events).toEqual([]);
    expect(swapped.state.players[0].equipment.weapon?.itemId).toBe('sword');
    expect(backpackIds(swapped.state)).toEqual(['axe', 'dagger']);
    expect(swapped.state.containers?.[0].items[0]).toBeNull();
  });

  it('desequipa a la mochila y rechaza sin hueco libre', () => {
    const state = makeState({
      players: [
        makeUnit({
          id: 'player-1',
          faction: 'player',
          x: 4,
          y: 4,
          equipmentSlots: slots('player-1', 'sword', 'armor', null),
        }),
      ],
    });

    const result = reduce(state, {
      type: 'UnequipItem',
      unitId: 'player-1',
      slot: 'armor',
    });

    expect(result.events).toEqual([]);
    expect(result.state.players[0].equipment.armor).toBeNull();
    expect(backpackIds(result.state)).toEqual(['armor']);
    expect(result.state.players[0].mp).toBe(5);
    expect(result.state.players[0].actions).toEqual({ max: 2, remaining: 2 });

    const full = makeState({
      players: [
        makeUnit({
          id: 'player-1',
          faction: 'player',
          x: 4,
          y: 4,
          equipmentSlots: slots('player-1', 'sword', 'armor', null),
          inventory: inventoryFromIds('player-1', ['axe', 'dagger'], 2),
        }),
      ],
    });

    const rejected = reduce(full, {
      type: 'UnequipItem',
      unitId: 'player-1',
      slot: 'armor',
    });
    expect(rejected.state).toBe(full);
    expect(rejected.events).toEqual([
      { type: 'CommandRejected', commandType: 'UnequipItem', reason: 'inventory-full' },
    ]);
  });
});

describe('recoger y soltar (REQ-018 R-013, REQ-026 R-010)', () => {
  it('recoger con la mochila llena se rechaza sin alterar suelo ni mochila', () => {
    const state = makeState({
      players: [
        makeUnit({
          id: 'player-1',
          faction: 'player',
          x: 4,
          y: 4,
          inventory: inventoryFromIds('player-1', ['axe', 'dagger'], 2),
        }),
      ],
      groundItems: [{ id: 'item-ground-sword', itemId: 'sword', x: 4, y: 4 }],
    });

    const result = reduce(state, { type: 'PickUp', unitId: 'player-1' });

    expect(result.state).toBe(state);
    expect(result.events).toEqual([
      { type: 'CommandRejected', commandType: 'PickUp', reason: 'inventory-full' },
    ]);
    expect(result.state.groundItems).toHaveLength(1);
    expect(inventorySlots(result.state)).toEqual(['axe', 'dagger']);
  });

  it('soltar un equipado lo desequipa y lo deja en la casilla sin pasar por mochila', () => {
    const state = makeState({
      players: [
        makeUnit({
          id: 'player-1',
          faction: 'player',
          x: 4,
          y: 4,
          equipmentSlots: slots('player-1', 'sword', 'armor', 'shield'),
          inventory: inventoryFromIds('player-1', ['axe']),
        }),
      ],
    });

    const result = reduce(state, {
      type: 'DropItem',
      unitId: 'player-1',
      from: 'slot',
      slot: 'shield',
    });

    expect(result.events).toEqual([]);
    expect(result.state.players[0].equipment.shield).toBeNull();
    expect(backpackIds(result.state)).toEqual(['axe']);
    expect(result.state.groundItems).toEqual([
      { id: 'item-player-1-shield', itemId: 'shield', x: 4, y: 4 },
    ]);
    expect(result.state.players[0].mp).toBe(5);
    expect(result.state.players[0].actions).toEqual({ max: 2, remaining: 2 });
  });

  it('soltar desde la mochila libera su hueco', () => {
    const state = makeState({
      players: [
        makeUnit({
          id: 'player-1',
          faction: 'player',
          x: 4,
          y: 4,
          inventory: inventoryFromIds('player-1', ['axe', 'dagger']),
        }),
      ],
    });

    const result = reduce(state, {
      type: 'DropItem',
      unitId: 'player-1',
      from: 'backpack',
      index: 0,
    });

    expect(result.events).toEqual([]);
    expect(inventorySlots(result.state).slice(0, 2)).toEqual([null, 'dagger']);
    expect(result.state.groundItems).toEqual([
      { id: 'item-player-1-backpack-0', itemId: 'axe', x: 4, y: 4 },
    ]);
  });
});

describe('dos manos y escudo (REQ-018 R-019/T-006)', () => {
  it('un arma a dos manos manda el escudo a la mochila', () => {
    const state = makeState({
      players: [
        makeUnit({
          id: 'player-1',
          faction: 'player',
          x: 4,
          y: 4,
          equipmentSlots: slots('player-1', null, null, 'shield'),
          inventory: inventoryFromIds('player-1', ['greatsword' as ItemId]),
        }),
      ],
    });

    const result = equipItem(
      state,
      'player-1',
      { kind: 'backpack', index: 0 },
      SYNTHETIC_CATALOG,
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.state.players[0].equipment.weapon?.itemId).toBe('greatsword');
    expect(result.state.players[0].equipment.shield).toBeNull();
    expect(backpackIds(result.state)).toEqual(['shield']);
  });

  it('si el escudo no cabe, el cambio a dos manos se rechaza entero', () => {
    const state = makeState({
      players: [
        makeUnit({
          id: 'player-1',
          faction: 'player',
          x: 4,
          y: 4,
          equipmentSlots: slots('player-1', 'sword', null, 'shield'),
          inventory: inventoryFromIds('player-1', ['greatsword' as ItemId, 'axe'], 2),
        }),
      ],
    });
    const before = JSON.stringify(state);

    const result = equipItem(
      state,
      'player-1',
      { kind: 'backpack', index: 0 },
      SYNTHETIC_CATALOG,
    );

    expect(result).toEqual({ ok: false, reason: 'inventory-full' });
    expect(JSON.stringify(state)).toBe(before);
  });

  it('equipar un escudo con un arma a dos manos puesta se rechaza sin desequipar', () => {
    const state = makeState({
      players: [
        makeUnit({
          id: 'player-1',
          faction: 'player',
          x: 4,
          y: 4,
          equipmentSlots: slots('player-1', 'greatsword' as ItemId),
          inventory: inventoryFromIds('player-1', ['shield']),
        }),
      ],
    });
    const before = JSON.stringify(state);

    const result = equipItem(
      state,
      'player-1',
      { kind: 'backpack', index: 0 },
      SYNTHETIC_CATALOG,
    );

    expect(result).toEqual({ ok: false, reason: 'two-handed' });
    expect(JSON.stringify(state)).toBe(before);
  });
});

describe('costes, sin apilado y alarma', () => {
  it('las cuatro operaciones rechazan con 0 MP y no gastan acción', () => {
    const base = makeState({
      players: [
        makeUnit({
          id: 'player-1',
          faction: 'player',
          x: 4,
          y: 4,
          equipmentSlots: slots('player-1', 'sword', 'armor', null),
          inventory: inventoryFromIds('player-1', ['axe']),
          mp: 0,
          actions: 2,
        }),
      ],
      groundItems: [{ id: 'item-ground-dagger', itemId: 'dagger', x: 4, y: 4 }],
    });

    const commands = [
      { type: 'PickUp', unitId: 'player-1' },
      { type: 'EquipItem', unitId: 'player-1', from: 'backpack', index: 0 },
      { type: 'UnequipItem', unitId: 'player-1', slot: 'armor' },
      { type: 'DropItem', unitId: 'player-1', from: 'backpack', index: 0 },
    ] as const;

    for (const command of commands) {
      const result = reduce(base, command);
      expect(result.state).toBe(base);
      expect(result.events).toEqual([
        { type: 'CommandRejected', commandType: command.type, reason: 'no-mp' },
      ]);
      expect(result.state.players[0].actions).toEqual({ max: 2, remaining: 2 });
    }
  });

  it('el estado de alarma no cambia el coste de 1 MP', () => {
    const state = makeState({
      players: [
        makeUnit({
          id: 'player-1',
          faction: 'player',
          x: 4,
          y: 4,
          equipmentSlots: slots('player-1', 'sword', null, null),
          inventory: inventoryFromIds('player-1', ['axe']),
          mp: 3,
        }),
      ],
      enemies: [
        makeUnit({
          id: 'enemy-1',
          faction: 'enemy',
          x: 6,
          y: 4,
          awareness: 'alert',
          hasShouted: true,
        }),
      ],
    });

    const result = reduce(state, {
      type: 'EquipItem',
      unitId: 'player-1',
      from: 'backpack',
      index: 0,
    });

    expect(result.events).toEqual([]);
    expect(result.state.players[0].mp).toBe(2);
  });

  it('dos espadas iguales son dos instancias y ocupan dos huecos', () => {
    const state = makeState({
      players: [
        makeUnit({
          id: 'player-1',
          faction: 'player',
          x: 4,
          y: 4,
          inventory: inventoryFromIds('player-1', ['sword', 'sword']),
        }),
      ],
    });

    const items = state.players[0].inventory.items.filter(
      (item) => item !== null,
    );
    expect(items).toHaveLength(2);
    expect(items[0].itemId).toBe('sword');
    expect(items[1].itemId).toBe('sword');
    expect(items[0].id).not.toBe(items[1].id);
    expect(locateInstance(state, items[0].id)).toEqual({
      kind: 'backpack',
      unitId: 'player-1',
      index: 0,
    });
    expect(locateInstance(state, items[1].id)).toEqual({
      kind: 'backpack',
      unitId: 'player-1',
      index: 1,
    });
  });
});
