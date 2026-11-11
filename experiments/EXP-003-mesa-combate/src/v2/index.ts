/**
 * API pública del motor v2.0 de EXP-003.
 *
 * Solo tipos, catálogo, acciones, duelo y medición. Sin DOM y sin importar
 * `src/` de producción: los tests de equivalencia viven fuera del runtime.
 */

export * from './types';
export * from './catalog';
export * from './rng';
export * from './resolver';
export * from './actions';
export * from './ai';
export * from './duel';
export * from './measure';
export * from './bench';
