import { describe, expect, it } from 'vitest';
import { buildDecision } from './export';
import { defaultParams, normalizeParams } from './params';
import { mulberry32 } from './rng';
import type { ExperimentDefinition, ParameterDefinition } from './types';

const parameters: ParameterDefinition[] = [
  {
    id: 'size',
    label: 'Tamaño',
    type: 'range',
    min: 0,
    max: 10,
    step: 2,
    default: 4,
  },
  {
    id: 'mode',
    label: 'Modo',
    type: 'select',
    options: [
      { value: 'a', label: 'A' },
      { value: 'b', label: 'B' },
    ],
    default: 'a',
  },
  {
    id: 'grid',
    label: 'Rejilla',
    type: 'toggle',
    default: true,
  },
];

const definition: ExperimentDefinition = {
  id: 'EXP-TEST',
  title: 'Test',
  question: '¿Funciona?',
  parameters,
  variants: [],
  decisionOptions: [{ value: 'a', label: 'A' }],
};

describe('experiment shell core', () => {
  it('builds default parameters', () => {
    expect(defaultParams(parameters)).toEqual({ size: 4, mode: 'a', grid: true });
  });

  it('normalizes ranges, selects and toggles', () => {
    expect(normalizeParams(parameters, { size: 99, mode: 'nope', grid: 'yes' })).toEqual({
      size: 10,
      mode: 'a',
      grid: true,
    });
    expect(normalizeParams(parameters, { size: -3, mode: 'b', grid: false })).toEqual({
      size: 0,
      mode: 'b',
      grid: false,
    });
    expect(normalizeParams(parameters, { size: 5, mode: 'b', grid: true }).size).toBe(6);
  });

  it('produces deterministic random sequences', () => {
    const first = mulberry32(123);
    const second = mulberry32(123);
    const values = Array.from({ length: 8 }, () => first());
    expect(values).toEqual(Array.from({ length: 8 }, () => second()));
    expect(values.every((value) => value >= 0 && value < 1)).toBe(true);
  });

  it('builds an exportable decision payload', () => {
    const decision = buildDecision(
      definition,
      { size: 6, mode: 'b', grid: false },
      123,
      'a',
      'nota',
    );
    expect(decision.experiment).toBe('EXP-TEST');
    expect(decision.seed).toBe(123);
    expect(decision.decision).toBe('a');
    expect(decision.notes).toBe('nota');
    expect(decision.decidedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });
});
