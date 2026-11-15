---
type: Task Report
title: "TASK-0146: informe de ejecución"
description: Turno por jugador, EndTurn, recursos por turno y fase enemiga.
task: TASK-0146
attempt: 1
report_status: success
generated: { by: deepseek/v4.1-flash, at: 2026-11-15T19:59:37Z }
artifacts: artifacts/TASK-0146/attempt-1/
verified:
---

# Estado

`success`. Motor de turno por jugador y fase enemiga implementados; `verify` pasa.

# Cambios

- `src/game/{turn,engine,types,ai}.ts`: `EndTurn` valida el activo, avanza al
  siguiente jugable, restaura solo sus recursos, ejecuta una fase enemiga por
  ronda y expone `enemyPhase` (actor, objetivo y `wait|act`). Rechazos
  `not-active`/`invalid-active`; comandos de unidad no activa rechazados.
  `chooseNearestPlayer` exportado.
- Tests: `turn.test.ts` y `engine.test.ts` cubren 2/6 jugadores, recursos,
  activo inválido, transición, orden enemigo, cierre de ronda y fantasma.
  Fixtures de `ai/combat/death/ghost/magic` ajustadas al activo.
- Commit SHA: `68d6de7`.

# Tests

| Comando | Resultado | Evidencia |
|---|---|---|
| `pnpm exec vitest run tests/unit/game/turn.test.ts tests/unit/game/engine.test.ts` | 71 passed | `test-output.txt` |
| `pnpm run verify` | 1688 passed; docs/config/build/bundle OK | `verify-output.txt` |

# Evidencia visual

No aplica: cambio de motor sin DOM.

# Desviaciones

Ninguna funcional. Los fixtures con varios jugadores declaran `activePlayerId`
o ceden el turno para conservar su intención; no se borraron aserciones.

# Problemas conocidos y preguntas abiertas

Ninguno.

# Fricción reutilizable

Ninguna.

# Métricas de handoff

| Métrica | Valor |
|---|---|
| `brief_bytes` | 2074 |
| `report_bytes` | 1743 |
| `overflow` | `brief-detalle` |
| `criteria_failed` | 0 |
