---
type: Task Brief
title: "TASK-0102: brief del intento 1"
description: Ficha de dos bloques en el HUD derecho y submenú contextual; retira la barra de acciones.
task: TASK-0102
attempt: 1
status: stable
brief_bytes: 2489
read_detail: true
generated: { by: deepseek/v4.1-flash, at: 2026-11-14T02:05:00Z }
---

# Objetivo

Con el panel abierto, el HUD derecho muestra dos bloques —seleccionado y
equipado en su hueco— con stats, traits y descripción, sin delta. `Enter` sobre el
objeto abre un submenú flotante con las acciones válidas, su coste de 1 MP y sus
rechazos; la barra de acciones de TASK-0101 desaparece. Al cerrar, vuelve el
detalle del cursor.

# No objetivos

- Cofres, cadáveres con inventario, arte nuevo, reglas, costes o catálogo.
- Rediseñar rejilla, figura de equipo o navegación espacial.
- E2E/QA final del hito, arquitectura y glosario; atajos fuera del panel.

# Invariantes

- Motor, RNG, costes y snapshot intactos: abrir/cerrar el submenú no despacha ni
  gasta MP; el coste se cobra al ejecutar.
- Selección, foco y submenú son presentación del host; tokens de `ui.css`
  (`--ui-line` grosor, `--ui-line-color` color), sin literales, radios ni sombras.
- El submenú es el único camino: no queda barra de acciones ni segundo flujo. El
  teclado llega con `Enter`, sin foco programático.
- Sin dependencias. No se debilitan tests: los de la barra se adaptan
  conservando flujos.

# Criterios de aceptación

Viven en `docs/tasks/TASK-0102-ficha-submenu-hud.md#criterios-de-aceptación`.

# Contexto mínimo

- `src/host/hud-detail.ts`: composición pura de los dos bloques.
- `src/host/inventory-panel-view.ts` y `inventory-panel.ts`: selección, menú y
  costes.
- `src/host/hud.ts`, `main.ts`, `index.html` y `ui.css`: render.
- REQ-023 R-009; REQ-032 R-011, R-012, R-014, N-008 y N-011.
- **Lee [brief-detalle.md](brief-detalle.md)**: contrato de datos, foco,
  posiciones, tests y evidencia.

# Artefactos

`artifacts/TASK-0102/attempt-1/`: `report.md`, `test-output.txt`,
`verify-output.txt`, `e2e-output.txt`, `screenshots/` (1280×720 y 900×700) y
commit en `task/TASK-0102`.

# Riesgos y decisiones del lead

- El foco sigue en el objeto; el submenú resalta con `aria-activedescendant`.
  `Escape` no ejecuta y devuelve el foco.
- Con 0 MP las opciones se ven no disponibles con motivo y no despachan; con
  mochila llena «recoger» no se ofrece.
- N-008 por identidad de instancia: si el objeto cambia de zona, el foco lo sigue.
