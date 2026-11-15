import { describe, expect, it } from 'vitest';
import {
  activePlayer,
  activePlayerIndex,
  BESTIARY,
  BspMapGenerator,
  allInstances,
  corpseId,
  createInitialState,
  createInventory,
  createRng,
  DEFAULT_MAP_OPTIONS,
  DEFAULT_MAP_SEED,
  emptyEquipment,
  equipmentFromLegacy,
  GameConfigError,
  inventoryFromIds,
  isOccupied,
  isWallAt,
  itemInstance,
  locateInstance,
  normalizeSeed,
  partyOrder,
  PICKUP_COST,
  PLAYER_MAX_HP,
  PLAYER_MAX_MP,
  reduce,
  resolveAttack,
  settleUnitDeath,
  type ArchetypeId,
  type EquipmentSlots,
  type GameState,
  type Inventory,
  type MapGenerator,
  type PlayerConfig,
  type PlayerVariant,
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
    expect(state.round).toBe(1);
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

  it('aplica la tirada de botín al crear cada enemigo sin tocar el RNG principal', () => {
    const seed = 279837264;
    const marksOf = (state: GameState) =>
      state.enemies.map((enemy) => ({
        id: enemy.id,
        equipment: Object.fromEntries(
          Object.entries(enemy.equipment).map(([slot, item]) => [
            slot,
            item === null ? null : item.lootable,
          ]),
        ),
      }));

    const first = createInitialState({ seed });
    const second = createInitialState({ seed });

    expect(marksOf(second)).toEqual(marksOf(first));
    expect(first.rng).toEqual(createRng(normalizeSeed(seed)));
    for (const enemy of first.enemies) {
      for (const item of Object.values(enemy.equipment)) {
        if (item !== null) expect(typeof item.lootable, enemy.id).toBe('boolean');
      }
    }
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
      round: 7,
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

describe('estado de partida: party, activo y ronda (REQ-031 T-001)', () => {
  const ARCHETYPES = [
    'warrior',
    'rogue',
    'mage',
    'cleric',
    'archer',
    'barbarian',
  ] as const;

  function partyConfig(count: number): readonly PlayerConfig[] {
    return ARCHETYPES.slice(0, count).map((archetypeId, index) => ({
      archetypeId,
      variant: (index % 2 === 0 ? 1 : 2) as PlayerVariant,
      name: '',
    }));
  }

  it('escribe activo, ronda y orden de party con 1, 2 y 6 jugadores', () => {
    for (const count of [1, 2, 6]) {
      const configs = partyConfig(count);
      const state = createInitialState({
        generator: new BspMapGenerator(),
        players: configs,
      });
      const ids = configs.map((_, index) => `player-${index + 1}`);

      expect(state.activePlayerId).toBe('player-1');
      expect(state.round).toBe(1);
      expect(state.phase).toBe('player');
      expect(state.players.map((player) => player.id)).toEqual(ids);
      expect(partyOrder(state)).toEqual(ids);
      expect(activePlayer(state)?.id).toBe('player-1');
      expect(activePlayerIndex(state)).toBe(0);
    }
  });

  it('el round-trip JSON conserva activo, ronda y orden', () => {
    const state = createInitialState({
      generator: new BspMapGenerator(),
      players: partyConfig(6),
    });
    const restored = JSON.parse(JSON.stringify(state)) as GameState;

    expect(restored).toEqual(state);
    expect(restored.activePlayerId).toBe('player-1');
    expect(restored.round).toBe(1);
    expect(partyOrder(restored)).toEqual(partyOrder(state));
    expect(activePlayer(restored)?.id).toBe('player-1');
  });

  it('los helpers leen el activo por id y no mutan el estado', () => {
    const players = [
      makeUnit({ id: 'player-1', faction: 'player', x: 4, y: 4 }),
      makeUnit({ id: 'player-2', faction: 'player', x: 5, y: 4 }),
    ];
    const state = makeState({ players, activePlayerId: 'player-2' });
    const before = JSON.stringify(state);

    expect(partyOrder(state)).toEqual(['player-1', 'player-2']);
    expect(activePlayer(state)?.id).toBe('player-2');
    expect(activePlayerIndex(state)).toBe(1);
    expect(JSON.stringify(state)).toBe(before);

    const inactive = makeState({ players, activePlayerId: null });
    expect(activePlayer(inactive)).toBeUndefined();
    expect(activePlayerIndex(inactive)).toBe(-1);

    const empty = makeState({ players: [] });
    expect(empty.activePlayerId).toBeNull();
    expect(partyOrder(empty)).toEqual([]);
    expect(activePlayer(empty)).toBeUndefined();
    expect(activePlayerIndex(empty)).toBe(-1);
  });

  it('Restart vuelve al primer jugador y a la ronda 1', () => {
    const state = createInitialState({
      generator: new BspMapGenerator(),
      players: partyConfig(2),
    });
    const dirty: GameState = { ...state, activePlayerId: 'player-2', round: 5 };

    const result = reduce(dirty, { type: 'Restart' });

    expect(result.state.activePlayerId).toBe('player-1');
    expect(result.state.round).toBe(1);
    expect(partyOrder(result.state)).toEqual(['player-1', 'player-2']);
  });
});

describe('configuración de partida', () => {
  const sixPlayers: readonly PlayerConfig[] = [
    { archetypeId: 'warrior', variant: 1, name: 'Ada' },
    { archetypeId: 'rogue', variant: 2, name: 'Boric' },
    { archetypeId: 'mage', variant: 1, name: '' },
    { archetypeId: 'cleric', variant: 2, name: 'Dara' },
    { archetypeId: 'archer', variant: 1, name: 'Eli' },
    { archetypeId: 'barbarian', variant: 2, name: 'Fen' },
  ];

  function configError(run: () => unknown): GameConfigError {
    try {
      run();
    } catch (error) {
      expect(error).toBeInstanceOf(GameConfigError);
      return error as GameConfigError;
    }
    throw new Error('Se esperaba un GameConfigError');
  }

  it('crea un jugador con arquetipo, variante y nombre de la configuración', () => {
    const state = createInitialState({
      seed: 279837264,
      generator: new BspMapGenerator(),
      players: [{ archetypeId: 'rogue', variant: 2, name: 'Ada' }],
    });
    const spawns = state.map?.spawns;

    expect(state.players).toHaveLength(1);
    expect(state.players[0]).toMatchObject({
      id: 'player-1',
      archetypeId: 'rogue',
      variant: 2,
      nombre: 'Ada',
      x: spawns?.party?.[0]?.x ?? spawns?.player.x,
      y: spawns?.party?.[0]?.y ?? spawns?.player.y,
    });
    expect(state.enemies.every((enemy) => enemy.variant === null)).toBe(true);
    expect(state.config).toEqual({
      seed: 279837264,
      players: [{ archetypeId: 'rogue', variant: 2, name: 'Ada' }],
    });
  });

  it('con seis jugadores conserva el orden de turno y ocupa seis huecos', () => {
    const state = createInitialState({
      seed: 279837264,
      generator: new BspMapGenerator(),
      players: sixPlayers,
    });
    const spawns = state.map?.spawns;

    expect(state.players).toHaveLength(6);
    expect(
      state.players.map(({ id, archetypeId, variant, nombre }) => ({
        id,
        archetypeId,
        variant,
        nombre,
      })),
    ).toEqual([
      { id: 'player-1', archetypeId: 'warrior', variant: 1, nombre: 'Ada' },
      { id: 'player-2', archetypeId: 'rogue', variant: 2, nombre: 'Boric' },
      { id: 'player-3', archetypeId: 'mage', variant: 1, nombre: 'Mago' },
      { id: 'player-4', archetypeId: 'cleric', variant: 2, nombre: 'Dara' },
      { id: 'player-5', archetypeId: 'archer', variant: 1, nombre: 'Eli' },
      { id: 'player-6', archetypeId: 'barbarian', variant: 2, nombre: 'Fen' },
    ]);
    expect(state.players.map(({ x, y }) => ({ x, y }))).toEqual(
      spawns?.party?.slice(0, 6),
    );
    expect(state.config?.players).toEqual(sixPlayers);
  });

  it('un nombre vacío toma el del arquetipo y el resto se guarda tal cual', () => {
    const state = createInitialState({
      generator: new BspMapGenerator(),
      players: [
        { archetypeId: 'warrior', variant: 1, name: '' },
        { archetypeId: 'mage', variant: 2, name: '  ' },
      ],
    });

    expect(state.players.map((player) => player.nombre)).toEqual(['Guerrero', '  ']);
    expect(state.config?.players.map((player) => player.name)).toEqual(['', '  ']);
  });

  it('serializa la configuración y normaliza la semilla en el estado', () => {
    const state = createInitialState({
      seed: 4294967297,
      generator: new BspMapGenerator(),
      players: sixPlayers,
    });
    const parsed = JSON.parse(JSON.stringify(state)) as GameState;

    expect(state.config?.seed).toBe(normalizeSeed(4294967297));
    expect(state.map?.seed).toBe(normalizeSeed(4294967297));
    expect(state.rng.seed).toBe(normalizeSeed(4294967297));
    expect(parsed).toEqual(state);
    expect(parsed.config).toEqual(state.config);
    expect(JSON.parse(JSON.stringify(state.config))).toEqual(state.config);
  });

  it('rechaza N fuera de 1..6 con error tipado', () => {
    expect(
      configError(() => createInitialState({ players: [] })).code,
    ).toBe('player-count');
    expect(
      configError(() => createInitialState({ players: [...sixPlayers, sixPlayers[0]] }))
        .code,
    ).toBe('player-count');
  });

  it('rechaza arquetipos y variantes que no existen con error tipado', () => {
    expect(
      configError(() =>
        createInitialState({
          players: [
            { archetypeId: 'dragon' as ArchetypeId, variant: 1, name: '' },
          ],
        }),
      ).code,
    ).toBe('unknown-archetype');

    for (const variant of [0, 3] as const) {
      expect(
        configError(() =>
          createInitialState({
            players: [
              { archetypeId: 'warrior', variant: variant as PlayerVariant, name: '' },
            ],
          }),
        ).code,
      ).toBe('invalid-variant');
    }
  });

  it('rechaza semillas no finitas o no enteras sin generar el mapa', () => {
    const generated: number[] = [];
    const spy: MapGenerator = {
      id: 'spy',
      generate(seed, options) {
        generated.push(seed);
        return new BspMapGenerator().generate(seed, options);
      },
    };

    for (const seed of [Number.NaN, Number.POSITIVE_INFINITY, 1.5]) {
      expect(
        configError(() => createInitialState({ seed, generator: spy })).code,
      ).toBe('invalid-seed');
    }
    expect(generated).toEqual([]);
  });

  it('Restart reconstruye desde state.config conservando la party y la semilla', () => {
    const state = createInitialState({ seed: 279837264, players: sixPlayers });

    const result = reduce(state, { type: 'Restart' });

    expect(result.events).toEqual([{ type: 'GameRestarted' }]);
    expect(result.state.config).toEqual(state.config);
    expect(result.state.players.map(({ id, variant, nombre }) => ({ id, variant, nombre }))).toEqual(
      state.players.map(({ id, variant, nombre }) => ({ id, variant, nombre })),
    );
    expect(result.state).toEqual(state);
  });
});

describe('muerte de enemigo y cadáver (REQ-034 R-001/R-004/R-007/T-004/T-007)', () => {
  function fallenEnemy(options: {
    readonly id?: string;
    readonly x?: number;
    readonly y?: number;
    readonly equipment?: EquipmentSlots;
    readonly inventory?: Inventory;
  } = {}) {
    return makeUnit({
      id: options.id ?? 'enemy-1',
      faction: 'enemy',
      x: options.x ?? 6,
      y: options.y ?? 5,
      hp: 0,
      equipmentSlots: options.equipment ?? emptyEquipment(),
      inventory: options.inventory ?? createInventory(2),
    });
  }

  function corpseOf(state: GameState, unitId: string) {
    return state.containers?.find((container) => container.corpseOf === unitId);
  }

  it('transfiere solo los saqueables y descarta el resto con la unidad', () => {
    const equipment: EquipmentSlots = {
      ...emptyEquipment(),
      weapon: itemInstance('item-enemy-1-weapon', 'sword', true),
      armor: itemInstance('item-enemy-1-armor', 'armor', false),
      shield: itemInstance('item-enemy-1-shield', 'shield', true),
    };
    const inventory: Inventory = {
      capacity: 3,
      items: [
        itemInstance('item-enemy-1-backpack-0', 'dagger', true),
        itemInstance('item-enemy-1-backpack-1', 'knife', false),
        null,
      ],
    };
    const state = makeState({
      players: [],
      enemies: [fallenEnemy({ equipment, inventory })],
    });
    const before = state.enemies[0];

    const settled = settleUnitDeath(state, 'enemy-1');
    const corpse = corpseOf(settled, 'enemy-1');

    // Orden estable: huecos de EQUIPMENT_SLOTS y después la mochila.
    expect(corpse?.items.map((item) => item?.id)).toEqual([
      'item-enemy-1-weapon',
      'item-enemy-1-shield',
      'item-enemy-1-backpack-0',
    ]);
    expect(corpse?.capacity).toBe(3);
    expect(corpse).toMatchObject({
      id: corpseId('enemy-1'),
      kind: 'corpse',
      corpseOf: 'enemy-1',
      x: 6,
      y: 5,
    });

    // El enemigo permanece en `enemies` con 0 PV, identidad y stats.
    expect(settled.enemies).toHaveLength(1);
    const dead = settled.enemies[0];
    expect(dead).toMatchObject({ id: 'enemy-1', hp: 0, x: 6, y: 5 });
    expect(dead.nombre).toBe(before.nombre);
    expect(dead.stats).toEqual(before.stats);
    expect(dead.ghost).toBeUndefined();
    expect(dead.equipment).toEqual(emptyEquipment());
    expect(dead.inventory).toEqual({ capacity: 3, items: [null, null, null] });

    // Los no saqueables no quedan en ninguna contención.
    const ids = allInstances(settled).map((instance) => instance.id);
    expect(ids).not.toContain('item-enemy-1-armor');
    expect(ids).not.toContain('item-enemy-1-backpack-1');
    expect(locateInstance(settled, 'item-enemy-1-weapon')).toEqual({
      kind: 'container',
      containerId: corpseId('enemy-1'),
      index: 0,
    });
  });

  it('sin ningún saqueable no crea contenedor y vacía la unidad', () => {
    const state = makeState({
      players: [],
      enemies: [
        fallenEnemy({
          equipment: {
            ...emptyEquipment(),
            weapon: itemInstance('item-enemy-1-weapon', 'sword', false),
          },
          inventory: {
            capacity: 2,
            items: [itemInstance('item-enemy-1-backpack-0', 'dagger', false), null],
          },
        }),
      ],
    });

    const settled = settleUnitDeath(state, 'enemy-1');

    expect(settled.containers).toEqual([]);
    expect(settled.enemies[0].equipment).toEqual(emptyEquipment());
    expect(settled.enemies[0].inventory.items.every((item) => item === null)).toBe(true);
    expect(allInstances(settled)).toEqual([]);
    // Idempotente: repetir no crea nada ni cambia la referencia.
    expect(settleUnitDeath(settled, 'enemy-1')).toBe(settled);
  });

  it('la muerte por ataque deja el cadáver en la casilla y la victoria no cambia', () => {
    const state = makeState({
      players: [makeUnit({ id: 'player-1', faction: 'player', x: 5, y: 5 })],
      enemies: [
        makeUnit({
          id: 'enemy-1',
          faction: 'enemy',
          x: 6,
          y: 5,
          hp: 1,
          equipmentSlots: {
            ...emptyEquipment(),
            weapon: itemInstance('item-enemy-1-weapon', 'sword', true),
          },
          inventory: createInventory(),
        }),
      ],
      rng: rngForDice([6, 1, 3, 3]),
    });

    const result = reduce(state, {
      type: 'Attack',
      unitId: 'player-1',
      targetId: 'enemy-1',
    });

    expect(result.events).toContainEqual({ type: 'UnitDied', unitId: 'enemy-1' });
    expect(result.state.enemies).toHaveLength(1);
    expect(result.state.enemies[0].hp).toBe(0);
    expect(corpseOf(result.state, 'enemy-1')).toMatchObject({
      id: corpseId('enemy-1'),
      kind: 'corpse',
      x: 6,
      y: 5,
      capacity: 1,
    });
    expect(result.state.status).toBe('victory');
  });

  it('la réplica del jugador que mata al enemigo también crea su cadáver', () => {
    const state = makeState({
      players: [makeUnit({ id: 'player-1', faction: 'player', x: 5, y: 5 })],
      enemies: [
        makeUnit({
          id: 'enemy-1',
          faction: 'enemy',
          x: 6,
          y: 5,
          hp: 1,
          equipmentSlots: {
            ...emptyEquipment(),
            weapon: itemInstance('item-enemy-1-weapon', 'sword', true),
          },
          inventory: createInventory(),
        }),
      ],
      rng: rngForDice([1, 6, 6, 1, 3, 3]),
    });

    const result = resolveAttack(state, 'enemy-1', 'player-1');

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.events.map((event) => event.type)).toEqual([
      'AttackPerformed',
      'ReplicaPerformed',
      'UnitDied',
    ]);
    expect(result.state.players[0].hp).toBeGreaterThan(0);
    expect(result.state.enemies[0].hp).toBe(0);
    expect(corpseOf(result.state, 'enemy-1')?.capacity).toBe(1);
  });

  it('el cadáver no bloquea y varios comparten casilla con un vivo', () => {
    const state = makeState({
      players: [makeUnit({ id: 'player-1', faction: 'player', x: 4, y: 5 })],
      enemies: [
        fallenEnemy({
          id: 'enemy-1',
          x: 5,
          y: 5,
          equipment: {
            ...emptyEquipment(),
            weapon: itemInstance('item-enemy-1-weapon', 'sword', true),
          },
        }),
        fallenEnemy({
          id: 'enemy-2',
          x: 5,
          y: 5,
          equipment: {
            ...emptyEquipment(),
            weapon: itemInstance('item-enemy-2-weapon', 'axe', true),
          },
        }),
      ],
    });

    const settled = settleUnitDeath(
      settleUnitDeath(state, 'enemy-1'),
      'enemy-2',
    );
    expect(settled.containers).toHaveLength(2);
    expect(isOccupied(settled, 5, 5)).toBe(false);

    const moved = reduce(settled, { type: 'Move', unitId: 'player-1', dx: 1, dy: 0 });
    expect(moved.state.players[0].x).toBe(5);
    expect(moved.state.players[0].y).toBe(5);
    expect(moved.state.containers).toHaveLength(2);
  });

  it('es idempotente, serializable y no toca el RNG', () => {
    const state = makeState({
      players: [makeUnit({ id: 'player-1', faction: 'player', x: 4, y: 5 })],
      enemies: [
        fallenEnemy({
          equipment: {
            ...emptyEquipment(),
            weapon: itemInstance('item-enemy-1-weapon', 'sword', true),
            armor: itemInstance('item-enemy-1-armor', 'armor', false),
          },
        }),
      ],
      rng: createRng(1017),
    });

    const settled = settleUnitDeath(state, 'enemy-1');

    expect(settleUnitDeath(settled, 'enemy-1')).toBe(settled);
    expect(settled.rng).toEqual(state.rng);
    expect(JSON.parse(JSON.stringify(settled))).toEqual(settled);
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
            lootable: true,
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
