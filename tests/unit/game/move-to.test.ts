import { describe, expect, it } from 'vitest';
import {
  planCursorTarget,
  reduce,
  type Unit,
} from '../../../src/game/index';
import {
  expectedSinglePacketDamage,
  makeGridWithWalls,
  makeState,
  makeUnit,
  rngForDice,
} from './helpers';

const PLAYER_HIT = [6, 1, 2, 1] as const;

function expectedDamage(
  attacker: Unit,
  target: Unit,
  damageDie: number,
  resistanceDie: number,
): number {
  return expectedSinglePacketDamage(attacker, target, damageDie, resistanceDie);
}

function playerAt(x: number, y: number, patch: { mp?: number; actions?: number } = {}) {
  return makeUnit({ id: 'player-1', faction: 'player', x, y, ...patch });
}

function enemyAt(x: number, y: number, patch: { hp?: number } = {}) {
  return makeUnit({ id: 'enemy-1', faction: 'enemy', x, y, ...patch });
}

describe('MoveTo', () => {
  it('en verde recorre el camino completo, gasta el coste exacto y no consume acción', () => {
    const state = makeState({
      players: [playerAt(2, 5)],
      enemies: [],
    });
    const before = JSON.stringify(state);

    const result = reduce(state, {
      type: 'MoveTo',
      unitId: 'player-1',
      target: { x: 5, y: 5 },
    });

    expect(result.state.players[0]).toMatchObject({
      x: 5,
      y: 5,
      mp: 3,
      actions: { remaining: 2 },
    });
    expect(result.state.phase).toBe('player');
    expect(result.state.turn).toBe(1);
    expect(result.events.map((event) => event.type)).toEqual([
      'UnitMoved',
      'UnitMoved',
      'UnitMoved',
    ]);
    expect(result.events.at(-1)).toEqual({
      type: 'UnitMoved',
      unitId: 'player-1',
      from: { x: 4, y: 5 },
      to: { x: 5, y: 5 },
      mpLeft: 3,
    });
    expect(JSON.stringify(state)).toBe(before);
  });

  it('en ámbar avanza hasta agotar MP, sin atacar ni consumir acción', () => {
    const state = makeState({
      players: [playerAt(2, 5, { mp: 2 })],
      enemies: [],
    });
    const plan = planCursorTarget(state, 'player-1', { x: 6, y: 5 });

    const result = reduce(state, {
      type: 'MoveTo',
      unitId: 'player-1',
      target: { x: 6, y: 5 },
    });

    expect(plan.withinMp).toBe(false);
    expect(result.state.players[0]).toMatchObject({
      ...plan.path[1],
      mp: 0,
      actions: { remaining: 2 },
    });
    expect(result.state.players[0]).not.toMatchObject({ x: 6, y: 5 });
    expect(result.state.turn).toBe(1);
    expect(result.events).toHaveLength(2);
    expect(result.events.every((event) => event.type === 'UnitMoved')).toBe(true);
    expect(result.events.some((event) => event.type === 'AttackPerformed')).toBe(false);
  });

  it('en rojo (muro) no mueve, no gasta MP ni acción y emite un único rechazo', () => {
    const state = makeState({
      players: [playerAt(2, 5)],
      enemies: [],
    });
    const before = JSON.stringify(state);

    const result = reduce(state, {
      type: 'MoveTo',
      unitId: 'player-1',
      target: { x: 0, y: 0 },
    });

    expect(result.state).toBe(state);
    expect(JSON.stringify(state)).toBe(before);
    expect(result.events).toEqual([
      { type: 'CommandRejected', commandType: 'MoveTo', reason: 'wall' },
    ]);
  });

  it('en rojo (sin camino) rechaza con no-path sin movimiento parcial', () => {
    const state = makeState({
      grid: makeGridWithWalls([
        { x: 9, y: 9 },
        { x: 10, y: 9 },
        { x: 11, y: 9 },
        { x: 9, y: 10 },
        { x: 11, y: 10 },
        { x: 9, y: 11 },
        { x: 10, y: 11 },
        { x: 11, y: 11 },
      ]),
      players: [playerAt(2, 2)],
      enemies: [],
    });
    const before = JSON.stringify(state);

    const result = reduce(state, {
      type: 'MoveTo',
      unitId: 'player-1',
      target: { x: 10, y: 10 },
    });

    expect(result.state).toBe(state);
    expect(JSON.stringify(state)).toBe(before);
    expect(result.events).toEqual([
      { type: 'CommandRejected', commandType: 'MoveTo', reason: 'no-path' },
    ]);
  });

  it('sobre el propio jugador rechaza invalid-target sin gastar MP', () => {
    const state = makeState({
      players: [playerAt(5, 5)],
      enemies: [],
    });

    const result = reduce(state, {
      type: 'MoveTo',
      unitId: 'player-1',
      target: { x: 5, y: 5 },
    });

    expect(result.state).toBe(state);
    expect(result.state.players[0]).toMatchObject({ x: 5, y: 5, mp: 6 });
    expect(result.events).toEqual([
      { type: 'CommandRejected', commandType: 'MoveTo', reason: 'invalid-target' },
    ]);
  });

  it('sin MP y con camino rechaza no-mp sin mover', () => {
    const state = makeState({
      players: [playerAt(2, 5, { mp: 0 })],
      enemies: [],
    });

    const result = reduce(state, {
      type: 'MoveTo',
      unitId: 'player-1',
      target: { x: 5, y: 5 },
    });

    expect(result.state).toBe(state);
    expect(result.events).toEqual([
      { type: 'CommandRejected', commandType: 'MoveTo', reason: 'no-mp' },
    ]);
  });

  it('rechaza fases y unidades no válidas con las mismas reglas que Move', () => {
    const enemyPhase = reduce(
      makeState({
        players: [playerAt(2, 5)],
        enemies: [],
        phase: 'enemy',
      }),
      { type: 'MoveTo', unitId: 'player-1', target: { x: 5, y: 5 } },
    );
    expect(enemyPhase.events).toEqual([
      { type: 'CommandRejected', commandType: 'MoveTo', reason: 'wrong-phase' },
    ]);

    const unknown = reduce(
      makeState({ players: [playerAt(2, 5)], enemies: [] }),
      { type: 'MoveTo', unitId: 'player-9', target: { x: 5, y: 5 } },
    );
    expect(unknown.events).toEqual([
      { type: 'CommandRejected', commandType: 'MoveTo', reason: 'unknown-unit' },
    ]);

    const dead = reduce(
      makeState({
        players: [makeUnit({ id: 'player-1', faction: 'player', x: 2, y: 5, hp: 0 })],
        enemies: [],
      }),
      { type: 'MoveTo', unitId: 'player-1', target: { x: 5, y: 5 } },
    );
    expect(dead.events).toEqual([
      { type: 'CommandRejected', commandType: 'MoveTo', reason: 'dead-unit' },
    ]);
  });

  describe('sobre un enemigo', () => {
    it('alcanzable con acción se acerca al tile de ataque, gasta MP y acción y ataca', () => {
      const state = makeState({
        players: [playerAt(2, 2, { mp: 3 })],
        enemies: [enemyAt(6, 6)],
        rng: rngForDice(PLAYER_HIT),
      });

      const damage = expectedDamage(state.players[0], state.enemies[0], 2, 1);
      const targetHp = state.enemies[0].hp - damage;
      const result = reduce(state, {
        type: 'MoveTo',
        unitId: 'player-1',
        target: { x: 6, y: 6 },
      });

      expect(result.state.players[0]).toMatchObject({
        x: 5,
        y: 5,
        mp: 0,
        actions: { remaining: 1 },
      });
      expect(result.state.enemies[0]).toMatchObject({ x: 6, y: 6, hp: targetHp });
      expect(result.state.players[0]).not.toMatchObject({ x: 6, y: 6 });
      expect(result.events.map((event) => event.type)).toEqual([
        'UnitMoved',
        'UnitMoved',
        'UnitMoved',
        'AttackPerformed',
      ]);
      expect(result.events.at(-1)).toEqual({
        type: 'AttackPerformed',
        attackerId: 'player-1',
        targetId: 'enemy-1',
        hit: true,
        damage,
        targetHp,
        rolls: { attack: 6, shield: 1, damage: 2, armor: 1 },
      });
    });

    it('si el ataque mata, aplica UnitDied y GameEnded tras los movimientos', () => {
      const state = makeState({
        players: [playerAt(2, 2, { mp: 3 })],
        enemies: [enemyAt(6, 6, { hp: 1 })],
        rng: rngForDice(PLAYER_HIT),
      });

      const result = reduce(state, {
        type: 'MoveTo',
        unitId: 'player-1',
        target: { x: 6, y: 6 },
      });

      expect(result.state.enemies[0].hp).toBe(0);
      expect(result.state.status).toBe('victory');
      expect(result.events.map((event) => event.type)).toEqual([
        'UnitMoved',
        'UnitMoved',
        'UnitMoved',
        'AttackPerformed',
        'UnitDied',
        'GameEnded',
      ]);
      expect(result.events.at(-1)).toEqual({ type: 'GameEnded', status: 'victory' });
    });

    it('alcanzable sin acción solo se mueve al tile de ataque', () => {
      const state = makeState({
        players: [playerAt(2, 2, { mp: 3, actions: 0 })],
        enemies: [enemyAt(6, 6)],
      });

      const result = reduce(state, {
        type: 'MoveTo',
        unitId: 'player-1',
        target: { x: 6, y: 6 },
      });

      expect(result.state.players[0]).toMatchObject({
        x: 5,
        y: 5,
        mp: 0,
        actions: { remaining: 0 },
      });
      expect(result.state.enemies[0].hp).toBe(10);
      expect(result.events.map((event) => event.type)).toEqual([
        'UnitMoved',
        'UnitMoved',
        'UnitMoved',
      ]);
    });

    it('demasiado lejano avanza hasta agotar MP y no ataca', () => {
      const state = makeState({
        players: [playerAt(2, 2, { mp: 2 })],
        enemies: [enemyAt(6, 6)],
      });

      const result = reduce(state, {
        type: 'MoveTo',
        unitId: 'player-1',
        target: { x: 6, y: 6 },
      });

      expect(result.state.players[0]).toMatchObject({
        x: 4,
        y: 4,
        mp: 0,
        actions: { remaining: 2 },
      });
      expect(result.state.enemies[0].hp).toBe(10);
      expect(result.events.map((event) => event.type)).toEqual([
        'UnitMoved',
        'UnitMoved',
      ]);
    });

    it('adyacente con acción ataca sin moverse ni gastar MP', () => {
      const state = makeState({
        players: [playerAt(5, 5)],
        enemies: [enemyAt(6, 5)],
        rng: rngForDice(PLAYER_HIT),
      });

      const damage = expectedDamage(state.players[0], state.enemies[0], 2, 1);
      const targetHp = state.enemies[0].hp - damage;
      const result = reduce(state, {
        type: 'MoveTo',
        unitId: 'player-1',
        target: { x: 6, y: 5 },
      });

      expect(result.state.players[0]).toMatchObject({
        x: 5,
        y: 5,
        mp: state.players[0].maxMp,
        actions: { remaining: 1 },
      });
      expect(result.state.enemies[0].hp).toBe(targetHp);
      expect(result.events).toEqual([
        {
          type: 'AttackPerformed',
          attackerId: 'player-1',
          targetId: 'enemy-1',
          hit: true,
          damage,
          targetHp,
          rolls: { attack: 6, shield: 1, damage: 2, armor: 1 },
        },
      ]);
    });

    it('adyacente sin acción no hace nada y rechaza no-action', () => {
      const state = makeState({
        players: [playerAt(5, 5, { actions: 0 })],
        enemies: [enemyAt(6, 5)],
      });

      const result = reduce(state, {
        type: 'MoveTo',
        unitId: 'player-1',
        target: { x: 6, y: 5 },
      });

      expect(result.state).toBe(state);
      expect(result.events).toEqual([
        { type: 'CommandRejected', commandType: 'MoveTo', reason: 'no-action' },
      ]);
    });

    it('sin tile de ataque libre o camino se trata como rojo', () => {
      const state = makeState({
        grid: makeGridWithWalls([
          { x: 9, y: 9 },
          { x: 10, y: 9 },
          { x: 11, y: 9 },
          { x: 9, y: 10 },
          { x: 11, y: 10 },
          { x: 9, y: 11 },
          { x: 10, y: 11 },
          { x: 11, y: 11 },
        ]),
        players: [playerAt(2, 2)],
        enemies: [enemyAt(10, 10)],
      });

      const result = reduce(state, {
        type: 'MoveTo',
        unitId: 'player-1',
        target: { x: 10, y: 10 },
      });

      expect(result.state).toBe(state);
      expect(result.events).toEqual([
        { type: 'CommandRejected', commandType: 'MoveTo', reason: 'no-path' },
      ]);
    });
  });

  it('es determinista y el comando sobrevive a un round-trip JSON', () => {
    const state = makeState({
      players: [playerAt(2, 2, { mp: 3 })],
      enemies: [enemyAt(6, 6)],
    });
    const command = JSON.parse(
      JSON.stringify({ type: 'MoveTo', unitId: 'player-1', target: { x: 6, y: 6 } }),
    );

    const first = reduce(state, command);
    const second = reduce(state, command);

    expect(JSON.stringify(first)).toBe(JSON.stringify(second));
  });
});
