import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import { briefCheck } from '../../scripts/lib/attempt.mjs';

const root = mkdtempSync(join(tmpdir(), 'pd-brief-'));

afterAll(() => {
  rmSync(root, { recursive: true, force: true });
});

function attemptDir(attempt: number): string {
  const dir = join(root, `attempt-${attempt}`);
  mkdirSync(dir, { recursive: true });
  return dir;
}

describe('briefCheck', () => {
  it('en el intento 1 no exige brief', () => {
    expect(briefCheck(attemptDir(1), 1)).toBeNull();
  });

  it('en el intento 2 sin brief.md falla con el detalle del reintento', () => {
    expect(briefCheck(attemptDir(2), 2)).toEqual({
      ok: false,
      detail: 'falta attempt-2/brief.md en un reintento',
    });
  });

  it('en el intento 3 con brief.md acepta y reporta el tamaño en bytes', () => {
    const dir = attemptDir(3);
    const content = 'hola mundo';
    writeFileSync(join(dir, 'brief.md'), content);

    expect(briefCheck(dir, 3)).toEqual({
      ok: true,
      detail: `attempt-3/brief.md (${Buffer.byteLength(content)} B)`,
    });
  });

  it('sin carpeta o sin intento no hay nada que validar', () => {
    expect(briefCheck(undefined, 2)).toBeNull();
    expect(briefCheck(null, 2)).toBeNull();
    expect(briefCheck(attemptDir(4), undefined)).toBeNull();
    expect(briefCheck(attemptDir(5), null)).toBeNull();
  });
});
