import { formatParamValue, normalizeParams } from './params';
import type { ParameterDefinition, ParameterValues } from './types';

export type Controls = {
  getValues: () => ParameterValues;
  setValues: (next: ParameterValues) => void;
};

export function createControls(
  container: HTMLElement,
  definitions: ParameterDefinition[],
  initial: ParameterValues,
  onChange: (values: ParameterValues) => void,
): Controls {
  let values = normalizeParams(definitions, initial);
  const inputs = new Map<string, HTMLInputElement | HTMLSelectElement>();
  const outputs = new Map<string, HTMLOutputElement>();

  container.replaceChildren();

  for (const definition of definitions) {
    const label = document.createElement('label');
    label.className = 'control';
    label.htmlFor = `param-${definition.id}`;

    const heading = document.createElement('span');
    heading.className = 'control-heading';

    const name = document.createElement('span');
    name.textContent = definition.label;
    heading.append(name);

    const output = document.createElement('output');
    output.className = 'control-value';
    output.dataset.testid = `value-${definition.id}`;
    heading.append(output);
    outputs.set(definition.id, output);

    label.append(heading);

    if (definition.type === 'range') {
      const input = document.createElement('input');
      input.type = 'range';
      input.id = `param-${definition.id}`;
      input.dataset.testid = `param-${definition.id}`;
      input.min = String(definition.min);
      input.max = String(definition.max);
      input.step = String(definition.step ?? 1);
      input.value = String(values[definition.id]);
      input.addEventListener('input', () => {
        values = normalizeParams(definitions, { ...values, [definition.id]: Number(input.value) });
        output.textContent = formatParamValue(definition, values[definition.id]);
        onChange({ ...values });
      });
      inputs.set(definition.id, input);
      label.append(input);
    } else if (definition.type === 'select') {
      const select = document.createElement('select');
      select.id = `param-${definition.id}`;
      select.dataset.testid = `param-${definition.id}`;
      for (const option of definition.options) {
        const item = document.createElement('option');
        item.value = option.value;
        item.textContent = option.label;
        select.append(item);
      }
      select.value = String(values[definition.id]);
      select.addEventListener('change', () => {
        values = normalizeParams(definitions, { ...values, [definition.id]: select.value });
        output.textContent = formatParamValue(definition, values[definition.id]);
        onChange({ ...values });
      });
      inputs.set(definition.id, select);
      label.append(select);
    } else {
      const input = document.createElement('input');
      input.type = 'checkbox';
      input.id = `param-${definition.id}`;
      input.dataset.testid = `param-${definition.id}`;
      input.checked = Boolean(values[definition.id]);
      input.addEventListener('change', () => {
        values = normalizeParams(definitions, { ...values, [definition.id]: input.checked });
        output.textContent = formatParamValue(definition, values[definition.id]);
        onChange({ ...values });
      });
      inputs.set(definition.id, input);
      label.append(input);
    }

    output.textContent = formatParamValue(definition, values[definition.id]);
    container.append(label);
  }

  function sync(): void {
    for (const definition of definitions) {
      const input = inputs.get(definition.id);
      const output = outputs.get(definition.id);
      if (!input || !output) continue;
      if (input instanceof HTMLInputElement && input.type === 'checkbox') {
        input.checked = Boolean(values[definition.id]);
      } else {
        input.value = String(values[definition.id]);
      }
      output.textContent = formatParamValue(definition, values[definition.id]);
    }
  }

  return {
    getValues: () => ({ ...values }),
    setValues: (next) => {
      values = normalizeParams(definitions, next);
      sync();
      onChange({ ...values });
    },
  };
}
