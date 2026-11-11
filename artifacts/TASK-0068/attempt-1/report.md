---
type: Task Report
title: "TASK-0068: informe del intento 1"
description: E2E y QA visual del banco de ajuste de EXP-003.
task: TASK-0068
attempt: 1
report_status: success
generated: { by: deepseek/v4.1-flash, at: 2026-11-11T23:40:00Z }
artifacts: artifacts/TASK-0068/attempt-1/
verified:
---

# Estado

`success`. Spec E2E nuevo del banco de ajuste, verde junto al de combate y a
`pnpm run verify`, sin tocar producto ni tests existentes.

# Cambios

- `tests/e2e/experiment-bench.spec.ts`: 7 tests. PV de Centinela (4 filas
  afectadas, 8 intactas, editor y foco conservados); objetivo 100 (delta, 4/4
  dentro, vuelta a la guía 75); daño de espada 3→8 (6 filas, otras 6 intactas,
  reset); reset por enemigo y global (base, overrides vacíos, export sin
  overrides); export (catálogo ajustado, objetivos, diagnóstico, `overridesId`,
  lecturas y descarga idénticas); QA visual 1280×720 y 900×700 (sin
  desbordamiento del documento, scroll interno, dentro/fuera por texto, foco
  visible).
- Sin cambios en `src/`, `index.html`, `public/`, `experiments/` ni en
  `experiment-combat.spec.ts`.
- Commit SHA: `29ebd79`; este informe va en un commit posterior.

# Tests

| Comando | Resultado | Evidencia |
|---|---|---|
| `E2E_ARTIFACTS_DIR=artifacts/TASK-0068/attempt-1 pnpm run test:e2e tests/e2e/experiment-bench.spec.ts` | 7/7 OK | `test-output.txt` |
| `pnpm run test:e2e tests/e2e/experiment-combat.spec.ts` | 4/4 OK | `e2e-combat-output.txt` |
| `pnpm run verify` | 945 tests, build y bundle OK | `verify-output.txt` |

# Evidencia visual

Ruta real `artifacts/TASK-0068/attempt-1/experiment-bench/screenshots/`
(`artifactPath` añade el subdirectorio del spec):

- `qa-<vp>-editor.png`: página completa, editor abierto, objetivo 100.
- `qa-<vp>-editor-campo.png`: filas «dentro»/«fuera» y campos reales.
- `qa-<vp>-armas.png`: armas, portadores y resets.
- `qa-<vp>-foco.png`: foco de teclado visible (outline 2 px).
- `enemigo-pv-editor-abierto.png`, `objetivo-4-de-4-restaurado.png`,
  `export-ajustado.png`, `reset-global-base.png`.

# Desviaciones

- El brief-detalle promete `…-bench-base.json` sin overrides, pero la descarga
  base conserva el nombre histórico
  `EXP-003-v2.0-seed-1017-duels-1000.json` (`benchFileName`, aceptado en
  TASK-0067). El test fija lo real; `benchExportFileName` sigue devolviendo
  `-bench-base` en unitarios.
- Dos tests visuales (uno por viewport) y capturas recortadas, no uno solo.
- La tabla exige scroll horizontal interno en ambos viewports; las capturas
  cortan columnas por ese scroll, no por desbordamiento.

# Problemas conocidos y preguntas abiertas

- Sin bloqueos. Suite ~7 s; capturas ~4 MB.
- `docs:check` avisa de `brief.md` con 2991 B (>2560); es del lead.

# Fricción reutilizable

| Síntoma | Evidencia | Workaround | Por qué es reutilizable | Cambio propuesto | Coste/riesgo | Disposición |
|---|---|---|---|---|---|---|
| Brief y UI discrepan sobre el nombre del export base. | Brief: `-bench-base`; `benchFileName` da el nombre v2.0. | Asertar lo real y documentarlo. | Ya pasó en TASK-0067 y volverá en cada E2E de export. | Corregir el brief o unificar en `benchExportFileName`. | Bajo. | `pending` |
