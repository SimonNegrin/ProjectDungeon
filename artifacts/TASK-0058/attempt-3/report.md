---
type: Task Report
title: "TASK-0058: informe de ejecución del intento 3"
description: "Congela el reloj antes de muestrear cues y elimina la carrera real del E2E de fallo."
task: TASK-0058
attempt: 3
report_status: success
generated: { by: deepseek/v4.1-flash, at: 2026-11-10T19:10:00Z }
artifacts: artifacts/TASK-0058/attempt-3/
verified:
---

# Estado

`success`.

# Cambios

- `tests/e2e/support.ts`: `advanceToCue` congela con `advance(0)` antes de leer
  cues; `dispatchFrozen` despacha y congela en el mismo `page.evaluate`, sin
  ventana para el rAF real.
- `tests/e2e/feedback-combat-qa.spec.ts`: impacto, fallo y muerte usan
  `dispatchFrozen`. Aserciones intactas: `hit:true`, `hit:false` + `Fallo`, cue
  `death` y cadáver persistente.
- Sin cambios en `src/`, `experiments/`, dependencias ni otros E2E.
- Commit de código: `7f60caa68f8a4bacc0b18a171631508e53933e47`.

# Tests

| Comando | Resultado | Evidencia |
|---|---|---|
| `pnpm exec vitest run tests/unit/host` | 21 archivos, 311 tests OK | `test-output.txt` |
| `pnpm run verify` | docs/config/tests/build/bundle OK (790) | `verify-output.txt` |
| `pnpm run test:e2e` | 80 tests OK (46,1 s) | `e2e-output.txt` |
| `... --repeat-each=3` | 9 tests OK (7,4 s) | `e2e-repeat-output.txt` |

# Evidencia visual

- `screenshots/{impacto,fallo,muerte,cadaver}.png`. Las tres primeras cambian
  respecto al intento 2: ahora muestrean a 70 ms exactos desde 0; `cadaver` es
  idéntico.
- Mirar `fallo.png` (gesto y `Fallo`), `muerte.png` (secuencia) y `cadaver.png`
  (persistencia).

# Desviaciones

- La ficha ya traía cambios sin commitear; no los edité ni entran en mis
  commits.
- No se conservaron capturas de otros specs ni los directorios temporales de
  `--repeat-each`; solo las cuatro pedidas.

# Problemas conocidos y preguntas abiertas

- Ninguno bloqueante. `dispatchFrozen` se usa solo en esta suite; los tests que
  necesitan el reloj real conservan `dispatchCommand`.

# Fricción reutilizable

| Síntoma | Evidencia | Workaround | Por qué es reutilizable | Cambio propuesto | Coste/riesgo | Disposición |
|---|---|---|---|---|---|---|
| Un cue podía vencer si el rAF avanzaba entre `dispatch` y `advanceToCue` | `attempt-2/lead-e2e-output.txt` | `dispatchFrozen` + `advance(0)` | Cualquier E2E que muestree ventanas cortas tras un dispatch | Documentar el congelado en `workflow.md` | Bajo | `pending` |

# Métricas de handoff

| Métrica | Valor |
|---|---|
| `brief_bytes` | 2503 |
| `report_bytes` | 2553 |
| `overflow` | `none` |
| `criteria_failed` | 0 |
