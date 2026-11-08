import '../../_shell/styles.css';
import './experiment.css';
import { copyJson, downloadJson, type DecisionPayload } from '../../_shell/export';
import type { ExperimentTestApi } from '../../_shell/types';
import { loadAssets } from '../../../src/host/assets';
import {
  DEFAULT_PARAMS,
  DIAGONAL_OPTIONS,
  EXPERIMENT_QUESTION,
  EXPERIMENT_TITLE,
  INITIAL_MP,
  PAUSE_MS_LIMITS,
  PRESETS,
  SCENARIOS,
  STEP_MS_LIMITS,
  advanceMotion,
  buildDecisionPayload,
  cameraForState,
  completedStepCount,
  createMotionState,
  mpLeft,
  normalizeParams,
  pathTiles,
  playMotion,
  resetMotion,
  visualPosition,
  type DiagonalMode,
  type MotionExperimentApi,
  type MotionParams,
  type PresetValue,
  type ScenarioId,
} from './motion';
import {
  EMPTY_ASSETS,
  renderMotion,
  type MotionAssets,
} from './render';

type ControlSource = 'control' | 'api' | 'init';

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

const root = document.querySelector<HTMLElement>('#app');
if (!root) throw new Error('No se encontró #app');

const query = new URLSearchParams(window.location.search);
const testMode = query.has('test');
const rawSeed = query.get('seed');
const querySeed = rawSeed === null ? Number.NaN : Number(rawSeed);
let seed = Number.isFinite(querySeed)
  ? querySeed >>> 0
  : testMode
    ? 279837264
    : randomSeed();

document.title = `${EXPERIMENT_TITLE} · ProyectDungeon`;

const dpr = Math.min(window.devicePixelRatio || 1, 2);
const canvasWidth = 416;
const canvasHeight = 416;

let assets: MotionAssets = EMPTY_ASSETS;
let params: MotionParams = DEFAULT_PARAMS;
let state = createMotionState(params);
let decision = '';
let notes = '';
let raf = 0;
let lastFrame = 0;

root.classList.add('experiment-shell');
root.replaceChildren();

const header = element('header', { className: 'experiment-header' });
header.append(
  element('span', { className: 'eyebrow', text: 'EXP-002' }),
  element('h1', { text: EXPERIMENT_TITLE, testId: 'experiment-title' }),
  element('p', { className: 'question', text: EXPERIMENT_QUESTION }),
  element('p', {
    className: 'description',
    text: 'Compara duración de paso, pausa por tile y tratamiento de la diagonal. La cámara, el cursor oculto y el MP progresivo son constantes de la maqueta.',
  }),
);
if (testMode) {
  header.append(
    element('span', { className: 'test-badge', text: 'modo test determinista' }),
  );
}

const toolbar = element('div', { className: 'toolbar' });
const seedLabel = element('label', { className: 'seed-label' });
seedLabel.append(element('span', { text: 'Semilla' }));
const seedInput = element('input', { testId: 'seed-input' });
seedInput.type = 'number';
seedInput.min = '0';
seedInput.max = '4294967295';
seedInput.step = '1';
seedInput.value = String(seed);
seedLabel.append(seedInput);

const regenerateButton = element('button', {
  className: 'button ghost',
  text: 'Nueva semilla',
  testId: 'seed-regenerate',
});
regenerateButton.type = 'button';

const playButton = element('button', {
  className: 'button',
  text: 'Recorrer',
  testId: 'play',
});
playButton.type = 'button';

const resetButton = element('button', {
  className: 'button ghost',
  text: 'Reiniciar',
  testId: 'reset',
});
resetButton.type = 'button';

toolbar.append(seedLabel, regenerateButton, playButton, resetButton);

const layout = element('div', { className: 'experiment-layout' });
const controlsPanel = element('aside', { className: 'panel controls-panel' });
controlsPanel.append(
  element('h2', { text: 'Parámetros' }),
  element('p', {
    className: 'panel-hint',
    text: 'Los presets comparan el mismo recorrido con el mismo seed. Mover un slider pasa el preset a personalizado.',
  }),
);

const controlsHost = element('div', { className: 'controls' });
controlsPanel.append(controlsHost);

const stagesHost = element('section', { className: 'stages' });
const stage = element('article', { className: 'stage', testId: 'stage-motion' });
const stageHeader = element('header', { className: 'stage-header' });
stageHeader.append(
  element('h2', { text: 'Recorrido animado' }),
  element('p', {
    text: 'Viewport de 13×13 tiles de 32 px sobre un mundo de 20×20 con tiles reales.',
  }),
);
const canvas = element('canvas', { testId: 'canvas-motion' });
canvas.width = canvasWidth * dpr;
canvas.height = canvasHeight * dpr;
canvas.style.aspectRatio = `${canvasWidth} / ${canvasHeight}`;
canvas.setAttribute('role', 'img');
canvas.setAttribute('aria-label', 'Recorrido animado del jugador por la rejilla');
function require2d(element: HTMLCanvasElement): CanvasRenderingContext2D {
  const ctx = element.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D no disponible');
  return ctx;
}
const context2d = require2d(canvas);

const hud = element('div', { className: 'metrics', testId: 'hud' });
hud.setAttribute('aria-live', 'polite');

type MetricCard = { card: HTMLElement; value: HTMLElement };
function metricCard(label: string, testId: string): MetricCard {
  const card = element('div', { className: 'metric' });
  card.append(element('span', { className: 'metric-label', text: label }));
  const value = element('strong', {
    className: 'metric-value',
    text: '—',
    testId,
  });
  card.append(value);
  return { card, value };
}

const hudState = metricCard('Estado', 'hud-state');
const hudStep = metricCard('Paso', 'hud-step');
const hudMp = metricCard('MP', 'hud-mp');
const hudTotal = metricCard('Duración total', 'hud-total');
const hudCamera = metricCard('Cámara', 'hud-camera');
hud.append(hudState.card, hudStep.card, hudMp.card, hudTotal.card, hudCamera.card);

const readyNotice = element('p', {
  className: 'ready-notice',
  text: 'Listo',
  testId: 'hud-ready',
});
readyNotice.hidden = true;
readyNotice.setAttribute('role', 'status');

stage.append(stageHeader, canvas, hud, readyNotice);
stagesHost.append(stage);
layout.append(controlsPanel, stagesHost);

const decisionPanel = element('section', { className: 'panel decision-panel' });
decisionPanel.append(
  element('h2', { text: 'Decisión' }),
  element('p', {
    className: 'panel-hint',
    text: 'Elige A, B, C o personalizado, añade notas y exporta el JSON. La decisión del ritmo es tuya.',
  }),
);

const decisionSelect = element('select', { testId: 'decision-select' });
decisionSelect.append(new Option('Selecciona una opción…', ''));
for (const [presetId, preset] of Object.entries(PRESETS)) {
  decisionSelect.append(
    new Option(`${preset.label} (${preset.stepMs}/${preset.pauseMs} ms)`, presetId),
  );
}
decisionSelect.append(new Option('Personalizado (valores actuales)', 'personalizado'));

const decisionNotes = element('textarea', { testId: 'decision-notes' });
decisionNotes.rows = 3;
decisionNotes.placeholder = '¿Cómo se siente el recorrido? ¿Qué cambiarías?';

const decisionActions = element('div', { className: 'decision-actions' });
const copyButton = element('button', {
  className: 'button ghost',
  text: 'Copiar decisión',
  testId: 'decision-copy',
});
copyButton.type = 'button';
const downloadButton = element('button', {
  className: 'button',
  text: 'Descargar JSON',
  testId: 'decision-download',
});
downloadButton.type = 'button';
decisionActions.append(copyButton, downloadButton);

const decisionStatus = element('p', {
  className: 'status',
  testId: 'decision-status',
});
decisionStatus.setAttribute('aria-live', 'polite');

decisionPanel.append(decisionSelect, decisionNotes, decisionActions, decisionStatus);

root.append(header, toolbar, layout, decisionPanel);

function createRange(id: string, limits: { min: number; max: number }): HTMLInputElement {
  const input = element('input', { testId: `param-${id}` });
  input.type = 'range';
  input.min = String(limits.min);
  input.max = String(limits.max);
  input.step = '1';
  return input;
}

function createSelect(
  id: string,
  options: ReadonlyArray<{ value: string; label: string }>,
): HTMLSelectElement {
  const select = element('select', { testId: `param-${id}` });
  for (const option of options) {
    select.append(new Option(option.label, option.value));
  }
  return select;
}

function control(
  labelText: string,
  input: HTMLElement,
  output?: HTMLOutputElement,
): HTMLLabelElement {
  const label = element('label', { className: 'control' });
  const heading = element('span', { className: 'control-heading' });
  heading.append(element('span', { text: labelText }));
  if (output) {
    output.className = 'control-value';
    heading.append(output);
  }
  label.append(heading, input);
  return label;
}

const presetSelect = createSelect('preset', [
  ...Object.entries(PRESETS).map(([value, preset]) => ({
    value,
    label: preset.label,
  })),
  { value: 'personalizado', label: 'Personalizado' },
]);
const scenarioSelect = createSelect('scenario', [
  { value: 'short', label: SCENARIOS.short.label },
  { value: 'long', label: SCENARIOS.long.label },
]);
const stepInput = createRange('stepMs', STEP_MS_LIMITS);
const stepOutput = element('output');
const pauseInput = createRange('pauseMs', PAUSE_MS_LIMITS);
const pauseOutput = element('output');
const diagonalSelect = createSelect('diagonal', [...DIAGONAL_OPTIONS]);

controlsHost.append(
  control('Preset', presetSelect),
  control('Escenario', scenarioSelect),
  control('Duración del paso', stepInput, stepOutput),
  control('Pausa por tile', pauseInput, pauseOutput),
  control('Diagonal', diagonalSelect),
);

function currentDecisionPayload() {
  return buildDecisionPayload(params, seed, decision, notes, new Date().toISOString());
}

function metricsSnapshot(): Array<{ label: string; value: string | number }> {
  const camera = cameraForState(state);
  return [
    { label: 'Estado', value: state.status },
    { label: 'Paso', value: `${completedStepCount(state)}/${state.timeline.steps.length}` },
    { label: 'MP', value: `${mpLeft(state)}/${INITIAL_MP}` },
    { label: 'Duración', value: Math.round(state.timeline.totalMs) },
    { label: 'Cámara', value: `${camera.x},${camera.y}` },
  ];
}

function syncControls(): void {
  presetSelect.value = params.preset;
  scenarioSelect.value = params.scenario;
  stepInput.value = String(params.stepMs);
  stepOutput.textContent = `${params.stepMs} ms`;
  pauseInput.value = String(params.pauseMs);
  pauseOutput.textContent = `${params.pauseMs} ms`;
  diagonalSelect.value = params.diagonal;
}

function syncDecision(): void {
  decisionSelect.value = decision;
}

function syncPlayButton(): void {
  playButton.textContent = state.status === 'ready' ? 'Repetir' : 'Recorrer';
  playButton.disabled = state.status === 'playing';
}

function renderCanvas(): void {
  context2d.setTransform(dpr, 0, 0, dpr, 0, 0);
  context2d.clearRect(0, 0, canvasWidth, canvasHeight);
  renderMotion(state, {
    ctx: context2d,
    width: canvasWidth,
    height: canvasHeight,
    seed,
    state,
    assets,
  });
}

function renderHud(): void {
  const steps = state.timeline.steps.length;
  hudState.value.textContent = state.status;
  hudStep.value.textContent = `${completedStepCount(state)}/${steps}`;
  hudMp.value.textContent = `${mpLeft(state)}/${INITIAL_MP}`;
  hudTotal.value.textContent = `${Math.round(state.timeline.totalMs)} ms`;
  const camera = cameraForState(state);
  hudCamera.value.textContent = `${camera.x}, ${camera.y}`;
  readyNotice.hidden = state.status !== 'ready';
}

function renderAll(): void {
  renderCanvas();
  renderHud();
  syncPlayButton();
}

function setStatus(message: string): void {
  decisionStatus.textContent = message;
}

function applyParams(next: MotionParams, source: ControlSource): void {
  params = normalizeParams(next);
  state = createMotionState(params);
  if (source !== 'init') decision = '';
  syncControls();
  syncDecision();
  syncPlayButton();
  renderAll();
}

function setSeed(next: number): void {
  const value = Number.isFinite(next) ? next >>> 0 : 0;
  seed = value;
  seedInput.value = String(value);
  renderAll();
  setStatus(`Semilla ${value}.`);
}

function play(): void {
  if (state.status === 'playing') return;
  state = playMotion(state);
  renderAll();
  startLoop();
}

function step(dt = 16): void {
  if (state.status !== 'playing') return;
  state = advanceMotion(state, dt);
  renderAll();
}

function reset(): void {
  state = resetMotion(state);
  renderAll();
}

function frame(now: number): void {
  raf = 0;
  if (state.status !== 'playing') {
    lastFrame = 0;
    return;
  }
  const dt = lastFrame === 0 ? 16 : Math.min(50, now - lastFrame);
  lastFrame = now;
  state = advanceMotion(state, dt);
  renderAll();
  if (state.status === 'playing') {
    raf = window.requestAnimationFrame(frame);
  } else {
    lastFrame = 0;
  }
}

function startLoop(): void {
  if (testMode || raf !== 0 || state.status !== 'playing') return;
  lastFrame = 0;
  raf = window.requestAnimationFrame(frame);
}

presetSelect.addEventListener('change', () => {
  const value = presetSelect.value as PresetValue;
  applyParams(normalizeParams({ ...params, preset: value }), 'control');
});

scenarioSelect.addEventListener('change', () => {
  applyParams(
    normalizeParams({ ...params, scenario: scenarioSelect.value as ScenarioId }),
    'control',
  );
});

diagonalSelect.addEventListener('change', () => {
  applyParams(
    normalizeParams({
      ...params,
      diagonal: diagonalSelect.value as DiagonalMode,
    }),
    'control',
  );
});

stepInput.addEventListener('input', () => {
  applyParams(
    normalizeParams({
      ...params,
      preset: 'personalizado',
      stepMs: Number(stepInput.value),
    }),
    'control',
  );
});

pauseInput.addEventListener('input', () => {
  applyParams(
    normalizeParams({
      ...params,
      preset: 'personalizado',
      pauseMs: Number(pauseInput.value),
    }),
    'control',
  );
});

decisionSelect.addEventListener('change', () => {
  decision = decisionSelect.value;
  if (decision === 'A' || decision === 'B' || decision === 'C') {
    params = normalizeParams({ ...params, preset: decision });
    state = createMotionState(params);
    syncControls();
    renderAll();
  } else if (decision === 'personalizado') {
    params = normalizeParams({ ...params, preset: 'personalizado' });
    state = createMotionState(params);
    syncControls();
    renderAll();
  }
});

decisionNotes.addEventListener('input', () => {
  notes = decisionNotes.value;
});

copyButton.addEventListener('click', async () => {
  const copied = await copyJson(currentDecisionPayload() as unknown as DecisionPayload);
  setStatus(
    copied ? 'Decisión copiada al portapapeles.' : 'No se pudo copiar la decisión.',
  );
});

downloadButton.addEventListener('click', () => {
  downloadJson(currentDecisionPayload() as unknown as DecisionPayload);
  setStatus('Decisión descargada.');
});

seedInput.addEventListener('change', () => {
  setSeed(Number(seedInput.value));
});

regenerateButton.addEventListener('click', () => {
  setSeed(randomSeed());
});

playButton.addEventListener('click', play);
resetButton.addEventListener('click', reset);

const GAME_KEYS = new Set([
  'ArrowUp',
  'ArrowDown',
  'ArrowLeft',
  'ArrowRight',
  'w',
  'a',
  's',
  'd',
  'W',
  'A',
  'S',
  'D',
  ' ',
  'Enter',
  'f',
  'F',
  'e',
  'E',
]);

window.addEventListener('keydown', (event) => {
  if (state.status === 'playing') {
    if (GAME_KEYS.has(event.key)) event.preventDefault();
    return;
  }
  if (state.status === 'ready' && event.key === ' ') {
    event.preventDefault();
    play();
  }
});

window.addEventListener('pagehide', () => {
  if (raf !== 0) {
    window.cancelAnimationFrame(raf);
    raf = 0;
  }
});

const api: MotionExperimentApi = {
  id: 'EXP-002',
  getParams: () => ({ ...params }),
  setParams: (next) => {
    const patch: Partial<MotionParams> = { ...next };
    const touchesTiming = patch.stepMs !== undefined || patch.pauseMs !== undefined;
    if (touchesTiming && patch.preset === undefined) patch.preset = 'personalizado';
    if (patch.preset === 'A' || patch.preset === 'B' || patch.preset === 'C') {
      const preset = PRESETS[patch.preset];
      if (patch.stepMs === undefined) patch.stepMs = preset.stepMs;
      if (patch.pauseMs === undefined) patch.pauseMs = preset.pauseMs;
    }
    applyParams({ ...params, ...patch } as MotionParams, 'api');
  },
  getSeed: () => seed,
  setSeed,
  reset,
  play,
  step,
  getState: () => state.status,
  getScenario: () => state.timeline.scenario,
  getStep: () => completedStepCount(state),
  getMpLeft: () => mpLeft(state),
  getVisualPosition: () => visualPosition(state),
  getCamera: () => cameraForState(state),
  getPath: () => pathTiles(state.timeline.scenario),
  getTimeline: () => ({
    totalMs: state.timeline.totalMs,
    elapsedMs: state.elapsedMs,
    steps: state.timeline.steps.length,
    diagonal: state.timeline.diagonal,
  }),
  getDecision: () => currentDecisionPayload(),
  isAssetsReady: () => assets.tiles !== null,
  snapshot: () => ({
    params: { ...params },
    seed,
    variants: [{ id: 'motion', metrics: metricsSnapshot() }],
  }),
};

window.__experiment = api as unknown as ExperimentTestApi;

syncControls();
syncDecision();
renderAll();

void loadAssets()
  .then((loaded) => {
    assets = loaded;
    renderAll();
  })
  .catch(() => {
    setStatus('No se pudieron cargar los assets locales; se usa el modo de color.');
  });
