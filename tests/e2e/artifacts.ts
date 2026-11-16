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
 * Specs permitidos por `E2E_ARTIFACTS_SPECS`, o `null` si no hay filtro.
 *
 * La lista es de nombres separados por comas; se recortan los espacios y se
 * ignoran las entradas vacías. Una lista vacía equivale a no tener filtro.
 */
function allowedSpecs(): Set<string> | null {
  const raw = process.env.E2E_ARTIFACTS_SPECS;
  if (raw === undefined) return null;

  const names = raw
    .split(',')
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);

  return names.length > 0 ? new Set(names) : null;
}

/**
 * Ruta de una captura, JSON o log de la suite E2E.
 *
 * - Sin `E2E_ARTIFACTS_DIR`, escribe bajo `testInfo.outputPath(...)`
 *   (`test-results/`), que Playwright limpia por ejecución.
 * - Con `E2E_ARTIFACTS_DIR`, escribe solo bajo esa carpeta, con un
 *   subdirectorio por spec y, en las repeticiones posteriores a la primera,
 *   otro `repeat-<índice>`. Así dos workers nunca comparten PNG/JSON/log.
 * - Con `E2E_ARTIFACTS_SPECS`, solo los specs de la lista escriben bajo esa
 *   carpeta; el resto cae en `testInfo.outputPath(...)` y no deja carpetas
 *   vacías. El nombre comparado es el mismo del subdirectorio
 *   (`segment(basename(file, '.spec.ts'))`); un nombre desconocido no falla.
 *
 * `testInfo.repeatEachIndex` es la única señal fiable de la pasada real:
 * `testInfo.project.repeatEach` no refleja el flag `--repeat-each` de CLI. La
 * pasada 0 comparte ruta con una corrida única (`<spec>/...`), así que el
 * esquema de una corrida única no cambia; las pasadas 1..N-1 van a
 * `<spec>/repeat-1/...`, `<spec>/repeat-2/...`.
 *
 * `E2E_ARTIFACTS_DIR` y `E2E_ARTIFACTS_SPECS` se leen en cada llamada para que
 * el helper se pueda probar con y sin las variables sin depender del estado
 * del módulo.
 *
 * No cambia el nombre del archivo: `screenshots/frame.png` sigue llamándose
 * `frame.png`.
 */
export function artifactPath(testInfo: TestInfo, ...parts: string[]): string {
  const explicitRoot = process.env.E2E_ARTIFACTS_DIR;
  if (!explicitRoot) return testInfo.outputPath(...parts);

  const spec = segment(basename(testInfo.file, '.spec.ts'));
  const allowed = allowedSpecs();
  if (allowed !== null && !allowed.has(spec)) return testInfo.outputPath(...parts);

  const base = resolve(process.cwd(), explicitRoot);
  const repeatEachIndex = testInfo.repeatEachIndex;
  return resolve(
    base,
    spec,
    ...(repeatEachIndex > 0 ? [`repeat-${repeatEachIndex}`] : []),
    ...parts,
  );
}
