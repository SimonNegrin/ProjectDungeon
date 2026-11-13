import { describe, expect, it } from 'vitest';
import { isManagedKey, translateKey, type InputIntent } from '../../../src/host/input';
import type { GameState, Position } from '../../../src/game/types';
import { makeState, makeUnit } from '../game/helpers';

const PLAYER_TILE: Position = { x: 4, y: 4 };

function adjacentState() {
  return makeState({
    players: [makeUnit({ id: 'player-1', faction: 'player', x: 5, y: 5 })],
    enemies: [makeUnit({ id: 'enemy-1', faction: 'enemy', x: 6, y: 6 })],
  });
}

function expectCommand(intent: InputIntent, command: unknown): void {
  expect(intent).toEqual({ type: 'command', command });
}

function translate(key: string, state: GameState = makeState(), cursor = PLAYER_TILE) {
  return translateKey({ key }, state, cursor);
}

describe('mapeo de teclado a intenciones del host', () => {
  it.each([
    ['w', 0, -1],
    ['ArrowUp', 0, -1],
    ['s', 0, 1],
    ['ArrowDown', 0, 1],
    ['a', -1, 0],
    ['ArrowLeft', -1, 0],
    ['d', 1, 0],
    ['ArrowRight', 1, 0],
  ])('la tecla %s mueve el cursor con dx=%i dy=%i', (key, dx, dy) => {
    expect(translate(key)).toEqual({ type: 'cursor', dx, dy });
  });

  it('normaliza WASD en mayúsculas', () => {
    expect(translate('D')).toEqual({ type: 'cursor', dx: 1, dy: 0 });
  });

  it('Espacio y Enter envían MoveTo al tile del cursor', () => {
    const state = makeState();
    const cursor = { x: 7, y: 6 };

    for (const key of [' ', 'Enter']) {
      expectCommand(translate(key, state, cursor), {
        type: 'MoveTo',
        unitId: 'player-1',
        target: { x: 7, y: 6 },
      });
    }
  });

  it('F ataca al enemigo vivo bajo el cursor', () => {
    const state = adjacentState();

    expectCommand(translate('f', state, { x: 6, y: 6 }), {
      type: 'Attack',
      unitId: 'player-1',
      targetId: 'enemy-1',
    });
    expectCommand(translate('F', state, { x: 6, y: 6 }), {
      type: 'Attack',
      unitId: 'player-1',
      targetId: 'enemy-1',
    });
  });

  it('F envía Attack aunque el enemigo esté lejos: el motor decide el rechazo', () => {
    const state = makeState();

    expectCommand(translate('f', state, { x: 15, y: 15 }), {
      type: 'Attack',
      unitId: 'player-1',
      targetId: 'enemy-1',
    });
  });

  it('F sin enemigo bajo el cursor avisa sin despachar', () => {
    const state = makeState();

    expect(translate('f', state, { x: 5, y: 4 })).toEqual({
      type: 'notice',
      notice: 'enemy-out-of-range',
    });
    expect(translate('f', state, { x: 4, y: 4 })).toEqual({
      type: 'notice',
      notice: 'enemy-out-of-range',
    });
  });

  it('F no ataca a un enemigo muerto', () => {
    const state = makeState({
      players: [makeUnit({ id: 'player-1', faction: 'player', x: 5, y: 5 })],
      enemies: [makeUnit({ id: 'enemy-1', faction: 'enemy', x: 6, y: 5, hp: 0 })],
    });

    expect(translate('f', state, { x: 6, y: 5 })).toEqual({
      type: 'notice',
      notice: 'enemy-out-of-range',
    });
  });

  it('E, R, F1 y F2 producen fin de turno, reinicio, debug y semilla nueva', () => {
    const state = makeState();

    expectCommand(translate('e', state), { type: 'EndTurn' });
    expectCommand(translate('R', state), { type: 'Restart' });
    expect(translate('F1', state)).toEqual({ type: 'toggle-debug' });
    expect(translate('F2', state)).toEqual({ type: 'new-seed' });
  });

  it('I abre el panel en el turno del jugador sin coste', () => {
    const state = makeState();

    expect(translate('i', state)).toEqual({ type: 'panel-open' });
    expect(translate('I', state)).toEqual({ type: 'panel-open' });
  });

  it('I exige partida en curso, fase de jugador y un jugador vivo', () => {
    const state = makeState();
    const enemyPhase = { ...state, phase: 'enemy' as const };
    const noPlayer = {
      ...state,
      players: [makeUnit({ id: 'player-1', faction: 'player', x: 4, y: 4, hp: 0 })],
    };

    expect(translate('i', enemyPhase)).toEqual({
      type: 'ignored',
      reason: 'wrong-phase',
    });
    expect(translate('i', noPlayer)).toEqual({
      type: 'ignored',
      reason: 'no-active-player',
    });
    expect(translate('i', makeState({ status: 'victory' }))).toEqual({
      type: 'ignored',
      reason: 'game-over',
    });
  });

  it('I no abre el panel con la lista de hechizos abierta', () => {
    expect(
      translateKey({ key: 'i' }, makeState(), PLAYER_TILE, {
        spellMenu: { open: true, index: 0, selectedId: null },
      }),
    ).toEqual({ type: 'ignored', reason: 'spell-menu-open' });
  });

  it('con el panel abierto solo Escape e I cierran y el mapa no recibe comandos', () => {
    const state = adjacentState();
    const open = { panelOpen: true };

    expect(translateKey({ key: 'Escape' }, state, PLAYER_TILE, open)).toEqual({
      type: 'panel-close',
    });
    expect(translateKey({ key: 'i' }, state, PLAYER_TILE, open)).toEqual({
      type: 'panel-close',
    });
    for (const key of ['d', ' ', 'Enter', 'f', 'e', 'r', 'F1', 'F2', 'q', 'x', 'g', '1', '2', '3']) {
      expect(translateKey({ key }, state, PLAYER_TILE, open)).toEqual({
        type: 'ignored',
        reason: 'panel-open',
      });
    }
  });

  it('G y 1-3 ya no se mapean a recoger ni a equipar', () => {
    const state = makeState();

    for (const key of ['g', 'G', '1', '2', '3']) {
      expect(translate(key, state)).toEqual({
        type: 'ignored',
        reason: 'unmapped',
      });
    }
  });

  it('ignora repeticiones y modificadores', () => {
    const state = makeState();

    expect(translateKey({ key: 'd', repeat: true }, state, PLAYER_TILE)).toEqual({
      type: 'ignored',
      reason: 'repeat',
    });
    expect(translateKey({ key: 'F2', repeat: true }, state, PLAYER_TILE)).toEqual({
      type: 'ignored',
      reason: 'repeat',
    });

    for (const modifier of ['ctrlKey', 'metaKey', 'altKey'] as const) {
      expect(
        translateKey({ key: 'd', [modifier]: true }, state, PLAYER_TILE),
      ).toEqual({
        type: 'ignored',
        reason: 'modifier',
      });
      expect(
        translateKey({ key: 'f', [modifier]: true }, state, PLAYER_TILE),
      ).toEqual({
        type: 'ignored',
        reason: 'modifier',
      });
    }
  });

  it('con la partida terminada solo reaccionan R, F1 y F2', () => {
    const state = makeState({ status: 'victory' });

    for (const key of ['w', ' ', 'Enter', 'f', 'e']) {
      expect(translate(key, state)).toEqual({
        type: 'ignored',
        reason: 'game-over',
      });
    }
    expectCommand(translate('r', state), { type: 'Restart' });
    expect(translate('F1', state)).toEqual({ type: 'toggle-debug' });
    expect(translate('F2', state)).toEqual({ type: 'new-seed' });
  });

  it('en fase enemiga no se mueve el cursor ni se actúa ni se termina turno', () => {
    const state = adjacentState();
    const enemyPhase = { ...state, phase: 'enemy' as const };

    for (const key of ['d', ' ', 'f', 'e']) {
      expect(translate(key, enemyPhase, { x: 6, y: 6 })).toEqual({
        type: 'ignored',
        reason: 'wrong-phase',
      });
    }
  });

  it('ignora teclas no gestionadas', () => {
    expect(translate('z')).toEqual({
      type: 'ignored',
      reason: 'unmapped',
    });
  });

  it('no muta el estado ni el cursor', () => {
    const state = adjacentState();
    const cursor = { x: 6, y: 6 };
    const beforeState = JSON.stringify(state);
    const beforeCursor = JSON.stringify(cursor);

    translateKey({ key: 'f' }, state, cursor);
    translateKey({ key: ' ' }, state, cursor);
    translateKey({ key: 'ArrowUp' }, state, cursor);

    expect(JSON.stringify(state)).toBe(beforeState);
    expect(JSON.stringify(cursor)).toBe(beforeCursor);
  });

  it('bloquea el comportamiento del navegador con F1, F2, F, I y Escape', () => {
    expect(isManagedKey('F1')).toBe(true);
    expect(isManagedKey('f2')).toBe(true);
    expect(isManagedKey('f')).toBe(true);
    expect(isManagedKey('i')).toBe(true);
    expect(isManagedKey('I')).toBe(true);
    expect(isManagedKey('Escape')).toBe(true);
    expect(isManagedKey('g')).toBe(false);
    expect(isManagedKey('1')).toBe(false);
    expect(isManagedKey('2')).toBe(false);
    expect(isManagedKey('3')).toBe(false);
    expect(isManagedKey('q')).toBe(false);
    expect(isManagedKey('4')).toBe(false);
  });
});

describe('selección de hechizos con teclado', () => {
  const state = makeState();
  const cursor = { x: 6, y: 6 };

  function menu(open: boolean, index = 0, selectedId: 'electric-1' | null = null) {
    return { open, index, selectedId };
  }

  it('Q abre y cierra la lista; exige fase de jugador y jugador activo', () => {
    expect(translateKey({ key: 'q' }, state, cursor)).toEqual({
      type: 'spell-menu-toggle',
    });
    expect(translateKey({ key: 'Q' }, { ...state, phase: 'enemy' }, cursor)).toEqual({
      type: 'ignored',
      reason: 'wrong-phase',
    });
    expect(
      translateKey(
        { key: 'q' },
        { ...state, players: [makeUnit({ id: 'player-1', faction: 'player', x: 4, y: 4, hp: 0 })] },
        cursor,
      ),
    ).toEqual({ type: 'ignored', reason: 'no-active-player' });
  });

  it('con la lista abierta navega, elige con 1-6 y lanza con Enter', () => {
    const open = { spellMenu: menu(true, 0) };

    expect(translateKey({ key: 'ArrowDown' }, state, cursor, open)).toEqual({
      type: 'spell-menu-move',
      delta: 1,
    });
    expect(translateKey({ key: 'w' }, state, cursor, open)).toEqual({
      type: 'spell-menu-move',
      delta: -1,
    });
    expect(translateKey({ key: '3' }, state, cursor, open)).toEqual({
      type: 'spell-menu-select',
      spellId: 'electric-3',
    });
    expect(translateKey({ key: '6' }, state, cursor, open)).toEqual({
      type: 'spell-menu-select',
      spellId: 'resurrection-4',
    });
    expect(translateKey({ key: 'Enter' }, state, cursor, open)).toEqual({
      type: 'spell-cast',
      spellId: 'electric-1',
      unitId: 'player-1',
      target: { x: 6, y: 6 },
    });
    expect(translateKey({ key: 'Escape' }, state, cursor, open)).toEqual({
      type: 'spell-menu-close',
    });
    expect(translateKey({ key: 'd' }, state, cursor, open)).toEqual({
      type: 'ignored',
      reason: 'spell-menu-open',
    });
  });

  it('cerrada, X lanza el seleccionado y Esc lo deselecciona', () => {
    const selected = { spellMenu: menu(false, 0, 'electric-1') };

    expect(translateKey({ key: 'x' }, state, cursor, selected)).toEqual({
      type: 'spell-cast',
      spellId: 'electric-1',
      unitId: 'player-1',
      target: { x: 6, y: 6 },
    });
    expect(translateKey({ key: 'Escape' }, state, cursor, selected)).toEqual({
      type: 'spell-deselect',
    });
    expect(translateKey({ key: 'x' }, state, cursor)).toEqual({
      type: 'notice',
      notice: 'no-spell-selected',
    });
  });
});

describe('gate de input durante la animación', () => {
  const state = adjacentState();
  const options = { animating: true };

  it('descarta flechas/WASD, Espacio/Enter, F, I, E y F2 sin encolar', () => {
    for (const key of ['ArrowRight', 'd', ' ', 'Enter', 'f', 'i', 'e', 'F2']) {
      expect(translateKey({ key }, state, { x: 6, y: 6 }, options)).toEqual({
        type: 'ignored',
        reason: 'animating',
      });
    }
  });

  it('mantiene activos F1 y R durante la animación', () => {
    expect(translateKey({ key: 'F1' }, state, PLAYER_TILE, options)).toEqual({
      type: 'toggle-debug',
    });
    expectCommand(translateKey({ key: 'R' }, state, PLAYER_TILE, options), {
      type: 'Restart',
    });
  });

  it('sin animación el mapeo en reposo no cambia', () => {
    expect(translateKey({ key: 'ArrowRight' }, state, PLAYER_TILE, { animating: false })).toEqual({
      type: 'cursor',
      dx: 1,
      dy: 0,
    });
  });
});
