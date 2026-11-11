---
type: Task Brief
title: "TASK-0067: brief del intento 1"
description: UI del banco de ajuste de EXP-003 sobre el motor de TASK-0066.
task: TASK-0067
attempt: 1
status: stable
brief_bytes: 3002
read_detail: true
generated: { by: deepseek/v4.1-flash, at: 2026-11-11T21:10:00Z }
---

# Objetivo

Convertir la página de EXP-003 en el banco de ajuste de
[REQ-028](../../../docs/requirements/REQ-028-ajuste-interactivo-balance.md):
objetivos editables por enemigo, editor expandible con stats compartidos, tabla
global de armas, diagnóstico 4-de-4, recálculo de filas afectadas, reset y
export. Trabaja sobre el motor puro ya cerrado en
[TASK-0066](../../../docs/tasks/TASK-0066-exp-003-banco-ajuste-motor.md).

Lee `brief-detalle.md` antes de implementar: fija el contrato de API, test IDs,
normalización de overrides y compatibilidad con el E2E existente.

# No objetivos

- E2E, QA visual y capturas finales
  ([TASK-0068](../../../docs/tasks/TASK-0068-exp-003-banco-ajuste-e2e.md)).
- Cambiar el motor de duelo, fórmulas, `measure.ts`, `duel.ts`, `catalog.ts` ni
  valores base; editar `experiment.md`.
- Editar `src/`, `tests/` de producción, `index.html` ni `public/`.
- Añadir dependencias.

# Invariantes

- `CATALOG` y sus objetos no se mutan: todo ajuste vive en overrides y objetivos.
- No aplicar overrides vacíos ni campos iguales a la base; normaliza antes de
  medir/exportar.
- Semilla, duelos y orden de las 12 filas se conservan; solo se recalculan las
  filas afectadas.
- Sin `Math.random`, `Date.now` ni marcas de tiempo en el runtime del banco.
- `?test=1&seed=1017` sigue siendo determinista y la API existente no se rompe.
- Contraste y texto además del color para dentro/fuera; `aria-live` para el
  recálculo; etiquetas asociadas y foco visible.

# Criterios de aceptación

Viven en
`docs/tasks/TASK-0067-exp-003-banco-ajuste-ui.md#criterios-de-aceptación`; no
copiar.

# Contexto mínimo

- `experiments/EXP-003-mesa-combate/src/main.ts`: página, tabla, detalle, export
  y `window.__experiment`.
- `src/ui.ts`: helpers y tipo `V2ExperimentApi`.
- `src/v2/bench.ts` (TASK-0066): overrides, objetivos, `recalculateMatchups`,
  `diagnoseBench`, `buildBenchExport`, `benchExportFileName`, `overridesId`.
- `src/v2/catalog.ts` y `src/v2/types.ts`: catálogo y tipos; nada de listas de
  enemigos/armas fijas en la UI.
- `src/experiment.css`: estilos locales.
- Requisito: `docs/requirements/REQ-028-ajuste-interactivo-balance.md`.

# Artefactos

- `report.md`, `test-output.txt`, `verify-output.txt`, `screenshots/`, commit
  SHA.

# Riesgos y decisiones abiertas

- Compatibilidad: el E2E actual espera `EXP-003-v2.0-seed-1017-duels-1000.json`
  cuando no hay overrides y `getDecision()`/`snapshot()` deben seguir siendo
  deterministas. Respétalo (detalle en el anexo).
- El recálculo de 4 × 1.000 duelos debe ser diferido, visible y no perder foco.
- No decidas objetivos ni valores de balance; 75/85/30 es solo la guía.
- No debilites ni borres tests existentes.
