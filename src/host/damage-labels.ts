/**
 * Etiquetas de presentación de los tipos de daño y las bandas de resistencia
 * (REQ-029 R-010 / T-008). Este módulo es puro: no calcula daño ni bandas, solo
 * traduce lo que el motor ya expone en `damageBreakdown` y `stats.resistencia`.
 *
 * El texto acompaña siempre al icono para que la información no dependa del
 * color ni de un único canal (REQ-017 R-021).
 */

import { bandFor } from '../game/damage';
import type {
  DamagePacketBreakdown,
  DamageType,
  ResistanceBand,
  ResistanceProfile,
} from '../game/types';

/** Orden estable de los cinco tipos de daño (REQ-029 R-001). */
export const DAMAGE_TYPES: readonly DamageType[] = [
  'slash',
  'blunt',
  'pierce',
  'magic',
  'electric',
];

/** Etiqueta legible de cada tipo; los IDs del motor no se muestran. */
export const DAMAGE_TYPE_LABELS: Readonly<Record<DamageType, string>> = {
  slash: 'filo',
  blunt: 'contundente',
  pierce: 'punzante',
  magic: 'mágico',
  electric: 'eléctrico',
};

/** Icono ASCII de cada banda; nunca va solo, siempre con su etiqueta. */
export const BAND_ICONS: Readonly<Record<ResistanceBand, string>> = {
  vulnerable: '▲',
  normal: '●',
  resistant: '▼',
  'very-resistant': '▼▼',
};

/** Etiqueta legible de cada banda. */
export const BAND_LABELS: Readonly<Record<ResistanceBand, string>> = {
  vulnerable: 'vulnerable',
  normal: 'normal',
  resistant: 'resistente',
  'very-resistant': 'muy resistente',
};

/** Fila de banda lista para el HUD o para `F1`. */
export interface BandRow {
  readonly type: DamageType;
  readonly icon: string;
  readonly typeLabel: string;
  readonly band: ResistanceBand;
  readonly bandLabel: string;
}

function rowFor(profile: ResistanceProfile, type: DamageType): BandRow {
  const band = bandFor(profile, type);
  return {
    type,
    icon: BAND_ICONS[band],
    typeLabel: DAMAGE_TYPE_LABELS[type],
    band,
    bandLabel: BAND_LABELS[band],
  };
}

/** Las cinco bandas del perfil, en el orden estable de los tipos. */
export function profileRows(profile: ResistanceProfile): readonly BandRow[] {
  return DAMAGE_TYPES.map((type) => rowFor(profile, type));
}

/**
 * Desglose legible de un ataque: `filo 3 + eléctrico 2`. Solo incluye paquetes
 * con daño final mayor que 0; un paquete recortado a 0 no inventa texto. Si
 * todos quedan a 0, devuelve cadena vacía y el total se lee solo.
 */
export function formatBreakdown(breakdown: readonly DamagePacketBreakdown[]): string {
  return breakdown
    .filter((packet) => packet.damage > 0)
    .map((packet) => `${DAMAGE_TYPE_LABELS[packet.type]} ${packet.damage}`)
    .join(' + ');
}

/**
 * Perfil completo en una línea para el overlay de debug: las cinco bandas,
 * incluidas las normales. `F1` no filtra por línea de visión (es debug).
 */
export function formatProfile(profile: ResistanceProfile): string {
  return profileRows(profile)
    .map((row) => `${row.typeLabel} ${row.bandLabel} ${row.icon}`)
    .join(' · ');
}
