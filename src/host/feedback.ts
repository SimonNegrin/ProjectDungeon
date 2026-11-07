import type { GameEvent, GameState, Unit } from '../game/types';

export interface DamageFeedback {
  readonly targetId: string;
  readonly damage: number;
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
