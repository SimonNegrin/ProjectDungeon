---
type: Task
id: TASK-0074
title: "EXP-003: E2E y QA visual de objetivos por par y filtros"
description: Cubrir con E2E y QA visual el objetivo editable por par, el 4-de-4 sin dispersión, los filtros de las tres tablas y el export con targetsVersion 2.
status: stable
task_status: backlog
task_type: experiment
requirement: REQ-028
requirement_ids: [R-005, R-006, R-015, R-019, R-021, R-022, R-023, R-024, T-004, T-005, T-007, T-008, T-009]
depends_on: [TASK-0073]
unlocks: []
created_at: 2026-11-11T23:50:00Z
completed_at:
assignee: task-runner
attempts: 0
artifacts: artifacts/TASK-0074/
priority: P1
risk: low
review_required: true
generated: { by: deepseek/v4.1-flash, at: 2026-11-11T23:50:00Z }
verified:
---

# Objetivo

Añadir la cobertura E2E y la QA visual de los objetivos por par y los filtros de
[REQ-028](../requirements/REQ-028-ajuste-interactivo-balance.md), con evidencia de
que el objetivo de un par no arrastra a los otros, que los filtros solo cambian
la vista y que el export conserva todos los objetivos.

# Contexto

- UI de [TASK-0072](TASK-0072-exp-003-objetivos-por-par.md) y
  [TASK-0073](TASK-0073-exp-003-filtros-tablas.md).
- Specs actuales: `tests/e2e/experiment-bench.spec.ts` y
  `tests/e2e/experiment-combat.spec.ts`.
- Modo determinista: `?test=1&seed=1017`.
- Convención de capturas: `docs/harness/visual-qa.md`.

# Criterios de aceptación

- [ ] E2E: editar el objetivo de Guerrero vs Centinela cambia su delta, su estado
      y el 4-de-4 del Centinela, pero no el objetivo ni el `% real` de los otros
      tres héroes.
- [ ] E2E: dos pares del mismo enemigo con objetivos distintos producen deltas
      coherentes y un 4-de-4 calculado contra cada objetivo, sin aviso de
      dispersión.
- [ ] E2E: «Restablecer enemigos» devuelve a la guía los cuatro objetivos de cada
      enemigo y no toca armas ni héroes; «Restablecer todo» devuelve los 12.
- [ ] E2E: filtrar Combates por héroe deja una fila por bloque con el `rowspan`
      ajustado; filtrar por enemigo deja sus cuatro filas; combinar ambos filtros
      da la intersección; limpiar restaura todas las filas.
- [ ] E2E: un filtro sin coincidencias muestra el mensaje de «sin resultados» y
      no deja la tabla vacía sin explicación. El campo conserva el foco al
      escribir.
- [ ] E2E: filtrar Armas por «guerrero» muestra las armas que usa el Guerrero y
      filtrar Héroes por «clerigo» encuentra Clérigo; mayúsculas y tildes no
      afectan.
- [ ] E2E: los filtros no cambian `% real`, 4-de-4 ni el JSON exportado; el export
      incluye `targets` por par, `targetsVersion: 2` y `targetsId`, y dos
      ejecuciones con el mismo estado coinciden.
- [ ] QA visual a 1280×720: las tres tablas, los cuatro campos de filtro y el
      objetivo por fila son legibles, sin overflow horizontal de documento. A
      900×700 el scroll, si existe, queda dentro de la tabla.
- [ ] Capturas de Combates con filtro de héroe, con filtro de enemigo y sin
      resultados; de Armas filtradas por unidad; de Héroes filtrados; y del
      objetivo por fila antes y después de editarlo.
- [ ] `pnpm run verify` y `pnpm run test:e2e` pasan; capturas y salidas quedan en
      `artifacts/TASK-0074/attempt-1/`.
- [ ] Sin cambios en reglas, fórmulas, `src/`, `tests/`, `index.html` ni
      `public/` de producción.

# Plan de test

- E2E: objetivo por par, 4-de-4, resets, filtros de las tres tablas, combinación,
  sin resultados y export en modo determinista.
- Visual: capturas a 1280×720 y 900×700 con filtros activos y objetivo editado.
- Integración: filtros activos no alteran el snapshot ni el export; mismo estado
  produce el mismo JSON.
- Manual: recorrer el flujo completo y comprobar que se entiende sin explicación
  externa.

# Evidencia esperada

- [ ] Informe en `artifacts/TASK-0074/attempt-1/report.md`
- [ ] Salidas de `pnpm run verify` y `pnpm run test:e2e`
- [ ] Capturas en `artifacts/TASK-0074/attempt-1/screenshots/`
- [ ] Commit SHA en la rama `task/TASK-0074`

# Restricciones

- No cambiar el motor ni los valores base para hacer pasar los tests.
- No debilitar los E2E existentes; adaptarlos al nuevo modelo de objetivos y a
  los filtros.
- No editar `experiment.md`; lo actualiza `requirements-writer`.

# No objetivos

- Funcionalidad nueva o cambios de diseño no acordados.
- Aprobar objetivos o valores de balance.
- Filtros por stats, rangos o arma; plegar bloques; persistir filtros.
