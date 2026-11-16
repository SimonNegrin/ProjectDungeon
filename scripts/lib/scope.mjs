// Alcance del diff de una tarea: catálogo cerrado de raíces, atajo por
// task_type y resolución del campo `scope:` de la ficha. Lo comparten
// `verify-task.mjs` y `validate-docs.mjs` para que la regla viva en un solo sitio.

const CODE_SCOPE = [
  'src/',
  'tests/',
  'index.html',
  'public/',
  'experiments/',
  'package.json',
  'pnpm-lock.yaml',
  'tsconfig.json',
  'tsconfig.node.json',
  'vite.config.ts',
  'vite.config.experiments.ts',
  'vitest.config.ts',
  'playwright.config.ts',
];

const DOCS_SCOPE = [
  'docs/',
  'AGENTS.md',
  'README.md',
  'opencode.jsonc',
  '.opencode/',
  'scripts/',
  'package.json',
];

// Atajo por tipo de tarea. `docs` y `harness` comparten lista a propósito: el
// arnés y la documentación los escribe el mismo agente.
export const TYPE_SCOPE = {
  docs: DOCS_SCOPE,
  harness: DOCS_SCOPE,
  experiment: ['src/', 'tests/', 'experiments/', 'package.json', 'pnpm-lock.yaml'],
  feature: CODE_SCOPE,
  test: CODE_SCOPE,
  qa: CODE_SCOPE,
  refactor: CODE_SCOPE,
};

// Catálogo cerrado: toda entrada de `scope:` debe estar aquí. Añadir una raíz
// nueva es un cambio de arnés, con revisión, no un atajo de una ficha.
export const SCOPE_ROOTS = [...new Set([...CODE_SCOPE, ...DOCS_SCOPE])].sort();

// Permitidos siempre: la evidencia y la ficha propia. `docs/tasks/index.md` lo
// regenera `tasks:board` y no es una decisión de autoría.
export const ALWAYS_ALLOWED = ['artifacts/', 'docs/tasks/index.md'];

/**
 * Normaliza el campo `scope` de la ficha. Devuelve `null` cuando no está
 * declarado (manda el `task_type`) y una lista cuando lo está, aunque sea vacía:
 * una lista vacía es un error de la ficha, no una ausencia.
 */
export function normalizeScope(value) {
  if (value === undefined || value === null) return null;
  if (typeof value === 'string' && value.trim() === '') return null;
  const list = Array.isArray(value) ? value : [value];
  return list.map((entry) => String(entry).trim()).filter((entry) => entry.length > 0);
}

/** Entradas de `scope` que no pertenecen al catálogo cerrado. */
export function unknownScopeEntries(scope) {
  if (!scope) return [];
  return scope.filter((entry) => !SCOPE_ROOTS.includes(entry));
}

/** Alcance efectivo de una tarea: `scope` declarado o, si falta, el del tipo. */
export function resolveScope(data) {
  const declared = normalizeScope(data?.scope);
  if (declared && declared.length > 0) return [...declared];
  const type = String(data?.task_type ?? 'feature');
  return [...(TYPE_SCOPE[type] ?? CODE_SCOPE)];
}

/** Lista completa de rutas permitidas para el diff de una tarea. */
export function allowedFor(data, taskRel = null) {
  return [...ALWAYS_ALLOWED, ...(taskRel ? [taskRel] : []), ...resolveScope(data)];
}

/**
 * Compara dos alcances declarados sin depender del orden. Ausencia (`null`) solo
 * coincide con ausencia; una lista vacía es un estado distinto y lo detecta la
 * validación de la ficha.
 */
export function sameScope(a, b) {
  const norm = (scope) => (scope == null ? 'ausente' : JSON.stringify([...scope].sort()));
  return norm(a) === norm(b);
}

/** `file` cae en `allowed`: un directorio con `/` final o un fichero exacto. */
export function isInScope(file, allowed) {
  return allowed.some((entry) => (entry.endsWith('/') ? file.startsWith(entry) : file === entry));
}
