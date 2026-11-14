---
type: Task Report
title: "TASK-0104: informe del intento 1"
description: Escala continua ligada al marco, paleta de ocho colores y relieve de biseles.
task: TASK-0104
attempt: 1
report_status: success
generated: { by: deepseek/v4.1-flash, at: 2026-11-14T12:31:00Z }
artifacts: artifacts/TASK-0104/attempt-1/
verified:
---

# Estado

`success`. UI de juego con una escala continua, la paleta aprobada y biseles
outset/inset; sin recomponer HUD, ficha, panel ni cursor.

# Cambios

- Archivos: `src/host/layout.ts`, `main.ts`, `ui.css`, `feedback-overlay-view.ts`,
  `inventory-panel-view.ts`, `index.html` y siete suites de `tests/**`.
- Commit de código: `cad8a62`. Commit de tests: `adad30c`.
- `--ui-scale` se publica desde `layout.scale`; `computeUiLine` es lineal y sin
  dpr. El marco exterior usa `::after`; los sprites de retrato e item escalan.

# Tests

| Comando | Timeout | Resultado | Evidencia |
|---|---:|---|---|
| `pnpm run verify` | 120 s | OK: docs, config, 1305 tests, `tsc`, build y bundle | `verify-output.txt` |
| `pnpm run docs:check` | 60 s | OK; avisos de tamaño de handoffs existentes | terminal |
| `pnpm run test:e2e` | 180 s | 152/152 | `e2e-output.txt` |
| `E2E_ARTIFACTS_DIR=… pnpm run test:e2e` | 180 s | Capturas y logs de UI | `e2e/` |

Métricas medidas: a 900×700 el marco mide 488,25 px, escala 1,1736779, cuerpo
13,1452 px y línea 1,1736779 px; a 1280×720, marco 666 px, escala 1,6009615,
cuerpo 17,9308 px y línea 1,6009615 px. La relación cuerpo/altura es 0,026923 en
ambos. Cuerpo dentro de ±1 px de 12,8 y 18,8; la línea no es entera ni se
cuantiza al redimensionar.

# Evidencia visual

- HUD, panel, hechizos y overlays a ambos tamaños:
  `e2e/ui-foundations-qa/screenshots/{hud,panel,spells,overlay-victory,overlay-banner}-{1280x720,900x700}.png`.
- Paleta del cursor: `e2e/cursor-qa/screenshots/cursor-*.png`.
- Marco/canvas intactos: `e2e/frame-qa/screenshots/`.
- Logs de escala, línea y estilos en `e2e/ui-foundations-qa/logs/`.
- Debe mirarse: biseles claro/oscuro, ocho colores, ausencia de esquinas
  redondeadas y tamaño del cuerpo en ambos viewports.

# Desviaciones

- `inventory-equipment-qa` y `panel-three-columns-qa`: con la escala nueva cuatro
  objetos del suelo ya no caben a 1280×720 y su zona se desplaza en vertical.
  Se conserva la cobertura de que panel, cuerpo y columnas no desbordan; REQ-033
  R-013 permite el scroll propio del suelo.
- `floor-qa`: el umbral de «píxel brillante» se ajusta de blanco puro al texto
  `#fcffc0`; sigue comprobando que el punto del camino se pinta sobre el decal.
- El cursor queda hueco (sin relleno) para no tapar el tile; borde y marca usan
  tokens. La constante 11,2 px se mantiene: cumple ±1 sin tocar más valores.

# Problemas conocidos

- En el panel actual algunos nombres de slot se eliden con «…» al escalar; la
  recomposición de TASK-0106/0107 los sustituye por solo icono.
- `pnpm run test` tuvo un timeout aislado de 5 s en EXP-004 bajo carga paralela;
  la repetición y el `verify` posterior pasaron. No se tocó el experimento.

# Fricción reutilizable

Ninguna nueva.

# Métricas de handoff

| Métrica | Valor |
|---|---|
| `brief_bytes` | 3276 |
| `report_bytes` | 3281 |
| `overflow` | `none` |
| `criteria_failed` | `none` |
