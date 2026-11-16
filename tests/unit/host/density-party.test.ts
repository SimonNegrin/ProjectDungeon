import { describe, expect, it } from 'vitest';
import { createInitialState } from '../../../src/game/engine';
import type { PlayerConfig } from '../../../src/game/config';
import type { GameState } from '../../../src/game/types';
import { cursorAtPlayer, deriveCursorStatus } from '../../../src/host/cursor';
import { createDebugApi } from '../../../src/host/debug';
import { GameSession } from '../../../src/host/session';

const SEED = 279837264;

const ARCHETYPES: readonly PlayerConfig['archetypeId'][] = [
  'warrior',
  'barbarian',
  'rogue',
  'archer',
  'mage',
  'cleric',
];

function party(size: number): PlayerConfig[] {
  return ARCHETYPES.slice(0, size).map((archetypeId, index) => ({
    archetypeId,
    variant: index % 2 === 0 ? 1 : 2,
    name: `P${index + 1}`,
  }));
}

function snapshotFor(state: GameState) {
  const cursor = cursorAtPlayer(state.players[0]);
  const api = createDebugApi(
    () => ({
      state,
      camera: { x: 0, y: 0 },
      bounds: { maxX: 0, maxY: 0 },
      viewport: { width: 1, height: 1 },
      tileSize: 32,
      assetsLoaded: false,
      lastEvents: [],
      cursor: deriveCursorStatus(state, cursor),
    }),
    () => ({ state, events: [] }),
  );
  return api.snapshot();
}

describe('densidad por party real en producción', () => {
  it('la misma semilla usa P=1 y P=6 con totales distintos en sus rangos', () => {
    const one = snapshotFor(new GameSession({ seed: SEED, players: party(1) }).state);
    const six = snapshotFor(new GameSession({ seed: SEED, players: party(6) }).state);

    expect(one.seed).toBe(SEED);
    expect(six.seed).toBe(SEED);
    expect(one.enemyBudget).not.toBeNull();
    expect(six.enemyBudget).not.toBeNull();

    const solo = one.enemyBudget!;
    const group = six.enemyBudget!;
    expect(solo.playersP).toBe(1);
    expect(group.playersP).toBe(6);
    expect(solo.nonSpawnRooms).toBe(group.nonSpawnRooms);
    expect(solo.formulaTotal).toBeGreaterThanOrEqual(4);
    expect(solo.formulaTotal).toBeLessThanOrEqual(6);
    expect(group.formulaTotal).toBeGreaterThanOrEqual(10);
    expect(group.formulaTotal).toBeLessThanOrEqual(12);
    expect(solo.formulaTotal).not.toBe(group.formulaTotal);
    expect(solo.total).toBe(Math.max(solo.formulaTotal, solo.nonSpawnRooms));
    expect(group.total).toBe(Math.max(group.formulaTotal, group.nonSpawnRooms));

    // El snapshot conserva el P real y el reparto queda acotado por el total
    // aplicado, no por el 6 por defecto.
    expect(one.config?.players).toHaveLength(1);
    expect(six.config?.players).toHaveLength(6);
    expect(one.mapEnemies.length).toBeGreaterThanOrEqual(4);
    expect(one.mapEnemies.length).toBeLessThanOrEqual(6);
    expect(six.mapEnemies.length).toBeGreaterThanOrEqual(10);
    expect(six.mapEnemies.length).toBeLessThanOrEqual(12);
    expect(one.mapEnemies.length).not.toBe(six.mapEnemies.length);
  });

  it('expone el aviso del suelo en el snapshot cuando eleva la fórmula', () => {
    const snapshot = snapshotFor(
      new GameSession({ seed: SEED, players: party(1) }).state,
    );
    const budget = snapshot.enemyBudget!;

    if (budget.floorWarning !== null) {
      expect(budget.total).toBeGreaterThan(budget.formulaTotal);
      expect(snapshot.warnings).toContain(budget.floorWarning);
    }
  });

  it('createInitialState deriva P de players.length sin opciones del host', () => {
    const state = createInitialState({ seed: SEED, players: party(3) });
    const snapshot = snapshotFor(state);

    expect(snapshot.enemyBudget?.playersP).toBe(3);
  });
});
