import { describe, expect, it, vi } from 'vitest';
import { classifyRoom, type Room } from '../../../src/game/map';
import { hasLineOfSight } from '../../../src/game/perception';
import {
  DEFAULT_HIDDEN_ENEMY_CHANCE,
  DEFAULT_PLAYERS,
  ENEMY_BRUTE_SHARE,
  ENEMY_COWARD_SHARE,
  ENEMY_MAX_COMPONENT,
  ENEMY_PLAYERS_FACTOR,
  ENEMY_SURFACE_FACTOR,
  assignEnemyTypes,
  componentSizeWith,
  distributeEnemyBudget,
  enemyTotalFor,
  enemyTypeCounts,
  generateChamberPlan,
  interiorCell,
  maxComponentSize,
  placeChamberContents,
} from '../../../src/game/chambers/core';

const SEEDS = Array.from({ length: 20 }, (_, index) => index + 1);

function areaRoom(id: number, area: number): Room {
  const cells = Array.from({ length: area }, (_, index) => ({
    x: index % 10,
    y: Math.floor(index / 10),
  }));
  return {
    id,
    x: 0,
    y: 0,
    width: 10,
    height: Math.ceil(area / 10),
    role: classifyRoom({ width: 10, height: Math.ceil(area / 10) }),
    cells,
    area,
  };
}

describe('presupuesto de enemigos de REQ-012', () => {
  it('usa los factores aprobados y la fórmula por superficie y jugadores', () => {
    expect(ENEMY_SURFACE_FACTOR).toBe(0.02);
    expect(ENEMY_PLAYERS_FACTOR).toBe(1.2);
    expect(DEFAULT_PLAYERS).toBe(6);
    expect(DEFAULT_HIDDEN_ENEMY_CHANCE).toBe(0.25);
    expect(ENEMY_BRUTE_SHARE).toBe(0.2);
    expect(ENEMY_COWARD_SHARE).toBe(0.2);

    expect(enemyTotalFor(85, 6, 0.02, 1.2)).toBe(10);
    expect(enemyTotalFor(162, 6, 0.02, 1.2)).toBe(12);
    expect(enemyTotalFor(100, 1, 0.02, 1.2)).toBe(4);
    expect(enemyTotalFor(100, 0, 0.02, 1.2)).toBe(2);
    expect(enemyTotalFor(100, 6, 0, 0)).toBe(0);
    expect(enemyTotalFor(100, 6, 0, 1.2)).toBe(8);
  });

  it('reparte 60/20/20 con redondeo y mínimos de T≥4', () => {
    expect(enemyTypeCounts(10)).toEqual({ sentinels: 6, brutes: 2, cowards: 2 });
    expect(enemyTypeCounts(4)).toEqual({ sentinels: 2, brutes: 1, cowards: 1 });
    expect(enemyTypeCounts(3)).toEqual({ sentinels: 1, brutes: 1, cowards: 1 });
    expect(enemyTypeCounts(2)).toEqual({ sentinels: 2, brutes: 0, cowards: 0 });
    expect(enemyTypeCounts(0)).toEqual({ sentinels: 0, brutes: 0, cowards: 0 });
  });

  it('reparte por área con mínimo 1, spawn 0 y suma exacta', () => {
    const rooms = [areaRoom(0, 100), areaRoom(1, 50), areaRoom(2, 25), areaRoom(3, 10)];
    const { budgets, warnings } = distributeEnemyBudget(rooms, 0, 7);
    const values = [...budgets.values()];

    expect(warnings).toEqual([]);
    expect(budgets.get(0)).toBe(0);
    expect(values.reduce((sum, value) => sum + value, 0)).toBe(7);
    expect(budgets.get(1)).toBeGreaterThanOrEqual(budgets.get(2) ?? 0);
    expect(budgets.get(2)).toBeGreaterThanOrEqual(budgets.get(3) ?? 0);
    expect(budgets.get(1)).toBeGreaterThanOrEqual(1);
    expect(budgets.get(2)).toBeGreaterThanOrEqual(1);
    expect(budgets.get(3)).toBeGreaterThanOrEqual(1);
  });

  it('asigna cobardes a salas lejanas, brutos a las mayores y centinelas al resto', () => {
    const priorities = [
      { id: 0, area: 10, distance: 1 },
      { id: 1, area: 100, distance: 5 },
      { id: 2, area: 20, distance: 9 },
    ];
    const budgets = new Map<number, number>([
      [0, 1],
      [1, 3],
      [2, 2],
    ]);
    const assignments = assignEnemyTypes(priorities, budgets, enemyTypeCounts(6));

    expect(assignments.find((assignment) => assignment.type === 'coward')?.roomId).toBe(2);
    expect(assignments.find((assignment) => assignment.type === 'brute')?.roomId).toBe(1);
    expect(assignments.filter((assignment) => assignment.type === 'sentinel')).toHaveLength(4);
  });
});

describe('colocación de enemigos del generador denso', () => {
  it('respeta presupuesto, spawn, salida, componentes y visión inicial', () => {
    for (const seed of SEEDS) {
      const plan = generateChamberPlan(seed);
      const contents = placeChamberContents(plan);
      const label = `seed ${seed}`;
      const holes = contents.spawns.party;
      const grid = { width: plan.width, height: plan.height, tiles: plan.tiles };

      expect(contents.exit, label).not.toBeNull();
      expect(contents.enemies.length, label).toBeLessThanOrEqual(contents.breakdown.total);
      expect(
        maxComponentSize(contents.enemies),
        `${label} · componentes`,
      ).toBeLessThanOrEqual(ENEMY_MAX_COMPONENT);

      const keys = new Set<string>();
      for (const enemy of contents.enemies) {
        const key = `${enemy.x},${enemy.y}`;
        expect(keys.has(key), `${label} · duplicado`).toBe(false);
        keys.add(key);
        expect(enemy.roomId, label).not.toBe(contents.spawns.roomId);
        expect(enemy.home).toEqual({ x: enemy.x, y: enemy.y });
        if (contents.exit) {
          expect(
            enemy.x === contents.exit.position.x && enemy.y === contents.exit.position.y,
            `${label} · salida`,
          ).toBe(false);
          expect(
            enemy.x === contents.exit.access.x && enemy.y === contents.exit.access.y,
            `${label} · acceso de salida`,
          ).toBe(false);
        }
        for (const hole of holes) {
          expect(
            hasLineOfSight(grid, enemy, hole),
            `${label} · enemigo ${enemy.id}${enemy.hidden ? ' (emboscado)' : ''} ve el spawn`,
          ).toBe(false);
        }
      }

      for (const room of plan.rooms) {
        if (room.id === contents.spawns.roomId) continue;
        expect(
          contents.breakdown.perRoom[room.id],
          `${label} · presupuesto sala ${room.id}`,
        ).toBeGreaterThanOrEqual(1);
        expect(
          contents.enemies.filter((enemy) => enemy.roomId === room.id).length,
          `${label} · colocados sala ${room.id}`,
        ).toBeGreaterThanOrEqual(1);
      }
    }
  });

  it('la probabilidad 0/1/0,25 controla emboscadas sin cambiar T', () => {
    const plan = generateChamberPlan(11);
    const zero = placeChamberContents(plan, { hiddenEnemyChance: 0 });
    const one = placeChamberContents(plan, { hiddenEnemyChance: 1 });
    const chance = placeChamberContents(plan, { hiddenEnemyChance: 0.25 });

    expect(zero.breakdown.hidden).toBe(0);
    expect(one.breakdown.total).toBe(zero.breakdown.total);
    expect(chance.breakdown.total).toBe(zero.breakdown.total);
    if (one.breakdown.hotspotsEligible > 0) {
      expect(one.breakdown.hidden).toBeGreaterThan(0);
      expect(one.breakdown.hidden).toBeLessThanOrEqual(one.enemies.length);
    }

    let eligible = 0;
    let hidden = 0;
    for (const seed of SEEDS) {
      const contents = placeChamberContents(generateChamberPlan(seed), {
        hiddenEnemyChance: 0.25,
      });
      eligible += contents.breakdown.hotspotsEligible;
      hidden += contents.breakdown.hidden;
    }
    expect(eligible).toBeGreaterThan(0);
    expect(hidden).toBeGreaterThan(0);
    expect(hidden).toBeLessThan(eligible);
  });

  it('los no emboscados prefieren interior cuando hay recambio compatible', () => {
    for (const seed of SEEDS) {
      const plan = generateChamberPlan(seed);
      const contents = placeChamberContents(plan);
      const occupied = new Set(contents.enemies.map((enemy) => `${enemy.x},${enemy.y}`));
      const exitKeys = new Set<string>();
      if (contents.exit) {
        exitKeys.add(`${contents.exit.position.x},${contents.exit.position.y}`);
        exitKeys.add(`${contents.exit.access.x},${contents.exit.access.y}`);
      }
      const doorKeys = new Set(plan.doors.map((door) => `${door.x},${door.y}`));
      const holeKeys = new Set(contents.spawns.party.map((hole) => `${hole.x},${hole.y}`));
      const grid = { width: plan.width, height: plan.height, tiles: plan.tiles };

      for (const room of plan.rooms) {
        if (room.id === contents.spawns.roomId) continue;
        const nonHiddenBorder = contents.enemies.filter(
          (enemy) => enemy.roomId === room.id && !enemy.interior && !enemy.hidden,
        );
        if (nonHiddenBorder.length === 0) continue;
        const interiorCandidates = (room.cells ?? []).filter((cell) => {
          const key = `${cell.x},${cell.y}`;
          if (occupied.has(key) || doorKeys.has(key) || holeKeys.has(key) || exitKeys.has(key)) {
            return false;
          }
          if (!interiorCell(room, cell)) return false;
          return contents.spawns.party.every((hole) => !hasLineOfSight(grid, cell, hole));
        });
        if (interiorCandidates.length < nonHiddenBorder.length) continue;
        for (const enemy of nonHiddenBorder) {
          const others = contents.enemies
            .filter((item) => item !== enemy)
            .map((item) => ({ x: item.x, y: item.y }));
          const replacement = interiorCandidates.find(
            (cell) => componentSizeWith(others, cell) <= ENEMY_MAX_COMPONENT,
          );
          expect(
            replacement,
            `seed ${seed} · borde sustituible en sala ${room.id}`,
          ).toBeUndefined();
        }
      }
    }
  });

  it('es determinista, serializable y no usa Math.random', () => {
    const plan = generateChamberPlan(77);
    const random = vi.spyOn(Math, 'random');
    try {
      const first = placeChamberContents(plan);
      const second = placeChamberContents(plan);
      expect(first).toEqual(second);
      expect(JSON.parse(JSON.stringify(first))).toEqual(first);
      expect(random).not.toHaveBeenCalled();
    } finally {
      random.mockRestore();
    }
  });
});
