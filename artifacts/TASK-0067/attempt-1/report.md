---
type: Task Report
title: "TASK-0067: informe del intento 1"
description: UI del banco de ajuste de EXP-003 sobre el motor de TASK-0066.
task: TASK-0067
attempt: 1
report_status: success
generated: { by: deepseek/v4.1-flash, at: 2026-11-11T22:40:00Z }
artifacts: artifacts/TASK-0067/attempt-1/
verified:
---

# Estado

`success`. UI del banco de ajuste sobre el motor de TASK-0066, sin cambios en reglas, `src/`, `tests/` de producción, `index.html`, `public/` ni dependencias.

# Cambios

- `bench-ui.ts`/`bench-ui.test.ts`: validación, rangos, prune, formato, armas, descarga y resumen; `resetWeaponFieldOverride`; 20 tests.
- `main.ts`: tabla con objetivo/real/delta/estado, editor compartido, diagnóstico, tabla de armas, recálculo diferido, resets y API. Campos numéricos, objetivo y acierto/daño usan `input` con debounce; selects usan `change`. Reset por campo de arma y `aria-label` con enemigo/arma.
- `ensureRecalculated()` fuerza el flush pendiente en copiar/descargar y en `getDecision`, `snapshot`, `getResults` y `getDiagnosis`, sin colocarlo en `currentExport()`.
- `ui.ts`: tipos `BenchSnapshot`, API ampliada y `resetWeaponField`. `experiment.css`: editor responsive, selects a ancho completo y mínimo de campo de 240 px.
- Commit SHA: `d9e023a` (`fix(TASK-0067): fuerza el recálculo antes de exportar y ajusta los selects`).

# Tests

| Comando | Resultado | Evidencia |
|---|---|---|
| `pnpm run test` | 71 archivos, 945 tests OK | `test-output.txt` |
| `pnpm run verify` | docs, config, tests, build y bundle OK | `verify-output.txt` |
| `pnpm exec playwright test tests/e2e/experiment-combat.spec.ts` | 4/4 OK | `e2e-output.txt` |

Playwright manual (`?test=1&seed=1017`): escribir PV deja «Recalculando…» pendiente y `getDecision()` devuelve 4 filas coherentes con catálogo/overrides; `getResults()` y `snapshot()` también fuerzan el flush; descargar justo tras editar acierto/daño incluye el catálogo ajustado; el foco sigue en el campo; inválido se restaura; sin errores de consola.

# Evidencia visual

- `screenshots/banco-ajuste-editor.png`: página completa con tabla, editor y armas.
- `screenshots/banco-ajuste-armas.png`: panel de armas completo con reset por campo.
- `screenshots/banco-ajuste-editor-campos.png`: campos del editor completos; «Sin armadura» ya no se trunca.

# Desviaciones

- El nombre base conserva `EXP-003-v2.0-seed-<seed>-duels-<duels>.json`; con overrides usa `bench-overrides-<id>` vía `benchFileName`. El helper del motor sigue devolviendo `-bench-base` vacío, como fija TASK-0066.
- Rangos documentados: PV 1–999, stats −10–20, acciones 0–10, acierto −5–10 y daño 0–100, enteros. El brief no fijaba cifras.
- Sin E2E nuevos; la comprobación de UI fue un script temporal no versionado.

# Problemas conocidos y preguntas abiertas

- La tabla de 18 columnas exige scroll horizontal; no rompe foco ni funcionalidad.
- Los 12 emparejamientos siguen fuera de banda: el banco no aprueba balance.
- Sin bloqueos; TASK-0068 puede cubrir E2E y QA visual final.

# Fricción reutilizable

| Síntoma | Evidencia | Workaround | Por qué es reutilizable | Cambio propuesto | Coste/riesgo | Disposición |
|---|---|---|---|---|---|---|
| El nombre de descarga base choca entre brief/E2E y `benchExportFileName`. | Brief exige nombre v2.0; el helper de TASK-0066 devuelve `-bench-base`. | `benchFileName` ramifica overrides vacíos. | Todo consumidor futuro repetirá la bifurcación. | Unificar contrato en el motor o documentarlo. | Bajo; toca un test de TASK-0066. | `accepted` (documentado en `benchFileName`, el informe y la verificación del lead; no se cambia el motor) |

# Métricas de handoff

| Métrica | Valor |
|---|---|
| `brief_bytes` | 3005 |
| `report_bytes` | 3732 |
| `overflow` | `brief-detalle` |
| `criteria_failed` | 0 |
