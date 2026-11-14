---
type: Task Report
title: "TASK-0108: informe de ejecución"
description: "Cursor superpuesto sincronizado con el foco, transición corta, saltos instantáneos y CLS 0 en el panel."
task: TASK-0108
attempt: 1
report_status: success
generated: { by: deepseek/v4.1-flash, at: 2026-11-14T13:51:27Z }
artifacts: artifacts/TASK-0108/attempt-1/
verified:
---

# Estado

`success`. El panel usa un cursor superpuesto con `transform`, transición de
100 ms solo en vecinos horizontales y salto instantáneo en fila/zona, scroll,
reapertura, actualización del modelo y movimiento reducido.

# Cambios

- `src/host/inventory-panel-view.ts`: capa `.inventory-cursor`, función pura
  `cursorTransition`, colocación por `transform`, reflow en modo instantáneo,
  scroll y `ResizeObserver` instantáneos, ocultación al enfocar «Cerrar» y
  eliminación del resaltado `.is-selected`.
- `src/host/main.ts`: pasa `prefersReducedMotion` a la vista.
- `src/host/ui.css`: borde con `--ui-line` y `--ui-focus`, centro transparente,
  transición `transform 100ms linear`, `@media` de movimiento reducido.
- `index.html`: elemento `inventory-cursor` `aria-hidden` y oculto.
- Tests: `tests/unit/host/inventory-cursor.test.ts` y
  `tests/e2e/panel-cursor-cls-qa.spec.ts`.
- Commit SHA: `917d67959b8e7d65fe211413f54454860f9be616`.

# Tests

| Comando | Resultado | Evidencia |
|---|---|---|
| `pnpm run verify` | 93 archivos, 1317 tests OK; build y bundle OK | `verify-output.txt` |
| `pnpm run test:e2e` | 170 tests OK (2.1 min) | `e2e-output.txt` |
| Spec nuevo E2E | 3 tests OK: marco/transición, scroll/reducido, CLS | `panel-cursor-cls-qa/logs/*.json` |
| Unitario del cursor | 7 casos: primera colocación, vecino, salto, reduced, force | incluido en `verify` |

# Evidencia visual

- `panel-cursor-cls-qa/screenshots/cursor-900x700.png`
- `panel-cursor-cls-qa/screenshots/cursor-1280x720.png`
- `panel-cursor-cls-qa/screenshots/cursor-zona-suelo-900x700.png`
- `panel-cursor-cls-qa/screenshots/cursor-reduced-motion-900x700.png`
- `panel-cursor-cls-qa/screenshots/cls-panel-1280x720.png`
- Mirar: marco verde por fuera del bisel, interior transparente, sprite visible;
  a 900×700 y 1280×720; en reducido no hay transición.
- `logs/cls-geometry.json`: sin shifts en marco, panel, columnas, títulos ni
  slots de equipo/bolsa; el Suelo y la ficha del HUD cambian dentro de su zona.

# Desviaciones

- Se retiró el `outline` de `.inventory-slot:focus-visible`: el cursor es ahora
  el indicador visual del slot. El foco DOM, `tabindex` y `aria-current` no
  cambian.
- Solo animan vecinos horizontales inmediatos (dx ≤ 1,5× ancho del slot); un
  salto del mismo `zone`/fila pero de dos celdas (p. ej. cuello→anillo) es
  instantáneo, conforme al criterio.

# Problemas conocidos y preguntas abiertas

- `experiments/EXP-004.../spawn.test.ts` agotó su timeout de 5 s en dos
  ejecuciones de `verify` bajo carga paralela y pasó en la siguiente (y en
  aislamiento, 3,4 s). Es previo y no toca el panel; la salida final es la que
  queda en `verify-output.txt`.
- El `PerformanceObserver` registró un shift de 0,0008 en
  `hud-panel-equipped` durante navegación/equipar, con `hadRecentInput: true`.
  Queda fuera del presupuesto del panel; P-006 admite cambios dentro de la ficha.
- Sin preguntas abiertas para el lead.

# Fricción reutilizable

| Síntoma | Evidencia | Workaround | Por qué es reutilizable | Cambio propuesto | Coste/riesgo | Disposición |
|---|---|---|---|---|---|---|
| `EXP-004` agota 5 s al ejecutarse con 93 workers de Vitest | 2 fallos consecutivos y luego verde; `verify-output.txt` final | Reintentar `verify` | Bloquea tareas ajenas al experimento de forma intermitente | Limitar concurrencia de Vitest o aislar ese barrido con su propio timeout, sin cambiar aserciones | Bajo | `pending` |

# Métricas de handoff

| Métrica | Valor |
|---|---|
| `brief_bytes` | 4094 |
| `report_bytes` | 3980 |
| `overflow` | none |
| `criteria_failed` | 0 |
