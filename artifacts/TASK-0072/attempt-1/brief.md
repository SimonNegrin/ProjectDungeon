---
type: Task Brief
title: "TASK-0072: brief del intento 1"
description: Objetivos por par en el motor, la tabla, el diagnóstico, la API y el export.
task: TASK-0072
attempt: 1
status: stable
brief_bytes: 2356
read_detail: true
generated: { by: task-lead, at: 2026-11-12T00:20:00Z }
---

# Objetivo

Objetivo editable por par héroe–enemigo (`heroId:enemyId`) propagado a la tabla
de combates, el 4-de-4, la API y el export (`targetsVersion: 2`, `targetsId`
determinista), sin dispersión y sin tocar fórmulas, motor de duelo ni `src/` y
`tests/` de producción.

# No objetivos

- Filtros (TASK-0073), E2E/QA visual (TASK-0074) y `experiment.md`.
- Fórmulas, motor, valores base, `src/`, `tests/`, `index.html`, `public/`.
- Dependencias nuevas.

# Invariantes

- `GUIDE_TARGETS` (75/85/30) sigue por enemigo y no muta.
- `createTargets()` cubre roster × bestiario en orden fijo; fallback 50.
- Enemigo y sus 9 stats siguen en celdas `rowspan`; el objetivo es un input por
  fila, sin `rowspan`.
- Cambiar un objetivo no lanza duelos ni altera `% real`, victorias o empates.
- `overridesId` no depende de los objetivos.
- Resets: enemigos → 4 pares por enemigo a guía; todo → catálogo y 12 pares.

# Criterios de aceptación

`docs/tasks/TASK-0072-exp-003-objetivos-por-par.md#criterios-de-aceptación`.

# Contexto mínimo

- `src/v2/bench.ts`: `BenchTargets`, `createTargets`, `setTarget`,
  `resetTarget(s)`, `diagnoseEnemy`, `diagnoseBench`, `buildBenchExport`,
  `benchExportFileName`.
- `src/bench-ui.ts`: `benchFileName`, `formatBenchSummary`.
- `src/main.ts`: `buildTargetCell`, `renderCombats`, `syncCombats`, resets,
  `renderDetail`, API.
- `src/ui.ts`: `BenchSnapshot`, `V2ExperimentApi`.
- Requisito R-005, R-006, R-017–R-020 y T-001–T-004, T-006–T-008, T-010, T-012
  en `docs/requirements/REQ-028-ajuste-interactivo-balance.md`.
- Diseño exacto, formatos y tests: `brief-detalle.md`.

# Artefactos

`artifacts/TASK-0072/attempt-1/`: `report.md`, `test-output.txt`,
`verify-output.txt`, `logs/`. Sin capturas: TASK-0074.

# Riesgos

- `tsc` compila `tests/e2e`: adapta solo los tipos de `EnemyDiagnosis.target` en
  `experiment-bench.spec.ts`; no reescribas el E2E (TASK-0074) ni ejecutes
  `test:e2e`.
- Si `verify` falla por el timeout ajeno de EXP-004, repite una vez y documenta.
- Sin decisiones creativas abiertas.
