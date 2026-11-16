---
type: Task
id: TASK-0173
title: "Arnés: test del gate del brief"
description: "Cubrir con tests la función briefCheck de scripts/lib/attempt.mjs: sin exigencia en el intento 1, fallo en el intento 2 sin fichero y aceptación con fichero y tamaño."
status: draft
task_status: in_progress
task_type: test
scope: [tests/]
requirement: HARNESS
requirement_ids: []
depends_on: []
unlocks: []
created_at: 2026-11-16T19:32:06Z
completed_at:
assignee: task-runner
attempts: 0
artifacts: artifacts/TASK-0173/
priority: P3
risk: low
review_required: false
generated: { by: deepseek/v4.1-flash, at: 2026-11-16T19:32:06Z }
verified:
---

# Objetivo

Que el gate del brief en `verify:task` tenga tests que cubran las dos rutas
—reintento sin brief y reintento con brief— sin montar un repositorio.

# Criterios de aceptación

- [ ] `tests/unit/verify-task-brief.test.ts` importa `briefCheck` de
      `scripts/lib/attempt.mjs` y cubre cuatro casos: intento 1 devuelve `null`,
      intento 2 sin `brief.md` devuelve `ok: false` con el detalle
      `falta attempt-2/brief.md en un reintento`, intento 3 con `brief.md`
      devuelve `ok: true` y el tamaño en bytes, y sin carpeta o sin intento
      devuelve `null`.
- [ ] Los fixtures viven en un directorio temporal y se borran al terminar.
- [ ] `pnpm exec vitest run tests/unit/verify-task-brief.test.ts` pasa.
- [ ] `pnpm run verify` pasa sin cambios fuera de `tests/`.

# Plan de test

- Unitario: el fichero nuevo, cuatro casos de `briefCheck`.
- Integración: no aplica; la función es pura y el CLI ya se comprobó a mano.
- E2E / visual: no.
- Manual: no.

# Evidencia esperada

- [ ] Informe en `artifacts/TASK-0173/attempt-1/report.md`
- [ ] Salida de `pnpm exec vitest run tests/unit/verify-task-brief.test.ts`
- [ ] Commit SHA

# Restricciones

- No tocar `scripts/`: `briefCheck` ya existe en la base y su comportamiento no
  se cambia.
- No probar el CLI completo ni reescribir `verify-task.mjs`.
- Usar `node:fs`, `node:os` y `node:path`; sin dependencias nuevas.

# No objetivos

- Añadir un gate nuevo o cambiar los mensajes del actual.
- Cubrir el resto de comprobaciones de `verify:task`.
