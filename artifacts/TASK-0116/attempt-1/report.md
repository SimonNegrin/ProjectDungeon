---
type: Task Report
title: "TASK-0116: informe de ejecución"
description: Cursor del panel en amarillo, borde 4×, bajo el submenú y transición de 150 ms.
task: TASK-0116
attempt: 1
report_status: success
generated: { by: deepseek/v4.1-flash, at: 2026-11-14T17:08:00Z }
artifacts: artifacts/TASK-0116/attempt-1/
verified:
---

# Estado

`success`. El cursor usa `--ui-text`, borde `4 × --ui-line`, se pinta sobre el
contenido y bajo el submenú, y anima cualquier cambio de slot en 150 ms; los
ciclos forzados lo colocan al instante.

# Cambios

- `src/host/ui.css`: borde `calc(var(--ui-line) * 4)` y color `var(--ui-text)`;
  transición `transform 150ms linear`.
- `src/host/inventory-panel-view.ts`: `cursorTransition` anima cualquier clave
  distinta; la caja crece fuera del bisel del slot para no tapar sprite ni
  relieve.
- Tests adaptados sin retirar cobertura (80-120 → 140-160 ms; 1× → 4×) y nuevos
  casos de vertical, columna, capas, resize y actualización.
- Commit SHA: `3410f32`; incluye el `task_status: ready` que ya estaba sin
  commitear.

# Tests

| Comando | Resultado | Evidencia |
|---|---|---|
| `pnpm run verify` | OK: 94 archivos, 1330 tests, tsc, build, bundle | `verify-output.txt` |
| `pnpm run test:e2e` | 196/196 en 1.1 min | `e2e-output.txt` |
| E2E cursor/bisel | 6/6 en 5.1 s | `logs/`, `screenshots/` |

A 900×700: línea 1,17, borde calculado 4 px, color `rgb(252, 255, 192)`,
transición `0.15s`. A 1280×720: línea 1,60, borde 6 px. Capas: cursor 10,
submenú 30; contenido con `z-index: auto`. Resize, actualización, scroll y modo
reducido: 0 transiciones.

# Evidencia visual

- `screenshots/cursor-{900x700,1280x720}.png` y los estados de columna, suelo,
  submenú y modo reducido; `biseles-*` y logs en `logs/`.

Revisar: grosor, sprite/bisel intactos, submenú encima y CLS.

# Desviaciones

- Ninguna funcional. El árbol no estaba limpio: `task_status: ready` y brief sin
  commitear; el estado va en el commit de código y el brief en el de evidencia.
  No se tocaron cursor del mapa, `--ui-bevel`, pseudos `.ui-*`, figura, siluetas,
  navegación, foco ni contenido.

# Problemas conocidos y preguntas abiertas

- Chromium redondea el borde a píxel entero (4 px a 900×700, 6 px a 1280×720);
  la proporción 4× frente al bisel de 2× se mantiene. Sin preguntas.
- `docs:check` avisa de que el brief mide 2585 B (objetivo 2560 B).

# Métricas de handoff

| Métrica | Valor |
|---|---|
| `brief_bytes` | 2585 |
| `report_bytes` | 2557 |
| `overflow` | `none` |
| `criteria_failed` | 0 |
