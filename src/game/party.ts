import type { GameState, Unit } from './types';

/**
 * Helpers de lectura de la party (REQ-031 T-001). `state.players` es la única
 * lista; el jugador activo es una referencia por id. Son funciones puras: no
 * mutan el estado ni avanzan turno.
 */

/** Ids de la party en orden de turno 1..N. */
export function partyOrder(state: GameState): readonly string[] {
  return state.players.map((unit) => unit.id);
}

/** Unidad activa, o `undefined` si no hay jugadores ni activo válido. */
export function activePlayer(state: GameState): Unit | undefined {
  if (state.activePlayerId === null) return undefined;
  return state.players.find((unit) => unit.id === state.activePlayerId);
}

/** Índice 0-based del activo en `players`; `-1` sin activo o si no existe. */
export function activePlayerIndex(state: GameState): number {
  if (state.activePlayerId === null) return -1;
  return state.players.findIndex((unit) => unit.id === state.activePlayerId);
}
