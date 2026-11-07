import { relative } from 'node:path';
import { loadConcepts } from './lib/docs.mjs';

const tasks = loadConcepts(['docs/tasks']).filter((concept) => concept.data.type === 'Task');
const byId = new Map(tasks.map((task) => [task.data.id, task]));

const ready = tasks
  .filter((task) => task.data.task_status === 'ready')
  .filter((task) => {
    const deps = Array.isArray(task.data.depends_on) ? task.data.depends_on : [];
    return deps.every((id) => {
      const dep = byId.get(id);
      return dep && dep.data.task_status === 'done';
    });
  })
  .sort((a, b) => {
    const pa = String(a.data.priority ?? 'P2');
    const pb = String(b.data.priority ?? 'P2');
    if (pa !== pb) return pa.localeCompare(pb);
    return String(a.data.created_at ?? '').localeCompare(String(b.data.created_at ?? ''));
  });

if (ready.length === 0) {
  console.log('No hay tareas listas. Revisa `pnpm run tasks:board`.');
  process.exit(0);
}

const task = ready[0];
console.log(`${task.data.id} — ${task.data.title}`);
console.log(`Archivo: ${relative(process.cwd(), task.file)}`);
console.log(`Requisito: ${task.data.requirement}`);
console.log(`Artefactos: ${task.data.artifacts}`);
console.log('');
console.log('Siguiente paso: lanza `task-lead` con este ID.');
