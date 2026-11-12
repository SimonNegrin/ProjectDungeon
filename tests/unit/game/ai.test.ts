import { describe, expect, it } from 'vitest';
import {
  BESTIARY,
  canSee,
  chebyshevDistance,
  hasLineOfSight,
  planEnemyAction,
  reduce,
  type EnemyStep,
} from '../../../src/game/index';
import { makeGridWithWalls, makeState, makeUnit, rngForDice } from './helpers';

function positionAfter(
  start: { readonly x: number; readonly y: number },
  steps: readonly EnemyStep[],
): { readonly x: number; readonly y: number } {
  return steps.reduce(
    (position, step) => ({ x: position.x + step.dx, y: position.y + step.dy }),
    { x: start.x, y: start.y },
  );
}

describe('enemy AI', () => {
  it('elige al jugador más cercano y avanza hacia él', () => {
    const state = makeState({
      players: [
        makeUnit({ id: 'player-1', faction: 'player', x: 8, y: 10 }),
        makeUnit({ id: 'player-2', faction: 'player', x: 14, y: 10 }),
      ],
      enemies: [makeUnit({ id: 'enemy-1', faction: 'enemy', x: 10, y: 10 })],
    });

    const plan = planEnemyAction(state, state.enemies[0]);
    expect(plan).toEqual({
      type: 'move',
      steps: [{ dx: -1, dy: 0 }],
      attackTargetId: 'player-1',
    });

    const result = reduce(state, { type: 'EndTurn' });
    expect(result.state.enemies[0]).toMatchObject({ x: 9, y: 10 });
  });

  it('desempata por índice de jugador de forma determinista', () => {
    const first = makeState({
      players: [
        makeUnit({ id: 'player-1', faction: 'player', x: 8, y: 10 }),
        makeUnit({ id: 'player-2', faction: 'player', x: 12, y: 10 }),
      ],
      enemies: [makeUnit({ id: 'enemy-1', faction: 'enemy', x: 10, y: 10 })],
    });
    const second = makeState({
      players: [
        makeUnit({ id: 'player-3', faction: 'player', x: 12, y: 10 }),
        makeUnit({ id: 'player-4', faction: 'player', x: 8, y: 10 }),
      ],
      enemies: [makeUnit({ id: 'enemy-1', faction: 'enemy', x: 10, y: 10 })],
    });

    expect(planEnemyAction(first, first.enemies[0])).toEqual({
      type: 'move',
      steps: [{ dx: -1, dy: 0 }],
      attackTargetId: 'player-1',
    });
    expect(planEnemyAction(second, second.enemies[0])).toEqual({
      type: 'move',
      steps: [{ dx: 1, dy: 0 }],
      attackTargetId: 'player-3',
    });
  });

  it('ataca si el jugador más cercano está en rango', () => {
    const state = makeState({
      players: [makeUnit({ id: 'player-1', faction: 'player', x: 5, y: 5 })],
      enemies: [makeUnit({ id: 'enemy-1', faction: 'enemy', x: 6, y: 6 })],
      rng: rngForDice([6, 1, 3, 3]),
    });

    expect(planEnemyAction(state, state.enemies[0])).toEqual({
      type: 'attack',
      targetId: 'player-1',
    });

    const result = reduce(state, { type: 'EndTurn' });
    const attacks = result.events.filter((event) => event.type === 'AttackPerformed');
    expect(attacks).toHaveLength(2);
    const attack = attacks[0];
    if (!attack || attack.type !== 'AttackPerformed') {
      throw new Error('se esperaba un ataque');
    }
    expect(attack).toMatchObject({
      attackerId: 'enemy-1',
      targetId: 'player-1',
      hit: true,
      damage: 2,
      targetHp: state.players[0].hp - 2,
    });
    expect(attacks[1]).toMatchObject({ hit: false, damage: 0 });
    expect(result.state.players[0].hp).toBe(state.players[0].hp - attack.damage);
    expect(result.state.enemies[0]).toMatchObject({
      x: 6,
      y: 6,
      actions: { remaining: 0 },
    });
  });

  it('gasta todo el MP del tipo avanzando por BFS en una fase', () => {
    const maxMp = BESTIARY.sentinel.maxMp;
    const state = makeState({
      players: [makeUnit({ id: 'player-1', faction: 'player', x: 5, y: 5 })],
      enemies: [
        makeUnit({
          id: 'enemy-1',
          faction: 'enemy',
          enemyType: 'sentinel',
          x: 15,
          y: 5,
        }),
      ],
    });

    const result = reduce(state, { type: 'EndTurn' });
    const moves = result.events.filter((event) => event.type === 'UnitMoved');

    expect(moves).toHaveLength(maxMp);
    expect(moves.map((move) => move.mpLeft)).toEqual(
      Array.from({ length: maxMp }, (_, index) => maxMp - index - 1),
    );
    expect(result.state.enemies[0]).toMatchObject({ x: 15 - maxMp, y: 5, mp: 0 });
  });

  it('espera si no puede avanzar ni atacar', () => {
    const walls = makeGridWithWalls([
      { x: 4, y: 4 },
      { x: 5, y: 4 },
      { x: 6, y: 4 },
      { x: 4, y: 5 },
      { x: 6, y: 5 },
      { x: 4, y: 6 },
      { x: 5, y: 6 },
      { x: 6, y: 6 },
    ]);
    const state = makeState({
      grid: walls,
      players: [makeUnit({ id: 'player-1', faction: 'player', x: 10, y: 10 })],
      enemies: [makeUnit({ id: 'enemy-1', faction: 'enemy', x: 5, y: 5 })],
    });

    expect(planEnemyAction(state, state.enemies[0])).toEqual({ type: 'wait' });

    const result = reduce(state, { type: 'EndTurn' });
    expect(result.state.enemies[0]).toMatchObject({ x: 5, y: 5 });
    expect(result.events).toContainEqual({ type: 'EnemyWaited', unitId: 'enemy-1' });
  });

  it('es determinista con el mismo estado', () => {
    const state = makeState({
      players: [makeUnit({ id: 'player-1', faction: 'player', x: 3, y: 3 })],
      enemies: [makeUnit({ id: 'enemy-1', faction: 'enemy', x: 15, y: 10 })],
    });

    expect(planEnemyAction(state, state.enemies[0])).toEqual(
      planEnemyAction(state, state.enemies[0]),
    );
  });
});

describe('alerta con todos los MP', () => {
  it('converge a lastKnown y ataca al quedar adyacente conservando la acción', () => {
    const state = makeState({
      players: [makeUnit({ id: 'player-1', faction: 'player', x: 7, y: 10 })],
      enemies: [
        makeUnit({
          id: 'enemy-1',
          faction: 'enemy',
          enemyType: 'sentinel',
          x: 2,
          y: 10,
          awareness: 'alert',
          lastKnown: { x: 7, y: 10 },
        }),
      ],
      rng: rngForDice([6, 1, 3, 3]),
    });

    const plan = planEnemyAction(state, state.enemies[0]);
    expect(plan).toEqual({
      type: 'move',
      steps: [
        { dx: 1, dy: 0 },
        { dx: 1, dy: 0 },
        { dx: 1, dy: 0 },
        { dx: 1, dy: 0 },
      ],
      attackTargetId: 'player-1',
    });

    const result = reduce(state, { type: 'EndTurn' });
    const moves = result.events.filter((event) => event.type === 'UnitMoved');
    const attacks = result.events.filter((event) => event.type === 'AttackPerformed');

    expect(moves).toHaveLength(4);
    expect(attacks).toHaveLength(2);
    expect(result.state.enemies[0]).toMatchObject({
      x: 6,
      y: 10,
      mp: state.enemies[0].maxMp - moves.length,
      actions: { remaining: 0 },
    });
    expect(result.state.players[0].hp).toBeLessThan(state.players[0].hp);
  });

  it('investiga lastKnown sin atacar si no termina adyacente', () => {
    const state = makeState({
      players: [makeUnit({ id: 'player-1', faction: 'player', x: 18, y: 18 })],
      enemies: [
        makeUnit({
          id: 'enemy-1',
          faction: 'enemy',
          enemyType: 'sentinel',
          x: 2,
          y: 10,
          awareness: 'alert',
          lastKnown: { x: 12, y: 10 },
        }),
      ],
    });

    const plan = planEnemyAction(state, state.enemies[0]);
    expect(plan.type).toBe('move');
    if (plan.type !== 'move') throw new Error('se esperaba un movimiento');
    expect(plan.steps).toHaveLength(BESTIARY.sentinel.maxMp);
    expect(plan.attackTargetId).toBeUndefined();
  });

  it('el regreso vuelve a home sin atacar aunque tenga un jugador adyacente', () => {
    const state = makeState({
      players: [makeUnit({ id: 'player-1', faction: 'player', x: 5, y: 5 })],
      enemies: [
        makeUnit({
          id: 'enemy-1',
          faction: 'enemy',
          x: 6,
          y: 5,
          awareness: 'returning',
          home: { x: 9, y: 9 },
        }),
      ],
    });

    const plan = planEnemyAction(state, state.enemies[0]);
    expect(plan.type).toBe('move');
    if (plan.type !== 'move') throw new Error('se esperaba un movimiento');
    expect(plan.attackTargetId).toBeUndefined();
  });
});

describe('huida del cobarde', () => {
  function fleeingCoward(
    options: {
      readonly x: number;
      readonly y: number;
      readonly grid?: ReturnType<typeof makeGridWithWalls>;
      readonly home?: { readonly x: number; readonly y: number };
      readonly fleeing?: boolean;
    },
  ) {
    return makeUnit({
      id: 'enemy-1',
      faction: 'enemy',
      enemyType: 'coward',
      x: options.x,
      y: options.y,
      awareness: 'alert',
      fleeing: options.fleeing ?? true,
      home: options.home ?? { x: options.x, y: options.y },
    });
  }

  it('rompe la línea de visión de todos los jugadores visibles', () => {
    const grid = makeGridWithWalls([{ x: 7, y: 4 }]);
    const state = makeState({
      grid,
      players: [makeUnit({ id: 'player-1', faction: 'player', x: 5, y: 5 })],
      enemies: [fleeingCoward({ x: 9, y: 5, grid })],
    });
    const enemy = state.enemies[0];

    expect(canSee(grid, enemy, state.players[0])).toBe(true);
    const plan = planEnemyAction(state, enemy);
    expect(plan.type).toBe('move');
    if (plan.type !== 'move') throw new Error('se esperaba un movimiento');

    const final = positionAfter(enemy, plan.steps);
    expect(hasLineOfSight(grid, final, state.players[0])).toBe(false);
    expect(planEnemyAction(state, enemy)).toEqual(plan);
  });

  it('sin cobertura maximiza la distancia al jugador más cercano', () => {
    const state = makeState({
      players: [makeUnit({ id: 'player-1', faction: 'player', x: 5, y: 5 })],
      enemies: [fleeingCoward({ x: 9, y: 9 })],
    });
    const enemy = state.enemies[0];

    const plan = planEnemyAction(state, enemy);
    expect(plan.type).toBe('move');
    if (plan.type !== 'move') throw new Error('se esperaba un movimiento');

    const final = positionAfter(enemy, plan.steps);
    expect(plan.steps).toHaveLength(BESTIARY.coward.maxMp);
    expect(chebyshevDistance(final, state.players[0])).toBeGreaterThan(
      chebyshevDistance(enemy, state.players[0]),
    );
    expect(planEnemyAction(state, enemy)).toEqual(plan);
  });

  it('sin jugador visible vuelve hacia home', () => {
    const state = makeState({
      players: [makeUnit({ id: 'player-1', faction: 'player', x: 18, y: 18 })],
      enemies: [fleeingCoward({ x: 10, y: 10, home: { x: 3, y: 3 } })],
    });
    const enemy = state.enemies[0];
    const plan = planEnemyAction(state, enemy);

    expect(plan.type).toBe('move');
    if (plan.type !== 'move') throw new Error('se esperaba un movimiento');
    expect(plan.attackTargetId).toBeUndefined();
    const final = positionAfter(enemy, plan.steps);
    expect(chebyshevDistance(final, enemy.home)).toBeLessThan(
      chebyshevDistance(enemy, enemy.home),
    );
  });

  it('acorralado se queda y ataca si está adyacente', () => {
    const walls = makeGridWithWalls([
      { x: 5, y: 4 },
      { x: 6, y: 4 },
      { x: 7, y: 4 },
      { x: 7, y: 5 },
      { x: 7, y: 6 },
      { x: 6, y: 6 },
      { x: 5, y: 6 },
    ]);
    const state = makeState({
      grid: walls,
      players: [makeUnit({ id: 'player-1', faction: 'player', x: 5, y: 5 })],
      enemies: [fleeingCoward({ x: 6, y: 5, grid: walls })],
    });

    expect(planEnemyAction(state, state.enemies[0])).toEqual({
      type: 'attack',
      targetId: 'player-1',
    });
  });
});
