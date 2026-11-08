import { normalizeSeed } from './map';
import type { RngState } from './types';

/** Estado inicial del RNG de combate derivado de la semilla de la partida. */
export function createRng(seed: number): RngState {
  return { seed: normalizeSeed(seed), state: 0 };
}

function mix(seed: number, state: number): number {
  let value = (state + seed + 0x9e3779b9) >>> 0;
  value = Math.imul(value ^ (value >>> 16), 0x21f0aaad) >>> 0;
  value = Math.imul(value ^ (value >>> 15), 0x735a2d97) >>> 0;
  return (value ^ (value >>> 15)) >>> 0;
}

export interface DieRoll {
  /** Resultado entre 1 y 6. */
  readonly die: number;
  /** Estado nuevo; no muta el recibido. */
  readonly rng: RngState;
}

/**
 * Tirada de un d6 pura y serializable: el resultado depende solo de `seed` y
 * `state`, y cada tirada avanza el contador. No lee relojes ni fuentes externas.
 */
export function rollDie(rng: RngState): DieRoll {
  const seed = normalizeSeed(rng.seed);
  const die = (mix(seed, rng.state) % 6) + 1;
  return { die, rng: { seed, state: (rng.state + 1) >>> 0 } };
}
