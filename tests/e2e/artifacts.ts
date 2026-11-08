import { basename, resolve } from 'node:path';
import type { TestInfo } from '@playwright/test';

/**
 * Carpeta raíz de la evidencia de una corrida explícita, por ejemplo
 * `artifacts/<TASK>/attempt-N`. Se interpreta desde la raíz del repo, que es
 * el directorio de ejecución de Playwright.
 */
const explicitRoot = process.env.E2E_ARTIFACTS_DIR;

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
 *   subdirectorio por spec y, cuando `--repeat-each` está activo, otro por
 *   repetición. Así dos workers nunca comparten PNG/JSON/log.
 *
 * No cambia el nombre del archivo: `screenshots/frame.png` sigue llamándose
 * `frame.png`.
 */
export function artifactPath(testInfo: TestInfo, ...parts: string[]): string {
  if (!explicitRoot) return testInfo.outputPath(...parts);

  const base = resolve(process.cwd(), explicitRoot);
  const spec = segment(basename(testInfo.file, '.spec.ts'));
  const repeated = testInfo.project.repeatEach > 1;
  return resolve(
    base,
    spec,
    ...(repeated ? [`repeat-${testInfo.repeatEachIndex}`] : []),
    ...parts,
  );
}
