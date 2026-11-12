import { describe, expect, it } from 'vitest';
import type { Camera } from '../../../src/host/camera';
import {
  cursorAtPlayer,
  deriveCursorStatus,
} from '../../../src/host/cursor';
import { BspMapGenerator, createInitialState, reduce } from '../../../src/game/index';
import type { WeaponId } from '../../../src/game/equipment';
import type { GameState, RngState } from '../../../src/game/types';
import { createDebugApi } from '../../../src/host/debug';
import {
  planDecoration,
  roomPalettesFor,
  summarizeDecoration,
} from '../../../src/host/floor';
import { GameSession } from '../../../src/host/session';
import { makeState, makeUnit, rngForDice } from '../game/helpers';

function setup(initial: GameState = makeState()) {
  const session = new GameSession(initial);
  let camera: Camera = { x: 0, y: 0 };
  let lastEvents: ReturnType<GameSession['dispatch']>['events'] = [];
  const cursor = cursorAtPlayer(session.state.players[0]);

  const api = createDebugApi(
    () => ({
      state: session.state,
      camera,
      bounds: { maxX: 224, maxY: 224 },
      viewport: { width: 416, height: 416 },
      tileSize: 32,
      assetsLoaded: true,
      lastEvents,
      cursor: deriveCursorStatus(session.state, cursor),
    }),
    (command) => {
      const result = session.dispatch(command);
      lastEvents = result.events;
      camera = { x: 1, y: 2 };
      return result;
    },
  );

  return api;
}

function generatedSetup() {
  const session = new GameSession({
    seed: 279837264,
    generator: new BspMapGenerator(),
  });
  let camera: Camera = { x: 0, y: 64 };
  let lastEvents: ReturnType<GameSession['dispatch']>['events'] = [];
  const cursor = cursorAtPlayer(session.state.players[0]);

  const api = createDebugApi(
    () => ({
      state: session.state,
      camera,
      bounds: { maxX: 608, maxY: 608 },
      viewport: { width: 416, height: 416 },
      tileSize: 32,
      assetsLoaded: true,
      lastEvents,
      cursor: deriveCursorStatus(session.state, cursor),
    }),
    (command) => {
      const result = session.dispatch(command);
      lastEvents = result.events;
      const player = result.state.players[0];
      camera = {
        x: Math.max(0, Math.round((player.x + 0.5) * 32 - 208)),
        y: Math.max(0, Math.round((player.y + 0.5) * 32 - 208)),
      };
      return result;
    },
  );

  return api;
}

function combatSetup(rng?: RngState) {
  const session = new GameSession(
    makeState({
      players: [makeUnit({ id: 'player-1', faction: 'player', x: 5, y: 5 })],
      enemies: [makeUnit({ id: 'enemy-1', faction: 'enemy', x: 6, y: 5 })],
      rng,
    }),
  );

  const api = createDebugApi(
    () => ({
      state: session.state,
      camera: { x: 0, y: 0 },
      bounds: { maxX: 224, maxY: 224 },
      viewport: { width: 416, height: 416 },
      tileSize: 32,
      assetsLoaded: true,
      lastEvents: [],
      cursor: deriveCursorStatus(session.state, { x: 6, y: 5 }),
    }),
    (command) => session.dispatch(command),
  );

  return { api, session };
}

describe('API de debug window.__game', () => {
  it('expone un snapshot serializable con cámara, viewport y últimos eventos', () => {
    const api = setup();

    const snapshot = api.snapshot();

    expect(snapshot.players[0]).toMatchObject({ id: 'player-1', x: 4, y: 4 });
    expect(snapshot.enemies[0]).toMatchObject({ id: 'enemy-1', x: 15, y: 15 });
    expect(snapshot.seed).toBeNull();
    expect(snapshot.rooms).toEqual([]);
    expect(snapshot.corridors).toEqual([]);
    expect(snapshot.doors).toEqual([]);
    expect(snapshot.spawns).toBeNull();
    expect(snapshot.decoration).toEqual([]);
    expect(snapshot.floorPalettes).toEqual([]);
    expect(snapshot.camera).toEqual({ x: 0, y: 0, maxX: 224, maxY: 224 });
    expect(snapshot.viewport).toEqual({ width: 416, height: 416 });
    expect(snapshot.tileSize).toBe(32);
    expect(snapshot.assetsLoaded).toBe(true);
    expect(snapshot.lastEvents).toEqual([]);
    expect(snapshot.cursor).toEqual({
      x: 4,
      y: 4,
      visible: true,
      kind: 'player',
      state: 'player',
      path: [],
    });
    expect(() => JSON.stringify(snapshot)).not.toThrow();
  });

  it('expone la percepción y la memoria del enemigo en solo lectura', () => {
    const api = generatedSetup();

    const snapshot = api.snapshot();
    const enemy = snapshot.enemies[0];

    expect(enemy).toMatchObject({
      awareness: 'dormant',
      fleeing: false,
      lastKnown: null,
      alertTurns: 0,
      hasShouted: false,
    });
    expect(enemy.home).toEqual(snapshot.spawns?.enemy);
    expect(api.snapshot()).toEqual(snapshot);
  });

  it('muestra la memoria no nula del enemigo y no expone mutadores', () => {
    const state = makeState({
      enemies: [
        makeUnit({
          id: 'enemy-1',
          faction: 'enemy',
          x: 15,
          y: 15,
          awareness: 'returning',
          fleeing: true,
          home: { x: 2, y: 2 },
          lastKnown: { x: 8, y: 9 },
          alertTurns: 2,
          hasShouted: true,
        }),
      ],
    });
    const api = setup(state);

    const snapshot = api.snapshot();

    expect(snapshot.enemies[0]).toMatchObject({
      awareness: 'returning',
      fleeing: true,
      home: { x: 2, y: 2 },
      lastKnown: { x: 8, y: 9 },
      alertTurns: 2,
      hasShouted: true,
    });
    expect(
      Object.values(snapshot.enemies[0]).some((value) => typeof value === 'function'),
    ).toBe(false);
    expect(api.snapshot()).toEqual(snapshot);
  });

  it('expone el estado de presentación y un avance determinista del reloj', () => {
    let advanced = 0;
    const animation = {
      animating: true,
      step: 1,
      totalSteps: 3,
      unitId: 'player-1',
      position: { x: 80, y: 96, tileX: 2, tileY: 3 },
      camera: { x: 16, y: 32 },
      cues: [
        {
          kind: 'move',
          unitId: 'player-1',
          startMs: 70,
          durationMs: 125,
        },
      ],
    } as const;
    const api = createDebugApi(
      () => ({
        state: makeState(),
        camera: { x: 0, y: 0 },
        bounds: { maxX: 224, maxY: 224 },
        viewport: { width: 416, height: 416 },
        tileSize: 32,
        assetsLoaded: true,
        lastEvents: [],
        cursor: deriveCursorStatus(makeState(), { x: 4, y: 4 }),
        animation,
      }),
      (command) => new GameSession(makeState()).dispatch(command),
      (ms) => {
        advanced += ms;
      },
    );

    expect(api.snapshot().animation).toEqual(animation);

    const after = api.advance(250);
    expect(advanced).toBe(250);
    expect(after.animation).toEqual(animation);
    expect(() => JSON.stringify(after)).not.toThrow();
  });

  it('sin animación el snapshot informa de presentación inactiva', () => {
    const snapshot = setup().snapshot();

    expect(snapshot.animation).toEqual({
      animating: false,
      step: 0,
      totalSteps: 0,
      unitId: null,
      position: null,
      camera: { x: 0, y: 0 },
      cues: [],
    });
  });

  it('dispatch aplica el comando y devuelve snapshot y eventos serializables', () => {
    const api = setup();

    const result = api.dispatch({ type: 'Move', unitId: 'player-1', dx: 1, dy: 0 });

    expect(result.events).toHaveLength(1);
    expect(result.events[0]).toMatchObject({ type: 'UnitMoved', mpLeft: 5 });
    expect(result.snapshot.players[0]).toMatchObject({ x: 5, y: 4, mp: 5 });
    expect(result.snapshot.camera).toMatchObject({ x: 1, y: 2 });
    expect(result.snapshot.lastEvents).toEqual(result.events);
    expect(result.snapshot.cursor).toMatchObject({
      x: 4,
      y: 4,
      visible: true,
      kind: 'floor',
      state: 'reachable',
    });
    expect(result.snapshot.cursor.path).toEqual([{ x: 4, y: 4 }]);
    expect(() => JSON.stringify(result)).not.toThrow();
  });

  it('dispatch acepta MoveTo y devuelve snapshot y eventos serializables', () => {
    const api = generatedSetup();
    const start = api.snapshot().players[0];
    const target = { x: start.x - 2, y: start.y };

    const result = api.dispatch({
      type: 'MoveTo',
      unitId: 'player-1',
      target,
    });

    expect(result.events.every((event) => event.type === 'UnitMoved')).toBe(true);
    expect(result.events).toHaveLength(2);
    expect(result.snapshot.players[0]).toMatchObject({
      x: target.x,
      y: target.y,
      mp: 4,
    });
    expect(result.snapshot.cursor).toMatchObject({ x: start.x, y: start.y });
    expect(() => JSON.stringify(result)).not.toThrow();
  });

  it('un comando rechazado devuelve CommandRejected sin lanzar', () => {
    const api = setup();
    const before = api.snapshot();

    const result = api.dispatch({
      type: 'Attack',
      unitId: 'player-1',
      targetId: 'enemy-1',
    });

    expect(result.events).toEqual([
      {
        type: 'CommandRejected',
        commandType: 'Attack',
        reason: 'target-not-adjacent',
      },
    ]);
    expect(result.snapshot.players).toEqual(before.players);
    expect(result.snapshot.enemies).toEqual(before.enemies);
    expect(result.snapshot.phase).toBe(before.phase);
    expect(result.snapshot.status).toBe(before.status);
  });

  it('el snapshot es una copia y no expone el estado vivo', () => {
    const api = setup();
    const snapshot = api.snapshot();
    const mutable = snapshot.players[0] as { x: number };
    mutable.x = 999;

    expect(api.snapshot().players[0].x).toBe(4);
  });
});

describe('snapshot del mapa generado', () => {
  it('expone semilla, salas, corredores, huecos y spawns', () => {
    const api = generatedSetup();
    const map = new GameSession({
      seed: 279837264,
      generator: new BspMapGenerator(),
    }).state.map;

    const snapshot = api.snapshot();

    expect(snapshot.seed).toBe(279837264);
    expect(snapshot.grid).toMatchObject({ width: 32, height: 32 });
    expect(snapshot.grid.tiles).toHaveLength(32 * 32);
    expect(snapshot.rooms).toHaveLength(9);
    expect(snapshot.corridors).toHaveLength(10);
    expect(snapshot.doors).toHaveLength(18);
    expect(snapshot.spawns).toEqual({
      roomId: map?.spawns.roomId,
      party: map?.spawns.party,
      player: map?.spawns.player,
      enemy: map?.spawns.enemy,
      distance: map?.spawns.distance,
    });
    expect(snapshot.rooms[0]).toMatchObject({ id: 0, x: 3, y: 4, width: 7, height: 9, role: 'large' });
    expect(snapshot.corridors.some((corridor) => corridor.width === 2)).toBe(true);
    expect(snapshot.doors.every((door) => door.orientation === 'horizontal' || door.orientation === 'vertical')).toBe(
      true,
    );
  });

  it('expone entrada, salida, enemigos, bocas, puntos calientes y caverna de growth', () => {
    const session = new GameSession({ seed: 2738263054 });
    let camera: Camera = { x: 0, y: 0 };
    const api = createDebugApi(
      () => ({
        state: session.state,
        camera,
        bounds: { maxX: 608, maxY: 608 },
        viewport: { width: 416, height: 416 },
        tileSize: 32,
        assetsLoaded: true,
        lastEvents: [],
        cursor: deriveCursorStatus(session.state, cursorAtPlayer(session.state.players[0])),
      }),
      (command) => session.dispatch(command),
    );
    camera = { x: 1, y: 2 };

    const snapshot = api.snapshot();
    const map = session.state.map!;

    expect(snapshot.entrance).toEqual(map.entrance);
    expect(snapshot.exit).toEqual(map.exit);
    expect(snapshot.spawns?.roomId).toBe(map.spawns.roomId);
    expect(snapshot.spawns?.party).toEqual(map.spawns.party);
    expect(snapshot.openMouths).toEqual(map.openMouths);
    expect(snapshot.hotspots).toEqual(map.hotspots);
    expect(snapshot.cavernRoomId).toBe(map.cavernRoomId);
    expect(snapshot.mapEnemies).toEqual(map.enemies);
    expect(snapshot.mapEnemies.some((enemy) => enemy.hidden)).toBe(true);
    expect(snapshot.hotspots?.some((hotspot) => hotspot.occupied)).toBe(true);
    expect(JSON.parse(JSON.stringify(snapshot))).toEqual(snapshot);
  });

  it('el snapshot completo sobrevive a un round-trip JSON', () => {
    const api = generatedSetup();
    const map = new GameSession({
      seed: 279837264,
      generator: new BspMapGenerator(),
    }).state.map;
    const snapshot = api.snapshot();

    const roundTrip = JSON.parse(JSON.stringify(snapshot));

    expect(roundTrip.seed).toBe(snapshot.seed);
    expect(roundTrip.rooms).toEqual(snapshot.rooms);
    expect(roundTrip.corridors).toEqual(snapshot.corridors);
    expect(roundTrip.doors).toEqual(snapshot.doors);
    expect(roundTrip.spawns).toEqual(snapshot.spawns);
    expect(roundTrip.grid.tiles).toEqual(snapshot.grid.tiles);
    expect(roundTrip.cursor).toEqual(snapshot.cursor);
    expect(roundTrip.cursor).toMatchObject({
      x: map?.spawns.player.x,
      y: map?.spawns.player.y,
      state: 'player',
    });
  });

  it('no expone el mapa vivo: mutar salas o spawns del snapshot no lo altera', () => {
    const api = generatedSetup();
    const map = new GameSession({
      seed: 279837264,
      generator: new BspMapGenerator(),
    }).state.map;
    api.dispatch({
      type: 'MoveTo',
      unitId: 'player-1',
      target: { x: 8, y: 8 },
    });
    const snapshot = api.snapshot();
    const originalPathStart = { ...snapshot.cursor.path[0] };

    (snapshot.rooms[0] as { x: number }).x = 999;
    (snapshot.spawns!.player as { x: number }).x = 999;
    (snapshot.corridors[0].path[0] as { x: number }).x = 999;
    (snapshot.cursor.path[0] as { x: number }).x = 999;

    const fresh = api.snapshot();
    expect(fresh.rooms[0].x).toBe(3);
    expect(fresh.spawns?.player.x).toBe(map?.spawns.player.x);
    expect(fresh.corridors[0].path[0].x).toBe(4);
    expect(fresh.cursor.path[0]).toEqual(originalPathStart);
  });

  it('expone un resumen determinista de decoración que coincide con el render', () => {
    const api = generatedSetup();
    const map = new GameSession({
      seed: 279837264,
      generator: new BspMapGenerator(),
    }).state.map;
    if (!map) throw new Error('La semilla de referencia debe generar mapa');

    const first = api.snapshot();
    const second = api.snapshot();

    expect(first.decoration).toEqual(second.decoration);
    expect(first.decoration).toEqual(
      summarizeDecoration(planDecoration(map)),
    );
    expect(first.decoration.length).toBeGreaterThan(0);
    for (const entry of first.decoration) {
      expect(Object.keys(entry).sort()).toEqual([
        'ambient',
        'area',
        'family',
        'type',
        'x',
        'y',
      ]);
      expect(entry.area === 'room' || entry.area === 'corridor').toBe(true);
      expect(typeof entry.type).toBe('string');
      expect(typeof entry.family).toBe('string');
    }

    expect(first.floorPalettes).toEqual(roomPalettesFor(map));
    expect(first.floorPalettes).toHaveLength(map.rooms.length);
    for (const palette of first.floorPalettes) {
      expect(Object.keys(palette).sort()).toEqual([
        'ambient',
        'base',
        'palette',
        'roomId',
        'second',
      ]);
    }
  });

  it('mutar el resumen de decoración o las paletas no altera el siguiente snapshot', () => {
    const api = generatedSetup();
    const snapshot = api.snapshot();
    const mutable = snapshot.decoration[0] as {
      x: number;
      type: string;
      family: string;
    };
    mutable.x = 999;
    mutable.type = 'mutado';
    mutable.family = 'mutada';

    const mutablePalette = snapshot.floorPalettes[0] as {
      ambient: string;
      second: string;
    };
    mutablePalette.ambient = 'mutado';
    mutablePalette.second = '#ffffff';

    const fresh = api.snapshot();
    expect(fresh.decoration[0].x).not.toBe(999);
    expect(fresh.decoration[0].type).not.toBe('mutado');
    expect(fresh.decoration[0].family).not.toBe('mutada');
    expect(fresh.floorPalettes[0].ambient).not.toBe('mutado');
    expect(fresh.floorPalettes[0].second).not.toBe('#ffffff');
  });

  it('expone las armas del mapa clonadas y no deja mutar el estado vivo', () => {
    const api = generatedSetup();

    const snapshot = api.snapshot();
    expect(snapshot.weapons).toHaveLength(2);
    expect(snapshot.weapons.map((weapon) => weapon.weaponId).sort()).toEqual([
      'axe',
      'dagger',
    ]);
    expect(snapshot.weapons[0]).toMatchObject({
      id: expect.any(String),
      x: expect.any(Number),
      y: expect.any(Number),
    });

    (snapshot.weapons[0] as { x: number }).x = 999;
    const fresh = api.snapshot();
    expect(fresh.weapons[0].x).not.toBe(999);
    expect(JSON.parse(JSON.stringify(fresh)).weapons).toEqual(fresh.weapons);
  });

  it('las armas del snapshot desaparecen al recogerlas', () => {
    const session = new GameSession({
      seed: 279837264,
      generator: new BspMapGenerator(),
    });
    const weapon = session.state.map?.weapons?.[0];
    if (!weapon) throw new Error('La semilla de referencia debe colocar armas');

    let state: GameState = {
      ...session.state,
      players: [{ ...session.state.players[0], x: weapon.x, y: weapon.y }],
    };
    const api = createDebugApi(
      () => ({
        state,
        camera: { x: 0, y: 0 },
        bounds: { maxX: 608, maxY: 608 },
        viewport: { width: 416, height: 416 },
        tileSize: 32,
        assetsLoaded: true,
        lastEvents: [],
        cursor: deriveCursorStatus(state, weapon),
      }),
      (command) => {
        const result = reduce(state, command);
        state = result.state;
        return { state, events: [...result.events] };
      },
    );

    expect(api.snapshot().weapons).toHaveLength(2);
    const pickup = api.dispatch({ type: 'PickUp', unitId: 'player-1' });

    expect(pickup.snapshot.weapons).toHaveLength(1);
    expect(pickup.snapshot.weapons.some((entry) => entry.id === weapon.id)).toBe(false);
    expect(pickup.snapshot.players[0].equipment.weaponId).toBe(weapon.weaponId);
  });

  it('expone los 4 enemigos con percepción completa y clona home/lastKnown', () => {
    const base = createInitialState({
      seed: 279837264,
      generator: new BspMapGenerator(),
    });
    const state: GameState = {
      ...base,
      enemies: base.enemies.map((enemy, index) =>
        index === 0
          ? {
              ...enemy,
              awareness: 'alert',
              lastKnown: { x: 3, y: 4 },
              alertTurns: 2,
              hasShouted: true,
            }
          : enemy,
      ),
    };
    const session = new GameSession(state);
    const cursor = cursorAtPlayer(session.state.players[0]);
    const api = createDebugApi(
      () => ({
        state: session.state,
        camera: { x: 0, y: 64 },
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

    expect(snapshot.enemies).toHaveLength(4);
    for (const enemy of snapshot.enemies) {
      expect(enemy).toEqual(
        expect.objectContaining({
          awareness: expect.stringMatching(/^(dormant|alert|returning)$/),
          fleeing: expect.any(Boolean),
          home: expect.objectContaining({
            x: expect.any(Number),
            y: expect.any(Number),
          }),
          alertTurns: expect.any(Number),
          hasShouted: expect.any(Boolean),
        }),
      );
      expect(enemy.lastKnown === null || typeof enemy.lastKnown === 'object').toBe(true);
    }
    expect(snapshot.enemies[0]).toMatchObject({
      awareness: 'alert',
      lastKnown: { x: 3, y: 4 },
      alertTurns: 2,
      hasShouted: true,
    });
    expect(api.snapshot()).toEqual(snapshot);

    const liveHome = { ...session.state.enemies[0].home };
    const liveLastKnown = { ...session.state.enemies[0].lastKnown! };
    (snapshot.enemies[0].home as { x: number }).x = 999;
    (snapshot.enemies[0].lastKnown as { x: number }).x = 999;

    expect(session.state.enemies[0].home).toEqual(liveHome);
    expect(session.state.enemies[0].lastKnown).toEqual(liveLastKnown);
    const fresh = api.snapshot();
    expect(fresh.enemies[0].home).toEqual(liveHome);
    expect(fresh.enemies[0].lastKnown).toEqual(liveLastKnown);
    expect(Object.keys(api).sort()).toEqual(['advance', 'dispatch', 'snapshot']);
  });

  it('dispatch de reinicio conserva semilla y mapa en el snapshot', () => {
    const api = generatedSetup();
    const before = api.snapshot();

    const result = api.dispatch({ type: 'Restart' });

    expect(result.events).toEqual([{ type: 'GameRestarted' }]);
    expect(result.snapshot.seed).toBe(before.seed);
    expect(result.snapshot.rooms).toEqual(before.rooms);
    expect(result.snapshot.spawns).toEqual(before.spawns);
  });
});

describe('snapshot profundo y RNG de combate', () => {
  it('expone un RNG clonado que coincide con el estado antes y después de atacar', () => {
    const { api, session } = combatSetup(rngForDice([6, 1, 2, 1]));

    const before = api.snapshot();
    expect(before.rng).toEqual(session.state.rng);
    expect(before.rng.seed).toBe(1017);

    const result = api.dispatch({
      type: 'Attack',
      unitId: 'player-1',
      targetId: 'enemy-1',
    });

    expect(result.events[0]).toMatchObject({ type: 'AttackPerformed', hit: true });
    expect(result.snapshot.rng).toEqual(session.state.rng);
    expect(result.snapshot.rng).not.toEqual(before.rng);
    expect(result.snapshot.rng.seed).toBe(before.rng.seed);
  });

  it('clona stats, equipment, weapons y actions de cada unidad', () => {
    const { api, session } = combatSetup();
    const snapshot = api.snapshot();

    for (const [units, liveUnits] of [
      [snapshot.players, session.state.players],
      [snapshot.enemies, session.state.enemies],
    ] as const) {
      expect(units[0].stats).toEqual(liveUnits[0].stats);
      expect(units[0].stats).not.toBe(liveUnits[0].stats);
      expect(units[0].stats.magia).not.toBe(liveUnits[0].stats.magia);
      expect(units[0].equipment).toEqual(liveUnits[0].equipment);
      expect(units[0].equipment).not.toBe(liveUnits[0].equipment);
      expect(units[0].weapons).toEqual(liveUnits[0].weapons);
      expect(units[0].weapons).not.toBe(liveUnits[0].weapons);
      expect(units[0].actions).toEqual(liveUnits[0].actions);
      expect(units[0].actions).not.toBe(liveUnits[0].actions);
    }
  });

  it('mutar cada campo anidado del snapshot no altera el estado vivo', () => {
    const { api, session } = combatSetup();
    const liveRng = { ...session.state.rng };
    const liveStats = { ...session.state.players[0].stats };
    const liveEquipment = { ...session.state.players[0].equipment };
    const liveWeapons = [...session.state.players[0].weapons];
    const liveActions = { ...session.state.players[0].actions };

    const snapshot = api.snapshot();
    (snapshot.rng as { state: number }).state = 999_999;
    const player = snapshot.players[0];
    (player.stats as { habilidad: number }).habilidad = 999;
    (player.equipment as { weaponId: WeaponId }).weaponId = 'axe';
    (player.weapons as WeaponId[]).push('axe');
    (player.actions as { remaining: number }).remaining = 0;

    expect(session.state.rng).toEqual(liveRng);
    expect(session.state.players[0].stats).toEqual(liveStats);
    expect(session.state.players[0].equipment).toEqual(liveEquipment);
    expect(session.state.players[0].weapons).toEqual(liveWeapons);
    expect(session.state.players[0].actions).toEqual(liveActions);

    const fresh = api.snapshot();
    expect(fresh.rng).toEqual(liveRng);
    expect(fresh.players[0].stats).toEqual(liveStats);
    expect(fresh.players[0].equipment).toEqual(liveEquipment);
    expect(fresh.players[0].weapons).toEqual(liveWeapons);
    expect(fresh.players[0].actions).toEqual(liveActions);
  });

  it('sobrevive a un round-trip JSON conservando RNG, equipo y atributos', () => {
    const { api } = combatSetup(rngForDice([6, 1, 2, 1]));
    api.dispatch({ type: 'Attack', unitId: 'player-1', targetId: 'enemy-1' });

    const snapshot = api.snapshot();
    const roundTrip = JSON.parse(JSON.stringify(snapshot));

    expect(roundTrip.rng).toEqual(snapshot.rng);
    expect(roundTrip.players).toEqual(snapshot.players);
    expect(roundTrip.enemies).toEqual(snapshot.enemies);
    expect(roundTrip.players[0].stats).toEqual(snapshot.players[0].stats);
    expect(roundTrip.players[0].equipment).toEqual(snapshot.players[0].equipment);
    expect(roundTrip.players[0].weapons).toEqual(snapshot.players[0].weapons);
    expect(roundTrip.players[0].actions).toEqual(snapshot.players[0].actions);
  });

  it('dos partidas con la misma semilla y comandos producen el mismo RNG', () => {
    const rng = rngForDice([6, 1, 2, 1]);
    const first = combatSetup(rng);
    const second = combatSetup(rng);

    expect(first.api.snapshot().rng).toEqual(second.api.snapshot().rng);

    const a = first.api.dispatch({
      type: 'Attack',
      unitId: 'player-1',
      targetId: 'enemy-1',
    });
    const b = second.api.dispatch({
      type: 'Attack',
      unitId: 'player-1',
      targetId: 'enemy-1',
    });

    expect(a.snapshot.rng).toEqual(b.snapshot.rng);
    expect(a.events).toEqual(b.events);
    expect(a.snapshot.rng).toEqual(first.session.state.rng);
    expect(b.snapshot.rng).toEqual(second.session.state.rng);
  });
});
