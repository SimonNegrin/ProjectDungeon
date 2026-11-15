/**
 * Modelo puro del resumen de party y del arranque de partida (REQ-016 R-009,
 * R-010, R-011, T-001, T-002).
 *
 * El resumen no muta la configuración ni reordena jugadores. `startParty` es el
 * único punto de arranque: delega en `GameSession`, que a su vez usa el
 * constructor único del motor; aquí no se valida ni se construye estado propio.
 */

import type { PlayerVariant } from '../game/config';
import { ROSTER } from '../game/roster';
import type { PlayerPartyConfig } from './player-screen';
import { GameSession } from './session';

/** Fila de solo lectura que pinta el resumen, en el orden de turno 1..N. */
export interface PartySummaryRow {
  /** Número 1..N; coincide con el orden de turno. */
  readonly number: number;
  /** Nombre visible del arquetipo según el roster. */
  readonly archetype: string;
  readonly variant: PlayerVariant;
  /** Nombre propio o, si está vacío, el del arquetipo. */
  readonly name: string;
}

export interface PartySummary {
  readonly seed: number;
  readonly players: readonly PartySummaryRow[];
}

export type StartPartyResult =
  | { readonly ok: true; readonly session: GameSession }
  | { readonly ok: false; readonly error: string };

/** Compone el resumen sin tocar `party` ni el `PlayerConfig` que irá al motor. */
export function createPartySummary(party: PlayerPartyConfig): PartySummary {
  return {
    seed: party.seed,
    players: party.players.map((player, index) => {
      const archetype = ROSTER[player.archetypeId].name;
      const trimmed = player.name.trim();
      return {
        number: index + 1,
        archetype,
        variant: player.variant,
        name: trimmed === '' ? archetype : trimmed,
      };
    }),
  };
}

/**
 * Construye la sesión con la semilla y los N jugadores configurados. Si el
 * constructor rechaza la configuración, devuelve su mensaje sin lanzar y sin
 * crear estado parcial.
 */
export function startParty(party: PlayerPartyConfig): StartPartyResult {
  try {
    const session = new GameSession({
      seed: party.seed,
      players: party.players,
    });
    return { ok: true, session };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
