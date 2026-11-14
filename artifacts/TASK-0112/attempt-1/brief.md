---
type: Task Brief
title: "TASK-0112: brief del intento 1"
description: Biseles de 2× la línea base que crecen hacia fuera sin mover el área interior.
task: TASK-0112
attempt: 1
status: stable
brief_bytes: 2659
read_detail: false
generated: { by: deepseek/v4.1-flash, at: 2026-11-14T16:00:00Z }
---

# Objetivo

Un token de bisel igual a `2 × --ui-line` alimenta todos los outset/inset, el
marco y los componentes con bisel. El grosor extra crece hacia fuera: el
rectángulo interior de HUD, zonas, ficha, columnas, slots, botones y submenú
conserva tamaño y posición (±1 px). El cursor del mapa no cambia.

# No objetivos

0113 listas, 0114 figura/alineación, 0115 siluetas, 0116 cursor de panel 4×,
0117 QA, 0118 docs. No tocar paleta, escala, tipografía, layout, contenido,
reglas, render del mapa ni ancho/color de los cursores.

# Invariantes

- `--ui-line` sigue siendo la línea base; el cursor del mapa conserva
  `2 × --ui-line` y sus estados de 4×.
- Interior actual (±1 px) medido sobre `main` antes del cambio; sin solapes,
  recortes, desplazamiento de contenido ni CLS.
- Sin `border-radius`, `box-shadow` ni degradados.
- Tests de relieve adaptados sin borrar, saltar ni debilitar cobertura.

# Criterios de aceptación

`docs/tasks/TASK-0112-ui-biseles-gruesos-crecimiento.md#criterios-de-aceptación`.

# Contexto mínimo

- `src/host/ui.css`: `.ui-outset`/`.ui-inset` a 1×; `.frame::after` dentro de
  `.frame { overflow: hidden }`; `.inventory-slot { overflow: hidden }`;
  `--ui-slot` = 32u + 2·line. No son biseles: `outline`, separadores
  `border-top`, `.perception-radius`, `.inventory-cursor`.
- `src/host/layout.ts` (`computeUiLine`), `src/host/main.ts`, `index.html`,
  `src/host/inventory-panel-view.ts`.
- Tests: `tests/unit/host/ui-foundations.test.ts`,
  `tests/e2e/qa-visual-revision-ui.spec.ts`, `ui-foundations-qa`,
  `panel-cursor-cls-qa`, `hud-left-zones-qa`, `hud-right-detail-qa`.
- REQ-033 `#requisitos-creativos-decididos` (R-025), `#requisitos-tecnicos`
  (T-002/T-015), `#lenguaje-visual-de-slots` (S-006).

# Artefactos

`artifacts/TASK-0112/attempt-1/`: `report.md`, `verify-output.txt`,
`e2e-output.txt`, capturas 900×700 y 1280×720, `logs/`, commit SHA.

# Riesgos y decisiones del lead

- A 900×700 bisel ≈ 2,347 px (línea 1,1737) y a 1280×720 ≈ 3,202 px; se acepta
  `2 × --ui-line` sin redondear, «≈3 px» es lectura visual.
- Marco y slots recortan con `overflow: hidden`; el crecimiento no puede quedar
  clipado. Conserva el interior del slot (32u) y adapta rejillas y cursor a la
  caja exterior.
- Mide interior antes/después con el token forzado a 1×; no compares a ojo.
