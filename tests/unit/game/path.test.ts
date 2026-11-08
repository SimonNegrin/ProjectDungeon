import { describe, expect, it } from 'vitest';
import { planCursorTarget } from '../../../src/game/index';
import { makeGridWithWalls, makeState, makeUnit } from './helpers';

function playerAt(x: number, y: number, mp?: number) {
  return makeUnit({ id: 'player-1', faction: 'player', x, y, mp });
}

describe('planCursorTarget', () => {
  it('clasifica el tile del propio jugador como player sin camino ni coste', () => {
    const state = makeState({ players: [playerAt(5, 5)], enemies: [] });

    const plan = planCursorTarget(state, 'player-1', { x: 5, y: 5 });

    expect(plan).toEqual({ kind: 'player', path: [], cost: 0, withinMp: true });
    expect(plan.attackTile).toBeUndefined();
    expect(plan.blockedReason).toBeUndefined();
  });

  it('planifica un paso diagonal a suelo libre', () => {
    const state = makeState({ players: [playerAt(5, 5)], enemies: [] });

    const plan = planCursorTarget(state, 'player-1', { x: 6, y: 6 });

    expect(plan).toMatchObject({
      kind: 'floor',
      path: [{ x: 6, y: 6 }],
      cost: 1,
      withinMp: true,
    });
  });

  it('devuelve el camino completo y withinMp false cuando el coste supera el MP', () => {
    const state = makeState({ players: [playerAt(2, 2, 2)], enemies: [] });

    const plan = planCursorTarget(state, 'player-1', { x: 6, y: 2 });

    expect(plan).toMatchObject({
      kind: 'floor',
      path: [
        { x: 3, y: 2 },
        { x: 4, y: 2 },
        { x: 5, y: 2 },
        { x: 6, y: 2 },
      ],
      cost: 4,
      withinMp: false,
    });
  });

  it('bloquea un muro con motivo wall y camino vacío', () => {
    const state = makeState({ players: [playerAt(5, 5)], enemies: [] });

    const plan = planCursorTarget(state, 'player-1', { x: 0, y: 0 });

    expect(plan).toEqual({
      kind: 'blocked',
      path: [],
      cost: 0,
      withinMp: false,
      blockedReason: 'wall',
    });
  });

  it('bloquea fuera del mapa con motivo out-of-bounds', () => {
    const state = makeState({ players: [playerAt(5, 5)], enemies: [] });

    const plan = planCursorTarget(state, 'player-1', { x: -1, y: 5 });

    expect(plan).toMatchObject({ kind: 'blocked', path: [], blockedReason: 'out-of-bounds' });
  });

  it('bloquea el tile de un aliado con motivo occupied', () => {
    const state = makeState({
      players: [playerAt(5, 5), makeUnit({ id: 'player-2', faction: 'player', x: 6, y: 5 })],
      enemies: [],
    });

    const plan = planCursorTarget(state, 'player-1', { x: 6, y: 5 });

    expect(plan).toMatchObject({ kind: 'blocked', path: [], blockedReason: 'occupied' });
  });

  it('bloquea un objeto con el hook opcional y motivo blocked-object', () => {
    const state = makeState({ players: [playerAt(5, 5)], enemies: [] });

    const plan = planCursorTarget(state, 'player-1', { x: 6, y: 5 }, {
      isBlockingObject: (_state, x, y) => x === 6 && y === 5,
    });

    expect(plan).toMatchObject({ kind: 'blocked', path: [], blockedReason: 'blocked-object' });
  });

  it('rodea un objeto bloqueante en lugar de atravesarlo', () => {
    const state = makeState({ players: [playerAt(5, 5)], enemies: [] });

    const plan = planCursorTarget(state, 'player-1', { x: 7, y: 5 }, {
      isBlockingObject: (_state, x, y) => x === 6 && y === 5,
    });

    expect(plan.kind).toBe('floor');
    expect(plan.cost).toBe(4);
    expect(plan.path).toEqual([
      { x: 5, y: 4 },
      { x: 6, y: 4 },
      { x: 7, y: 4 },
      { x: 7, y: 5 },
    ]);
    expect(plan.path).not.toContainEqual({ x: 6, y: 5 });
  });

  it('no corta esquina entre dos muros y alarga el camino', () => {
    const state = makeState({
      grid: makeGridWithWalls([
        { x: 6, y: 5 },
        { x: 5, y: 6 },
      ]),
      players: [playerAt(5, 5)],
      enemies: [],
    });

    const plan = planCursorTarget(state, 'player-1', { x: 6, y: 6 });

    expect(plan.kind).toBe('floor');
    // La diagonal directa costaría 1; con el corte de esquina el camino rodea
    // los muros y cuesta 6 pasos.
    expect(plan.cost).toBe(6);
    expect(plan.withinMp).toBe(true);
    expect(plan.path.at(-1)).toEqual({ x: 6, y: 6 });
  });

  it('bloquea un destino sin camino con motivo no-path', () => {
    const state = makeState({
      grid: makeGridWithWalls([
        { x: 9, y: 9 },
        { x: 10, y: 9 },
        { x: 11, y: 9 },
        { x: 9, y: 10 },
        { x: 11, y: 10 },
        { x: 9, y: 11 },
        { x: 10, y: 11 },
        { x: 11, y: 11 },
      ]),
      players: [playerAt(10, 10)],
      enemies: [],
    });

    const plan = planCursorTarget(state, 'player-1', { x: 10, y: 12 });

    expect(plan).toMatchObject({ kind: 'blocked', path: [], blockedReason: 'no-path' });
  });

  it('devuelve enemy con ataque directo si el enemigo ya es adyacente', () => {
    const state = makeState({
      players: [playerAt(5, 5)],
      enemies: [makeUnit({ id: 'enemy-1', faction: 'enemy', x: 6, y: 6 })],
    });

    const plan = planCursorTarget(state, 'player-1', { x: 6, y: 6 });

    expect(plan).toEqual({
      kind: 'enemy',
      path: [],
      cost: 0,
      withinMp: true,
      attackTile: { x: 5, y: 5 },
    });
  });

  it('planifica el camino hasta el tile de ataque de un enemigo alcanzable', () => {
    const state = makeState({
      players: [playerAt(2, 2, 3)],
      enemies: [makeUnit({ id: 'enemy-1', faction: 'enemy', x: 6, y: 6 })],
    });

    const plan = planCursorTarget(state, 'player-1', { x: 6, y: 6 });

    expect(plan).toMatchObject({
      kind: 'enemy',
      path: [
        { x: 3, y: 3 },
        { x: 4, y: 4 },
        { x: 5, y: 5 },
      ],
      cost: 3,
      withinMp: true,
      attackTile: { x: 5, y: 5 },
    });
    expect(plan.path).not.toContainEqual({ x: 6, y: 6 });
  });

  it('mantiene el camino completo y withinMp false si el enemigo queda lejos', () => {
    const state = makeState({
      players: [playerAt(2, 2, 2)],
      enemies: [makeUnit({ id: 'enemy-1', faction: 'enemy', x: 6, y: 6 })],
    });

    const plan = planCursorTarget(state, 'player-1', { x: 6, y: 6 });

    expect(plan).toMatchObject({
      kind: 'enemy',
      path: [
        { x: 3, y: 3 },
        { x: 4, y: 4 },
        { x: 5, y: 5 },
      ],
      cost: 3,
      withinMp: false,
      attackTile: { x: 5, y: 5 },
    });
  });

  it('bloquea un enemigo sin ningún tile de ataque libre', () => {
    const state = makeState({
      grid: makeGridWithWalls([
        { x: 9, y: 9 },
        { x: 10, y: 9 },
        { x: 11, y: 9 },
        { x: 9, y: 10 },
        { x: 11, y: 10 },
        { x: 9, y: 11 },
        { x: 10, y: 11 },
        { x: 11, y: 11 },
      ]),
      players: [playerAt(2, 2)],
      enemies: [makeUnit({ id: 'enemy-1', faction: 'enemy', x: 10, y: 10 })],
    });

    const plan = planCursorTarget(state, 'player-1', { x: 10, y: 10 });

    expect(plan).toMatchObject({ kind: 'blocked', path: [], blockedReason: 'no-path' });
  });

  it('desempata los tiles de ataque con el orden de DIRECTIONS', () => {
    const state = makeState({
      players: [playerAt(2, 2)],
      enemies: [makeUnit({ id: 'enemy-1', faction: 'enemy', x: 4, y: 2 })],
    });

    const plan = planCursorTarget(state, 'player-1', { x: 4, y: 2 });

    // (3,2) oeste, (3,3) suroeste y (3,1) noroeste cuestan 1; DIRECTIONS
    // coloca oeste antes que las diagonales.
    expect(plan).toMatchObject({
      kind: 'enemy',
      path: [{ x: 3, y: 2 }],
      cost: 1,
      withinMp: true,
      attackTile: { x: 3, y: 2 },
    });
  });

  it('es determinista con el mismo estado y no muta la entrada', () => {
    const state = makeState({
      players: [playerAt(3, 3)],
      enemies: [makeUnit({ id: 'enemy-1', faction: 'enemy', x: 12, y: 9 })],
    });
    const snapshot = JSON.parse(JSON.stringify(state));

    const first = planCursorTarget(state, 'player-1', { x: 8, y: 7 });
    const second = planCursorTarget(state, 'player-1', { x: 8, y: 7 });

    expect(first).toEqual(second);
    expect(state).toEqual(snapshot);
  });
});
