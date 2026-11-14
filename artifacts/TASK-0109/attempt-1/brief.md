---
type: Task Brief
title: "TASK-0109: brief"
description: "QA visual de REQ-033: capturas y comprobaciones a 900×700 y 1280×720, sin cambios de UI."
task: TASK-0109
attempt: 1
status: stable
brief_bytes: 4081
read_detail: true
generated: { by: deepseek/v4.1-flash, at: 2026-11-14T14:15:00Z }
---

# Objetivo

Verificar en navegador real la revisión visual de REQ-033 y dejar una matriz de
capturas y logs a 900×700 y 1280×720. Añade un spec E2E de QA que mida y
compruebe los criterios; **no rediseña ni cambia la UI**.

# No objetivos

- Cambiar `src/**`, `index.html`, `public/**` o cualquier regla, coste o
  navegación. Ningún ajuste de UI para “hacer pasar” la tarea.
- Implementar la distribución alternativa 1/3 + dos filas ni abrir tareas.
- Actualizar `docs/design/**`, glosario, ADR o `docs/log.md` (TASK-0110).
- Reescribir artefactos históricos de TASK-0104..0108 o baselines existentes.

# Invariantes

- Solo se añade `tests/e2e/qa-visual-revision-ui.spec.ts`; como máximo, un helper
  en `tests/e2e/support.ts` si evita duplicar geometría. No se debilita ningún
  test.
- Estado determinista con `openState`, semilla `279837264`, fuentes
  listas y `settle`. Sin esperas de reloj para animaciones: usa `advance` o
  `prefers-reduced-motion` como en los specs actuales.
- Si un criterio falla, no toques producción: captura evidencia y devuelve
  `blocked` con ruta y medida. El defecto vuelve a su tarea de implementación.
- La observación del retrato del HUD izquierdo es **no bloqueante**: regístrala
  en log e informe, sin convertirla en fallo de este spec.

# Criterios de aceptación

Viven en
[TASK-0109](../../../docs/tasks/TASK-0109-qa-visual-revision-ui.md#criterios-de-aceptación).

# Contexto mínimo

- Base reutilizable: `tests/e2e/hud-left-zones-qa.spec.ts`,
  `hud-right-detail-qa.spec.ts`, `panel-three-columns-qa.spec.ts`,
  `panel-cursor-cls-qa.spec.ts`, `ui-foundations-qa.spec.ts` y `support.ts`.
- UI: `index.html` (testids `hud-*`, `inventory-*`), `src/host/ui.css` (tokens y
  biseles), `src/host/inventory-panel-view.ts` (slots, cursor, cadáveres).
- Requisito y anclas:
  [R-001..R-024, S-001..S-004, P-001..P-006, T-008..T-014](../../../docs/requirements/REQ-033-revision-visual-hud-panel.md).
- Matriz de escenas, capturas y comprobaciones: `brief-detalle.md` (**leer**).

# Enfoque

- Un spec nuevo con un `describe` por viewport que recorra la matriz de
  `brief-detalle.md` y guarde capturas, geometría, estilos, escala, cursor y CLS
  en JSON, reutilizando helpers y aserciones de los specs existentes.
- Confirma que las **tres columnas encajan a 900×700**: panel y columnas dentro
  del marco, sin solapes ni recortes, títulos alineados y slots cuadrados. Si no
  encaja, para y entrega la medida para decidir sobre R-021.
- La matriz cubre escala continua, ocho colores, biseles, ficha, cadáveres,
  cursor y CLS. No omitas ningún escenario aunque otra spec ya lo roce.
- Retrato: compara `background-image`/`background-position` del `hud-portrait`
  entre arquetipos y guárdalo en `logs/portrait-audit.json`; si no varía,
  indícalo como observación no bloqueante y razona si contradice REQ-022 R-002 o
  queda fuera de REQ-033.

# Comandos y timeouts

- `E2E_ARTIFACTS_DIR=artifacts/TASK-0109/attempt-1/e2e pnpm run test:e2e tests/e2e/qa-visual-revision-ui.spec.ts` — 180 s.
- `pnpm run verify` — 240 s; `pnpm run test:e2e` — 180 s.
- Si `EXP-004` agota su timeout de 5 s (flake conocido), repite una vez
  `VITEST_MAX_WORKERS=2 pnpm run verify` y registra ambas salidas; no cambies
  tests.

# Artefactos

- `report.md` (≤4 KB), `verify-output.txt`, `e2e-output.txt`,
  `focused-e2e-output.txt` en `artifacts/TASK-0109/attempt-1/`.
- `e2e/qa-visual-revision-ui/screenshots/` y `logs/` con las rutas de
  `artifactPath` (`<spec>/screenshots/<nombre>.png`).
- Commit SHA.

# Riesgos

- A 900×700 el panel va justo: mide rects y no confíes en capturas a ojo.
- El retrato estático es previo y no debe bloquear; si detectas otro defecto
  real, repórtalo con evidencia y no lo parchees.
