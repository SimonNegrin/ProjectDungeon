/**
 * Modelo puro de la pantalla de resultado (REQ-031 R-020, T-015).
 *
 * Lee el estado final y compone lo que la mesa necesita para repetir o cargar:
 * Victoria o Derrota, ronda, party con nombres y arquetipos, y semilla. No
 * decide cuándo se muestra ni toca la sesión: el host entrega el estado que ya
 * pintó la presentación (tras el cue de `GameEnded`) y esta función solo deriva.
 */

import { ROSTER } from '../game/roster';
import type { GameEndStatus, GameState } from '../game/types';

/** Fila de la party en la pantalla final, en orden de turno 1..N. */
export interface ResultPlayer {
  /** Posición 1-based en el orden de turno. */
  readonly number: number;
  /** Nombre de instancia; el constructor resuelve el vacío con el arquetipo. */
  readonly name: string;
  /** Nombre visible del arquetipo del roster; `—` si la unidad no tiene. */
  readonly archetype: string;
}

export interface ResultScreen {
  readonly status: GameEndStatus;
  readonly title: 'Victoria' | 'Derrota';
  /** Ronda alcanzada, 1-based. */
  readonly round: number;
  /** Semilla de la partida, legible para repetir la mazmorra. */
  readonly seed: number;
  readonly players: readonly ResultPlayer[];
  /** Texto completo para la región viva; no sustituye a los nodos visibles. */
  readonly announcement: string;
}

function archetypeName(archetypeId: GameState['players'][number]['archetypeId']): string {
  return archetypeId === null ? '—' : ROSTER[archetypeId].name;
}

/**
 * `null` mientras la partida sigue en curso. La semilla sale de la
 * configuración que originó la partida; los estados manuales sin `config` caen
 * al RNG para no inventar un valor.
 */
export function buildResultScreen(state: GameState): ResultScreen | null {
  if (state.status === 'playing') return null;

  const title = state.status === 'victory' ? 'Victoria' : 'Derrota';
  const seed = state.config?.seed ?? state.rng.seed;
  const players = state.players.map((player, index) => {
    const archetype = archetypeName(player.archetypeId);
    return {
      number: index + 1,
      name: player.nombre === '' ? archetype : player.nombre,
      archetype,
    };
  });
  const party = players
    .map((player) => `${player.name} (${player.archetype})`)
    .join(', ');
  const announcement = `${title}. Ronda ${state.round}. Semilla ${seed}. Party: ${party}.`;

  return {
    status: state.status,
    title,
    round: state.round,
    seed,
    players,
    announcement,
  };
}
