import { DEFAULT_MAP_SEED, normalizeSeed } from '../game/map';

export interface ParsedSeed {
  readonly seed: number;
  readonly warning?: string;
}

/**
 * Resultado de parsear un texto de semilla escrito por el usuario. El caso
 * inválido conserva el aviso para que el host lo muestre; el válido solo
 * expone la semilla normalizada.
 */
export type ParsedSeedText =
  | { readonly valid: true; readonly seed: number }
  | { readonly valid: false; readonly seed: number; readonly warning: string };

const SEED_PATTERN = /^[+-]?\d+$/;
const UINT32_RANGE = 0x1_0000_0000;

interface SeedQuery {
  readonly present: boolean;
  readonly value: string;
}

/**
 * Lee `?seed=` del query string sin depender del DOM. Se parsea a mano para
 * que un signo `+` literal no se confunda con un espacio (que sí es inválido).
 */
function readSeedQuery(search: string): SeedQuery {
  const query = search.startsWith('?') ? search.slice(1) : search;
  for (const part of query.split('&')) {
    if (part.length === 0) continue;
    const separator = part.indexOf('=');
    const key = separator >= 0 ? part.slice(0, separator) : part;
    if (key !== 'seed') continue;
    const raw = separator >= 0 ? part.slice(separator + 1) : '';
    try {
      return { present: true, value: decodeURIComponent(raw) };
    } catch {
      return { present: true, value: raw };
    }
  }
  return { present: false, value: '' };
}

/**
 * Devuelve el valor crudo de `?seed` o `null` si el parámetro no está. Frente a
 * un booleano de presencia, permite construir un aviso que nombre el valor
 * ignorado sin reutilizar el texto del parser.
 */
export function readSeedParam(search: string): string | null {
  const query = readSeedQuery(search);
  return query.present ? query.value : null;
}

/**
 * Parsea un texto de semilla con el criterio del host: entero decimal con signo
 * opcional, finito y normalizado a 32 bits sin signo. Es la pieza compartida
 * entre `?seed=` y el campo editable del paso 1.
 */
export function parseSeedText(raw: string): ParsedSeedText {
  if (!SEED_PATTERN.test(raw)) {
    return {
      valid: false,
      seed: DEFAULT_MAP_SEED,
      warning: `Semilla inválida "${raw}"; se usa la semilla por defecto ${DEFAULT_MAP_SEED}.`,
    };
  }

  const value = Number(raw);
  if (!Number.isFinite(value)) {
    return {
      valid: false,
      seed: DEFAULT_MAP_SEED,
      warning: `Semilla fuera de rango "${raw}"; se usa la semilla por defecto ${DEFAULT_MAP_SEED}.`,
    };
  }

  return { valid: true, seed: normalizeSeed(value) };
}

/**
 * Semilla de la partida a partir de `window.location.search`.
 *
 * - Sin `?seed` usa la semilla por defecto documentada.
 * - Un entero con signo opcional se normaliza a 32 bits sin signo.
 * - Cualquier otro valor (vacío, decimal, exponencial, espacios, texto) usa la
 *   semilla por defecto y devuelve un aviso no vacío.
 */
export function parseSeedParam(search: string): ParsedSeed {
  const query = readSeedQuery(search);
  if (!query.present) return { seed: DEFAULT_MAP_SEED };

  const parsed = parseSeedText(query.value);
  return parsed.valid
    ? { seed: parsed.seed }
    : { seed: parsed.seed, warning: parsed.warning };
}

function defaultRandom(): number {
  const cryptoObject = typeof globalThis === 'undefined' ? undefined : globalThis.crypto;
  if (cryptoObject && typeof cryptoObject.getRandomValues === 'function') {
    const buffer = new Uint32Array(1);
    cryptoObject.getRandomValues(buffer);
    return buffer[0] / UINT32_RANGE;
  }
  const now = Date.now();
  return (now % UINT32_RANGE) / UINT32_RANGE;
}

/**
 * Elige una semilla nueva para `F2` en el host. Siempre devuelve un entero sin
 * signo de 32 bits distinto de `previous`. Acepta un `random` inyectable para
 * tests; por defecto usa `crypto.getRandomValues` y, si no existe, `Date.now()`.
 */
export function nextSeed(previous: number, random: () => number = defaultRandom): number {
  const normalizedPrevious = normalizeSeed(previous);
  const sample = random();
  const raw = Number.isFinite(sample) ? Math.floor(sample * UINT32_RANGE) : 0;
  let candidate = normalizeSeed(raw);
  if (candidate === normalizedPrevious) candidate = (candidate + 1) >>> 0;
  return candidate;
}
