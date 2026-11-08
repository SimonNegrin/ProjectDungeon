import { describe, expect, it } from 'vitest';
import {
  clampCursorToRange,
  clampCursorToViewport,
  cursorAtPlayer,
  cursorRange,
  deriveCursorStatus,
  isCursorInteractive,
  moveCursor,
} from '../../../src/host/cursor';
import { makeState, makeUnit } from '../game/helpers';

function playerAt(x: number, y: number, mp?: number) {
  return makeUnit({ id: 'player-1', faction: 'player', x, y, mp });
}

describe('posición del cursor', () => {
  it('arranca en el tile del jugador activo o en (0,0) sin jugador', () => {
    expect(cursorAtPlayer({ x: 6, y: 8 })).toEqual({ x: 6, y: 8 });
    expect(cursorAtPlayer(undefined)).toEqual({ x: 0, y: 0 });
  });

  it('se mueve un tile por pulsación dentro del rango visible', () => {
    const range = { minX: 2, minY: 3, maxX: 7, maxY: 9 };

    expect(moveCursor({ x: 4, y: 5 }, 1, 0, range)).toEqual({ x: 5, y: 5 });
    expect(moveCursor({ x: 4, y: 5 }, -1, 0, range)).toEqual({ x: 3, y: 5 });
    expect(moveCursor({ x: 4, y: 5 }, 0, 1, range)).toEqual({ x: 4, y: 6 });
    expect(moveCursor({ x: 4, y: 5 }, 0, -1, range)).toEqual({ x: 4, y: 4 });
  });

  it('no hay wrap ni salida en los bordes del viewport', () => {
    const range = { minX: 2, minY: 3, maxX: 7, maxY: 9 };

    expect(moveCursor({ x: 2, y: 5 }, -1, 0, range)).toEqual({ x: 2, y: 5 });
    expect(moveCursor({ x: 7, y: 5 }, 1, 0, range)).toEqual({ x: 7, y: 5 });
    expect(moveCursor({ x: 4, y: 3 }, 0, -1, range)).toEqual({ x: 4, y: 3 });
    expect(moveCursor({ x: 4, y: 9 }, 0, 1, range)).toEqual({ x: 4, y: 9 });
  });

  it('el rango visible coincide con los tiles que intersectan la cámara', () => {
    const range = cursorRange({ x: 32, y: 64 }, { width: 384, height: 384 }, {
      width: 20,
      height: 20,
    });

    expect(range).toEqual({ minX: 1, minY: 2, maxX: 12, maxY: 13 });
  });

  it('se recoloca al tile visible más cercano tras desplazar la cámara', () => {
    const range = { minX: 1, minY: 2, maxX: 12, maxY: 13 };

    expect(clampCursorToRange({ x: 0, y: 0 }, range)).toEqual({ x: 1, y: 2 });
    expect(clampCursorToRange({ x: 19, y: 19 }, range)).toEqual({ x: 12, y: 13 });
    expect(clampCursorToRange({ x: 5, y: 5 }, range)).toEqual({ x: 5, y: 5 });

    const grid = { width: 20, height: 20 };
    expect(
      clampCursorToViewport({ x: 19, y: 0 }, { x: 320, y: 320 }, { width: 384, height: 384 }, grid),
    ).toEqual({ x: 19, y: 10 });
  });
});

describe('estado de presentación del cursor', () => {
  it('sobre el jugador es blanco neutro y sin camino', () => {
    const state = makeState({ players: [playerAt(4, 4)], enemies: [] });

    const status = deriveCursorStatus(state, { x: 4, y: 4 });

    expect(status).toMatchObject({
      x: 4,
      y: 4,
      visible: true,
      kind: 'player',
      state: 'player',
      path: [],
      cost: 0,
      strongSteps: 0,
    });
  });

  it('sobre suelo alcanzable es verde y todos los pasos son fuertes', () => {
    const state = makeState({ players: [playerAt(2, 2, 4)], enemies: [] });

    const status = deriveCursorStatus(state, { x: 4, y: 2 });

    expect(status).toMatchObject({
      visible: true,
      kind: 'floor',
      state: 'reachable',
      cost: 2,
      withinMp: true,
      strongSteps: 2,
    });
    expect(status.path).toEqual([
      { x: 3, y: 2 },
      { x: 4, y: 2 },
    ]);
  });

  it('sobre suelo con coste mayor que el MP es ámbar y marca los pasos fuertes', () => {
    const state = makeState({ players: [playerAt(2, 2, 2)], enemies: [] });

    const status = deriveCursorStatus(state, { x: 6, y: 2 });

    expect(status).toMatchObject({
      visible: true,
      kind: 'floor',
      state: 'too-far',
      cost: 4,
      withinMp: false,
      strongSteps: 2,
    });
    expect(status.path).toHaveLength(4);
  });

  it('sobre un muro es rojo y no dibuja puntos', () => {
    const state = makeState({ players: [playerAt(4, 4)], enemies: [] });

    const status = deriveCursorStatus(state, { x: 0, y: 0 });

    expect(status).toMatchObject({
      visible: true,
      kind: 'blocked',
      state: 'invalid',
      path: [],
      cost: 0,
      strongSteps: 0,
    });
  });

  it('sobre un enemigo adyacente muestra marca de objetivo y camino vacío', () => {
    const state = makeState({
      players: [playerAt(5, 5)],
      enemies: [makeUnit({ id: 'enemy-1', faction: 'enemy', x: 6, y: 5 })],
    });

    const status = deriveCursorStatus(state, { x: 6, y: 5 });

    expect(status).toMatchObject({
      visible: true,
      kind: 'enemy',
      state: 'enemy',
      path: [],
      cost: 0,
      attackTile: { x: 5, y: 5 },
    });
  });

  it('el camino de un enemigo termina en el tile de ataque, nunca en su tile', () => {
    const state = makeState({
      players: [playerAt(2, 2)],
      enemies: [makeUnit({ id: 'enemy-1', faction: 'enemy', x: 6, y: 6 })],
    });

    const status = deriveCursorStatus(state, { x: 6, y: 6 });

    expect(status.kind).toBe('enemy');
    expect(status.state).toBe('enemy');
    expect(status.path.length).toBeGreaterThan(0);
    expect(status.path).not.toContainEqual({ x: 6, y: 6 });
    expect(status.path.at(-1)).toEqual(status.attackTile);
    expect(
      Math.max(
        Math.abs(status.attackTile!.x - 6),
        Math.abs(status.attackTile!.y - 6),
      ),
    ).toBe(1);
  });

  it('en fase enemiga es invisible, sin camino y no interactivo', () => {
    const state = makeState({
      players: [playerAt(4, 4)],
      enemies: [makeUnit({ id: 'enemy-1', faction: 'enemy', x: 6, y: 4 })],
      phase: 'enemy',
    });

    const status = deriveCursorStatus(state, { x: 6, y: 4 });

    expect(isCursorInteractive(state)).toBe(false);
    expect(status).toMatchObject({ visible: false, path: [], strongSteps: 0 });
    expect(status.attackTile).toEqual({ x: 5, y: 4 });
  });

  it('con la partida terminada es invisible aunque el plan sea válido', () => {
    const state = makeState({
      players: [playerAt(2, 2, 4)],
      enemies: [],
      status: 'victory',
    });

    const status = deriveCursorStatus(state, { x: 3, y: 2 });

    expect(isCursorInteractive(state)).toBe(false);
    expect(status.visible).toBe(false);
    expect(status.path).toEqual([]);
    expect(status.strongSteps).toBe(0);
  });

  it('sin jugador activo es invisible y no lanza', () => {
    const state = makeState({
      players: [makeUnit({ id: 'player-1', faction: 'player', x: 4, y: 4, hp: 0 })],
      enemies: [],
    });

    const status = deriveCursorStatus(state, { x: 4, y: 4 });

    expect(status).toMatchObject({
      visible: false,
      kind: 'blocked',
      state: 'invalid',
      path: [],
    });
  });
});
