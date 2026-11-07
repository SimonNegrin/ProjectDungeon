import { createInitialState, reduce } from '../game/engine';
import type { Command, GameEvent, GameState } from '../game/types';

export interface StepResult {
  readonly state: GameState;
  readonly events: readonly GameEvent[];
}

/**
 * Sesión local: guarda el estado actual y aplica comandos con `reduce`.
 * El teclado y `window.__game.dispatch` comparten exactamente este camino.
 */
export class GameSession {
  private current: GameState;

  constructor(initialState: GameState = createInitialState()) {
    this.current = initialState;
  }

  get state(): GameState {
    return this.current;
  }

  dispatch(command: Command): StepResult {
    const result = reduce(this.current, command);
    this.current = result.state;
    return { state: result.state, events: result.events };
  }
}
