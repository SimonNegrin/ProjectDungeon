---
type: Task
id: TASK-0068
title: "EXP-003: E2E y QA visual del banco de ajuste"
description: Cubrir con E2E y QA visual los objetivos editables, el editor expandible, la tabla de armas, el recálculo afectado, el reset y el export del banco de ajuste.
status: stable
task_status: done
task_type: experiment
requirement: REQ-028
requirement_ids: [R-003, R-004, R-005, R-007, R-008, R-011, R-012, T-002, T-003, T-005, T-008]
depends_on: [TASK-0067]
unlocks: []
created_at: 2026-11-11T20:20:00Z
completed_at: 2026-11-11T23:55:00Z
assignee: task-runner
attempts: 1
artifacts: artifacts/TASK-0068/
priority: P1
risk: low
review_required: true
generated: { by: deepseek/v4.1-flash, at: 2026-11-11T20:20:00Z }
verified:
  - by: task-lead
    at: 2026-11-11T23:55:00Z
    note: >-
      Verificación independiente en task/TASK-0068, fusionada en main
      (`656c047`). Re-ejecutados `pnpm run verify` (945 tests, build y bundle
      OK), los 11 E2E de bench+combate y la suite completa `pnpm run test:e2e`
      (105/105). Revisados diff, capturas de 1280x720 y 900x700, ausencia de
      desbordamiento del documento, foco visible y dentro/fuera por texto.
      Detalle en `artifacts/TASK-0068/attempt-1/verification-lead.md`.
---

# Objetivo

Añadir la cobertura E2E y la QA visual del banco de ajuste de
[REQ-028](../requirements/REQ-028-ajuste-interactivo-balance.md), con evidencia
de que el ajuste compartido, el recálculo afectado, el reset y el export
funcionan en la página real.

# Contexto

- Página y API de [TASK-0067](TASK-0067-exp-003-banco-ajuste-ui.md).
- Specs actuales: `tests/e2e/experiment-combat.spec.ts`.
- Modo determinista: `?test=1&seed=1017`.
- Convención de capturas: `docs/harness/visual-qa.md`.

# Criterios de aceptación

- [x] E2E: editar el PV de un enemigo y comprobar que se recalculan sus cuatro
      filas, sin cambiar las filas de los otros enemigos.
- [x] E2E: cambiar el objetivo de un enemigo y comprobar que cambian el delta y
      el 4-de-4 de sus filas.
- [x] E2E: editar acierto o daño de un arma y comprobar que se recalculan los
      emparejamientos de las unidades que la equipan.
- [x] E2E: reset por enemigo y global; tras el reset la medición vuelve a la
      base y el export deja de mostrar overrides.
- [x] E2E: el export contiene catálogo ajustado, objetivos, diagnóstico e
      identificador de overrides; dos ejecuciones con el mismo estado coinciden.
- [x] QA visual a 1280×720 y 900×700: editor legible, sin desbordamientos,
      dentro/fuera no depende solo del color y los campos tienen foco visible.
- [x] `pnpm run verify` y `pnpm run test:e2e` pasan; capturas y salidas quedan en
      `artifacts/TASK-0068/attempt-1/`.
- [x] Sin cambios en reglas, `src/` de producción, `tests/` de producción,
      `index.html` ni `public/`.

# Plan de test

- E2E: edición de enemigo, objetivo, arma, reset y export en modo determinista.
- Visual: capturas de la tabla con editor abierto y de la tabla de armas.
- Integración: mismo estado produce el mismo snapshot y export.
- Manual: recorrer el flujo completo y comprobar que el diagnóstico se entiende
  sin explicación externa.

# Evidencia esperada

- [x] Informe en `artifacts/TASK-0068/attempt-1/report.md`
- [x] Salidas de `pnpm run verify` y `pnpm run test:e2e`
- [x] Capturas en `artifacts/TASK-0068/attempt-1/screenshots/`
- [x] Commit SHA en la rama `task/TASK-0068`

# Restricciones

- No cambiar el motor ni los valores base para hacer pasar los tests.
- No debilitar los E2E existentes.
- No editar `experiment.md`; lo actualiza `requirements-writer`.

# No objetivos

- Añadir funcionalidad nueva o cambiar la UI acordada.
- Aprobar objetivos o valores de balance.
- Grupos 2v2, héroes, hechizos o producción.
