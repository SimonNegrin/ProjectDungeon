import { describe, expect, it } from 'vitest';
import {
  BESTIARY,
  MAX_ACTIONS,
  ROSTER,
  createActions,
  createInitialState,
  createPlayerFromArchetype,
  reduce,
  type GameState,
  type UnitStats,
} from '../../../src/game/index';
import { makeState, makeUnit, rngForDice } from './helpers';

const PLAYER_HIT = [6, 1, 2, 1] as const;

function stats(acciones: number): UnitStats {
  return {
    habilidad: 1,
    fuerza: 1,
    defensa: 1,
    resistencia: {},
    punteria: 0,
    magicLevel: 0,
    acciones,
  };
}

describe('contador de acciones', () => {
  it('usa 2 acciones por defecto y 3 en el Pícaro', () => {
    const warrior = createPlayerFromArchetype('warrior');
    const rogue = createPlayerFromArchetype('rogue');

    expect(warrior.actions).toEqual({ max: 2, remaining: 2 });
    expect(rogue.actions).toEqual({ max: 3, remaining: 3 });
    expect(ROSTER.rogue.stats.acciones).toBe(3);
  });

  it('declara las acciones enemigas 2/1/2 por tipo', () => {
    expect(BESTIARY.sentinel.stats.acciones).toBe(2);
    expect(BESTIARY.brute.stats.acciones).toBe(1);
    expect(BESTIARY.coward.stats.acciones).toBe(2);
  });

  it('suma el bonus del equipo y recorta al tope de 4', () => {
    const equipment = {
      weaponId: 'sword' as const,
      armorId: null,
      shieldId: null,
      actionsBonus: 2,
    };

    expect(createActions(stats(2), equipment)).toEqual({ max: 4, remaining: 4 });
    expect(
      createActions(stats(2), { ...equipment, actionsBonus: 5 }).max,
    ).toBe(MAX_ACTIONS);
    expect(createActions(stats(3), equipment).max).toBe(MAX_ACTIONS);
  });

  it('serializa actions.max y actions.remaining en el estado', () => {
    const state = makeState({
      players: [makeUnit({ id: 'player-1', faction: 'player', x: 5, y: 5, actions: 1 })],
      enemies: [],
    });

    const roundTrip = JSON.parse(JSON.stringify(state)) as GameState;

    expect(roundTrip.players[0].actions).toEqual({ max: 2, remaining: 1 });
    expect(roundTrip).toEqual(state);
  });

  it('restaura remaining al máximo al empezar el turno', () => {
    const state = makeState({
      players: [makeUnit({ id: 'player-1', faction: 'player', x: 5, y: 5, actions: 0 })],
      enemies: [makeUnit({ id: 'enemy-1', faction: 'enemy', x: 15, y: 15 })],
    });

    const result = reduce(state, { type: 'EndTurn' });

    expect(result.state.players[0].actions).toEqual({ max: 2, remaining: 2 });
  });

  it('gastar la última acción no termina el turno y E lo cierra manualmente', () => {
    const state = makeState({
      players: [makeUnit({ id: 'player-1', faction: 'player', x: 5, y: 5, actions: 1 })],
      enemies: [makeUnit({ id: 'enemy-1', faction: 'enemy', x: 6, y: 5 })],
      rng: rngForDice(PLAYER_HIT),
    });

    const attacked = reduce(state, {
      type: 'Attack',
      unitId: 'player-1',
      targetId: 'enemy-1',
    });

    expect(attacked.state.players[0].actions.remaining).toBe(0);
    expect(attacked.state.phase).toBe('player');
    expect(attacked.state.turn).toBe(1);
    expect(attacked.state.status).toBe('playing');

    const ended = reduce(attacked.state, { type: 'EndTurn' });

    expect(ended.state.turn).toBe(2);
    expect(ended.state.players[0].actions.remaining).toBe(2);
  });

  it('rechaza atacar sin acciones sin RNG, eventos ni cambios de estado', () => {
    const state = makeState({
      players: [makeUnit({ id: 'player-1', faction: 'player', x: 5, y: 5, actions: 0 })],
      enemies: [makeUnit({ id: 'enemy-1', faction: 'enemy', x: 6, y: 5 })],
      rng: rngForDice(PLAYER_HIT),
    });

    const result = reduce(state, {
      type: 'Attack',
      unitId: 'player-1',
      targetId: 'enemy-1',
    });

    expect(result.state).toBe(state);
    expect(result.state.rng).toBe(state.rng);
    expect(result.events).toEqual([
      { type: 'CommandRejected', commandType: 'Attack', reason: 'no-action' },
    ]);
  });

  it('moverse y recoger no gastan acción aunque no queden acciones', () => {
    const moveState = makeState({
      players: [makeUnit({ id: 'player-1', faction: 'player', x: 5, y: 5, actions: 0 })],
      enemies: [],
    });
    const moved = reduce(moveState, { type: 'Move', unitId: 'player-1', dx: 1, dy: 0 });
    expect(moved.state.players[0]).toMatchObject({
      x: 6,
      y: 5,
      mp: 5,
      actions: { remaining: 0 },
    });

    const base = createInitialState();
    const player = base.players[0];
    const pickupState: GameState = {
      ...base,
      players: [
        {
          ...player,
          mp: 6,
          actions: { max: 2, remaining: 0 },
        },
      ],
      enemies: [],
      map: {
        ...base.map!,
        weapons: [
          { id: 'weapon-test', weaponId: 'axe', x: player.x, y: player.y },
        ],
      },
    };

    const picked = reduce(pickupState, { type: 'PickUp', unitId: 'player-1' });
    expect(picked.state.players[0]).toMatchObject({
      mp: 5,
      actions: { remaining: 0 },
      equipment: { weaponId: 'axe' },
    });
    expect(picked.state.players[0].weapons).toEqual(['sword', 'axe']);
  });

  it('atacar y después interactuar con el suelo es posible con acciones restantes', () => {
    const base = createInitialState();
    const state: GameState = {
      ...base,
      players: [
        {
          ...base.players[0],
          x: 5,
          y: 5,
          mp: 6,
          actions: { max: 2, remaining: 2 },
        },
      ],
      enemies: [makeUnit({ id: 'enemy-1', faction: 'enemy', x: 6, y: 5 })],
      map: {
        ...base.map!,
        weapons: [{ id: 'weapon-test', weaponId: 'axe', x: 5, y: 5 }],
      },
      rng: rngForDice(PLAYER_HIT),
    };

    const attacked = reduce(state, {
      type: 'Attack',
      unitId: 'player-1',
      targetId: 'enemy-1',
    });
    const picked = reduce(attacked.state, { type: 'PickUp', unitId: 'player-1' });

    expect(attacked.events[0]).toMatchObject({ type: 'AttackPerformed' });
    expect(picked.events).toEqual([]);
    expect(picked.state.players[0]).toMatchObject({
      mp: 5,
      actions: { remaining: 1 },
      equipment: { weaponId: 'axe' },
    });
  });

  it('MoveTo sobre un enemigo ataca una vez por pulsación con las 3 acciones del Pícaro', () => {
    const rogue = createPlayerFromArchetype('rogue', {
      id: 'player-1',
      position: { x: 5, y: 5 },
    });
    let state = makeState({
      players: [rogue],
      enemies: [makeUnit({ id: 'enemy-1', faction: 'enemy', x: 6, y: 5, hp: 100, maxHp: 100 })],
      rng: rngForDice(PLAYER_HIT),
    });

    for (let press = 0; press < 3; press += 1) {
      const result = reduce(state, {
        type: 'MoveTo',
        unitId: 'player-1',
        target: { x: 6, y: 5 },
      });
      expect(
        result.events.filter((event) => event.type === 'AttackPerformed'),
      ).toHaveLength(1);
      expect(result.state.players[0].actions.remaining).toBe(2 - press);
      state = result.state;
    }

    const rejected = reduce(state, {
      type: 'MoveTo',
      unitId: 'player-1',
      target: { x: 6, y: 5 },
    });
    expect(rejected.state).toBe(state);
    expect(rejected.events).toEqual([
      { type: 'CommandRejected', commandType: 'MoveTo', reason: 'no-action' },
    ]);
  });
});
