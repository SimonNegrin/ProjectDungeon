---
type: Task
id: TASK-0069
title: "EXP-003: motor y datos de las tres tablas"
description: Overrides de héroe, bloques compartidos de enemigo, filas afectadas por enemigo/héroe/arma, diagnóstico y export reproducible para la mesa v2.
status: stable
task_status: done
task_type: experiment
requirement: REQ-028
requirement_ids: [R-002, R-003, R-004, R-005, R-008, R-009, R-010, R-011, R-012, R-013, R-014, R-017, R-018, R-019, R-020, T-001, T-002, T-003, T-006, T-007, T-008]
depends_on: []
unlocks: [TASK-0070]
created_at: 2026-11-11T22:35:00Z
completed_at: 2026-11-11T23:58:00Z
assignee: task-runner
attempts: 1
artifacts: artifacts/TASK-0069/
priority: P1
risk: medium
review_required: true
generated: { by: deepseek/v4.1-flash, at: 2026-11-11T22:35:00Z }
verified:
  - by: task-lead
    at: 2026-11-11T23:58:00Z
    note: >-
      Verificación independiente en task/TASK-0069, fusionada en main
      (`7076915`). Revisado el diff completo; re-ejecutados los 71 tests
      focalizados y `pnpm run verify` (959 tests, build y bundle OK). Sin
      cambios fuera de `experiments/EXP-003-mesa-combate/src/**` y artefactos.
      Detalle en `artifacts/TASK-0069/attempt-1/verification-lead.md`.
---

# Objetivo

Extender el motor y el estado del banco de EXP-003 para la v2 de
[REQ-028](../requirements/REQ-028-ajuste-interactivo-balance.md): overrides de
héroes, bloques de enemigo compartidos, selección de filas afectadas por
enemigo/héroe/arma, diagnóstico y export reproducible. La UI de las tres tablas
es [TASK-0070](TASK-0070-exp-003-tres-tablas-ui.md).

# Contexto

- `experiments/EXP-003-mesa-combate/src/v2/bench.ts`: overrides actuales de
  enemigo y arma, `affectedRows`, `recalculateMatchups`, diagnóstico y export.
- `experiments/EXP-003-mesa-combate/src/bench-ui.ts`: validación y campos.
- `experiments/EXP-003-mesa-combate/src/ui.ts`: contrato de la API y export.
- Base completada en [TASK-0066 a TASK-0068](TASK-0066-exp-003-banco-ajuste-motor.md).

# Criterios de aceptación

- [x] El catálogo base sigue inmutable; el catálogo de trabajo aplica overrides
      de enemigos, armas y **héroes** sin mutar `CATALOG`.
- [x] Los overrides de héroe cubren PV, habilidad, fuerza, defensa, resistencia,
      acciones, nivel de magia, armadura, escudo y arma inicial (incluido
      `null`).
- [x] Los stats de enemigo siguen siendo un bloque compartido: un override
      afecta a sus cuatro filas y a ningún otro enemigo.
- [x] La selección de filas afectadas distingue enemigo (4 filas), héroe (3
      filas) y arma (todas las filas donde se use en el catálogo de trabajo),
      deduplicando la fila que comparten espada/daga.
- [x] Cambiar un objetivo actualiza solo el diagnóstico; no vuelve a simular
      duelos.
- [x] El diagnóstico sigue calculando objetivo, win %, delta, dentro/fuera,
      4-de-4, dispersión y avisos de arma global, leyendo armas y héroes del
      catálogo de trabajo.
- [x] El export incluye catálogo ajustado, overrides de enemigo/arma/héroe,
      objetivos, diagnóstico, semilla, duelos e `overridesId` determinista, sin
      timestamp.
- [x] La API se amplía con selección/campos/reset de héroe y reset por tabla,
      sin romper los métodos existentes.
- [x] Tests unitarios cubren overrides de héroe, filas afectadas, objetivo sin
      simulación, diagnóstico, resets, export y determinismo; `pnpm run verify`
      pasa.
- [x] Sin cambios en reglas, fórmulas, escenario, `src/` de producción,
      `tests/` de producción, `index.html` ni `public/`.

# Plan de test

- Unitario: overrides de héroe y reset; `affectedRows` para enemigo/héroe/arma;
  filas deduplicadas; cambio de objetivo sin duelos; export e `overridesId`.
- Integración: dos mediciones con el mismo estado coinciden; cambiar un héroe no
  altera las filas de los otros héroes.
- E2E / visual: lo cubre [TASK-0071](TASK-0071-exp-003-tres-tablas-e2e.md).
- Manual: comprobar los recuentos 4 / 3 / 6 con el catálogo base.

# Evidencia esperada

- [x] Informe en `artifacts/TASK-0069/attempt-1/report.md`
- [x] Salida de `pnpm run verify`
- [x] Commit SHA en la rama `task/TASK-0069`

# Restricciones

- No tocar el catálogo de producción ni importar desde `src/`.
- No cambiar fórmulas, IA, escenario ni reglas de combate.
- No añadir dependencias.
- No editar `experiment.md`; lo actualiza `requirements-writer`.

# No objetivos

- Construir las tres tablas, el layout o la interacción
  ([TASK-0070](TASK-0070-exp-003-tres-tablas-ui.md)).
- E2E, capturas y QA visual
  ([TASK-0071](TASK-0071-exp-003-tres-tablas-e2e.md)).
- MP, hechizos, defensa de arma, grupos 2v2 o producción.
