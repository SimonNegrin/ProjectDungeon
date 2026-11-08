import { describe, expect, it } from 'vitest';
import type { Command } from '../../../src/game/index';
import { GameSession } from '../../../src/host/session';
import { makeState, makeUnit, rngForDice } from '../game/helpers';

describe('GameSession con MoveTo', () => {
  it('acepta el comando serializable, devuelve estado y eventos serializables y no muta la entrada', () => {
    const initial = makeState({
      players: [makeUnit({ id: 'player-1', faction: 'player', x: 2, y: 5 })],
      enemies: [],
    });
    const before = JSON.stringify(initial);
    const session = new GameSession(initial);
    const command = JSON.parse(
      JSON.stringify({ type: 'MoveTo', unitId: 'player-1', target: { x: 5, y: 5 } }),
    ) as Command;

    const result = session.dispatch(command);

    expect(result.state.players[0]).toMatchObject({
      x: 5,
      y: 5,
      mp: 3,
      actionAvailable: true,
    });
    expect(result.events.map((event) => event.type)).toEqual([
      'UnitMoved',
      'UnitMoved',
      'UnitMoved',
    ]);
    expect(JSON.parse(JSON.stringify(result.state))).toEqual(result.state);
    expect(JSON.parse(JSON.stringify(result.events))).toEqual(result.events);
    expect(JSON.stringify(initial)).toBe(before);
    expect(session.state).toBe(result.state);
    expect(session.state).not.toBe(initial);
  });

  it('resuelve acercarse y atacar con un único dispatch', () => {
    const session = new GameSession(
      makeState({
        players: [makeUnit({ id: 'player-1', faction: 'player', x: 2, y: 2, mp: 3 })],
        enemies: [
          makeUnit({ id: 'enemy-1', faction: 'enemy', x: 6, y: 6, hp: 5 }),
        ],
        rng: rngForDice([6, 1, 2, 1]),
      }),
    );

    const result = session.dispatch({
      type: 'MoveTo',
      unitId: 'player-1',
      target: { x: 6, y: 6 },
    });

    expect(session.state.players[0]).toMatchObject({
      x: 5,
      y: 5,
      mp: 0,
      actionAvailable: false,
    });
    expect(result.events.map((event) => event.type)).toEqual([
      'UnitMoved',
      'UnitMoved',
      'UnitMoved',
      'AttackPerformed',
      'UnitDied',
      'GameEnded',
    ]);
    expect(session.state.status).toBe('victory');
  });
});
