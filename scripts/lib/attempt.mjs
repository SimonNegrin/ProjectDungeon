// Entradas obligatorias de un intento. El brief es el contexto del reintento y
// el gate lo exige desde el intento 2; lo comparten `verify-task.mjs` y su test.

import { existsSync, statSync } from 'node:fs';
import { resolve } from 'node:path';

export function briefCheck(attemptDir, attempt) {
  if (!attemptDir || !attempt || attempt < 2) return null;

  const briefPath = resolve(attemptDir, 'brief.md');
  if (!existsSync(briefPath)) {
    return { ok: false, detail: `falta attempt-${attempt}/brief.md en un reintento` };
  }

  return {
    ok: true,
    detail: `attempt-${attempt}/brief.md (${statSync(briefPath).size} B)`,
  };
}
