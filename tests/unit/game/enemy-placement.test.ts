import { describe, expect, it, vi } from 'vitest';
import {
  ALARM_RADIUS,
  BESTIARY,
  BspMapGenerator,
  canSee,
  createInitialState,
  DEFAULT_MAP_SEED,
  ENEMY_PLACEMENT_SPECS,
  MIN_ENEMY_DISTANCE,
  MIN_PLAYER_DISTANCE,
  roomAt,
  type GameState,
  type Unit,
} from '../../../src/game/index';
import type { Camera } from '../../../src/host/camera';
import { cursorAtPlayer, deriveCursorStatus } from '../../../src/host/cursor';
import { createDebugApi } from '../../../src/host/debug';
import { GameSession } from '../../../src/host/session';

function chebyshev(a: Pick<Unit, 'x' | 'y'>, b: Pick<Unit, 'x' | 'y'>): number {
  return Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y));
}

function assertValidPlacement(state: GameState): void {
  expect(state.map, 'el estado debe conservar el mapa generado').toBeDefined();
  expect(state.enemies).toHaveLength(4);
  expect(state.enemies.map((enemy) => enemy.id)).toEqual([
    'enemy-1',
    'enemy-2',
    'enemy-3',
    'enemy-4',
  ]);

  const roomIds = new Set<number>();
  for (const enemy of state.enemies) {
    const room = roomAt(state.map!.rooms, enemy.x, enemy.y);
    expect(room, `enemigo ${enemy.id} fuera de sala`).toBeDefined();
    expect(roomIds.has(room!.id), `sala repetida ${room!.id}`).toBe(false);
    roomIds.add(room!.id);

    expect(chebyshev(enemy, state.players[0])).toBeGreaterThanOrEqual(
      MIN_PLAYER_DISTANCE,
    );
    expect(canSee(state.grid, enemy, state.players[0])).toBe(false);
    expect(enemy.home).toEqual({ x: enemy.x, y: enemy.y });
  }

  let pairInsideAlarm = false;
  let isolated = false;
  for (let first = 0; first < state.enemies.length; first += 1) {
    let farFromEveryone = true;
    for (let second = 0; second < state.enemies.length; second += 1) {
      if (first === second) continue;
      const distance = chebyshev(state.enemies[first], state.enemies[second]);
      expect(distance).toBeGreaterThanOrEqual(MIN_ENEMY_DISTANCE);
      if (distance <= ALARM_RADIUS) {
        pairInsideAlarm = true;
        farFromEveryone = false;
      }
    }
    if (farFromEveryone) isolated = true;
  }

  expect(pairInsideAlarm, 'falta una pareja dentro del radio de alarma').toBe(true);
  expect(
    isolated,
    `falta un enemigo a más de ${ALARM_RADIUS} de los demás`,
  ).toBe(true);
}

describe('colocación inicial de los cuatro enemigos', () => {
  it('deriva el radio de alarma del bestiario', () => {
    expect(ALARM_RADIUS).toBe(
      Math.max(...Object.values(BESTIARY).map((definition) => definition.alarm)),
    );
  });

  it('coloca exactamente 2 centinelas, 1 bruto y 1 cobarde con el bestiario', () => {
    const state = createInitialState({ generator: new BspMapGenerator() });

    expect(state.enemies.map((enemy) => enemy.id)).toEqual(
      ENEMY_PLACEMENT_SPECS.map((spec) => spec.id),
    );

    const counts = state.enemies.reduce<Record<string, number>>((result, enemy) => {
      const type = enemy.enemyType ?? 'none';
      result[type] = (result[type] ?? 0) + 1;
      return result;
    }, {});
    expect(counts).toEqual({ sentinel: 2, brute: 1, coward: 1 });

    for (const enemy of state.enemies) {
      expect(enemy.enemyType).not.toBeNull();
      const definition = BESTIARY[enemy.enemyType!];
      expect(enemy).toMatchObject({
        faction: 'enemy',
        hp: definition.maxHp,
        maxHp: definition.maxHp,
        mp: definition.maxMp,
        maxMp: definition.maxMp,
        mana: { current: 0, max: 0 },
        actions: {
          max: definition.stats.acciones,
          remaining: definition.stats.acciones,
        },
        stats: definition.stats,
        equipment: {
          weapon: { itemId: definition.equipment.weaponId },
          armor:
            definition.equipment.armorId === null
              ? null
              : { itemId: definition.equipment.armorId },
          shield:
            definition.equipment.shieldId === null
              ? null
              : { itemId: definition.equipment.shieldId },
        },
        inventory: { capacity: 8 },
        awareness: 'dormant',
        fleeing: false,
        lastKnown: null,
        alertTurns: 0,
        hasShouted: false,
      });
    }
  });

  it('usa salas distintas, fuera de la visión inicial y con las distancias acordadas', () => {
    assertValidPlacement(createInitialState({ generator: new BspMapGenerator() }));
  });

  it('conserva map.spawns.enemy como ancla de enemy-1 en la semilla de referencia', () => {
    const state = createInitialState({ generator: new BspMapGenerator() });
    const spawns = state.map?.spawns;

    expect(state.map?.seed).toBe(DEFAULT_MAP_SEED);
    expect(state.enemies[0]).toMatchObject({
      id: 'enemy-1',
      enemyType: 'sentinel',
      x: spawns?.enemy.x,
      y: spawns?.enemy.y,
      home: { x: spawns?.enemy.x, y: spawns?.enemy.y },
    });
  });

  it('home es la posición inicial y el estado serializable lo conserva', () => {
    const state = createInitialState({ generator: new BspMapGenerator() });
    const parsed = JSON.parse(JSON.stringify(state)) as GameState;

    expect(parsed).toEqual(state);
    expect(parsed.enemies).toHaveLength(4);
    for (const enemy of parsed.enemies) {
      expect(enemy.home).toEqual({ x: enemy.x, y: enemy.y });
    }
  });

  it('el snapshot de depuración expone los cuatro enemigos y su home', () => {
    const session = new GameSession({
      seed: DEFAULT_MAP_SEED,
      generator: new BspMapGenerator(),
    });
    const camera: Camera = { x: 0, y: 64 };
    const cursor = cursorAtPlayer(session.state.players[0]);
    const api = createDebugApi(
      () => ({
        state: session.state,
        camera,
        bounds: { maxX: 608, maxY: 608 },
        viewport: { width: 416, height: 416 },
        tileSize: 32,
        assetsLoaded: true,
        lastEvents: [],
        cursor: deriveCursorStatus(session.state, cursor),
      }),
      (command) => session.dispatch(command),
    );

    const snapshot = api.snapshot();

    expect(snapshot.enemies.map((enemy) => enemy.id)).toEqual([
      'enemy-1',
      'enemy-2',
      'enemy-3',
      'enemy-4',
    ]);
    for (const enemy of snapshot.enemies) {
      expect(enemy.home).toEqual({ x: enemy.x, y: enemy.y });
    }
    expect(() => JSON.stringify(snapshot)).not.toThrow();
  });

  it('es determinista por semilla: dos ejecuciones son idénticas', () => {
    expect(JSON.stringify(createInitialState({ generator: new BspMapGenerator() }))).toBe(
      JSON.stringify(createInitialState({ generator: new BspMapGenerator() })),
    );
    expect(
      JSON.stringify(createInitialState({ generator: new BspMapGenerator(), seed: 42 })),
    ).toBe(
      JSON.stringify(createInitialState({ generator: new BspMapGenerator(), seed: 42 })),
    );
  });

  it('otra semilla cumple las mismas restricciones', () => {
    for (const seed of [42, 1234]) {
      assertValidPlacement(createInitialState({ generator: new BspMapGenerator(), seed }));
    }
  });

  it('no llama a Math.random', () => {
    const random = vi.spyOn(Math, 'random');
    try {
      createInitialState({ generator: new BspMapGenerator() });
      expect(random).not.toHaveBeenCalled();
    } finally {
      random.mockRestore();
    }
  });
});
