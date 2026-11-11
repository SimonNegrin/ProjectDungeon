---
type: Task
id: TASK-0073
title: "EXP-003: filtros de las tres tablas"
description: Filtros de texto por héroe y enemigo en combates, por nombre y unidades en armas y por nombre en héroes; solo de vista, con celdas compartidas ajustadas.
status: stable
task_status: backlog
task_type: experiment
requirement: REQ-028
requirement_ids: [R-001, R-002, R-015, R-021, R-022, R-023, R-024, T-004, T-005, T-011]
depends_on: [TASK-0072]
unlocks: [TASK-0074]
created_at: 2026-11-11T23:50:00Z
completed_at:
assignee: task-runner
attempts: 0
artifacts: artifacts/TASK-0073/
priority: P1
risk: low
review_required: true
generated: { by: deepseek/v4.1-flash, at: 2026-11-11T23:50:00Z }
verified:
---

# Objetivo

Añadir filtros de texto a las tres tablas de
[REQ-028](../requirements/REQ-028-ajuste-interactivo-balance.md) para encontrar
registros en catálogos que crecerán. Combates tiene dos filtros, héroe y enemigo;
Armas busca también en las unidades que usan el arma; Héroes busca por nombre.
Los filtros son solo de vista.

# Contexto

- `experiments/EXP-003-mesa-combate/src/main.ts`: `renderCombats`,
  `renderWeapons`, `renderHeroes`, `syncCombats`, `syncWeapons`, `syncHeroes`.
- `experiments/EXP-003-mesa-combate/src/bench-ui.ts`: helpers puros y formato de
  tablas.
- `experiments/EXP-003-mesa-combate/src/experiment.css`: cabeceras y toolbar.
- Requisito: [R-021 a R-024](../requirements/REQ-028-ajuste-interactivo-balance.md#filtros).

# Criterios de aceptación

- [ ] La cabecera de Combates tiene dos campos etiquetados, **héroe** y
      **enemigo**; Armas tiene uno; Héroes tiene uno. Cada campo tiene botón para
      limpiar.
- [ ] La coincidencia es por subcadena, sin distinguir mayúsculas ni tildes:
      «clerigo» encuentra Clérigo, «CENTINELA» encuentra Centinela y
      «guerrero» en Armas muestra las armas que usa el Guerrero.
- [ ] En Combates, el filtro de héroe solo mira el nombre del héroe y el de
      enemigo solo el del enemigo. El orden de los bloques y las filas se
      conserva.
- [ ] Al filtrar, se ocultan las filas que no coinciden; las celdas agrupadas del
      enemigo se ajustan al número de filas visibles y un bloque sin filas
      visibles desaparece. Filtrar por un héroe deja una fila por bloque; filtrar
      por un enemigo deja sus cuatro filas.
- [ ] Si no hay resultados, la tabla muestra un mensaje legible y el campo no
      pierde el foco. Limpiar el filtro restaura todas las filas.
- [ ] Los filtros no lanzan duelos, no cambian `% real`, 4-de-4, diagnóstico ni
      export, y los resets no los modifican. Se conservan al editar un stat, al
      recalcular y al cambiar el otro filtro.
- [ ] Los filtros se apoyan en funciones puras de normalización y coincidencia, y
      en un cálculo de filas visibles; la UI reconstruye solo las filas visibles
      y mantiene el foco en el campo de filtro.
- [ ] Tests de DOM y de helpers cubren tildes, mayúsculas, unidades de arma,
      `rowspan` ajustado, bloques vacíos y ausencia de medición.
- [ ] El layout sigue sin overflow horizontal de documento a 1280×720;
      `pnpm run verify` pasa.
- [ ] Sin cambios en el motor, las fórmulas, los valores base, `src/`, `tests/`,
      `index.html` ni `public/` de producción.

# Plan de test

- Unitario: normalización sin diacríticos, coincidencia por subcadena, filtro de
  armas por unidades, filas visibles y `rowspan` esperado.
- Integración: escribir en cada filtro, limpiar, editar un stat mientras hay
  filtro y comprobar que la tabla no se rompe y no se mide de nuevo.
- E2E / visual: lo cubre [TASK-0074](TASK-0074-exp-003-objetivos-filtros-e2e.md).
- Manual: buscar «zombi» sin resultados, «guerrero» en Armas y «centinela» en
  Combates.

# Evidencia esperada

- [ ] Informe en `artifacts/TASK-0073/attempt-1/report.md`
- [ ] Salida de `pnpm run verify`
- [ ] Capturas de los filtros si el intento incluye QA visual
- [ ] Commit SHA

# Restricciones

- No cambiar objetivos, diagnóstico ni export: son
  [TASK-0072](TASK-0072-exp-003-objetivos-por-par.md).
- No editar `experiment.md`; lo actualiza `requirements-writer`.
- No añadir dependencias ni filtros por stats, rangos o arma.

# No objetivos

- Filtrar la tabla de combates por arma o por stats.
- Persistir filtros en URL, export o almacenamiento local.
- Plegar o paginar bloques.
- E2E y QA visual finales.
