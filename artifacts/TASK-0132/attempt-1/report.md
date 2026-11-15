---
type: Task Report
title: "TASK-0132: informe de ejecución"
description: Fantasma controlable con casilla compartida, MP intrínseco y una acción.
task: TASK-0132
attempt: 1
report_status: success
generated: { by: deepseek/v4.1-flash, at: 2026-11-15T12:00:00Z }
artifacts: artifacts/TASK-0132/attempt-1/
verified:
---

# Estado

`success`.

# Cambios

- `types`/`grid`/`actions`: `Unit.ghost?`, `isGhost`, `lifeState`,
  `GHOST_ACTIONS`, comando y evento `InspectContainer`/`ContainerInspected` y
  motivo `not-ghost`.
- `death`: `settleUnitDeath` marca fantasma, fija una acción y conserva
  identidad, posición, stats, `maxMp` y MP; cadáver idempotente.
- `movement`/`path`: `ignoreUnits`; el fantasma comparte casilla, su plan nunca
  es `enemy` y muros/esquinas siguen bloqueando.
- `inventory`/`engine`/`turn`: coste `mp|action` al recoger/soltar,
  `inspectContainer` seguro, allowlist de comandos y restauración de fantasmas.
- `host/{hud,motion}`: solo casos exhaustivos nuevos; sin presentación.
- Tests: `tests/unit/game/ghost.test.ts` (19) y opción `ghost` en `helpers.ts`.
- Commits: `e493ab7` (motor), `30dbb91` (tests); ver `commit.txt`.

# Tests

| Comando | Resultado | Evidencia |
|---|---|---|
| `pnpm exec vitest run actions path perception engine ghost` | 99/99 | `test-output.txt` |
| `pnpm run verify` | 1521/1521, build y bundle OK | `verify-output.txt` |

# Evidencia visual

- No aplica: sin panel, render ni HUD.

# Desviaciones

- El criterio menciona puertas; el detalle las excluye y se siguió el detalle.
- Sin transferencia desde cadáver: solo suelo ↔ mochila (detalle).
- `not-ghost` es un motivo nuevo; los demás comandos prohibidos usan
  `dead-unit`.

# Problemas conocidos y preguntas abiertas

- La resurrección deja `ghost: true` en la unidad revivida; `isGhost` exige
  `hp === 0`, así que `lifeState` es `alive`. TASK-0148 debe limpiarla.
- Sin cofre ni puerta en este corte: solo inspección.

# Fricción reutilizable

| Síntoma | Evidencia | Workaround | Por qué es reutilizable | Cambio propuesto | Coste/riesgo | Disposición |
|---|---|---|---|---|---|---|
| `docs:check` avisa de handoffs >2560 B en artefactos históricos y aun así sale OK | `verify-output.txt` | Ignorar el aviso | Se repite en cada `verify` y mezcla ruido con fallos | Alinear umbral con la plantilla o separar aviso de error | Bajo | `pending` |

# Métricas de handoff

| Métrica | Valor |
|---|---|
| `brief_bytes` | 2128 |
| `report_bytes` | 2542 |
| `overflow` | `none` |
| `criteria_failed` | 0 |
