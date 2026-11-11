/**
 * Bucle de duelo 1v1 de la v2.0.
 *
 * Un turno es una activación; las acciones, el MP y el maná se restauran al
 * inicio del turno de cada unidad. El héroe actúa primero. La réplica se
 * resuelve dentro del ataque fallido, antes de la siguiente acción.
 */

import {
  distanceBetween,
  healUnit,
  isAdjacent,
  isCornered,
  meleeRejection,
  resurrectUnit,
  restoreTurn,
  selectDamageSpells,
  spellRejection,
  stepToward,
} from './actions';
import { planEnemyAction } from './ai';
import { CATALOG, createUnit, templateFor } from './catalog';
import { createRng } from './rng';
import { resolveMagicAttack, resolvePhysicalAttack } from './resolver';
import type {
  AttackRolls,
  Catalog,
  CombatEvent,
  DuelMetrics,
  DuelResult,
  DuelState,
  Rejection,
  Scenario,
  Side,
  SpellDefinition,
  Unit,
} from './types';

export interface ReplicaOutcome {
  readonly hit: boolean;
  readonly damage: number;
  readonly rolls: AttackRolls;
}

export type AttackOutcome =
  | {
      readonly ok: true;
      readonly hit: boolean;
      readonly damage: number;
      readonly replica: ReplicaOutcome | null;
    }
  | { readonly ok: false; readonly reason: Rejection };

export type SpellOutcome =
  | {
      readonly ok: true;
      readonly hit: boolean;
      readonly damage: number;
      readonly healed: number;
    }
  | { readonly ok: false; readonly reason: Rejection };

export type MoveOutcome =
  | { readonly ok: true; readonly to: number }
  | { readonly ok: false; readonly reason: Rejection };

function emptyCounters(): DuelMetrics['actions'][Side] {
  return { attack: 0, spell: 0, move: 0, wait: 0 };
}

function emptyReplica(): DuelMetrics['replicas'][Side] {
  return { triggered: 0, hits: 0, misses: 0, kills: 0, damage: 0 };
}

export function emptyMetrics(): DuelMetrics {
  return {
    actions: { hero: emptyCounters(), enemy: emptyCounters() },
    spells: {},
    mana: {
      hero: { available: 0, spent: 0 },
      enemy: { available: 0, spent: 0 },
    },
    damageDealt: { hero: 0, enemy: 0 },
    healing: { hero: 0, enemy: 0 },
    replicas: { hero: emptyReplica(), enemy: emptyReplica() },
    flee: { triggers: 0, rounds: 0 },
  };
}

export function createDuelState(
  scenario: Scenario,
  catalog: Catalog = CATALOG,
  seed = 1017,
): DuelState {
  const hero = createUnit(
    templateFor(catalog, scenario.heroId),
    scenario.heroPos,
  );
  const enemy = createUnit(
    templateFor(catalog, scenario.enemyId),
    scenario.enemyPos,
  );
  return {
    scenario,
    catalog,
    hero,
    enemy,
    rng: createRng(seed),
    round: 0,
    turns: 0,
    over: false,
    winner: null,
    events: [],
    metrics: emptyMetrics(),
  };
}

function event(state: DuelState, value: CombatEvent): void {
  state.events.push(value);
}

function detectHero(state: DuelState): void {
  const { hero, enemy } = state;
  if (enemy.hp <= 0) return;
  if (distanceBetween(enemy, hero) > enemy.vision) return;
  if (enemy.awareness === 'dormant') enemy.awareness = 'alert';
  if (enemy.awareness === 'alert') enemy.lastKnown = hero.pos;
}

/** Aplica daño real (sin sobrepasar PV), despierta y comprueba la huida. */
export function applyDamage(
  state: DuelState,
  target: Unit,
  rawDamage: number,
  source: Unit,
): number {
  if (rawDamage <= 0 || target.hp <= 0) return 0;
  const applied = Math.min(rawDamage, target.hp);
  target.hp -= applied;
  state.metrics.damageDealt[source.side] += applied;

  if (target.hp > 0) {
    if (target.side === 'enemy') {
      target.awareness = 'alert';
      target.lastKnown = source.pos;
    }
    const profile = state.catalog.aiProfiles[target.profileId];
    const threshold = profile?.fleeThreshold ?? null;
    if (threshold !== null && applied >= target.maxHp * threshold) {
      const alreadyFleeing = target.fleeing;
      target.fleeing = true;
      state.metrics.flee.triggers += 1;
      if (!alreadyFleeing) event(state, { type: 'flee', side: target.side });
    }
  } else {
    target.hp = 0;
    target.actions = 0;
    state.over = true;
    state.winner = target.side === 'hero' ? 'enemy' : 'hero';
    event(state, { type: 'death', side: target.side });
  }

  return applied;
}

function tryReplica(
  state: DuelState,
  defender: Unit,
  attacker: Unit,
): ReplicaOutcome | null {
  if (defender.hp <= 0 || attacker.hp <= 0) return null;
  if (defender.weaponId === null) return null;
  if (defender.awareness === 'dormant') return null;
  if (!isAdjacent(defender, attacker)) return null;
  if (
    defender.fleeing &&
    !isCornered(defender, attacker.pos, state.scenario)
  ) {
    return null;
  }

  const outcome = resolvePhysicalAttack(
    defender,
    attacker,
    state.rng,
    state.catalog,
  );
  const metrics = state.metrics.replicas[defender.side];
  metrics.triggered += 1;
  if (outcome.hit) {
    metrics.hits += 1;
    metrics.damage += applyDamage(state, attacker, outcome.damage, defender);
    if (attacker.hp === 0) metrics.kills += 1;
  } else {
    metrics.misses += 1;
  }
  event(state, {
    type: 'replica',
    attacker: defender.side,
    defender: attacker.side,
    hit: outcome.hit,
    damage: outcome.damage,
    rolls: outcome.rolls,
  });
  return { hit: outcome.hit, damage: outcome.damage, rolls: outcome.rolls };
}

export function performMeleeAttack(
  state: DuelState,
  attacker: Unit,
  defender: Unit,
): AttackOutcome {
  const reason = meleeRejection(attacker, defender, state.catalog);
  if (reason) return { ok: false, reason };

  attacker.actions -= 1;
  state.metrics.actions[attacker.side].attack += 1;

  const outcome = resolvePhysicalAttack(
    attacker,
    defender,
    state.rng,
    state.catalog,
  );
  if (outcome.hit) {
    applyDamage(state, defender, outcome.damage, attacker);
  }
  event(state, {
    type: 'attack',
    attacker: attacker.side,
    defender: defender.side,
    hit: outcome.hit,
    damage: outcome.damage,
    rolls: outcome.rolls,
  });

  const replica =
    outcome.hit || state.over
      ? null
      : tryReplica(state, defender, attacker);

  return {
    ok: true,
    hit: outcome.hit,
    damage: outcome.damage,
    replica,
  };
}

export function performSpellCast(
  state: DuelState,
  caster: Unit,
  target: Unit,
  spell: SpellDefinition,
): SpellOutcome {
  const reason = spellRejection(caster, target, spell, state.catalog);
  if (reason) return { ok: false, reason };

  caster.actions -= 1;
  caster.mana -= spell.cost;
  caster.spellsCastThisTurn += 1;
  state.metrics.actions[caster.side].spell += 1;
  state.metrics.mana[caster.side].spent += spell.cost;
  const spellMetrics = (state.metrics.spells[spell.id] ??= {
    casts: 0,
    hits: 0,
    misses: 0,
    damage: 0,
  });
  spellMetrics.casts += 1;

  if (spell.effect.type === 'damage') {
    const outcome = resolveMagicAttack(
      caster,
      target,
      spell,
      state.rng,
      state.catalog,
    );
    if (outcome.hit) {
      spellMetrics.hits += 1;
      spellMetrics.damage += applyDamage(state, target, outcome.damage, caster);
    } else {
      spellMetrics.misses += 1;
    }
    event(state, {
      type: 'spell',
      caster: caster.side,
      target: target.side,
      spellId: spell.id,
      hit: outcome.hit,
      damage: outcome.damage,
    });
    return {
      ok: true,
      hit: outcome.hit,
      damage: outcome.damage,
      healed: 0,
    };
  }

  if (spell.effect.type === 'heal') {
    const healed = healUnit(target, spell.effect.amount);
    state.metrics.healing[caster.side] += healed;
    event(state, {
      type: 'spell',
      caster: caster.side,
      target: target.side,
      spellId: spell.id,
      hit: true,
      damage: 0,
    });
    return { ok: true, hit: true, damage: 0, healed };
  }

  const restored = resurrectUnit(target, spell.effect.hpFraction);
  event(state, {
    type: 'spell',
    caster: caster.side,
    target: target.side,
    spellId: spell.id,
    hit: true,
    damage: 0,
  });
  return { ok: true, hit: true, damage: 0, healed: restored };
}

export function performMove(
  state: DuelState,
  unit: Unit,
  to: number,
): MoveOutcome {
  if (unit.mp < 1) return { ok: false, reason: 'no-mp' };
  if (to < 0 || to >= state.scenario.width) return { ok: false, reason: 'blocked' };
  const other = unit.side === 'hero' ? state.enemy : state.hero;
  if (to === other.pos) return { ok: false, reason: 'blocked' };
  if (Math.abs(to - unit.pos) !== 1) {
    return { ok: false, reason: 'invalid-step' };
  }

  const from = unit.pos;
  unit.mp -= 1;
  unit.pos = to;
  state.metrics.actions[unit.side].move += 1;
  event(state, { type: 'move', side: unit.side, from, to });
  if (unit.side === 'hero') detectHero(state);
  return { ok: true, to };
}

function heroTurn(state: DuelState): void {
  const { hero, enemy } = state;
  if (state.over || hero.hp <= 0) return;
  restoreTurn(hero);
  state.metrics.mana.hero.available += hero.maxMana;
  let acted = false;

  while (!state.over && hero.actions > 0 && enemy.hp > 0) {
    if (isAdjacent(hero, enemy) && hero.weaponId !== null) {
      const result = performMeleeAttack(state, hero, enemy);
      acted = true;
      if (!result.ok) break;
      continue;
    }

    const sequence = selectDamageSpells(hero, enemy, state.catalog);
    if (sequence.length > 0) {
      const spell = sequence[0];
      const result = performSpellCast(state, hero, enemy, spell);
      acted = true;
      if (!result.ok) break;
      continue;
    }

    if (hero.mp > 0 && !isAdjacent(hero, enemy)) {
      const step = stepToward(hero.pos, enemy.pos);
      if (step === null || step === enemy.pos) break;
      const result = performMove(state, hero, step);
      acted = true;
      if (!result.ok) break;
      continue;
    }

    break;
  }

  if (!acted && !state.over) {
    state.metrics.actions.hero.wait += 1;
    event(state, { type: 'wait', side: 'hero' });
  }
}

function enemyTurn(state: DuelState): void {
  const { hero, enemy } = state;
  if (state.over || enemy.hp <= 0) return;
  restoreTurn(enemy);
  state.metrics.mana.enemy.available += enemy.maxMana;
  if (enemy.fleeing) state.metrics.flee.rounds += 1;
  let acted = false;

  for (let guard = 0; guard < 1000 && !state.over; guard += 1) {
    if (hero.hp <= 0 || enemy.hp <= 0) break;
    const intent = planEnemyAction(
      enemy,
      hero,
      state.catalog,
      state.scenario,
    );

    if (intent.type === 'wait') break;
    if (intent.type === 'return') {
      enemy.awareness = 'returning';
      enemy.fleeing = false;
      acted = true;
      continue;
    }
    if (intent.type === 'move') {
      const result = performMove(state, enemy, intent.to);
      acted = true;
      if (!result.ok) break;
      continue;
    }
    if (intent.type === 'attack') {
      const result = performMeleeAttack(state, enemy, hero);
      acted = true;
      if (!result.ok) break;
      continue;
    }
    const spell = state.catalog.spells[intent.spellId];
    if (!spell) break;
    const result = performSpellCast(state, enemy, hero, spell);
    acted = true;
    if (!result.ok) break;
  }

  if (enemy.awareness === 'returning' && enemy.pos === enemy.home) {
    enemy.awareness = 'dormant';
  }
  if (!acted && !state.over) {
    state.metrics.actions.enemy.wait += 1;
    event(state, { type: 'wait', side: 'enemy' });
  }
}

export function runDuel(
  scenario: Scenario,
  catalog: Catalog = CATALOG,
  seed = 1017,
): DuelResult {
  const state = createDuelState(scenario, catalog, seed);

  while (!state.over && state.round < scenario.maxRounds) {
    state.round += 1;
    const heroFirst = scenario.initiative === 'hero';
    if (heroFirst) {
      heroTurn(state);
      state.turns += 1;
      if (!state.over) {
        enemyTurn(state);
        state.turns += 1;
      }
    } else {
      enemyTurn(state);
      state.turns += 1;
      if (!state.over) {
        heroTurn(state);
        state.turns += 1;
      }
    }
  }

  if (!state.over) {
    state.over = true;
    state.winner = 'draw';
  }

  return {
    winner: state.winner ?? 'draw',
    rounds: state.round,
    turns: state.turns,
    heroHp: state.hero.hp,
    enemyHp: state.enemy.hp,
    metrics: state.metrics,
  };
}
