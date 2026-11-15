import { describe, expect, it } from 'vitest';
import {
  EQUIPMENT_SLOTS,
  allInstances,
  corpseId,
  createInventory,
  emptyEquipment,
  equipItem,
  equipmentFromLegacy,
  findSpell,
  inventoryFromIds,
  isOccupied,
  itemInstance,
  locateInstance,
  reduce,
  settleUnitDeath,
  type EquipmentSlots,
  type GameState,
  type Unit,
} from '../../../src/game/index';
import {
  advanceRng,
  makeState,
  makeUnit,
  rngForDice,
} from './helpers';

/** Golpe del enemigo por defecto contra un jugador adyacente. */
const ENEMY_HIT = [6, 1, 3, 3] as const;
/** Fallo del jugador y réplica letal del enemigo. */
const REPLICA_KILL = [1, 6, 6, 1, 3, 3] as const;

function fullEquipment(owner: string): EquipmentSlots {
  return {
    ...equipmentFromLegacy(owner, {
      weaponId: 'sword',
      armorId: 'armor',
      shieldId: 'shield',
    }),
    head: itemInstance(`item-${owner}-head`, 'armor'),
    feet: itemInstance(`item-${owner}-feet`, 'armor'),
    hands: itemInstance(`item-${owner}-hands`, 'dagger'),
    neck: itemInstance(`item-${owner}-neck`, 'dagger'),
    ring: itemInstance(`item-${owner}-ring`, 'dagger'),
  };
}

function deadPlayer(overrides: Partial<Parameters<typeof makeUnit>[0]> = {}): Unit {
  return makeUnit({
    id: 'player-1',
    faction: 'player',
    x: 5,
    y: 5,
    hp: 0,
    ...overrides,
  });
}

function corpseOf(state: GameState, unitId: string) {
  return state.containers?.find((container) => container.corpseOf === unitId);
}

describe('muerte de jugador y cadáver contenedor (REQ-021 R-001/R-009/R-010/T-001)', () => {
  it('la muerte por ataque transfiere todo el equipo y la mochila sin pérdida', () => {
    const equipment = fullEquipment('player-1');
    const inventory = inventoryFromIds(
      'player-1',
      ['axe', 'dagger', 'hammer', 'knife', 'sword', 'axe', 'dagger', 'hammer'],
      8,
    );
    const state = makeState({
      players: [
        makeUnit({
          id: 'player-1',
          faction: 'player',
          x: 5,
          y: 5,
          hp: 1,
          equipmentSlots: equipment,
          inventory,
        }),
      ],
      enemies: [makeUnit({ id: 'enemy-1', faction: 'enemy', x: 6, y: 5 })],
      rng: rngForDice(ENEMY_HIT),
    });
    const beforeIds = allInstances(state).map((instance) => instance.id);

    const result = reduce(state, { type: 'EndTurn' });

    const dead = result.state.players[0];
    expect(dead.hp).toBe(0);
    expect(dead.equipment).toEqual(emptyEquipment());
    expect(dead.inventory.capacity).toBe(8);
    expect(dead.inventory.items.every((item) => item === null)).toBe(true);

    const corpse = corpseOf(result.state, 'player-1');
    expect(corpse).toBeDefined();
    expect(corpse?.id).toBe(corpseId('player-1'));
    expect(corpse?.kind).toBe('corpse');
    expect(corpse?.x).toBe(5);
    expect(corpse?.y).toBe(5);
    expect(corpse?.capacity).toBe(16);
    expect(corpse?.items.every((item) => item !== null)).toBe(true);

    // Orden estable: huecos de EQUIPMENT_SLOTS y después la mochila.
    const expected = [
      ...EQUIPMENT_SLOTS.map((slot) => equipment[slot]?.id),
      ...inventory.items.map((item) => item?.id),
    ];
    expect(corpse?.items.map((item) => item?.id)).toEqual(expected);

    // Ningún objeto desaparece ni se duplica: la contención es la única verdad.
    const afterIds = allInstances(result.state).map((instance) => instance.id);
    expect([...afterIds].sort()).toEqual([...beforeIds].sort());
    expect(new Set(afterIds).size).toBe(afterIds.length);
    expect(locateInstance(result.state, 'item-player-1-weapon')).toEqual({
      kind: 'container',
      containerId: corpseId('player-1'),
      index: 0,
    });

    // Sin tiradas extra: el RNG es el del ataque que mató.
    expect(result.state.rng).toEqual(advanceRng(state.rng, ENEMY_HIT));
  });

  it('la unidad muerta conserva identidad y posición con hp 0', () => {
    const equipment = equipmentFromLegacy('player-1', {
      weaponId: 'axe',
      armorId: 'plate',
      shieldId: 'shield',
    });
    const state = makeState({
      players: [
        makeUnit({
          id: 'player-1',
          nombre: 'Guerrero',
          faction: 'player',
          x: 5,
          y: 5,
          hp: 1,
          equipmentSlots: equipment,
          inventory: inventoryFromIds('player-1', ['dagger']),
          archetypeId: 'warrior',
          variant: 2,
        }),
      ],
      enemies: [makeUnit({ id: 'enemy-1', faction: 'enemy', x: 6, y: 5 })],
      rng: rngForDice(ENEMY_HIT),
    });
    const before = state.players[0];

    const result = reduce(state, { type: 'EndTurn' });
    const dead = result.state.players[0];

    expect(result.state.players).toHaveLength(1);
    expect(dead.id).toBe(before.id);
    expect(dead.nombre).toBe('Guerrero');
    expect(dead.archetypeId).toBe('warrior');
    expect(dead.variant).toBe(2);
    expect(dead.faction).toBe('player');
    expect(dead.x).toBe(before.x);
    expect(dead.y).toBe(before.y);
    expect(dead.maxHp).toBe(before.maxHp);
    expect(dead.stats).toEqual(before.stats);
    expect(dead.hp).toBe(0);
    expect(corpseOf(result.state, dead.id)?.corpseOf).toBe(dead.id);
  });

  it('la réplica que mata al jugador también crea su cadáver', () => {
    const state = makeState({
      players: [
        makeUnit({ id: 'player-1', faction: 'player', x: 5, y: 5, hp: 1 }),
      ],
      enemies: [makeUnit({ id: 'enemy-1', faction: 'enemy', x: 6, y: 5 })],
      rng: rngForDice(REPLICA_KILL),
    });

    const result = reduce(state, {
      type: 'Attack',
      unitId: 'player-1',
      targetId: 'enemy-1',
    });

    expect(result.events.map((event) => event.type)).toEqual([
      'AttackPerformed',
      'ReplicaPerformed',
      'UnitDied',
      'GameEnded',
    ]);
    expect(result.state.players[0].hp).toBe(0);
    expect(result.state.players[0].equipment).toEqual(emptyEquipment());
    const corpse = corpseOf(result.state, 'player-1');
    expect(corpse?.items.map((item) => item?.id)).toEqual([
      'item-player-1-weapon',
      'item-player-1-shield',
      'item-player-1-armor',
    ]);
  });

  it('el daño mágico conserva intacto al enemigo muerto (sin cadáver en esta tarea)', () => {
    const fire = findSpell('fire-2')!;
    const state = makeState({
      players: [
        makeUnit({
          id: 'player-1',
          faction: 'player',
          x: 5,
          y: 5,
          magicLevel: 4,
          mana: { current: 16, max: 16 },
          equipment: { weaponId: null, armorId: null, shieldId: null },
        }),
      ],
      enemies: [
        makeUnit({ id: 'enemy-1', faction: 'enemy', x: 8, y: 5, hp: 1 }),
      ],
      rng: rngForDice([6, 1, 3, 3]),
    });
    const enemyBefore = state.enemies[0];

    const result = reduce(state, {
      type: 'CastSpell',
      unitId: 'player-1',
      spellId: fire.id,
      target: { x: 8, y: 5 },
    });

    expect(result.events.map((event) => event.type)).toEqual([
      'SpellCast',
      'UnitDied',
      'GameEnded',
    ]);
    expect(result.state.enemies[0].hp).toBe(0);
    expect(result.state.enemies[0].equipment).toEqual(enemyBefore.equipment);
    expect(result.state.containers ?? []).toEqual([]);
  });

  it('es idempotente y no lee ni avanza el RNG', () => {
    const state = makeState({
      players: [
        deadPlayer({ equipmentSlots: fullEquipment('player-1') }),
      ],
    });
    const before = JSON.parse(JSON.stringify(state));

    const settled = settleUnitDeath(state, 'player-1');
    const again = settleUnitDeath(settled, 'player-1');

    expect(again).toBe(settled);
    expect(settled.containers).toHaveLength(1);
    expect(settled.rng).toEqual(state.rng);
    expect(JSON.parse(JSON.stringify(settled))).toEqual(settled);
    expect(JSON.parse(JSON.stringify(state))).toEqual(before);
  });

  it('un enemigo muerto o una unidad viva no generan cadáver', () => {
    const state = makeState({
      players: [makeUnit({ id: 'player-1', faction: 'player', x: 4, y: 4 })],
      enemies: [makeUnit({ id: 'enemy-1', faction: 'enemy', x: 6, y: 5, hp: 0 })],
    });
    const enemyBefore = state.enemies[0];

    const stateAfterEnemy = settleUnitDeath(state, 'enemy-1');
    const stateAfterAlive = settleUnitDeath(state, 'player-1');

    expect(stateAfterEnemy).toBe(state);
    expect(stateAfterEnemy.enemies[0]).toEqual(enemyBefore);
    expect(stateAfterEnemy.containers).toEqual([]);
    expect(stateAfterAlive).toBe(state);
    expect(settleUnitDeath(state, 'missing')).toBe(state);
  });
});

describe('cadáver, casilla compartida y persistencia', () => {
  it('el cadáver no bloquea el paso y varios cadáveres comparten casilla', () => {
    const base = makeState({
      players: [
        deadPlayer({ id: 'player-1', x: 5, y: 5 }),
        deadPlayer({ id: 'player-2', x: 5, y: 5, equipmentSlots: emptyEquipment() }),
        makeUnit({ id: 'player-3', faction: 'player', x: 4, y: 5 }),
      ],
      enemies: [],
    });
    const withCorpses = settleUnitDeath(
      settleUnitDeath(base, 'player-1'),
      'player-2',
    );
    expect(withCorpses.containers).toHaveLength(2);
    expect(isOccupied(withCorpses, 5, 5)).toBe(false);

    const moved = reduce(withCorpses, {
      type: 'Move',
      unitId: 'player-3',
      dx: 1,
      dy: 0,
    });

    expect(moved.state.players[2].x).toBe(5);
    expect(moved.state.players[2].y).toBe(5);
    expect(moved.events[0]).toMatchObject({ type: 'UnitMoved', unitId: 'player-3' });
  });

  it('un enemigo vivo puede compartir casilla con el cadáver; el bloqueo es suyo', () => {
    const state = settleUnitDeath(
      makeState({
        players: [deadPlayer({ id: 'player-1', x: 5, y: 5 })],
        enemies: [makeUnit({ id: 'enemy-1', faction: 'enemy', x: 5, y: 5 })],
      }),
      'player-1',
    );

    expect(state.players[0].x).toBe(5);
    expect(state.enemies[0].hp).toBeGreaterThan(0);
    expect(isOccupied(state, 5, 5)).toBe(true);
    expect(corpseOf(state, 'player-1')?.x).toBe(5);
  });

  it('el cadáver persiste al vaciarse y aunque nazca vacío', () => {
    const looted = settleUnitDeath(
      makeState({
        players: [
          deadPlayer({
            equipmentSlots: equipmentFromLegacy('player-1', {
              weaponId: 'sword',
              armorId: null,
              shieldId: null,
            }),
            inventory: createInventory(),
          }),
          makeUnit({ id: 'player-2', faction: 'player', x: 4, y: 4 }),
        ],
      }),
      'player-1',
    );

    const taken = equipItem(looted, 'player-2', {
      kind: 'container',
      containerId: corpseId('player-1'),
      itemId: 'item-player-1-weapon',
    });
    expect(taken.ok).toBe(true);
    if (!taken.ok) return;

    const corpse = corpseOf(taken.state, 'player-1');
    expect(corpse).toBeDefined();
    expect(corpse?.capacity).toBe(1);
    expect(corpse?.items).toEqual([null]);

    const bornEmpty = settleUnitDeath(
      makeState({
        players: [
          deadPlayer({
            equipmentSlots: emptyEquipment(),
            inventory: createInventory(),
          }),
        ],
      }),
      'player-1',
    );
    const emptyCorpse = corpseOf(bornEmpty, 'player-1');
    expect(emptyCorpse?.items).toEqual([]);
    expect(emptyCorpse?.capacity).toBe(0);
    expect(bornEmpty.containers).toHaveLength(1);
  });

  it('estado y snapshot transportan el cadáver y la unidad muerta de forma serializable', () => {
    const state = settleUnitDeath(
      makeState({
        players: [
          deadPlayer({
            equipmentSlots: fullEquipment('player-1'),
            inventory: inventoryFromIds('player-1', ['dagger']),
          }),
        ],
      }),
      'player-1',
    );

    const roundTrip = JSON.parse(JSON.stringify(state)) as GameState;
    expect(roundTrip).toEqual(state);
    expect(roundTrip.containers?.[0]).toMatchObject({
      id: corpseId('player-1'),
      kind: 'corpse',
      corpseOf: 'player-1',
    });
    expect(roundTrip.players[0]).toMatchObject({ id: 'player-1', hp: 0 });
    expect(roundTrip.players[0].equipment).toEqual(emptyEquipment());
  });
});
