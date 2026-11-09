---
type: Task Report
title: "TASK-0040: informe del intento 2"
description: Corregidas las puertas 13×13, el grosor de muro y el estado del experimento.
task: TASK-0040
attempt: 2
report_status: success
generated: { by: deepseek/v4.1-flash, at: 2026-11-09T00:52:00Z }
artifacts: artifacts/TASK-0040/attempt-2/
verified:
  - by: task-lead
    at: 2026-11-09T00:53:51Z
    note: >-
      Intento 2 verificado: verify con 588 tests y build OK; E2E 70/70;
      grosor 1/2 cambia huellas y conserva puertas directas; puertas del
      13×13 alineadas. Ver nota completa en la tarea.
---

# Estado

`success`. Tres hallazgos corregidos sin tocar producción.

# Cambios

- `render.ts`: `drawDoor` resta `view.x/y`, descarta puertas fuera y recorta el
  tablero; `render.test.ts` cubre origen y descarte.
- `generate.ts`: `wallThickness` afecta colocación y enlaces (preferencia 1-2
  tiles), conserva la puerta directa, añade salientes de alineación y desplaza
  salas BSP no grandes con grosor 2. Tests nuevos comparan 1/2 y validan 12
  semillas con grosor 2.
- `experiment.md`: `experiment_status: ready`, `updated_at`, observaciones y
  enlaces al informe/capturas. La decisión sigue abierta.
- Commit SHA: `55313d2`.

# Tests

| Comando | Resultado | Evidencia |
|---|---|---|
| `pnpm run test` | 41 archivos, 588 tests OK | `test-output.txt` |
| `pnpm run docs:check` | OK | `docs-check-output.txt` |
| `pnpm run build` | OK, sin warnings TS | `build-output.txt` |

# Evidencia visual

- `screenshots/`: 16 PNG (referencia 279837264 y semilla 5 caverna) con página
  normal/debug y recortes `fullmap`/`13x13`.
- Semilla 5 y 13×13 alineados, sin marcas en el margen negro.
- `decision-example.json`, `capture-log.txt` y `logs/`.

# Desviaciones

- Wide de C: 6/30 (20 %); agregado A/B/C 23/90 (25,6 %), dentro del 25-40 %.
- `docs:check` mantiene avisos preexistentes de tamaño de handoffs.
- Sin `test:e2e` (no hay spec de EXP-004).
- Sin cambios en `src/`, `tests/`, `index.html` ni `public/`; docs task
  preexistente sin commitear.

# Problemas conocidos y preguntas abiertas

- C puede no abrir wide en mapas empaquetados; forzar una cámara extra es una
  decisión de diseño.
- La elección A/B/C sigue abierta al playtest.

# Fricción reutilizable

| Síntoma | Evidencia | Workaround | Por qué es reutilizable | Cambio propuesto | Coste/riesgo | Disposición |
|---|---|---|---|---|---|---|
| Script bajo `artifacts/` que importa `playwright` falla por pnpm. | `logs/capture.log` | Importar `@playwright/test`. | Se repite en capturas fuera de `tests/e2e`. | Documentarlo en `docs/harness/visual-qa.md`. | Bajo. | `deferred` — dueño `requirements-writer` |

# Métricas de handoff

| Métrica | Valor |
|---|---|
| `brief_bytes` | 3111 |
| `report_bytes` | 2844 |
| `overflow` | `none` |
| `criteria_failed` | `none` |
