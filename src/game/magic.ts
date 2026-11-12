/**
 * Resolución de hechizos (REQ-025 T-003/T-004/T-011).
 *
 * Valida la fase completa —lanzador vivo, acción, maná, nivel, objetivo,
 * alcance, línea de visión y tope— antes de tirar o mutar. Un rechazo no
 * consume acción, maná, RNG ni cupo. El ataque reutiliza las capas de
 * `combat.ts` y el daño a un enemigo reutiliza su reacción de `REQ-009`.
 * La magia nunca abre réplica (REQ-027).
 */

import { hasAction, spendAction } from './actions';
import {
  applyEnemyHitReaction,
  findUnit,
  resolveDamage,
  resolveHit,
} from './combat';
import { armorValue, shieldValue } from './equipment';
import { isAlive, isOccupied } from './grid';
import { hasLineOfSight } from './perception';
import { rollDie } from './rng';
import { findSpell, type SpellDefinition } from './spells';
import type {
  AttackRolls,
  GameEvent,
  GameState,
  Position,
  RejectionReason,
  Unit,
} from './types';

/** Tope provisional de hechizos por unidad y turno (REQ-025 R-006/T-007). */
export const MAX_SPELLS_PER_TURN = 2;

export type SpellCastResult =
  | {
      readonly ok: true;
      readonly state: GameState;
      readonly events: readonly GameEvent[];
    }
  | { readonly ok: false; readonly reason: RejectionReason };

function reject(reason: RejectionReason): SpellCastResult {
  return { ok: false, reason };
}

function distance(a: Pick<Unit, 'x' | 'y'>, b: Position): number {
  return Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y));
}

function samePosition(unit: Pick<Unit, 'x' | 'y'>, position: Position): boolean {
  return unit.x === position.x && unit.y === position.y;
}

function livingUnitAt(state: GameState, position: Position): Unit | undefined {
  return (
    state.players.find((unit) => isAlive(unit) && samePosition(unit, position)) ??
    state.enemies.find((unit) => isAlive(unit) && samePosition(unit, position))
  );
}

function deadPlayerAt(state: GameState, position: Position): Unit | undefined {
  return state.players.find((unit) => !isAlive(unit) && samePosition(unit, position));
}

function deadUnitAt(state: GameState, position: Position): Unit | undefined {
  return (
    state.players.find((unit) => !isAlive(unit) && samePosition(unit, position)) ??
    state.enemies.find((unit) => !isAlive(unit) && samePosition(unit, position))
  );
}

/** Sustituye unidades por ID en jugadores y enemigos sin mutar la entrada. */
function withUnits(state: GameState, updates: readonly Unit[]): GameState {
  const byId = new Map(updates.map((unit) => [unit.id, unit]));
  return {
    ...state,
    players: state.players.map((unit) => byId.get(unit.id) ?? unit),
    enemies: state.enemies.map((unit) => byId.get(unit.id) ?? unit),
  };
}

/** Consume una acción, el coste de maná y un hueco del tope de hechizos. */
function spendCast(caster: Unit, cost: number): Unit {
  return spendAction({
    ...caster,
    mana: { ...caster.mana, current: caster.mana.current - cost },
    spellsCast: caster.spellsCast + 1,
  });
}

/**
 * Resuelve un lanzamiento sobre una casilla. No comprueba la fase: el motor
 * valida `phase === 'player'` como en el resto de comandos. Es atómico: todas
 * las validaciones ocurren antes de la primera tirada y de cualquier cambio.
 *
 * Orden de validación: lanzador, hechizo, acción, maná, nivel, objetivo,
 * alcance, línea de visión y tope.
 */
export function castSpell(
  state: GameState,
  casterId: string,
  spellId: string,
  target: Position,
): SpellCastResult {
  const caster = findUnit(state, casterId);
  if (!caster) return reject('unknown-unit');
  if (!isAlive(caster)) return reject('dead-unit');

  const spell = findSpell(spellId);
  if (!spell) return reject('unknown-spell');

  if (!hasAction(caster)) return reject('no-action');
  if (caster.mana.current < spell.cost) return reject('no-mana');
  if (caster.stats.magicLevel < spell.minLevel) return reject('insufficient-level');

  const range = distance(caster, target);

  if (spell.effect.kind === 'damage') {
    const victim = livingUnitAt(state, target);
    if (!victim) {
      return deadUnitAt(state, target) ? reject('target-dead') : reject('target-not-found');
    }
    if (victim.faction === caster.faction) return reject('same-faction');
    if (range < spell.range.min || range > spell.range.max) return reject('out-of-range');
    if (!hasLineOfSight(state.grid, caster, target)) return reject('no-line-of-sight');
    if (caster.spellsCast >= MAX_SPELLS_PER_TURN) return reject('spell-limit');

    return resolveMagicAttack(state, caster, victim, spell);
  }

  if (spell.effect.kind === 'heal') {
    const ally = livingUnitAt(state, target);
    if (!ally) {
      return deadUnitAt(state, target) ? reject('target-dead') : reject('target-not-found');
    }
    if (ally.id === caster.id) return reject('invalid-target');
    if (ally.faction !== caster.faction) return reject('invalid-target');
    if (range < spell.range.min || range > spell.range.max) return reject('out-of-range');
    if (!hasLineOfSight(state.grid, caster, target)) return reject('no-line-of-sight');
    if (caster.spellsCast >= MAX_SPELLS_PER_TURN) return reject('spell-limit');

    const healed = Math.min(spell.effect.amount, ally.maxHp - ally.hp);
    const targetHp = ally.hp + healed;
    const next = withUnits(state, [
      spendCast(caster, spell.cost),
      { ...ally, hp: targetHp },
    ]);

    return {
      ok: true,
      state: next,
      events: [
        {
          type: 'SpellCast',
          casterId: caster.id,
          spellId: spell.id,
          targetId: ally.id,
          target: { x: ally.x, y: ally.y },
          effect: 'heal',
          healing: healed,
          targetHp,
        },
      ],
    };
  }

  const corpse = deadPlayerAt(state, target);
  if (!corpse) {
    const other = deadUnitAt(state, target) ?? livingUnitAt(state, target);
    return other ? reject('invalid-target') : reject('target-not-found');
  }
  if (isOccupied(state, target.x, target.y)) return reject('occupied');
  if (range < spell.range.min || range > spell.range.max) return reject('out-of-range');
  if (!hasLineOfSight(state.grid, caster, target)) return reject('no-line-of-sight');
  if (caster.spellsCast >= MAX_SPELLS_PER_TURN) return reject('spell-limit');

  const targetHp = Math.max(
    spell.effect.minHp,
    Math.ceil(spell.effect.hpRatio * corpse.maxHp),
  );
  const next = withUnits(state, [
    spendCast(caster, spell.cost),
    { ...corpse, hp: targetHp },
  ]);

  return {
    ok: true,
    state: next,
    events: [
      {
        type: 'SpellCast',
        casterId: caster.id,
        spellId: spell.id,
        targetId: corpse.id,
        target: { x: corpse.x, y: corpse.y },
        effect: 'resurrect',
        targetHp,
      },
    ],
  };
}

/**
 * Tirada mágica con las mismas capas que el físico: el nivel de magia y el
 * acierto del hechizo se oponen a defensa + escudo; el poder del hechizo se
 * opone a resistencia + armadura. Un fallo consume dos tiradas y un impacto
 * cuatro. Sin réplica: la reacción del enemigo es solo despertar/alarma/huida.
 */
function resolveMagicAttack(
  state: GameState,
  caster: Unit,
  victim: Unit,
  spell: SpellDefinition,
): SpellCastResult {
  if (spell.effect.kind !== 'damage') return reject('unknown-spell');

  const attackRoll = rollDie(state.rng);
  const shieldRoll = rollDie(attackRoll.rng);
  const hit = resolveHit(
    caster.stats.magicLevel + spell.accuracy,
    victim.stats.defensa + shieldValue(victim.equipment.shieldId),
    attackRoll.die,
    shieldRoll.die,
  );

  let rng = shieldRoll.rng;
  let damage = 0;
  let rolls: AttackRolls = {
    attack: attackRoll.die,
    shield: shieldRoll.die,
    damage: null,
    armor: null,
  };

  if (hit) {
    const damageRoll = rollDie(rng);
    const armorRoll = rollDie(damageRoll.rng);
    rng = armorRoll.rng;
    damage = resolveDamage(
      spell.power,
      victim.stats.resistencia + armorValue(victim.equipment.armorId),
      damageRoll.die,
      armorRoll.die,
    );
    rolls = { ...rolls, damage: damageRoll.die, armor: armorRoll.die };
  }

  const targetHp = Math.max(0, victim.hp - damage);
  let next = withUnits({ ...state, rng }, [
    spendCast(caster, spell.cost),
    { ...victim, hp: targetHp },
  ]);

  const events: GameEvent[] = [
    {
      type: 'SpellCast',
      casterId: caster.id,
      spellId: spell.id,
      targetId: victim.id,
      target: { x: victim.x, y: victim.y },
      effect: 'damage',
      hit,
      damage,
      targetHp,
      rolls,
    },
  ];

  if (targetHp === 0) {
    events.push({ type: 'UnitDied', unitId: victim.id });
  } else {
    next = applyEnemyHitReaction(next, events, victim, caster, hit, damage);
  }

  return { ok: true, state: next, events };
}
