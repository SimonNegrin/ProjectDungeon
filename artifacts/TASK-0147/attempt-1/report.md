---
type: Task Report
title: "TASK-0147: informe de ejecución"
description: Muerte del activo en su turno, cierre sin turno muerto y wipe.
task: TASK-0147
attempt: 1
report_status: success
generated: { by: deepseek/v4.1-flash, at: 2026-11-15T20:15:00Z }
artifacts: artifacts/TASK-0147/attempt-1/
verified:
---

# Estado

`success`.

# Cambios

- `src/game/turn.ts`: helper puro `closeTurnAfterActiveDeath` que delega en
  `resolveEndTurn` solo si la partida sigue, el activo es el mismo y está muerto.
- `src/game/engine.ts`: `reduce` captura el activo previo, aplica el comando y,
  si murió durante él, concatena el cierre tras la acción. `EndTurn` no se
  duplica.
- Tests: `turn.test.ts` (helper, último vivo, vivo con fantasmas, fase enemiga y
  resultado), `replica.test.ts` (réplica con dos jugadores) y `engine.test.ts`
  (derrota y ronda expuestas).
- Commit SHA: `6911835`.

# Tests

| Comando | Resultado | Evidencia |
|---|---|---|
| `pnpm exec vitest run tests/unit/game/engine.test.ts tests/unit/game/turn.test.ts tests/unit/game/replica.test.ts` | 3 archivos, 97 tests OK | `test-output.txt` |
| `pnpm run verify` | 107 archivos, 1695 tests OK; build y bundle OK | `verify-output.txt` |

# Evidencia visual

- No aplica: la pantalla de resultado es TASK-0153.

# Desviaciones

- No hay objetos ni mecánica de resurrección en este corte (TASK-0148). La
  derrota con fantasmas se cubre con fantasmas; el caso de «efecto propio» se
  cubre con el helper sobre un estado sintético, porque el único camino real de
  muerte en turno es el fallo con réplica.

# Problemas conocidos y preguntas abiertas

- La suite E2E completa no se ejecuta por su duración (brief); no aplica E2E a
  esta tarea.

# Fricción reutilizable

Ninguna.

# Métricas de handoff

| Métrica | Valor |
|---|---|
| `brief_bytes` | 2192 |
| `report_bytes` | 1914 |
| `overflow` | `none` |
| `criteria_failed` | 0 |
