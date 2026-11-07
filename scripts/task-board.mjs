import { writeFileSync } from 'node:fs';
import { basename, relative, resolve } from 'node:path';
import { loadConcepts, repoRoot } from './lib/docs.mjs';

const tasks = loadConcepts(['docs/tasks'])
  .filter((concept) => concept.data.type === 'Task')
  .sort((a, b) => {
    const pa = String(a.data.priority ?? 'P2');
    const pb = String(b.data.priority ?? 'P2');
    if (pa !== pb) return pa.localeCompare(pb);
    return String(a.data.created_at ?? '').localeCompare(String(b.data.created_at ?? ''));
  });

const groups = new Map([
  ['ready', []],
  ['in_progress', []],
  ['review', []],
  ['blocked', []],
  ['backlog', []],
  ['done', []],
]);

for (const task of tasks) {
  const status = task.data.task_status ?? 'backlog';
  if (!groups.has(status)) groups.set(status, []);
  groups.get(status).push(task);
}

const lines = ['# Tareas', ''];

if (tasks.length === 0) {
  lines.push(
    'No hay tareas todavía. Las tareas se crean a partir de requisitos aceptados y se generan con `npm run tasks:board`.',
    '',
    '* [Plantilla de tarea](../templates/task.md)',
    '* [Flujo de trabajo](../harness/workflow.md)',
    '* [Definition of Ready / Done](../quality/definition-of-ready-done.md)',
  );
} else {
  lines.push(
    `Total: **${tasks.length}**. Generado desde el frontmatter de \`docs/tasks/*.md\`.`,
    '',
    '| ID | Título | Estado | Requisito | Depende de | Prioridad |',
    '|---|---|---|---|---|---|',
  );
  for (const task of tasks) {
    const link = basename(task.file);
    const deps = Array.isArray(task.data.depends_on) && task.data.depends_on.length
      ? task.data.depends_on.join(', ')
      : '—';
    lines.push(
      `| [${task.data.id}](${link}) | ${task.data.title} | \`${task.data.task_status}\` | ${task.data.requirement ?? '—'} | ${deps} | ${task.data.priority ?? '—'} |`,
    );
  }
  lines.push('');
  for (const [status, group] of groups) {
    if (group.length === 0) continue;
    lines.push(`# ${status}`, '');
    for (const task of group) {
      lines.push(`* [${task.data.id} — ${task.data.title}](${basename(task.file)})`);
    }
    lines.push('');
  }
}

const out = resolve(repoRoot, 'docs/tasks/index.md');
writeFileSync(out, `${lines.join('\n')}\n`);
console.log(`Tablero actualizado: ${relative(repoRoot, out)} (${tasks.length} tareas).`);
