---
type: Task Report
title: "TASK-0129: informe de ejecución"
description: QA E2E del arranque de REQ-016 con capturas.
task: TASK-0129
attempt: 1
report_status: success
generated: { by: deepseek/v4.1-flash, at: 2026-11-15T10:37:00Z }
artifacts: artifacts/TASK-0129/attempt-1/
verified:
---

# Estado

`success`. Spec E2E del arranque completo con URL normal; sin cambios de producto
ni layout. [REQ-016 flujo](../../../docs/requirements/REQ-016-pantalla-inicio-configuracion.md#flujo),
[creativos](../../../docs/requirements/REQ-016-pantalla-inicio-configuracion.md#requisitos-creativos-decididos),
[técnicos](../../../docs/requirements/REQ-016-pantalla-inicio-configuracion.md#requisitos-técnicos),
[sprites](../../../docs/requirements/REQ-016-pantalla-inicio-configuracion.md#tabla-de-sprites).

# Cambios

- `tests/e2e/startup-flow-qa.spec.ts`: 6 tests (teclado, 1/2/6, semilla, nombre,
  cancelación en tres puntos, variante).
- 19 capturas versionadas; evidencia en `artifacts/TASK-0129/attempt-1/`.
- Commit de tests: `a685ad5`.

# Tests

| Comando | Resultado | Evidencia |
|---|---|---|
| `pnpm run test:e2e` | 235 passed | `e2e-output.txt` |
| `playwright test startup-flow-qa` | 6 passed | `e2e-targeted-output.txt` |
| `pnpm run test` | 1471 passed | `test-output.txt` |
| `pnpm run verify` | docs/config/test/build/bundle OK | `verify-output.txt` |

Cubre R-001, R-003/R-009/R-010, R-012/T-004, R-007/T-006, R-008/R-011, T-003,
T-007 y T-008.

# Evidencia visual

- `tests/e2e/startup-flow-qa/screenshots/`: menú y paso 1 a 1280×720 y 900×700,
  jugador y ficha, resumen 1/2/6, semilla inválida, confirmaciones, partida 1/2,
  mapa y HUD con variante 2.
- Mirar: HUD con recorte `(64,32)` del Guerrero v2; `Ñandú Pérez` duplicado y
  `Guerrero` por nombre vacío; aviso de semilla legible.
- 900×700: scroll interno previsto en `player-screen` (`520 > 488`,
  `overflow:auto`); el resumen de 6 cabe. Medición en `logs/scroll-900x700.json`.

# Desviaciones

- Ninguna de alcance. A 900×700 el `player-screen` exige scroll interno
  (`520 > 488`, `overflow:auto`): se documenta como observación, no como defecto
  de TASK-0129; las acciones siguen siendo accesibles con teclado y ratón.

# Problemas conocidos y preguntas abiertas

- `experiments/EXP-004-salas-irregulares/src/spawn.test.ts` agotó su timeout de
  5 s en tres `verify` del runner y en dos del lead (5104 ms, load 8-10 de 8
  CPUs); pasó al bajar la carga. Es previo y ajeno; test dirigido 20/20.
- `?test=1` sigue saltando el inicio; el spec nuevo usa `/` y `?seed=`.

# Fricción reutilizable

| Síntoma | Evidencia | Workaround | Por qué es reutilizable | Cambio propuesto | Coste/riesgo | Disposición |
|---|---|---|---|---|---|---|
| El barrido de EXP-004 roza el timeout de 5 s y hace fallar `verify` de forma intermitente. | `spawn.test.ts:608`, 5004 ms; 3 fallos y un pase. | Reintentar `verify`. | Afecta a cualquier cierre con verify. | Menos paralelismo para `experiments/**`, sin tocar timeouts. | Bajo. | `deferred` |

Disposición del lead: `deferred`; dueño `harness-keeper` para valorar el
paralelismo de `experiments/**`. Es previo, no lo provoca este diff y no bloquea
TASK-0129 (el verify del cierre pasó a la primera).

# Métricas de handoff

| Métrica | Valor |
|---|---|
| `brief_bytes` | 2201 |
| `report_bytes` | 2970 |
| `overflow` | `none` |
| `criteria_failed` | 0 |
