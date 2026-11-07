import { readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, extname, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from 'yaml';

const here = dirname(fileURLToPath(import.meta.url));
export const repoRoot = resolve(here, '../..');

const SKIP_DIRS = new Set([
  '.git',
  'node_modules',
  'dist',
  'coverage',
  'test-results',
  'playwright-report',
]);

export function walkFiles(dir, predicate = () => true) {
  const files = [];
  if (!statSync(dir, { throwIfNoEntry: false })) return files;

  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith('.') && entry.name !== '.') continue;
    if (SKIP_DIRS.has(entry.name)) continue;
    const fullPath = resolve(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...walkFiles(fullPath, predicate));
    } else if (predicate(fullPath)) {
      files.push(fullPath);
    }
  }
  return files;
}

export function markdownFiles(dir) {
  return walkFiles(dir, (file) => extname(file) === '.md');
}

export function parseConcept(file) {
  const text = readFileSync(file, 'utf8');
  const match = text.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  if (!match) {
    return { file, rel: relative(repoRoot, file), data: {}, body: text, hasFrontmatter: false };
  }

  let data;
  try {
    data = parse(match[1]) ?? {};
  } catch (error) {
    throw new Error(`YAML inválido en ${relative(repoRoot, file)}: ${error.message}`);
  }

  return {
    file,
    rel: relative(repoRoot, file),
    data,
    body: text.slice(match[0].length),
    hasFrontmatter: true,
  };
}

const ISO_DATE =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/;

export function isIsoDate(value) {
  return typeof value === 'string' && ISO_DATE.test(value) && !Number.isNaN(Date.parse(value));
}

export function bundleRootFor(file) {
  const rel = relative(repoRoot, file);
  if (rel.startsWith(`docs${process.platform === 'win32' ? '\\' : '/'}`)) return resolve(repoRoot, 'docs');
  if (rel.startsWith(`experiments${process.platform === 'win32' ? '\\' : '/'}`)) {
    return resolve(repoRoot, 'experiments');
  }
  return repoRoot;
}

export function localLinks(body) {
  const links = [];
  const regex = /\[[^\]]*\]\(([^)]+)\)/g;
  let match;
  while ((match = regex.exec(body)) !== null) {
    const target = match[1].trim();
    if (!target || target.startsWith('#')) continue;
    if (/^(https?:|mailto:|tel:|data:)/i.test(target)) continue;
    if (target.startsWith('//')) continue;
    links.push(target);
  }
  return links;
}

export function resolveLocalLink(file, target, bundleRoot) {
  const clean = target.split('#')[0].split('?')[0].trim();
  if (!clean) return null;
  if (clean.startsWith('/')) return resolve(bundleRoot, `.${clean}`);
  return resolve(dirname(file), clean);
}

export function loadConcepts(roots) {
  const concepts = [];
  for (const root of roots) {
    const absolute = resolve(repoRoot, root);
    const files = statSync(absolute, { throwIfNoEntry: false })?.isDirectory()
      ? markdownFiles(absolute)
      : [absolute];
    for (const file of files) {
      const basename = file.split(/[\\/]/).pop();
      if (basename === 'index.md' || basename === 'log.md') continue;
      concepts.push(parseConcept(file));
    }
  }
  return concepts;
}
