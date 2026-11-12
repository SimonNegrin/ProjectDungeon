import { hasAction, spendAction } from './actions';
import { BESTIARY } from './bestiary';
import { armorValue, shieldValue, weaponFor } from './equipment';
import { isAlive, isInside, isOccupied, isWallAt } from './grid';
import { noteDamage, raiseAlarm } from './perception';
import { rollDie } from './rng';
import type {
  AttackRolls,
  GameEvent,
  GameState,
  RejectionReason,
  RngState,
  Unit,
} from './types';

/** Tipo de ataque; solo el cuerpo a cuerpo abre réplica (REQ-027 R-004). */
export type AttackKind = 'melee' | 'ranged' | 'magic';

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

/** Resultado de una tirada de ataque completa, sin acción ni efectos laterales. */
interface Strike {
  readonly hit: boolean;
  readonly damage: number;
  readonly targetHp: number;
  readonly rolls: AttackRolls;
  readonly rng: RngState;
}

/**
 * Tirada de ataque con la fórmula de REQ-010. Es la única implementación:
 * ataque y réplica la comparten. Consume dos tiradas si falla y cuatro si
 * impacta; no muta la entrada.
 */
function resolveStrike(state: GameState, attacker: Unit, target: Unit): Strike {
  const weapon = weaponFor(attacker.equipment.weaponId!);
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

  return { hit, damage, targetHp: Math.max(0, target.hp - damage), rolls, rng };
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

/**
 * Reacciones de un enemigo que recibe un impacto: despertar, alarma y huida del
 * cobarde. La réplica usa el mismo camino que un ataque normal.
 */
export function applyEnemyHitReaction(
  state: GameState,
  events: GameEvent[],
  target: Unit,
  attacker: Pick<Unit, 'x' | 'y'>,
  hit: boolean,
  damage: number,
): GameState {
  if (!hit || target.faction !== 'enemy' || target.hp <= 0) {
    return state;
  }

  // El daño despierta al enemigo y, si empieza un episodio, da la alarma.
  const newEpisode = target.awareness !== 'alert';
  const attackerPosition = { x: attacker.x, y: attacker.y };
  let next = noteDamage(state, target.id, attackerPosition);
  if (newEpisode) {
    const alarm = raiseAlarm(next, target.id, attackerPosition);
    next = alarm.state;
    events.push(...alarm.events);
  }

  // Huida determinista del cobarde: un golpe de al menos el 40 % de su vida
  // máxima, sobreviviendo, inicia o renueva la huida sin tirada adicional.
  const strongHit = damage * 5 >= target.maxHp * 2;
  const profile =
    target.enemyType === null ? undefined : BESTIARY[target.enemyType].profile;
  if (strongHit && profile === 'coward') {
    next = {
      ...next,
      enemies: next.enemies.map((unit) =>
        unit.id === target.id ? { ...unit, fleeing: true } : unit,
      ),
    };
    events.push({ type: 'EnemyFled', unitId: target.id });
  }

  return next;
}

/**
 * ¿Está `unit` acorralada por `threat`? Ninguna casilla adyacente libre aumenta
 * la distancia Chebyshev: muros y unidades vivas bloquean. Helper puro.
 */
export function isCornered(
  state: GameState,
  unit: Pick<Unit, 'x' | 'y'>,
  threat: Pick<Unit, 'x' | 'y'>,
): boolean {
  const distance = Math.max(
    Math.abs(unit.x - threat.x),
    Math.abs(unit.y - threat.y),
  );

  for (let dy = -1; dy <= 1; dy += 1) {
    for (let dx = -1; dx <= 1; dx += 1) {
      if (dx === 0 && dy === 0) continue;
      const x = unit.x + dx;
      const y = unit.y + dy;
      if (!isInside(state.grid, x, y) || isWallAt(state.grid, x, y)) continue;
      if (isOccupied(state, x, y)) continue;

      const nextDistance = Math.max(
        Math.abs(x - threat.x),
        Math.abs(y - threat.y),
      );
      if (nextDistance > distance) return false;
    }
  }

  return true;
}

/**
 * Elegibilidad del defensor para replicar (REQ-027 R-005/R-006): vivo,
 * adyacente, con arma equipada, alerta o regresando; huyendo solo acorralado.
 * Un dormido nunca replica.
 */
export function canReplicate(
  state: GameState,
  defender: Unit,
  attacker: Unit,
): boolean {
  if (!isAlive(defender) || !isAlive(attacker)) return false;
  if (!isAdjacent(defender, attacker)) return false;
  if (defender.equipment.weaponId === null) return false;
  if (defender.awareness === 'dormant') return false;
  if (defender.fleeing) return isCornered(state, defender, attacker);
  return true;
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
 *
 * En melé (`kind` por defecto), un fallo abre una réplica inmediata del
 * defensor si es elegible (REQ-027): tirada nueva con la misma fórmula, gratis,
 * sin recursión y antes de la siguiente acción del atacante. `ranged` y `magic`
 * quedan como discriminante para TASK-0082 y no replican.
 */
export function resolveAttack(
  state: GameState,
  attackerId: string,
  targetId: string,
  kind: AttackKind = 'melee',
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

  const strike = resolveStrike(state, attacker, target);
  const nextAttacker: Unit = spendAction(attacker);
  const nextTarget: Unit = { ...target, hp: strike.targetHp };

  let nextState = withUnits(
    { ...state, rng: strike.rng },
    [nextAttacker, nextTarget],
  );

  const events: GameEvent[] = [
    {
      type: 'AttackPerformed',
      attackerId,
      targetId,
      hit: strike.hit,
      damage: strike.damage,
      targetHp: strike.targetHp,
      rolls: strike.rolls,
    },
  ];

  if (strike.targetHp === 0) {
    events.push({ type: 'UnitDied', unitId: targetId });
  } else {
    nextState = applyEnemyHitReaction(
      nextState,
      events,
      target,
      attacker,
      strike.hit,
      strike.damage,
    );
  }

  if (kind === 'melee' && !strike.hit) {
    const defender = findUnit(nextState, targetId);
    const aggressor = findUnit(nextState, attackerId);

    if (defender && aggressor && canReplicate(nextState, defender, aggressor)) {
      const replica = resolveStrike(nextState, defender, aggressor);
      const damagedAttacker: Unit = { ...aggressor, hp: replica.targetHp };
      nextState = withUnits({ ...nextState, rng: replica.rng }, [damagedAttacker]);

      events.push({
        type: 'ReplicaPerformed',
        attackerId: defender.id,
        targetId: aggressor.id,
        hit: replica.hit,
        damage: replica.damage,
        targetHp: replica.targetHp,
        rolls: replica.rolls,
      });

      if (replica.targetHp === 0) {
        events.push({ type: 'UnitDied', unitId: aggressor.id });
      } else {
        nextState = applyEnemyHitReaction(
          nextState,
          events,
          aggressor,
          defender,
          replica.hit,
          replica.damage,
        );
      }
    }
  }

  return {
    ok: true,
    state: nextState,
    events,
    hit: strike.hit,
    damage: strike.damage,
    rolls: strike.rolls,
  };
}
