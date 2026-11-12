---
type: Task Report
title: "TASK-0077: informe del intento 1"
description: Encadenado determinista de acciones enemigas por tipo.
task: TASK-0077
attempt: 1
report_status: success
generated: { by: deepseek/v4.1-flash, at: 2026-11-12T18:10:00Z }
artifacts: artifacts/TASK-0077/attempt-1/
verified:
---

# Estado

`success`. Encadenado implementado y probado; el `verify` literal solo falla por
el timeout preexistente de `EXP-004`.

# Cambios

- `src/game/turn.ts`: `applyEnemyPlan` replanifica mientras queden acciones; el
  ataque gasta una vía `resolveAttack`. La cola para con espera, muerte, 0
  acciones, falta de progreso o muerte del objetivo. Huir no ataca al moverse;
  solo ataca acorralado. Tope defensivo de 16 planes.
- Tests adaptados: `ai`, `turn`, `combat`, `bestiary`, `integration` y
  `host/feedback`. Nuevos en `turn.test.ts`: 2/1/2 por tipo, dos tipos, dormido y
  regreso, huida con MP, acorralamiento, muerte del objetivo, fin de fase y
  determinismo sin `Math.random`.
- Sin cambios en `ai.ts`, percepción, bestiario, HUD, presentación, contador ni
  costes.
- Commit SHA: `04e40f7176684f74abf7928a2c61d2be11dd3233`.

# Tests

| Comando | Resultado | Evidencia |
|---|---|---|
| `pnpm run verify` | falla solo timeout ajeno de `EXP-004` | `verify-output.txt` |
| `vitest --testTimeout=15000` + docs/config/build/bundle | 1012 tests, build y bundle OK | `verify-fallback.txt` |
| `VITEST_MAX_WORKERS=1 pnpm run verify` | 1012 tests, build y bundle OK | `verify-output-single.txt` |
| `vitest run tests/unit` | 701 tests OK (51 archivos) | `test-output.txt` |

# Evidencia visual

- No aplica: los beats son TASK-0078.

# Desviaciones

- `verify` literal falla por `EXP-004` (`Test timed out in 5000ms`),
  reproducible antes del cambio; con `--testTimeout=15000` pasa. No se tocó
  `experiments/`.
- E2E no aplica según el plan. Algunos specs asumen un ataque por fase; su
  actualización es de TASK-0078.

# Problemas conocidos y preguntas abiertas

- ¿Se acepta la secuencia equivalente como evidencia mientras `EXP-004` siga
  flaky?

# Fricción reutilizable

| Síntoma | Evidencia | Workaround | Por qué es reutilizable | Cambio propuesto | Coste/riesgo | Disposición |
|---|---|---|---|---|---|---|
| El `verify` completo agota el timeout de 5 s en barridos de `EXP-004` (a veces `EXP-001`) | `verify-output.txt`, `verify-output-retry.txt`; aislado pasa en 4,3 s | `--testTimeout=15000` o `VITEST_MAX_WORKERS=1` | Se repite al cerrar tareas (TASK-0060/0070) | Subir el timeout solo a esos barridos o marcarlos `slow` | Bajo; no relaja aserciones | `pending` |

# Métricas de handoff

| Métrica | Valor |
|---|---|
| `brief_bytes` | 2088 |
| `report_bytes` | 2796 |
| `overflow` | `none` |
| `criteria_failed` | 1 (`verify` literal por timeout ajeno) |
