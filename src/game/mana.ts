/**
 * Maná de hechizos (REQ-025).
 *
 * El máximo deriva siempre del nivel de magia con una única fórmula y el maná
 * es independiente del MP de movimiento. No implementa gasto ni hechizos.
 */

import type { MagicLevel, Mana, Unit } from './types';

/** Maná máximo por nivel de magia (REQ-025 R-003): 0/4/8/12/16. */
export const MANA_PER_MAGIC_LEVEL = 4;

/** Única fórmula del máximo de maná: `magicLevel × 4`. */
export function manaMaxFor(magicLevel: MagicLevel): number {
  return magicLevel * MANA_PER_MAGIC_LEVEL;
}

/** Reserva completa derivada del nivel; no toca el MP. */
export function createMana(magicLevel: MagicLevel): Mana {
  const max = manaMaxFor(magicLevel);
  return { current: max, max };
}

/**
 * Recalcula el máximo desde `stats.magicLevel` y recarga el maná. Se usa al
 * empezar el turno de una unidad viva y al cambiar el nivel.
 */
export function restoreMana(unit: Unit): Unit {
  return { ...unit, mana: createMana(unit.stats.magicLevel) };
}
