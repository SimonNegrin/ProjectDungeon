---
type: Task Report
title: "TASK-0040: informe de ejecución"
description: EXP-004 construido con A/B/C deterministas, render real, spawn, enemigos y export.
task: TASK-0040
attempt: 1
report_status: success
generated: { by: deepseek/v4.1-flash, at: 2026-11-09T00:38:00Z }
artifacts: artifacts/TASK-0040/attempt-1/
verified:
---

# Estado

`success`. EXP-004 operativo, determinista y con tileset real; tests, build y QA
visual completados.

# Cambios

- `experiments/EXP-004-salas-irregulares/`: página, generadores A/B/C, render,
  spawn/enemigos, métricas, export y tests.
- `experiments/manifest.ts`: entrada `EXP-004` (`ready`).
- Commit SHA: `394d424`.

# Tests

| Comando | Resultado | Evidencia |
|---|---|---|
| `pnpm run verify` | OK | `verify-output.txt` |
| `pnpm run test` | 40 archivos, 584 tests OK | `test-output.txt` |
| `pnpm run docs:check` | OK con avisos preexistentes | `docs-check-output.txt` |
| `pnpm run build` | OK, sin warnings TS | `build-output.txt` |

# Evidencia visual

- `screenshots/`: 25 PNG 1280×720 (overview + A/B/C × 4 semillas × normal/debug).
  Caverna: growth 5, bsp 2, templates 1. Wide: growth 4, bsp 4, templates 2.
  Revisar mapa, `13×13`, puertas, spawn, fichas y debug.
- `decision-example.json`, `capture-log.txt`, `logs/`. Export descarga
  `EXP-004-data.json` (`exportOk: true`, sin errores).

# Desviaciones

- No se ejecutó `test:e2e`: no hay spec para EXP-004; QA visual con `capture.mjs`
  en Chromium.
- Wide por variante: A 9/30 (30 %), B 8/30 (27 %), C 6/30 (20 %). Agregado
  23/90 (25,6 %), dentro del 25-40 %; C queda bajo el objetivo individual.
- `docs:check` avisa de handoffs; no se editó `docs/`.
- No se tocaron `src/`, `tests/`, el `index.html` raíz ni `public/`.

# Problemas conocidos y preguntas abiertas

- La variante C puede no abrir wide en mapas empaquetados; forzar una cámara
  extra es una decisión de diseño.
- La elección A/B/C sigue abierta al playtest.

# Fricción reutilizable

| Síntoma | Evidencia | Workaround | Por qué es reutilizable | Cambio propuesto | Coste/riesgo | Disposición |
|---|---|---|---|---|---|---|
| Un script bajo `artifacts/` que importa `playwright` falla por el layout de pnpm. | `logs/capture.log` | Importar `@playwright/test`. | Cualquier captura fuera de `tests/e2e` repite el fallo. | Documentarlo o exponer `playwright` como dependencia. | Bajo. | `pending` |

# Métricas de handoff

| Métrica | Valor |
|---|---|
| `brief_bytes` | 2442 |
| `report_bytes` | 2557 |
| `overflow` | `none` |
| `criteria_failed` | `none` |
