import { isAlive } from './grid';
import {
  ENEMY_ATTACK_DAMAGE,
  PLAYER_ATTACK_DAMAGE,
  type GameEvent,
  type GameState,
  type RejectionReason,
  type Unit,
} from './types';

export function isAdjacent(a: Pick<Unit, 'x' | 'y'>, b: Pick<Unit, 'x' | 'y'>): boolean {
  const dx = Math.abs(a.x - b.x);
  const dy = Math.abs(a.y - b.y);
  return Math.max(dx, dy) === 1;
}

export function attackDamage(attacker: Unit): number {
  return attacker.faction === 'player' ? PLAYER_ATTACK_DAMAGE : ENEMY_ATTACK_DAMAGE;
}

export function findUnit(state: GameState, id: string): Unit | undefined {
  return state.players.find((unit) => unit.id === id) ?? state.enemies.find((unit) => unit.id === id);
}

export type AttackResult =
  | {
      readonly ok: true;
      readonly state: GameState;
      readonly events: readonly GameEvent[];
    }
  | { readonly ok: false; readonly reason: RejectionReason };

/**
 * Ataque básico genérico para jugadores y enemigos. No comprueba la fase:
 * esa decisión pertenece al motor. No muta el estado de entrada.
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
  if (!attacker.actionAvailable) {
    return { ok: false, reason: 'no-action' };
  }
  if (!isAdjacent(attacker, target)) {
    return { ok: false, reason: 'target-not-adjacent' };
  }

  const damage = attackDamage(attacker);
  const targetHp = Math.max(0, target.hp - damage);
  const nextAttacker: Unit = { ...attacker, actionAvailable: false };
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
      damage,
      targetHp,
    },
  ];
  if (targetHp === 0) {
    events.push({ type: 'UnitDied', unitId: targetId });
  }

  return {
    ok: true,
    state: { ...state, players, enemies },
    events,
  };
}
