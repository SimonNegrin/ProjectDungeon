import type { GameEvent, GameState } from '../game/types';

/** Marca "!" de un enemigo que ha iniciado un episodio de alerta. */
export interface SpotMarker {
  readonly unitId: string;
  readonly x: number;
  readonly y: number;
}

/**
 * Solo `EnemySpotted` identifica al detector que inicia el episodio. Los
 * receptores de la onda de alarma también pasan a `alert`, pero no emiten ese
 * evento y por tanto no deben mostrar "!".
 */
export function trackSpottedUnits(
  current: ReadonlySet<string>,
  events: readonly GameEvent[],
): ReadonlySet<string> {
  let next: Set<string> | undefined;

  for (const event of events) {
    if (event.type !== 'EnemySpotted') continue;
    next ??= new Set(current);
    next.add(event.unitId);
  }

  return next ?? current;
}

/**
 * Marcadores visibles con el estado actual: el detector sigue vivo y en alerta.
 * Al pasar a `returning`/`dormant` o morir el marcador desaparece aunque el ID
 * siga recordado; una nueva detección lo vuelve a mostrar.
 */
export function activeSpotMarkers(
  state: GameState,
  spotted: ReadonlySet<string>,
): SpotMarker[] {
  if (spotted.size === 0) return [];

  return state.enemies
    .filter(
      (enemy) =>
        spotted.has(enemy.id) && enemy.hp > 0 && enemy.awareness === 'alert',
    )
    .map((enemy) => ({ unitId: enemy.id, x: enemy.x, y: enemy.y }));
}
