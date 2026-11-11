/**
 * Medición de los 12 emparejamientos 1v1 de la v2.0.
 *
 * Semilla 1017, 1.000 duelos por emparejamiento, héroe con iniciativa. El
 * payload no lleva marca de tiempo: la segunda ejecución debe ser idéntica.
 */

import { seedForVariant } from '../../../_shell/rng';
import { CATALOG } from './catalog';
import { runDuel } from './duel';
import type {
  Catalog,
  ReplicaMetrics,
  Side,
  SideCounters,
  SpellMetrics,
} from './types';

export const ENGINE_VERSION = 'v2.0';
export const DEFAULT_SEED = 1017;
export const DEFAULT_DUELS = 1000;
export const BAND = { min: 40, max: 60, tolerance: 2 } as const;

export const HERO_ORDER = ['guerrero', 'picaro', 'mago', 'clerigo'] as const;
export const ENEMY_ORDER = ['centinela', 'bruto', 'cobarde'] as const;

export const MAX_ROUNDS = 100;
export const CORRIDOR_WIDTH = 8;

export interface NumericSummary {
  readonly mean: number;
  readonly median: number;
  readonly min: number;
  readonly max: number;
  readonly distribution: ReadonlyArray<{
    readonly value: number;
    readonly count: number;
  }>;
}

export interface MatchupResult {
  readonly heroId: string;
  readonly enemyId: string;
  readonly duels: number;
  readonly heroWins: number;
  readonly enemyWins: number;
  readonly draws: number;
  readonly heroWinRate: number;
  readonly enemyWinRate: number;
  readonly drawRate: number;
  readonly insideBand: boolean;
  readonly bandDelta: number;
  readonly ttkRounds: number;
  readonly rounds: NumericSummary;
  readonly turns: NumericSummary;
  readonly actions: Record<Side, SideCounters>;
  readonly spells: Record<string, SpellMetrics>;
  readonly mana: Record<
    Side,
    { available: number; spent: number; unspent: number }
  >;
  readonly damage: {
    heroDealt: number;
    enemyDealt: number;
    heroReceived: number;
    enemyReceived: number;
  };
  readonly healing: { hero: number; enemy: number };
  readonly hp: {
    winnerRemaining: number;
    heroRemaining: number;
    enemyRemaining: number;
  };
  readonly replicas: Record<Side, ReplicaMetrics>;
  readonly flee: { triggers: number; rounds: number };
}

export interface MeasurementPayload {
  readonly experiment: 'EXP-003';
  readonly engine: typeof ENGINE_VERSION;
  readonly catalogVersion: string;
  readonly scenario: {
    readonly id: string;
    readonly width: number;
    readonly heroPos: number;
    readonly enemyPos: number;
    readonly initiative: Side;
    readonly maxRounds: number;
    readonly duelSeed: string;
    readonly moveCostMp: number;
    readonly attackCostActions: number;
    readonly spellCostActions: number;
    readonly maxSpellsPerTurn: number;
    readonly policy: { readonly hero: string; readonly enemy: string };
  };
  readonly seed: number;
  readonly duels: number;
  readonly band: {
    readonly min: number;
    readonly max: number;
    readonly tolerance: number;
    readonly unit: 'percent';
  };
  readonly heroOrder: ReadonlyArray<string>;
  readonly enemyOrder: ReadonlyArray<string>;
  readonly matchups: ReadonlyArray<MatchupResult>;
}

function roundTo(value: number, digits = 3): number {
  const factor = 10 ** digits;
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

function emptySpellMetrics(): SpellMetrics {
  return { casts: 0, hits: 0, misses: 0, damage: 0 };
}

function zeroCounters(): SideCounters {
  return { attack: 0, spell: 0, move: 0, wait: 0 };
}

function zeroReplica(): ReplicaMetrics {
  return { triggered: 0, hits: 0, misses: 0, kills: 0, damage: 0 };
}

function summarize(values: ReadonlyArray<number>): NumericSummary {
  const sorted = [...values].sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);
  const median =
    sorted.length % 2 === 0
      ? (sorted[middle - 1] + sorted[middle]) / 2
      : sorted[middle];
  const counts = new Map<number, number>();
  for (const value of sorted) {
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }
  return {
    mean: roundTo(
      sorted.reduce((total, value) => total + value, 0) / sorted.length,
    ),
    median: roundTo(median),
    min: sorted[0] ?? 0,
    max: sorted[sorted.length - 1] ?? 0,
    distribution: [...counts.entries()]
      .sort(([left], [right]) => left - right)
      .map(([value, count]) => ({ value, count })),
  };
}

export function scenarioFor(heroId: string, enemyId: string) {
  return {
    id: `${heroId}-vs-${enemyId}`,
    width: CORRIDOR_WIDTH,
    heroId,
    enemyId,
    heroPos: 0,
    enemyPos: CORRIDOR_WIDTH - 1,
    initiative: 'hero' as const,
    maxRounds: MAX_ROUNDS,
  };
}

export function runMatchup(
  heroId: string,
  enemyId: string,
  seed: number = DEFAULT_SEED,
  duels: number = DEFAULT_DUELS,
  catalog: Catalog = CATALOG,
): MatchupResult {
  const scenario = scenarioFor(heroId, enemyId);
  const rounds: number[] = [];
  const turns: number[] = [];
  const actions: Record<Side, SideCounters> = {
    hero: zeroCounters(),
    enemy: zeroCounters(),
  };
  const spells: Record<string, SpellMetrics> = {};
  const mana: Record<Side, { available: number; spent: number }> = {
    hero: { available: 0, spent: 0 },
    enemy: { available: 0, spent: 0 },
  };
  const damage = {
    heroDealt: 0,
    enemyDealt: 0,
    heroReceived: 0,
    enemyReceived: 0,
  };
  const healing = { hero: 0, enemy: 0 };
  const replicas: Record<Side, ReplicaMetrics> = {
    hero: zeroReplica(),
    enemy: zeroReplica(),
  };
  const flee = { triggers: 0, rounds: 0 };

  let heroWins = 0;
  let enemyWins = 0;
  let draws = 0;
  let ttkTotal = 0;
  let decided = 0;
  let winnerHpTotal = 0;
  let heroHpTotal = 0;
  let enemyHpTotal = 0;

  for (let index = 0; index < duels; index += 1) {
    const duelSeed = seedForVariant(
      seed,
      `v2:${heroId}:${enemyId}:${index}`,
    );
    const result = runDuel(scenario, catalog, duelSeed);
    rounds.push(result.rounds);
    turns.push(result.turns);
    heroHpTotal += result.heroHp;
    enemyHpTotal += result.enemyHp;

    if (result.winner === 'hero') {
      heroWins += 1;
      winnerHpTotal += result.heroHp;
      decided += 1;
      ttkTotal += result.rounds;
    } else if (result.winner === 'enemy') {
      enemyWins += 1;
      winnerHpTotal += result.enemyHp;
      decided += 1;
      ttkTotal += result.rounds;
    } else {
      draws += 1;
    }

    const metrics = result.metrics;
    for (const side of ['hero', 'enemy'] as const) {
      actions[side].attack += metrics.actions[side].attack;
      actions[side].spell += metrics.actions[side].spell;
      actions[side].move += metrics.actions[side].move;
      actions[side].wait += metrics.actions[side].wait;
      mana[side].available += metrics.mana[side].available;
      mana[side].spent += metrics.mana[side].spent;
      if (side === 'hero') {
        damage.heroDealt += metrics.damageDealt.hero;
        damage.enemyReceived += metrics.damageDealt.hero;
      } else {
        damage.enemyDealt += metrics.damageDealt.enemy;
        damage.heroReceived += metrics.damageDealt.enemy;
      }
      healing[side] += metrics.healing[side];
      replicas[side].triggered += metrics.replicas[side].triggered;
      replicas[side].hits += metrics.replicas[side].hits;
      replicas[side].misses += metrics.replicas[side].misses;
      replicas[side].kills += metrics.replicas[side].kills;
      replicas[side].damage += metrics.replicas[side].damage;
    }
    flee.triggers += metrics.flee.triggers;
    flee.rounds += metrics.flee.rounds;
    for (const [spellId, spell] of Object.entries(metrics.spells)) {
      const entry = (spells[spellId] ??= emptySpellMetrics());
      entry.casts += spell.casts;
      entry.hits += spell.hits;
      entry.misses += spell.misses;
      entry.damage += spell.damage;
    }
  }

  const heroWinRate = roundTo((heroWins / duels) * 100, 4);
  const enemyWinRate = roundTo((enemyWins / duels) * 100, 4);
  const drawRate = roundTo((draws / duels) * 100, 4);
  const insideBand =
    heroWinRate >= BAND.min - BAND.tolerance &&
    heroWinRate <= BAND.max + BAND.tolerance;
  const bandDelta =
    heroWinRate < BAND.min
      ? roundTo(heroWinRate - BAND.min, 4)
      : heroWinRate > BAND.max
        ? roundTo(heroWinRate - BAND.max, 4)
        : 0;

  return {
    heroId,
    enemyId,
    duels,
    heroWins,
    enemyWins,
    draws,
    heroWinRate,
    enemyWinRate,
    drawRate,
    insideBand,
    bandDelta,
    ttkRounds: decided > 0 ? roundTo(ttkTotal / decided) : 0,
    rounds: summarize(rounds),
    turns: summarize(turns),
    actions,
    spells,
    mana: {
      hero: {
        available: mana.hero.available,
        spent: mana.hero.spent,
        unspent: mana.hero.available - mana.hero.spent,
      },
      enemy: {
        available: mana.enemy.available,
        spent: mana.enemy.spent,
        unspent: mana.enemy.available - mana.enemy.spent,
      },
    },
    damage,
    healing,
    hp: {
      winnerRemaining: decided > 0 ? roundTo(winnerHpTotal / decided) : 0,
      heroRemaining: roundTo(heroHpTotal / duels),
      enemyRemaining: roundTo(enemyHpTotal / duels),
    },
    replicas,
    flee,
  };
}

export interface MeasureOptions {
  readonly seed?: number;
  readonly duels?: number;
  readonly catalog?: Catalog;
}

/**
 * Mide los 12 emparejamientos con semilla y duelos explícitos.
 *
 * Es la única puerta parametrizada del motor: la UI la usa para recalcular sin
 * recargar. Sin argumentos reproduce exactamente `measureAll()`.
 */
export function measureMatchups(options: MeasureOptions = {}): MeasurementPayload {
  const seed = options.seed ?? DEFAULT_SEED;
  const duels = options.duels ?? DEFAULT_DUELS;
  const catalog = options.catalog ?? CATALOG;
  const matchups: MatchupResult[] = [];
  for (const heroId of HERO_ORDER) {
    for (const enemyId of ENEMY_ORDER) {
      matchups.push(runMatchup(heroId, enemyId, seed, duels, catalog));
    }
  }
  return {
    experiment: 'EXP-003',
    engine: ENGINE_VERSION,
    catalogVersion: catalog.version,
    scenario: {
      id: 'v2-corridor-8',
      width: CORRIDOR_WIDTH,
      heroPos: 0,
      enemyPos: CORRIDOR_WIDTH - 1,
      initiative: 'hero',
      maxRounds: MAX_ROUNDS,
      duelSeed: 'seedForVariant(seed, "v2:<hero>:<enemy>:<index>")',
      moveCostMp: 1,
      attackCostActions: 1,
      spellCostActions: 1,
      maxSpellsPerTurn: 2,
      policy: {
        hero:
          'Cuerpo a cuerpo si es adyacente y tiene arma; si no, hechizos de daño que maximizan poder; si no, avanza con MP; si no, espera.',
        enemy:
          'Dormido espera; alerta ataca, lanza hechizos si el perfil lo permite o avanza a lastKnown; regreso vuelve a home sin atacar; huida maximiza distancia y solo ataca acorralada.',
      },
    },
    seed,
    duels,
    band: { ...BAND, unit: 'percent' },
    heroOrder: HERO_ORDER,
    enemyOrder: ENEMY_ORDER,
    matchups,
  };
}

export function measureAll(catalog: Catalog = CATALOG): MeasurementPayload {
  return measureMatchups({ catalog });
}

export function serializeMeasurement(payload: MeasurementPayload): string {
  return `${JSON.stringify(payload, null, 2)}\n`;
}
