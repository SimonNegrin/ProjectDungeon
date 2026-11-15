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

export interface PercentRoll {
  /** Resultado entre 0 y 99. */
  readonly value: number;
  /** Estado nuevo; no muta el recibido. */
  readonly rng: RngState;
}

/**
 * Tirada de porcentaje pura (0..99) con el mismo mezclador que `rollDie`. Cada
 * tirada avanza el contador; no lee relojes ni fuentes externas.
 */
export function rollPercent(rng: RngState): PercentRoll {
  const seed = normalizeSeed(rng.seed);
  const value = mix(seed, rng.state) % 100;
  return { value, rng: { seed, state: (rng.state + 1) >>> 0 } };
}

/** Hash FNV-1a de la identidad estable; solo bytes de la cadena. */
function identityHash(identity: string): number {
  let hash = 0x811c9dc5;
  for (let index = 0; index < identity.length; index += 1) {
    hash = Math.imul(hash ^ identity.charCodeAt(index), 0x01000193) >>> 0;
  }
  return hash >>> 0;
}

/**
 * RNG de botín derivado de la semilla y de una identidad estable (REQ-034
 * T-002). No lee ni avanza el RNG principal: mapas, combate y tests seeded
 * conservan su secuencia.
 */
export function deriveLootRng(seed: number, identity: string): RngState {
  const normalized = normalizeSeed(seed);
  return { seed: normalized, state: mix(normalized, identityHash(identity)) };
}
