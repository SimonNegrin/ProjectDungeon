---
type: Task Report
title: "TASK-0016: informe de ejecución"
description: Viewport 13×13, cámara y BSP actualizados, expectativas unitarias/E2E y QA visual.
task: TASK-0016
attempt: 1
report_status: success
generated: { by: deepseek/v4.1-flash, at: 2026-11-08T09:21:30Z }
artifacts: artifacts/TASK-0016/attempt-1/
verified:
---

# Estado

`success`. Viewport 13×13 (416×416), cámara alineada a 32 px, respaldo con offsets
enteros y todas las expectativas actualizadas. 308 unitarios y 29 E2E en verde.

# Cambios

- `src/host/layout.ts`: `MAP_TILES_PER_AXIS=13`, `CANVAS_WIDTH` par (2218) para
  offset entero 485; offset DOM exacto separado del offset de dibujo.
- `src/host/renderer.ts`, `cursor-view.ts`, `index.html`: comentarios, canvas
  interno 2218×1248; overlay conserva 21,875 % / 56,25 %.
- `src/game/bsp.ts`: `VIEWPORT_TILES=13` y origen `player − floor(13/2)`; clamp
  `[0, 19]`, enemigo de referencia sigue fuera y a distancia 59.
- Tests unitarios y E2E: 384/1152/2048/448/12×12/640 actualizados; añadidas
  comprobaciones de 13 columnas/filas, múltiplos de 32, offset entero y cursor
  13×13. No se borró ni debilitó ningún test.
- Commit de código y artefactos: `71627da`.

# Tests

| Comando | Timeout | Resultado | Evidencia |
|---|---:|---|---|
| `pnpm run test` | 120 s | 27 archivos, 308 tests OK | `test-output.txt` |
| `pnpm run verify` | 180 s | docs/config/unit/build OK | `verify-output.txt` |
| `pnpm run test:e2e` | 240 s | 29 tests OK | `e2e-output.txt` |
| `pnpm run build` | 120 s | tsc + vite OK | `build-output.txt` |

# Evidencia visual

- `screenshots/camera-centered.png`: jugador en el tile central, 6 tiles
  completos por lado.
- `screenshots/frame-1280x720.png`, `frame-1920x1080.png`, `frame-narrow.png`:
  marco 16:9, mapa 1:1, laterales negros y HUD sin recortes.
- `screenshots/map-debug-on.png`: debug con `Viewport 416×416`, cámara (0,64) y
  límites (608,608).
- `screenshots/cursor-player.png` y `camera-edge.png`: cursor de un tile y
  bordes de mapa sin medios tiles.

# Desviaciones

- El canvas interno mide 2218×1248 (16:9 con desviación 0,03 %), no el ancho
  exacto 2218,66; es la opción pedida para que `MAP_OFFSET_BACKING=485` sea
  entero y el pixel art no se desplace.
- El overlay/feedback usa el centro exacto del marco (21,875 %); el dibujo usa
  485 px de respaldo. La diferencia es 0,11 px lógicos y no altera la
  alineación visible.
- Sin cambios en `docs/`, `package.json`, `pnpm-lock.yaml`, dependencias ni
  reglas de juego. La semilla de referencia conserva spawns y distancia 59.

# Problemas conocidos y preguntas abiertas

- Ninguna pregunta abierta. Los tests E2E ajenos a la tarea siguen escribiendo
  capturas en `artifacts/TASK-0007`, `TASK-0010` y `EXP-000`; se revirtió ese
  churn antes del commit.

# Fricción reutilizable

| Síntoma | Evidencia | Workaround aplicado | Por qué es reutilizable | Cambio propuesto | Coste/riesgo | Disposición |
|---|---|---|---|---|---|---|
| Ejecutar E2E modifica capturas versionadas de tareas históricas y ensucia el árbol | `git status` tras `pnpm run test:e2e` muestra cambios en `artifacts/TASK-0007`, `TASK-0010` y `EXP-000` | `git checkout --` de esos artefactos antes de commitear | Se repite en cada tarea que ejecute la suite completa | Parametrizar la ruta de capturas por intento o ignorar capturas generadas | Bajo; no afecta a criterios ni tests | `pending` |

# Métricas de handoff

| Métrica | Valor |
|---|---|
| `brief_bytes` | 3644 |
| `report_bytes` | 3789 |
| `overflow` | `none` |
| `criteria_failed` | 0 |
| `cause` | n/a |

# Checklist

- [x] Criterios cubiertos y sin tests debilitados
- [x] Evidencia guardada y enlazada
- [x] Sin salidas completas pegadas en el informe
- [x] Listo para verificación del lead
