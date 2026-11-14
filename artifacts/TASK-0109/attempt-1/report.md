---
type: Task Report
title: "TASK-0109: informe de ejecución"
description: "QA visual de REQ-033 a 900×700 y 1280×720."
task: TASK-0109
attempt: 1
report_status: success
generated: { by: deepseek/v4.1-flash, at: 2026-11-14T14:07:10Z }
artifacts: artifacts/TASK-0109/attempt-1/
verified:
---

# Estado

`success`. Matriz de QA visual cubierta en navegador real; producción y
criterios intactos. Única observación: retrato estático, no bloqueante.

# Cambios

- `tests/e2e/qa-visual-revision-ui.spec.ts` (nuevo, 13 tests).
- Sin cambios en `src/**`, `index.html`, `public/**` ni `docs/**`.
- Logs por viewport en `logs/900x700/` y `logs/1280x720/` (mismo nombre dentro
  de cada carpeta) para evitar que tests paralelos se sobrescriban.
- Commit SHA: `2e303c88e1c45f4813514d0ef00c62e96b6fcb35`.

# Tests

| Comando | Resultado | Evidencia |
|---|---|---|
| e2e focalizado `qa-visual-revision-ui` | 13 passed (8,5 s) | `focused-e2e-output.txt` |
| `pnpm run verify` | OK: 1317 tests, build y bundle | `verify-output.txt` |
| `pnpm run test:e2e` | 183 passed (1,2 min) | `e2e-output.txt` |

`docs:check` deja 128 avisos históricos de tamaño; ningún fallo.

# Evidencia visual

- 35 capturas en `e2e/qa-visual-revision-ui/screenshots/`: tres zonas, HUD
  con/sin maná y traits, ficha con/sin traits, panel lleno/sin/con cadáveres,
  suelo, tres columnas, cursor, CLS y escala.
- Logs: `logs/<vp>/{hud-geometry,ficha,panel-geometry,cursor,cls,palette-styles}.json`,
  `logs/scale-continuity.json`, `logs/portrait-audit.json`.

- **900×700:** marco 868×488,25; panel 488,25×488,25 dentro del marco; tres
  columnas de 137,06; hueco 9,375; títulos a `top` 127,375; slot 39,89. Encaje
  sin solapes, recortes ni scroll horizontal.
- **1280×720:** marco 1184×666; panel 666×666; columnas 187,19; hueco 12,797;
  títulos `top` 59,594; slot 54,42. Mismo encaje.
- **Escala:** `--ui-scale` = altura marco / 416; `--ui-line` = escala. Cuerpo
  13,15 px a 900 (escala 1,173678) y 17,93 px a 1280 (1,600962), dentro de ±1
  de 12,8/18,8. 900→901 cambia la línea 0,001352 px.
- **CLS:** 2 shifts por viewport (navegar/equipar), `hadRecentInput=true`,
  fuente `hud-panel-equipped`; 0 shifts prohibidos de marco, panel, columnas,
  títulos o slots.
- **Cursor:** 1 transición en vecino horizontal; 0 en fila, zona y reducido;
  `0s` con `reducedMotion`.
- **Paleta:** ocho tokens de R-004 exactos; sin radios, sombras, degradados,
  blur ni translucidez; outset en zonas/secciones/columnas e inset en slots.

Mirar sobre todo `tres-columnas-900x700.png`, `tres-zonas-900x700.png`,
`ficha-sin-traits-900x700.png` y `panel-con-cadavers-900x700.png`.

# Desviaciones

- Logs en `logs/<viewport>/<nombre>.json`; contenido y nombres intactos.
- Cuerpo a 900: 13,15 px (+0,35 sobre 12,8); a 1280: 17,93 px (−0,87 sobre
  18,8). Ambos dentro del ±1. El marco a 1280 es 1184×666 por el espacio del
  host, no el viewport completo.

# Problemas conocidos y preguntas abiertas

- **Retrato no bloqueante:** misma imagen y posición para guerrero, mago y
  pícaro a 900×700 (`identical: true`). Carencia previa que podría afectar a
  REQ-022 R-002 (miniatura al cambiar de jugador activo), fuera de REQ-033.
  ¿Abrir tarea aparte?
- Sin defectos bloqueantes de REQ-033.

# Fricción reutilizable

| Síntoma | Evidencia | Workaround | Por qué es reutilizable | Cambio propuesto | Coste/riesgo | Disposición |
|---|---|---|---|---|---|---|
| `artifactPath(testInfo,'logs',name)` se sobrescribe entre viewports: fullyParallel usa workers distintos y solo queda el último. | Antes del arreglo, `cursor.json`/`cls.json` solo contenían 1280×720. | Añadir `<viewport>` como segmento de ruta. | Cualquier spec QA multi-viewport que capture logs con el mismo nombre. | Que el brief incluya `<vp>` en la ruta o `artifactPath` acepte ámbito estable. | Bajo; solo rutas. | `pending` |

# Métricas de handoff

| Métrica | Valor |
|---|---|
| `brief_bytes` | 4081 |
| `report_bytes` | 4049 |
| `overflow` | `none` |
| `criteria_failed` | `none` |
