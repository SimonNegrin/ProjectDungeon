import { describe, expect, it } from 'vitest';
import {
  BESTIARY,
  BspMapGenerator,
  createInitialState,
  createRng,
  DEFAULT_MAP_OPTIONS,
  DEFAULT_MAP_SEED,
  equipmentFromLegacy,
  inventoryFromIds,
  isOccupied,
  isWallAt,
  normalizeSeed,
  PICKUP_COST,
  PLAYER_MAX_HP,
  PLAYER_MAX_MP,
  reduce,
  type GameState,
  type Position,
  type RngState,
  type WeaponId,
} from '../../../src/game/index';
import {
  expectedSinglePacketDamage,
  makeState,
  makeUnit,
  rngForDice,
} from './helpers';

describe('engine state', () => {
  it('crea un mapa generado de 32x32 con muros en el borde y suelo transitable', () => {
    const state = createInitialState({ generator: new BspMapGenerator() });

    expect(state.grid.width).toBe(32);
    expect(state.grid.height).toBe(32);
    expect(state.grid.tiles).toHaveLength(32 * 32);

    expect(state.map).toBeDefined();
    expect(state.map?.seed).toBe(DEFAULT_MAP_SEED);
    expect(state.map?.options).toEqual(DEFAULT_MAP_OPTIONS);
    expect(state.map?.tiles).toBe(state.grid.tiles);

    for (let x = 0; x < state.grid.width; x += 1) {
      expect(isWallAt(state.grid, x, 0)).toBe(true);
      expect(isWallAt(state.grid, x, state.grid.height - 1)).toBe(true);
    }
    for (let y = 0; y < state.grid.height; y += 1) {
      expect(isWallAt(state.grid, 0, y)).toBe(true);
      expect(isWallAt(state.grid, state.grid.width - 1, y)).toBe(true);
    }

    expect(state.grid.tiles.filter((tile) => tile === 'floor').length).toBeGreaterThan(0);
  });

  it('coloca al jugador y al enemigo en los spawns del mapa con vida, MP y acción iniciales', () => {
    const state = createInitialState({ generator: new BspMapGenerator() });
    const spawns = state.map?.spawns;

    expect(spawns).toBeDefined();
    expect(state.players).toHaveLength(1);
    expect(state.enemies).toHaveLength(4);
    expect(state.players[0]).toMatchObject({
      id: 'player-1',
      x: spawns?.player.x,
      y: spawns?.player.y,
      hp: PLAYER_MAX_HP,
      maxHp: PLAYER_MAX_HP,
      mp: PLAYER_MAX_MP,
      maxMp: PLAYER_MAX_MP,
      mana: { current: 0, max: 0 },
      actions: { max: 2, remaining: 2 },
    });
    expect(state.enemies[0]).toMatchObject({
      id: 'enemy-1',
      x: spawns?.enemy.x,
      y: spawns?.enemy.y,
      hp: BESTIARY.sentinel.maxHp,
      maxHp: BESTIARY.sentinel.maxHp,
      mp: BESTIARY.sentinel.maxMp,
      maxMp: BESTIARY.sentinel.maxMp,
      mana: { current: 0, max: 0 },
      actions: { max: 2, remaining: 2 },
    });
    expect(PLAYER_MAX_MP).toBe(6);
    expect(state.phase).toBe('player');
    expect(state.turn).toBe(1);
    expect(state.status).toBe('playing');
  });

  it('no coloca entidades sobre muros ni casillas ocupadas', () => {
    const state = createInitialState();
    const units = [...state.players, ...state.enemies];

    for (const unit of units) {
      expect(isWallAt(state.grid, unit.x, unit.y)).toBe(false);
    }
    expect(isOccupied(state, state.players[0].x, state.players[0].y)).toBe(true);
    expect(isOccupied(state, state.enemies[0].x, state.enemies[0].y)).toBe(true);
  });

  it('es serializable y puede reducirse tras un round-trip JSON', () => {
    const state = createInitialState();
    const parsed = JSON.parse(JSON.stringify(state)) as GameState;

    expect(parsed).toEqual(state);
    expect(parsed.map).toEqual(state.map);
    expect(JSON.parse(JSON.stringify(state.map))).toEqual(state.map);

    const player = state.players[0];
    const direction = findOpenDirection(state, player.x, player.y);
    const result = reduce(parsed, {
      type: 'Move',
      unitId: 'player-1',
      dx: direction.dx,
      dy: direction.dy,
    });

    expect(result.state.players[0]).toMatchObject({
      x: player.x + direction.dx,
      y: player.y + direction.dy,
      mp: 5,
    });
    expect(result.state.map).toEqual(state.map);
  });

  it('deriva el RNG de la semilla de la partida y lo serializa', () => {
    const state = createInitialState({ seed: 4294967297 });
    const parsed = JSON.parse(JSON.stringify(state)) as GameState;

    expect(state.rng).toEqual({ seed: normalizeSeed(4294967297), state: 0 });
    expect(state.rng.seed).toBe(state.map?.seed);
    expect(parsed.rng).toEqual(state.rng);
  });

  it('el jugador y el enemigo actual empiezan con el equipo y los modificadores acordados', () => {
    const state = createInitialState({ generator: new BspMapGenerator() });

    expect(state.players[0]).toMatchObject({
      hp: 20,
      maxHp: 20,
      nombre: 'Guerrero',
      archetypeId: 'warrior',
      stats: {
        habilidad: 1,
        fuerza: 1,
        defensa: 1,
        resistencia: {},
        punteria: 0,
        magicLevel: 0,
      },
      equipment: {
        weapon: { itemId: 'sword' },
        armor: { itemId: 'armor' },
        shield: { itemId: 'shield' },
        head: null,
        feet: null,
        hands: null,
        neck: null,
        ring: null,
      },
      inventory: { capacity: 8 },
    });
    expect(
      state.players[0].inventory.items.filter((item) => item !== null),
    ).toEqual([]);
    expect(state.enemies[0]).toMatchObject({
      enemyType: 'sentinel',
      hp: BESTIARY.sentinel.maxHp,
      maxHp: BESTIARY.sentinel.maxHp,
      stats: BESTIARY.sentinel.stats,
      equipment: {
        weapon: { itemId: BESTIARY.sentinel.equipment.weaponId },
        armor: null,
        shield: { itemId: BESTIARY.sentinel.equipment.shieldId },
      },
      inventory: { capacity: 8 },
    });
  });

  it('es determinista: dos estados iniciales son profundamente iguales', () => {
    const first = createInitialState();
    const second = createInitialState();

    expect(JSON.stringify(second)).toBe(JSON.stringify(first));
    expect(second).toEqual(first);
  });

  it('reduce es pura y no muta el estado de entrada', () => {
    const state = makeState({
      players: [makeUnit({ id: 'player-1', faction: 'player', x: 5, y: 5 })],
      enemies: [makeUnit({ id: 'enemy-1', faction: 'enemy', x: 10, y: 5 })],
    });
    const before = JSON.stringify(state);

    const result = reduce(state, { type: 'Move', unitId: 'player-1', dx: 1, dy: 0 });

    expect(JSON.stringify(state)).toBe(before);
    expect(result.state).not.toBe(state);
    expect(result.state.players[0]).not.toBe(state.players[0]);
  });

  it('Restart vuelve siempre al estado inicial', () => {
    const dirty = makeState({
      players: [makeUnit({ id: 'player-1', faction: 'player', x: 9, y: 9, hp: 4, mp: 0 })],
      enemies: [makeUnit({ id: 'enemy-1', faction: 'enemy', x: 10, y: 9, hp: 2 })],
      turn: 7,
      status: 'victory',
    });

    const result = reduce(dirty, { type: 'Restart' });

    expect(result.state).toEqual(createInitialState());
    expect(result.events).toEqual([{ type: 'GameRestarted' }]);
  });

  it('rechaza comandos de juego cuando la partida ha terminado', () => {
    for (const status of ['victory', 'defeat'] as const) {
      const state = makeState({ status });
      const result = reduce(state, { type: 'Move', unitId: 'player-1', dx: 1, dy: 0 });

      expect(result.state).toBe(state);
      expect(result.events).toEqual([
        { type: 'CommandRejected', commandType: 'Move', reason: 'game-over' },
      ]);
    }
  });
});

interface WeaponStateOptions {
  readonly weapon?: WeaponId;
  readonly weapons?: readonly WeaponId[];
  readonly equipped?: WeaponId | null;
  readonly mp?: number;
  readonly actions?: number;
  readonly player?: Position;
  readonly enemy?: Position;
  readonly rng?: RngState;
}

/**
 * Estado de referencia con el jugador sobre un objeto del suelo en el tile
 * indicado. Mantiene el mapa y los spawns reales de la semilla de referencia.
 */
function stateWithWeapon(options: WeaponStateOptions = {}): GameState {
  const base = createInitialState({ generator: new BspMapGenerator() });
  const playerPosition = options.player ?? { x: 5, y: 5 };
  const enemyPosition = options.enemy ?? base.enemies[0];
  const map = base.map;
  if (!map) throw new Error('La semilla de referencia debe producir un mapa.');

  return {
    ...base,
    players: [
      {
        ...base.players[0],
        x: playerPosition.x,
        y: playerPosition.y,
        mp: options.mp ?? base.players[0].mp,
        actions: {
          ...base.players[0].actions,
          remaining: options.actions ?? base.players[0].actions.max,
        },
        inventory: inventoryFromIds('player-1', options.weapons ?? []),
        equipment: equipmentFromLegacy('player-1', {
          weaponId: options.equipped === undefined ? 'sword' : options.equipped,
          armorId: 'armor',
          shieldId: 'shield',
        }),
      },
    ],
    enemies: [
      {
        ...base.enemies[0],
        x: enemyPosition.x,
        y: enemyPosition.y,
      },
    ],
    groundItems: options.weapon
      ? [
          {
            id: 'item-weapon-test',
            itemId: options.weapon,
            x: playerPosition.x,
            y: playerPosition.y,
          },
        ]
      : [],
    rng: options.rng ?? base.rng,
  };
}

function backpackItems(state: GameState): readonly string[] {
  return state.players[0].inventory.items
    .filter((item) => item !== null)
    .map((item) => item.itemId);
}

describe('recogida, equipo y operaciones de inventario', () => {
  it('G recoge a la mochila, gasta 1 MP, conserva la acción y no auto-equipa', () => {
    const state = stateWithWeapon({ weapon: 'axe' });
    const before = JSON.stringify(state);

    const result = reduce(state, { type: 'PickUp', unitId: 'player-1' });

    expect(JSON.stringify(state)).toBe(before);
    expect(result.events).toEqual([]);
    expect(result.state).not.toBe(state);
    expect(result.state.players[0]).toMatchObject({
      mp: PLAYER_MAX_MP - PICKUP_COST,
      actions: { remaining: 2 },
      equipment: { weapon: { itemId: 'sword' } },
    });
    expect(backpackItems(result.state)).toEqual(['axe']);
    expect(result.state.groundItems).toEqual([]);
    expect(result.state.rng).toEqual(state.rng);
    expect(JSON.parse(JSON.stringify(result.state))).toEqual(result.state);
  });

  it('recoge el martillo a la mochila sin cambiar el arma equipada', () => {
    const state = stateWithWeapon({ weapon: 'hammer' });

    const result = reduce(state, { type: 'PickUp', unitId: 'player-1' });

    expect(result.events).toEqual([]);
    expect(result.state.players[0]).toMatchObject({
      mp: PLAYER_MAX_MP - PICKUP_COST,
      actions: { remaining: 2 },
      equipment: { weapon: { itemId: 'sword' } },
    });
    expect(backpackItems(result.state)).toEqual(['hammer']);
    expect(result.state.groundItems).toEqual([]);
  });

  it('equipa desde la mochila por hueco con 1 MP y sin gastar acción', () => {
    const state = stateWithWeapon({
      weapons: ['sword', 'electric-sword', 'arcane-dagger'],
      equipped: 'sword',
      mp: 4,
      actions: 0,
    });

    const toElectric = reduce(state, {
      type: 'EquipItem',
      unitId: 'player-1',
      from: 'backpack',
      index: 1,
    });
    expect(toElectric.events).toEqual([]);
    expect(toElectric.state.players[0]).toMatchObject({
      equipment: { weapon: { itemId: 'electric-sword' } },
      mp: 3,
      actions: { remaining: 0 },
    });

    const toArcane = reduce(toElectric.state, {
      type: 'EquipItem',
      unitId: 'player-1',
      from: 'backpack',
      index: 2,
    });
    expect(toArcane.state.players[0]).toMatchObject({
      equipment: { weapon: { itemId: 'arcane-dagger' } },
      mp: 2,
      actions: { remaining: 0 },
    });
  });

  it('con 0 MP rechaza la recogida sin tocar el suelo ni la mochila', () => {
    const state = stateWithWeapon({ weapon: 'axe', mp: 0 });

    const result = reduce(state, { type: 'PickUp', unitId: 'player-1' });

    expect(result.state).toBe(state);
    expect(result.events).toEqual([
      { type: 'CommandRejected', commandType: 'PickUp', reason: 'no-mp' },
    ]);
    expect(backpackItems(state)).toEqual([]);
    expect(state.groundItems).toHaveLength(1);
  });

  it('sin objeto en el tile del jugador rechaza no-item', () => {
    const state = stateWithWeapon();

    const result = reduce(state, { type: 'PickUp', unitId: 'player-1' });

    expect(result.state).toBe(state);
    expect(result.events).toEqual([
      { type: 'CommandRejected', commandType: 'PickUp', reason: 'no-item' },
    ]);
  });

  it('recoger dos veces no duplica la instancia', () => {
    const first = reduce(stateWithWeapon({ weapon: 'axe' }), {
      type: 'PickUp',
      unitId: 'player-1',
    });
    const second = reduce(first.state, { type: 'PickUp', unitId: 'player-1' });

    expect(backpackItems(first.state)).toEqual(['axe']);
    expect(second.events).toEqual([
      { type: 'CommandRejected', commandType: 'PickUp', reason: 'no-item' },
    ]);
    expect(backpackItems(second.state)).toEqual(['axe']);
    expect(second.state.groundItems).toEqual([]);
  });

  it('no admite una novena instancia con la mochila llena', () => {
    const full = [
      'sword',
      'axe',
      'dagger',
      'knife',
      'hammer',
      'electric-sword',
      'arcane-dagger',
      'sword',
    ] as const;
    const state = stateWithWeapon({ weapon: 'dagger', weapons: full });

    const result = reduce(state, { type: 'PickUp', unitId: 'player-1' });

    expect(result.state).toBe(state);
    expect(result.events).toEqual([
      { type: 'CommandRejected', commandType: 'PickUp', reason: 'inventory-full' },
    ]);
    expect(result.state.groundItems).toHaveLength(1);
  });

  it('1-3 equipan los tres primeros huecos de mochila con 1 MP y sin acción', () => {
    const state = stateWithWeapon({
      weapons: ['sword', 'axe', 'dagger'],
      equipped: 'sword',
      mp: 4,
      actions: 0,
    });

    const toAxe = reduce(state, { type: 'SelectWeapon', unitId: 'player-1', slot: 2 });
    expect(toAxe.events).toEqual([]);
    expect(toAxe.state.players[0]).toMatchObject({
      equipment: { weapon: { itemId: 'axe' } },
      mp: 3,
      actions: { remaining: 0 },
    });

    const toDagger = reduce(toAxe.state, {
      type: 'SelectWeapon',
      unitId: 'player-1',
      slot: 3,
    });
    expect(toDagger.state.players[0]).toMatchObject({
      equipment: { weapon: { itemId: 'dagger' } },
      mp: 2,
      actions: { remaining: 0 },
    });

    const toSword = reduce(toDagger.state, {
      type: 'SelectWeapon',
      unitId: 'player-1',
      slot: 1,
    });
    expect(toSword.state.players[0]).toMatchObject({
      equipment: { weapon: { itemId: 'sword' } },
      mp: 1,
    });
  });

  it('rechaza huecos vacíos o fuera de rango', () => {
    const state = stateWithWeapon({ weapons: ['sword'] });

    for (const [slot, reason] of [
      [0, 'invalid-slot'],
      [2, 'no-item'],
      [3, 'no-item'],
      [4, 'invalid-slot'],
    ] as const) {
      const result = reduce(state, { type: 'SelectWeapon', unitId: 'player-1', slot });
      expect(result.state).toBe(state);
      expect(result.events, `hueco ${slot}`).toEqual([
        { type: 'CommandRejected', commandType: 'SelectWeapon', reason },
      ]);
    }
  });

  it('el enemigo no recoge objetos ni equipa desde mochila', () => {
    const state = stateWithWeapon({ weapon: 'axe' });

    const pickup = reduce(state, { type: 'PickUp', unitId: 'enemy-1' });
    expect(pickup.events).toEqual([
      { type: 'CommandRejected', commandType: 'PickUp', reason: 'unknown-unit' },
    ]);

    const equip = reduce(state, {
      type: 'EquipItem',
      unitId: 'enemy-1',
      from: 'backpack',
      index: 0,
    });
    expect(equip.events).toEqual([
      { type: 'CommandRejected', commandType: 'EquipItem', reason: 'unknown-unit' },
    ]);
  });

  it('ataca con el arma recién equipada y aplica su daño', () => {
    const state = stateWithWeapon({
      weapon: 'axe',
      enemy: { x: 6, y: 5 },
      rng: rngForDice([1, 1, 3, 6]),
    });

    const pickup = reduce(state, { type: 'PickUp', unitId: 'player-1' });
    const equip = reduce(pickup.state, {
      type: 'EquipItem',
      unitId: 'player-1',
      from: 'backpack',
      index: 0,
    });
    const damage = expectedSinglePacketDamage(
      equip.state.players[0],
      equip.state.enemies[0],
      3,
      6,
    );
    const attack = reduce(equip.state, {
      type: 'Attack',
      unitId: 'player-1',
      targetId: 'enemy-1',
    });

    expect(attack.events).toEqual([
      expect.objectContaining({
        type: 'AttackPerformed',
        attackerId: 'player-1',
        targetId: 'enemy-1',
        hit: true,
        damage,
        rolls: { attack: 1, shield: 1, damage: 3, armor: 6 },
      }),
      { type: 'AlarmRaised', unitId: 'enemy-1', position: { x: 6, y: 5 } },
    ]);
    expect(attack.state.enemies[0].hp).toBe(
      equip.state.enemies[0].maxHp - damage,
    );
    expect(attack.state.players[0]).toMatchObject({
      equipment: { weapon: { itemId: 'axe' } },
      actions: { remaining: 1 },
    });
  });

  it('dos ejecuciones con la misma semilla y comandos dan el mismo estado', () => {
    const run = (): GameState => {
      const state = stateWithWeapon({
        weapon: 'dagger',
        enemy: { x: 6, y: 5 },
        rng: createRng(DEFAULT_MAP_SEED),
      });
      const pickup = reduce(state, { type: 'PickUp', unitId: 'player-1' });
      const toAxe = reduce(pickup.state, {
        type: 'EquipItem',
        unitId: 'player-1',
        from: 'backpack',
        index: 0,
      });
      return reduce(toAxe.state, {
        type: 'Attack',
        unitId: 'player-1',
        targetId: 'enemy-1',
      }).state;
    };

    expect(JSON.stringify(run())).toBe(JSON.stringify(run()));
  });
});

/** Busca una dirección ortogonal transitable desde una casilla del jugador. */
function findOpenDirection(
  state: GameState,
  x: number,
  y: number,
): { readonly dx: number; readonly dy: number } {
  const candidates = [
    { dx: 1, dy: 0 },
    { dx: -1, dy: 0 },
    { dx: 0, dy: 1 },
    { dx: 0, dy: -1 },
  ];
  for (const candidate of candidates) {
    const target = { x: x + candidate.dx, y: y + candidate.dy };
    if (
      target.x >= 0 &&
      target.y >= 0 &&
      target.x < state.grid.width &&
      target.y < state.grid.height &&
      state.grid.tiles[target.y * state.grid.width + target.x] === 'floor' &&
      !isOccupied(state, target.x, target.y)
    ) {
      return candidate;
    }
  }
  throw new Error('El jugador no tiene ninguna casilla libre adyacente.');
}
