---
type: Task Report
title: "TASK-0134: informe de ejecución"
description: Party ordenada, jugador activo y ronda en estado, snapshot y F1.
task: TASK-0134
attempt: 1
report_status: success
generated: { by: deepseek/v4.1-flash, at: 2026-11-15T12:20:00Z }
artifacts: artifacts/TASK-0134/attempt-1/
verified:
---

# Estado

`success`. Modelo, helpers de lectura, snapshot y `F1` según el detalle; sin
transiciones de turno.

# Cambios

- `GameState`: `players` única y ordenada, `activePlayerId`, `round` (sustituye a
  `turn`) y `phase`. Constructor único: `players[0].id` y `round: 1`.
- `src/game/party.ts` (nuevo, exportado): `partyOrder`, `activePlayer`,
  `activePlayerIndex`; puras, sin setters.
- `resolveEndTurn` solo renombra `turn`→`round`; los eventos conservan `turn`.
- Snapshot: `activePlayerId`, `round`, `partyOrder`; `turn` queda como alias
  `@deprecated` relleno desde `round`.
- `buildHudModel` usa `activePlayer`; `F1` emite fase, ronda, activo `(i/M)` y
  orden. `presentationState` devuelve `round`.
- Tests: literales `state.turn`→`state.round`; suites de 1, 2 y 6 jugadores,
  round-trip, helpers, `Restart`, snapshot y `F1`. E2E: literales con
  `activePlayerId`/`round` y `F1` `Turno`→`Ronda`.
- Commit SHA: `6747f15dc93e2306315c5e86c2bbdb231f783eee`.

# Tests

| Comando | Resultado | Evidencia |
|---|---|---|
| `pnpm exec vitest run tests/unit/game/engine.test.ts tests/unit/host/debug.test.ts` | 75 tests, 2 archivos, OK | `test-output.txt` |
| `pnpm run verify` | 1537 tests, 102 archivos; docs/config, `tsc`, build y bundle OK | `verify-output.txt` |

# Evidencia visual

- No aplica. El texto de `F1` debe coincidir con el snapshot (`activePlayerId`,
  `round`, `partyOrder`).

# Desviaciones

- `actionSuggestion` también usa `activePlayer`; sin cambio con el constructor
  actual (activo = primer jugador).
- `F1` usa índice 1-based; sin activo muestra `—` y `0/M`, y orden vacía `—`.
- No se ejecutó `test:e2e` (la ficha lo declara no aplicable); `verify` cubre
  tipos y build de los E2E actualizados.

# Problemas conocidos y preguntas abiertas

- `GameSnapshot.turn` sigue como alias obsoleto; su retirada queda para limpieza.
- `resolveEndTurn` no cambia `activePlayerId`: el relevo es TASK-0146.

# Fricción reutilizable

Ninguna: sin comportamiento no documentado, fallo repetible ni contradicción.

# Métricas de handoff

| Métrica | Valor |
|---|---|
| `brief_bytes` | 1780 |
| `report_bytes` | 2522 |
| `overflow` | `none` |
| `criteria_failed` | none |
