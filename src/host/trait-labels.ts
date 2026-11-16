/**
 * Texto visible de un trait (REQ-019 R-004/T-012). El catálogo es la fuente del
 * nombre y del efecto; este módulo solo traduce parámetros a palabras y no
 * duplica valores de juego. Un ID fuera del catálogo cae al formato histórico
 * `${id}: ${description}` para no ocultar datos de fixtures o contenido futuro.
 */

import {
  TRAITS,
  type TraitAttribute,
  type TraitParameters,
} from '../game/equipment';

const ATTRIBUTE_LABELS: Readonly<Record<TraitAttribute, string>> = {
  habilidad: 'habilidad',
  fuerza: 'fuerza',
  defensa: 'defensa',
  resistencia: 'resistencia',
  punteria: 'puntería',
  magia: 'magia',
  pvMax: 'PV máximos',
  mpMax: 'MP máximos',
  acciones: 'acciones',
};

function signed(value: number): string {
  return value >= 0 ? `+${value}` : `${value}`;
}

/** Resumen explícito de los parámetros que ejecuta el motor. */
export function traitEffectText(parameters: TraitParameters): string {
  switch (parameters.kind) {
    case 'modifier':
      return `${signed(parameters.amount)} ${ATTRIBUTE_LABELS[parameters.attribute]}`;
    case 'area':
      return `radio ${parameters.radius}, ${
        parameters.includesCenter ? 'incluye el centro' : 'sin centro'
      }, ${parameters.actionCost} ${
        parameters.actionCost === 1 ? 'acción' : 'acciones'
      }`;
    case 'lifesteal':
      return `${parameters.percent} % del daño, mínimo ${parameters.minimum}`;
  }
}

/** Fuente legible de un trait activo: objeto y hueco que lo aportan. */
export interface TraitSourceLabel {
  readonly itemName: string;
  readonly slotLabel: string;
}

/**
 * Línea de un trait: nombre, descripción y, en los especiales, el resumen de
 * parámetros. Los modificadores ya expresan su efecto en la descripción, así
 * que no repiten el número entre paréntesis.
 */
export function traitText(
  id: string,
  description: string,
  source?: TraitSourceLabel,
): string {
  const definition = TRAITS[id];
  if (definition === undefined) {
    return `${id}: ${description}`;
  }
  const prefix = source
    ? ` (${source.itemName}, ${source.slotLabel})`
    : '';
  const effect =
    definition.parameters.kind === 'modifier'
      ? ''
      : ` (${traitEffectText(definition.parameters)})`;
  return `${definition.name}${prefix}: ${description}${effect}`;
}
