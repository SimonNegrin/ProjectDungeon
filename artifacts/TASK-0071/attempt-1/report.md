---
type: Task Report
title: "TASK-0071: informe del intento 1"
description: E2E y QA visual de las tres tablas inline de EXP-003.
task: TASK-0071
attempt: 1
report_status: success
generated: { by: deepseek/v4.1-flash, at: 2026-11-11T23:05:00Z }
artifacts: artifacts/TASK-0071/attempt-1/
verified:
---

# Estado

`success`. Los dos specs E2E, la suite completa y `pnpm run verify` pasan en
`task/TASK-0071`.

# Cambios

- `tests/e2e/experiment-bench.spec.ts`: reescrito para enemigo compartido,
  héroe, arma, objetivo, resets, export y QA visual. El export re-ejecuta
  `runAll()` y exige los mismos `matchups` y el mismo JSON.
- `tests/e2e/experiment-combat.spec.ts`: solo localizadores `matchup-*` →
  `combats-*`/detalle; aserciones de motor y export intactas.
- `experiments/EXP-003-mesa-combate/src/experiment.css`: 11 líneas para evitar
  recortes.
- Commits: `8a17f7b` (CSS), `13be604` (tests), `49e374a` (rerun); evidencias
  después.

# Tests

| Comando | Timeout | Resultado | Evidencia |
|---|---:|---|---|
| Dos specs con `E2E_ARTIFACTS_DIR` | 180 s | 12/12, 9,6 s | `logs/e2e-iteration-final-2.txt` |
| `pnpm run test:e2e` | 300 s | 106/106, 59,9 s | `test-output.txt` |
| `pnpm run verify` | 300 s | 974 tests, build y bundle OK | `verify-output.txt` |

# Evidencia visual

- `screenshots/bench-{before,after}-css-qa-{1280x720,900x700}-combates.png`.
- `screenshots/bench-qa-1280x720-{combates,armas,heroes,foco,detalle,bloque}.png`
  y `bench-qa-900x700-{combates,foco,viewport}.png`; detalle:
  `combat-{tabla-12-emparejamientos,detalle-picaro-bruto}.png`.
- Origen: `experiment-bench/screenshots/` y `experiment-combat/screenshots/`.
  Mirar `% real`, victorias sin elipsis, scroll a 900 y foco.

# Desviaciones

- La QA inicial mostró victorias, `% real` y cabeceras recortadas a 1280
  (R-006/R-007 bajo R-015/T-005). Ajuste CSS mínimo: salto de línea en celdas y
  cabeceras; sin cambiar columnas, marcado ni funcionalidad.
- El recálculo se comprueba por el objeto de medición y `bench-status`; el texto
  solo cambia si varía el resultado. Las filas no afectadas quedan idénticas.

# Problemas conocidos y preguntas abiertas

- `select` nativos truncan «Sin armadura»/«Sin escudo»; al desplegar se lee la
  opción.
- A 900×700 combates y héroes exigen scroll interno, comportamiento pedido.
- Sin preguntas abiertas.

# Fricción reutilizable

Ninguna

# Métricas de handoff

| Métrica | Valor |
|---|---|
| `brief_bytes` | 2204 |
| `report_bytes` | 2553 |
| `overflow` | `none` |
| `criteria_failed` | `0` |
