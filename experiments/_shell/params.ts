import type {
  ParameterDefinition,
  ParameterValue,
  ParameterValues,
  RangeParameter,
} from './types';

export function defaultParams(definitions: ParameterDefinition[]): ParameterValues {
  return Object.fromEntries(
    definitions.map((definition) => [definition.id, definition.default]),
  );
}

export function normalizeParam(
  definition: ParameterDefinition,
  value: ParameterValue | undefined,
): ParameterValue {
  if (definition.type === 'range') {
    return normalizeRange(definition, value);
  }
  if (definition.type === 'select') {
    const candidate = String(value ?? definition.default);
    return definition.options.some((option) => option.value === candidate)
      ? candidate
      : definition.default;
  }
  return typeof value === 'boolean' ? value : definition.default;
}

function normalizeRange(definition: RangeParameter, value: ParameterValue | undefined): number {
  const numeric = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(numeric)) return definition.default;
  const step = definition.step ?? 1;
  const clamped = Math.min(definition.max, Math.max(definition.min, numeric));
  const stepped = definition.min + Math.round((clamped - definition.min) / step) * step;
  return Number(Math.min(definition.max, Math.max(definition.min, stepped)).toFixed(6));
}

export function normalizeParams(
  definitions: ParameterDefinition[],
  values: ParameterValues,
): ParameterValues {
  return Object.fromEntries(
    definitions.map((definition) => [
      definition.id,
      normalizeParam(definition, values[definition.id]),
    ]),
  );
}

export function formatParamValue(
  definition: ParameterDefinition,
  value: ParameterValue,
): string {
  if (definition.type === 'range') {
    return `${value}${definition.unit ? ` ${definition.unit}` : ''}`;
  }
  if (definition.type === 'select') {
    return definition.options.find((option) => option.value === value)?.label ?? String(value);
  }
  return value ? 'Sí' : 'No';
}
