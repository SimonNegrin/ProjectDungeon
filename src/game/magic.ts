/**
 * Resolución de hechizos (REQ-025 T-003/T-004/T-011).
 *
 * Valida la fase completa —lanzador vivo, acción, maná, nivel, objetivo,
 * alcance, línea de visión y tope— antes de tirar o mutar. Un rechazo no
 * consume acción, maná, RNG ni cupo. El ataque reutiliza las capas de
 * `combat.ts` y el daño a un enemigo reutiliza su reacción de `REQ-009`.
 * La magia nunca abre réplica (REQ-027).
 */

import { actionsMax, hasAction, spendAction } from './actions';
import { applyEnemyHitReaction, findUnit, resolveHit } from './combat';
import { resolvePackets } from './damage';
import { reclaimPlayerCorpse, settleUnitDeath } from './death';
import { isAlive, isOccupied } from './grid';
import type { Container } from './inventory';
import { hasLineOfSight } from './perception';
import { rollDie } from './rng';
import { effectiveStats } from './stats';
import { findSpell, type SpellDefinition } from './spells';
import type {
  AttackRolls,
  DamagePacketBreakdown,
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

function deadUnitAt(state: GameState, position: Position): Unit | undefined {
  return (
    state.players.find((unit) => !isAlive(unit) && samePosition(unit, position)) ??
    state.enemies.find((unit) => !isAlive(unit) && samePosition(unit, position))
  );
}

/** Cadáver contenedor de un jugador, si su muerte ya se asentó. */
function corpseContainer(state: GameState, unitId: string): Container | undefined {
  return (state.containers ?? []).find((container) => container.corpseOf === unitId);
}

/**
 * Casilla del cadáver (REQ-021 R-010): manda el contenedor creado al morir,
 * porque el fantasma puede haberse movido. Sin contenedor (fixtures) se usa la
 * posición actual de la unidad muerta.
 */
function corpsePosition(state: GameState, unit: Unit): Position {
  const container = corpseContainer(state, unit.id);
  return container ? { x: container.x, y: container.y } : { x: unit.x, y: unit.y };
}

interface CorpseTarget {
  readonly unit: Unit;
  readonly position: Position;
}

/**
 * Resuelve el cadáver concreto (REQ-021 R-009): con `targetId` manda el id;
 * sin él se busca por la casilla del cadáver, con compatibilidad para las
 * llamadas antiguas que solo pasaban la casilla.
 */
function resolveCorpse(
  state: GameState,
  target: Position,
  targetId: string | undefined,
): CorpseTarget | undefined {
  if (targetId !== undefined) {
    const unit = state.players.find((candidate) => candidate.id === targetId);
    if (!unit || isAlive(unit)) return undefined;
    return { unit, position: corpsePosition(state, unit) };
  }

  const unit = state.players.find(
    (candidate) =>
      !isAlive(candidate) && samePosition(corpsePosition(state, candidate), target),
  );
  return unit ? { unit, position: corpsePosition(state, unit) } : undefined;
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
 * Devuelve al jugador a la vida en la casilla del cadáver (REQ-021 R-010):
 * sin marca de fantasma y con el contador de acciones inherente al personaje
 * —el del fantasma vale 1 y no debe sobrevivir a la resurrección—. MP, maná y
 * cupo de hechizos se restauran al empezar su turno (REQ-031 T-003).
 */
function revivePlayer(unit: Unit, position: Position, hp: number): Unit {
  const { ghost, ...mortal } = unit;
  void ghost;
  return {
    ...mortal,
    x: position.x,
    y: position.y,
    hp,
    actions: { max: actionsMax(unit.stats), remaining: 0 },
  };
}

/**
 * Resuelve un lanzamiento sobre una casilla. `targetId` es el selector
 * opcional de cadáver concreto (REQ-021 R-009): con él manda el id; sin él se
 * busca el cadáver por su casilla, como las llamadas anteriores. No comprueba
 * la fase: el motor valida `phase === 'player'` como en el resto de comandos.
 * Es atómico: todas las validaciones ocurren antes de la primera tirada y de
 * cualquier cambio.
 *
 * Orden de validación: lanzador, hechizo, acción, maná, nivel, objetivo,
 * alcance, línea de visión y tope.
 */
export function castSpell(
  state: GameState,
  casterId: string,
  spellId: string,
  target: Position,
  targetId?: string,
): SpellCastResult {
  const caster = findUnit(state, casterId);
  if (!caster) return reject('unknown-unit');
  if (!isAlive(caster)) return reject('dead-unit');

  const spell = findSpell(spellId);
  if (!spell) return reject('unknown-spell');

  if (!hasAction(caster)) return reject('no-action');
  if (caster.mana.current < spell.cost) return reject('no-mana');
  const casterProfile = effectiveStats(caster);
  if (casterProfile.stats.magicLevel < spell.minLevel) return reject('insufficient-level');

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

  const corpse = resolveCorpse(state, target, targetId);
  if (!corpse) {
    if (targetId !== undefined) {
      const unit =
        state.players.find((candidate) => candidate.id === targetId) ??
        state.enemies.find((candidate) => candidate.id === targetId);
      return unit ? reject('invalid-target') : reject('target-not-found');
    }
    const other = deadUnitAt(state, target) ?? livingUnitAt(state, target);
    return other ? reject('invalid-target') : reject('target-not-found');
  }
  if (isOccupied(state, corpse.position.x, corpse.position.y)) return reject('occupied');
  const corpseRange = distance(caster, corpse.position);
  if (corpseRange < spell.range.min || corpseRange > spell.range.max) {
    return reject('out-of-range');
  }
  if (!hasLineOfSight(state.grid, caster, corpse.position)) {
    return reject('no-line-of-sight');
  }
  if (caster.spellsCast >= MAX_SPELLS_PER_TURN) return reject('spell-limit');

  // Recupera lo que siga en el cadáver y lo consume antes de mutar
  // (REQ-021 R-014/T-014). Sin hueco para todo, el intento se rechaza limpio.
  const reclaimed = reclaimPlayerCorpse(state, corpse.unit);
  if (!reclaimed) return reject('inventory-full');

  const targetHp = Math.max(
    spell.effect.minHp,
    Math.ceil(spell.effect.hpRatio * corpse.unit.maxHp),
  );
  const next = withUnits(reclaimed.state, [
    spendCast(caster, spell.cost),
    revivePlayer(reclaimed.unit, corpse.position, targetHp),
  ]);

  return {
    ok: true,
    state: next,
    events: [
      {
        type: 'SpellCast',
        casterId: caster.id,
        spellId: spell.id,
        targetId: corpse.unit.id,
        target: { x: corpse.position.x, y: corpse.position.y },
        effect: 'resurrect',
        targetHp,
      },
    ],
  };
}

/**
 * Tirada mágica con el resolvedor compartido de paquetes (REQ-029 T-004/T-006):
 * el nivel de magia y el acierto del hechizo se oponen a defensa + escudo; el
 * paquete del hechizo se resuelve contra el perfil de resistencia del objetivo.
 * Mágico y eléctrico ignoran fuerza y armadura. Un fallo consume dos tiradas y
 * un impacto dos por paquete. Sin réplica: la reacción del enemigo es solo
 * despertar/alarma/huida.
 */
function resolveMagicAttack(
  state: GameState,
  caster: Unit,
  victim: Unit,
  spell: SpellDefinition,
): SpellCastResult {
  if (spell.effect.kind !== 'damage') return reject('unknown-spell');
  const packet = spell.damagePacket;
  if (packet === null) return reject('unknown-spell');

  const casterProfile = effectiveStats(caster);
  const victimProfile = effectiveStats(victim);
  const attackRoll = rollDie(state.rng);
  const shieldRoll = rollDie(attackRoll.rng);
  const hit = resolveHit(
    casterProfile.stats.magicLevel + spell.accuracy,
    victimProfile.stats.defensa + victimProfile.evasion,
    attackRoll.die,
    shieldRoll.die,
  );

  let rng = shieldRoll.rng;
  let damage = 0;
  let damageBreakdown: readonly DamagePacketBreakdown[] = [];
  let rolls: AttackRolls = {
    attack: attackRoll.die,
    shield: shieldRoll.die,
    damage: null,
    armor: null,
  };

  if (hit) {
    const resolved = resolvePackets([packet], 0, 0, victim.stats.resistencia, rng);
    rng = resolved.rng;
    damage = resolved.total;
    damageBreakdown = resolved.breakdown;
    rolls = { ...rolls, damage: resolved.rolls[0].damage, armor: resolved.rolls[0].resistance };
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
      damageBreakdown,
    },
  ];

  if (targetHp === 0) {
    events.push({ type: 'UnitDied', unitId: victim.id });
    next = settleUnitDeath(next, victim.id);
  } else {
    next = applyEnemyHitReaction(next, events, victim, caster, hit, damage);
  }

  return { ok: true, state: next, events };
}
