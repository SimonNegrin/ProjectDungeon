/**
 * IA enemiga determinista de la v2.0 (REQ-009 + REQ-026).
 *
 * Dormido espera; alerta ataca, lanza hechizos genéricos si el perfil lo
 * permite y, si no, gasta MP hacia `lastKnown`; regreso vuelve a `home` sin
 * atacar; huida maximiza la distancia y solo ataca acorralada.
 */

import {
  isCornered,
  isInside,
  pickEnemySpell,
  stepToward,
} from './actions';
import type { Catalog, Scenario, Unit } from './types';

export type EnemyIntent =
  | { readonly type: 'wait' }
  | { readonly type: 'move'; readonly to: number }
  | { readonly type: 'attack' }
  | { readonly type: 'cast'; readonly spellId: string }
  | { readonly type: 'return' };

export function planEnemyAction(
  unit: Unit,
  hero: Unit,
  catalog: Catalog,
  scenario: Scenario,
): EnemyIntent {
  if (unit.hp <= 0 || hero.hp <= 0) return { type: 'wait' };
  if (unit.awareness === 'dormant') return { type: 'wait' };

  const profile = catalog.aiProfiles[unit.profileId];
  if (!profile) return { type: 'wait' };

  if (unit.awareness === 'returning') {
    if (unit.pos === unit.home) return { type: 'wait' };
    const step = stepToward(unit.pos, unit.home);
    if (step === null || !isInside(scenario, step, [hero.pos])) {
      return { type: 'wait' };
    }
    return { type: 'move', to: step };
  }

  const distance = Math.abs(unit.pos - hero.pos);

  if (unit.fleeing) {
    if (distance > unit.vision) return { type: 'return' };
    if (isCornered(unit, hero.pos, scenario)) {
      if (distance === 1 && unit.actions > 0 && unit.weaponId !== null) {
        return { type: 'attack' };
      }
      return { type: 'wait' };
    }
    const away = unit.pos + Math.sign(unit.pos - hero.pos);
    if (away < 0 || away >= scenario.width || away === hero.pos) {
      return { type: 'wait' };
    }
    if (unit.mp < 1) return { type: 'wait' };
    return { type: 'move', to: away };
  }

  if (distance === 1 && unit.actions > 0 && unit.weaponId !== null) {
    return { type: 'attack' };
  }

  const spell = pickEnemySpell(unit, hero, catalog, profile);
  if (spell) return { type: 'cast', spellId: spell.id };

  if (unit.mp > 0 && distance !== 1) {
    const target = unit.lastKnown ?? hero.pos;
    const step = stepToward(unit.pos, target);
    if (step !== null && step !== hero.pos && isInside(scenario, step)) {
      return { type: 'move', to: step };
    }
  }

  return { type: 'wait' };
}
