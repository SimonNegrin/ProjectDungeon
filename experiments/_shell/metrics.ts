import type { Metric } from './types';

export function renderMetrics(
  container: HTMLElement,
  metrics: Metric[],
  variantId: string,
): void {
  container.replaceChildren();
  container.dataset.testid = `metrics-${variantId}`;

  if (metrics.length === 0) {
    const empty = document.createElement('span');
    empty.className = 'metric-empty';
    empty.textContent = 'Sin métricas';
    container.append(empty);
    return;
  }

  metrics.forEach((metric, index) => {
    const card = document.createElement('div');
    card.className = 'metric';
    card.dataset.testid = `metric-${variantId}-${index}`;

    const label = document.createElement('span');
    label.className = 'metric-label';
    label.textContent = metric.label;

    const value = document.createElement('strong');
    value.className = 'metric-value';
    value.textContent = String(metric.value);

    card.append(label, value);
    if (metric.hint) {
      const hint = document.createElement('small');
      hint.className = 'metric-hint';
      hint.textContent = metric.hint;
      card.append(hint);
    }
    container.append(card);
  });
}
