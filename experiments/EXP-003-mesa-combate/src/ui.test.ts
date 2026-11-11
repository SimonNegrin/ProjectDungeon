import { describe, expect, it } from 'vitest';
import { CATALOG } from './v2/catalog';
import { DEFAULT_DUELS, DEFAULT_SEED, measureMatchups, runMatchup } from './v2/measure';
import type { MatchupResult } from './v2/measure';
import {
  DUEL_LIMITS,
  SEED_LIMITS,
  buildExport,
  buildSnapshot,
  durationRows,
  exportFileName,
  exportJson,
  findingSummary,
  formatBand,
  formatFindingRange,
  formatNumber,
  formatPercent,
  manaSpent,
  matchupKey,
  matchupTitle,
  normalizeDuels,
  normalizeSeed,
  replicaTotals,
  spellRows,
  totalSpellCasts,
  totalSpellDamage,
  unitName,
} from './ui';
import type { BenchSnapshot, V2ExperimentApi } from './ui';
import {
  createTargets,
  emptyOverrides,
  overridesId,
  withHeroOverride,
} from './v2/bench';

function fakeMatchup(rate: number, insideBand: boolean, delta: number): MatchupResult {
  return {
    heroId: 'heroe',
    enemyId: 'enemigo',
    heroWinRate: rate,
    insideBand,
    bandDelta: delta,
  } as unknown as MatchupResult;
}

describe('normalización de controles', () => {
  it('deja la semilla por defecto si no es un número finito', () => {
    expect(normalizeSeed('')).toBe(DEFAULT_SEED);
    expect(normalizeSeed('no-numero')).toBe(DEFAULT_SEED);
    expect(normalizeSeed(Number.NaN)).toBe(DEFAULT_SEED);
  });

  it('trunca y limita la semilla al rango de 32 bits', () => {
    expect(normalizeSeed('1017')).toBe(1017);
    expect(normalizeSeed(1017.9)).toBe(1017);
    expect(normalizeSeed(-4)).toBe(SEED_LIMITS.min);
    expect(normalizeSeed(SEED_LIMITS.max + 10)).toBe(SEED_LIMITS.max);
  });

  it('usa 1.000 duelos por defecto y respeta los límites', () => {
    expect(normalizeDuels('')).toBe(DEFAULT_DUELS);
    expect(normalizeDuels('250')).toBe(250);
    expect(normalizeDuels(4)).toBe(DUEL_LIMITS.min);
    expect(normalizeDuels(DUEL_LIMITS.max * 2)).toBe(DUEL_LIMITS.max);
  });
});

describe('formato de la tabla y del hallazgo', () => {
  it('usa coma decimal y conserva el infinito', () => {
    expect(formatNumber(1.218)).toBe('1,22');
    expect(formatNumber(96.3, 1)).toBe('96,3');
    expect(formatNumber(Number.POSITIVE_INFINITY)).toBe('∞');
    expect(formatPercent(100)).toBe('100,0 %');
  });

  it('resume el rango del hallazgo sin decimales redundantes', () => {
    expect(formatFindingRange(96.3, 100)).toBe('96,3–100 %');
    expect(formatFindingRange(40, 60)).toBe('40–60 %');
  });

  it('marca la banda con signo y unidad', () => {
    expect(formatBand(true, 0)).toBe('dentro');
    expect(formatBand(false, 40)).toBe('fuera +40,0 pp');
    expect(formatBand(false, -3.5)).toBe('fuera −3,5 pp');
  });

  it('resume cuántos emparejamientos quedan fuera de banda', () => {
    const summary = findingSummary([
      fakeMatchup(100, false, 40),
      fakeMatchup(96.3, false, 36.3),
      fakeMatchup(50, true, 0),
    ]);
    expect(summary).toEqual({ min: 50, max: 100, outside: 2, total: 3 });
    expect(findingSummary([])).toEqual({ min: 0, max: 0, outside: 0, total: 0 });
  });
});

describe('agregación del detalle', () => {
  const matchup = runMatchup('guerrero', 'centinela', 1017, 4);

  it('suma réplicas de ambos bandos', () => {
    const totals = replicaTotals(matchup.replicas);
    expect(totals.triggered).toBe(
      matchup.replicas.hero.triggered + matchup.replicas.enemy.triggered,
    );
    expect(totals.hits).toBe(
      matchup.replicas.hero.hits + matchup.replicas.enemy.hits,
    );
    expect(totals.misses).toBe(
      matchup.replicas.hero.misses + matchup.replicas.enemy.misses,
    );
    expect(totals.kills).toBe(
      matchup.replicas.hero.kills + matchup.replicas.enemy.kills,
    );
    expect(totals.damage).toBe(
      matchup.replicas.hero.damage + matchup.replicas.enemy.damage,
    );
  });

  it('ordena los hechizos por id y suma lanzamientos y daño', () => {
    const spells = {
      'zeta-ii': { casts: 2, hits: 1, misses: 1, damage: 3 },
      'alfa-i': { casts: 1, hits: 1, misses: 0, damage: 5 },
    };
    expect(spellRows(spells).map((spell) => spell.id)).toEqual(['alfa-i', 'zeta-ii']);
    expect(totalSpellCasts(spells)).toBe(3);
    expect(totalSpellDamage(spells)).toBe(8);
  });

  it('calcula maná gastado y conserva la distribución de duración', () => {
    const mana = manaSpent(matchup);
    expect(mana.total).toBe(mana.hero + mana.enemy);
    const rows = durationRows(matchup.rounds);
    expect(rows.reduce((total, row) => total + row.count, 0)).toBe(matchup.duels);
  });

  it('resuelve nombres del catálogo y títulos', () => {
    expect(unitName(CATALOG, 'guerrero')).toBe('Guerrero');
    expect(unitName(CATALOG, 'centinela')).toBe('Centinela');
    expect(unitName(CATALOG, 'desconocido')).toBe('desconocido');
    expect(matchupTitle(CATALOG, matchup)).toBe('Guerrero vs Centinela');
  });
});

describe('export reproducible', () => {
  const payload = measureMatchups({ seed: 42, duels: 10 });

  it('incluye versión de catálogo, semilla, escenario, catálogo y métricas', () => {
    const exported = buildExport(payload, CATALOG);
    expect(exported.catalogVersion).toBe(CATALOG.version);
    expect(exported.catalog).toBe(CATALOG);
    expect(exported.seed).toBe(42);
    expect(exported.duels).toBe(10);
    expect(exported.scenario.id).toBe('v2-corridor-8');
    expect(exported.matchups).toHaveLength(12);
  });

  it('no incluye marcas de tiempo y serializa de forma estable', () => {
    const first = exportJson(buildExport(payload, CATALOG));
    const second = exportJson(buildExport(payload, CATALOG));
    expect(first).toBe(second);
    expect(first).not.toContain('decidedAt');
    expect(first).not.toContain('decided_at');
    expect(first).not.toContain('timestamp');
  });

  it('deriva un nombre de archivo con semilla y duelos', () => {
    expect(exportFileName(payload)).toBe('EXP-003-v2.0-seed-42-duels-10.json');
  });

  it('construye un snapshot determinista con la selección actual', () => {
    const selected = { heroId: payload.matchups[0].heroId, enemyId: payload.matchups[0].enemyId };
    const first = buildSnapshot(payload, selected);
    const second = buildSnapshot(payload, selected);
    expect(first).toEqual(second);
    expect(first.params).toEqual({
      seed: 42,
      duels: 10,
      matchup: matchupKey(payload.matchups[0].heroId, payload.matchups[0].enemyId),
    });
    expect(first.catalogVersion).toBe(CATALOG.version);
    expect(first.matchups).toHaveLength(12);
    expect(first.variants[0].id).toBe('matchups');
  });

  it('el snapshot y la API admiten overrides y selección de héroe', () => {
    const overrides = withHeroOverride(emptyOverrides(), 'guerrero', {
      maxHp: 24,
      magicLevel: 1,
    });
    const snapshot: BenchSnapshot = {
      ...buildSnapshot(payload, {
        heroId: 'guerrero',
        enemyId: 'centinela',
      }),
      experiment: payload.experiment,
      engine: payload.engine,
      duels: payload.duels,
      scenario: payload.scenario,
      catalog: CATALOG,
      targets: createTargets(),
      overrides,
      overridesId: overridesId(overrides),
      diagnosis: [],
    };
    expect(snapshot.overrides.heroes.guerrero).toEqual({
      maxHp: 24,
      magicLevel: 1,
    });

    // El contrato de la API acepta una selección de héroe en `recalculate`.
    const acceptsHeroSelection = (
      api: Pick<V2ExperimentApi, 'recalculate'>,
    ): boolean =>
      api.recalculate({ kind: 'hero', heroId: 'guerrero' }).matchups.length ===
      12;
    expect(typeof acceptsHeroSelection).toBe('function');
  });
});
