---
type: Task Report
title: "TASK-0064: informe de ejecución"
description: Página v2 de EXP-003 con controles, tabla, detalle, export y API de test.
task: TASK-0064
attempt: 1
report_status: success
generated: { by: deepseek/v4.1-flash, at: 2026-11-11T15:57:00Z }
artifacts: artifacts/TASK-0064/attempt-1/
verified:
---

# Estado

`success`. Página v2.0 con semilla/duelos, 12 emparejamientos, detalle, export
reproducible y API. Hallazgo 96,3–100 % visible, fuera de banda 40–60 %; sin
balance fijado.

# Cambios

- `src/main.ts` y `src/experiment.css`: UI v2 completa.
- `src/ui.ts` + `src/ui.test.ts`: formato, agregación, snapshot y export.
- `src/v2/measure.ts`: `measureMatchups({seed, duels, catalog})`;
  `measureAll()` delega y conserva defaults y bytes.
- `tests/e2e/experiment-combat.spec.ts`: migrado a v2.
- Commit: `dfd815075563be5f358217b7d5181e8758bd44ec`.

# Tests

| Comando | Resultado | Evidencia |
|---|---|---|
| `pnpm run test` | 903/903, 69 archivos | `test-output.txt` |
| `pnpm run docs:check` | OK: 330 documentos | `docs-check-output.txt` |
| `pnpm run verify` | OK: tests, `tsc`, build y bundle | `verify-output.txt` |
| `pnpm run test:e2e tests/e2e/experiment-combat.spec.ts` | 4/4 | `e2e-output.txt` |

# Evidencia visual

- `experiment-combat/screenshots/` (tabla, detalle, controles, export) y JSON
  en `experiment-combat/exports/`. Mirar: balance, tabla, detalle y export.

# Desviaciones

- `measureAll` delega en `measureMatchups`; defaults y JSON byte a byte intactos
  (test).
- Descarga con blob local para nombrar
  `EXP-003-v2.0-seed-1017-duels-1000.json`; copiar reutiliza `copyJson`.
- v2 no edita roster: el e2e cubre controles, recálculo, detalle, export y API;
  la edición v1 queda fuera del alcance data-driven.
- `test:e2e -- <spec>` no filtra en pnpm 12 (pasa `--` y corre 98 pruebas); usé
  `pnpm run test:e2e tests/e2e/experiment-combat.spec.ts`.

# Problemas conocidos y preguntas abiertas

- Los 12 emparejamientos siguen fuera de banda; la tarea solo los mide.
- `experiments/manifest.ts` y `experiment.md` aún describen la v1; no los toqué.
  Quedan para `requirements-writer` al cerrar el experimento; fuera del alcance
  de esta tarea.

# Fricción reutilizable

| Síntoma | Evidencia | Workaround | Por qué se repite | Cambio propuesto | Coste/riesgo | Disposición |
|---|---|---|---|---|---|---|
| `test:e2e -- <spec>` corre todo | `playwright test --` + 98 tests | Quitar `--` | El brief usa `--` | Corregir el comando en futuros briefs; no es un defecto del producto | Bajo | `deferred`; owner `harness-keeper` vía `requirements-writer` |

Handoff: brief 2791 B · informe 2701 B · sin overflow · `criteria_failed` 0.
