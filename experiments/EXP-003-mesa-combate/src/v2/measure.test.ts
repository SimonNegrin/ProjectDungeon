import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  BAND,
  DEFAULT_DUELS,
  DEFAULT_SEED,
  ENEMY_ORDER,
  HERO_ORDER,
  measureAll,
  serializeMeasurement,
} from './measure';

const first = measureAll();
const second = measureAll();

const resultsFile = fileURLToPath(
  new URL('../../results/v2-seed-1017-duels-1000.json', import.meta.url),
);

describe('medición de los 12 emparejamientos', () => {
  it('es determinista: la segunda ejecución produce el mismo JSON', () => {
    expect(serializeMeasurement(second)).toBe(serializeMeasurement(first));
  });

  it('declara catálogo, escenario, semilla, duelos y banda', () => {
    expect(first.catalogVersion).toMatch(/^EXP-003-v2\./);
    expect(first.seed).toBe(DEFAULT_SEED);
    expect(first.duels).toBe(DEFAULT_DUELS);
    expect(first.scenario.width).toBe(8);
    expect(first.scenario.heroPos).toBe(0);
    expect(first.scenario.enemyPos).toBe(7);
    expect(first.scenario.initiative).toBe('hero');
    expect(first.scenario.maxRounds).toBe(100);
    expect(first.band).toEqual({ ...BAND, unit: 'percent' });
  });

  it('cubre los 12 emparejamientos en orden fijo', () => {
    expect(first.matchups).toHaveLength(12);
    const pairs = first.matchups.map(
      (matchup) => `${matchup.heroId}:${matchup.enemyId}`,
    );
    const expected = HERO_ORDER.flatMap((hero) =>
      ENEMY_ORDER.map((enemy) => `${hero}:${enemy}`),
    );
    expect(pairs).toEqual(expected);
  });

  it('cierra los duelos y marca la banda con tolerancia', () => {
    for (const matchup of first.matchups) {
      expect(matchup.heroWins + matchup.enemyWins + matchup.draws).toBe(
        DEFAULT_DUELS,
      );
      expect(matchup.heroWinRate).toBeGreaterThanOrEqual(0);
      expect(matchup.heroWinRate).toBeLessThanOrEqual(100);
      const inside =
        matchup.heroWinRate >= BAND.min - BAND.tolerance &&
        matchup.heroWinRate <= BAND.max + BAND.tolerance;
      expect(matchup.insideBand).toBe(inside);
    }
  });

  it('registra rondas, turnos, acciones, hechizos, maná, daño, curación, PV y réplicas', () => {
    for (const matchup of first.matchups) {
      for (const summary of [matchup.rounds, matchup.turns]) {
        expect(summary.min).toBeGreaterThanOrEqual(1);
        expect(summary.max).toBeLessThanOrEqual(100);
        expect(
          summary.distribution.reduce((total, entry) => total + entry.count, 0),
        ).toBe(DEFAULT_DUELS);
      }
      for (const side of ['hero', 'enemy'] as const) {
        expect(matchup.actions[side].attack).toBeGreaterThanOrEqual(0);
        expect(matchup.actions[side].spell).toBeGreaterThanOrEqual(0);
        expect(matchup.actions[side].move).toBeGreaterThanOrEqual(0);
        expect(matchup.actions[side].wait).toBeGreaterThanOrEqual(0);
        expect(matchup.replicas[side].triggered).toBeGreaterThanOrEqual(0);
        expect(matchup.mana[side].unspent).toBe(
          matchup.mana[side].available - matchup.mana[side].spent,
        );
      }
      expect(matchup.ttkRounds).toBeGreaterThanOrEqual(0);
      expect(matchup.hp.winnerRemaining).toBeGreaterThanOrEqual(0);
      expect(matchup.damage.heroDealt).toBeGreaterThanOrEqual(0);
      expect(matchup.damage.enemyDealt).toBeGreaterThanOrEqual(0);
      expect(matchup.damage.heroReceived).toBe(matchup.damage.enemyDealt);
      expect(matchup.damage.enemyReceived).toBe(matchup.damage.heroDealt);
      expect(matchup.healing.hero).toBeGreaterThanOrEqual(0);
      expect(matchup.heroWinRate + matchup.enemyWinRate + matchup.drawRate).toBeCloseTo(
        100,
        3,
      );
    }
    expect(
      first.matchups.reduce(
        (total, matchup) =>
          total +
          matchup.replicas.hero.triggered +
          matchup.replicas.enemy.triggered,
        0,
      ),
    ).toBeGreaterThan(0);
    expect(
      first.matchups.some((matchup) => Object.keys(matchup.spells).length > 0),
    ).toBe(true);
  });

  it('el JSON de resultados coincide byte a byte con lo calculado', () => {
    const text = serializeMeasurement(first);
    if (!existsSync(resultsFile)) {
      mkdirSync(dirname(resultsFile), { recursive: true });
      writeFileSync(resultsFile, text);
    } else {
      expect(readFileSync(resultsFile, 'utf8')).toBe(text);
    }
  });

  it('el runtime de v2 no usa Math.random ni relojes', () => {
    const directory = dirname(fileURLToPath(import.meta.url));
    const files = readdirSync(directory).filter(
      (file) =>
        file.endsWith('.ts') &&
        !file.endsWith('.test.ts') &&
        file !== 'test-helpers.ts',
    );
    expect(files.length).toBeGreaterThan(0);
    for (const file of files) {
      const source = readFileSync(`${directory}/${file}`, 'utf8');
      expect(source).not.toContain('Math.random');
      expect(source).not.toContain('Date.now');
      expect(source).not.toContain('performance.now');
    }
  });
});
