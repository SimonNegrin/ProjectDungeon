/**
 * Helpers puros de la página v2.0 de EXP-003.
 *
 * Formato, normalización de controles, agregación y payload de export. No
 * tocan DOM, catálogo ni motor: la UI compone y los tests derivan de aquí.
 */

import { DEFAULT_DUELS, DEFAULT_SEED } from './v2/measure';
import type {
  MatchupResult,
  MeasurementPayload,
  NumericSummary,
} from './v2/measure';
import type { Catalog, ReplicaMetrics, Side, SpellMetrics } from './v2/types';

export const EXPERIMENT_ID = 'EXP-003';
export const EXPERIMENT_TITLE = 'Mesa de combate v2.0';
export const EXPERIMENT_QUESTION =
  '¿Qué valores de acciones, magia y réplica producen combates equilibrados y legibles en los escenarios del primer corte?';
export const EXPERIMENT_DESCRIPTION =
  'Mesa de medición, no de decisión: la página mide los 12 emparejamientos y exporta los números. No aprueba valores de balance.';

export const SEED_LIMITS = { min: 0, max: 4294967295 } as const;
export const DUEL_LIMITS = { min: 10, max: 5000, step: 10 } as const;

function clampInteger(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, Math.trunc(value)));
}

export function normalizeSeed(value: number | string): number {
  const parsed =
    typeof value === 'string'
      ? value.trim() === ''
        ? Number.NaN
        : Number(value.trim())
      : value;
  if (!Number.isFinite(parsed)) return DEFAULT_SEED;
  return Math.trunc(clampInteger(parsed, SEED_LIMITS.min, SEED_LIMITS.max)) >>> 0;
}

export function normalizeDuels(value: number | string): number {
  const parsed =
    typeof value === 'string'
      ? value.trim() === ''
        ? Number.NaN
        : Number(value.trim())
      : value;
  if (!Number.isFinite(parsed)) return DEFAULT_DUELS;
  return clampInteger(parsed, DUEL_LIMITS.min, DUEL_LIMITS.max);
}

export function formatNumber(value: number, digits = 2): string {
  if (!Number.isFinite(value)) return '∞';
  return value.toFixed(digits).replace('.', ',');
}

/** Tasa 0–100 con coma decimal; `100` se muestra como `100,0`. */
export function formatRate(value: number, digits = 1): string {
  return formatNumber(value, digits);
}

export function formatPercent(value: number, digits = 1): string {
  return `${formatRate(value, digits)} %`;
}

/** Rango del hallazgo: `96,3–100 %`, sin decimal redundante. */
export function formatFindingRange(min: number, max: number): string {
  const trim = (value: number) => formatNumber(value, 1).replace(/,0$/, '');
  return `${trim(min)}–${trim(max)} %`;
}

export function formatBand(insideBand: boolean, bandDelta: number): string {
  if (insideBand) return 'dentro';
  const sign = bandDelta > 0 ? '+' : '−';
  return `fuera ${sign}${formatNumber(Math.abs(bandDelta), 1)} pp`;
}

export function matchupKey(heroId: string, enemyId: string): string {
  return `${heroId}:${enemyId}`;
}

export function unitName(catalog: Catalog, id: string): string {
  const template =
    catalog.roster.find((entry) => entry.id === id) ??
    catalog.bestiary.find((entry) => entry.id === id);
  return template?.name ?? id;
}

export function matchupTitle(catalog: Catalog, matchup: MatchupResult): string {
  return `${unitName(catalog, matchup.heroId)} vs ${unitName(catalog, matchup.enemyId)}`;
}

export function findMatchup(
  payload: MeasurementPayload,
  heroId: string,
  enemyId: string,
): MatchupResult | undefined {
  return payload.matchups.find(
    (matchup) => matchup.heroId === heroId && matchup.enemyId === enemyId,
  );
}

export interface FindingSummary {
  readonly min: number;
  readonly max: number;
  readonly outside: number;
  readonly total: number;
}

export function findingSummary(
  matchups: ReadonlyArray<MatchupResult>,
): FindingSummary {
  if (matchups.length === 0) {
    return { min: 0, max: 0, outside: 0, total: 0 };
  }
  const rates = matchups.map((matchup) => matchup.heroWinRate);
  return {
    min: Math.min(...rates),
    max: Math.max(...rates),
    outside: matchups.filter((matchup) => !matchup.insideBand).length,
    total: matchups.length,
  };
}

export function spellRows(
  spells: Readonly<Record<string, SpellMetrics>>,
): Array<{ id: string; casts: number; hits: number; misses: number; damage: number }> {
  return Object.entries(spells)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([id, spell]) => ({
      id,
      casts: spell.casts,
      hits: spell.hits,
      misses: spell.misses,
      damage: spell.damage,
    }));
}

export function totalSpellCasts(
  spells: Readonly<Record<string, SpellMetrics>>,
): number {
  return Object.values(spells).reduce((total, spell) => total + spell.casts, 0);
}

export function totalSpellDamage(
  spells: Readonly<Record<string, SpellMetrics>>,
): number {
  return Object.values(spells).reduce((total, spell) => total + spell.damage, 0);
}

export interface ReplicaTotals {
  readonly triggered: number;
  readonly hits: number;
  readonly misses: number;
  readonly kills: number;
  readonly damage: number;
}

export function replicaTotals(
  replicas: Readonly<Record<Side, ReplicaMetrics>>,
): ReplicaTotals {
  const sum = (field: keyof ReplicaMetrics) =>
    replicas.hero[field] + replicas.enemy[field];
  return {
    triggered: sum('triggered'),
    hits: sum('hits'),
    misses: sum('misses'),
    kills: sum('kills'),
    damage: sum('damage'),
  };
}

export function manaSpent(matchup: MatchupResult): { hero: number; enemy: number; total: number } {
  const hero = matchup.mana.hero.spent;
  const enemy = matchup.mana.enemy.spent;
  return { hero, enemy, total: hero + enemy };
}

export function durationRows(
  summary: NumericSummary,
): Array<{ value: number; count: number }> {
  return summary.distribution.map((entry) => ({
    value: entry.value,
    count: entry.count,
  }));
}

export interface ExportPayload extends MeasurementPayload {
  readonly catalog: Catalog;
}

/** Export reproducible: sin reloj ni timestamp. */
export function buildExport(
  payload: MeasurementPayload,
  catalog: Catalog,
): ExportPayload {
  return { ...payload, catalog };
}

export function exportJson(payload: ExportPayload): string {
  return `${JSON.stringify(payload, null, 2)}\n`;
}

export function exportFileName(payload: MeasurementPayload): string {
  return `${payload.experiment}-${payload.engine}-seed-${payload.seed}-duels-${payload.duels}.json`;
}

export interface ExperimentSnapshot {
  readonly params: {
    readonly seed: number;
    readonly duels: number;
    readonly matchup: string;
  };
  readonly seed: number;
  readonly catalogVersion: string;
  readonly variants: ReadonlyArray<{
    readonly id: string;
    readonly metrics: ReadonlyArray<{
      readonly label: string;
      readonly value: string | number;
    }>;
  }>;
  readonly matchups: ReadonlyArray<{
    readonly heroId: string;
    readonly enemyId: string;
    readonly heroWinRate: number;
    readonly insideBand: boolean;
  }>;
}

export function buildSnapshot(
  payload: MeasurementPayload,
  selected: { heroId: string; enemyId: string },
): ExperimentSnapshot {
  const finding = findingSummary(payload.matchups);
  const totalDuels = payload.matchups.reduce(
    (total, matchup) => total + matchup.duels,
    0,
  );
  return {
    params: {
      seed: payload.seed,
      duels: payload.duels,
      matchup: matchupKey(selected.heroId, selected.enemyId),
    },
    seed: payload.seed,
    catalogVersion: payload.catalogVersion,
    variants: [
      {
        id: 'matchups',
        metrics: [
          { label: 'Emparejamientos', value: finding.total },
          { label: 'Fuera de banda', value: finding.outside },
          {
            label: 'Rango victorias héroe',
            value: formatFindingRange(finding.min, finding.max),
          },
          { label: 'Duelos totales', value: totalDuels },
        ],
      },
    ],
    matchups: payload.matchups.map((matchup) => ({
      heroId: matchup.heroId,
      enemyId: matchup.enemyId,
      heroWinRate: matchup.heroWinRate,
      insideBand: matchup.insideBand,
    })),
  };
}

export interface V2ExperimentApi {
  readonly id: string;
  getSeed(): number;
  setSeed(next: number): void;
  getDuels(): number;
  setDuels(next: number): void;
  runAll(): MeasurementPayload;
  getResults(): MeasurementPayload;
  snapshot(): ExperimentSnapshot;
  getDecision(): ExportPayload;
  reset(): void;
}
