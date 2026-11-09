/**
 * PRNG determinista del núcleo de chambers.
 *
 * Reutiliza `mulberry32` y `normalizeSeed` del modelo de mapa y añade un hash
 * local para derivar secuencias independientes. No usa `Math.random`, relojes
 * ni estado global mutable.
 */

import { clamp, mulberry32, normalizeSeed } from '../../map';

export { clamp, mulberry32, normalizeSeed };

export interface Rng {
  /** Siguiente flotante en [0, 1). */
  next(): number;
  /** Entero sin signo en [0, max). */
  int(max: number): number;
  /** Elemento determinista de una lista no vacía. */
  pick<T>(items: readonly T[]): T;
  /** `true` con probabilidad `chance` (0-1). */
  chance(chance: number): boolean;
  /** Copia barajada con Fisher-Yates determinista. */
  shuffle<T>(items: readonly T[]): T[];
}

/** Hash estable de 32 bits para derivar una semilla de otra. */
export function hashSeed(seed: number, salt: number): number {
  let hash = (normalizeSeed(seed) ^ (salt >>> 0) ^ 0x9e3779b9) >>> 0;
  hash = Math.imul(hash ^ (hash >>> 16), 0x21f0aaad);
  hash = Math.imul(hash ^ (hash >>> 15), 0x735a2d97);
  return (hash ^ (hash >>> 15)) >>> 0;
}

/** Crea un PRNG local con la misma secuencia que `mulberry32`. */
export function createRng(seed: number): Rng {
  const next = mulberry32(seed);

  function int(max: number): number {
    if (max <= 0) return 0;
    return Math.floor(next() * max);
  }

  function pick<T>(items: readonly T[]): T {
    if (items.length === 0) throw new Error('No se puede elegir de una lista vacía');
    return items[int(items.length)];
  }

  function chance(probability: number): boolean {
    return next() < probability;
  }

  function shuffle<T>(items: readonly T[]): T[] {
    const copy = [...items];
    for (let index = copy.length - 1; index > 0; index -= 1) {
      const swap = int(index + 1);
      const value = copy[index];
      copy[index] = copy[swap];
      copy[swap] = value;
    }
    return copy;
  }

  return { next, int, pick, chance, shuffle };
}

/** Sal de la variante growth; mantiene secuencias separadas de otras variantes. */
export const GROWTH_SALT = 0x4a3f2d11;
