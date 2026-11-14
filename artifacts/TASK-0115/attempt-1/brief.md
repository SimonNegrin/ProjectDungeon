---
type: Task Brief
title: "TASK-0115: brief del intento 1"
description: Siluetas sólidas en los ocho slots de equipamiento vacíos.
task: TASK-0115
attempt: 1
status: stable
brief_bytes: 2513
read_detail: false
generated: { by: deepseek/v4.1-flash, at: 2026-11-14T18:00:00Z }
---

# Objetivo

Los ocho slots de Equipo vacíos muestran la silueta sólida de su objeto
representativo, recortada de `items.png` y pintada con `--ui-line-color`; el
lleno muestra solo el sprite. Sin arte nuevo, sin mover la rejilla y sin
cambiar tamaño, bisel ni encaje.

# No objetivos

- TASK-0116 (cursor), TASK-0117 (QA) y TASK-0118 (docs).
- Siluetas en Bolsa/Suelo/cadáveres; reglas, navegación o figura; tocar
  `items.png` o sustituir la figura por PNG.

# Invariantes

- Solo los ocho slots de Equipo vacíos; nunca Bolsa ni Suelo.
- Silueta decorativa (`aria-hidden`), sin foco ni clics; no altera tamaño,
  bisel, área interior ni encaje; sin CLS.
- Slot lleno: solo sprite, sin máscara ni resto. Al desequipar reaparece.
- Una única fuente para la tabla de ocho siluetas; sin recortes duplicados.
- Los pseudo-elementos de `.ui-inset` y `--ui-bevel` son del bisel
  (TASK-0112): no se reutilizan ni se alteran; usa otra capa.
- Se conserva la rejilla superior de TASK-0114.
- No se borran, saltan ni debilitan tests; `pnpm` con timeouts del workflow.

# Criterios de aceptación

En `docs/tasks/TASK-0115-ui-siluetas-slots-vacios.md#criterios-de-aceptación`.

# Contexto mínimo

- `src/host/inventory-panel-view.ts`: `createCell`/`updateCell` crean y
  alternan el `li` y el icono; añade ahí la capa de silueta.
- `src/host/ui.css`: `.inventory-slot`, `.inventory-slot-icon`. El icono usa
  `items.png` (352×832, celdas 32×32); replica el recorte con
  `mask-image`/`mask-position` y color de token.
- `src/game/equipment.ts`: `ITEM_SHEET`, `cellRect` y sprites del catálogo;
  candidato a fuente única. Tabla aprobada:
  `docs/tasks/TASK-0115-ui-siluetas-slots-vacios.md#contexto`.
- Requisito:
  `docs/requirements/REQ-033-revision-visual-hud-panel.md#requisitos-creativos-decididos`
  (R-019, R-020, R-029, S-001, S-005, T-010, T-017) y `#composición-del-panel`
  (P-008).

# Artefactos

- `report.md`, `verify-output.txt`, `test-output.txt`, `screenshots/`, `logs/`.
- Capturas de los ocho slots vacíos y de uno lleno a 900×700 y 1280×720.

# Riesgos y decisiones abiertas

- Ninguna decisión creativa abierta. Si `mask-image` no está, el slot conserva
  bisel y tamaño sin romper la rejilla.
