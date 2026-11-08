---
type: Task Report
title: "TASK-0039: informe de ejecución"
description: E2E y QA visual de percepción, alarma y huida.
task: TASK-0039
attempt: 1
report_status: success
generated: { by: deepseek/v4.1-flash, at: 2026-11-08T22:50:24Z }
artifacts: artifacts/TASK-0039/attempt-1/
verified:
---

# Estado

`success`. E2E 70/70, repetición 210/210 y `verify` OK; sin cambios de reglas.

# Cambios

- `src/host/{debug,session,main}.ts`: hook `setup` solo con `?test=1`; sin flag,
  API normal intacta (`advance,dispatch,snapshot`).
- `tests/e2e/perception-fixtures.ts`, `perception-alarm-qa.spec.ts` y
  `flee-behavior-qa.spec.ts`: detección, enfriamiento, daño/alarma 8/9, huida,
  acorralamiento, feedback, snapshot, R-010 y determinismo.
- Sin cambios en `src/game/`, combate, IA, percepción, bestiario, `docs/` ni
  dependencias.
- Commits: `0668f5a`, `650202f`, `1c37e48`.

# Tests

| Comando | Resultado | Evidencia |
|---|---|---|
| `E2E_ARTIFACTS_DIR=artifacts/TASK-0039/attempt-1 pnpm run test:e2e` | 70/70 en 27,5 s | `e2e-output.txt` |
| `pnpm run test:e2e --repeat-each=3` | 210/210 en 1,3 min | `e2e-repeat-output.txt` |
| `pnpm run verify` | docs/config OK; 559 unit; build OK | `verify-output.txt`, `lead-r010-verify.txt` |
| `pnpm exec playwright test tests/e2e/perception-alarm-qa.spec.ts` | 3/3 en 5,4 s | `lead-r010-e2e.txt` |

Cubre R-001–R-012 y T-010. R-010 usa `canSee`/`BESTIARY`: ningún enemigo ve al
jugador al inicio (`279837264`); dos ejecuciones coinciden.

# Evidencia visual

- `perception-alarm-qa/screenshots/`: `normal`, `debug-f1`, `deteccion-paso`,
  `deteccion-alerta`, `alarma-aviso`, `colocacion-semilla`.
- `flee-behavior-qa/screenshots/`: `huida`, `acorralado`.
- Revisadas a 1280×720: sin F1 no hay radios, F1 muestra 8, aviso dentro del HUD,
  "!" en detección, huida rompe LOS y acorralado ataca.

# Desviaciones

- Hook `setup` solo `?test=1` para estados no alcanzables con comandos reales
  (daño a dormido, 8/9 exacto, renovación, acorralamiento); sin mutadores vivos.
- Escenario A `MoveTo (1,2)→(4,2)`: detección en `(3,2)`; el bruto no ve al
  jugador desde `(5,4)` (Bresenham asimétrico) y el enfriamiento se cubre ahí.

# Problemas conocidos y preguntas abiertas

- Ninguno. `verify` conserva avisos de handoffs anteriores.

# Fricción reutilizable

Sin entradas: no se detectó fricción que cumpla un disparador.

# Métricas de handoff

| Métrica | Valor |
|---|---|
| `brief_bytes` | 2208 |
| `report_bytes` | 2541 |
| `overflow` | `none` |
| `criteria_failed` | 0 |
