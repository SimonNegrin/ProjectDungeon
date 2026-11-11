/**
 * Banco de ajuste de EXP-003: estado puro de datos, sin DOM.
 *
 * El catálogo base es inmutable. Todo ajuste vive en `BenchOverrides` y se
 * proyecta sobre una copia de trabajo. Las filas afectadas, el diagnóstico y el
 * export son funciones puras y serializables: la UI solo compone estado.
 */

import { hashString } from '../../../_shell/rng';
import { CATALOG, findTemplate } from './catalog';
import { runMatchup } from './measure';
import type { MatchupResult, MeasurementPayload } from './measure';
import type {
  Catalog,
  CombatantTemplate,
  Stats,
  WeaponDefinition,
} from './types';

/** Guía inicial de victorias del héroe por enemigo; editable por el usuario. */
export const GUIDE_TARGETS: Readonly<Record<string, number>> = {
  centinela: 75,
  cobarde: 85,
  bruto: 30,
};

/** Margen de referencia del diagnóstico 4-de-4, en puntos porcentuales. */
export const MARGIN_PP = 5;

/** Objetivo inicial editable de un enemigo sin entrada en la guía. */
export const DEFAULT_TARGET = 50;

/** Versión del modelo de objetivos por par héroe–enemigo. */
export const TARGETS_VERSION = 2;

export type BenchTargets = Readonly<Record<string, number>>;

/** Clave estable de un par héroe–enemigo. */
export function targetKey(heroId: string, enemyId: string): string {
  return `${heroId}:${enemyId}`;
}

/** Guía heredada por enemigo; 50 % si no tiene entrada. */
export function guideTargetFor(enemyId: string): number {
  return GUIDE_TARGETS[enemyId] ?? DEFAULT_TARGET;
}

export type TargetValidation =
  | { readonly ok: true; readonly value: number; readonly message: null }
  | { readonly ok: false; readonly value: null; readonly message: string };

/** Acepta solo enteros de 0 a 100; rechaza texto, decimales, `NaN` e infinitos. */
export function validateTarget(value: unknown): TargetValidation {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return {
      ok: false,
      value: null,
      message: `Objetivo inválido: ${String(value)}. Debe ser un entero entre 0 y 100.`,
    };
  }
  if (!Number.isInteger(value)) {
    return {
      ok: false,
      value: null,
      message: `Objetivo inválido: ${value}. Debe ser un entero entre 0 y 100.`,
    };
  }
  if (value < 0 || value > 100) {
    return {
      ok: false,
      value: null,
      message: `Objetivo inválido: ${value}. Debe estar entre 0 y 100.`,
    };
  }
  return { ok: true, value, message: null };
}

/** Mapa editable por par; guía heredada por enemigo y orden roster-major. */
export function createTargets(catalog: Catalog = CATALOG): BenchTargets {
  const targets: Record<string, number> = {};
  for (const hero of catalog.roster) {
    for (const enemy of catalog.bestiary) {
      targets[targetKey(hero.id, enemy.id)] = guideTargetFor(enemy.id);
    }
  }
  return targets;
}

/** Fija el objetivo de un par; lanza `RangeError` si no es válido. */
export function setTarget(
  targets: BenchTargets,
  heroId: string,
  enemyId: string,
  value: unknown,
): BenchTargets {
  const validation = validateTarget(value);
  if (!validation.ok) throw new RangeError(validation.message);
  return { ...targets, [targetKey(heroId, enemyId)]: validation.value };
}

/** Restaura el objetivo de un par a la guía de su enemigo. */
export function resetTarget(
  targets: BenchTargets,
  heroId: string,
  enemyId: string,
): BenchTargets {
  return { ...targets, [targetKey(heroId, enemyId)]: guideTargetFor(enemyId) };
}

/** Restaura los cuatro pares de un enemigo a la guía; no toca otros. */
export function resetEnemyTargets(
  targets: BenchTargets,
  enemyId: string,
  catalog: Catalog = CATALOG,
): BenchTargets {
  const next: Record<string, number> = { ...targets };
  for (const hero of catalog.roster) {
    next[targetKey(hero.id, enemyId)] = guideTargetFor(enemyId);
  }
  return next;
}

/** Restaura todos los objetivos a la guía heredada. */
export function resetTargets(catalog: Catalog = CATALOG): BenchTargets {
  return createTargets(catalog);
}

/** `true` si el mapa coincide exactamente con la guía por enemigo. */
export function isTargetsGuide(targets: BenchTargets): boolean {
  const guide = createTargets();
  const keys = Object.keys(guide);
  if (Object.keys(targets).length !== keys.length) return false;
  return keys.every((key) => targets[key] === guide[key]);
}

/** Identificador determinista del mapa de objetivos: 8 hex, sin orden. */
export function targetsId(targets: BenchTargets): string {
  return hashString(canonicalJson(targets)).toString(16).padStart(8, '0');
}

export interface EnemyOverride {
  readonly stats?: Partial<Stats>;
  readonly maxHp?: number;
  readonly maxActions?: number;
  readonly armorId?: string | null;
  readonly shieldId?: string | null;
  readonly weaponId?: string | null;
}

export interface HeroOverride {
  readonly stats?: Partial<Stats>;
  readonly maxHp?: number;
  readonly maxActions?: number;
  readonly magicLevel?: number;
  readonly armorId?: string | null;
  readonly shieldId?: string | null;
  readonly weaponId?: string | null;
}

export interface WeaponOverride {
  readonly accuracy?: number;
  readonly damage?: number;
}

export interface BenchOverrides {
  readonly enemies: Readonly<Record<string, EnemyOverride>>;
  readonly weapons: Readonly<Record<string, WeaponOverride>>;
  readonly heroes: Readonly<Record<string, HeroOverride>>;
}

export function emptyOverrides(): BenchOverrides {
  return { enemies: {}, weapons: {}, heroes: {} };
}

export function isOverridesEmpty(overrides: BenchOverrides): boolean {
  return (
    Object.keys(overrides.enemies).length === 0 &&
    Object.keys(overrides.weapons).length === 0 &&
    Object.keys(overrides.heroes).length === 0
  );
}

/** Añade o mezcla el ajuste de un enemigo sin mutar el estado anterior. */
export function withEnemyOverride(
  overrides: BenchOverrides,
  enemyId: string,
  patch: EnemyOverride,
): BenchOverrides {
  const current = overrides.enemies[enemyId] ?? {};
  const stats =
    current.stats || patch.stats
      ? definedStats({ ...current.stats, ...patch.stats })
      : undefined;
  const next: EnemyOverride = {
    ...current,
    ...patch,
    ...(stats ? { stats } : {}),
  };
  return {
    ...overrides,
    enemies: { ...overrides.enemies, [enemyId]: next },
  };
}

/** Añade o mezcla el ajuste de un héroe sin mutar el estado anterior. */
export function withHeroOverride(
  overrides: BenchOverrides,
  heroId: string,
  patch: HeroOverride,
): BenchOverrides {
  const current = overrides.heroes[heroId] ?? {};
  const stats =
    current.stats || patch.stats
      ? definedStats({ ...current.stats, ...patch.stats })
      : undefined;
  const next: HeroOverride = {
    ...current,
    ...patch,
    ...(stats ? { stats } : {}),
  };
  return {
    ...overrides,
    heroes: { ...overrides.heroes, [heroId]: next },
  };
}

/** Añade o mezcla el ajuste de un arma sin mutar el estado anterior. */
export function withWeaponOverride(
  overrides: BenchOverrides,
  weaponId: string,
  patch: WeaponOverride,
): BenchOverrides {
  return {
    ...overrides,
    weapons: {
      ...overrides.weapons,
      [weaponId]: { ...overrides.weapons[weaponId], ...patch },
    },
  };
}

export function resetEnemyOverride(
  overrides: BenchOverrides,
  enemyId: string,
): BenchOverrides {
  const enemies: Record<string, EnemyOverride> = { ...overrides.enemies };
  delete enemies[enemyId];
  return { ...overrides, enemies };
}

export function resetWeaponOverride(
  overrides: BenchOverrides,
  weaponId: string,
): BenchOverrides {
  const weapons: Record<string, WeaponOverride> = { ...overrides.weapons };
  delete weapons[weaponId];
  return { ...overrides, weapons };
}

export function resetHeroOverride(
  overrides: BenchOverrides,
  heroId: string,
): BenchOverrides {
  const heroes: Record<string, HeroOverride> = { ...overrides.heroes };
  delete heroes[heroId];
  return { ...overrides, heroes };
}

/** Restaura los overrides de enemigo sin tocar armas ni héroes. */
export function resetEnemies(overrides: BenchOverrides): BenchOverrides {
  return { ...overrides, enemies: {} };
}

/** Restaura los overrides de arma sin tocar enemigos ni héroes. */
export function resetWeapons(overrides: BenchOverrides): BenchOverrides {
  return { ...overrides, weapons: {} };
}

/** Restaura los overrides de héroe sin tocar enemigos ni armas. */
export function resetHeroes(overrides: BenchOverrides): BenchOverrides {
  return { ...overrides, heroes: {} };
}

/** Restaura catálogo y armas a la base. */
export function resetOverrides(): BenchOverrides {
  return emptyOverrides();
}

function definedStats(stats: Partial<Stats>): Partial<Stats> {
  const result: {
    habilidad?: number;
    fuerza?: number;
    defensa?: number;
    resistencia?: number;
  } = {};
  for (const key of ['habilidad', 'fuerza', 'defensa', 'resistencia'] as const) {
    if (stats[key] !== undefined) result[key] = stats[key];
  }
  return result;
}

function applyEnemyOverride(
  template: CombatantTemplate,
  override: EnemyOverride,
): CombatantTemplate {
  return {
    ...template,
    stats: { ...template.stats, ...definedStats(override.stats ?? {}) },
    maxHp: override.maxHp ?? template.maxHp,
    maxActions: override.maxActions ?? template.maxActions,
    armorId:
      override.armorId !== undefined ? override.armorId : template.armorId,
    shieldId:
      override.shieldId !== undefined ? override.shieldId : template.shieldId,
    weaponId:
      override.weaponId !== undefined ? override.weaponId : template.weaponId,
  };
}

function applyHeroOverride(
  template: CombatantTemplate,
  override: HeroOverride,
): CombatantTemplate {
  return {
    ...template,
    stats: { ...template.stats, ...definedStats(override.stats ?? {}) },
    maxHp: override.maxHp ?? template.maxHp,
    maxActions: override.maxActions ?? template.maxActions,
    magicLevel: override.magicLevel ?? template.magicLevel,
    armorId:
      override.armorId !== undefined ? override.armorId : template.armorId,
    shieldId:
      override.shieldId !== undefined ? override.shieldId : template.shieldId,
    weaponId:
      override.weaponId !== undefined ? override.weaponId : template.weaponId,
  };
}

function applyWeaponOverride(
  weapon: WeaponDefinition,
  override: WeaponOverride,
): WeaponDefinition {
  return {
    ...weapon,
    ...(override.accuracy !== undefined ? { accuracy: override.accuracy } : {}),
    ...(override.damage !== undefined ? { damage: override.damage } : {}),
  };
}

/**
 * Catálogo de trabajo: copia nueva con los overrides aplicados.
 *
 * No muta `base` ni sus arrays ni sus objetos. Sin overrides es equivalente al
 * catálogo base.
 */
export function createWorkingCatalog(
  base: Catalog = CATALOG,
  overrides: BenchOverrides = emptyOverrides(),
): Catalog {
  const roster = base.roster.map((template) => {
    const override = overrides.heroes[template.id];
    return override ? applyHeroOverride(template, override) : template;
  });
  const bestiary = base.bestiary.map((template) => {
    const override = overrides.enemies[template.id];
    return override ? applyEnemyOverride(template, override) : template;
  });

  const weapons: Record<string, WeaponDefinition> = {};
  for (const [id, weapon] of Object.entries(base.weapons)) {
    const override = overrides.weapons[id];
    weapons[id] = override ? applyWeaponOverride(weapon, override) : weapon;
  }

  return {
    ...base,
    roster,
    bestiary,
    weapons,
    armors: { ...base.armors },
    shields: { ...base.shields },
    spells: { ...base.spells },
    aiProfiles: { ...base.aiProfiles },
  };
}

export interface BenchRow {
  readonly heroId: string;
  readonly enemyId: string;
}

export type BenchSelection =
  | { readonly kind: 'enemy'; readonly enemyId: string }
  | { readonly kind: 'weapon'; readonly weaponId: string }
  | { readonly kind: 'hero'; readonly heroId: string };

export function rowKey(row: BenchRow): string {
  return `${row.heroId}:${row.enemyId}`;
}

/**
 * Filas afectadas en orden fijo, deduplicadas.
 *
 * Un enemigo afecta a sus cuatro filas. Un héroe, a sus tres enemigos. Un arma
 * afecta a las filas de todas las unidades que la equipan: los héroes aportan
 * sus tres enemigos y los enemigos sus cuatro héroes.
 */
export function affectedRows(
  catalog: Catalog,
  selection: BenchSelection,
): ReadonlyArray<BenchRow> {
  const rows: BenchRow[] = [];
  const seen = new Set<string>();
  const add = (heroId: string, enemyId: string): void => {
    const row = { heroId, enemyId };
    const key = rowKey(row);
    if (seen.has(key)) return;
    seen.add(key);
    rows.push(row);
  };

  if (selection.kind === 'enemy') {
    for (const hero of catalog.roster) add(hero.id, selection.enemyId);
    return rows;
  }

  if (selection.kind === 'hero') {
    if (!catalog.roster.some((hero) => hero.id === selection.heroId)) {
      return rows;
    }
    for (const enemy of catalog.bestiary) add(selection.heroId, enemy.id);
    return rows;
  }

  for (const unit of [...catalog.roster, ...catalog.bestiary]) {
    if (unit.weaponId !== selection.weaponId) continue;
    if (unit.side === 'hero') {
      for (const enemy of catalog.bestiary) add(unit.id, enemy.id);
    } else {
      for (const hero of catalog.roster) add(hero.id, unit.id);
    }
  }
  return rows;
}

/**
 * Recalcula solo las filas afectadas con la semilla y los duelos del payload.
 *
 * Conserva el orden fijo y deja intactas las filas no afectadas.
 */
export function recalculateMatchups(
  payload: MeasurementPayload,
  catalog: Catalog,
  selection: BenchSelection,
): MeasurementPayload {
  const affected = new Set(affectedRows(catalog, selection).map(rowKey));
  return {
    ...payload,
    catalogVersion: catalog.version,
    matchups: payload.matchups.map((matchup) =>
      affected.has(rowKey(matchup))
        ? runMatchup(
            matchup.heroId,
            matchup.enemyId,
            payload.seed,
            payload.duels,
            catalog,
          )
        : matchup,
    ),
  };
}

export interface DiagnosedRow {
  readonly heroId: string;
  readonly heroWinRate: number;
  readonly target: number;
  /** Victoria real menos objetivo, redondeada a 4 decimales. */
  readonly delta: number;
  readonly inside: boolean;
}

export interface OutsideRow {
  readonly heroId: string;
  readonly delta: number;
}

export type DiagnoseProblem =
  | {
      readonly kind: 'outside';
      readonly message: string;
      readonly rows: ReadonlyArray<OutsideRow>;
    }
  | {
      readonly kind: 'global-weapon';
      readonly message: string;
      readonly weaponId: string;
      readonly heroIds: ReadonlyArray<string>;
    };

export interface EnemyDiagnosis {
  readonly enemyId: string;
  readonly margin: number;
  readonly rows: ReadonlyArray<DiagnosedRow>;
  readonly insideCount: number;
  readonly total: number;
  readonly fourOfFour: boolean;
  readonly outside: ReadonlyArray<OutsideRow>;
  readonly problems: ReadonlyArray<DiagnoseProblem>;
}

function roundTo(value: number, digits = 4): number {
  const factor = 10 ** digits;
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

function formatSigned(value: number): string {
  const rounded = roundTo(value, 1);
  const sign = rounded > 0 ? '+' : rounded < 0 ? '−' : '±';
  return `${sign}${Math.abs(rounded).toFixed(1).replace('.', ',')} pp`;
}

function nameFor(catalog: Catalog, id: string): string {
  return findTemplate(catalog, id)?.name ?? id;
}

/**
 * Diagnóstico 4-de-4 de un enemigo. Es informativo: no bloquea ni corrige.
 *
 * `matchups` debe contener las filas de un solo enemigo y `targets` el mapa por
 * par. `catalog` se usa para detectar armas compartidas con los héroes y para
 * nombrar filas.
 */
export function diagnoseEnemy(
  matchups: ReadonlyArray<MatchupResult>,
  targets: BenchTargets,
  margin: number = MARGIN_PP,
  catalog: Catalog = CATALOG,
): EnemyDiagnosis {
  if (matchups.length === 0) {
    throw new Error('diagnoseEnemy necesita al menos un emparejamiento.');
  }
  const enemyId = matchups[0].enemyId;
  if (matchups.some((matchup) => matchup.enemyId !== enemyId)) {
    throw new TypeError(
      'diagnoseEnemy necesita los emparejamientos de un solo enemigo.',
    );
  }

  const rows: DiagnosedRow[] = matchups.map((matchup) => {
    const key = targetKey(matchup.heroId, matchup.enemyId);
    const raw = targets[key];
    if (raw === undefined) {
      throw new Error(`Sin objetivo para el par ${key}.`);
    }
    const validation = validateTarget(raw);
    if (!validation.ok) throw new RangeError(validation.message);
    const delta = roundTo(matchup.heroWinRate - validation.value);
    return {
      heroId: matchup.heroId,
      heroWinRate: matchup.heroWinRate,
      target: validation.value,
      delta,
      inside: Math.abs(delta) <= margin,
    };
  });
  const outside: OutsideRow[] = rows
    .filter((row) => !row.inside)
    .map((row) => ({ heroId: row.heroId, delta: row.delta }));
  const insideCount = rows.filter((row) => row.inside).length;

  const problems: DiagnoseProblem[] = [];
  if (outside.length > 0) {
    const detail = outside
      .map((row) => `${nameFor(catalog, row.heroId)} ${formatSigned(row.delta)}`)
      .join(', ');
    problems.push({
      kind: 'outside',
      rows: outside,
      message: `${outside.length} de ${rows.length} filas fuera del margen ±${margin} pp: ${detail}.`,
    });
  }

  const enemy = findTemplate(catalog, enemyId);
  const weaponId = enemy?.weaponId ?? null;
  if (weaponId) {
    const heroUsers = catalog.roster.filter(
      (hero) => hero.weaponId === weaponId,
    );
    if (heroUsers.length > 0) {
      problems.push({
        kind: 'global-weapon',
        weaponId,
        heroIds: heroUsers.map((hero) => hero.id),
        message:
          `El arma ${weaponId} del ${enemy?.name ?? enemyId} también la usa ` +
          `${heroUsers.map((hero) => hero.name).join(', ')}; ` +
          'ajustarla mueve a ambos bandos.',
      });
    }
  }

  return {
    enemyId,
    margin,
    rows,
    insideCount,
    total: rows.length,
    fourOfFour: rows.length === 4 && insideCount === 4,
    outside,
    problems,
  };
}

/** Diagnóstico de todos los enemigos presentes, en orden de aparición. */
export function diagnoseBench(
  matchups: ReadonlyArray<MatchupResult>,
  targets: BenchTargets,
  catalog: Catalog = CATALOG,
  margin: number = MARGIN_PP,
): ReadonlyArray<EnemyDiagnosis> {
  const enemyIds: string[] = [];
  const seen = new Set<string>();
  for (const matchup of matchups) {
    if (seen.has(matchup.enemyId)) continue;
    seen.add(matchup.enemyId);
    enemyIds.push(matchup.enemyId);
  }
  return enemyIds.map((enemyId) => {
    return diagnoseEnemy(
      matchups.filter((matchup) => matchup.enemyId === enemyId),
      targets,
      margin,
      catalog,
    );
  });
}

function canonicalJson(value: unknown): string {
  if (value === null) return 'null';
  if (Array.isArray(value)) {
    return `[${value.map((entry) => canonicalJson(entry)).join(',')}]`;
  }
  if (typeof value === 'object') {
    const record = value as Record<string, unknown>;
    const keys = Object.keys(record)
      .filter((key) => record[key] !== undefined)
      .sort();
    return `{${keys
      .map((key) => `${JSON.stringify(key)}:${canonicalJson(record[key])}`)
      .join(',')}}`;
  }
  return JSON.stringify(value) ?? 'null';
}

/**
 * Identificador determinista de overrides: mismo contenido canónico, mismo id.
 *
 * No usa reloj ni aleatoriedad; el orden de inserción de claves no importa.
 */
export function overridesId(overrides: BenchOverrides): string {
  return hashString(canonicalJson(overrides)).toString(16).padStart(8, '0');
}

export interface BenchExport extends MeasurementPayload {
  readonly catalog: Catalog;
  readonly targets: BenchTargets;
  readonly targetsVersion: number;
  readonly targetsId: string;
  readonly overrides: BenchOverrides;
  readonly overridesId: string;
  readonly diagnosis: ReadonlyArray<EnemyDiagnosis>;
}

/** Export reproducible: catálogo ajustado, objetivos, overrides y diagnóstico. */
export function buildBenchExport(
  payload: MeasurementPayload,
  catalog: Catalog,
  targets: BenchTargets,
  overrides: BenchOverrides,
): BenchExport {
  return {
    ...payload,
    catalogVersion: catalog.version,
    catalog,
    targets,
    targetsVersion: TARGETS_VERSION,
    targetsId: targetsId(targets),
    overrides,
    overridesId: overridesId(overrides),
    diagnosis: diagnoseBench(payload.matchups, targets, catalog),
  };
}

/** JSON estable: dos ejecuciones con el mismo estado producen el mismo texto. */
export function benchExportJson(payload: BenchExport): string {
  return `${JSON.stringify(payload, null, 2)}\n`;
}

/** Nombre que distingue la ejecución ajustada de la base y de los objetivos. */
export function benchExportFileName(
  payload: MeasurementPayload,
  overrides: BenchOverrides,
  targets: BenchTargets,
): string {
  const suffix = isOverridesEmpty(overrides)
    ? 'bench-base'
    : `bench-overrides-${overridesId(overrides)}`;
  const targetSuffix = isTargetsGuide(targets)
    ? ''
    : `-targets-${targetsId(targets)}`;
  return (
    `${payload.experiment}-${payload.engine}-seed-${payload.seed}` +
    `-duels-${payload.duels}-${suffix}${targetSuffix}.json`
  );
}
