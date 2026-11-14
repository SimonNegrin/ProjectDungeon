---
type: Task Brief
title: "TASK-0116: brief del intento 1"
description: Cursor del panel con color de texto, borde 4×, capa bajo el submenú y transición en cualquier cambio de slot.
task: TASK-0116
attempt: 1
status: stable
brief_bytes: 2585
read_detail: false
generated: { by: deepseek/v4.1-flash, at: 2026-11-14T15:40:00Z }
---

# Objetivo

Cursor superpuesto del panel según REQ-033 v7 R-030/R-031: `--ui-text`, borde
de `4 × --ui-line`, sobre el contenido y bajo el submenú, transición de
140-160 ms en cualquier cambio de slot y salto instantáneo en los casos
listados. Movimiento con `transform`, sin CLS.

# No objetivos

- QA visual (TASK-0117), documentación (TASK-0118), cursor del mapa,
  figura/rejilla (TASK-0114), siluetas (TASK-0115) y bisel/pseudos `.ui-*`.
- Navegación, foco, reglas o contenido.

# Invariantes

- Centro transparente, `pointer-events: none`, `aria-hidden`; foco DOM y
  `aria-current` en el slot.
- No se borran, saltan ni debilitan tests: los que fijan 80-120 ms o 1× se
  adaptan conservando su cobertura.

# Criterios de aceptación

En `docs/tasks/TASK-0116-ui-cursor-panel-alineado.md#criterios-de-aceptación`.

# Contexto mínimo

- `src/host/inventory-panel-view.ts`: `cursorTransition` (hoy solo anima vecinos
  horizontales), `placeCursor`/`cursorLine`, `applySelection` y los ciclos de
  apertura, modelo, scroll y resize.
- `src/host/ui.css`: `.inventory-cursor` (~1095), submenú (`z-index: 30`), panel
  (`z-index: 20`); columnas, títulos, slots y figura sin `z-index`.
- `index.html`: cursor hijo del panel; submenú dentro de
  `.inventory-panel-body` (static).
- Tests: `tests/unit/host/inventory-cursor.test.ts`,
  `tests/e2e/panel-cursor-cls-qa.spec.ts`, helpers en
  `tests/e2e/qa-visual-revision-ui.spec.ts` y 1× en
  `tests/e2e/bisel-grueso-geometria-qa.spec.ts`.
- Requisito: REQ-033 `#cursor-de-selección`, R-030/R-031, T-014/T-018.

# Pistas

- Anima todo cambio de clave con colocación previa; instantáneo con
  `forceInstant`, `reducedMotion`, sin anterior o misma clave. 150 ms lineales.
- El borde de 4× no debe tapar el bisel de 2× del slot: ajusta caja/offset u
  outline y actualiza los helpers geométricos.
- Añade prueba de orden de capas (submenú > cursor > columnas/títulos/slots/
  figura) y de reencaminado con pulsaciones rápidas.

# Artefactos

`artifacts/TASK-0116/attempt-1/`: `report.md`, `verify-output.txt`,
`e2e-output.txt`, `screenshots/` y `logs/` con `transform`, capas y modo
reducido.

# Riesgos

Chromium redondea bordes fraccionarios; mide contra el token con tolerancia.
