#!/usr/bin/env node
/**
 * Guarda del bundle de producción (TASK-0047).
 *
 * Falla si `dist/` contiene marcadores de variantes descartadas o entry points
 * de experimentos. Combina dos comprobaciones para sobrevivir a la minificación:
 *
 * 1. Escaneo recursivo de `dist/`: contenido JS/HTML/CSS/JSON, nombres de
 *    assets y directorios.
 * 2. Grafo de imports de producción desde `index.html` hasta cada módulo
 *    alcanzable, resolviendo imports estáticos, re-exports y `import()`
 *    literales.
 *
 * No usa allowlists amplias: cualquier módulo prohibido o marcador encontrado
 * hace fallar la guarda con su ubicación.
 */
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, extname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const CONTENT_MARKERS = [
  { marker: 'buildBsp', pattern: /\bbuildBsp\b/ },
  { marker: 'pickTemplate', pattern: /\bpickTemplate\b/ },
  { marker: 'EXP-004', pattern: /EXP-004/ },
];

const PATH_MARKERS = new Set(['bsp', 'templates']);
const EXPERIMENTS_SEGMENT = 'experiments';
const TEXT_EXTENSIONS = new Set([
  '.js',
  '.mjs',
  '.cjs',
  '.html',
  '.htm',
  '.css',
  '.json',
  '.map',
  '.txt',
  '.svg',
]);
const JS_EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs']);
const RESOLVE_EXTENSIONS = ['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '.json', '.css'];

function normalizePath(filePath) {
  return filePath.split(sep).join('/');
}

function toRelative(rootDir, filePath) {
  return normalizePath(relative(rootDir, filePath));
}

function walkDist(rootDir, distDir) {
  const files = [];
  const dirs = [];

  const visit = (dir) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) {
        dirs.push(full);
        visit(full);
      } else if (entry.isFile()) {
        files.push(full);
      }
    }
  };

  visit(distDir);
  return { files, dirs };
}

function pathFinding(rootDir, filePath) {
  const rel = toRelative(rootDir, filePath);
  const segments = rel.split('/');

  for (const segment of segments) {
    const lower = segment.toLowerCase();
    if (lower === EXPERIMENTS_SEGMENT) {
      return { marker: 'experiments output', location: rel };
    }
    if (/^EXP-\d+/i.test(segment)) {
      return { marker: 'EXP-* entry', location: rel };
    }

    const base = segment.includes('.') ? segment.slice(0, segment.lastIndexOf('.')) : segment;
    for (const token of base.split(/[-_.]/).filter(Boolean)) {
      const normalized = token.toLowerCase();
      if (PATH_MARKERS.has(normalized)) {
        return { marker: `${normalized} chunk`, location: rel };
      }
    }
  }

  return null;
}

function contentFindings(rootDir, filePath) {
  if (!TEXT_EXTENSIONS.has(extname(filePath).toLowerCase())) return [];

  const text = readFileSync(filePath, 'utf8');
  const findings = [];
  for (const { marker, pattern } of CONTENT_MARKERS) {
    if (pattern.test(text)) {
      findings.push({ marker, location: toRelative(rootDir, filePath) });
    }
  }
  return findings;
}

/** Escanea el contenido, los nombres de assets y los directorios de `dist/`. */
export function scanDist({ rootDir, distDir }) {
  if (!existsSync(distDir)) {
    return {
      findings: [{ marker: 'dist output', location: relative(rootDir, distDir) }],
      files: 0,
      dirs: 0,
    };
  }

  const { files, dirs } = walkDist(rootDir, distDir);
  const findings = [];

  for (const dir of dirs) {
    const finding = pathFinding(rootDir, dir);
    if (finding) findings.push(finding);
  }

  for (const file of files) {
    const finding = pathFinding(rootDir, file);
    if (finding) findings.push(finding);
    findings.push(...contentFindings(rootDir, file));
  }

  return { findings, files: files.length, dirs: dirs.length };
}

/** Elimina comentarios sin romper strings ni plantillas. */
function stripComments(source) {
  let output = '';
  let index = 0;
  let quote = null;

  while (index < source.length) {
    const char = source[index];
    const next = source[index + 1];

    if (quote) {
      output += char;
      if (char === '\\') {
        output += next ?? '';
        index += 2;
        continue;
      }
      if (char === quote) quote = null;
      index += 1;
      continue;
    }

    if (char === '"' || char === "'" || char === '`') {
      quote = char;
      output += char;
      index += 1;
      continue;
    }

    if (char === '/' && next === '/') {
      while (index < source.length && source[index] !== '\n') index += 1;
      continue;
    }

    if (char === '/' && next === '*') {
      index += 2;
      while (index < source.length && !(source[index] === '*' && source[index + 1] === '/')) {
        index += 1;
      }
      index += 2;
      continue;
    }

    output += char;
    index += 1;
  }

  return output;
}

function extractImports(source) {
  const clean = stripComments(source);
  const specifiers = new Set();
  const patterns = [
    /\bimport\s+(?!type\b)(?:[^'";]*?\s+from\s+)?['"]([^'"]+)['"]/g,
    /\bexport\s+(?!type\b)(?:[^'";]*?\s+from\s+)['"]([^'"]+)['"]/g,
    /\bimport\s*\(\s*['"]([^'"]+)['"]\s*\)/g,
  ];

  for (const pattern of patterns) {
    for (const match of clean.matchAll(pattern)) specifiers.add(match[1]);
  }

  return [...specifiers];
}

function resolveModule(specifier, fromFile, rootDir) {
  if (!specifier.startsWith('.') && !specifier.startsWith('/')) return null;

  const clean = specifier.split(/[?#]/, 1)[0];
  const base = clean.startsWith('/')
    ? resolve(rootDir, `.${clean}`)
    : resolve(dirname(fromFile), clean);

  const candidates = [base];
  if (!extname(base)) {
    for (const extension of RESOLVE_EXTENSIONS) candidates.push(`${base}${extension}`);
  }
  for (const extension of RESOLVE_EXTENSIONS) {
    candidates.push(join(base, `index${extension}`));
  }

  for (const candidate of candidates) {
    if (existsSync(candidate) && statSync(candidate).isFile()) return candidate;
  }
  return null;
}

function htmlModuleScripts(html) {
  const sources = [];
  for (const match of html.matchAll(/<script\b[^>]*>/gi)) {
    const tag = match[0];
    if (!/\btype\s*=\s*["']module["']/i.test(tag)) continue;
    const src = tag.match(/\bsrc\s*=\s*["']([^"']+)["']/i);
    if (src) sources.push(src[1]);
  }
  return sources;
}

/**
 * Recorre el grafo de producción desde `index.html` y detecta módulos
 * prohibidos o marcadores en el código fuente (antes de minificar).
 */
export function collectProductionGraph({ rootDir, indexHtml = resolve(rootDir, 'index.html') }) {
  const findings = [];
  const visited = new Set();
  const queue = [];

  if (!existsSync(indexHtml)) {
    return {
      findings: [{ marker: 'production entry', location: toRelative(rootDir, indexHtml) }],
      modules: 0,
    };
  }

  const html = readFileSync(indexHtml, 'utf8');
  for (const specifier of htmlModuleScripts(html)) {
    const resolved = resolveModule(specifier, indexHtml, rootDir);
    if (!resolved) {
      findings.push({ marker: 'unresolved production entry', location: specifier });
      continue;
    }
    queue.push(resolved);
  }

  while (queue.length > 0) {
    const file = queue.shift();
    if (visited.has(file)) continue;
    visited.add(file);

    const rel = toRelative(rootDir, file);

    if (rel === 'src/game/bsp.ts') {
      findings.push({ marker: 'BSP module in production graph', location: rel });
      continue;
    }
    if (rel.startsWith('experiments/') || rel.includes('/experiments/')) {
      findings.push({ marker: 'experiments module in production graph', location: rel });
      continue;
    }
    if (!JS_EXTENSIONS.has(extname(file).toLowerCase())) continue;

    const raw = readFileSync(file, 'utf8');
    const clean = stripComments(raw);
    for (const { marker, pattern } of CONTENT_MARKERS) {
      if (pattern.test(clean)) {
        findings.push({ marker: `${marker} in production module`, location: rel });
      }
    }

    for (const specifier of extractImports(raw)) {
      const resolved = resolveModule(specifier, file, rootDir);
      if (!resolved) {
        if (specifier.startsWith('.') || specifier.startsWith('/')) {
          findings.push({ marker: 'unresolved production import', location: `${rel} -> ${specifier}` });
        }
        continue;
      }
      queue.push(resolved);
    }
  }

  return { findings, modules: visited.size };
}

function dedupe(findings) {
  const seen = new Set();
  return findings.filter((finding) => {
    const key = `${finding.marker}\u0000${finding.location}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/** Ejecuta las dos comprobaciones y devuelve hallazgos y estadísticas. */
export function checkBundle({
  rootDir,
  distDir = resolve(rootDir, 'dist'),
  indexHtml = resolve(rootDir, 'index.html'),
} = {}) {
  const dist = scanDist({ rootDir, distDir });
  const graph = collectProductionGraph({ rootDir, indexHtml });
  return {
    findings: dedupe([...dist.findings, ...graph.findings]),
    stats: {
      distFiles: dist.files,
      distDirs: dist.dirs,
      graphModules: graph.modules,
    },
  };
}

const scriptPath = fileURLToPath(import.meta.url);
const invokedPath = process.argv[1] ? resolve(process.argv[1]) : '';

if (invokedPath === scriptPath) {
  const repoRoot = resolve(dirname(scriptPath), '..');
  const result = checkBundle({ rootDir: repoRoot });

  if (result.findings.length > 0) {
    console.error('check:bundle: FAIL — forbidden production bundle markers found:');
    for (const finding of result.findings) {
      console.error(`  - ${finding.marker} at ${finding.location}`);
    }
    process.exitCode = 1;
  } else {
    console.log(
      `check:bundle: OK — scanned ${result.stats.distFiles} dist files ` +
        `and ${result.stats.graphModules} production modules; no forbidden markers.`,
    );
  }
}
