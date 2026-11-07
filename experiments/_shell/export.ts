import type { ExperimentDefinition, ParameterValues } from './types';

export type DecisionPayload = {
  experiment: string;
  question: string;
  seed: number;
  parameters: ParameterValues;
  decision: string;
  notes: string;
  decidedAt: string;
};

export function buildDecision(
  definition: ExperimentDefinition,
  parameters: ParameterValues,
  seed: number,
  decision: string,
  notes: string,
): DecisionPayload {
  return {
    experiment: definition.id,
    question: definition.question,
    seed,
    parameters,
    decision,
    notes,
    decidedAt: new Date().toISOString(),
  };
}

export function decisionJson(payload: DecisionPayload): string {
  return `${JSON.stringify(payload, null, 2)}\n`;
}

export async function copyJson(payload: DecisionPayload): Promise<boolean> {
  const text = decisionJson(payload);
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.setAttribute('readonly', '');
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.append(textarea);
    textarea.select();
    const copied = document.execCommand('copy');
    textarea.remove();
    return copied;
  }
}

export function downloadJson(payload: DecisionPayload): void {
  const blob = new Blob([decisionJson(payload)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `${payload.experiment}-decision.json`;
  anchor.click();
  URL.revokeObjectURL(url);
}
