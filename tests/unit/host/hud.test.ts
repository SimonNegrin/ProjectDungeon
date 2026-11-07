import { describe, expect, it } from 'vitest';
import { createInitialState, reduce } from '../../../src/game/index';
import type { GameState } from '../../../src/game/types';
import { buildDebugModel, buildHudModel, KEYS_HELP } from '../../../src/host/hud';
import { makeState, makeUnit } from '../game/helpers';

function attack(state: GameState): GameState {
  return reduce(state, {
    type: 'Attack',
    unitId: 'player-1',
    targetId: 'enemy-1',
  }).state;
}

function endTurn(state: GameState): GameState {
  return reduce(state, { type: 'EndTurn' }).state;
}

describe('modelo del HUD', () => {
  it('refleja el estado inicial con vida, MP, acción, fase, enemigo y ayuda', () => {
    const model = buildHudModel(createInitialState());

    expect(model).toMatchObject({
      playerHp: '20/20',
      playerMp: '4/4',
      action: 'Sí',
      phase: 'Jugador',
      enemyHp: '10/10',
      turn: 'Turno 1',
      status: 'En juego',
    });
    expect(model.keys).toBe(KEYS_HELP);
    expect(model.keys).toContain('WASD');
    expect(model.keys).toContain('Espacio');
    expect(model.keys).toContain('E terminar turno');
    expect(model.keys).toContain('R reiniciar');
    expect(model.keys).toContain('F1');
    expect(model.overlays).toEqual({ victory: false, defeat: false });
  });

  it('actualiza la vida del enemigo y la acción tras un ataque', () => {
    const state = makeState({
      players: [makeUnit({ id: 'player-1', faction: 'player', x: 5, y: 5 })],
      enemies: [makeUnit({ id: 'enemy-1', faction: 'enemy', x: 6, y: 5 })],
    });

    const model = buildHudModel(attack(state));

    expect(model.enemyHp).toBe('5/10');
    expect(model.action).toBe('No');
    expect(model.playerHp).toBe('20/20');
  });

  it('refleja la fase de jugador, el turno y la restauración tras fin de turno', () => {
    const state = makeState({
      players: [makeUnit({ id: 'player-1', faction: 'player', x: 5, y: 5 })],
      enemies: [makeUnit({ id: 'enemy-1', faction: 'enemy', x: 6, y: 5 })],
    });

    const model = buildHudModel(endTurn(state));

    expect(model.phase).toBe('Jugador');
    expect(model.turn).toBe('Turno 2');
    expect(model.playerHp).toBe('17/20');
    expect(model.playerMp).toBe('4/4');
    expect(model.action).toBe('Sí');
    expect(model.status).toBe('En juego');
  });

  it('muestra el overlay de victoria cuando el enemigo muere', () => {
    const state = makeState({
      players: [makeUnit({ id: 'player-1', faction: 'player', x: 5, y: 5 })],
      enemies: [makeUnit({ id: 'enemy-1', faction: 'enemy', x: 6, y: 5, hp: 5 })],
    });

    const model = buildHudModel(attack(state));

    expect(model.enemyHp).toBe('0/10');
    expect(model.status).toBe('Victoria');
    expect(model.overlays).toEqual({ victory: true, defeat: false });
  });

  it('muestra el overlay de derrota cuando el jugador muere', () => {
    const state = makeState({
      players: [makeUnit({ id: 'player-1', faction: 'player', x: 5, y: 5, hp: 3 })],
      enemies: [makeUnit({ id: 'enemy-1', faction: 'enemy', x: 6, y: 5 })],
    });

    const model = buildHudModel(endTurn(state));

    expect(model.playerHp).toBe('0/20');
    expect(model.status).toBe('Derrota');
    expect(model.overlays).toEqual({ victory: false, defeat: true });
  });
});

describe('modelo del overlay de debug', () => {
  it('incluye posiciones, MP, fase, cámara y semilla determinista', () => {
    const model = buildDebugModel(
      createInitialState(),
      { x: 0, y: 0 },
      { maxX: 64, maxY: 168 },
      { width: 960, height: 600 },
      [],
    );
    const text = model.lines.join('\n');

    expect(text).toContain('Jugador: (2, 2)');
    expect(text).toContain('MP 4/4');
    expect(text).toContain('Enemigo: (29, 21)');
    expect(text).toContain('Fase: Jugador · Turno 1');
    expect(text).toContain('Cámara: (0, 0) · Límites (64, 168) · Viewport 960×600');
    expect(text).toContain('Semilla: n/a (determinista)');
    expect(text).toContain('Últimos eventos: ninguno');
  });

  it('resume los últimos eventos', () => {
    const state = createInitialState();
    const result = reduce(state, { type: 'Move', unitId: 'player-1', dx: 1, dy: 0 });

    const model = buildDebugModel(
      result.state,
      { x: 0, y: 0 },
      { maxX: 64, maxY: 168 },
      { width: 960, height: 600 },
      result.events,
    );

    expect(model.lines.join('\n')).toContain('player-1: (2,2)→(3,2) MP 3');
  });
});
