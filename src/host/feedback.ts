import type { AttackRolls, GameEvent, GameState, Unit } from '../game/types';

export interface DamageFeedback {
  readonly targetId: string;
  readonly damage: number;
  readonly x: number;
  readonly y: number;
}

/** Datos de presentación de un ataque, con impacto/fallo y tiradas del motor. */
export interface AttackFeedback {
  readonly targetId: string;
  readonly hit: boolean;
  readonly damage: number;
  readonly targetHp: number;
  readonly rolls: AttackRolls;
  /** Texto ASCII: `-N` en impacto y `Fallo` en fallo. */
  readonly text: string;
  readonly x: number;
  readonly y: number;
}

function findUnit(state: GameState, id: string): Unit | undefined {
  return state.players.find((unit) => unit.id === id) ?? state.enemies.find((unit) => unit.id === id);
}

/**
 * Convierte los eventos de ataque en datos de presentación. Usa la posición del
 * objetivo en el estado resultante (los muertos conservan su casilla) y no
 * altera el estado ni retrasa la lógica.
 */
export function collectDamageFeedbacks(
  events: readonly GameEvent[],
  state: GameState,
): DamageFeedback[] {
  const feedbacks: DamageFeedback[] = [];

  for (const event of events) {
    if (event.type !== 'AttackPerformed') continue;
    const target = findUnit(state, event.targetId);
    if (!target) continue;
    feedbacks.push({
      targetId: event.targetId,
      damage: event.damage,
      x: target.x,
      y: target.y,
    });
  }

  return feedbacks;
}

/**
 * Convierte los ataques en feedback legible sin recalcular reglas: el impacto,
 * el daño y el HP salen del evento del motor. Un fallo se comunica con texto
 * (`Fallo`), no solo con color o animación.
 */
export function collectAttackFeedbacks(
  events: readonly GameEvent[],
  state: GameState,
): AttackFeedback[] {
  const feedbacks: AttackFeedback[] = [];

  for (const event of events) {
    if (event.type !== 'AttackPerformed') continue;
    const target = findUnit(state, event.targetId);
    if (!target) continue;
    feedbacks.push({
      targetId: event.targetId,
      hit: event.hit,
      damage: event.damage,
      targetHp: event.targetHp,
      rolls: { ...event.rolls },
      text: event.hit ? `-${event.damage}` : 'Fallo',
      x: target.x,
      y: target.y,
    });
  }

  return feedbacks;
}
