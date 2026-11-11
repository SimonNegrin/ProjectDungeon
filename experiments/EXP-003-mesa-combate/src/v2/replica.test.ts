import { describe, expect, it } from 'vitest';
import { CATALOG } from './catalog';
import { performMeleeAttack, performSpellCast } from './duel';
import { makeState, patchUnit, scriptedRng } from './test-helpers';
import type { Scenario } from './types';

function alertState(override: Partial<Scenario> = {}) {
  const state = makeState(override);
  patchUnit(state.enemy, { awareness: 'alert' });
  return state;
}

describe('réplica (REQ-027)', () => {
  it('un impacto no genera réplica', () => {
    const state = alertState();
    state.rng = scriptedRng([6, 1, 1, 6]);
    const result = performMeleeAttack(state, state.hero, state.enemy);
    expect(result.ok).toBe(true);
    expect(result.ok && result.hit).toBe(true);
    expect(result.ok && result.replica).toBeNull();
    expect(state.metrics.replicas.enemy.triggered).toBe(0);
    expect(state.events.filter((entry) => entry.type === 'replica')).toHaveLength(
      0,
    );
  });

  it('un fallo adyacente con arma genera réplica inmediata con tiradas nuevas', () => {
    const state = alertState();
    state.rng = scriptedRng([1, 6, 6, 1, 6, 1]);
    const heroHp = state.hero.hp;
    const result = performMeleeAttack(state, state.hero, state.enemy);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.hit).toBe(false);
    expect(result.replica?.hit).toBe(true);
    expect(state.hero.hp).toBeLessThan(heroHp);
    expect(state.rng.calls).toBe(6);
    expect(state.metrics.replicas.enemy).toMatchObject({
      triggered: 1,
      hits: 1,
    });
    const types = state.events.map((entry) => entry.type);
    expect(types.indexOf('attack')).toBeLessThan(types.indexOf('replica'));
  });

  it('no hay cadena: una réplica fallida termina la secuencia', () => {
    const state = alertState();
    state.rng = scriptedRng([1, 6, 1, 6]);
    performMeleeAttack(state, state.hero, state.enemy);
    expect(state.events.filter((entry) => entry.type === 'replica')).toHaveLength(
      1,
    );
    expect(state.metrics.replicas.enemy.triggered).toBe(1);
    expect(state.rng.calls).toBe(4);
  });

  it('sin arma equipada no hay réplica', () => {
    const state = alertState();
    patchUnit(state.enemy, { weaponId: null });
    state.rng = scriptedRng([1, 6]);
    const result = performMeleeAttack(state, state.hero, state.enemy);
    expect(result.ok && result.replica).toBeNull();
    expect(state.metrics.replicas.enemy.triggered).toBe(0);
    expect(state.rng.calls).toBe(2);
  });

  it('el dormido no es atacable en melé y no existe réplica de dormido', () => {
    const state = makeState();
    state.rng = scriptedRng([1, 6]);
    const result = performMeleeAttack(state, state.hero, state.enemy);
    expect(result).toEqual({ ok: false, reason: 'target-dormant' });
    expect(state.metrics.replicas.enemy.triggered).toBe(0);
    expect(state.rng.calls).toBe(0);
  });

  it('el que huye solo replica acorralado', () => {
    const open = alertState({ width: 10, heroPos: 4, enemyPos: 5 });
    patchUnit(open.enemy, { fleeing: true });
    open.rng = scriptedRng([1, 6]);
    const openResult = performMeleeAttack(open, open.hero, open.enemy);
    expect(openResult.ok && openResult.replica).toBeNull();
    expect(open.metrics.replicas.enemy.triggered).toBe(0);

    const cornered = alertState({ width: 10, heroPos: 8, enemyPos: 9 });
    patchUnit(cornered.enemy, { fleeing: true });
    cornered.rng = scriptedRng([1, 6, 6, 1, 6, 1]);
    const corneredResult = performMeleeAttack(
      cornered,
      cornered.hero,
      cornered.enemy,
    );
    expect(corneredResult.ok && corneredResult.replica?.hit).toBe(true);
    expect(cornered.metrics.replicas.enemy.triggered).toBe(1);
    expect(cornered.enemy.fleeing).toBe(true);
  });

  it('el que regresa replica', () => {
    const state = alertState();
    patchUnit(state.enemy, { awareness: 'returning' });
    state.rng = scriptedRng([1, 6, 6, 1, 6, 1]);
    const result = performMeleeAttack(state, state.hero, state.enemy);
    expect(result.ok && result.replica?.hit).toBe(true);
    expect(state.metrics.replicas.enemy.triggered).toBe(1);
    expect(state.enemy.awareness).toBe('returning');
  });

  it('la magia no genera réplica', () => {
    const state = makeState({
      heroId: 'mago',
      heroPos: 3,
      enemyPos: 5,
    });
    patchUnit(state.enemy, { awareness: 'alert' });
    state.rng = scriptedRng([1, 6]);
    const result = performSpellCast(
      state,
      state.hero,
      state.enemy,
      CATALOG.spells['fuego-ii'],
    );
    expect(result.ok && result.hit).toBe(false);
    expect(state.metrics.replicas.enemy.triggered).toBe(0);
    expect(state.events.filter((entry) => entry.type === 'replica')).toHaveLength(
      0,
    );
  });

  it('la réplica es gratis: no gasta acción, maná ni MP', () => {
    const state = alertState();
    const before = {
      actions: state.enemy.actions,
      mana: state.enemy.mana,
      mp: state.enemy.mp,
    };
    state.rng = scriptedRng([1, 6, 6, 1, 6, 1]);
    performMeleeAttack(state, state.hero, state.enemy);
    expect(state.enemy.actions).toBe(before.actions);
    expect(state.enemy.mana).toBe(before.mana);
    expect(state.enemy.mp).toBe(before.mp);
  });

  it('una réplica letal descarta las acciones restantes del atacante', () => {
    const state = alertState();
    patchUnit(state.hero, { hp: 1 });
    state.rng = scriptedRng([1, 6, 6, 1, 6, 1]);
    expect(state.hero.actions).toBeGreaterThan(1);
    const result = performMeleeAttack(state, state.hero, state.enemy);
    expect(result.ok && result.replica?.hit).toBe(true);
    expect(state.hero.hp).toBe(0);
    expect(state.hero.actions).toBe(0);
    expect(state.over).toBe(true);
    expect(state.winner).toBe('enemy');
    expect(state.metrics.replicas.enemy.kills).toBe(1);
  });

  it('dos fallos generan dos réplicas', () => {
    const state = alertState();
    state.rng = scriptedRng([1, 6, 6, 1, 6, 1, 1, 6, 6, 1, 6, 1]);
    performMeleeAttack(state, state.hero, state.enemy);
    performMeleeAttack(state, state.hero, state.enemy);
    expect(state.metrics.replicas.enemy.triggered).toBe(2);
    expect(state.metrics.replicas.enemy.hits).toBe(2);
    expect(state.hero.actions).toBe(0);
  });

  it('es determinista con la misma semilla y las mismas tiradas', () => {
    const first = alertState();
    const second = alertState();
    first.rng = scriptedRng([1, 6, 6, 1, 6, 1]);
    second.rng = scriptedRng([1, 6, 6, 1, 6, 1]);
    performMeleeAttack(first, first.hero, first.enemy);
    performMeleeAttack(second, second.hero, second.enemy);
    expect(JSON.stringify(first.events)).toBe(JSON.stringify(second.events));
    expect(first.hero.hp).toBe(second.hero.hp);
  });
});
