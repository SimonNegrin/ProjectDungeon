import { describe, expect, it } from 'vitest';
import { createInitialState } from '../../../src/game/index';
import type { Position } from '../../../src/game/types';
import { buildHudModel } from '../../../src/host/hud';
import { translateKey } from '../../../src/host/input';
import { GameSession } from '../../../src/host/session';
import { makeState, makeUnit, rngForDice } from '../game/helpers';
import type { RngState } from '../../../src/game/index';

function adjacentState(rng?: RngState) {
  return makeState({
    players: [makeUnit({ id: 'player-1', faction: 'player', x: 5, y: 5 })],
    enemies: [makeUnit({ id: 'enemy-1', faction: 'enemy', x: 6, y: 5 })],
    rng,
  });
}

function commandFromKey(key: string, session: GameSession, cursor: Position) {
  const intent = translateKey({ key }, session.state, cursor);
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

  it('integra tecla -> MoveTo -> reduce -> eventos -> HUD', () => {
    const session = new GameSession(makeState());

    const result = session.dispatch(commandFromKey(' ', session, { x: 5, y: 4 }));

    expect(result.events).toEqual([
      {
        type: 'UnitMoved',
        unitId: 'player-1',
        from: { x: 4, y: 4 },
        to: { x: 5, y: 4 },
        mpLeft: 5,
      },
    ]);
    expect(session.state.players[0]).toMatchObject({ x: 5, y: 4, mp: 5 });
    expect(buildHudModel(session.state).playerMp).toBe('5/6');
  });

  it('EndTurn emite la fase enemiga y devuelve el control al jugador', () => {
    const session = new GameSession(adjacentState(rngForDice([6, 1, 3, 3])));

    const result = session.dispatch(commandFromKey('e', session, { x: 5, y: 5 }));
    const types = result.events.map((event) => event.type);

    expect(types).toContain('EnemyPhaseStarted');
    expect(types).toContain('PlayerTurnStarted');
    expect(session.state.phase).toBe('player');
    expect(session.state.turn).toBe(2);
    expect(session.state.players[0]).toMatchObject({ hp: 17, mp: 6, actionAvailable: true });
  });

  it('un ataque con F actualiza la vida y emite AttackPerformed', () => {
    const session = new GameSession(adjacentState(rngForDice([6, 1, 2, 1])));

    const result = session.dispatch(commandFromKey('f', session, { x: 6, y: 5 }));

    expect(result.events).toEqual([
      {
        type: 'AttackPerformed',
        attackerId: 'player-1',
        targetId: 'enemy-1',
        hit: true,
        damage: 5,
        targetHp: 5,
        rolls: { attack: 6, shield: 1, damage: 2, armor: 1 },
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
        rng: rngForDice([6, 1, 2, 1]),
      }),
    );

    const result = session.dispatch(commandFromKey('Enter', session, { x: 6, y: 5 }));

    expect(result.events).toEqual([
      {
        type: 'AttackPerformed',
        attackerId: 'player-1',
        targetId: 'enemy-1',
        hit: true,
        damage: 5,
        targetHp: 0,
        rolls: { attack: 6, shield: 1, damage: 2, armor: 1 },
      },
      { type: 'UnitDied', unitId: 'enemy-1' },
      { type: 'GameEnded', status: 'victory' },
    ]);
    expect(session.state.status).toBe('victory');
  });

  it('Restart vuelve al estado inicial', () => {
    const session = new GameSession(adjacentState());
    session.dispatch(commandFromKey(' ', session, { x: 5, y: 4 }));

    const result = session.dispatch({ type: 'Restart' });

    expect(result.events).toEqual([{ type: 'GameRestarted' }]);
    expect(session.state).toEqual(createInitialState());
  });

  it('arranca con la semilla y los spawns del mapa generado', () => {
    const session = new GameSession({ seed: 279837264 });

    expect(session.seed).toBe(279837264);
    expect(session.state.grid).toMatchObject({ width: 32, height: 32 });
    expect(session.state.map?.seed).toBe(279837264);
    expect(session.state.players[0]).toMatchObject({ x: 6, y: 8 });
    expect(session.state.enemies[0]).toMatchObject({ x: 23, y: 28 });
  });

  it('R conserva la semilla y reconstruye exactamente el mismo mapa', () => {
    const session = new GameSession({ seed: 279837264 });
    const mapBefore = JSON.parse(JSON.stringify(session.state.map));

    session.dispatch(commandFromKey(' ', session, { x: 7, y: 8 }));
    const result = session.dispatch({ type: 'Restart' });

    expect(result.events).toEqual([{ type: 'GameRestarted' }]);
    expect(session.seed).toBe(279837264);
    expect(JSON.parse(JSON.stringify(session.state.map))).toEqual(mapBefore);
    expect(session.state.players[0]).toMatchObject({ x: 6, y: 8, mp: 6 });
  });

  it('regenerate cambia la semilla y el mapa manteniendo el camino de la sesión', () => {
    const session = new GameSession({ seed: 279837264 });
    const before = JSON.parse(JSON.stringify(session.state.map));

    session.regenerate(123456789);

    expect(session.seed).toBe(123456789);
    expect(session.state.map?.seed).toBe(123456789);
    expect(JSON.parse(JSON.stringify(session.state.map))).not.toEqual(before);
    expect(session.state.turn).toBe(1);
    expect(session.state.status).toBe('playing');
  });

  it('una sesión manual sin mapa sigue reiniciando al estado por defecto', () => {
    const session = new GameSession(makeState());
    session.dispatch(commandFromKey(' ', session, { x: 5, y: 4 }));

    session.dispatch({ type: 'Restart' });

    expect(session.state).toEqual(createInitialState());
  });

  it('un comando rechazado no muta el estado ni lanza', () => {
    const session = new GameSession(makeState());
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
