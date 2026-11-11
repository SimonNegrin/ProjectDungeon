---
type: Task Brief
title: "TASK-0068: brief del intento 1"
description: E2E y QA visual del banco de ajuste de EXP-003.
task: TASK-0068
attempt: 1
status: stable
brief_bytes: 2991
read_detail: true
generated: { by: deepseek/v4.1-flash, at: 2026-11-11T23:20:00Z }
---

# Objetivo

Cubrir con E2E y QA visual el banco de ajuste ya implementado en
[TASK-0067](../../../docs/tasks/TASK-0067-exp-003-banco-ajuste-ui.md): edición de
enemigo (4 filas), objetivo (delta y 4-de-4), arma (filas afectadas), reset por
enemigo/global, export con catálogo ajustado/objetivos/diagnóstico y
determinismo con `?test=1&seed=1017`. Deja capturas y salidas en
`artifacts/TASK-0068/attempt-1/`.

Lee `brief-detalle.md`: inventario de test IDs/API, matriz E2E y trampas
conocidas (debounce, export, viewports).

# No objetivos

- Cambiar UI, motor, fórmulas, valores base o validaciones.
- Añadir dependencias, aprobar balance o editar `experiment.md`.
- Tocar `src/`, `tests/` de producción, `index.html` ni `public/`.
- Debilitar, borrar o saltar los 4 E2E de `experiment-combat.spec.ts`.

# Invariantes

- Misma semilla, duelos, overrides y objetivos ⇒ mismo resultado y export.
- Editar un enemigo recalcula solo sus 4 filas; un arma, las filas de sus
  portadores. Las demás filas no cambian.
- Reset por enemigo/global devuelve la medición base y deja el export sin
  overrides.
- Dentro/fuera se distingue por texto además de color; los campos tienen foco
  visible; no hay desbordamiento del documento (el scroll interno de la tabla
  sí es válido).
- Sin esperas de reloj real: usa `expect.poll`/estado, no `waitForTimeout`.

# Criterios de aceptación

En
[la ficha](../../../docs/tasks/TASK-0068-exp-003-banco-ajuste-e2e.md#criterios-de-aceptación);
no copiar.

# Contexto mínimo

- `tests/e2e/experiment-combat.spec.ts`: E2E existentes y helpers de consola,
  lectura de API y capturas.
- `experiments/EXP-003-mesa-combate/src/main.ts`: página, test IDs y API
  `window.__experiment`.
- `src/v2/bench.ts` y `src/bench-ui.ts`: overrides, filas afectadas, diagnóstico
  y export.
- Convención de capturas:
  [QA visual](../../../docs/harness/visual-qa.md); `E2E_ARTIFACTS_DIR` escribe en
  `<spec>/screenshots/` con `artifactPath`.
- Añade la cobertura en un spec nuevo (`experiment-bench.spec.ts`); no edites el
  spec existente salvo necesidad justificada y solo de forma aditiva.

# Artefactos

- `report.md`, `test-output.txt`, `verify-output.txt`, `screenshots/`, logs y
  commit SHA.

# Riesgos y decisiones abiertas

- El recálculo es diferido (~280 ms): espera al estado de la API o a
  `bench-status`, no a un tiempo fijo.
- `getResults`/`snapshot`/`getDecision` fuerzan el flush pendiente; úsalos para
  leer estado determinista.
- 1280×720 y 900×700: la tabla de 18 columnas admite scroll interno; comprueba
  que el documento y los paneles no desbordan.
- Si un criterio no se puede cubrir sin cambiar producto, devuelve `blocked` con
  evidencia; no lo maquilles.
