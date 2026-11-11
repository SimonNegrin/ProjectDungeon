/**
 * Utilidades solo para tests: RNG con caras prefijadas y estado 1v1 mínimo.
 */

import { CATALOG } from './catalog';
import { createDuelState } from './duel';
import type {
  Catalog,
  CombatEvent,
  DuelState,
  Rng,
  Scenario,
  Unit,
} from './types';

/** RNG que devuelve las caras indicadas, en orden. */
export function scriptedRng(faces: ReadonlyArray<number>): Rng {
  let index = 0;
  const rng: Rng = {
    next() {
      const face = faces[index] ?? 1;
      index += 1;
      return (face - 0.5) / 6;
    },
    die() {
      return Math.min(6, Math.max(1, Math.floor(rng.next() * 6) + 1));
    },
    get calls() {
      return index;
    },
  };
  return rng;
}

export const BASE_SCENARIO: Scenario = {
  id: 'test-corridor',
  width: 8,
  heroId: 'guerrero',
  enemyId: 'centinela',
  heroPos: 3,
  enemyPos: 4,
  initiative: 'hero',
  maxRounds: 100,
};

export function makeState(
  override: Partial<Scenario> = {},
  catalog: Catalog = CATALOG,
  seed = 1,
): DuelState {
  return createDuelState({ ...BASE_SCENARIO, ...override }, catalog, seed);
}

export function patchUnit(unit: Unit, patch: Partial<Unit>): Unit {
  Object.assign(unit, patch);
  return unit;
}

export function eventsOfType(
  state: DuelState,
  type: CombatEvent['type'],
): CombatEvent[] {
  return state.events.filter((entry) => entry.type === type);
}
