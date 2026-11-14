---
type: Task
id: TASK-0108
title: "UI: cursor superpuesto y anti-CLS"
description: "Añadir un marco de selección que sigue al foco con transición corta, salta en cambios grandes o scroll y no produce Content Shift, respetando movimiento reducido."
status: stable
task_status: done
task_type: feature
requirement: REQ-033
requirement_ids: [R-022, R-023, R-024, P-006, T-013, T-014]
depends_on: [TASK-0107]
unlocks: [TASK-0109]
created_at: 2026-11-14T12:02:44Z
completed_at: 2026-11-14T13:55:57Z
assignee: task-runner
attempts: 1
artifacts: artifacts/TASK-0108/
priority: P1
risk: medium
review_required: true
generated: { by: deepseek/v4.1-flash, at: 2026-11-14T12:02:44Z }
verified:
  - by: task-lead
    at: 2026-11-14T13:55:57Z
    note: >-
      Intento 1 verificado (código `917d679`, evidencia `c4fbd1a`/`e57df80`;
      fusión `31a0080`). Reejecutados `pnpm run verify` (93 archivos,
      1317/1317, `tsc`, build y bundle) y `pnpm run test:e2e` (170/170) con
      timeouts de 120 s y 180 s. Diff revisado: `index.html`, `main.ts`,
      `inventory-panel-view.ts`, `ui.css`, tests nuevos y artefactos; sin
      cambios en `src/game/**`, requisitos, arnés ni plantillas, y sin tests
      existentes modificados. Cursor superpuesto con centro transparente y
      borde de `--ui-focus` por fuera del bisel, posicionado con `transform`;
      transición de 100 ms solo entre vecinos horizontales de la misma zona y
      fila, e instantáneo en primera colocación, cambio de fila/zona, scroll,
      reapertura, actualización del modelo y `prefers-reduced-motion`. Foco DOM
      intacto (`aria-current`, `tabindex` y `activeElement` en el slot); cursor
      `aria-hidden` y `pointer-events:none`. CLS medido con
      `PerformanceObserver` y rects: 0 shifts en marco, panel, columnas,
      títulos y slots de equipo/bolsa; el único shift observado (0,0008 en la
      ficha del HUD, `hadRecentInput`) queda dentro de su zona. Capturas y
      logs revisados a 900×700, 1280×720 y modo reducido. Se acepta la
      desviación declarada de retirar el `outline` del slot porque el cursor es
      el indicador visible de foco. Fricción de `EXP-004` bajo carga paralela
      diferida a arnés; no afecta al panel.
---

# Objetivo

Que la selección del panel se sienta como un cursor de juego: un marco
superpuesto que sigue al foco con una transición breve, sin saltos ni
desplazamientos del layout.

# Contexto

REQ-033 R-024 adopta el cursor superpuesto; TASK-0107 deja la rejilla y el foco
real. El cursor es una capa de presentación, no sustituye al foco DOM.

# Criterios de aceptación

- [ ] El cursor es un marco superpuesto colocado sobre el slot activo; el foco
      real sigue en el slot y la accesibilidad no cambia.
- [ ] Entre slots adyacentes se desplaza con una transición de 80-120 ms, sin
      rebote ni easing largo.
- [ ] En cambios grandes (columna/fila) y con scroll se coloca al instante.
- [ ] Con `prefers-reduced-motion`, el cursor salta sin transición.
- [ ] El marco no tapa el sprite ni el bisel; el centro es transparente.
- [ ] El cursor se mueve con `transform` y no altera el layout.
- [ ] Abrir/cerrar, navegar, equipar, recoger/soltar, cambiar de tile o aparecer
      un cadáver no desplaza el marco, los títulos, las columnas ni los slots.
- [ ] Las pulsaciones rápidas no desincronizan el cursor del foco.

# Plan de test

- Unitario: cálculo de posición del cursor y sincronización con el foco.
- Integración: `pnpm run verify`; transición y `prefers-reduced-motion`.
- E2E: navegación rápida, salto de columna, scroll y apertura/cierre; medición de
  `getBoundingClientRect()` antes/después y `PerformanceObserver` de layout-shift.
- Manual: comprobar la sensación de desplazamiento a 900×700 y 1280×720.

# Evidencia esperada

- [ ] Informe en `artifacts/TASK-0108/attempt-1/report.md`
- [ ] Salida de `pnpm run verify` y del test E2E
- [ ] Capturas o vídeo corto del cursor y del modo reducido
- [ ] Commit SHA

# Restricciones

- Sin cambios en reglas, costes, inventario ni navegación.
- Sin cambios en el contenido del panel ni en los sprites.
- El cursor solo se aplica a los slots del panel; el resto de la UI conserva su
  foco.

# No objetivos

- Layout alternativo.
- QA visual final del corte.
