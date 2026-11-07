import { describe, expect, it } from 'vitest';
import { createInitialState } from '../../../src/game/index';
import { buildHudModel } from '../../../src/host/hud';
import { translateKey } from '../../../src/host/input';
import { GameSession } from '../../../src/host/session';
import { makeState, makeUnit } from '../game/helpers';

function adjacentState() {
  return makeState({
    players: [makeUnit({ id: 'player-1', faction: 'player', x: 5, y: 5 })],
    enemies: [makeUnit({ id: 'enemy-1', faction: 'enemy', x: 6, y: 5 })],
  });
}

function commandFromKey(key: string, session: GameSession) {
  const intent = translateKey({ key }, session.state);
  if (intent.type !== 'command') {
    throw new Error(`La tecla ${key} no produjo un comando: ${intent.type}`);
  }
  return intent.command;
}

describe('sesión de juego', () => {
  it('empieza en el estado inicial', () => {
    const session = new GameSession();

    expect(session.state).toEqual(createInitialState());
  });

  it('integra tecla -> comando -> reduce -> eventos -> HUD', () => {
    const session = new GameSession();

    const result = session.dispatch(commandFromKey('d', session));

    expect(result.events).toEqual([
      {
        type: 'UnitMoved',
        unitId: 'player-1',
        from: { x: 2, y: 2 },
        to: { x: 3, y: 2 },
        mpLeft: 3,
      },
    ]);
    expect(session.state.players[0]).toMatchObject({ x: 3, y: 2, mp: 3 });
    expect(buildHudModel(session.state).playerMp).toBe('3/4');
  });

  it('EndTurn emite la fase enemiga y devuelve el control al jugador', () => {
    const session = new GameSession(adjacentState());

    const result = session.dispatch(commandFromKey('e', session));
    const types = result.events.map((event) => event.type);

    expect(types).toContain('EnemyPhaseStarted');
    expect(types).toContain('PlayerTurnStarted');
    expect(session.state.phase).toBe('player');
    expect(session.state.turn).toBe(2);
    expect(session.state.players[0]).toMatchObject({ hp: 17, mp: 4, actionAvailable: true });
  });

  it('un ataque actualiza la vida y emite AttackPerformed', () => {
    const session = new GameSession(adjacentState());

    const result = session.dispatch(commandFromKey(' ', session));

    expect(result.events).toEqual([
      {
        type: 'AttackPerformed',
        attackerId: 'player-1',
        targetId: 'enemy-1',
        damage: 5,
        targetHp: 5,
      },
    ]);
    expect(session.state.enemies[0]).toMatchObject({ hp: 5 });
    expect(session.state.players[0].actionAvailable).toBe(false);
    expect(buildHudModel(session.state).enemyHp).toBe('5/10');
  });

  it('la muerte del enemigo emite UnitDied y GameEnded con victoria', () => {
    const session = new GameSession(
      makeState({
        players: [makeUnit({ id: 'player-1', faction: 'player', x: 5, y: 5 })],
        enemies: [makeUnit({ id: 'enemy-1', faction: 'enemy', x: 6, y: 5, hp: 5 })],
      }),
    );

    const result = session.dispatch(commandFromKey('Enter', session));

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
    expect(session.state.status).toBe('victory');
  });

  it('Restart vuelve al estado inicial', () => {
    const session = new GameSession(adjacentState());
    session.dispatch(commandFromKey('d', session));

    const result = session.dispatch({ type: 'Restart' });

    expect(result.events).toEqual([{ type: 'GameRestarted' }]);
    expect(session.state).toEqual(createInitialState());
  });

  it('un comando rechazado no muta el estado ni lanza', () => {
    const session = new GameSession();
    const before = session.state;

    const result = session.dispatch({
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
    expect(result.state).toBe(before);
    expect(session.state).toBe(before);
  });
});
