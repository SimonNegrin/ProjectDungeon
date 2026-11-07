import './styles.css';
import { createControls, type Controls } from './controls';
import { buildDecision, copyJson, downloadJson } from './export';
import { renderMetrics } from './metrics';
import { defaultParams, normalizeParams } from './params';
import { mulberry32, seedForVariant } from './rng';
import type {
  ExperimentDefinition,
  ExperimentTestApi,
  ParameterValues,
  RenderContext,
  Variant,
  VariantContext,
} from './types';

type Stage = {
  variant: Variant;
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  metricsHost: HTMLElement;
  context: VariantContext;
  state: unknown;
};

type ElementOptions = {
  className?: string;
  text?: string;
  testId?: string;
};

function element<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  options: ElementOptions = {},
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (options.className) node.className = options.className;
  if (options.text !== undefined) node.textContent = options.text;
  if (options.testId) node.dataset.testid = options.testId;
  return node;
}

function randomSeed(): number {
  if (typeof crypto !== 'undefined' && 'getRandomValues' in crypto) {
    return crypto.getRandomValues(new Uint32Array(1))[0];
  }
  return Date.now() >>> 0;
}

export function mountExperiment(
  definition: ExperimentDefinition,
  root: HTMLElement,
): ExperimentTestApi {
  const query = new URLSearchParams(window.location.search);
  const testMode = query.has('test');
  const initialSeed = Number(query.get('seed') ?? (testMode ? 123 : randomSeed()));
  let seed = Number.isFinite(initialSeed) ? initialSeed >>> 0 : 123;
  const defaultSeed = seed;
  let values: ParameterValues = defaultParams(definition.parameters);
  let decision = '';
  let notes = '';
  let controls: Controls;
  let seedInput: HTMLInputElement;
  let status: HTMLElement;
  let decisionSelect: HTMLSelectElement;
  let decisionNotes: HTMLTextAreaElement;

  const stageSize = definition.stageSize ?? { width: 560, height: 360 };
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const stages: Stage[] = [];
  let raf = 0;
  let running = false;
  let lastFrame = 0;
  let lastMetrics = 0;

  root.classList.add('experiment-shell');
  root.replaceChildren();
  document.title = `${definition.title} · ProyectDungeon`;

  const header = element('header', { className: 'experiment-header' });
  header.append(
    element('span', { className: 'eyebrow', text: definition.id }),
    element('h1', { text: definition.title, testId: 'experiment-title' }),
    element('p', { className: 'question', text: definition.question }),
  );
  if (definition.description) {
    header.append(element('p', { className: 'description', text: definition.description }));
  }
  if (testMode) {
    header.append(element('span', { className: 'test-badge', text: 'modo test determinista' }));
  }

  const toolbar = element('div', { className: 'toolbar' });
  const seedLabel = element('label', { className: 'seed-label' });
  seedLabel.append(element('span', { text: 'Semilla' }));
  seedInput = element('input', { testId: 'seed-input' });
  seedInput.type = 'number';
  seedInput.min = '0';
  seedInput.max = '4294967295';
  seedInput.step = '1';
  seedInput.value = String(seed);
  seedLabel.append(seedInput);

  const regenerate = element('button', { className: 'button', text: 'Nueva semilla', testId: 'seed-regenerate' });
  regenerate.type = 'button';
  const resetButton = element('button', { className: 'button ghost', text: 'Reiniciar', testId: 'reset' });
  resetButton.type = 'button';
  toolbar.append(seedLabel, regenerate, resetButton);

  const layout = element('div', { className: 'experiment-layout' });
  const controlsPanel = element('aside', { className: 'panel controls-panel' });
  controlsPanel.append(
    element('h2', { text: 'Parámetros' }),
    element('p', { className: 'panel-hint', text: 'Ajusta, compara y decide. La semilla mantiene la comparación reproducible.' }),
  );
  const controlsHost = element('div', { className: 'controls' });
  controlsPanel.append(controlsHost);

  const stagesHost = element('section', { className: 'stages', testId: 'stages' });
  layout.append(controlsPanel, stagesHost);

  const decisionPanel = element('section', { className: 'panel decision-panel' });
  decisionPanel.append(
    element('h2', { text: 'Decisión' }),
    element('p', { className: 'panel-hint', text: 'Elige una opción, añade notas y exporta el JSON. El requisito se actualizará con esta decisión.' }),
  );

  decisionSelect = element('select', { testId: 'decision-select' });
  decisionSelect.append(new Option('Selecciona una opción…', ''));
  for (const option of definition.decisionOptions) {
    decisionSelect.append(new Option(option.label, option.value));
  }
  decisionSelect.addEventListener('change', () => {
    decision = decisionSelect.value;
  });

  decisionNotes = element('textarea', { testId: 'decision-notes' });
  decisionNotes.rows = 3;
  decisionNotes.placeholder = '¿Por qué has elegido esta opción? ¿Qué debería cambiar?';

  const decisionActions = element('div', { className: 'decision-actions' });
  const copyButton = element('button', { className: 'button', text: 'Copiar decisión', testId: 'decision-copy' });
  copyButton.type = 'button';
  const downloadButton = element('button', { className: 'button ghost', text: 'Descargar JSON', testId: 'decision-download' });
  downloadButton.type = 'button';
  decisionActions.append(copyButton, downloadButton);

  status = element('p', { className: 'status', testId: 'decision-status' });
  status.setAttribute('aria-live', 'polite');

  decisionPanel.append(decisionSelect, decisionNotes, decisionActions, status);

  root.append(header, toolbar, layout, decisionPanel);

  function getDecision() {
    return buildDecision(definition, values, seed, decision, notes);
  }

  function renderStage(stage: Stage): void {
    const { ctx, canvas } = stage;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, stageSize.width, stageSize.height);
    const renderContext: RenderContext = {
      ctx,
      width: stageSize.width,
      height: stageSize.height,
      params: values,
      seed,
      dpr,
    };
    stage.variant.render(stage.state, renderContext);
    canvas.dataset.rendered = 'true';
  }

  function updateMetrics(): void {
    for (const stage of stages) {
      const metrics = stage.variant.metrics?.(stage.state, stage.context) ?? [];
      renderMetrics(stage.metricsHost, metrics, stage.variant.id);
    }
    lastMetrics = performance.now();
  }

  function createStage(variant: Variant): Stage {
    const article = element('article', {
      className: 'stage',
      testId: `stage-${variant.id}`,
    });
    const stageHeader = element('header', { className: 'stage-header' });
    stageHeader.append(element('h2', { text: variant.label }));
    if (variant.description) {
      stageHeader.append(element('p', { text: variant.description }));
    }

    const canvas = element('canvas', { testId: `canvas-${variant.id}` });
    canvas.width = stageSize.width * dpr;
    canvas.height = stageSize.height * dpr;
    canvas.style.aspectRatio = `${stageSize.width} / ${stageSize.height}`;
    canvas.setAttribute('role', 'img');
    canvas.setAttribute('aria-label', `${variant.label} del experimento ${definition.id}`);

    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D no disponible');

    const metricsHost = element('div', { className: 'metrics' });
    metricsHost.dataset.testid = `metrics-${variant.id}`;
    article.append(stageHeader, canvas, metricsHost);
    stagesHost.append(article);

    return {
      variant,
      canvas,
      ctx,
      metricsHost,
      context: {
        params: values,
        seed,
        width: stageSize.width,
        height: stageSize.height,
        rng: mulberry32(seedForVariant(seed, variant.id)),
      },
      state: undefined,
    };
  }

  function rebuild(): void {
    for (const stage of stages) {
      stage.context = {
        params: values,
        seed,
        width: stageSize.width,
        height: stageSize.height,
        rng: mulberry32(seedForVariant(seed, stage.variant.id)),
      };
      stage.state = stage.variant.create(stage.context);
      renderStage(stage);
    }
    updateMetrics();
  }

  function tick(dt: number): void {
    for (const stage of stages) {
      stage.variant.update?.(stage.state, { ...stage.context, dt });
      renderStage(stage);
    }
    const now = performance.now();
    if (now - lastMetrics > 250) updateMetrics();
  }

  function frame(now: number): void {
    if (!running) return;
    const dt = lastFrame === 0 ? 16 : Math.min(50, now - lastFrame);
    lastFrame = now;
    tick(dt);
    raf = requestAnimationFrame(frame);
  }

  function start(): void {
    if (testMode || running) {
      renderStages();
      return;
    }
    running = true;
    lastFrame = 0;
    raf = requestAnimationFrame(frame);
  }

  function stop(): void {
    running = false;
    cancelAnimationFrame(raf);
  }

  function renderStages(): void {
    for (const stage of stages) renderStage(stage);
    updateMetrics();
  }

  function applyValues(next: ParameterValues): void {
    values = normalizeParams(definition.parameters, next);
    rebuild();
    status.textContent = 'Parámetros actualizados.';
  }

  function setSeed(next: number): void {
    seed = Number.isFinite(next) ? next >>> 0 : defaultSeed;
    seedInput.value = String(seed);
    rebuild();
    status.textContent = `Semilla ${seed}.`;
  }

  function reset(): void {
    values = defaultParams(definition.parameters);
    seed = defaultSeed;
    seedInput.value = String(seed);
    controls.setValues(values);
    status.textContent = 'Experimento reiniciado.';
  }

  for (const variant of definition.variants) {
    stages.push(createStage(variant));
  }

  controls = createControls(controlsHost, definition.parameters, values, applyValues);

  seedInput.addEventListener('change', () => setSeed(Number(seedInput.value)));
  regenerate.addEventListener('click', () => setSeed(randomSeed()));
  resetButton.addEventListener('click', reset);
  decisionNotes.addEventListener('input', () => {
    notes = decisionNotes.value;
  });
  copyButton.addEventListener('click', async () => {
    const copied = await copyJson(getDecision());
    status.textContent = copied ? 'Decisión copiada al portapapeles.' : 'No se pudo copiar la decisión.';
  });
  downloadButton.addEventListener('click', () => {
    downloadJson(getDecision());
    status.textContent = 'Decisión descargada.';
  });

  const api: ExperimentTestApi = {
    id: definition.id,
    getParams: () => ({ ...values }),
    setParams: (next) => {
      const merged: ParameterValues = { ...values };
      for (const [key, value] of Object.entries(next)) {
        if (value !== undefined) merged[key] = value;
      }
      values = normalizeParams(definition.parameters, merged);
      controls.setValues(values);
    },
    getSeed: () => seed,
    setSeed,
    reset,
    step: (dt = 16) => {
      tick(dt);
      updateMetrics();
    },
    snapshot: () => ({
      params: { ...values },
      seed,
      variants: stages.map((stage) => ({
        id: stage.variant.id,
        metrics: stage.variant.metrics?.(stage.state, stage.context) ?? [],
      })),
    }),
    getDecision: () => ({ ...getDecision() }),
  };

  window.__experiment = api;
  rebuild();
  start();

  window.addEventListener('pagehide', stop, { once: true });

  return api;
}
