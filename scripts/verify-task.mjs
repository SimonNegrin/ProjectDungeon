#!/usr/bin/env node
import { existsSync, mkdirSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';
import { parseConcept, parseConceptText, repoRoot } from './lib/docs.mjs';
import { briefCheck } from './lib/attempt.mjs';
import {
  allowedFor,
  isInScope,
  normalizeScope,
  sameScope,
  unknownScopeEntries,
} from './lib/scope.mjs';

const USAGE = `Uso: pnpm run verify:task TASK-NNNN [--attempt N] [--base REF] [--no-run]

Comprueba de forma determinista la evidencia de una tarea:
  - estado in_progress y criterios de aceptación firmados;
  - informe del intento con report_status success;
  - brief del intento desde el intento 2 (attempt-N/brief.md);
  - alcance del diff frente a la base (main por defecto): el declarado en
    \`scope:\` de la ficha o, si falta, el de su \`task_type\`; el alcance que tenía
    la ficha en la base es el que se mide, y cambiarlo después hace fallar la
    verificación; solo la ficha propia, docs/tasks/index.md y artifacts/ están
    siempre permitidos;
  - capturas cuando la tarea es visual o QA; el plan de test puede declarar
    «E2E / visual: no» para una tarea sin UI, y entonces no se exigen;
  - pnpm run verify (salvo --no-run).

--base permite medir solo el diff de la tarea cuando la rama base no es main.

Escribe la salida en artifacts/TASK-NNNN/attempt-N/lead-verify/verify-task.txt.
No decide si un criterio semántico se cumple: exige que alguien lo haya firmado
en la ficha.`;

const args = process.argv.slice(2);
const taskId = args.find((arg) => /^TASK-\d{4}$/.test(arg));
const noRun = args.includes('--no-run');
const attemptFlag = args.indexOf('--attempt');
const requestedAttempt = attemptFlag >= 0 ? Number(args[attemptFlag + 1]) : null;
const baseFlag = args.indexOf('--base');
const requestedBase = baseFlag >= 0 ? args[baseFlag + 1] : null;

if (!taskId) {
  console.error(USAGE);
  process.exit(2);
}

if (baseFlag >= 0 && (!requestedBase || requestedBase.startsWith('--'))) {
  console.error('--base necesita una referencia, por ejemplo --base harness/2agentes');
  process.exit(2);
}

const baseRef = requestedBase ?? 'main';

const checks = [];
function add(name, ok, detail = '') {
  checks.push({ name, ok, detail });
}

function fail(message) {
  console.error(`✗ ${message}`);
  process.exit(2);
}

function findTaskFile(id) {
  const dir = resolve(repoRoot, 'docs/tasks');
  const match = readdirSync(dir).find((file) => file.startsWith(`${id}-`) && file.endsWith('.md'));
  return match ? resolve(dir, match) : null;
}

function latestAttempt(id) {
  const dir = resolve(repoRoot, 'artifacts', id);
  if (!existsSync(dir)) return null;
  const attempts = readdirSync(dir)
    .map((name) => /^attempt-(\d+)$/.exec(name))
    .filter(Boolean)
    .map((match) => Number(match[1]))
    .sort((a, b) => b - a);
  return attempts[0] ?? null;
}

function run(command, commandArgs, timeout = 300_000) {
  return spawnSync(command, commandArgs, {
    cwd: repoRoot,
    encoding: 'utf8',
    timeout,
    env: { ...process.env, CI: '1' },
  });
}

const taskFile = findTaskFile(taskId);
if (!taskFile) fail(`No existe docs/tasks/${taskId}-*.md`);

const task = parseConcept(taskFile);
const data = task.data;
const attempt = requestedAttempt ?? latestAttempt(taskId);

add('Ficha', true, `${task.rel}`);
add('Estado', data.task_status === 'in_progress', `task_status: ${data.task_status ?? '—'}`);

if (data.task_status === 'done') {
  console.error(`✗ ${taskId} ya está cerrada; verify:task no reescribe evidencia histórica.`);
  process.exit(2);
}

if (!attempt) {
  add('Intento', false, 'no hay artifacts/<id>/attempt-N');
} else {
  add('Intento', true, `attempt-${attempt}`);
}

const bodyLines = task.body.split(/\r?\n/);
const start = bodyLines.findIndex((line) => /^# Criterios de aceptación\s*$/.test(line));
let criteria = [];
if (start >= 0) {
  const end = bodyLines.findIndex((line, index) => index > start && /^# /.test(line));
  const section = bodyLines.slice(start + 1, end === -1 ? undefined : end);
  criteria = section.filter((line) => /^- \[( |x)\]/.test(line));
}
const unchecked = criteria.filter((line) => line.startsWith('- [ ]')).length;
if (criteria.length === 0) {
  add('Criterios', false, 'no se encontró una lista de criterios');
} else {
  add(
    'Criterios firmados',
    unchecked === 0,
    unchecked === 0 ? `${criteria.length} marcados` : `${unchecked} de ${criteria.length} sin marcar`,
  );
}

const attemptDir = attempt ? resolve(repoRoot, 'artifacts', taskId, `attempt-${attempt}`) : null;
const reportPath = attemptDir ? resolve(attemptDir, 'report.md') : null;

if (!reportPath || !existsSync(reportPath)) {
  add('Informe', false, 'falta attempt-N/report.md');
} else {
  const report = parseConcept(reportPath);
  const status = report.data.report_status;
  add(
    'Informe',
    status === 'success',
    `report_status: ${status ?? '—'} (${statSync(reportPath).size} B)`,
  );
}

const brief = briefCheck(attemptDir, attempt);
if (brief) add('Brief', brief.ok, brief.detail);

const taskType = String(data.task_type ?? 'feature');
const declaredScope = normalizeScope(data.scope);
const scopeProblems = [];
if (declaredScope && declaredScope.length === 0) scopeProblems.push('scope vacío');
for (const entry of unknownScopeEntries(declaredScope)) {
  scopeProblems.push(`fuera del catálogo: ${entry}`);
}
add(
  'Alcance declarado',
  scopeProblems.length === 0,
  scopeProblems.length === 0
    ? (declaredScope ? `scope: ${declaredScope.join(', ')}` : `sin scope: se usa ${taskType}`)
    : scopeProblems.join('; '),
);

const base = run('git', ['merge-base', baseRef, 'HEAD']);
if (base.status !== 0) {
  add('Alcance', false, `no se pudo calcular merge-base con ${baseRef}: ${base.stderr.trim()}`);
} else {
  const baseSha = base.stdout.trim();
  // El alcance se congela con la ficha de la base: ampliarla a mitad del
  // intento no amplía el diff, y el cambio se reporta como fallo.
  const baseTask = run('git', ['show', `${baseSha}:${task.rel}`]);
  let measured = data;
  if (baseTask.status === 0) {
    const baseScope = normalizeScope(parseConceptText(baseTask.stdout, task.rel).data.scope);
    const frozen = sameScope(baseScope, declaredScope);
    add(
      'Alcance congelado',
      frozen,
      frozen
        ? `scope sin cambios desde ${baseRef}`
        : `scope editado tras ${baseRef}: base ${baseScope ? baseScope.join(', ') : '—'} → HEAD ${declaredScope ? declaredScope.join(', ') : '—'}`,
    );
    if (!frozen) measured = { ...data, scope: baseScope };
  } else {
    add('Alcance congelado', true, 'ficha nueva en la rama; no hay versión en la base');
  }

  const allowed = allowedFor(measured, task.rel);
  const diff = run('git', ['diff', '--name-only', `${baseSha}...HEAD`]);
  const files = diff.stdout.split('\n').map((line) => line.trim()).filter(Boolean);
  const outside = files.filter((file) => !isInScope(file, allowed));
  const source = normalizeScope(measured.scope) ? 'scope' : taskType;
  add(
    'Alcance',
    diff.status === 0 && outside.length === 0,
    outside.length === 0
      ? `${files.length} archivos dentro de ${source} (base ${baseRef})`
      : `fuera de alcance: ${outside.join(', ')} (base ${baseRef}, ${source})`,
  );
}

if (attemptDir && existsSync(attemptDir)) {
  const images = [];
  const walk = (dir) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = resolve(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (/\.(png|jpe?g|webp)$/i.test(entry.name)) images.push(full);
    }
  };
  walk(attemptDir);
  const visualPlan = bodyLines.find((line) => /^-\s*E2E\s*\/\s*visual:/i.test(line));
  const declaresNoVisual =
    visualPlan !== undefined && /:\s*no\b/i.test(visualPlan);
  const visual =
    taskType === 'qa' ||
    (!declaresNoVisual &&
      /captura|screenshot|hud|canvas|\bui\b/i.test(task.body.slice(0, 4000)));
  if (visual) {
    add('Capturas', images.length > 0, `${images.length} imágenes`);
  }
}

if (noRun) {
  add('verify', true, 'omitido con --no-run');
} else {
  const verify = run('pnpm', ['run', 'verify']);
  add(
    'verify',
    verify.status === 0,
    verify.status === 0 ? 'pnpm run verify OK' : `exit ${verify.status ?? 'timeout'}`,
  );
}

const failed = checks.filter((check) => !check.ok);
const lines = [
  `# Verificación determinista de ${taskId}`,
  '',
  `- Fecha: ${new Date().toISOString()}`,
  `- Intento: ${attempt ?? '—'}`,
  `- Base: ${baseRef}`,
  `- Resultado: ${failed.length === 0 ? 'ok' : 'fail'}`,
  '',
  '| Comprobación | Resultado | Detalle |',
  '|---|---|---|',
  ...checks.map(
    (check) => `| ${check.name} | ${check.ok ? 'ok' : 'fail'} | ${check.detail.replaceAll('|', '\\|')} |`,
  ),
  '',
];

const text = lines.join('\n');
process.stdout.write(text);

if (attemptDir) {
  const outDir = resolve(attemptDir, 'lead-verify');
  mkdirSync(outDir, { recursive: true });
  writeFileSync(resolve(outDir, 'verify-task.txt'), text);
}

if (failed.length > 0) {
  console.error(`Fallan ${failed.length} comprobaciones. No cierres la tarea.`);
  process.exit(1);
}
