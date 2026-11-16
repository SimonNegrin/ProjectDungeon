import { describe, expect, it } from 'vitest';
import {
  buildSaveFiles,
  createInitialState,
  inventoryFromIds,
  isFloorTile,
  itemInstance,
  parseSave,
  reduce,
  type Container,
  type GameState,
  type ItemId,
} from '../../../src/game/index';
import { makeState, makeUnit } from './helpers';

const BUILD_INPUT = { gameVersion: '0.1.0', createdAt: '2026-11-16T00:00:00Z' };

/** Cofre de cuatro huecos; por defecto cerrado y con dos objetos. */
function chest(overrides: Partial<Container> = {}): Container {
  return {
    id: 'chest-1',
    x: 6,
    y: 5,
    capacity: 4,
    items: [
      itemInstance('chest-loot-1', 'sword'),
      itemInstance('chest-loot-2', 'axe'),
      null,
      null,
    ],
    kind: 'chest',
    opened: false,
    ...overrides,
  };
}

interface StateOptions {
  readonly x?: number;
  readonly y?: number;
  readonly actions?: number;
  readonly backpack?: readonly ItemId[];
  readonly capacity?: number;
  readonly ghost?: boolean;
  readonly containers?: readonly Container[];
}

/** Jugador vivo (o fantasma) activo junto a un cofre cerrado en (6,5). */
function stateWith(options: StateOptions = {}): GameState {
  return makeState({
    players: [
      makeUnit({
        id: 'player-1',
        faction: 'player',
        x: options.x ?? 5,
        y: options.y ?? 5,
        actions: options.actions ?? 2,
        ...(options.ghost ? { hp: 0, ghost: true, actions: options.actions ?? 1 } : {}),
        ...(options.backpack
          ? { inventory: inventoryFromIds('player-1', options.backpack, options.capacity) }
          : {}),
      }),
    ],
    enemies: [],
    containers: options.containers ?? [chest()],
  });
}

const OPEN_COMMAND = {
  type: 'OpenContainer',
  unitId: 'player-1',
  containerId: 'chest-1',
} as const;

function openedChest(overrides: Partial<Container> = {}): Container {
  return chest({ opened: true, ...overrides });
}

describe('apertura del cofre: coste y adyacencia (REQ-020 R-003/T-005)', () => {
  it('gasta exactamente 1 acción, no MP, y deja el contenido intacto', () => {
    const state = stateWith({ containers: [chest()] });
    const before = state.players[0];

    const result = reduce(state, OPEN_COMMAND);

    expect(result.events).toEqual([]);
    expect(result.state.players[0].actions.remaining).toBe(before.actions.remaining - 1);
    expect(result.state.players[0].mp).toBe(before.mp);
    expect(result.state.containers?.[0].opened).toBe(true);
    expect(result.state.containers?.[0].items.map((item) => item?.id ?? null)).toEqual([
      'chest-loot-1',
      'chest-loot-2',
      null,
      null,
    ]);
    expect(JSON.parse(JSON.stringify(result.state))).toEqual(result.state);
  });

  it('acepta las ocho casillas adyacentes y rechaza el mismo tile y la distancia 2', () => {
    for (const [dx, dy] of [
      [-1, -1],
      [0, -1],
      [1, -1],
      [-1, 0],
      [1, 0],
      [-1, 1],
      [0, 1],
      [1, 1],
    ] as const) {
      const adjacent = stateWith({ x: 6 + dx, y: 5 + dy });
      expect(reduce(adjacent, OPEN_COMMAND).state.containers?.[0].opened, `${dx},${dy}`).toBe(
        true,
      );
    }

    for (const [x, y] of [
      [6, 5],
      [8, 5],
      [8, 6],
      [4, 3],
    ] as const) {
      const far = stateWith({ x, y });
      const before = JSON.stringify(far);
      const rejected = reduce(far, OPEN_COMMAND);

      expect(rejected.state).toBe(far);
      expect(rejected.events).toEqual([
        { type: 'CommandRejected', commandType: 'OpenContainer', reason: 'not-adjacent' },
      ]);
      expect(JSON.stringify(far)).toBe(before);
    }
  });

  it('sin acción se rechaza sin abrir el cofre ni tocar el estado', () => {
    const state = stateWith({ actions: 0 });
    const rejected = reduce(state, OPEN_COMMAND);

    expect(rejected.state).toBe(state);
    expect(rejected.events).toEqual([
      { type: 'CommandRejected', commandType: 'OpenContainer', reason: 'no-action' },
    ]);
    expect(state.containers?.[0].opened).toBe(false);
  });

  it('reabrir un cofre ya abierto es gratis, incluso sin acciones', () => {
    const state = stateWith({ actions: 0, containers: [openedChest()] });

    const result = reduce(state, OPEN_COMMAND);

    expect(result.events).toEqual([]);
    expect(result.state.players[0].actions.remaining).toBe(0);
    expect(result.state.containers?.[0].opened).toBe(true);
  });

  it('rechaza un cofre inexistente y un contenedor que no es cofre', () => {
    const unknown = stateWith();
    expect(
      reduce(unknown, { ...OPEN_COMMAND, containerId: 'chest-9' }).events,
    ).toEqual([
      { type: 'CommandRejected', commandType: 'OpenContainer', reason: 'unknown-container' },
    ]);

    const corpse = stateWith({
      x: 6,
      y: 5,
      containers: [
        {
          id: 'chest-1',
          x: 6,
          y: 5,
          capacity: 2,
          items: [itemInstance('loot-1', 'sword'), null],
          kind: 'corpse',
          corpseOf: 'enemy-1',
        },
      ],
    });
    const before = JSON.stringify(corpse);
    expect(reduce(corpse, OPEN_COMMAND).events).toEqual([
      { type: 'CommandRejected', commandType: 'OpenContainer', reason: 'wrong-container' },
    ]);
    expect(JSON.stringify(corpse)).toBe(before);
  });

  it('solo el jugador activo y solo en la fase de jugador', () => {
    const twoPlayers = makeState({
      players: [
        makeUnit({ id: 'player-1', faction: 'player', x: 5, y: 5 }),
        makeUnit({ id: 'player-2', faction: 'player', x: 7, y: 5 }),
      ],
      enemies: [],
      containers: [chest()],
      activePlayerId: 'player-2',
    });
    expect(reduce(twoPlayers, OPEN_COMMAND).events).toEqual([
      { type: 'CommandRejected', commandType: 'OpenContainer', reason: 'not-active' },
    ]);

    const enemyPhase = stateWith();
    expect(
      reduce({ ...enemyPhase, phase: 'enemy' }, OPEN_COMMAND).events,
    ).toEqual([
      { type: 'CommandRejected', commandType: 'OpenContainer', reason: 'wrong-phase' },
    ]);
  });

  it('el fantasma no abre el cofre y conserva la inspección (REQ-021 R-006)', () => {
    const state = stateWith({ ghost: true, actions: 1 });
    const before = JSON.stringify(state);

    const attempt = reduce(state, OPEN_COMMAND);
    expect(attempt.state).toBe(state);
    expect(attempt.events).toEqual([
      { type: 'CommandRejected', commandType: 'OpenContainer', reason: 'dead-unit' },
    ]);
    expect(JSON.stringify(state)).toBe(before);

    const inspected = reduce(state, {
      type: 'InspectContainer',
      unitId: 'player-1',
      containerId: 'chest-1',
    });
    expect(inspected.state).toBe(state);
    expect(inspected.events).toEqual([
      {
        type: 'ContainerInspected',
        unitId: 'player-1',
        containerId: 'chest-1',
        items: [
          { id: 'chest-loot-1', itemId: 'sword', lootable: true },
          { id: 'chest-loot-2', itemId: 'axe', lootable: true },
        ],
      },
    ]);
    expect(state.players[0].actions.remaining).toBe(1);
    expect(state.containers?.[0].opened).toBe(false);
  });
});

describe('depósito en cofre: gratis, atómico y solo en cofres (REQ-020 R-010/T-006)', () => {
  const DEPOSIT = {
    type: 'DepositItem',
    unitId: 'player-1',
    containerId: 'chest-1',
    index: 0,
  } as const;

  it('mueve el objeto al primer hueco libre sin gastar acción ni MP', () => {
    const state = stateWith({
      backpack: ['dagger', 'hammer'],
      containers: [openedChest()],
    });
    const before = state.players[0];

    const result = reduce(state, DEPOSIT);

    expect(result.events).toEqual([]);
    expect(result.state.players[0].actions).toEqual(before.actions);
    expect(result.state.players[0].mp).toBe(before.mp);
    expect(result.state.players[0].inventory.items[0]).toBeNull();
    expect(result.state.containers?.[0].items[2]?.id).toBe('item-player-1-backpack-0');
    expect(result.state.containers?.[0].items[2]?.itemId).toBe('dagger');
    expect(result.state.containers?.[0].opened).toBe(true);
  });

  it('con el cofre lleno se rechaza sin mover nada', () => {
    const full = openedChest({
      items: [
        itemInstance('chest-a', 'sword'),
        itemInstance('chest-b', 'axe'),
        itemInstance('chest-c', 'knife'),
        itemInstance('chest-d', 'hammer'),
      ],
    });
    const state = stateWith({ backpack: ['dagger'], containers: [full] });
    const before = JSON.stringify(state);

    expect(reduce(state, DEPOSIT).events).toEqual([
      { type: 'CommandRejected', commandType: 'DepositItem', reason: 'container-full' },
    ]);
    expect(JSON.stringify(state)).toBe(before);
  });

  it('rechaza el cofre cerrado, la distancia y el cadáver', () => {
    const closed = stateWith({ backpack: ['dagger'] });
    expect(reduce(closed, DEPOSIT).events).toEqual([
      { type: 'CommandRejected', commandType: 'DepositItem', reason: 'container-closed' },
    ]);

    const far = stateWith({ x: 8, backpack: ['dagger'], containers: [openedChest()] });
    expect(reduce(far, DEPOSIT).events).toEqual([
      { type: 'CommandRejected', commandType: 'DepositItem', reason: 'not-adjacent' },
    ]);

    const corpse = stateWith({
      x: 6,
      y: 5,
      backpack: ['dagger'],
      containers: [
        {
          id: 'chest-1',
          x: 6,
          y: 5,
          capacity: 2,
          items: [null, null],
          kind: 'corpse',
          corpseOf: 'enemy-1',
        },
      ],
    });
    const before = JSON.stringify(corpse);
    expect(reduce(corpse, DEPOSIT).events).toEqual([
      { type: 'CommandRejected', commandType: 'DepositItem', reason: 'wrong-container' },
    ]);
    expect(JSON.stringify(corpse)).toBe(before);
  });

  it('rechaza un índice sin objeto o fuera de rango sin tocar el cofre', () => {
    const emptySlot = stateWith({
      backpack: ['dagger'],
      containers: [openedChest()],
    });
    expect(reduce(emptySlot, { ...DEPOSIT, index: 3 }).events).toEqual([
      { type: 'CommandRejected', commandType: 'DepositItem', reason: 'no-item' },
    ]);
    expect(reduce(emptySlot, { ...DEPOSIT, index: 99 }).events).toEqual([
      { type: 'CommandRejected', commandType: 'DepositItem', reason: 'invalid-slot' },
    ]);
    expect(emptySlot.players[0].inventory.items[0]?.itemId).toBe('dagger');
  });

  it('el fantasma deposita pagando su acción (REQ-021 R-005)', () => {
    const state = stateWith({
      ghost: true,
      actions: 1,
      backpack: ['dagger', 'hammer'],
      containers: [openedChest()],
    });

    const first = reduce(state, DEPOSIT);
    expect(first.events).toEqual([]);
    expect(first.state.players[0].actions.remaining).toBe(0);
    expect(first.state.players[0].inventory.items[0]).toBeNull();

    const second = reduce(first.state, { ...DEPOSIT, index: 1 });
    expect(second.events).toEqual([
      { type: 'CommandRejected', commandType: 'DepositItem', reason: 'no-action' },
    ]);
    expect(second.state).toBe(first.state);
  });
});

describe('saqueo del cofre abierto (REQ-020 R-010/T-006)', () => {
  const TAKE = {
    type: 'TakeItem',
    unitId: 'player-1',
    containerId: 'chest-1',
    itemId: 'chest-loot-1',
  } as const;
  const TAKE_ALL = {
    type: 'TakeAll',
    unitId: 'player-1',
    containerId: 'chest-1',
  } as const;

  it('coger uno es gratis y conserva el resto en el cofre abierto', () => {
    const state = stateWith({ containers: [openedChest()] });
    const before = state.players[0];

    const result = reduce(state, TAKE);

    expect(result.events).toEqual([]);
    expect(result.state.players[0].inventory.items[0]?.id).toBe('chest-loot-1');
    expect(result.state.players[0].actions).toEqual(before.actions);
    expect(result.state.players[0].mp).toBe(before.mp);
    expect(result.state.containers?.[0].opened).toBe(true);
    expect(result.state.containers?.[0].items.map((item) => item?.id ?? null)).toEqual([
      null,
      'chest-loot-2',
      null,
      null,
    ]);
  });

  it('«coger todo» mueve todo y el cofre vacío permanece en el mundo', () => {
    const state = stateWith({ containers: [openedChest()] });

    const result = reduce(state, TAKE_ALL);

    expect(result.events).toEqual([]);
    expect(
      result.state.players[0].inventory.items
        .filter((item) => item !== null)
        .map((item) => item?.id),
    ).toEqual(['chest-loot-1', 'chest-loot-2']);
    expect(result.state.containers).toHaveLength(1);
    expect(result.state.containers?.[0].id).toBe('chest-1');
    expect(result.state.containers?.[0].opened).toBe(true);
    expect(result.state.containers?.[0].items).toEqual([null, null, null, null]);
  });

  it('«coger todo» se rechaza entero si algo no cabe en la mochila', () => {
    const state = stateWith({
      capacity: 2,
      backpack: ['dagger'],
      containers: [
        openedChest({
          items: [
            itemInstance('chest-a', 'sword'),
            itemInstance('chest-b', 'axe'),
            null,
            null,
          ],
        }),
      ],
    });
    const before = JSON.stringify(state);

    expect(reduce(state, TAKE_ALL).events).toEqual([
      { type: 'CommandRejected', commandType: 'TakeAll', reason: 'inventory-full' },
    ]);
    expect(JSON.stringify(state)).toBe(before);
  });

  it('no se saquea un cofre cerrado ni uno que no está adyacente', () => {
    const closed = stateWith();
    expect(reduce(closed, TAKE).events).toEqual([
      { type: 'CommandRejected', commandType: 'TakeItem', reason: 'container-closed' },
    ]);
    expect(reduce(closed, TAKE_ALL).events).toEqual([
      { type: 'CommandRejected', commandType: 'TakeAll', reason: 'container-closed' },
    ]);

    const far = stateWith({ x: 8, containers: [openedChest()] });
    expect(reduce(far, TAKE).events).toEqual([
      { type: 'CommandRejected', commandType: 'TakeItem', reason: 'not-adjacent' },
    ]);
    expect(reduce(far, TAKE_ALL).events).toEqual([
      { type: 'CommandRejected', commandType: 'TakeAll', reason: 'not-adjacent' },
    ]);
  });

  it('el fantasma coge de un cofre abierto pagando una acción por objeto', () => {
    const state = stateWith({
      ghost: true,
      actions: 1,
      containers: [openedChest()],
    });

    const first = reduce(state, TAKE);
    expect(first.events).toEqual([]);
    expect(first.state.players[0].actions.remaining).toBe(0);
    expect(first.state.players[0].inventory.items[0]?.id).toBe('chest-loot-1');

    const second = reduce(first.state, { ...TAKE, itemId: 'chest-loot-2' });
    expect(second.events).toEqual([
      { type: 'CommandRejected', commandType: 'TakeItem', reason: 'no-action' },
    ]);
    expect(second.state).toBe(first.state);
  });

  it('al coger el último objeto el cofre sigue existiendo y abierto', () => {
    const single = openedChest({
      items: [itemInstance('chest-a', 'sword'), null, null, null],
    });
    const state = stateWith({
      backpack: ['dagger'],
      containers: [single],
    });

    const result = reduce(state, { ...TAKE, itemId: 'chest-a' });

    expect(result.events).toEqual([]);
    expect(result.state.containers).toHaveLength(1);
    expect(result.state.containers?.[0].opened).toBe(true);
    expect(result.state.containers?.[0].items).toEqual([null, null, null, null]);
  });
});

describe('persistencia del cofre: guardar y cargar sin repetir tiradas (REQ-020 T-001/T-008)', () => {
  it('conserva estado de apertura, contenido y posición tras el round-trip', () => {
    // La v1 solo guarda estados con mapa y configuración: se parte del estado
    // inicial real, se abre el primer cofre generado y se deposita un objeto.
    const initial = createInitialState({ seed: 1017 });
    const target = initial.containers?.[0];
    expect(target).toBeDefined();
    if (!target || !initial.map) return;

    const offsets = [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
      [1, 1],
      [-1, 1],
      [1, -1],
      [-1, -1],
    ] as const;
    const spot = offsets
      .map(([dx, dy]) => ({ x: target.x + dx, y: target.y + dy }))
      .find(({ x, y }) => isFloorTile(initial.map!, x, y));
    expect(spot).toBeDefined();
    if (!spot) return;

    const staged: GameState = {
      ...initial,
      players: initial.players.map((unit, index) =>
        index === 0
          ? {
              ...unit,
              x: spot.x,
              y: spot.y,
              inventory: inventoryFromIds(unit.id, ['dagger']),
            }
          : unit,
      ),
    };
    const daggerId = staged.players[0].inventory.items[0]?.id;
    expect(daggerId).toBeDefined();

    const opened = reduce(staged, {
      type: 'OpenContainer',
      unitId: staged.players[0].id,
      containerId: target.id,
    });
    expect(opened.events).toEqual([]);
    const deposited = reduce(opened.state, {
      type: 'DepositItem',
      unitId: staged.players[0].id,
      containerId: target.id,
      index: 0,
    });
    expect(deposited.events).toEqual([]);

    const first = buildSaveFiles(deposited.state, BUILD_INPUT);
    const loaded = parseSave(first.save);
    expect(loaded.ok).toBe(true);
    if (!loaded.ok) return;

    expect(loaded.value.containers).toEqual(deposited.state.containers);
    expect(loaded.value.containers?.[0]).toMatchObject({
      id: target.id,
      x: target.x,
      y: target.y,
      capacity: 4,
      kind: 'chest',
      opened: true,
    });
    // Cargar no regenera: el cofre conserva su botín y el objeto depositado.
    expect(
      loaded.value.containers?.[0].items.map((item) => item?.id ?? null),
    ).toContain(daggerId as string);

    const second = buildSaveFiles(loaded.value, BUILD_INPUT);
    expect(second.save).toBe(first.save);
    expect(second.manifest).toBe(first.manifest);
  });
});
