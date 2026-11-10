import { resolve } from 'node:path';
import type { TestInfo } from '@playwright/test';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { artifactPath } from '../e2e/artifacts';

const originalRoot = process.env.E2E_ARTIFACTS_DIR;

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
});

afterEach(() => {
  if (originalRoot === undefined) delete process.env.E2E_ARTIFACTS_DIR;
  else process.env.E2E_ARTIFACTS_DIR = originalRoot;
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
    expect(path.startsWith(resolve(process.cwd(), 'artifacts/TASK-0062/attempt-1'))).toBe(true);
  });
});
