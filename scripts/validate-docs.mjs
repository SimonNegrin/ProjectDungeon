import { existsSync, readFileSync, statSync } from 'node:fs';
import { basename } from 'node:path';
import {
  bundleRootFor,
  isIsoDate,
  loadConcepts,
  localLinks,
  parseConcept,
  repoRoot,
  resolveLocalLink,
} from './lib/docs.mjs';

const concepts = loadConcepts([
  'docs',
  'experiments',
  'artifacts',
  'README.md',
  'AGENTS.md',
]);

const errors = [];
const warnings = [];
const ids = new Map();
const tasks = [];
const experiments = [];

const OKF_STATUS = new Set(['draft', 'stable', 'deprecated']);
const TASK_STATUS = new Set(['backlog', 'ready', 'in_progress', 'blocked', 'review', 'done']);
const EXPERIMENT_STATUS = new Set(['proposed', 'building', 'ready', 'decided', 'archived']);

// Topes de ADR-009. Solo se aplican de TASK-0021 en adelante; lo anterior es
// histórico y no se reescribe.
const CAPS_FROM_TASK = 21;
const TASK_WORDS_WARN = 600;
const TASK_WORDS_MAX = 800;
const HANDOFF_BYTES_WARN = 2560;
const HANDOFF_BYTES_MAX = 4096;
const LOG_LINE_MAX = 400;

function taskNumber(value) {
  const match = /^TASK-(\d+)$/.exec(String(value ?? ''));
  return match ? Number.parseInt(match[1], 10) : null;
}

function isCappedTask(value) {
  const number = taskNumber(value);
  return number !== null && number >= CAPS_FROM_TASK;
}

function error(message) {
  errors.push(message);
}

function warn(message) {
  warnings.push(message);
}

function checkDate(value, label, file) {
  if (value === undefined || value === null || value === '') return;
  if (!isIsoDate(value)) {
    error(`${file}: ${label} no es una fecha ISO 8601 válida: ${String(value)}`);
  }
}

function checkVerified(value, file) {
  if (!value) return;
  const entries = Array.isArray(value) ? value : [value];
  for (const entry of entries) {
    if (!entry || typeof entry !== 'object') {
      error(`${file}: verified debe ser un objeto o lista de objetos`);
      continue;
    }
    if (!entry.by) error(`${file}: verified.by es obligatorio`);
    checkDate(entry.at, 'verified.at', file);
  }
}

for (const concept of concepts) {
  const { file, rel, data, body, hasFrontmatter } = concept;
  const type = data.type;

  if (!hasFrontmatter) {
    error(`${rel}: falta frontmatter OKF`);
    continue;
  }
  if (!type) {
    error(`${rel}: falta type`);
    continue;
  }
  if (!data.title) error(`${rel}: falta title`);
  if (!data.description) warn(`${rel}: falta description`);

  if (data.status !== undefined && !OKF_STATUS.has(data.status)) {
    error(`${rel}: status debe ser draft|stable|deprecated`);
  }

  if (data.generated) {
    if (!data.generated.by) error(`${rel}: generated.by es obligatorio`);
    checkDate(data.generated.at, 'generated.at', file);
  } else {
    error(`${rel}: falta generated`);
  }

  checkVerified(data.verified, file);
  for (const key of [
    'created_at',
    'updated_at',
    'completed_at',
    'decided_at',
    'stale_after',
  ]) {
    checkDate(data[key], key, file);
  }

  if (data.id) {
    if (ids.has(data.id)) {
      error(`${rel}: id duplicado ${data.id} (también en ${ids.get(data.id)})`);
    } else {
      ids.set(data.id, rel);
    }
  }

  if (type === 'Task') {
    tasks.push(concept);
    for (const field of ['id', 'task_status', 'task_type', 'requirement', 'created_at']) {
      if (!data[field]) error(`${rel}: tarea sin ${field}`);
    }
    if (data.task_status && !TASK_STATUS.has(data.task_status)) {
      error(`${rel}: task_status inválido ${data.task_status}`);
    }
    if (data.task_status === 'done' && !data.completed_at) {
      error(`${rel}: tarea done sin completed_at`);
    }
    if (data.task_status !== 'done' && data.completed_at) {
      error(`${rel}: tarea no terminada con completed_at`);
    }
    if (!Array.isArray(data.depends_on)) warn(`${rel}: depends_on debería ser una lista`);
    if (!Array.isArray(data.unlocks)) warn(`${rel}: unlocks debería ser una lista`);
  }

  if (type === 'Task' && isCappedTask(data.id)) {
    const words = body.trim() ? body.trim().split(/\s+/).length : 0;
    if (words > TASK_WORDS_MAX) {
      error(`${rel}: tarea de ${words} palabras; el tope es ${TASK_WORDS_MAX}`);
    } else if (words > TASK_WORDS_WARN) {
      warn(`${rel}: tarea de ${words} palabras; objetivo ≤${TASK_WORDS_WARN}`);
    }
  }

  if (
    (type === 'Task Brief' || type === 'Task Report') &&
    isCappedTask(data.task) &&
    !basename(file).includes('detalle')
  ) {
    const bytes = statSync(file).size;
    if (bytes > HANDOFF_BYTES_MAX) {
      error(`${rel}: handoff de ${bytes} B; el tope es ${HANDOFF_BYTES_MAX} B`);
    } else if (bytes > HANDOFF_BYTES_WARN) {
      warn(`${rel}: handoff de ${bytes} B; objetivo ≤${HANDOFF_BYTES_WARN} B`);
    }
  }

  if (type === 'Experiment') {
    experiments.push(concept);
    for (const field of ['id', 'experiment_status', 'question', 'created_at']) {
      if (!data[field]) error(`${rel}: experimento sin ${field}`);
    }
    if (data.experiment_status && !EXPERIMENT_STATUS.has(data.experiment_status)) {
      error(`${rel}: experiment_status inválido ${data.experiment_status}`);
    }
    if (data.experiment_status === 'decided') {
      for (const field of ['decision', 'decided_by', 'decided_at']) {
        if (!data[field]) error(`${rel}: experimento decidido sin ${field}`);
      }
    }
  }

  const bundleRoot = bundleRootFor(file);
  for (const target of localLinks(body)) {
    const resolved = resolveLocalLink(file, target, bundleRoot);
    if (resolved && !existsSync(resolved)) {
      error(`${rel}: enlace local roto ${target}`);
    }
  }
}

const taskById = new Map();
for (const task of tasks) {
  if (!task.data.id) continue;
  if (taskById.has(task.data.id)) {
    error(`${task.rel}: id de tarea duplicado ${task.data.id}`);
  }
  taskById.set(task.data.id, task);
}

function taskDeps(task) {
  return Array.isArray(task.data.depends_on) ? task.data.depends_on : [];
}

function taskUnlocks(task) {
  return Array.isArray(task.data.unlocks) ? task.data.unlocks : [];
}

for (const task of tasks) {
  const id = task.data.id;
  if (!id) continue;

  for (const depId of taskDeps(task)) {
    const dep = taskById.get(depId);
    if (!dep) {
      error(`${task.rel}: depende de ${depId}, que no existe`);
      continue;
    }
    if (!taskUnlocks(dep).includes(id)) {
      error(`${dep.rel}: no incluye ${id} en unlocks (dependencia declarada por ${task.rel})`);
    }
  }

  for (const unlockedId of taskUnlocks(task)) {
    const unlocked = taskById.get(unlockedId);
    if (!unlocked) {
      error(`${task.rel}: desbloquea ${unlockedId}, que no existe`);
      continue;
    }
    if (!taskDeps(unlocked).includes(id)) {
      error(`${unlocked.rel}: no incluye ${id} en depends_on (desbloqueo declarado por ${task.rel})`);
    }
  }

  if (task.data.task_status === 'ready') {
    for (const depId of taskDeps(task)) {
      const dep = taskById.get(depId);
      if (dep && dep.data.task_status !== 'done') {
        error(`${task.rel}: está ready pero su dependencia ${depId} está ${dep.data.task_status}`);
      }
    }
  }
}

const visiting = new Set();
const visited = new Set();

function visit(taskId, stack) {
  if (visiting.has(taskId)) {
    error(`Ciclo de dependencias: ${[...stack, taskId].join(' -> ')}`);
    return;
  }
  if (visited.has(taskId)) return;
  visiting.add(taskId);
  const task = taskById.get(taskId);
  if (task) {
    for (const depId of taskDeps(task)) visit(depId, [...stack, taskId]);
  }
  visiting.delete(taskId);
  visited.add(taskId);
}

for (const taskId of taskById.keys()) visit(taskId, []);

const docsIndex = parseConcept(`${repoRoot}/docs/index.md`);
if (docsIndex.data.okf_version !== '0.2') {
  error('docs/index.md: okf_version debe ser "0.2"');
}

for (const concept of concepts) {
  if (basename(concept.file) === 'README.md' && concept.rel.startsWith('artifacts/')) {
    continue;
  }
}

const logPath = `${repoRoot}/docs/log.md`;
for (const [index, line] of readFileSync(logPath, 'utf8').split('\n').entries()) {
  if (!/^\* \d{4}-\d{2}-\d{2} — /.test(line)) continue;
  if (line.length > LOG_LINE_MAX) {
    error(
      `docs/log.md:${index + 1}: entrada de log de ${line.length} caracteres; el tope es ${LOG_LINE_MAX}`,
    );
  }
}

if (warnings.length) {
  console.warn(`Avisos (${warnings.length}):`);
  for (const warning of warnings) console.warn(`- ${warning}`);
}

if (errors.length) {
  console.error(`Errores (${errors.length}):`);
  for (const item of errors) console.error(`- ${item}`);
  process.exit(1);
}

console.log(
  `OK: ${concepts.length} documentos, ${tasks.length} tareas, ${experiments.length} experimentos.`,
);
