/**
 * Helpers puros del banco de ajuste de EXP-003: validación, normalización y
 * formato. No tocan DOM ni mutan el catálogo base.
 *
 * `main.ts` compone estado y DOM; los tests derivan de aquí y de `v2/bench.ts`.
 */

import {
  benchExportFileName,
  isOverridesEmpty,
  overridesId,
} from './v2/bench';
import type {
  BenchOverrides,
  EnemyDiagnosis,
  EnemyOverride,
  WeaponOverride,
} from './v2/bench';
import { findTemplate } from './v2/catalog';
import type { MeasurementPayload } from './v2/measure';
import type {
  Catalog,
  CombatantTemplate,
  Stats,
  WeaponDefinition,
} from './v2/types';
import { formatNumber } from './ui';

export const STAT_FIELDS = [
  'habilidad',
  'fuerza',
  'defensa',
  'resistencia',
] as const;

export type StatField = (typeof STAT_FIELDS)[number];

type MutableStats = { -readonly [K in keyof Stats]?: Stats[K] };

export const ENEMY_NUMERIC_FIELDS = ['maxHp', ...STAT_FIELDS, 'maxActions'] as const;
export type EnemyNumericField = (typeof ENEMY_NUMERIC_FIELDS)[number];

export const ENEMY_SELECT_FIELDS = ['armorId', 'shieldId', 'weaponId'] as const;
export type EnemySelectField = (typeof ENEMY_SELECT_FIELDS)[number];

export type EnemyField = EnemyNumericField | EnemySelectField;

export const ENEMY_FIELD_ORDER: ReadonlyArray<EnemyField> = [
  'maxHp',
  ...STAT_FIELDS,
  'maxActions',
  ...ENEMY_SELECT_FIELDS,
];

export const ENEMY_FIELD_LABELS: Readonly<Record<EnemyField, string>> = {
  maxHp: 'PV máximos',
  habilidad: 'Habilidad',
  fuerza: 'Fuerza',
  defensa: 'Defensa',
  resistencia: 'Resistencia',
  maxActions: 'Acciones',
  armorId: 'Armadura',
  shieldId: 'Escudo',
  weaponId: 'Arma equipada',
};

export const WEAPON_FIELDS = ['accuracy', 'damage'] as const;
export type WeaponField = (typeof WEAPON_FIELDS)[number];

export const WEAPON_FIELD_LABELS: Readonly<Record<WeaponField, string>> = {
  accuracy: 'Acierto',
  damage: 'Daño',
};

/** Rangos documentados de los campos numéricos del banco. */
export const ENEMY_NUMERIC_LIMITS: Readonly<
  Record<EnemyNumericField, { readonly min: number; readonly max: number }>
> = {
  maxHp: { min: 1, max: 999 },
  habilidad: { min: -10, max: 20 },
  fuerza: { min: -10, max: 20 },
  defensa: { min: -10, max: 20 },
  resistencia: { min: -10, max: 20 },
  maxActions: { min: 0, max: 10 },
};

export const WEAPON_LIMITS: Readonly<
  Record<WeaponField, { readonly min: number; readonly max: number }>
> = {
  accuracy: { min: -5, max: 10 },
  damage: { min: 0, max: 100 },
};

export type FieldValidation =
  | { readonly ok: true; readonly value: number; readonly message: null }
  | { readonly ok: false; readonly value: null; readonly message: string };

export type SelectValidation =
  | {
      readonly ok: true;
      readonly value: string | null;
      readonly message: null;
    }
  | { readonly ok: false; readonly value: null; readonly message: string };

export function isStatField(field: EnemyField): field is StatField {
  return (STAT_FIELDS as ReadonlyArray<string>).includes(field);
}

function invalid(message: string): FieldValidation {
  return { ok: false, value: null, message };
}

function parseInteger(
  raw: unknown,
  min: number,
  max: number,
  label: string,
): FieldValidation {
  if (typeof raw === 'number' && !Number.isFinite(raw)) {
    return invalid(`${label}: debe ser un entero entre ${min} y ${max}.`);
  }
  const text =
    typeof raw === 'string'
      ? raw.trim()
      : typeof raw === 'number'
        ? String(raw)
        : '';
  if (text === '') {
    return invalid(`${label}: escribe un entero entre ${min} y ${max}.`);
  }
  const value = Number(text);
  if (!Number.isFinite(value)) {
    return invalid(`${label}: «${text}» no es un número.`);
  }
  if (!Number.isInteger(value)) {
    return invalid(`${label}: debe ser un entero, sin decimales.`);
  }
  if (value < min || value > max) {
    return invalid(`${label}: debe estar entre ${min} y ${max}.`);
  }
  return { ok: true, value, message: null };
}

/** Valida un campo numérico o de select de un enemigo del catálogo. */
export function validateEnemyField(
  field: EnemyField,
  raw: unknown,
  catalog: Catalog,
): FieldValidation | SelectValidation {
  if (isStatField(field) || field === 'maxHp' || field === 'maxActions') {
    const limits = ENEMY_NUMERIC_LIMITS[field];
    return parseInteger(raw, limits.min, limits.max, ENEMY_FIELD_LABELS[field]);
  }

  if (field === 'armorId') {
    return validateSelect(raw, catalog.armors, 'armadura');
  }
  if (field === 'shieldId') {
    return validateSelect(raw, catalog.shields, 'escudo');
  }
  return validateSelect(raw, catalog.weapons, 'arma');
}

function validateSelect(
  raw: unknown,
  options: Readonly<Record<string, unknown>>,
  label: string,
): SelectValidation {
  if (raw === null || raw === undefined) {
    return { ok: true, value: null, message: null };
  }
  const text = String(raw).trim();
  if (text === '') return { ok: true, value: null, message: null };
  if (!(text in options)) {
    return {
      ok: false,
      value: null,
      message: `El ${label} «${text}» no está en el catálogo.`,
    };
  }
  return { ok: true, value: text, message: null };
}

/** Acierto/daño de un arma: entero en el rango documentado. */
export function validateWeaponField(
  field: WeaponField,
  raw: unknown,
): FieldValidation {
  const limits = WEAPON_LIMITS[field];
  return parseInteger(raw, limits.min, limits.max, WEAPON_FIELD_LABELS[field]);
}

/** Objetivo 0–100 entero; acepta el texto de un input. */
export function validateTargetInput(raw: unknown): FieldValidation {
  const text =
    typeof raw === 'string'
      ? raw.trim()
      : typeof raw === 'number'
        ? String(raw)
        : '';
  if (text === '') {
    return invalid('Objetivo: escribe un entero entre 0 y 100.');
  }
  const value = Number(text);
  if (!Number.isFinite(value) || !Number.isInteger(value)) {
    return invalid('Objetivo: debe ser un entero entre 0 y 100.');
  }
  if (value < 0 || value > 100) {
    return invalid('Objetivo: debe estar entre 0 y 100.');
  }
  return { ok: true, value, message: null };
}

/** Valor efectivo de un campo en un catálogo ya ajustado. */
export function enemyFieldValue(
  template: CombatantTemplate,
  field: EnemyField,
): number | string | null {
  if (isStatField(field)) return template.stats[field];
  if (
    field === 'maxHp' ||
    field === 'maxActions' ||
    field === 'armorId' ||
    field === 'shieldId' ||
    field === 'weaponId'
  ) {
    return template[field];
  }
  return null;
}

/** Construye el parche tipado que corresponde a un campo y su valor validado. */
export function enemyFieldPatch(
  field: EnemyField,
  value: number | string | null,
): EnemyOverride {
  if (isStatField(field)) {
    return { stats: { [field]: Number(value) } as Partial<Stats> };
  }
  if (field === 'maxHp') return { maxHp: Number(value) };
  if (field === 'maxActions') return { maxActions: Number(value) };
  if (field === 'armorId') return { armorId: value === null ? null : String(value) };
  if (field === 'shieldId') return { shieldId: value === null ? null : String(value) };
  return { weaponId: value === null ? null : String(value) };
}

/**
 * Elimina un campo del override de un enemigo sin tocar los demás.
 *
 * No poda por sí sola: el llamador encadena `pruneOverrides` antes de guardar.
 */
export function resetEnemyFieldOverride(
  overrides: BenchOverrides,
  enemyId: string,
  field: EnemyField,
): BenchOverrides {
  const current = overrides.enemies[enemyId];
  if (!current) return overrides;

  const next: {
    stats?: Partial<Stats>;
    maxHp?: number;
    maxActions?: number;
    armorId?: string | null;
    shieldId?: string | null;
    weaponId?: string | null;
  } = { ...current };

  if (isStatField(field)) {
    if (next.stats?.[field] !== undefined) {
      const stats: MutableStats = { ...next.stats };
      delete stats[field];
      if (Object.keys(stats).length > 0) next.stats = stats;
      else delete next.stats;
    }
  } else {
    delete next[field];
  }

  return {
    ...overrides,
    enemies: { ...overrides.enemies, [enemyId]: next },
  };
}

/**
 * Normaliza el estado: sin campos iguales a la base, sin `{}` y sin
 * enemigos/armas desconocidos. No muta la entrada.
 */
export function pruneOverrides(
  base: Catalog,
  overrides: BenchOverrides,
): BenchOverrides {
  const enemies: Record<string, EnemyOverride> = {};
  for (const [enemyId, override] of Object.entries(overrides.enemies).sort(
    ([left], [right]) => left.localeCompare(right),
  )) {
    const template = findTemplate(base, enemyId);
    if (!template) continue;

    const next: {
      stats?: Partial<Stats>;
      maxHp?: number;
      maxActions?: number;
      armorId?: string | null;
      shieldId?: string | null;
      weaponId?: string | null;
    } = {};

    const stats: MutableStats = {};
    for (const field of STAT_FIELDS) {
      const value = override.stats?.[field];
      if (value !== undefined && value !== template.stats[field]) {
        stats[field] = value;
      }
    }
    if (Object.keys(stats).length > 0) next.stats = stats;

    if (override.maxHp !== undefined && override.maxHp !== template.maxHp) {
      next.maxHp = override.maxHp;
    }
    if (
      override.maxActions !== undefined &&
      override.maxActions !== template.maxActions
    ) {
      next.maxActions = override.maxActions;
    }
    if (override.armorId !== undefined && override.armorId !== template.armorId) {
      next.armorId = override.armorId;
    }
    if (
      override.shieldId !== undefined &&
      override.shieldId !== template.shieldId
    ) {
      next.shieldId = override.shieldId;
    }
    if (
      override.weaponId !== undefined &&
      override.weaponId !== template.weaponId
    ) {
      next.weaponId = override.weaponId;
    }

    if (Object.keys(next).length > 0) enemies[enemyId] = next;
  }

  const weapons: Record<string, WeaponOverride> = {};
  for (const [weaponId, override] of Object.entries(overrides.weapons).sort(
    ([left], [right]) => left.localeCompare(right),
  )) {
    const weapon = base.weapons[weaponId];
    if (!weapon) continue;
    const next: { accuracy?: number; damage?: number } = {};
    for (const field of WEAPON_FIELDS) {
      const value = override[field];
      if (value !== undefined && value !== weapon[field]) next[field] = value;
    }
    if (Object.keys(next).length > 0) weapons[weaponId] = next;
  }

  return { enemies, weapons };
}

/** Objetivo legible: `75 %`. */
export function formatTarget(value: number): string {
  return `${formatNumber(value, 1).replace(/,0$/, '')} %`;
}

/** Delta real − objetivo con signo y coma decimal: `+7,1 pp`. */
export function formatDelta(delta: number): string {
  const rounded = Math.round((delta + Number.EPSILON) * 10) / 10;
  const sign = rounded > 0 ? '+' : rounded < 0 ? '−' : '±';
  return `${sign}${Math.abs(rounded).toFixed(1).replace('.', ',')} pp`;
}

/** Estado textual, además del color. */
export function formatRowState(inside: boolean): 'dentro' | 'fuera' {
  return inside ? 'dentro' : 'fuera';
}

function unitName(catalog: Catalog, id: string): string {
  return findTemplate(catalog, id)?.name ?? id;
}

/**
 * «4/4 dentro» o «3/4; Mago fuera por +7,1 pp». Los nombres salen del
 * catálogo ajustado; no se fijan en código.
 */
export function formatFourOfFour(
  diagnosis: EnemyDiagnosis,
  catalog: Catalog,
): string {
  if (diagnosis.fourOfFour) return `${diagnosis.insideCount}/${diagnosis.total} dentro`;
  const outside = diagnosis.outside
    .map(
      (row) =>
        `${unitName(catalog, row.heroId)} fuera por ${formatDelta(row.delta)}`,
    )
    .join(', ');
  return `${diagnosis.insideCount}/${diagnosis.total}; ${outside}`;
}

/** Una fila del diagnóstico: real, delta y dentro/fuera. */
export function formatDiagnosisRow(
  heroWinRate: number,
  target: number,
  delta: number,
  inside: boolean,
): string {
  return (
    `real ${formatNumber(heroWinRate, 1)} % · ` +
    `objetivo ${formatTarget(target)} · ` +
    `Δ ${formatDelta(delta)} · ${formatRowState(inside)}`
  );
}

export interface WeaponUsageRow extends WeaponDefinition {
  readonly users: ReadonlyArray<string>;
}

/** Todas las armas del catálogo con las unidades (héroes y enemigos) que las usan. */
export function weaponRows(catalog: Catalog): ReadonlyArray<WeaponUsageRow> {
  const units = [...catalog.roster, ...catalog.bestiary];
  return Object.values(catalog.weapons).map((weapon) => ({
    ...weapon,
    users: units
      .filter((unit) => unit.weaponId === weapon.id)
      .map((unit) => unit.name),
  }));
}

/** Nombres de las unidades que equipan un arma, en orden de catálogo. */
export function weaponUsers(catalog: Catalog, weaponId: string): ReadonlyArray<string> {
  return weaponRows(catalog)
    .filter((weapon) => weapon.id === weaponId)
    .flatMap((weapon) => weapon.users);
}

/**
 * Nombre de descarga: el export base conserva el nombre v2.0 histórico; con
 * overrides usa `bench-overrides-<id>` para no sobrescribirlo.
 */
export function benchFileName(
  payload: MeasurementPayload,
  overrides: BenchOverrides,
): string {
  if (isOverridesEmpty(overrides)) {
    return `${payload.experiment}-${payload.engine}-seed-${payload.seed}-duels-${payload.duels}.json`;
  }
  return benchExportFileName(payload, overrides);
}

/** Resumen del export con catálogo, semilla, overrides, objetivos y diagnóstico. */
export function formatBenchSummary(
  payload: MeasurementPayload,
  overrides: BenchOverrides,
  diagnosis: ReadonlyArray<EnemyDiagnosis>,
  bytes: number,
  catalog: Catalog,
): string {
  const four = diagnosis.filter((entry) => entry.fourOfFour).length;
  const outsideRows = diagnosis.reduce(
    (total, entry) => total + entry.outside.length,
    0,
  );
  const targetList = diagnosis
    .map((entry) => `${unitName(catalog, entry.enemyId)} ${formatTarget(entry.target)}`)
    .join(' · ');
  return (
    `experimento ${payload.experiment} · motor ${payload.engine} · catálogo ${payload.catalogVersion}\n` +
    `semilla ${payload.seed} · ${payload.duels} duelos por emparejamiento · escenario ${payload.scenario.id} · overridesId ${overridesId(overrides)}\n` +
    `objetivos: ${targetList || 'sin enemigos'}\n` +
    `diagnóstico: ${four}/${diagnosis.length} enemigos 4-de-4 · ${outsideRows} filas fuera del margen · ` +
    `${payload.matchups.length} emparejamientos\n` +
    `catálogo: ${catalog.roster.length} héroes, ${catalog.bestiary.length} enemigos, ` +
    `${Object.keys(catalog.spells).length} hechizos · ${bytes} B`
  );
}
