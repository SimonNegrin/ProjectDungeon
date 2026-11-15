---
type: Task Brief
title: "TASK-0144: brief del intento 3"
description: Corrección mínima de la aserción del HUD que incluye la región aria-live.
task: TASK-0144
attempt: 3
status: stable
brief_bytes: 2206
read_detail: false
generated: { by: deepseek/v4.1-flash, at: 2026-11-15T23:45:00Z }
---

# Objetivo

Dejar verde la suite E2E completa corrigiendo solo la aserción de
`tests/e2e/qa-visual-revision-ui.spec.ts` que cuenta `hud-live` como texto
visible. Alcance cerrado por el usuario; sin tocar producto.

# No objetivos

- Cambiar HUD, `src/host/hud.ts`, `index.html`, CSS u otra spec; debilitar,
  borrar o saltar otras aserciones; tocar reglas, requisitos o arnés.

# Invariantes

- pnpm y `timeout`; E2E en serie (`--workers=1`), puerto 4173 libre y sin
  procesos huérfanos.
- Sesión nueva de `task-runner`; no reutilizar la del intento 2. Si vuelve a
  fallar, para y devuelve `blocked` con el fallo concreto.

# Criterios de aceptación

Viven en `docs/tasks/TASK-0144-qa-e2e-pausa-guardado-carga.md#criterios-de-aceptación`; el 8 es el que queda.

# Contexto mínimo

- `tests/e2e/qa-visual-revision-ui.spec.ts`: `hudGeometry` (~303) y
  `expectHudBase` (~394). `hud-left.textContent` incluye `hud-live`, la región
  `aria-live` de TASK-0151, oculta con caja de `--ui-line` y
  `clip-path: inset(50%)` (`src/host/ui.css:241`). Corrección autorizada como
  excepción única.

# Cambio permitido

1. En `hudGeometry`, calcular `hudText` excluyendo el subárbol de
   `[data-testid="hud-live"]` (clonar `hud-left` y quitar ese nodo, o equivalente)
   y exponer las métricas de `hud-live` (existencia, caja y `clip-path`).
2. En `expectHudBase`, mantener las comprobaciones de «Fase», «Turno», «En juego»
   y «PV enemigo» sobre el texto visible y añadir que `hud-live` existe, tiene
   texto y sigue visualmente oculto (caja ≤ 1-2 px o `clip-path` con
   `inset(50%)`).
3. Nada más: no cambiar el resto de `hudGeometry`, `expectHudBase` ni la spec.

# Artefactos

`artifacts/TASK-0144/attempt-3/`: `report.md`, `verify-output.txt`,
`e2e-output.txt`, `e2e-specs.txt` y capturas.

# Riesgos

- Suite completa ~4,6 min: `--workers=1` y timeout 900 s; registra el tiempo real.
