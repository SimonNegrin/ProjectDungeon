---
type: Task
id: TASK-0072
title: "EXP-003: objetivos por par, diagnóstico y export"
description: Objetivo editable por héroe–enemigo, guía heredada, 4-de-4 sin dispersión, API por par y export con targetsVersion 2.
status: stable
task_status: ready
task_type: experiment
requirement: REQ-028
requirement_ids: [R-001, R-002, R-005, R-006, R-007, R-016, R-017, R-018, R-019, R-020, T-001, T-002, T-003, T-004, T-006, T-007, T-008, T-010, T-012]
depends_on: []
unlocks: [TASK-0073]
created_at: 2026-11-11T23:50:00Z
completed_at:
assignee: task-runner
attempts: 0
artifacts: artifacts/TASK-0072/
priority: P1
risk: medium
review_required: true
generated: { by: deepseek/v4.1-flash, at: 2026-11-11T23:50:00Z }
verified:
---

# Objetivo

Convertir el objetivo de victorias en un valor editable por par héroe–enemigo y
propagarlo a la tabla de combates, el diagnóstico, la API y el export de
[REQ-028](../requirements/REQ-028-ajuste-interactivo-balance.md). Los filtros de
tabla son [TASK-0073](TASK-0073-exp-003-filtros-tablas.md).

# Contexto

- `experiments/EXP-003-mesa-combate/src/v2/bench.ts`: `GUIDE_TARGETS`,
  `BenchTargets`, `diagnoseEnemy`, `diagnoseBench`, `buildBenchExport`.
- `experiments/EXP-003-mesa-combate/src/bench-ui.ts`: validación de objetivo,
  formato del 4-de-4 y resumen del export.
- `experiments/EXP-003-mesa-combate/src/main.ts`: celda compartida del objetivo,
  resets, export y API.
- Requisito: [R-005, R-006, R-017, R-018, R-019 y T-007, T-008, T-010,
  T-012](../requirements/REQ-028-ajuste-interactivo-balance.md#requisitos-tecnicos).

# Criterios de aceptación

- [ ] Los objetivos se guardan por par con clave `heroId:enemyId`, cubren todo el
      producto roster × bestiario en orden fijo y no mutan la guía. Un enemigo sin
      guía recibe 50 % en sus cuatro pares.
- [ ] Cada fila de combates tiene su propio input `% objetivo`; el enemigo y sus
      nueve stats siguen en celdas agrupadas, pero el objetivo ya no usa
      `rowspan`.
- [ ] Editar el objetivo de un par actualiza solo el delta, el estado dentro/fuera
      y el 4-de-4 de su fila; no lanza duelos ni cambia el `% real` de las demás.
- [ ] El 4-de-4 usa el objetivo de cada fila: «4/4» si los cuatro pares están a
      ±5 pp de su propio objetivo; la lista de fuera conserva héroe y delta. El
      aviso y el cálculo de dispersión desaparecen del diagnóstico, la UI y el
      export.
- [ ] Restablecer enemigos devuelve a la guía los cuatro objetivos de cada
      enemigo; restablecer todo devuelve catálogo y los 12 objetivos.
- [ ] La API expone `getTargets` por par, `setTarget(heroId, enemyId, value)` y
      `resetTarget(heroId, enemyId)`; el resto de operaciones se conserva.
- [ ] El export incluye `targets` por par, `targetsVersion: 2` y `targetsId`
      determinista; sin timestamp. Cambiar un objetivo cambia `targetsId` y el
      nombre de descarga, pero no `overridesId`.
- [ ] El resumen del export agrupa los objetivos por enemigo y no lista una línea
      por par; el JSON conserva todos los pares.
- [ ] Tests unitarios y de integración cubren claves, guía heredada, fallback,
      4-de-4 con objetivos distintos, ausencia de dispersión, resets, API y
      determinismo del export. `pnpm run verify` pasa.
- [ ] Sin cambios en fórmulas, motor de duelo, `src/`, `tests/`, `index.html` ni
      `public/` de producción.

# Plan de test

- Unitario: `BenchTargets`, validación 0–100, guía por enemigo, fallback 50,
  `diagnoseEnemy` con objetivos distintos, `targetsId` y export determinista.
- Integración: API de objetivos por par; reset de un enemigo y global; mismo
  estado produce el mismo JSON.
- E2E / visual: lo cubre [TASK-0074](TASK-0074-exp-003-objetivos-filtros-e2e.md).
- Manual: editar dos objetivos del mismo enemigo y comprobar que los 4/4 y los
  deltas no se mezclan.

# Evidencia esperada

- [ ] Informe en `artifacts/TASK-0072/attempt-1/report.md`
- [ ] Salida de `pnpm run verify`
- [ ] Commit SHA

# Restricciones

- No cambiar el motor de duelo, las fórmulas ni los valores base.
- No implementar los filtros: son [TASK-0073](TASK-0073-exp-003-filtros-tablas.md).
- No editar `experiment.md`; lo actualiza `requirements-writer`.
- No añadir dependencias.

# No objetivos

- Filtros, E2E y QA visual.
- Aprobar el balance o trasladar valores a producción.
- Plegar bloques, paginar o persistir los objetivos fuera del export.
