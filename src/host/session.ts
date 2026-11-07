import { createInitialState, reduce, type CreateInitialStateConfig } from '../game/engine';
import { DEFAULT_MAP_SEED, normalizeSeed, type MapGenerator, type MapOptions } from '../game/map';
import type { Command, GameEvent, GameState } from '../game/types';

export interface StepResult {
  readonly state: GameState;
  readonly events: readonly GameEvent[];
}

export type GameSessionInit = GameState | CreateInitialStateConfig;

function isGameState(value: GameSessionInit): value is GameState {
  return 'grid' in value && 'players' in value && 'phase' in value;
}

/**
 * Sesión local: guarda el estado actual y aplica comandos con `reduce`.
 * El teclado y `window.__game.dispatch` comparten exactamente este camino.
 *
 * La sesión conserva semilla, opciones y generador para que `R` reconstruya el
 * mismo mapa y `F2` pueda regenerarlo con una semilla nueva sin tocar el motor.
 */
export class GameSession {
  private current: GameState;
  private seedValue: number;
  private readonly options: MapOptions | undefined;
  private readonly generator: MapGenerator | undefined;

  constructor(initial: GameSessionInit = {}) {
    if (isGameState(initial)) {
      this.current = initial;
      this.seedValue = initial.map?.seed ?? DEFAULT_MAP_SEED;
      this.options = undefined;
      this.generator = undefined;
      return;
    }

    this.seedValue = initial.seed ?? DEFAULT_MAP_SEED;
    this.options = initial.options;
    this.generator = initial.generator;
    this.current = createInitialState({
      seed: this.seedValue,
      options: this.options,
      generator: this.generator,
    });
  }

  get state(): GameState {
    return this.current;
  }

  get seed(): number {
    return this.seedValue;
  }

  dispatch(command: Command): StepResult {
    if (command.type === 'Restart') {
      const state = this.buildState(this.seedValue);
      this.current = state;
      return { state, events: [{ type: 'GameRestarted' }] };
    }

    const result = reduce(this.current, command);
    this.current = result.state;
    return { state: result.state, events: result.events };
  }

  /** Reconstruye la partida con una semilla nueva manteniendo opciones y generador. */
  regenerate(seed: number): void {
    this.seedValue = normalizeSeed(seed);
    this.current = this.buildState(this.seedValue);
  }

  private buildState(seed: number): GameState {
    return createInitialState({
      seed,
      options: this.options,
      generator: this.generator,
    });
  }
}
