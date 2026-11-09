---
type: Task Report
title: "TASK-0040: informe de ejecución"
description: EXP-004 construido con A/B/C deterministas, render real, spawn, enemigos y export.
task: TASK-0040
attempt: 1
report_status: success
generated: { by: deepseek/v4.1-flash, at: 2026-11-09T00:37:00Z }
artifacts: artifacts/TASK-0040/attempt-1/
verified:
---

# Estado

`success`. Comparador A/B/C de mazmorra densa operativo, determinista y con el
tileset real; tests, build y checklist visual completados.

# Cambios

- `experiments/EXP-004-salas-irregulares/`: página, generadores A/B/C,
  validadores, spawn/enemigos, render Canvas, métricas, export y tests.
- `experiments/manifest.ts`: entrada `EXP-004` (`ready`).
- Commit SHA: `d3628d0`.

# Tests

| Comando | Resultado | Evidencia |
|---|---|---|
| `pnpm run verify` | OK | `verify-output.txt` |
| `pnpm run test` | 40 archivos, 584 tests OK | `test-output.txt` |
| `pnpm run docs:check` | OK con avisos preexistentes | `docs-check-output.txt` |
| `pnpm run build` | OK, sin warnings TS | `build-output.txt` |

Cubre determinismo (24 semillas), conectividad, borde, diagonales,
formas/muescas/ratio, longitudes, puertas, bucles, frecuencias, spawn,
visión, reparto/tipos de enemigos, serialización y opciones extremas.

# Evidencia visual

- `screenshots/`: 25 PNG a 1280×720 (overview + A/B/C × 4 semillas × normal y
  debug). Caverna: growth 5, bsp 2, templates 1. Wide: growth 4, bsp 4,
  templates 2.
- `decision-example.json`, `capture-log.txt`, `logs/`.
- Revisar mapa completo, `13×13`, puertas, spawn, fichas y debug. El botón de
  export descarga `EXP-004-data.json` (`exportOk: true`, sin errores de consola).

# Desviaciones

- No se ejecutó `pnpm run test:e2e`: no hay spec para EXP-004; la QA visual se
  hizo con `capture.mjs` sobre Chromium.
- Frecuencia wide por variante: A 9/30 (30 %), B 8/30 (27 %), C 6/30 (20 %).
  El agregado A/B/C es 23/90 (25,6 %), dentro del 25-40 %; C queda por debajo
  del objetivo individual. Se documenta, no se relaja la generación.
- `docs:check` avisa de tamaños de handoffs; no se editó `docs/`.
- No se tocaron `src/`, `tests/`, el `index.html` raíz ni `public/`.

# Problemas conocidos y preguntas abiertas

- La variante C puede no abrir pasillo ancho en mapas muy empaquetados; forzar
  una cámara extra es una decisión de diseño.
- La elección A/B/C sigue abierta al playtest; el experimento solo exporta
  datos y no decide.

# Fricción reutilizable

| Síntoma | Evidencia | Workaround | Por qué es reutilizable | Cambio propuesto | Coste/riesgo | Disposición |
|---|---|---|---|---|---|---|
| Un script bajo `artifacts/` que importa `playwright` falla por el layout estricto de pnpm. | `logs/capture.log` | Importar `@playwright/test`. | Cualquier captura de evidencia fuera de `tests/e2e` repite el fallo. | Documentarlo o exponer `playwright` como dependencia directa. | Bajo. | `pending` |

# Métricas de handoff

| Métrica | Valor |
|---|---|
| `brief_bytes` | 2442 |
| `report_bytes` | 3066 |
| `overflow` | `none` |
| `criteria_failed` | `none` |
