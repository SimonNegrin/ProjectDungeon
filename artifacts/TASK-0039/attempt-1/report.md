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

- `src/host/{debug,session,main}.ts`: hook `setup` opcional solo con `?test=1`;
  `GameSession.load`. Sin el flag, la API conserva `advance,dispatch,snapshot`.
- `tests/e2e/perception-fixtures.ts`, `perception-alarm-qa.spec.ts` y
  `flee-behavior-qa.spec.ts`: detección, enfriamiento, daño/alarma 8/9, huida,
  acorralamiento, feedback, snapshot, R-010 y determinismo.
- Sin cambios en `src/game/`, combate, IA, percepción, bestiario, `docs/` ni
  dependencias.
- Commit: `0668f5a` (código y tests); artefactos en el commit siguiente.

# Tests

| Comando | Resultado | Evidencia |
|---|---|---|
| `E2E_ARTIFACTS_DIR=artifacts/TASK-0039/attempt-1 pnpm run test:e2e` | 70/70 en 27,0 s | `e2e-output.txt` |
| `pnpm run test:e2e --repeat-each=3` | 210/210 en 1,3 min | `e2e-repeat-output.txt` |
| `pnpm run verify` | docs/config OK; 559 unit; build OK | `verify-output.txt` |

Cubre R-001 a R-012 y T-010, incluida la semilla `279837264` y dos ejecuciones
idénticas.

# Evidencia visual

- `perception-alarm-qa/screenshots/`: `normal`, `debug-f1`, `deteccion-paso`,
  `deteccion-alerta`, `alarma-aviso`, `colocacion-semilla`.
- `flee-behavior-qa/screenshots/`: `huida`, `acorralado`.
- Revisadas a 1280×720: sin F1 no hay radios; F1 muestra 8; el aviso queda
  dentro del HUD y sobre el marco (aserciones de caja); "!" en la detección;
  huida que rompe LOS; acorralado ataca.

# Desviaciones

- Hook `setup` solo `?test=1` para escenarios no alcanzables con comandos
  reales (daño a un dormido, 8/9 exacto, renovación, acorralamiento). No expone
  mutadores del estado vivo.
- Escenario A `MoveTo (1,2)→(4,2)`: detección en `(3,2)`; el bruto no ve al
  jugador desde `(5,4)` (Bresenham asimétrico) y el enfriamiento se cubre ahí.

# Problemas conocidos y preguntas abiertas

- Ninguno. `verify` conserva avisos de handoffs anteriores; no afectan.

# Fricción reutilizable

Sin entradas: no se detectó fricción que cumpla un disparador.

# Métricas de handoff

| Métrica | Valor |
|---|---|
| `brief_bytes` | 2208 |
| `report_bytes` | 2507 |
| `overflow` | `none` |
| `criteria_failed` | 0 |
