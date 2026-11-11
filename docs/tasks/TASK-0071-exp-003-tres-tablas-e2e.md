---
type: Task
id: TASK-0071
title: "EXP-003: E2E y QA visual de las tres tablas"
description: Cubrir con E2E y QA visual la edición inline de combates, armas y héroes, el ancho completo, los recálculos quirúrgicos, los resets y el export.
status: stable
task_status: done
task_type: experiment
requirement: REQ-028
requirement_ids: [R-001, R-002, R-003, R-008, R-009, R-010, R-011, R-012, R-013, R-014, R-015, R-016, R-017, R-018, R-019, T-002, T-004, T-005, T-009]
depends_on: [TASK-0070]
unlocks: []
created_at: 2026-11-11T22:35:00Z
completed_at: 2026-11-11T22:38:47Z
assignee: task-runner
attempts: 1
artifacts: artifacts/TASK-0071/
priority: P1
risk: low
review_required: true
generated: { by: deepseek/v4.1-flash, at: 2026-11-11T22:35:00Z }
verified:
  - by: task-lead
    at: 2026-11-11T22:38:47Z
    note: >-
      Diff completo revisado; 106/106 E2E, 974 tests, verify y bundle OK;
      capturas 1280×720 y 900×700 revisadas; sin cambios en motor, reglas,
      src de producción, index.html ni public. Ajuste CSS mínimo documentado
      para evitar recortes de celdas en la tabla de combates.
---

# Objetivo

Añadir la cobertura E2E y la QA visual de las tres tablas de
[REQ-028](../requirements/REQ-028-ajuste-interactivo-balance.md), con evidencia
de edición inline, celdas compartidas, recálculo quirúrgico, ancho completo,
resets y export.

# Contexto

- UI de [TASK-0070](TASK-0070-exp-003-tres-tablas-ui.md).
- Specs actuales: `tests/e2e/experiment-bench.spec.ts` y
  `tests/e2e/experiment-combat.spec.ts`.
- Modo determinista: `?test=1&seed=1017`.
- Convención de capturas: `docs/harness/visual-qa.md`.

# Criterios de aceptación

- [x] E2E: editar un stat de un enemigo en su bloque compartido recalcula sus 4
      filas y deja intactas las de los otros enemigos; el valor sigue siendo uno
      solo.
- [x] E2E: editar un stat de un héroe recalcula sus 3 filas; cambiar su arma
      inicial recalcula sus 3 filas y actualiza las unidades de la tabla de
      armas.
- [x] E2E: editar acierto o daño de un arma recalcula todas las filas donde se
      use, incluidas las de héroes y enemigos, sin duplicar la fila compartida.
- [x] E2E: cambiar el objetivo de un enemigo actualiza delta y 4-de-4 sin
      relanzar duelos; el `% real` conserva el valor.
- [x] E2E: reset por tabla y global; tras el reset la medición vuelve a la base
      y el export deja de mostrar overrides.
- [x] E2E: el export contiene catálogo ajustado (enemigos, armas y héroes),
      objetivos, diagnóstico e identificador de overrides; dos ejecuciones con
      el mismo estado coinciden.
- [x] QA visual a 1280×720: las tres tablas usan el ancho completo, no hay
      overflow horizontal de documento y los inputs son legibles. A 900×700 el
      scroll, si existe, queda dentro de la tabla.
- [x] Foco visible, celdas agrupadas comprensibles, dentro/fuera por texto y no
      solo por color; el detalle del emparejamiento sigue actualizándose.
- [x] `pnpm run verify` y `pnpm run test:e2e` pasan; capturas y salidas quedan en
      `artifacts/TASK-0071/attempt-1/`.
- [x] Sin cambios en reglas, fórmulas, `src/` de producción, `tests/` de
      producción, `index.html` ni `public/`.

# Plan de test

- E2E: enemigo compartido, héroe, arma, objetivo, resets y export en modo
  determinista.
- Visual: capturas de las tres tablas a 1280×720 y 900×700, foco y detalle.
- Integración: mismo estado produce el mismo snapshot y export.
- Manual: recorrer el flujo completo y comprobar que el recálculo se entiende sin
  explicación externa.

# Evidencia esperada

- [x] Informe en `artifacts/TASK-0071/attempt-1/report.md`
- [x] Salidas de `pnpm run verify` y `pnpm run test:e2e`
- [x] Capturas en `artifacts/TASK-0071/attempt-1/screenshots/`
- [x] Commit SHA en la rama `task/TASK-0071`

# Restricciones

- No cambiar el motor ni los valores base para hacer pasar los tests.
- No debilitar los E2E existentes; adaptarlos al nuevo layout.
- No editar `experiment.md`; lo actualiza `requirements-writer`.

# No objetivos

- Añadir funcionalidad nueva o cambiar el diseño acordado.
- Aprobar objetivos o valores de balance.
- MP, hechizos, defensa de arma, grupos 2v2 o producción.
