import type { Actions, Unit, UnitStats } from './types';

/** Acciones por turno de una unidad sin bonificaciones (REQ-026). */
export const DEFAULT_ACTIONS = 2;

/**
 * Tope provisional de acciones por turno; los bonus de equipo se recortan
 * aquí de forma determinista hasta el rebalanceo.
 */
export const MAX_ACTIONS = 4;

/** `max` = atributo inherente + bonus del equipo, recortado al tope. */
export function actionsMax(stats: UnitStats, actionsBonus = 0): number {
  return Math.min(MAX_ACTIONS, Math.max(0, stats.acciones + actionsBonus));
}

/** Crea el contador de una unidad nueva con todas las acciones disponibles. */
export function createActions(stats: UnitStats, actionsBonus = 0): Actions {
  const max = actionsMax(stats, actionsBonus);
  return { max, remaining: max };
}

export function hasAction(unit: Pick<Unit, 'actions'>): boolean {
  return unit.actions.remaining > 0;
}

/** Gasta una acción; el llamador debe comprobar `hasAction` antes. */
export function spendAction(unit: Unit): Unit {
  if (!hasAction(unit)) return unit;
  return {
    ...unit,
    actions: { ...unit.actions, remaining: unit.actions.remaining - 1 },
  };
}

/** Restaura el contador al máximo del turno, como MP y maná. */
export function restoreActions(unit: Unit): Unit {
  return {
    ...unit,
    actions: { ...unit.actions, remaining: unit.actions.max },
  };
}
