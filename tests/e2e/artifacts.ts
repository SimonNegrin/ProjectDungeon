import { basename, resolve } from 'node:path';
import type { TestInfo } from '@playwright/test';

/** Convierte un título en un segmento de ruta estable y legible. */
function segment(value: string): string {
  const normalized = value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return normalized.slice(0, 100) || 'test';
}

/**
 * Ruta de una captura, JSON o log de la suite E2E.
 *
 * - Sin `E2E_ARTIFACTS_DIR`, escribe bajo `testInfo.outputPath(...)`
 *   (`test-results/`), que Playwright limpia por ejecución.
 * - Con `E2E_ARTIFACTS_DIR`, escribe solo bajo esa carpeta, con un
 *   subdirectorio por spec y, en las repeticiones posteriores a la primera,
 *   otro `repeat-<índice>`. Así dos workers nunca comparten PNG/JSON/log.
 *
 * `testInfo.repeatEachIndex` es la única señal fiable de la pasada real:
 * `testInfo.project.repeatEach` no refleja el flag `--repeat-each` de CLI. La
 * pasada 0 comparte ruta con una corrida única (`<spec>/...`), así que el
 * esquema de una corrida única no cambia; las pasadas 1..N-1 van a
 * `<spec>/repeat-1/...`, `<spec>/repeat-2/...`.
 *
 * `E2E_ARTIFACTS_DIR` se lee en cada llamada para que el helper se pueda
 * probar con y sin la variable sin depender del estado del módulo.
 *
 * No cambia el nombre del archivo: `screenshots/frame.png` sigue llamándose
 * `frame.png`.
 */
export function artifactPath(testInfo: TestInfo, ...parts: string[]): string {
  const explicitRoot = process.env.E2E_ARTIFACTS_DIR;
  if (!explicitRoot) return testInfo.outputPath(...parts);

  const base = resolve(process.cwd(), explicitRoot);
  const spec = segment(basename(testInfo.file, '.spec.ts'));
  const repeatEachIndex = testInfo.repeatEachIndex;
  return resolve(
    base,
    spec,
    ...(repeatEachIndex > 0 ? [`repeat-${repeatEachIndex}`] : []),
    ...parts,
  );
}
