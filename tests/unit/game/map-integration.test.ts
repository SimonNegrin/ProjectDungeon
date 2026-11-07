import { describe, expect, it } from 'vitest';
import {
  BspMapGenerator,
  createInitialState,
  createRoomGrid,
  DEFAULT_MAP_OPTIONS,
  DEFAULT_MAP_SEED,
  reduce,
  resolveMapOptions,
  type GeneratedMap,
  type MapGenerator,
  type MapOptions,
} from '../../../src/game/index';
import { makeState, makeUnit } from './helpers';

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

describe('createInitialState con BSP', () => {
  it('usa por defecto BspMapGenerator, la semilla de referencia y sus opciones', () => {
    const state = createInitialState();

    expect(state.map).toEqual(
      new BspMapGenerator().generate(DEFAULT_MAP_SEED, DEFAULT_MAP_OPTIONS),
    );
    expect(state.map?.seed).toBe(DEFAULT_MAP_SEED);
    expect(state.map?.options).toEqual(DEFAULT_MAP_OPTIONS);
    expect(state.grid).toEqual({
      width: state.map?.width,
      height: state.map?.height,
      tiles: state.map?.tiles,
    });
    expect(state.players[0].x).toBe(state.map?.spawns.player.x);
    expect(state.players[0].y).toBe(state.map?.spawns.player.y);
    expect(state.enemies[0].x).toBe(state.map?.spawns.enemy.x);
    expect(state.enemies[0].y).toBe(state.map?.spawns.enemy.y);
  });

  it('acepta semilla y opciones sin cambiar el generador por defecto', () => {
    const state = createInitialState({
      seed: 42,
      options: { mapWidth: 24, mapHeight: 24 },
    });

    expect(state.map?.seed).toBe(42);
    expect(state.grid.width).toBe(24);
    expect(state.grid.height).toBe(24);
    expect(state.map?.options.mapWidth).toBe(24);
    expect(state.map?.rooms.length).toBeGreaterThanOrEqual(8);
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
    const state = createInitialState({ generator: stub });
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
    expect(attack.state.enemies[0]).toMatchObject({ hp: 5 });
    expect(attack.state.players[0].actionAvailable).toBe(false);

    const endTurn = reduce(attack.state, { type: 'EndTurn' });
    expect(endTurn.events.map((event) => event.type)).toContain('EnemyPhaseStarted');
    expect(endTurn.state.turn).toBe(2);
    expect(endTurn.state.players[0]).toMatchObject({ hp: 17, mp: 6 });

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
