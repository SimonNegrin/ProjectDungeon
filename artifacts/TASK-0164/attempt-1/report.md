---
type: Task Report
title: "TASK-0164: informe de ejecución"
description: "El camino del cursor se planifica desde el jugador activo en hotseat."
task: TASK-0164
attempt: 1
report_status: success
generated: { by: deepseek/v4.1-flash, at: 2026-11-16T14:32:00Z }
artifacts: artifacts/TASK-0164/attempt-1/
verified:
---

# Estado

`success`. El origen del camino sigue a `activePlayer(state)` y cambia con `N`.

# Cambios

- `src/host/cursor.ts`: el actor de `deriveCursorStatus` sale de
  `activePlayer(state)` y exige que siga vivo; sin activo válido se conserva el
  estado oculto e inválido. No cambia la planificación ni el motor.
- `tests/unit/host/cursor.test.ts`: cuatro tests nuevos (activo segundo, activo
  primero, MP del activo y sin activo). El helper `playerAt` admite id.
- `tests/e2e/hotseat-cursor-origin-qa.spec.ts`: dos jugadores, `N`, camino de un
  paso desde el segundo y `MoveTo` que ejecuta ese mismo camino.
- Commit SHA: `2262eef`.

# Tests

| Comando | Resultado | Evidencia |
|---|---|---|
| `pnpm exec vitest run tests/unit/host/cursor.test.ts` antes del arreglo | 3 fallos / 15 pasan | `unit-failing-output.txt` |
| `pnpm exec vitest run tests/unit/host/cursor.test.ts` | 18/18 | `unit-output.txt` |
| `pnpm run test:e2e hotseat-cursor-origin-qa` | 1/1 | `e2e-spec-output.txt` |
| `pnpm run verify` | OK: 765 docs, 113 archivos / 1825 tests, tsc, build y bundle | `verify-output.txt` |
| `pnpm run test:e2e` | 283/283 | `e2e-output.txt` |

# Evidencia visual

- No aplica: la tarea prohíbe capturas porque no cambia el aspecto, solo el
  origen del trazado.

# Desviaciones

- La primera corrida E2E completa dio un timeout de carga en `loot-qa`
  (`waitForFunction` en `openBspState`), ajeno al cursor. `pnpm run test:e2e
  loot-qa` pasó 3/3 y la segunda corrida completa pasó 283/283; el extracto del
  fallo queda en `e2e-first-run-failure.txt`.
- No se tocó `docs/`: la ficha no declara `scope:` documental.

# Problemas conocidos y preguntas abiertas

- Un fantasma activo sigue sin cursor propio: el criterio pedía conservar el
  oculto sin activo vivo y este intento no abre el alcance de REQ-021.
- Queda para `game-lead` marcar los criterios y ejecutar
  `pnpm run verify:task TASK-0164`.

# Fricción reutilizable

Sin entradas: el timeout E2E no se reprodujo y no cumple un disparador estable.

# Métricas de handoff

| Métrica | Valor |
|---|---|
| `brief_bytes` | `none` (primer intento) |
| `report_bytes` | 2522 |
| `overflow` | `none` |
| `criteria_failed` | `0` |
