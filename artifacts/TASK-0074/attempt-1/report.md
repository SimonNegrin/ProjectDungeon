---
type: Task Report
title: "TASK-0074: informe de ejecución"
description: E2E y QA visual de objetivos por par, filtros y export v2 de EXP-003.
task: TASK-0074
attempt: 1
report_status: success
generated: { by: deepseek/v4.1-flash, at: 2026-11-11T23:50:00Z }
artifacts: artifacts/TASK-0074/attempt-1/
verified:
---

# Estado

`success`. El E2E refleja el modelo por par y cubre filtros, resets, export v2 y
QA visual. `verify` y la suite E2E completa pasan; sin cambios de producción.

# Cambios

- `tests/e2e/experiment-bench.spec.ts`: 11 tests (3 previos; 8 nuevos/adaptados:
  objetivo por par, dos pares sin dispersión, resets, filtros, export y QA).
- Commit `2f76f13`. Sin cambios en `experiments/**`, `src/**`, `index.html`,
  `public/**` ni unitarios.

# Tests

| Comando | Resultado | Evidencia |
|---|---|---|
| `pnpm run verify` | OK: 993 tests, tsc, build y bundle | `verify-output.txt` |
| `E2E_ARTIFACTS_DIR=artifacts/TASK-0074/attempt-1 pnpm run test:e2e` | 109 passed; 11/11 del spec | `e2e-output.txt` |

Sin `--repeat-each`; 5 rojos iniciales por testids/modelo antiguos, aserciones
adaptadas sin debilitar.

# Evidencia visual

- `experiment-bench/screenshots/`: `combates-filtro-{heroe,enemigo}.png`,
  `combates-sin-resultados.png`, `armas-filtro-unidad.png`, `heroes-filtro.png`,
  `objetivo-por-fila-{antes,despues}.png`, `qa-{1280x720,900x700}-*`.
- `experiment-bench/exports/`: `bench-base.json`,
  `bench-overrides-384541b3.json`, `...-targets-8d36362b.json`.

A 1280 sin overflow; a 900 scroll interno; el vacío avisa y conserva el foco.

# Desviaciones

- Export: el brief decía «bench-base» sin overrides, pero se conserva
  `EXP-003-v2.0-seed-1017-duels-1000.json` (`bench-ui.ts:668-675`); E2E adaptado,
  producción intacta.
- `REQ-018-inventario-equipo.md` lo modificó otra sesión; no entró en el commit.

# Problemas conocidos y preguntas abiertas

- Ninguno funcional; juicio estético del usuario.

# Fricción reutilizable

| Síntoma | Evidencia | Workaround | Reutilizable | Cambio propuesto | Coste/riesgo | Disposición |
|---|---|---|---|---|---|---|
| Brief dice `bench-base` sin overrides; el código usa el nombre histórico. | `bench-ui.ts:668-675`; `bench-ui.test.ts:503-505`. | Ver unitarios; adaptar E2E. | Nombres de export en futuras tareas. | Corregir el brief o documentar la regla. | Bajo; documentación. | `pending` |

# Métricas de handoff

| Métrica | Valor |
|---|---|
| `brief_bytes` | 2289 |
| `report_bytes` | 2543 |
| `overflow` | `none` |
| `criteria_failed` | 0 |
