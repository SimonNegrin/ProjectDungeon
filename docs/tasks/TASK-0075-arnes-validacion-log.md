---
type: Task
id: TASK-0075
title: "Arnés: validar el formato del log en docs:check"
description: "Avisar de entradas de docs/log.md sin formato canónico para que el índice no vuelva a llenarse de párrafos largos."
status: draft
task_status: ready
task_type: harness
requirement: HARNESS
requirement_ids: []
depends_on: []
unlocks: []
created_at: 2026-11-12T12:30:00Z
completed_at:
assignee: task-runner
attempts: 0
artifacts: artifacts/TASK-0075/
priority: P2
risk: low
review_required: true
generated: { by: deepseek/v4.1-flash, at: 2026-11-12T12:30:00Z }
---

# Objetivo

Que `pnpm run docs:check` avise de cualquier entrada de `docs/log.md` que no siga
el formato canónico, para que el índice no pueda volver a llenarse de párrafos
largos. Hoy solo se miden las líneas que ya cumplen el patrón, así que escribir en
otro formato esquiva el tope de 400 caracteres.

# Contexto

- `scripts/validate-docs.mjs`: el bucle del log salta toda línea que no empiece
  por `* YYYY-MM-DD — `.
- El 2026-11-12 se movieron 73 entradas de formato largo a
  [docs/log-detalle.md](../log-detalle.md); el índice queda en 202 entradas
  canónicas y 0 avisos nuevos.
- Regla en [documentación](../harness/documentacion.md#topes) y en
  [AGENTS.md](../../AGENTS.md): el log es un índice de una línea por evento.

# Criterios de aceptación

- [ ] `validate-docs.mjs` emite un aviso con ruta y número de línea para cada
      línea de `docs/log.md` que empiece por `* ` y no cumpla
      `/^\* \d{4}-\d{2}-\d{2} — /`.
- [ ] Las 202 entradas actuales no generan avisos nuevos: la salida sigue en 77
      avisos y 0 errores.
- [ ] El tope de 400 caracteres mantiene su comportamiento: error solo en
      entradas canónicas.
- [ ] Prueba negativa: con una línea `* **Test**: …` añadida temporalmente, el
      aviso aparece con su número de línea; el fichero se restaura y
      `git status --porcelain docs/log.md` queda vacío.
- [ ] `pnpm run docs:check`, `pnpm run config:check` y `pnpm run verify` pasan.
- [ ] Sin cambios en `src/`, `tests/`, `docs/log.md`, `docs/log-detalle.md` ni
      otros documentos.

# Plan de test

- Ejecución sobre el log actual: 0 avisos nuevos.
- Prueba negativa con copia de seguridad del log, aviso comprobado y restauración
  verificada.
- `pnpm run verify`.

# Evidencia esperada

- `artifacts/TASK-0075/attempt-1/logs/docs-check.txt`,
  `docs-check-negativo.txt` y `verify.txt`.
- Diff de `scripts/validate-docs.mjs` y el informe del intento.

# Restricciones

- Solo `scripts/validate-docs.mjs`; sin refactor del validador ni tests de Node
  nuevos.
- Un aviso, no un error: el log es histórico y un error bloquearía cierres por
  una línea antigua.
- No tocar `docs/log.md` ni `docs/log-detalle.md`.

# No objetivos

- Medir el tamaño total del log o de sus secciones.
- Validar el formato de `docs/log-detalle.md`.
- Cambiar los topes de handoff o de tarea.

# Reglas

- El aviso cita `docs/log.md:<línea>` y el formato esperado.
- `LOG_LINE_MAX` no cambia.

# Atomicidad

Un cambio en un script con su verificación; sin dependencias ni efectos en otros
documentos.
