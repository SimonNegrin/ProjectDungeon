import { describe, expect, it } from 'vitest';
import { isManagedKey, translateKey, type InputIntent } from '../../../src/host/input';
import { makeState, makeUnit } from '../game/helpers';

function adjacentState() {
  return makeState({
    players: [makeUnit({ id: 'player-1', faction: 'player', x: 5, y: 5 })],
    enemies: [makeUnit({ id: 'enemy-1', faction: 'enemy', x: 6, y: 6 })],
  });
}

function expectCommand(intent: InputIntent, command: unknown): void {
  expect(intent).toEqual({ type: 'command', command });
}

describe('mapeo de teclado a comandos', () => {
  it.each([
    ['w', 0, -1],
    ['ArrowUp', 0, -1],
    ['s', 0, 1],
    ['ArrowDown', 0, 1],
    ['a', -1, 0],
    ['ArrowLeft', -1, 0],
    ['d', 1, 0],
    ['ArrowRight', 1, 0],
  ])('la tecla %s mueve al jugador activo con dx=%i dy=%i', (key, dx, dy) => {
    const intent = translateKey({ key }, makeState());

    expectCommand(intent, { type: 'Move', unitId: 'player-1', dx, dy });
  });

  it('normaliza WASD en mayúsculas', () => {
    const intent = translateKey({ key: 'D' }, makeState());

    expectCommand(intent, { type: 'Move', unitId: 'player-1', dx: 1, dy: 0 });
  });

  it('Espacio y Enter atacan al enemigo adyacente', () => {
    const state = adjacentState();

    for (const key of [' ', 'Enter']) {
      const intent = translateKey({ key }, state);
      expectCommand(intent, { type: 'Attack', unitId: 'player-1', targetId: 'enemy-1' });
    }
  });

  it('atacar sin enemigo adyacente es un no-op explícito', () => {
    const state = makeState();
    const before = JSON.stringify(state);

    const intent = translateKey({ key: ' ' }, state);

    expect(intent).toEqual({ type: 'ignored', reason: 'no-target' });
    expect(JSON.stringify(state)).toBe(before);
  });

  it('no ataca a un enemigo muerto', () => {
    const state = makeState({
      players: [makeUnit({ id: 'player-1', faction: 'player', x: 5, y: 5 })],
      enemies: [makeUnit({ id: 'enemy-1', faction: 'enemy', x: 6, y: 5, hp: 0 })],
    });

    expect(translateKey({ key: ' ' }, state)).toEqual({
      type: 'ignored',
      reason: 'no-target',
    });
  });

  it('E, R, F1 y F2 producen fin de turno, reinicio, debug y semilla nueva', () => {
    const state = makeState();

    expectCommand(translateKey({ key: 'e' }, state), { type: 'EndTurn' });
    expectCommand(translateKey({ key: 'R' }, state), { type: 'Restart' });
    expect(translateKey({ key: 'F1' }, state)).toEqual({ type: 'toggle-debug' });
    expect(translateKey({ key: 'F2' }, state)).toEqual({ type: 'new-seed' });
  });

  it('ignora repeticiones y modificadores', () => {
    const state = makeState();

    expect(translateKey({ key: 'd', repeat: true }, state)).toEqual({
      type: 'ignored',
      reason: 'repeat',
    });
    expect(translateKey({ key: 'F2', repeat: true }, state)).toEqual({
      type: 'ignored',
      reason: 'repeat',
    });

    for (const modifier of ['ctrlKey', 'metaKey', 'altKey'] as const) {
      expect(translateKey({ key: 'd', [modifier]: true }, state)).toEqual({
        type: 'ignored',
        reason: 'modifier',
      });
    }
  });

  it('con la partida terminada solo reaccionan R, F1 y F2', () => {
    const state = makeState({ status: 'victory' });

    for (const key of ['w', ' ', 'Enter', 'e']) {
      expect(translateKey({ key }, state)).toEqual({
        type: 'ignored',
        reason: 'game-over',
      });
    }
    expectCommand(translateKey({ key: 'r' }, state), { type: 'Restart' });
    expect(translateKey({ key: 'F1' }, state)).toEqual({ type: 'toggle-debug' });
    expect(translateKey({ key: 'F2' }, state)).toEqual({ type: 'new-seed' });
  });

  it('en fase enemiga no se mueve ni ataca ni termina turno', () => {
    const state = adjacentState();
    const enemyPhase = { ...state, phase: 'enemy' as const };

    for (const key of ['d', ' ', 'e']) {
      expect(translateKey({ key }, enemyPhase)).toEqual({
        type: 'ignored',
        reason: 'wrong-phase',
      });
    }
  });

  it('ignora teclas no gestionadas', () => {
    expect(translateKey({ key: 'q' }, makeState())).toEqual({
      type: 'ignored',
      reason: 'unmapped',
    });
  });

  it('bloquea el comportamiento del navegador con F1 y F2', () => {
    expect(isManagedKey('F1')).toBe(true);
    expect(isManagedKey('f2')).toBe(true);
    expect(isManagedKey('q')).toBe(false);
  });
});
