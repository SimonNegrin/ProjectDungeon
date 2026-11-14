---
type: Task Report
title: "TASK-0099: informe de ejecución"
description: Pixelify Sans local, tokens semánticos, escalas por rol y --ui-line calculada desde el marco.
task: TASK-0099
attempt: 1
report_status: success
generated: { by: deepseek/v4.1-flash, at: 2026-11-14T00:20:00Z }
artifacts: artifacts/TASK-0099/attempt-1/
verified:
---

# Estado

`success`. No se marcó la tarea como `done` ni se fusionó nada.

# Cambios

- `src/host/ui.css` nuevo: estilos movidos de `index.html`, `@font-face`,
  tokens `--ui-*` y escalas por rol; `index.html` enlaza la hoja.
- `src/host/layout.ts`: `computeUiLine`; `src/host/main.ts` publica `--ui-line`
  desde `applyPresentation`/`ResizeObserver`.
- `public/fonts/pixelify-sans/`: TTF variable, `OFL.txt` y `README.txt`.
- Tests nuevos: `tests/unit/host/ui-foundations.test.ts`,
  `tests/e2e/ui-foundations-qa.spec.ts`; `layout.test.ts` ampliado.
- Commit: `4b4152f4f864dfac99ad9b5861258cf7f61e0347`.

# Tests

| Comando | Resultado | Evidencia |
|---|---|---|
| `pnpm run verify` | OK: docs, config, 1259 unitarios, build y bundle | `verify-output.txt` |
| `pnpm run test` | OK: 90 archivos / 1259 tests | `test-output.txt` |
| `pnpm run test:e2e` | OK: 134 tests | `e2e-output.txt` |
| `playwright test ui-foundations-qa` | OK: 3 tests | `e2e-focused-output.txt` |

# Evidencia visual

- `screenshots/{hud,panel,characters}-{1280x720,900x700}.png`.
- La tabla inyectada usa `--ui-font` con `--ui-title`, `--ui-body`, `--ui-data`
  y `--ui-help`; `ñ á é í ó ú ü ¿ ¡ « »` sin recortes.
- `logs/`: fuente 200, cero peticiones externas, familia resuelta en cuerpo,
  HUD y panel; línea 1,5 px a 1280×720 y 1 px a 900×700 (dpr 2).

# Desviaciones

- `--ui-line` es grosor; el color es `--ui-line-color`. La ficha lista
  `--ui-line` entre los ocho colores, incompatible con el grosor calculado.
- El E2E de línea usa `deviceScaleFactor: 2`: a dpr 1 las escalas ≈1,17 y ≈1,44
  redondean ambas a 1 px; a dpr 2 da 1 frente a 1,5 px.
- Añadí frontmatter OKF a `brief-detalle.md` del lead (solo cabecera) porque
  `docs:check` fallaba sin él.

# Fricción reutilizable

1. **`--ui-line` con dos significados.** Síntoma: color en ficha, grosor en
   detalle. Evidencia: ficha §Criterios y `brief-detalle.md` §Línea. Workaround:
   `--ui-line-color`. Reutilizable en tokens de UI. Propuesta: fijar ese nombre
   en plantilla/REQ-032. Coste bajo. `pending`.
2. **Diferencia de línea a dos viewports con dpr 1.** Síntoma: el brief pide
   valores distintos a 1280×720 y 900×700, pero el redondeo da 1 px en ambos.
   Evidencia: `logs/ui-foundations-line.json`. Workaround: E2E a dpr 2.
   Reutilizable en líneas escaladas. Propuesta: fijar dpr o usar 1920×1080.
   Coste bajo. `pending`.

# Preguntas

¿Se confirman `--ui-line-color` y el E2E a dpr 2 como evidencia aceptable?
