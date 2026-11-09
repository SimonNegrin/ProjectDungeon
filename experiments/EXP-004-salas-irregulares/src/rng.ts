/**
 * PRNG entero determinista para EXP-004. No usa `Math.random`, relojes ni
 * estado global: dos llamadas con la misma semilla producen la misma secuencia.
 */

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

export function hashSeed(seed: number, salt: number): number {
  let hash = (seed >>> 0) ^ (salt >>> 0) ^ 0x9e3779b9;
  hash = Math.imul(hash ^ (hash >>> 16), 0x21f0aaad);
  hash = Math.imul(hash ^ (hash >>> 15), 0x735a2d97);
  return (hash ^ (hash >>> 15)) >>> 0;
}

/** Mulberry32; secuencia estable de 32 bits. */
export function createRng(seed: number): Rng {
  let state = seed >>> 0;

  function next(): number {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  }

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
