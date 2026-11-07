import { describe, expect, it } from 'vitest';
import { PLAYER_MAX_MP, reduce } from '../../../src/game/index';
import { makeState, makeUnit } from './helpers';

describe('combat', () => {
  it('ataca en adyacencia ortogonal y hace 5 al enemigo', () => {
    const state = makeState({
      players: [makeUnit({ id: 'player-1', faction: 'player', x: 5, y: 5 })],
      enemies: [makeUnit({ id: 'enemy-1', faction: 'enemy', x: 6, y: 5 })],
    });

    const result = reduce(state, {
      type: 'Attack',
      unitId: 'player-1',
      targetId: 'enemy-1',
    });

    expect(result.state.enemies[0].hp).toBe(5);
    expect(result.state.players[0].actionAvailable).toBe(false);
    expect(result.state.phase).toBe('player');
    expect(result.events).toEqual([
      {
        type: 'AttackPerformed',
        attackerId: 'player-1',
        targetId: 'enemy-1',
        damage: 5,
        targetHp: 5,
      },
    ]);
  });

  it('ataca en diagonal y hace 5 al enemigo', () => {
    const state = makeState({
      players: [makeUnit({ id: 'player-1', faction: 'player', x: 5, y: 5 })],
      enemies: [makeUnit({ id: 'enemy-1', faction: 'enemy', x: 6, y: 6 })],
    });

    const result = reduce(state, {
      type: 'Attack',
      unitId: 'player-1',
      targetId: 'enemy-1',
    });

    expect(result.state.enemies[0].hp).toBe(5);
  });

  it('rechaza atacar fuera de rango', () => {
    const state = makeState({
      players: [makeUnit({ id: 'player-1', faction: 'player', x: 5, y: 5 })],
      enemies: [makeUnit({ id: 'enemy-1', faction: 'enemy', x: 7, y: 5 })],
    });

    const result = reduce(state, {
      type: 'Attack',
      unitId: 'player-1',
      targetId: 'enemy-1',
    });

    expect(result.state.enemies[0].hp).toBe(10);
    expect(result.state.players[0].actionAvailable).toBe(true);
    expect(result.events).toEqual([
      { type: 'CommandRejected', commandType: 'Attack', reason: 'target-not-adjacent' },
    ]);
  });

  it('solo permite una acción por turno', () => {
    const state = makeState({
      players: [makeUnit({ id: 'player-1', faction: 'player', x: 5, y: 5 })],
      enemies: [makeUnit({ id: 'enemy-1', faction: 'enemy', x: 6, y: 5 })],
    });

    const first = reduce(state, {
      type: 'Attack',
      unitId: 'player-1',
      targetId: 'enemy-1',
    });
    const second = reduce(first.state, {
      type: 'Attack',
      unitId: 'player-1',
      targetId: 'enemy-1',
    });

    expect(first.state.enemies[0].hp).toBe(5);
    expect(second.state.enemies[0].hp).toBe(5);
    expect(second.events).toEqual([
      { type: 'CommandRejected', commandType: 'Attack', reason: 'no-action' },
    ]);
  });

  it('permite moverse después de atacar mientras quede MP', () => {
    const state = makeState({
      players: [makeUnit({ id: 'player-1', faction: 'player', x: 5, y: 5 })],
      enemies: [makeUnit({ id: 'enemy-1', faction: 'enemy', x: 6, y: 5 })],
    });

    const attacked = reduce(state, {
      type: 'Attack',
      unitId: 'player-1',
      targetId: 'enemy-1',
    });
    const moved = reduce(attacked.state, {
      type: 'Move',
      unitId: 'player-1',
      dx: 0,
      dy: -1,
    });

    expect(moved.state.players[0]).toMatchObject({
      x: 5,
      y: 4,
      mp: PLAYER_MAX_MP - 1,
      actionAvailable: false,
    });
    expect(moved.events).toHaveLength(1);
    expect(moved.events[0].type).toBe('UnitMoved');
  });

  it('rechaza atacar a un objetivo inexistente o muerto', () => {
    const state = makeState({
      players: [makeUnit({ id: 'player-1', faction: 'player', x: 5, y: 5 })],
      enemies: [makeUnit({ id: 'enemy-1', faction: 'enemy', x: 6, y: 5, hp: 0 })],
    });

    const unknown = reduce(state, {
      type: 'Attack',
      unitId: 'player-1',
      targetId: 'enemy-999',
    });
    expect(unknown.events).toEqual([
      { type: 'CommandRejected', commandType: 'Attack', reason: 'target-not-found' },
    ]);

    const dead = reduce(state, {
      type: 'Attack',
      unitId: 'player-1',
      targetId: 'enemy-1',
    });
    expect(dead.events).toEqual([
      { type: 'CommandRejected', commandType: 'Attack', reason: 'target-dead' },
    ]);
  });

  it('rechaza atacar a una unidad de la misma facción', () => {
    const state = makeState({
      players: [
        makeUnit({ id: 'player-1', faction: 'player', x: 5, y: 5 }),
        makeUnit({ id: 'player-2', faction: 'player', x: 6, y: 5 }),
      ],
      enemies: [makeUnit({ id: 'enemy-1', faction: 'enemy', x: 18, y: 18 })],
    });

    const result = reduce(state, {
      type: 'Attack',
      unitId: 'player-1',
      targetId: 'player-2',
    });

    expect(result.events).toEqual([
      { type: 'CommandRejected', commandType: 'Attack', reason: 'same-faction' },
    ]);
  });

  it('emite muerte y victoria cuando el enemigo llega a 0', () => {
    const state = makeState({
      players: [makeUnit({ id: 'player-1', faction: 'player', x: 5, y: 5 })],
      enemies: [makeUnit({ id: 'enemy-1', faction: 'enemy', x: 6, y: 5, hp: 5 })],
    });

    const result = reduce(state, {
      type: 'Attack',
      unitId: 'player-1',
      targetId: 'enemy-1',
    });

    expect(result.state.enemies[0].hp).toBe(0);
    expect(result.state.status).toBe('victory');
    expect(result.events).toEqual([
      {
        type: 'AttackPerformed',
        attackerId: 'player-1',
        targetId: 'enemy-1',
        damage: 5,
        targetHp: 0,
      },
      { type: 'UnitDied', unitId: 'enemy-1' },
      { type: 'GameEnded', status: 'victory' },
    ]);
  });

  it('no declara victoria mientras quede otro enemigo vivo', () => {
    const state = makeState({
      players: [makeUnit({ id: 'player-1', faction: 'player', x: 5, y: 5 })],
      enemies: [
        makeUnit({ id: 'enemy-1', faction: 'enemy', x: 6, y: 5, hp: 5 }),
        makeUnit({ id: 'enemy-2', faction: 'enemy', x: 18, y: 18 }),
      ],
    });

    const result = reduce(state, {
      type: 'Attack',
      unitId: 'player-1',
      targetId: 'enemy-1',
    });

    expect(result.state.enemies[0].hp).toBe(0);
    expect(result.state.enemies[1].hp).toBe(10);
    expect(result.state.status).toBe('playing');
    expect(result.events.map((event) => event.type)).toEqual([
      'AttackPerformed',
      'UnitDied',
    ]);
  });

  it('no declara derrota mientras quede otro jugador vivo', () => {
    const state = makeState({
      players: [
        makeUnit({ id: 'player-1', faction: 'player', x: 5, y: 5, hp: 3 }),
        makeUnit({ id: 'player-2', faction: 'player', x: 18, y: 18 }),
      ],
      enemies: [makeUnit({ id: 'enemy-1', faction: 'enemy', x: 6, y: 5 })],
    });

    const result = reduce(state, { type: 'EndTurn' });

    expect(result.state.players[0].hp).toBe(0);
    expect(result.state.players[1].hp).toBe(20);
    expect(result.state.status).toBe('playing');
    expect(result.events.map((event) => event.type)).toEqual([
      'TurnEnded',
      'EnemyPhaseStarted',
      'AttackPerformed',
      'UnitDied',
      'PlayerTurnStarted',
    ]);
  });

  it('el enemigo hace 3 al jugador al atacar', () => {
    const state = makeState({
      players: [makeUnit({ id: 'player-1', faction: 'player', x: 5, y: 5 })],
      enemies: [makeUnit({ id: 'enemy-1', faction: 'enemy', x: 6, y: 5 })],
    });

    const result = reduce(state, { type: 'EndTurn' });

    expect(result.state.players[0].hp).toBe(17);
    expect(result.state.enemies[0].actionAvailable).toBe(false);
    expect(result.events).toContainEqual({
      type: 'AttackPerformed',
      attackerId: 'enemy-1',
      targetId: 'player-1',
      damage: 3,
      targetHp: 17,
    });
  });

  it('la muerte del jugador ocurre a 0 y emite derrota', () => {
    const state = makeState({
      players: [makeUnit({ id: 'player-1', faction: 'player', x: 5, y: 5, hp: 1 })],
      enemies: [makeUnit({ id: 'enemy-1', faction: 'enemy', x: 6, y: 5 })],
    });

    const result = reduce(state, { type: 'EndTurn' });

    expect(result.state.players[0].hp).toBe(0);
    expect(result.state.status).toBe('defeat');
    expect(result.events).toContainEqual({ type: 'UnitDied', unitId: 'player-1' });
    expect(result.events).toContainEqual({ type: 'GameEnded', status: 'defeat' });
  });
});
