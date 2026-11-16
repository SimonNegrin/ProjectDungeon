import { beforeAll, describe, expect, it } from 'vitest';
import {
  SAVE_FORMAT_VERSION,
  SaveBuildError,
  buildSaveFiles,
  createInitialState,
  createInventory,
  emptyEquipment,
  equipmentFromLegacy,
  inventoryFromIds,
  itemInstance,
  parseManifest,
  parseSave,
  readSaveFiles,
  reduce,
  rollDie,
  settleUnitDeath,
  type GameState,
  type PlayerConfig,
  type SaveErrorCode,
  type SaveFileInputs,
  type SaveManifest,
  type SaveResult,
} from '../../../src/game/index';
import { makeUnit } from './helpers';

const SEED = 1017;
const CREATED_AT = '2026-11-15T19:05:00Z';
const GAME_VERSION = '0.1.0';
const PLAYERS: readonly PlayerConfig[] = [
  { archetypeId: 'warrior', variant: 1, name: 'Ana' },
  { archetypeId: 'mage', variant: 2, name: 'Bru' },
];

type JsonObject = Record<string, unknown>;

function object(value: unknown): JsonObject {
  return value as JsonObject;
}

function array(value: unknown): unknown[] {
  return value as unknown[];
}

function buildFiles(state: GameState) {
  return buildSaveFiles(state, { gameVersion: GAME_VERSION, createdAt: CREATED_AT });
}

function expectManifestError(
  input: string | null | undefined,
  code: SaveErrorCode,
): void {
  const result = parseManifest(input);
  expect(result.ok).toBe(false);
  if (!result.ok) expect(result.error.code).toBe(code);
}

function expectSaveError(input: string | null | undefined, code: SaveErrorCode): void {
  const result = parseSave(input);
  expect(result.ok).toBe(false);
  if (!result.ok) expect(result.error.code).toBe(code);
}

function requireValue<T>(result: SaveResult<T>): T {
  if (!result.ok) throw new Error(`Se esperaba éxito: ${result.error.code}`);
  return result.value;
}

/**
 * Estado real y determinista con todos los campos de la v1: se parte de
 * `createInitialState` con dos jugadores, se avanza un turno con un comando y se
 * enriquece con unidades/contenedores/objetos para cubrir fantasmas, cadáveres,
 * `lootable` true/false, equipo, mochila, maná y estado de IA.
 *
 * La ruta pública de comandos no garantiza en un número acotado de turnos un
 * fantasma, un cadáver de jugador y un cadáver de enemigo; esa parte del
 * escenario se construye con los constructores públicos del motor.
 */
function makeCompleteState(): GameState {
  const initial = createInitialState({ seed: SEED, players: PLAYERS });
  const advanced = reduce(initial, { type: 'EndTurn' }).state;
  const map = advanced.map;
  if (!map) throw new Error('El mapa de la fixture es obligatorio.');
  const playerOne = advanced.players[0];
  const playerTwo = advanced.players[1];
  const enemyAnchor = map.spawns.enemy;

  const alivePlayer = makeUnit({
    id: 'player-1',
    nombre: 'Ana',
    faction: 'player',
    archetypeId: 'warrior',
    variant: 1,
    x: playerOne.x,
    y: playerOne.y,
    hp: 17,
    maxHp: 20,
    mp: 2,
    maxMp: 6,
    mana: { current: 0, max: 0 },
    stats: { fuerza: 2 },
    actions: 1,
    actionsMax: 3,
    spellsCast: 0,
    equipmentSlots: equipmentFromLegacy('player-1', {
      weaponId: 'sword',
      armorId: 'armor',
      shieldId: 'shield',
    }),
    inventory: inventoryFromIds('player-1', ['dagger', 'hammer']),
    awareness: 'alert',
    home: { x: playerOne.x, y: playerOne.y },
  });

  const ghost = makeUnit({
    id: 'player-2',
    nombre: 'Bru',
    faction: 'player',
    archetypeId: 'mage',
    variant: 2,
    x: playerTwo.x,
    y: playerTwo.y,
    hp: 0,
    maxHp: 20,
    ghost: true,
    mp: 6,
    maxMp: 6,
    magicLevel: 2,
    mana: { current: 3, max: 8 },
    actions: 1,
    actionsMax: 1,
    spellsCast: 1,
    equipmentSlots: emptyEquipment(),
    inventory: createInventory(),
    awareness: 'alert',
    home: { x: playerTwo.x, y: playerTwo.y },
  });

  const deadEnemy = makeUnit({
    id: 'enemy-1',
    nombre: 'Centinela',
    faction: 'enemy',
    enemyType: 'sentinel',
    x: enemyAnchor.x,
    y: enemyAnchor.y,
    hp: 0,
    equipmentSlots: emptyEquipment(),
    inventory: createInventory(),
    awareness: 'dormant',
    home: { x: enemyAnchor.x, y: enemyAnchor.y },
  });

  const liveEnemy = makeUnit({
    id: 'enemy-2',
    nombre: 'Bruto',
    faction: 'enemy',
    enemyType: 'brute',
    x: enemyAnchor.x + 1,
    y: enemyAnchor.y,
    hp: 5,
    maxHp: 12,
    mp: 1,
    maxMp: 4,
    stats: { fuerza: 2, resistencia: { slash: 'resistant', magic: 'vulnerable' } },
    actions: 2,
    actionsMax: 2,
    equipmentSlots: equipmentFromLegacy('enemy-2', {
      weaponId: 'axe',
      armorId: 'armor',
      shieldId: null,
    }),
    inventory: inventoryFromIds('enemy-2', ['dagger']),
    awareness: 'returning',
    fleeing: true,
    home: { x: enemyAnchor.x + 1, y: enemyAnchor.y },
    lastKnown: { x: playerOne.x, y: playerOne.y },
    alertTurns: 2,
    hasShouted: true,
  });

  return {
    ...advanced,
    players: [alivePlayer, ghost],
    enemies: [deadEnemy, liveEnemy],
    groundItems: [
      {
        ...itemInstance('item-ground-lootable', 'sword', true),
        x: playerOne.x,
        y: playerOne.y,
      },
      {
        ...itemInstance('item-ground-not-lootable', 'dagger', false),
        x: playerOne.x,
        y: playerOne.y,
      },
    ],
    containers: [
      {
        id: 'corpse-player-2',
        x: playerTwo.x,
        y: playerTwo.y,
        capacity: 2,
        items: [
          itemInstance('item-corpse-player-sword', 'sword', true),
          itemInstance('item-corpse-player-dagger', 'dagger', true),
        ],
        kind: 'corpse',
        corpseOf: 'player-2',
      },
      {
        id: 'corpse-enemy-1',
        x: enemyAnchor.x,
        y: enemyAnchor.y,
        capacity: 1,
        items: [itemInstance('item-corpse-enemy-axe', 'axe', true)],
        kind: 'corpse',
        corpseOf: 'enemy-1',
      },
      {
        id: 'chest-1',
        x: playerOne.x,
        y: playerOne.y,
        capacity: 3,
        items: [
          itemInstance('item-chest-lootable', 'hammer', true),
          itemInstance('item-chest-not-lootable', 'dagger', false),
          null,
        ],
        kind: 'chest',
      },
      {
        id: 'container-legacy',
        x: playerOne.x,
        y: playerOne.y,
        capacity: 2,
        items: [itemInstance('item-legacy-not-lootable', 'armor', false), null],
      },
    ],
  };
}

function mutatedSave(mutate: (save: JsonObject) => void): string {
  const data = JSON.parse(buildFiles(STATE).save) as JsonObject;
  mutate(data);
  return JSON.stringify(data);
}

let STATE: GameState;

beforeAll(() => {
  STATE = makeCompleteState();
});

describe('esquema de guardado v1: ida y vuelta (REQ-024 T-001/T-002)', () => {
  it('serializa un estado completo, lo carga y vuelve a serializar byte a byte', () => {
    const first = buildFiles(STATE);
    const manifest = requireValue(parseManifest(first.manifest));
    const loaded = requireValue(parseSave(first.save));

    expect(manifest.format_version).toBe(SAVE_FORMAT_VERSION);
    expect(manifest.seed).toBe(SEED);
    expect(manifest.summary.players).toEqual([
      { name: 'Ana', archetype: 'warrior' },
      { name: 'Bru', archetype: 'mage' },
    ]);
    expect(manifest.summary.round).toBe(STATE.round);
    expect(manifest.summary.turn).toBe(STATE.round);
    expect(manifest.summary.phase).toBe(STATE.phase);

    expect(JSON.stringify(loaded)).toBe(JSON.stringify(STATE));
    expect(loaded.map).toEqual(STATE.map);
    expect(loaded.grid).toEqual(STATE.grid);
    expect(loaded.config).toEqual(STATE.config);

    const second = buildFiles(loaded);
    expect(second).toEqual(first);
  });

  it('conserva el siguiente resultado del RNG sin consumirlo al cargar', () => {
    const saved = buildFiles(STATE);
    const before = rollDie(STATE.rng);
    const loaded = requireValue(parseSave(saved.save));
    const after = rollDie(loaded.rng);

    expect(after.die).toBe(before.die);
    expect(after.rng).toEqual(before.rng);
    expect(loaded.rng).toEqual(STATE.rng);
    expect(rollDie(STATE.rng)).toEqual(before);
  });

  it('una partida recién creada y un turno por comando también hacen round-trip', () => {
    const initial = createInitialState({ seed: SEED });
    const advanced = reduce(initial, { type: 'EndTurn' }).state;
    const saved = buildFiles(advanced);
    const loaded = requireValue(parseSave(saved.save));
    expect(JSON.stringify(loaded)).toBe(JSON.stringify(advanced));
  });

  it('hace round-trip con fantasmas y cadáveres asentados por el motor', () => {
    const initial = createInitialState({ seed: SEED });
    const map = initial.map;
    if (!map) throw new Error('El mapa de la fixture es obligatorio.');
    const anchor = map.spawns.enemy;

    const deadPlayer = makeUnit({
      id: 'player-1',
      nombre: 'Guerrero',
      faction: 'player',
      archetypeId: 'warrior',
      variant: 1,
      x: initial.players[0].x,
      y: initial.players[0].y,
      hp: 0,
      equipmentSlots: equipmentFromLegacy('player-1', {
        weaponId: 'sword',
        armorId: 'armor',
        shieldId: 'shield',
      }),
      inventory: inventoryFromIds('player-1', ['dagger']),
    });
    const deadEnemy = makeUnit({
      id: 'enemy-1',
      faction: 'enemy',
      enemyType: 'sentinel',
      x: anchor.x,
      y: anchor.y,
      hp: 0,
      equipmentSlots: equipmentFromLegacy('enemy-1', {
        weaponId: 'sword',
        armorId: null,
        shieldId: 'shield',
      }),
      inventory: createInventory(),
    });

    const withDeaths: GameState = {
      ...initial,
      players: [deadPlayer],
      enemies: [deadEnemy],
    };
    const settled = settleUnitDeath(
      settleUnitDeath(withDeaths, 'player-1'),
      'enemy-1',
    );
    const loaded = requireValue(parseSave(buildFiles(settled).save));

    expect(loaded.players[0].ghost).toBe(true);
    expect(
      loaded.containers
        ?.filter((container) => container.corpseOf !== undefined)
        .map((container) => container.corpseOf),
    ).toEqual(['player-1', 'enemy-1']);
    expect(JSON.stringify(loaded)).toBe(JSON.stringify(settled));
  });

  it('no incluye claves de presentación en la partida ni en el manifiesto', () => {
    const saved = buildFiles(STATE);
    const forbidden = new Set(['timeline', 'camera', 'cursor', 'panel']);

    const collect = (value: unknown, found: string[]): string[] => {
      if (Array.isArray(value)) {
        for (const item of value) collect(item, found);
      } else if (typeof value === 'object' && value !== null) {
        for (const [key, child] of Object.entries(value)) {
          if (forbidden.has(key)) found.push(key);
          collect(child, found);
        }
      }
      return found;
    };

    expect(collect(JSON.parse(saved.save), [])).toEqual([]);
    expect(collect(JSON.parse(saved.manifest), [])).toEqual([]);
  });
});

describe('esquema de guardado v1: lootable, cadáveres y contenedores (REQ-034 T-010)', () => {
  it('conserva lootable true/false y los contenedores de cadáver sin recalcular nada', () => {
    const saved = buildFiles(STATE);
    const raw = object(JSON.parse(saved.save));
    const rawContainers = array(raw.containers).map(object);
    const loaded = requireValue(parseSave(saved.save));

    expect(loaded.containers?.map((container) => container.id)).toEqual([
      'corpse-player-2',
      'corpse-enemy-1',
      'chest-1',
      'container-legacy',
    ]);

    const playerCorpse = loaded.containers?.[0];
    expect(playerCorpse).toMatchObject({ kind: 'corpse', corpseOf: 'player-2' });
    expect(playerCorpse?.items[0]).toMatchObject({ itemId: 'sword', lootable: true });

    const enemyCorpse = loaded.containers?.[1];
    expect(enemyCorpse).toMatchObject({ kind: 'corpse', corpseOf: 'enemy-1' });
    expect(enemyCorpse?.items[0]?.lootable).toBe(true);

    const chest = loaded.containers?.[2];
    expect(chest).toMatchObject({ kind: 'chest', capacity: 3 });
    expect(chest?.corpseOf).toBeUndefined();
    expect(chest?.items[1]?.lootable).toBe(false);

    const legacy = loaded.containers?.[3];
    expect(legacy?.kind).toBeUndefined();
    expect(legacy?.corpseOf).toBeUndefined();
    expect(legacy?.items[0]?.lootable).toBe(false);

    expect(rawContainers[0]).toEqual({
      id: 'corpse-player-2',
      x: expect.any(Number),
      y: expect.any(Number),
      capacity: 2,
      items: [
        { id: 'item-corpse-player-sword', itemId: 'sword', lootable: true },
        { id: 'item-corpse-player-dagger', itemId: 'dagger', lootable: true },
      ],
      kind: 'corpse',
      corpseOf: 'player-2',
    });

    const ground = array(raw.groundItems).map(object);
    expect(ground.some((item) => item.lootable === false)).toBe(true);
    expect(ground.some((item) => item.lootable === true)).toBe(true);
  });

  it('conserva el fantasma solo donde está presente y su estado de IA', () => {
    const saved = buildFiles(STATE);
    const raw = object(JSON.parse(saved.save));
    const rawGhost = object(array(raw.players)[1]);
    const loaded = requireValue(parseSave(saved.save));

    expect(Object.prototype.hasOwnProperty.call(rawGhost, 'ghost')).toBe(true);
    expect(rawGhost.ghost).toBe(true);
    expect(
      Object.prototype.hasOwnProperty.call(object(array(raw.players)[0]), 'ghost'),
    ).toBe(false);

    const ghost = loaded.players[1];
    expect(ghost.ghost).toBe(true);
    expect(ghost.mana).toEqual({ current: 3, max: 8 });
    expect(ghost.spellsCast).toBe(1);
    expect(ghost.actions).toEqual({ max: 1, remaining: 1 });
    expect(loaded.players[0].ghost).toBeUndefined();

    const enemy = loaded.enemies[1];
    expect(enemy).toMatchObject({
      awareness: 'returning',
      fleeing: true,
      alertTurns: 2,
      hasShouted: true,
      lastKnown: { x: STATE.players[0].x, y: STATE.players[0].y },
    });
    expect(enemy.stats.resistencia).toEqual({
      slash: 'resistant',
      magic: 'vulnerable',
    });
  });

  it('no muta el estado original al construir, validar ni cargar', () => {
    const before = JSON.stringify(STATE);
    const saved = buildFiles(STATE);
    parseManifest(saved.manifest);
    parseSave(saved.save);
    readSaveFiles(saved);
    expect(JSON.stringify(STATE)).toBe(before);
  });
});

describe('manifiesto v1 (REQ-024 T-004)', () => {
  it('acepta un game_version informativo sin bloquear la carga', () => {
    const files = buildSaveFiles(STATE, {
      gameVersion: '9.9.9-informativo',
      createdAt: CREATED_AT,
    });
    const manifest = requireValue(parseManifest(files.manifest));
    expect(manifest.game_version).toBe('9.9.9-informativo');
  });

  it.each([
    ['ausente', null, 'manifest-missing'],
    ['vacío', '', 'manifest-missing'],
    ['JSON roto', '{', 'manifest-json'],
    ['raíz no objeto', '[]', 'manifest-invalid'],
  ] as const)('rechaza manifiesto %s', (_label, input, code) => {
    expectManifestError(input, code);
  });

  it('rechaza una versión de formato desconocida sin migrar', () => {
    const files = buildFiles(STATE);
    const data = object(JSON.parse(files.manifest));
    data.format_version = 2;
    expectManifestError(JSON.stringify(data), 'manifest-version');
  });

  it.each([
    [
      'campo extra en la raíz',
      (data: JsonObject) => {
        data.extra = true;
      },
    ],
    [
      'campo extra en summary',
      (data: JsonObject) => {
        object(data.summary).extra = 1;
      },
    ],
    [
      'campo extra en un jugador',
      (data: JsonObject) => {
        object(array(object(data.summary).players)[0]).extra = 1;
      },
    ],
    [
      'game_version vacío',
      (data: JsonObject) => {
        data.game_version = '';
      },
    ],
    [
      'game_version solo espacios',
      (data: JsonObject) => {
        data.game_version = '   ';
      },
    ],
    [
      'created_at sin Z',
      (data: JsonObject) => {
        data.created_at = '2026-11-15T19:05:00';
      },
    ],
    [
      'created_at no ISO',
      (data: JsonObject) => {
        data.created_at = 'ayer';
      },
    ],
    [
      'seed no entero',
      (data: JsonObject) => {
        data.seed = 1.5;
      },
    ],
    [
      'fase desconocida',
      (data: JsonObject) => {
        object(data.summary).phase = 'players';
      },
    ],
    [
      'turno cero',
      (data: JsonObject) => {
        object(data.summary).turn = 0;
      },
    ],
    [
      'sin jugadores',
      (data: JsonObject) => {
        object(data.summary).players = [];
      },
    ],
    [
      'nombre vacío',
      (data: JsonObject) => {
        object(array(object(data.summary).players)[0]).name = '';
      },
    ],
    [
      'arquetipo desconocido',
      (data: JsonObject) => {
        object(array(object(data.summary).players)[0]).archetype = 'paladin';
      },
    ],
  ] as const)('rechaza %s', (_label, mutate) => {
    const files = buildFiles(STATE);
    const data = object(JSON.parse(files.manifest));
    mutate(data);
    expectManifestError(JSON.stringify(data), 'manifest-invalid');
  });
});

describe('partida v1: validación estricta (REQ-024 T-005)', () => {
  it.each([
    ['ausente', null, 'save-missing'],
    ['vacía', '', 'save-missing'],
    ['JSON roto', '{', 'save-json'],
    ['raíz no objeto', '"hola"', 'save-invalid'],
  ] as const)('rechaza partida %s', (_label, input, code) => {
    expectSaveError(input, code);
  });

  it('rechaza una versión de formato desconocida', () => {
    const data = object(JSON.parse(buildFiles(STATE).save));
    data.format_version = 2;
    expectSaveError(JSON.stringify(data), 'save-version');
  });

  it.each([
    [
      'campo extra en la raíz',
      (data: JsonObject) => {
        data.timeline = [];
      },
    ],
    [
      'campo extra en una unidad',
      (data: JsonObject) => {
        object(array(data.players)[0]).extra = 1;
      },
    ],
    [
      'campo extra en stats',
      (data: JsonObject) => {
        object(object(array(data.players)[0]).stats).extra = 1;
      },
    ],
    [
      'tipo de resistencia desconocido',
      (data: JsonObject) => {
        object(object(object(array(data.players)[0]).stats).resistencia).fire = 'normal';
      },
    ],
    [
      'banda de resistencia desconocida',
      (data: JsonObject) => {
        object(object(object(array(data.players)[0]).stats).resistencia).slash = 'immune';
      },
    ],
    [
      'hp no numérico',
      (data: JsonObject) => {
        object(array(data.players)[0]).hp = '17';
      },
    ],
    [
      'null inesperado',
      (data: JsonObject) => {
        object(array(data.players)[0]).hp = null;
      },
    ],
    [
      'turn distinto de round',
      (data: JsonObject) => {
        data.turn = (data.round as number) + 1;
      },
    ],
    [
      'semilla distinta del RNG',
      (data: JsonObject) => {
        data.seed = SEED + 1;
      },
    ],
    [
      'estado del RNG no entero',
      (data: JsonObject) => {
        object(data.rng).state = 0.5;
      },
    ],
    [
      'grid distinto del mapa',
      (data: JsonObject) => {
        array(object(data.grid).tiles)[0] = 'floor';
      },
    ],
    [
      'activo inexistente',
      (data: JsonObject) => {
        data.activePlayerId = 'player-9';
      },
    ],
    [
      'id de jugador fuera del contrato',
      (data: JsonObject) => {
        object(array(data.players)[0]).id = 'player-7';
      },
    ],
    [
      'arquetipo distinto de la party',
      (data: JsonObject) => {
        object(array(data.players)[0]).archetypeId = 'mage';
      },
    ],
    [
      'campo extra en el mapa',
      (data: JsonObject) => {
        object(data.map).extra = 1;
      },
    ],
    [
      'posición fuera de rango',
      (data: JsonObject) => {
        object(array(data.players)[0]).x = 9999;
      },
    ],
    [
      'corpseOf desconocido',
      (data: JsonObject) => {
        object(array(data.containers)[0]).corpseOf = 'unit-inexistente';
      },
    ],
    [
      'corpseOf en un cofre',
      (data: JsonObject) => {
        const legacy = object(array(data.containers)[3]);
        legacy.kind = 'chest';
        legacy.corpseOf = 'player-2';
      },
    ],
    [
      'kind desconocido',
      (data: JsonObject) => {
        object(array(data.containers)[2]).kind = 'barrel';
      },
    ],
    [
      'capacidad menor que los objetos',
      (data: JsonObject) => {
        object(array(data.containers)[2]).capacity = 1;
      },
    ],
    [
      'itemId desconocido',
      (data: JsonObject) => {
        object(array(object(array(data.containers)[2]).items)[0]).itemId = 'laser';
      },
    ],
    [
      'instancia sin lootable',
      (data: JsonObject) => {
        delete object(array(object(array(data.containers)[2]).items)[0]).lootable;
      },
    ],
    [
      'id de instancia duplicado',
      (data: JsonObject) => {
        object(array(object(array(data.containers)[2]).items)[1]).id =
          'item-corpse-player-sword';
      },
    ],
  ] as const)('rechaza %s', (_label, mutate) => {
    expectSaveError(mutatedSave(mutate), 'save-invalid');
  });

  it('rechaza números no finitos aunque JSON los admita como 1e999', () => {
    const saved = buildFiles(STATE).save;
    const malformed = saved.replace(/"hp":\d+/, '"hp":1e999');
    expectSaveError(malformed, 'save-invalid');
  });

  it('serializa los cofres iniciales y omite los campos opcionales ausentes', () => {
    const initial = createInitialState({ seed: SEED });
    const saved = buildFiles(initial);
    const raw = object(JSON.parse(saved.save));

    expect(Object.prototype.hasOwnProperty.call(raw, 'containers')).toBe(true);
    expect(Object.prototype.hasOwnProperty.call(raw, 'groundItems')).toBe(true);

    const rawChests = array(raw.containers).map(object);
    expect(rawChests.length).toBeGreaterThanOrEqual(1);
    for (const chest of rawChests) {
      expect(chest.kind).toBe('chest');
      expect(chest.opened).toBe(false);
      expect(Object.prototype.hasOwnProperty.call(chest, 'corpseOf')).toBe(false);
    }

    const loaded = requireValue(parseSave(saved.save));
    expect(JSON.stringify(loaded)).toBe(JSON.stringify(initial));
  });

  it('serializa el estado de apertura de un cofre y lo restaura sin regenerar (REQ-020 T-008)', () => {
    const opened: GameState = {
      ...STATE,
      containers: (STATE.containers ?? []).map((container) =>
        container.id === 'chest-1' ? { ...container, opened: true } : container,
      ),
    };

    const first = buildFiles(opened);
    const rawChest = array(object(JSON.parse(first.save)).containers)
      .map(object)
      .find((container) => container.id === 'chest-1');
    expect(rawChest?.opened).toBe(true);

    const loaded = requireValue(parseSave(first.save));
    expect(loaded.containers).toEqual(opened.containers);
    expect(
      loaded.containers?.find((container) => container.id === 'chest-1')?.opened,
    ).toBe(true);
    expect(buildFiles(loaded).save).toBe(first.save);
  });
});

describe('readSaveFiles (REQ-024 T-004/T-016)', () => {
  it('rechaza el manifiesto ausente antes de interpretar la partida', () => {
    const input: SaveFileInputs = { manifest: null, save: '{' };
    const result = readSaveFiles(input);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('manifest-missing');
  });

  it('rechaza la partida después de un manifiesto válido', () => {
    const files = buildFiles(STATE);
    const result = readSaveFiles({ manifest: files.manifest, save: '{' });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('save-json');
  });

  it('devuelve estado y manifiesto cuando ambos son válidos', () => {
    const files = buildFiles(STATE);
    const value = requireValue(readSaveFiles(files));
    expect(value.manifest).toMatchObject({ seed: SEED, format_version: 1 });
    expect(JSON.stringify(value.state)).toBe(JSON.stringify(STATE));
  });
});

describe('stats inherentes (TASK-0141 R-008)', () => {
  const ARCHETYPES = [
    'warrior',
    'barbarian',
    'rogue',
    'archer',
    'mage',
    'cleric',
    'spellblade',
    'cook',
    'farmer',
  ] as const satisfies readonly PlayerConfig['archetypeId'][];

  it('hace ida y vuelta con los nueve arquetipos, incluidos stats negativos', () => {
    for (const archetypeId of ARCHETYPES) {
      const state = createInitialState({
        seed: SEED,
        players: [{ archetypeId, variant: 1, name: 'Prueba' }],
      });
      const loaded = requireValue(parseSave(buildFiles(state).save));

      expect(loaded.players[0]?.stats, archetypeId).toEqual(
        state.players[0]?.stats,
      );
      expect(loaded.config, archetypeId).toEqual(state.config);
    }
  });

  it('conserva los negativos inherentes de mago y clérigo sin cambios', () => {
    const state = createInitialState({
      seed: SEED,
      players: [
        { archetypeId: 'mage', variant: 1, name: 'Bru' },
        { archetypeId: 'cleric', variant: 2, name: 'Cle' },
      ],
    });
    expect(state.players[0]?.stats.fuerza).toBe(-1);
    expect(state.players[1]?.stats.fuerza).toBe(-1);

    const loaded = requireValue(parseSave(buildFiles(state).save));

    expect(loaded.players.map((player) => player.stats)).toEqual(
      state.players.map((player) => player.stats),
    );
    expect(loaded.players.map((player) => player.id)).toEqual(
      state.players.map((player) => player.id),
    );
  });

  it('admite los extremos del rango acotado de los cuatro atributos', () => {
    const state = createInitialState({
      seed: SEED,
      players: [{ archetypeId: 'mage', variant: 1, name: 'Bru' }],
    });
    const data = object(JSON.parse(buildFiles(state).save));
    const stats = object(object(array(data.players)[0]).stats);
    stats.habilidad = -9;
    stats.fuerza = 9;
    stats.defensa = -9;
    stats.punteria = 9;

    const loaded = requireValue(parseSave(JSON.stringify(data)));

    expect(loaded.players[0]?.stats).toMatchObject({
      habilidad: -9,
      fuerza: 9,
      defensa: -9,
      punteria: 9,
    });
  });

  it.each([
    ['no entero', 1.5],
    ['por encima del rango', 10],
    ['por debajo del rango', -10],
  ] as const)('rechaza un stat %s', (_label, value) => {
    const state = createInitialState({
      seed: SEED,
      players: [{ archetypeId: 'mage', variant: 1, name: 'Bru' }],
    });
    const data = object(JSON.parse(buildFiles(state).save));
    object(object(array(data.players)[0]).stats).fuerza = value;

    expectSaveError(JSON.stringify(data), 'save-invalid');
  });
});

describe('construcción del guardado', () => {
  it('exige fecha ISO UTC y versión de juego no vacía', () => {
    expect(() =>
      buildSaveFiles(STATE, { gameVersion: GAME_VERSION, createdAt: '2026-11-15' }),
    ).toThrow(SaveBuildError);
    expect(() =>
      buildSaveFiles(STATE, { gameVersion: '   ', createdAt: CREATED_AT }),
    ).toThrow(SaveBuildError);
  });

  it('documenta el modelo actual de Container en la v1', () => {
    const loaded = requireValue(parseSave(buildFiles(STATE).save));
    const manifest: SaveManifest = requireValue(parseManifest(buildFiles(STATE).manifest));

    expect(SAVE_FORMAT_VERSION).toBe(1);
    expect(manifest.format_version).toBe(1);
    expect(loaded.containers?.some((container) => container.kind === 'corpse')).toBe(
      true,
    );
    expect(
      loaded.containers?.some(
        (container) => container.kind === undefined && container.items.length > 0,
      ),
    ).toBe(true);
  });
});
