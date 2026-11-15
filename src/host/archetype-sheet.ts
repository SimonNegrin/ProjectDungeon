/**
 * Modelo puro de la ficha de arquetipo (REQ-016 R-006).
 *
 * Presenta los valores inherentes del roster —sin equipo efectivo— y la tabla
 * de celdas 32×32 de `rogues.png` de REQ-016. No toca el DOM, no crea sesión y
 * no conoce el reloj; la vista lo consume en cada render.
 */

import { ITEMS } from '../game/equipment';
import { ROSTER, type ArchetypeEntry, type ArchetypeId } from '../game/roster';
import { profileRows } from './damage-labels';
import type { SpriteRect } from './assets';

export type SheetStatId =
  | 'habilidad'
  | 'fuerza'
  | 'defensa'
  | 'resistencia'
  | 'punteria'
  | 'magia'
  | 'pv'
  | 'mp'
  | 'acciones';

export interface SheetStat {
  readonly id: SheetStatId;
  readonly label: string;
  readonly value: string;
}

export interface SheetVariant {
  readonly variant: 1 | 2;
  readonly rect: SpriteRect;
  /** «Guerrero, variante 1»; sin etiquetas de género. */
  readonly accessibleName: string;
}

export interface ArchetypeSheet {
  readonly id: ArchetypeId;
  readonly name: string;
  /** Exactamente nueve filas, en el orden de `SHEET_STAT_IDS`. */
  readonly stats: readonly SheetStat[];
  readonly weapon: string;
  readonly magicLevel: number;
  readonly variants: readonly [SheetVariant, SheetVariant];
}

/**
 * Tabla de las 18 celdas de 32×32 de `rogues.png` (REQ-016, ADR-006). Es la
 * fuente única de la ficha, del sprite del mapa y de la miniatura del HUD.
 */
export const ARCHETYPE_VARIANT_CELLS: Readonly<
  Record<ArchetypeId, readonly [SpriteRect, SpriteRect]>
> = {
  warrior: [
    { sx: 0, sy: 32, sw: 32, sh: 32 },
    { sx: 64, sy: 32, sw: 32, sh: 32 },
  ],
  barbarian: [
    { sx: 0, sy: 96, sw: 32, sh: 32 },
    { sx: 160, sy: 96, sw: 32, sh: 32 },
  ],
  rogue: [
    { sx: 96, sy: 0, sw: 32, sh: 32 },
    { sx: 128, sy: 0, sw: 32, sh: 32 },
  ],
  archer: [
    { sx: 64, sy: 0, sw: 32, sh: 32 },
    { sx: 32, sy: 0, sw: 32, sh: 32 },
  ],
  mage: [
    { sx: 32, sy: 128, sw: 32, sh: 32 },
    { sx: 0, sy: 128, sw: 32, sh: 32 },
  ],
  cleric: [
    { sx: 96, sy: 64, sw: 32, sh: 32 },
    { sx: 32, sy: 64, sw: 32, sh: 32 },
  ],
  spellblade: [
    { sx: 96, sy: 96, sw: 32, sh: 32 },
    { sx: 128, sy: 96, sw: 32, sh: 32 },
  ],
  cook: [
    { sx: 96, sy: 160, sw: 32, sh: 32 },
    { sx: 128, sy: 160, sw: 32, sh: 32 },
  ],
  farmer: [
    { sx: 0, sy: 160, sw: 32, sh: 32 },
    { sx: 0, sy: 192, sw: 32, sh: 32 },
  ],
};

/**
 * Celda 32×32 de `rogues.png` que comparten mapa y miniatura del HUD. Una
 * variante ausente o desconocida cae en la variante 1 del **mismo** arquetipo,
 * nunca en otro; sin arquetipo (o con uno desconocido) no hay sprite.
 */
export function variantCellFor(
  archetypeId: ArchetypeId | null | undefined,
  variant: number | null | undefined,
): SpriteRect | null {
  if (!archetypeId) return null;
  const cells = ARCHETYPE_VARIANT_CELLS[archetypeId];
  if (!cells) return null;
  return cells[variant === 2 ? 1 : 0];
}

/** Orden estable de las nueve filas de la ficha. */
export const SHEET_STAT_IDS: readonly SheetStatId[] = [
  'habilidad',
  'fuerza',
  'defensa',
  'resistencia',
  'punteria',
  'magia',
  'pv',
  'mp',
  'acciones',
];

const STAT_LABELS: Readonly<Record<SheetStatId, string>> = {
  habilidad: 'Habilidad',
  fuerza: 'Fuerza',
  defensa: 'Defensa',
  resistencia: 'Resistencia',
  punteria: 'Puntería',
  magia: 'Nivel de magia',
  pv: 'PV',
  mp: 'MP',
  acciones: 'Acciones',
};

/** Signo tipográfico para los modificadores inherentes. */
function signed(value: number): string {
  if (value > 0) return `+${String(value)}`;
  if (value < 0) return `−${String(Math.abs(value))}`;
  return '0';
}

/** `filo ● · contundente ● · …`, en el orden estable de `profileRows`. */
function resistanceText(entry: ArchetypeEntry): string {
  return profileRows(entry.stats.resistencia)
    .map((row) => `${row.typeLabel} ${row.icon}`)
    .join(' · ');
}

/** Arma equipada, arma futura o `—`; nunca duplica nombres del catálogo. */
function weaponText(entry: ArchetypeEntry): string {
  if (entry.equipment.weaponId !== null) {
    return ITEMS[entry.equipment.weaponId].name;
  }
  if (entry.futureWeapon !== null) return `${entry.futureWeapon} (futura)`;
  return '—';
}

function variantsFor(id: ArchetypeId): readonly [SheetVariant, SheetVariant] {
  const [first, second] = ARCHETYPE_VARIANT_CELLS[id];
  return [
    { variant: 1, rect: first, accessibleName: `${ROSTER[id].name}, variante 1` },
    { variant: 2, rect: second, accessibleName: `${ROSTER[id].name}, variante 2` },
  ];
}

/**
 * Construye la ficha de un arquetipo leyendo `ROSTER` en el momento de la
 * llamada. No usa `createPlayerFromArchetype` ni stats efectivos: aquí se
 * muestran los valores inherentes, sin bonus de equipo.
 */
export function buildArchetypeSheet(id: ArchetypeId): ArchetypeSheet {
  const entry = ROSTER[id];
  const values: Readonly<Record<SheetStatId, string>> = {
    habilidad: signed(entry.stats.habilidad),
    fuerza: signed(entry.stats.fuerza),
    defensa: signed(entry.stats.defensa),
    resistencia: resistanceText(entry),
    punteria: signed(entry.stats.punteria),
    magia: String(entry.stats.magicLevel),
    pv: String(entry.maxHp),
    mp: String(entry.maxMp),
    acciones: String(entry.stats.acciones),
  };

  return {
    id,
    name: entry.name,
    stats: SHEET_STAT_IDS.map((id) => ({
      id,
      label: STAT_LABELS[id],
      value: values[id],
    })),
    weapon: weaponText(entry),
    magicLevel: entry.stats.magicLevel,
    variants: variantsFor(id),
  };
}
