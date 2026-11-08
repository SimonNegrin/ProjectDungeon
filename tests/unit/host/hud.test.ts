import { describe, expect, it } from 'vitest';
import { createInitialState, reduce } from '../../../src/game/index';
import type { GameState } from '../../../src/game/types';
import { buildDebugModel, buildHudModel, KEYS_HELP } from '../../../src/host/hud';
import type { CursorStatus } from '../../../src/host/cursor';
import { makeState, makeUnit, rngForDice } from '../game/helpers';

const PLAYER_CURSOR: CursorStatus = {
  x: 4,
  y: 4,
  visible: true,
  kind: 'player',
  state: 'player',
  path: [],
  cost: 0,
  withinMp: true,
  strongSteps: 0,
};

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
    const model = buildHudModel(makeState());

    expect(model).toMatchObject({
      playerHp: '20/20',
      playerMp: '6/6',
      action: 'Sí',
      phase: 'Jugador',
      enemyHp: '10/10',
      turn: 'Turno 1',
      status: 'En juego',
    });
    expect(model.keys).toBe(KEYS_HELP);
    expect(model.keys).toContain('cursor');
    expect(model.keys).toContain('Espacio/Enter moverse');
    expect(model.keys).toContain('F atacar');
    expect(model.keys).toContain('E terminar turno');
    expect(model.keys).toContain('R reiniciar');
    expect(model.keys).toContain('F1');
    expect(model.overlays).toEqual({ victory: false, defeat: false });
  });

  it('actualiza la vida del enemigo y la acción tras un ataque', () => {
    const state = makeState({
      players: [makeUnit({ id: 'player-1', faction: 'player', x: 5, y: 5 })],
      enemies: [makeUnit({ id: 'enemy-1', faction: 'enemy', x: 6, y: 5 })],
      rng: rngForDice([6, 1, 2, 1]),
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
      rng: rngForDice([6, 1, 3, 3]),
    });

    const model = buildHudModel(endTurn(state));

    expect(model.phase).toBe('Jugador');
    expect(model.turn).toBe('Turno 2');
    expect(model.playerHp).toBe('17/20');
    expect(model.playerMp).toBe('6/6');
    expect(model.action).toBe('Sí');
    expect(model.status).toBe('En juego');
  });

  it('muestra el overlay de victoria cuando el enemigo muere', () => {
    const state = makeState({
      players: [makeUnit({ id: 'player-1', faction: 'player', x: 5, y: 5 })],
      enemies: [makeUnit({ id: 'enemy-1', faction: 'enemy', x: 6, y: 5, hp: 5 })],
      rng: rngForDice([6, 1, 2, 1]),
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
      rng: rngForDice([6, 1, 3, 3]),
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
      makeState(),
      { x: 0, y: 0 },
      { maxX: 224, maxY: 224 },
      { width: 416, height: 416 },
      [],
      PLAYER_CURSOR,
    );
    const text = model.lines.join('\n');

    expect(text).toContain('Jugador: (4, 4)');
    expect(text).toContain('MP 6/6');
    expect(text).toContain('Enemigo: (15, 15)');
    expect(text).toContain('Fase: Jugador · Turno 1');
    expect(text).toContain('Cursor: (4, 4) jugador · camino 0');
    expect(text).toContain('Cámara: (0, 0) · Límites (224, 224) · Viewport 416×416');
    expect(text).toContain('Semilla: n/a (determinista)');
    expect(text).toContain('Últimos eventos: ninguno');
  });

  it('resume los últimos eventos', () => {
    const state = makeState();
    const result = reduce(state, { type: 'Move', unitId: 'player-1', dx: 1, dy: 0 });

    const model = buildDebugModel(
      result.state,
      { x: 0, y: 0 },
      { maxX: 224, maxY: 224 },
      { width: 416, height: 416 },
      result.events,
      PLAYER_CURSOR,
    );

    expect(model.lines.join('\n')).toContain('player-1: (4,4)→(5,4) MP 5');
  });

  it('con un mapa generado muestra semilla, salas, huecos, spawns y pasillos anchos', () => {
    const model = buildDebugModel(
      createInitialState({ seed: 279837264 }),
      { x: 0, y: 64 },
      { maxX: 608, maxY: 608 },
      { width: 416, height: 416 },
      [],
      { ...PLAYER_CURSOR, x: 6, y: 8 },
    );
    const text = model.lines.join('\n');

    expect(text).toContain('Cursor: (6, 8) jugador · camino 0');
    expect(text).toContain('Semilla: 279837264');
    expect(text).toContain('Salas:');
    expect(text).toContain('0 (3,4) 7×9 large');
    expect(text).toContain('Huecos:');
    expect(text).toContain('(10,5) vertical sala 0');
    expect(text).toContain('Spawns: jugador (6,8) · enemigo (23,28) · distancia 59');
    expect(text).toContain('Pasillos anchos:');
    expect(text).toContain('0→1 2 tiles');
    expect(text).toContain('F2 nueva semilla');
  });

  it('sin mapa mantiene las líneas n/a del overlay', () => {
    const text = buildDebugModel(
      makeState(),
      { x: 0, y: 0 },
      { maxX: 224, maxY: 224 },
      { width: 416, height: 416 },
      [],
      PLAYER_CURSOR,
    ).lines.join('\n');

    expect(text).toContain('Semilla: n/a (determinista)');
    expect(text).toContain('Salas: n/a');
    expect(text).toContain('Huecos: n/a');
    expect(text).toContain('Spawns: n/a');
    expect(text).toContain('Pasillos anchos: n/a');
  });
});
