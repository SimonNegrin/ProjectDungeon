import { describe, expect, it } from 'vitest';
import {
  WEAPONS,
  armorValue,
  createRng,
  reduce,
  resolveDamage,
  type Unit,
} from '../../../src/game/index';
import { makeState, makeUnit, rngForDice } from './helpers';

function expectedDamage(
  attacker: Unit,
  target: Unit,
  damageDie: number,
  armorDie: number,
): number {
  return resolveDamage(
    attacker.modifiers.damage + WEAPONS[attacker.equipment.weaponId].damage,
    armorValue(target.equipment.armorId),
    damageDie,
    armorDie,
  );
}

describe('turn phase', () => {
  it('EndTurn ejecuta la fase enemiga y restaura MP y acción del jugador', () => {
    const state = makeState({
      players: [makeUnit({ id: 'player-1', faction: 'player', x: 5, y: 5, mp: 0, actionAvailable: false })],
      enemies: [makeUnit({ id: 'enemy-1', faction: 'enemy', x: 10, y: 5 })],
      rng: rngForDice([6, 1, 3, 3]),
    });
    const damage = expectedDamage(state.enemies[0], state.players[0], 3, 3);

    const result = reduce(state, { type: 'EndTurn' });

    expect(result.state.phase).toBe('player');
    expect(result.state.turn).toBe(2);
    expect(result.state.players[0]).toMatchObject({
      mp: 6,
      actionAvailable: true,
      hp: state.players[0].hp - damage,
    });
    expect(result.state.enemies[0]).toMatchObject({
      x: 6,
      y: 5,
      mp: 0,
      actionAvailable: false,
    });
    expect(result.events.map((event) => event.type)).toEqual([
      'TurnEnded',
      'EnemyPhaseStarted',
      'UnitMoved',
      'UnitMoved',
      'UnitMoved',
      'UnitMoved',
      'AttackPerformed',
      'PlayerTurnStarted',
    ]);
  });

  it('restaura MP y acción del enemigo al empezar su fase', () => {
    const state = makeState({
      players: [makeUnit({ id: 'player-1', faction: 'player', x: 18, y: 5 })],
      enemies: [
        makeUnit({
          id: 'enemy-1',
          faction: 'enemy',
          x: 10,
          y: 5,
          mp: 0,
          actionAvailable: false,
        }),
      ],
    });

    const result = reduce(state, { type: 'EndTurn' });

    expect(result.state.enemies[0]).toMatchObject({ x: 14, y: 5, mp: 0 });
    expect(result.state.enemies[0].actionAvailable).toBe(true);
  });

  it('ejecuta la fase completa con varios enemigos en orden de índice', () => {
    const state = makeState({
      players: [makeUnit({ id: 'player-1', faction: 'player', x: 5, y: 5 })],
      enemies: [
        makeUnit({ id: 'enemy-1', faction: 'enemy', x: 10, y: 5 }),
        makeUnit({ id: 'enemy-2', faction: 'enemy', x: 5, y: 10 }),
      ],
    });

    const result = reduce(state, { type: 'EndTurn' });
    const moves = result.events.filter((event) => event.type === 'UnitMoved');

    expect(result.state.enemies).toMatchObject([
      { id: 'enemy-1', x: 6, y: 5 },
      { id: 'enemy-2', x: 5, y: 6 },
    ]);
    expect(moves.map((move) => move.unitId)).toEqual([
      'enemy-1',
      'enemy-1',
      'enemy-1',
      'enemy-1',
      'enemy-2',
      'enemy-2',
      'enemy-2',
      'enemy-2',
    ]);
    expect(moves[0]).toMatchObject({
      unitId: 'enemy-1',
      from: { x: 10, y: 5 },
      to: { x: 9, y: 5 },
      mpLeft: 3,
    });
    expect(moves[3]).toMatchObject({
      unitId: 'enemy-1',
      from: { x: 7, y: 5 },
      to: { x: 6, y: 5 },
      mpLeft: 0,
    });
    expect(moves[4]).toMatchObject({
      unitId: 'enemy-2',
      from: { x: 5, y: 10 },
      to: { x: 5, y: 9 },
      mpLeft: 3,
    });
    expect(moves[7]).toMatchObject({
      unitId: 'enemy-2',
      from: { x: 5, y: 7 },
      to: { x: 5, y: 6 },
      mpLeft: 0,
    });
  });

  it('varios enemigos adyacentes atacan en la misma fase', () => {
    const state = makeState({
      players: [makeUnit({ id: 'player-1', faction: 'player', x: 5, y: 5 })],
      enemies: [
        makeUnit({ id: 'enemy-1', faction: 'enemy', x: 6, y: 5 }),
        makeUnit({ id: 'enemy-2', faction: 'enemy', x: 5, y: 6 }),
      ],
      // Semilla fijada: ambos enemigos impactan.
      rng: createRng(102),
    });
    const firstDamage = expectedDamage(state.enemies[0], state.players[0], 5, 5);
    const secondDamage = expectedDamage(state.enemies[1], state.players[0], 1, 1);
    const firstHp = state.players[0].hp - firstDamage;
    const secondHp = firstHp - secondDamage;

    const result = reduce(state, { type: 'EndTurn' });
    const attacks = result.events.filter((event) => event.type === 'AttackPerformed');

    expect(attacks).toHaveLength(2);
    expect(attacks).toEqual([
      {
        type: 'AttackPerformed',
        attackerId: 'enemy-1',
        targetId: 'player-1',
        hit: true,
        damage: firstDamage,
        targetHp: firstHp,
        rolls: { attack: 6, shield: 5, damage: 5, armor: 5 },
      },
      {
        type: 'AttackPerformed',
        attackerId: 'enemy-2',
        targetId: 'player-1',
        hit: true,
        damage: secondDamage,
        targetHp: secondHp,
        rolls: { attack: 5, shield: 2, damage: 1, armor: 1 },
      },
    ]);
    expect(result.state.players[0].hp).toBe(secondHp);
  });

  it('detiene la fase enemiga en cuanto muere el último jugador', () => {
    const state = makeState({
      players: [makeUnit({ id: 'player-1', faction: 'player', x: 5, y: 5, hp: 1 })],
      enemies: [
        makeUnit({ id: 'enemy-1', faction: 'enemy', x: 6, y: 5 }),
        makeUnit({ id: 'enemy-2', faction: 'enemy', x: 5, y: 6 }),
      ],
      rng: rngForDice([6, 1, 3, 3]),
    });

    const result = reduce(state, { type: 'EndTurn' });
    const attacks = result.events.filter((event) => event.type === 'AttackPerformed');

    expect(result.state.status).toBe('defeat');
    expect(result.state.players[0].hp).toBe(0);
    expect(attacks).toHaveLength(1);
    expect(result.events.map((event) => event.type)).not.toContain('PlayerTurnStarted');
  });

  it('rechaza EndTurn si la partida ha terminado o la fase no es del jugador', () => {
    const finished = makeState({ status: 'victory' });
    const finishedResult = reduce(finished, { type: 'EndTurn' });
    expect(finishedResult.events).toEqual([
      { type: 'CommandRejected', commandType: 'EndTurn', reason: 'game-over' },
    ]);

    const enemyPhase = makeState({ phase: 'enemy' });
    const enemyPhaseResult = reduce(enemyPhase, { type: 'EndTurn' });
    expect(enemyPhaseResult.events).toEqual([
      { type: 'CommandRejected', commandType: 'EndTurn', reason: 'wrong-phase' },
    ]);
  });
});
