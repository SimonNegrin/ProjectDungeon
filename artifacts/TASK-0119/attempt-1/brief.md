---
type: Task Brief
title: "TASK-0119: brief del intento 1"
description: Reapertura del submenú con teclado tras una acción.
task: TASK-0119
attempt: 1
status: stable
brief_bytes: 2555
read_detail: false
generated: { by: deepseek/v4.1-flash, at: 2026-11-14T19:50:00Z }
---

# Objetivo

Con teclado, `Enter` vuelve a abrir **y mantiene** el submenú contextual tras
recoger, equipar, desequipar o soltar, sin clic ni esperas. Un E2E nuevo debe
fallar antes del arreglo y pasar después.

# No objetivos

- No tocar `src/game/**`, reglas, costes, navegación, cursor ni aspecto.
- No arreglar el bucle de feedback del host (hallazgo nuevo; solo reportarlo).
- No preparar otras tareas del playtest.

# Invariantes

- Clic, flechas, `Tab`, `aria-current` y foco DOM no cambian; fila vacía sigue
  sin menú.
- Sin tests debilitados; `pnpm run verify` y `pnpm run test:e2e` completos.

# Criterios de aceptación

En `docs/tasks/TASK-0119-reapertura-submenu-teclado.md#criterios-de-aceptación`;
el informe debe mapear cada uno a su evidencia.

# Contexto mínimo (causa ya reproducida)

- `src/host/inventory-panel-view.ts`, `renderModel`:
  `if (menuOpen) closeMenu(false)` corre en **cada** `update(state)`, aunque el
  estado sea el mismo objeto.
- `src/host/main.ts` (~569-590): el bucle de feedback reinicia su reloj en cada
  reenganche, nunca caduca y re-renderiza a ~60 fps.
- Así el menú se abre y se cierra en el frame siguiente; selección y foco son
  correctos. La sospecha de "celda vacía" **no** es la causa.
- Evidencia en `artifacts/TASK-0119/lead-repro/` (`README.md`); con el bucle
  parado con `window.__game.advance(0)`, el menú permanece abierto.

# Arreglo esperado

Conservar el menú abierto cuando la actualización no cambia el estado/modelo del
panel; cerrarlo cuando el estado cambia de verdad. Mínimo, en presentación.

# Tests

- E2E en tiempo real: tras ejecutar, esperar `!snapshot().animation.animating`
  (sin `settle`, que consume el banner y oculta el fallo), `Enter` y comprobar
  que el submenú sigue visible ~150 ms. Encadenar recoger, equipar, desequipar
  y soltar; caso de cambio de turno.
- Salida fallando antes del cambio en `e2e-failing-before.txt`.
- Un unitario de selección no reproduce el fallo; si extraes un predicado puro,
  cúbrelo; si no, justifícalo.

# Artefactos

`artifacts/TASK-0119/attempt-1/`: informe, salidas de E2E y verify, logs y
capturas.

# Riesgos

- No cerrar el menú cuando el estado cambia de verdad.
- El bucle de feedback altera tiempos: usa esperas reales explícitas.
