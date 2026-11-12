import { describe, expect, it } from 'vitest';
import {
  BspMapGenerator,
  createInitialState,
  createRoomGrid,
  DEFAULT_MAP_OPTIONS,
  DEFAULT_MAP_SEED,
  reduce,
  resolveMapOptions,
  validateGeneratedMap,
  type GameEvent,
  type GeneratedMap,
  type MapGenerator,
  type MapOptions,
} from '../../../src/game/index';
import { GrowthMapGenerator } from '../../../src/game/chambers/variants/growth';
import { makeState, makeUnit, rngForDice } from './helpers';

function attackDamage(events: readonly GameEvent[]): number {
  const attack = events.find(
    (event): event is Extract<GameEvent, { type: 'AttackPerformed' }> =>
      event.type === 'AttackPerformed',
  );
  if (!attack) throw new Error('se esperaba un ataque');
  return attack.damage;
}

function stubMap(seed: number, options: MapOptions = {}): GeneratedMap {
  const grid = createRoomGrid(20, 20);
  return {
    seed,
    width: grid.width,
    height: grid.height,
    tiles: grid.tiles,
    rooms: [],
    corridors: [],
    doors: [],
    spawns: {
      player: { x: 5, y: 5 },
      enemy: { x: 6, y: 5 },
      distance: 1,
    },
    warnings: [],
    options: resolveMapOptions(options).options,
  };
}

class StubGenerator implements MapGenerator {
  readonly id = 'stub';
  readonly calls: Array<{ readonly seed: number; readonly options?: MapOptions }> = [];

  generate(seed: number, options: MapOptions = {}): GeneratedMap {
    this.calls.push({ seed, options });
    return stubMap(seed, options);
  }
}

describe('createInitialState por defecto y BSP inyectado', () => {
  it('usa GrowthMapGenerator por defecto con 22×18 y los enemigos del mapa', () => {
    const state = createInitialState();
    const map = state.map;
    if (!map) throw new Error('El estado inicial debe incluir mapa');

    expect(map).toEqual(new GrowthMapGenerator().generate(DEFAULT_MAP_SEED));
    expect(map.seed).toBe(DEFAULT_MAP_SEED);
    expect(map.width).toBe(22);
    expect(map.height).toBe(18);
    expect(map.options.mapWidth).toBe(22);
    expect(map.options.mapHeight).toBe(18);
    expect(state.grid).toEqual({
      width: map.width,
      height: map.height,
      tiles: map.tiles,
    });
    expect(state.players[0]).toMatchObject({
      x: map.spawns.player.x,
      y: map.spawns.player.y,
    });
    expect(state.enemies).toHaveLength(map.enemies?.length ?? 0);
    expect(state.enemies[0]).toMatchObject({
      id: map.enemies?.[0].id,
      enemyType: map.enemies?.[0].type,
      x: map.enemies?.[0].x,
      y: map.enemies?.[0].y,
      home: map.enemies?.[0].home,
    });
  });

  it('acepta semilla y opciones con BSP inyectado', () => {
    const state = createInitialState({
      generator: new BspMapGenerator(),
      seed: 42,
      options: { mapWidth: 24, mapHeight: 24 },
    });

    expect(state.map?.seed).toBe(42);
    expect(state.grid.width).toBe(24);
    expect(state.grid.height).toBe(24);
    expect(state.map?.options.mapWidth).toBe(24);
    expect(state.map?.rooms.length).toBeGreaterThanOrEqual(8);
  });

  it('BSP inyectado sigue produciendo 32×32 y cuatro enemigos', () => {
    const state = createInitialState({ generator: new BspMapGenerator() });

    expect(state.map).toEqual(
      new BspMapGenerator().generate(DEFAULT_MAP_SEED, DEFAULT_MAP_OPTIONS),
    );
    expect(state.grid).toMatchObject({ width: 32, height: 32 });
    expect(state.enemies).toHaveLength(4);
    expect(state.enemies[0].x).toBe(state.map?.spawns.enemy.x);
    expect(state.enemies[0].y).toBe(state.map?.spawns.enemy.y);
  });

  it('varias semillas BSP producen mapas aceptados por el validador', () => {
    for (const seed of [DEFAULT_MAP_SEED, 1, 42, 1234, 987654]) {
      const state = createInitialState({ generator: new BspMapGenerator(), seed });
      expect(state.map, `semilla ${seed}`).toBeDefined();
      const validation = validateGeneratedMap(state.map!);
      expect(validation.issues, `semilla ${seed}`).toEqual([]);
      expect(validation.ok).toBe(true);
      const wide = state.map?.corridors.filter((corridor) => corridor.width === 2) ?? [];
      expect(wide.length).toBeGreaterThanOrEqual(1);
      expect(wide.length).toBeLessThanOrEqual(2);
    }
  });

  it('el estado con mapa es serializable y el motor lo conserva', () => {
    const state = createInitialState({ seed: 7 });
    const parsed = JSON.parse(JSON.stringify(state)) as typeof state;

    expect(parsed).toEqual(state);

    const result = reduce(parsed, { type: 'EndTurn' });
    expect(result.state.map).toEqual(state.map);
  });
});

describe('createInitialState con un MapGenerator inyectado', () => {
  it('pasa semilla y opciones al stub y usa su rejilla y spawns', () => {
    const stub = new StubGenerator();
    const state = createInitialState({
      generator: stub,
      seed: 1234,
      options: { roomTarget: 8, loopRatio: 10 },
    });

    expect(stub.calls).toHaveLength(1);
    expect(stub.calls[0].seed).toBe(1234);
    expect(stub.calls[0].options).toEqual({ roomTarget: 8, loopRatio: 10 });
    expect(state.grid.width).toBe(20);
    expect(state.grid.height).toBe(20);
    expect(state.players[0]).toMatchObject({ x: 5, y: 5 });
    expect(state.enemies[0]).toMatchObject({ x: 6, y: 5 });
    expect(state.map?.seed).toBe(1234);
    expect(state.map?.options.roomTarget).toBe(8);
    expect(state.map?.options.loopRatio).toBe(10);
  });

  it('mantiene la compatibilidad con createInitialState(generator, options)', () => {
    const stub = new StubGenerator();
    const state = createInitialState(stub, { mapWidth: 40, mapHeight: 40 });

    expect(stub.calls).toHaveLength(1);
    expect(stub.calls[0].seed).toBe(DEFAULT_MAP_SEED);
    expect(stub.calls[0].options).toEqual({ mapWidth: 40, mapHeight: 40 });
    expect(state.map?.options.mapWidth).toBe(40);
    expect(state.map?.options.mapHeight).toBe(40);
  });

  it('el motor funciona con el mapa del stub: movimiento, ataque, fin de turno y reinicio', () => {
    const stub = new StubGenerator();
    const initialState = createInitialState({ generator: stub });
    // Fixture legacy: el motor antiguo hacía actuar al enemigo desde el turno 1.
    // La percepción llega en TASK-0034; se conserva esa intención con un enemigo
    // alerta sin tocar las aserciones de movimiento, ataque y reinicio.
    const state = {
      ...initialState,
      enemies: initialState.enemies.map((enemy) => ({ ...enemy, awareness: 'alert' as const })),
      rng: rngForDice([6, 1, 2, 1]),
    };
    const player = state.players[0];
    const enemy = state.enemies[0];

    const blockedMove = reduce(state, {
      type: 'Move',
      unitId: player.id,
      dx: 1,
      dy: 0,
    });
    expect(blockedMove.events).toEqual([
      { type: 'CommandRejected', commandType: 'Move', reason: 'occupied' },
    ]);
    expect(blockedMove.state).toBe(state);

    const attack = reduce(state, {
      type: 'Attack',
      unitId: player.id,
      targetId: enemy.id,
    });
    expect(attack.state.enemies[0].hp).toBe(
      enemy.maxHp - attackDamage(attack.events),
    );
    expect(attack.state.players[0].actions.remaining).toBe(1);

    const endTurn = reduce(
      {
        ...attack.state,
        // El defensor queda sin arma para aislar el flujo de mapa del evento de
        // réplica (REQ-027); la réplica tiene sus propios tests.
        players: attack.state.players.map((unit) => ({
          ...unit,
          equipment: { ...unit.equipment, weaponId: null },
        })),
        rng: rngForDice([6, 1, 3, 3]),
      },
      { type: 'EndTurn' },
    );
    expect(endTurn.events.map((event) => event.type)).toContain('EnemyPhaseStarted');
    expect(endTurn.state.turn).toBe(2);
    expect(endTurn.state.players[0]).toMatchObject({
      hp: state.players[0].hp - attackDamage(endTurn.events),
      mp: state.players[0].maxMp,
    });

    const move = reduce(endTurn.state, {
      type: 'Move',
      unitId: player.id,
      dx: 0,
      dy: -1,
    });
    expect(move.events).toEqual([
      {
        type: 'UnitMoved',
        unitId: player.id,
        from: { x: 5, y: 5 },
        to: { x: 5, y: 4 },
        mpLeft: 5,
      },
    ]);

    const restart = reduce(move.state, { type: 'Restart' });
    expect(restart.state).toEqual(createInitialState());
    expect(restart.state.map?.seed).toBe(DEFAULT_MAP_SEED);
  });
});

describe('estado manual sin mapa', () => {
  it('sigue funcionando para los tests de reglas aisladas', () => {
    const state = makeState({
      players: [makeUnit({ id: 'player-1', faction: 'player', x: 5, y: 5 })],
      enemies: [makeUnit({ id: 'enemy-1', faction: 'enemy', x: 6, y: 5 })],
    });

    expect(state.map).toBeUndefined();
    const result = reduce(state, {
      type: 'Move',
      unitId: 'player-1',
      dx: 0,
      dy: 1,
    });
    expect(result.state.players[0]).toMatchObject({ x: 5, y: 6, mp: 5 });
  });
});
