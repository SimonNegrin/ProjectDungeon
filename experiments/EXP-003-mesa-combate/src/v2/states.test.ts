import { describe, expect, it } from 'vitest';
import { planEnemyAction } from './ai';
import { CATALOG } from './catalog';
import { applyDamage, performMove, performSpellCast } from './duel';
import { makeState, patchUnit, scriptedRng } from './test-helpers';

describe('percepción y estados', () => {
  it('detecta al héroe tras cada paso dentro de la visión', () => {
    const state = makeState({
      heroId: 'guerrero',
      enemyId: 'centinela',
      heroPos: 0,
      enemyPos: 7,
    });
    expect(state.enemy.awareness).toBe('dormant');
    expect(performMove(state, state.hero, 1).ok).toBe(true);
    expect(state.enemy.awareness).toBe('alert');
    expect(state.enemy.lastKnown).toBe(1);
  });

  it('no despierta fuera de la visión del tipo', () => {
    const state = makeState({
      heroId: 'guerrero',
      enemyId: 'bruto',
      heroPos: 0,
      enemyPos: 7,
    });
    expect(performMove(state, state.hero, 1).ok).toBe(true);
    expect(performMove(state, state.hero, 2).ok).toBe(true);
    expect(state.enemy.awareness).toBe('dormant');
    expect(performMove(state, state.hero, 3).ok).toBe(true);
    expect(state.enemy.awareness).toBe('alert');
  });

  it('el daño despierta aunque el enemigo no viera al héroe', () => {
    const state = makeState({
      heroId: 'mago',
      enemyId: 'bruto',
      heroPos: 3,
      enemyPos: 5,
    });
    state.rng = scriptedRng([6, 1, 1, 6]);
    const result = performSpellCast(
      state,
      state.hero,
      state.enemy,
      CATALOG.spells['fuego-ii'],
    );
    expect(result.ok && result.hit).toBe(true);
    expect(state.enemy.hp).toBeGreaterThan(0);
    expect(state.enemy.awareness).toBe('alert');
    expect(state.enemy.lastKnown).toBe(3);
  });

  it('el cobarde huye si un golpe quita al menos el 40 % de su PV máximo y sobrevive', () => {
    const state = makeState({
      heroId: 'guerrero',
      enemyId: 'cobarde',
      heroPos: 3,
      enemyPos: 4,
    });
    patchUnit(state.enemy, { awareness: 'alert' });
    const threshold = Math.ceil(state.enemy.maxHp * 0.4);
    const applied = applyDamage(state, state.enemy, threshold, state.hero);
    expect(applied).toBe(threshold);
    expect(state.enemy.hp).toBeGreaterThan(0);
    expect(state.enemy.fleeing).toBe(true);
    expect(state.metrics.flee.triggers).toBe(1);

    const light = makeState({
      heroId: 'guerrero',
      enemyId: 'cobarde',
      heroPos: 3,
      enemyPos: 4,
    });
    patchUnit(light.enemy, { awareness: 'alert' });
    applyDamage(light, light.enemy, threshold - 1, light.hero);
    expect(light.enemy.fleeing).toBe(false);
    expect(light.metrics.flee.triggers).toBe(0);
  });

  it('un golpe letal no dispara la huida', () => {
    const state = makeState({
      heroId: 'guerrero',
      enemyId: 'cobarde',
      heroPos: 3,
      enemyPos: 4,
    });
    patchUnit(state.enemy, { awareness: 'alert' });
    applyDamage(state, state.enemy, state.enemy.maxHp + 5, state.hero);
    expect(state.enemy.hp).toBe(0);
    expect(state.enemy.fleeing).toBe(false);
    expect(state.metrics.flee.triggers).toBe(0);
  });

  it('el dormido espera y no ataca ni se mueve', () => {
    const state = makeState();
    expect(
      planEnemyAction(state.enemy, state.hero, CATALOG, state.scenario),
    ).toEqual({ type: 'wait' });
  });

  it('el que regresa vuelve a home sin atacar y se duerme al llegar', () => {
    const state = makeState({ heroPos: 3, enemyPos: 6 });
    patchUnit(state.enemy, { awareness: 'returning', home: 3 });
    expect(
      planEnemyAction(state.enemy, state.hero, CATALOG, state.scenario),
    ).toEqual({ type: 'move', to: 5 });
    patchUnit(state.enemy, { pos: 3, hp: 6 });
    expect(
      planEnemyAction(state.enemy, state.hero, CATALOG, state.scenario),
    ).toEqual({ type: 'wait' });
  });

  it('el cobarde acorralado ataca y el que puede escapar se aleja', () => {
    const open = makeState({ width: 10, heroPos: 4, enemyPos: 5 });
    patchUnit(open.enemy, { awareness: 'alert', fleeing: true });
    expect(
      planEnemyAction(open.enemy, open.hero, CATALOG, open.scenario),
    ).toEqual({ type: 'move', to: 6 });

    const cornered = makeState({ width: 10, heroPos: 8, enemyPos: 9 });
    patchUnit(cornered.enemy, { awareness: 'alert', fleeing: true });
    expect(
      planEnemyAction(cornered.enemy, cornered.hero, CATALOG, cornered.scenario),
    ).toEqual({ type: 'attack' });
  });

  it('sin héroe visible, el que huye vuelve a home', () => {
    const state = makeState({ width: 10, heroPos: 0, enemyPos: 9 });
    patchUnit(state.enemy, { awareness: 'alert', fleeing: true });
    expect(
      planEnemyAction(state.enemy, state.hero, CATALOG, state.scenario),
    ).toEqual({ type: 'return' });
  });
});
