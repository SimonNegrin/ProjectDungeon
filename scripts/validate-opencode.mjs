import { readFileSync } from 'node:fs';
import { basename, relative, resolve } from 'node:path';
import { parseConcept, repoRoot, walkFiles } from './lib/docs.mjs';

const errors = [];
const agents = new Map();

const agentFiles = walkFiles(
  resolve(repoRoot, '.opencode/agents'),
  (file) => file.endsWith('.md'),
);

for (const file of agentFiles) {
  const concept = parseConcept(file);
  const id = basename(file, '.md');
  const rel = relative(repoRoot, file);
  const data = concept.data;

  if (!concept.hasFrontmatter) {
    errors.push(`${rel}: falta frontmatter`);
    continue;
  }
  if (typeof data.description !== 'string' || data.description.length < 10) {
    errors.push(`${rel}: description ausente o demasiado corta`);
  }
  if (!['primary', 'subagent', 'all'].includes(data.mode)) {
    errors.push(`${rel}: mode debe ser primary|subagent|all`);
  }
  if (!Array.isArray(data.permissions)) {
    errors.push(`${rel}: permissions debe ser una lista`);
  }
  if (agents.has(id)) {
    errors.push(`${rel}: agente duplicado ${id}`);
  }
  agents.set(id, { data, rel });
}

if (!agents.has('requirements-writer')) {
  errors.push('Falta el agente requirements-writer');
}
if (agents.get('requirements-writer')?.data.mode !== 'primary') {
  errors.push('requirements-writer debe ser primary');
}
if (!agents.has('harness-keeper')) {
  errors.push('Falta el agente harness-keeper');
}
if (agents.get('harness-keeper')?.data.mode !== 'primary') {
  errors.push('harness-keeper debe ser primary');
}
for (const id of ['task-lead', 'task-runner']) {
  if (!agents.has(id)) errors.push(`Falta el agente ${id}`);
  if (agents.get(id)?.data.mode !== 'subagent') {
    errors.push(`${id} debe ser subagent`);
  }
}

const configPath = resolve(repoRoot, 'opencode.jsonc');
let config;
try {
  config = JSON.parse(readFileSync(configPath, 'utf8'));
} catch (error) {
  errors.push(`opencode.jsonc inválido: ${error.message}`);
}

if (config) {
  if (!config.default_agent || !agents.has(config.default_agent)) {
    errors.push('opencode.jsonc: default_agent no existe');
  } else if (agents.get(config.default_agent)?.data.mode !== 'primary') {
    errors.push('opencode.jsonc: default_agent debe ser primary');
  }
  if (Number(config.experimental?.subagent_depth ?? 1) < 2) {
    errors.push('opencode.jsonc: subagent_depth debe ser >= 2 (task-lead -> task-runner)');
  }
}

const skillFiles = walkFiles(
  resolve(repoRoot, '.opencode/skills'),
  (file) => basename(file) === 'SKILL.md',
);
const skillIds = new Set();

for (const file of skillFiles) {
  const concept = parseConcept(file);
  const id = basename(resolve(file, '..'));
  const rel = relative(repoRoot, file);
  if (!concept.hasFrontmatter) {
    errors.push(`${rel}: falta frontmatter`);
    continue;
  }
  if (typeof concept.data.name !== 'string' || concept.data.name.length < 3) {
    errors.push(`${rel}: falta name`);
  }
  if (typeof concept.data.description !== 'string' || concept.data.description.length < 10) {
    errors.push(`${rel}: falta description`);
  }
  if (skillIds.has(id)) errors.push(`${rel}: skill duplicada ${id}`);
  skillIds.add(id);
}

if (skillIds.size === 0) errors.push('No hay skills en .opencode/skills');

if (errors.length) {
  console.error(`Errores de configuración (${errors.length}):`);
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log(`OK: ${agents.size} agentes, ${skillIds.size} skills.`);
