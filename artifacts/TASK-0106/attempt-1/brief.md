---
type: Task Brief
title: "TASK-0106: brief del intento 1"
description: "Ficha derecha simplificada: título, sprite, stats verticales y traits condicionales."
task: TASK-0106
attempt: 1
status: stable
brief_bytes: 2839
read_detail: false
generated: { by: deepseek/v4.1-flash, at: 2026-11-14T13:05:51Z }
---

# Objetivo

Recomponer la ficha del HUD derecho para objetos y detalle del cursor: título,
sprite y stats en filas verticales; sin subtítulos, descripciones ni rótulo
«Stats»; traits solo si existen. Con el panel abierto se mantienen dos secciones
enmarcadas: seleccionado (sin «Seleccionado») y equipado (con «Equipado» y
«Vacío» cuando toca).

# No objetivos

- Panel, layout alternativo, cursor superpuesto y CLS (TASK-0107/0108).
- HUD izquierdo, QA visual final (TASK-0109) y documentación de hito.
- Reglas, costes, inventario, navegación o línea de visión.

# Invariantes

- Escala, paleta y biseles de TASK-0104: sólo tokens `--ui-*`; sin colores,
  tamaños mágicos, radios, sombras, degradados, blur ni translucidez.
- Sprites del catálogo (`ITEMS[].sprite.rect`) desde `items.png`, escalados con
  `--ui-scale`, `image-rendering: pixelated`; sin arte nuevo.
- Sólo presentación derivada del snapshot; no mutar estado, RNG ni percepción.
- No borrar ni debilitar tests; mantener cobertura de línea de visión y
  «Desconocido».

# Criterios de aceptación

Viven en
[TASK-0106](../../../docs/tasks/TASK-0106-ui-ficha-derecha-simplificada.md#criterios-de-aceptación).

# Contexto mínimo

- `src/host/hud-detail.ts`: `CursorDetail`/`PanelDetail`; hoy repite tipo en
  `subtitle`, usa fila `Stats`, `Sin traits activos` y descripciones.
- `src/host/hud.ts`: renderiza detalle y bloques; `index.html`: HUD derecho;
  `src/host/ui.css`: estilos de la ficha; `inventory-panel-view.ts` ya pinta
  sprites con `background-position` escalado.
- Tests: `tests/unit/host/hud-detail.test.ts`,
  `tests/e2e/panel-submenu-hud-qa.spec.ts` y `hud-three-zones-qa`.
- Requisito:
  [REQ-033 R-009/R-010/R-011](../../../docs/requirements/REQ-033-revision-visual-hud-panel.md#requisitos-creativos-decididos);
  [REQ-023 v4](../../../docs/requirements/REQ-023-hud-derecho-detalle-cursor.md).

# Artefactos

- `report.md`, `verify-output.txt`, `e2e-output.txt`, `screenshots/`, logs.

# Riesgos y decisiones abiertas

- Una fila por stat, con valor delante (`+N Etiqueta`), usando los datos del
  catálogo; no una línea concatenada ni una fila «Stats».
- Elimina subtítulos y descripciones del modelo y del DOM; traits vacío = nodo
  oculto, sin «Sin traits activos».
- Conserva un único indicador de tipo y las filas propias (PV, arma, etc.);
  elimina sólo las que repiten tipo o título.
- El bloque equipado conserva la etiqueta pequeña «Equipado»; el vacío no
  inventa sprite, stats ni traits.
