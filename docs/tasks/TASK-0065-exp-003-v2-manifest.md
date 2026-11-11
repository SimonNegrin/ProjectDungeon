---
type: Task
id: TASK-0065
title: "EXP-003 v2.0: manifest del índice"
description: Actualizar la entrada de EXP-003 en experiments/manifest.ts para que el índice navegable muestre la v2.0 y el estado de balance pendiente.
status: stable
task_status: done
task_type: docs
requirement: REQ-027
requirement_ids: [REQ-027]
depends_on: [TASK-0064]
unlocks: []
created_at: 2026-11-11T16:05:00Z
completed_at: 2026-11-11T16:09:00Z
assignee: task-runner
attempts: 1
artifacts: artifacts/TASK-0065/
priority: P2
risk: low
review_required: false
generated: { by: deepseek/v4.1-flash, at: 2026-11-11T16:05:00Z }
verified:
  - by: task-lead
    at: 2026-11-11T16:09:00Z
    note: >-
      Verificación independiente en task/TASK-0065, fusionada en main (`c8fbc99`).
      Diff limitado a la entrada EXP-003 de `experiments/manifest.ts` y artefactos;
      sin cambios en tests, `experiment.md`, motor, página, `src/` de producción ni
      dependencias. Re-ejecutado `pnpm run verify` OK (docs 333, config, 903/903,
      tsc, build y bundle); índice `/experiments/` revisado en Chromium: tarjeta
      EXP-003 · ready con título, pregunta y descripción v2.0 y enlace intacto.
      Captura en `artifacts/TASK-0065/attempt-1/index-exp-003.png`.
---

# Objetivo

Actualizar solo la entrada de EXP-003 en `experiments/manifest.ts` para que el
índice navegable de experimentos describa la v2.0: título, descripción, pregunta
y estado `ready`. El resto del manifiesto no cambia.

# Criterios de aceptación

- [x] La entrada `EXP-003` usa el título de la v2.0 y una descripción que
      menciona catálogos data-driven, acciones, magia/maná y réplica.
- [x] La pregunta del manifiesto coincide con la de `experiment.md` y
      `experiments/EXP-003-mesa-combate/src/ui.ts`.
- [x] El estado es `ready` (construido, balance pendiente de aprobación del
      usuario), no `decided`.
- [x] `path` sigue siendo `/experiments/EXP-003-mesa-combate/` y no cambia
      ninguna otra entrada.
- [x] `pnpm run docs:check` pasa y los tests siguen en verde.

# Plan de test

- Unitario: no aplica.
- Integración: arrancar el índice de experimentos y comprobar que la tarjeta de
  EXP-003 muestra la v2.0.
- Manual: leer la tarjeta en `/experiments/`.

# Evidencia esperada

- [x] Informe en `artifacts/TASK-0065/attempt-1/report.md`
- [x] `docs-check-output.txt` y `test-output.txt`
- [x] Commit SHA (`17e4490` implementación; `c8fbc99` artefactos)
- [x] Captura del índice: `artifacts/TASK-0065/attempt-1/index-exp-003.png`

# Restricciones

- Solo `experiments/manifest.ts`; no tocar `experiment.md`, `src/` de producción
  ni dependencias.

# No objetivos

- Cambiar el motor, la página o los resultados.
- Aprobar valores de balance.
