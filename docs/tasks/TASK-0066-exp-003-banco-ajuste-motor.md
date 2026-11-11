---
type: Task
id: TASK-0066
title: "EXP-003: motor y datos del banco de ajuste"
description: Catálogo de trabajo, objetivos por enemigo, recálculo de filas afectadas, diagnóstico 4-de-4 y export reproducible, sin tocar el catálogo base.
status: stable
task_status: done
task_type: experiment
requirement: REQ-028
requirement_ids: [R-001, R-002, R-003, R-004, R-007, R-008, R-009, R-010, R-012, T-001, T-002, T-004, T-006, T-007, T-008]
depends_on: []
unlocks: [TASK-0067]
created_at: 2026-11-11T20:20:00Z
completed_at: 2026-11-11T20:55:00Z
assignee: task-runner
attempts: 1
artifacts: artifacts/TASK-0066/
priority: P1
risk: medium
review_required: true
generated: { by: deepseek/v4.1-flash, at: 2026-11-11T20:20:00Z }
verified:
  - by: task-lead
    at: 2026-11-11T20:55:00Z
    note: >-
      Verificación independiente en task/TASK-0066, fusionada en main
      (`d240a0c`). Diff limitado a `src/v2/bench.ts`, `bench.test.ts`, el export
      de `v2/index.ts` y artefactos. Re-ejecutado `pnpm run verify`: 925/925
      tests, `tsc`, build y bundle OK; el primer intento agotó el timeout de un
      test pesado ajeno (EXP-004), que pasó solo y en la segunda ejecución.
      Comprobados catálogo base intacto, objetivos, filas afectadas,
      diagnóstico/avisos, reset y determinismo del export.
---

# Objetivo

Extender el estado de EXP-003 para que la página pueda trabajar con un catálogo
ajustado y objetivos por enemigo sin mutar `CATALOG`, recalcular solo los
emparejamientos afectados y producir el diagnóstico y el export que consumirá la
UI de [TASK-0067](TASK-0067-exp-003-banco-ajuste-ui.md).

# Contexto

- `experiments/EXP-003-mesa-combate/src/v2/catalog.ts`: catálogo base inmutable.
- `experiments/EXP-003-mesa-combate/src/v2/measure.ts`: `measureMatchups` ya
  acepta `catalog`; hoy siempre mide los 12 emparejamientos.
- `experiments/EXP-003-mesa-combate/src/v2/types.ts`: contratos de catálogo,
  plantillas y métricas.
- Requisito: [REQ-028](../requirements/REQ-028-ajuste-interactivo-balance.md).

# Criterios de aceptación

- [x] Existe un catálogo de trabajo que parte de `CATALOG`, aplica overrides de
      enemigos y armas y nunca muta el catálogo base; un reset restaura la base.
- [x] Los objetivos por enemigo existen con guía inicial 75/85/30, validación
      entera 0–100 y reset a la guía; el usuario puede fijar otros valores.
- [x] La medición acepta el catálogo ajustado y puede recalcular solo las filas
      afectadas por un enemigo (sus 4) o por un arma (todas las unidades que la
      equipan), manteniendo semilla y duelos.
- [x] El diagnóstico por enemigo calcula objetivo, win % por fila, delta, filas
      dentro del margen de ±5 pp, recuento 4-de-4, mínimo/máximo/dispersión y la
      lista de filas fuera con su desviación.
- [x] El diagnóstico marca problemáticas sin decidir: dispersión entre héroes
      superior a 10 pp (bloque compartido que no puede centrar las 4 filas),
      filas fuera y efecto de un arma global sobre ambos bandos.
- [x] El export incluye catálogo ajustado, objetivos, overrides y diagnóstico,
      con un identificador determinista de overrides y sin marca de tiempo; dos
      ejecuciones con los mismos valores producen el mismo JSON.
- [x] El nombre de archivo o el payload distingue una ejecución ajustada de la
      base sin sobrescribir el export base.
- [x] Tests unitarios cubren overlay, objetivos, filas afectadas, diagnóstico,
      reset y determinismo; `pnpm run verify` pasa.
- [x] No cambian las reglas del duelo, el escenario 1D, `src/` de producción,
      `tests/` de producción, `index.html` ni `public/`.

# Plan de test

- Unitario: overlay y reset; selección de filas afectadas; diagnóstico 4-de-4 y
  dispersión; objetivo válido/inválido; hash determinista.
- Integración: dos mediciones con los mismos overrides producen el mismo
  payload; cambiar un enemigo no altera las filas de los otros.
- E2E / visual: no aplica en esta tarea; lo cubre
  [TASK-0068](TASK-0068-exp-003-banco-ajuste-e2e.md).
- Manual: comparar el diagnóstico de un enemigo con sus cuatro filas.

# Evidencia esperada

- [x] Informe en `artifacts/TASK-0066/attempt-1/report.md`
- [x] Salida de `pnpm run verify`
- [x] Commit SHA en la rama `task/TASK-0066`

# Restricciones

- No tocar el catálogo de producción ni importar desde `src/`.
- No cambiar fórmulas, IA, escenario ni reglas de combate.
- No añadir dependencias.
- No editar `experiment.md`; lo actualiza `requirements-writer`.

# No objetivos

- Construir la UI, la tabla de armas o los controles de la página
  ([TASK-0067](TASK-0067-exp-003-banco-ajuste-ui.md)).
- E2E, capturas y QA visual
  ([TASK-0068](TASK-0068-exp-003-banco-ajuste-e2e.md)).
- Aprobar valores de balance o tocar héroes, hechizos o grupos 2v2.
