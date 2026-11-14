/**
 * Configuración serializable de una partida (REQ-016 T-001/T-002).
 *
 * Es la entrada común del motor: semilla y de 1 a 6 jugadores en orden de
 * turno. El host no construye unidades; solo entrega esta configuración al
 * constructor único de `engine.ts`.
 */

import { ROSTER, type ArchetypeId } from './roster';

/** Variante visual seleccionable del arquetipo; no cambia cálculos. */
export type PlayerVariant = 1 | 2;

export interface PlayerConfig {
  readonly archetypeId: ArchetypeId;
  readonly variant: PlayerVariant;
  /** Nombre del shell; vacío se resuelve con el nombre del arquetipo. */
  readonly name: string;
}

export interface GameConfig {
  readonly seed: number;
  /** Orden de turno 1..N; la lista nunca está vacía ni supera seis. */
  readonly players: readonly PlayerConfig[];
}

export type GameConfigErrorCode =
  | 'player-count'
  | 'unknown-archetype'
  | 'invalid-variant'
  | 'invalid-seed';

/** Error tipado de configuración; se lanza antes de generar el mapa. */
export class GameConfigError extends Error {
  readonly code: GameConfigErrorCode;

  constructor(code: GameConfigErrorCode, message: string) {
    super(message);
    this.name = 'GameConfigError';
    this.code = code;
  }
}

export const MIN_PLAYERS = 1;
export const MAX_PLAYERS = 6;

/** Configuración por defecto: un Guerrero sin nombre propio. */
export const DEFAULT_PLAYER_CONFIGS: readonly PlayerConfig[] = [
  { archetypeId: 'warrior', variant: 1, name: '' },
];

function isArchetypeId(value: string): value is ArchetypeId {
  return Object.prototype.hasOwnProperty.call(ROSTER, value);
}

/**
 * Valida la configuración completa sin tocar el mapa ni devolver un estado
 * parcial. El orden de validación es estable: N, arquetipo, variante y semilla.
 */
export function validateGameConfig(config: GameConfig): GameConfig {
  const count = config.players.length;
  if (count < MIN_PLAYERS || count > MAX_PLAYERS) {
    throw new GameConfigError(
      'player-count',
      `La partida debe tener entre ${MIN_PLAYERS} y ${MAX_PLAYERS} jugadores; llegaron ${count}.`,
    );
  }

  for (const player of config.players) {
    if (!isArchetypeId(player.archetypeId)) {
      throw new GameConfigError(
        'unknown-archetype',
        `El arquetipo "${String(player.archetypeId)}" no existe en el roster.`,
      );
    }
  }

  for (const player of config.players) {
    if (player.variant !== 1 && player.variant !== 2) {
      throw new GameConfigError(
        'invalid-variant',
        `La variante ${String(player.variant)} no es válida; solo se admite 1 o 2.`,
      );
    }
  }

  if (!Number.isInteger(config.seed) || !Number.isFinite(config.seed)) {
    throw new GameConfigError(
      'invalid-seed',
      `La semilla debe ser un entero finito; llegó ${String(config.seed)}.`,
    );
  }

  return config;
}
