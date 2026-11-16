/**
 * Maná de hechizos (REQ-025).
 *
 * El máximo deriva siempre del nivel de magia con una única fórmula y el maná
 * es independiente del MP de movimiento. No implementa gasto ni hechizos.
 */

import type { MagicLevel, Mana, Unit } from './types';

/** Maná máximo por nivel de magia (REQ-025 R-003): 0/4/8/12/16. */
export const MANA_PER_MAGIC_LEVEL = 4;

/** Recuperación de maná al inicio del turno de cada unidad (REQ-025 R-004/T-005). */
export const MANA_RECOVERY_PER_TURN = 4;

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
 * Recalcula el máximo desde `stats.magicLevel` y recorta el actual si lo
 * supera. No regala maná: cambiar el nivel solo ajusta el tope.
 */
export function restoreMana(unit: Unit): Unit {
  const max = manaMaxFor(unit.stats.magicLevel);
  return { ...unit, mana: { current: Math.min(unit.mana.current, max), max } };
}

/**
 * Recupera `MANA_RECOVERY_PER_TURN` al empezar el turno de una unidad viva,
 * hasta el máximo. Recalcula antes el tope para respetar un nivel cambiado.
 */
export function recoverMana(unit: Unit): Unit {
  const synced = restoreMana(unit);
  return {
    ...synced,
    mana: {
      ...synced.mana,
      current: Math.min(
        synced.mana.current + MANA_RECOVERY_PER_TURN,
        synced.mana.max,
      ),
    },
  };
}
