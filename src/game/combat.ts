import { hasAction, spendAction } from './actions';
import { BESTIARY } from './bestiary';
import { armorValue, shieldValue, weaponFor } from './equipment';
import { isAlive } from './grid';
import { noteDamage, raiseAlarm } from './perception';
import { rollDie } from './rng';
import type {
  AttackRolls,
  GameEvent,
  GameState,
  RejectionReason,
  Unit,
} from './types';

export function isAdjacent(a: Pick<Unit, 'x' | 'y'>, b: Pick<Unit, 'x' | 'y'>): boolean {
  const dx = Math.abs(a.x - b.x);
  const dy = Math.abs(a.y - b.y);
  return Math.max(dx, dy) === 1;
}

export function findUnit(state: GameState, id: string): Unit | undefined {
  return state.players.find((unit) => unit.id === id) ?? state.enemies.find((unit) => unit.id === id);
}

/** Impacto: el ataque debe superar la defensa; el empate falla. */
export function resolveHit(
  attackBonus: number,
  defenseBonus: number,
  attackDie: number,
  shieldDie: number,
): boolean {
  return attackBonus + attackDie > defenseBonus + shieldDie;
}

/** Daño: la absorción (resistencia + armadura) resta a la tirada; mínimo 1. */
export function resolveDamage(
  damageBonus: number,
  absorption: number,
  damageDie: number,
  absorptionDie: number,
): number {
  return Math.max(1, damageBonus + damageDie - (absorption + absorptionDie));
}

export type AttackResult =
  | {
      readonly ok: true;
      readonly state: GameState;
      readonly events: readonly GameEvent[];
      readonly hit: boolean;
      readonly damage: number;
      readonly rolls: AttackRolls;
    }
  | { readonly ok: false; readonly reason: RejectionReason };

/**
 * Ataque básico genérico para jugadores y enemigos. No comprueba la fase:
 * esa decisión pertenece al motor. No muta el estado de entrada.
 *
 * Orden de tiradas: ataque, escudo; si impacta, daño y armadura. Un fallo
 * consume dos tiradas y un impacto cuatro.
 */
export function resolveAttack(
  state: GameState,
  attackerId: string,
  targetId: string,
): AttackResult {
  const attacker = findUnit(state, attackerId);
  if (!attacker) {
    return { ok: false, reason: 'unknown-unit' };
  }
  if (!isAlive(attacker)) {
    return { ok: false, reason: 'dead-unit' };
  }

  const target = findUnit(state, targetId);
  if (!target) {
    return { ok: false, reason: 'target-not-found' };
  }
  if (!isAlive(target)) {
    return { ok: false, reason: 'target-dead' };
  }
  if (target.faction === attacker.faction) {
    return { ok: false, reason: 'same-faction' };
  }
  if (!hasAction(attacker)) {
    return { ok: false, reason: 'no-action' };
  }
  if (!isAdjacent(attacker, target)) {
    return { ok: false, reason: 'target-not-adjacent' };
  }
  if (attacker.equipment.weaponId === null) {
    return { ok: false, reason: 'unarmed' };
  }

  const weapon = weaponFor(attacker.equipment.weaponId);
  const armor = armorValue(target.equipment.armorId);
  const shield = shieldValue(target.equipment.shieldId);
  const absorption = target.stats.resistencia + armor;

  const attackRoll = rollDie(state.rng);
  const shieldRoll = rollDie(attackRoll.rng);
  const hit = resolveHit(
    attacker.stats.habilidad + weapon.accuracy,
    target.stats.defensa + shield,
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
      attacker.stats.fuerza + weapon.damage,
      absorption,
      damageRoll.die,
      armorRoll.die,
    );
    rolls = { ...rolls, damage: damageRoll.die, armor: armorRoll.die };
  }

  const targetHp = Math.max(0, target.hp - damage);
  const nextAttacker: Unit = spendAction(attacker);
  const nextTarget: Unit = { ...target, hp: targetHp };

  const players = state.players.map((unit) => {
    if (unit.id === nextAttacker.id) return nextAttacker;
    if (unit.id === nextTarget.id) return nextTarget;
    return unit;
  });
  const enemies = state.enemies.map((unit) => {
    if (unit.id === nextAttacker.id) return nextAttacker;
    if (unit.id === nextTarget.id) return nextTarget;
    return unit;
  });

  const events: GameEvent[] = [
    {
      type: 'AttackPerformed',
      attackerId,
      targetId,
      hit,
      damage,
      targetHp,
      rolls,
    },
  ];
  let nextState: GameState = { ...state, players, enemies, rng };

  if (targetHp === 0) {
    events.push({ type: 'UnitDied', unitId: targetId });
  } else if (hit && target.faction === 'enemy') {
    // El daño despierta al enemigo y, si empieza un episodio, da la alarma.
    const newEpisode = target.awareness !== 'alert';
    const attackerPosition = { x: attacker.x, y: attacker.y };
    nextState = noteDamage(nextState, target.id, attackerPosition);
    if (newEpisode) {
      const alarm = raiseAlarm(nextState, target.id, attackerPosition);
      nextState = alarm.state;
      events.push(...alarm.events);
    }

    // Huida determinista del cobarde: un golpe de al menos el 40 % de su vida
    // máxima, sobreviviendo, inicia o renueva la huida sin tirada adicional.
    const strongHit = damage * 5 >= target.maxHp * 2;
    const profile =
      target.enemyType === null ? undefined : BESTIARY[target.enemyType].profile;
    if (strongHit && profile === 'coward') {
      nextState = {
        ...nextState,
        enemies: nextState.enemies.map((unit) =>
          unit.id === target.id ? { ...unit, fleeing: true } : unit,
        ),
      };
      events.push({ type: 'EnemyFled', unitId: target.id });
    }
  }

  return {
    ok: true,
    state: nextState,
    events,
    hit,
    damage,
    rolls,
  };
}
