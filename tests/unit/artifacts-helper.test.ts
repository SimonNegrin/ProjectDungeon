import { resolve } from 'node:path';
import type { TestInfo } from '@playwright/test';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { artifactPath } from '../e2e/artifacts';

const originalRoot = process.env.E2E_ARTIFACTS_DIR;
const originalSpecs = process.env.E2E_ARTIFACTS_SPECS;

const root = resolve(process.cwd(), 'artifacts/TASK-0062/attempt-1');

/** TestInfo mínimo: solo lo que el helper consulta. */
function fakeTestInfo(
  options: { repeatEachIndex?: number; repeatEach?: number; file?: string } = {},
): TestInfo {
  return {
    file: options.file ?? '/repo/tests/e2e/demo-spec.spec.ts',
    repeatEachIndex: options.repeatEachIndex ?? 0,
    project: { repeatEach: options.repeatEach ?? 1 },
    outputPath: (...parts: string[]) => resolve('/tmp/test-results', 'demo', ...parts),
  } as unknown as TestInfo;
}

beforeEach(() => {
  delete process.env.E2E_ARTIFACTS_DIR;
  delete process.env.E2E_ARTIFACTS_SPECS;
});

afterEach(() => {
  if (originalRoot === undefined) delete process.env.E2E_ARTIFACTS_DIR;
  else process.env.E2E_ARTIFACTS_DIR = originalRoot;
  if (originalSpecs === undefined) delete process.env.E2E_ARTIFACTS_SPECS;
  else process.env.E2E_ARTIFACTS_SPECS = originalSpecs;
});

describe('artifactPath sin E2E_ARTIFACTS_DIR', () => {
  it('usa outputPath y conserva el nombre del archivo', () => {
    const path = artifactPath(fakeTestInfo(), 'screenshots', 'frame.png');

    expect(path).toBe(resolve('/tmp/test-results', 'demo', 'screenshots', 'frame.png'));
  });

  it('ignora el índice de repetición cuando no hay carpeta explícita', () => {
    const single = artifactPath(fakeTestInfo({ repeatEachIndex: 0 }), 'snapshot.json');
    const repeated = artifactPath(fakeTestInfo({ repeatEachIndex: 2 }), 'snapshot.json');

    expect(repeated).toBe(single);
    expect(repeated).not.toContain('repeat-');
  });
});

describe('artifactPath con E2E_ARTIFACTS_DIR', () => {
  beforeEach(() => {
    process.env.E2E_ARTIFACTS_DIR = 'artifacts/TASK-0062/attempt-1';
  });

  it('una corrida única conserva el esquema <spec>/<parts>', () => {
    const path = artifactPath(fakeTestInfo({ repeatEachIndex: 0 }), 'screenshots', 'frame.png');

    expect(path).toBe(
      resolve(process.cwd(), 'artifacts/TASK-0062/attempt-1', 'demo-spec', 'screenshots', 'frame.png'),
    );
    expect(path).not.toContain('repeat-');
  });

  it('cada pasada de una repetición escribe en una carpeta distinta y estable', () => {
    const paths = [0, 1, 2].map((index) =>
      artifactPath(fakeTestInfo({ repeatEachIndex: index }), 'screenshots', 'frame.png'),
    );

    expect(new Set(paths).size).toBe(3);
    expect(paths[0]).not.toContain('repeat-');
    expect(paths[1]).toContain('/demo-spec/repeat-1/screenshots/frame.png');
    expect(paths[2]).toContain('/demo-spec/repeat-2/screenshots/frame.png');
    for (const path of paths) {
      expect(path.endsWith('/frame.png')).toBe(true);
    }

    expect(
      artifactPath(fakeTestInfo({ repeatEachIndex: 1 }), 'screenshots', 'frame.png'),
    ).toBe(paths[1]);
  });

  it('señala la pasada con repeatEachIndex aunque project.repeatEach no refleje el flag', () => {
    const path = artifactPath(
      fakeTestInfo({ repeatEachIndex: 1, repeatEach: 1 }),
      'screenshots',
      'frame.png',
    );

    expect(path).toContain('/demo-spec/repeat-1/screenshots/frame.png');
  });

  it('no añade repeat en la pasada 0 aunque project.repeatEach sea mayor que 1', () => {
    const path = artifactPath(fakeTestInfo({ repeatEachIndex: 0, repeatEach: 3 }), 'screenshots', 'frame.png');

    expect(path).not.toContain('repeat-');
    expect(path.endsWith('/demo-spec/screenshots/frame.png')).toBe(true);
  });

  it('deriva el subdirectorio del nombre del spec y evita rutas que escapan', () => {
    const path = artifactPath(
      fakeTestInfo({ file: '/repo/tests/e2e/Acción Ñandú_qa.spec.ts' }),
      'logs',
      'trace.log',
    );

    expect(path).toContain('/accion-nandu-qa/');
    expect(path.startsWith(root)).toBe(true);
  });
});

describe('artifactPath con E2E_ARTIFACTS_SPECS', () => {
  beforeEach(() => {
    process.env.E2E_ARTIFACTS_DIR = 'artifacts/TASK-0062/attempt-1';
  });

  it('sin la variable o con lista vacía mantiene el comportamiento sin filtro', () => {
    for (const value of [undefined, '', '   ', ',,']) {
      if (value === undefined) delete process.env.E2E_ARTIFACTS_SPECS;
      else process.env.E2E_ARTIFACTS_SPECS = value;

      expect(artifactPath(fakeTestInfo(), 'screenshots', 'frame.png')).toBe(
        resolve(root, 'demo-spec', 'screenshots', 'frame.png'),
      );
    }
  });

  it('un spec de la lista escribe bajo su carpeta, con repetición si la hay', () => {
    process.env.E2E_ARTIFACTS_SPECS = 'demo-spec';

    expect(artifactPath(fakeTestInfo(), 'screenshots', 'frame.png')).toBe(
      resolve(root, 'demo-spec', 'screenshots', 'frame.png'),
    );
    expect(
      artifactPath(fakeTestInfo({ repeatEachIndex: 1 }), 'screenshots', 'frame.png'),
    ).toBe(resolve(root, 'demo-spec', 'repeat-1', 'screenshots', 'frame.png'));
  });

  it('un spec fuera de la lista no escribe bajo E2E_ARTIFACTS_DIR', () => {
    process.env.E2E_ARTIFACTS_SPECS = 'inventory';

    const path = artifactPath(fakeTestInfo(), 'screenshots', 'frame.png');

    expect(path).toBe(resolve('/tmp/test-results', 'demo', 'screenshots', 'frame.png'));
    expect(path.includes(root)).toBe(false);
  });

  it('acepta varios nombres separados por comas, recortando espacios', () => {
    process.env.E2E_ARTIFACTS_SPECS = ' inventory , hotseat-flow-qa , demo-spec ';

    const hotseat = artifactPath(
      fakeTestInfo({ file: '/repo/tests/e2e/hotseat-flow-qa.spec.ts' }),
      'screenshots',
      'final.png',
    );
    const demo = artifactPath(fakeTestInfo(), 'logs', 'trace.log');
    const other = artifactPath(
      fakeTestInfo({ file: '/repo/tests/e2e/inventory-equipment-qa.spec.ts' }),
      'screenshots',
      'final.png',
    );

    expect(hotseat).toBe(resolve(root, 'hotseat-flow-qa', 'screenshots', 'final.png'));
    expect(demo).toBe(resolve(root, 'demo-spec', 'logs', 'trace.log'));
    expect(other).toBe(resolve('/tmp/test-results', 'demo', 'screenshots', 'final.png'));
  });

  it('compara el nombre normalizado del subdirectorio, no el nombre del archivo', () => {
    process.env.E2E_ARTIFACTS_SPECS = 'accion-nandu-qa';

    const path = artifactPath(
      fakeTestInfo({ file: '/repo/tests/e2e/Acción Ñandú_qa.spec.ts' }),
      'logs',
      'trace.log',
    );

    expect(path).toBe(resolve(root, 'accion-nandu-qa', 'logs', 'trace.log'));
  });

  it('un nombre desconocido no lanza ni afecta a los specs permitidos', () => {
    process.env.E2E_ARTIFACTS_SPECS = 'no-existe, demo-spec';

    expect(() => artifactPath(fakeTestInfo({ file: '/repo/tests/e2e/otro.spec.ts' }))).not.toThrow();
    expect(artifactPath(fakeTestInfo(), 'screenshots', 'frame.png')).toBe(
      resolve(root, 'demo-spec', 'screenshots', 'frame.png'),
    );
  });

  it('lee el filtro en cada llamada, sin depender del estado del módulo', () => {
    process.env.E2E_ARTIFACTS_SPECS = 'demo-spec';
    const included = artifactPath(fakeTestInfo(), 'screenshots', 'frame.png');

    process.env.E2E_ARTIFACTS_SPECS = 'otro-spec';
    const excluded = artifactPath(fakeTestInfo(), 'screenshots', 'frame.png');

    delete process.env.E2E_ARTIFACTS_SPECS;
    const unfiltered = artifactPath(fakeTestInfo(), 'screenshots', 'frame.png');

    expect(included).toBe(resolve(root, 'demo-spec', 'screenshots', 'frame.png'));
    expect(excluded).toBe(resolve('/tmp/test-results', 'demo', 'screenshots', 'frame.png'));
    expect(unfiltered).toBe(included);
  });
});
