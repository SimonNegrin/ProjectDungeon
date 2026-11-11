/**
 * RNG determinista y serializable.
 *
 * Reutiliza `mulberry32` del shell compartido y añade un contador de tiradas
 * para poder comprobar el orden y el número de dados consumidos.
 */

import { mulberry32 } from '../../../_shell/rng';
import type { Rng } from './types';

export function createRng(seed: number): Rng {
  const source = mulberry32(seed >>> 0);
  let calls = 0;
  const rng: Rng = {
    next() {
      calls += 1;
      return source();
    },
    die() {
      return Math.min(6, Math.max(1, Math.floor(rng.next() * 6) + 1));
    },
    get calls() {
      return calls;
    },
  };
  return rng;
}

export function rollDie(rng: Rng): number {
  return rng.die();
}
