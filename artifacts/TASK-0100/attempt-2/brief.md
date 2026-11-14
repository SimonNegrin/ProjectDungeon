---
type: Task Brief
title: "TASK-0100: brief del intento 2"
description: Cerrar R-007 dejando el panel modal solo sobre el mapa y ambos HUD visibles con el panel abierto.
task: TASK-0100
attempt: 2
status: stable
brief_bytes: 0
read_detail: false
generated: { by: deepseek/v4.1-flash, at: 2026-11-14T01:05:00Z }
---

# Objetivo

Corregir la verificación del intento 1: con el panel de inventario abierto, los
dos HUD de la pantalla en tres zonas deben seguir visibles y el modal debe
cubrir solo el área del mapa. No cambies el contenido ni la navegación del
panel: eso es TASK-0101.

# No objetivos

- Rediseñar el panel, sus tres columnas, la figura de equipo, el detalle del
  objeto seleccionado ni el submenú (TASK-0101).
- Tocar reglas, motor, costes, viewport, 16:9 o teclas.
- Reabrir la implementación del HUD si no hace falta.

# Invariantes

- `[data-testid="inventory-panel"]` sigue siendo modal, bloquea el mapa y se
  cierra con `Escape`/`I`; el foco y el scroll internos no cambian.
- El panel se limita a la franja central del marco (`left: 21.875%`,
  `width: 56.25%`, alto completo); los HUD izquierdo y derecho quedan fuera de
  la capa del modal y visibles.
- No se debilita ningún test existente; si un test medía el panel a pantalla
  completa, actualízalo a la nueva geometría sin perder la comprobación.
- Tokens y escalas de `src/host/ui.css`; sin literales nuevos de color o grosor.

# Criterios de aceptación

Viven en `docs/tasks/TASK-0100-pantalla-tres-zonas-hud.md#criterios-de-aceptación`.
Este intento cubre R-007 de REQ-032: panel modal solo sobre el mapa y ambos HUD
visibles con el panel abierto.

# Contexto mínimo

- `index.html`: el panel está dentro de `.frame`.
- `src/host/ui.css`: `.inventory-panel` usa `inset: 0`; el mapa del marco ocupa
  `left: 21.875%` y `width: 56.25%` (`.map-overlay`).
- `src/host/main.ts`: `openPanel`/`closePanel` y el bloqueo de teclado ya
  funcionan; no hay que cambiar la lógica.
- Tests: `tests/e2e/inventory-equipment-qa.spec.ts` y
  `tests/e2e/hud-three-zones-qa.spec.ts`; `hud` y `hud-left`/`hud-right` son los
  nodos que deben seguir visibles con el panel abierto.

# Artefactos

`artifacts/TASK-0100/attempt-2/`: `report.md`, `verify-output.txt`,
`test-output.txt`, `e2e-output.txt`, `screenshots/` (panel abierto a 1280×720 y
900×700) y commit en `task/TASK-0100`.

# Riesgos

- A 900×700 el panel pierde ancho: debe seguir siendo usable y con scroll
  interno; no cambies su estructura interna en este intento.
- Si el panel deja de bloquear el mapa o `Escape`/`I` dejan de cerrarlo, no lo
  maquilles: para y reporta.
