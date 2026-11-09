import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { checkBundle } from '../../scripts/check-bundle.mjs';

const roots: string[] = [];

function createRoot(): string {
  const root = mkdtempSync(join(tmpdir(), 'bundle-guard-'));
  roots.push(root);
  return root;
}

function write(root: string, file: string, content: string): void {
  const full = join(root, file);
  mkdirSync(dirname(full), { recursive: true });
  writeFileSync(full, content);
}

function productionFixture(root: string): void {
  write(root, 'index.html', '<script type="module" src="/src/host/main.ts"></script>');
  write(
    root,
    'src/host/main.ts',
    "import { createInitialState } from '../game/engine';\nvoid createInitialState;\n",
  );
  write(root, 'src/game/engine.ts', 'export function createInitialState(): number { return 1; }\n');
}

function distFixture(root: string): void {
  write(root, 'dist/index.html', '<script type="module" src="/assets/main-abc.js"></script>');
  write(root, 'dist/assets/main-abc.js', "console.log('growth');\n");
}

afterEach(() => {
  for (const root of roots.splice(0)) {
    rmSync(root, { recursive: true, force: true });
  }
});

describe('check:bundle', () => {
  it('pasa un bundle de producción sin marcadores ni módulos prohibidos', () => {
    const root = createRoot();
    productionFixture(root);
    distFixture(root);

    const result = checkBundle({ rootDir: root });

    expect(result.findings).toEqual([]);
    expect(result.stats.distFiles).toBeGreaterThan(0);
    expect(result.stats.graphModules).toBe(2);
  });

  it('detecta buildBsp en el contenido de dist aunque el asset tenga hash', () => {
    const root = createRoot();
    productionFixture(root);
    distFixture(root);
    write(root, 'dist/assets/main-abc.js', 'function buildBsp() { return 1; }\n');

    expect(checkBundle({ rootDir: root }).findings).toContainEqual({
      marker: 'buildBsp',
      location: 'dist/assets/main-abc.js',
    });
  });

  it('detecta un chunk bsp por nombre de archivo', () => {
    const root = createRoot();
    productionFixture(root);
    distFixture(root);
    write(root, 'dist/assets/bsp-abc123.js', "console.log('unused');\n");

    expect(checkBundle({ rootDir: root }).findings).toContainEqual({
      marker: 'bsp chunk',
      location: 'dist/assets/bsp-abc123.js',
    });
  });
  it('detecta un chunk templates por nombre de archivo', () => {
    const root = createRoot();
    productionFixture(root);
    distFixture(root);
    write(root, 'dist/assets/templates-abc123.js', "console.log('unused');\n");

    expect(checkBundle({ rootDir: root }).findings).toContainEqual({
      marker: 'templates chunk',
      location: 'dist/assets/templates-abc123.js',
    });
  });

  it('detecta pickTemplate y EXP-004 en el contenido de dist', () => {
    const root = createRoot();
    productionFixture(root);
    distFixture(root);
    write(root, 'dist/assets/main-abc.js', 'export function pickTemplate() {} // EXP-004\n');

    const findings = checkBundle({ rootDir: root }).findings;
    expect(findings).toContainEqual({
      marker: 'pickTemplate',
      location: 'dist/assets/main-abc.js',
    });
    expect(findings).toContainEqual({
      marker: 'EXP-004',
      location: 'dist/assets/main-abc.js',
    });
  });

  it('detecta la salida de experimentos dentro de dist', () => {
    const root = createRoot();
    productionFixture(root);
    distFixture(root);
    write(root, 'dist/experiments/EXP-004-salas-irregulares/index.html', '<html></html>');

    expect(checkBundle({ rootDir: root }).findings).toContainEqual({
      marker: 'experiments output',
      location: 'dist/experiments',
    });
  });

  it('detecta un import estático de src/game/bsp.ts', () => {
    const root = createRoot();
    productionFixture(root);
    distFixture(root);
    write(
      root,
      'src/host/main.ts',
      "import { BspMapGenerator } from '../game/bsp';\nvoid BspMapGenerator;\n",
    );
    write(root, 'src/game/bsp.ts', 'export class BspMapGenerator {}\n');

    expect(checkBundle({ rootDir: root }).findings).toContainEqual({
      marker: 'BSP module in production graph',
      location: 'src/game/bsp.ts',
    });
  });

  it('detecta un import dinámico literal de src/game/bsp.ts', () => {
    const root = createRoot();
    productionFixture(root);
    distFixture(root);
    write(root, 'src/host/main.ts', "void import('../game/bsp');\n");
    write(root, 'src/game/bsp.ts', 'export const marker = 1;\n');

    expect(checkBundle({ rootDir: root }).findings).toContainEqual({
      marker: 'BSP module in production graph',
      location: 'src/game/bsp.ts',
    });
  });

  it('detecta pickTemplate en un módulo alcanzable', () => {
    const root = createRoot();
    productionFixture(root);
    distFixture(root);
    write(root, 'src/host/main.ts', "import { choose } from '../game/templates';\nvoid choose;\n");
    write(root, 'src/game/templates.ts', 'export function pickTemplate(): number { return 1; }\n');

    expect(checkBundle({ rootDir: root }).findings).toContainEqual({
      marker: 'pickTemplate in production module',
      location: 'src/game/templates.ts',
    });
  });

  it('ignora imports type-only, que no llegan al bundle', () => {
    const root = createRoot();
    productionFixture(root);
    distFixture(root);
    write(
      root,
      'src/host/main.ts',
      "import type { BspMapGenerator } from '../game/bsp';\nexport type Generator = BspMapGenerator;\n",
    );
    write(root, 'src/game/bsp.ts', 'export class BspMapGenerator {}\n');

    expect(checkBundle({ rootDir: root }).findings).toEqual([]);
  });
});
