---
type: Task Report
title: "TASK-0149: informe del intento 2"
description: "Cierra los huecos del intento 1: aviso no bloqueante, N a dos jugadores y Q del fantasma."
task: TASK-0149
attempt: 2
report_status: success
generated: { by: deepseek/v4.1-flash, at: 2026-11-15T21:58:00Z }
artifacts: artifacts/TASK-0149/attempt-2/
verified:
---

# Estado

`success`.

# Cambios

- `src/host/input.ts`: `Q` exige activo **vivo** (`activePlayerCanOpenPanel`), como
  el panel; fantasma y cadáver reciben `no-active-player` y no abren una lista
  que el motor rechazaría (`castSpell` → `dead-unit`).
- `tests/e2e/feedback-turns-marks-qa.spec.ts`: tras `advance(1_000_000)`, con
  `TU TURNO` visible y `animation.animating === false`, `ArrowRight` mueve el
  cursor +1 y el banner sigue visible. Sin esperas de reloj real.
- `tests/unit/host/session.test.ts`: dos tests nuevos. `N` con dos jugadores
  releva al segundo sin fase enemiga; el segundo cierra la ronda con
  `EnemyPhaseStarted`/`PlayerTurnStarted` y vuelve al primero. `EndTurn` con
  `unitId` ajeno se rechaza por `not-active` sin mutar el estado.
- `tests/unit/host/input.test.ts`: restaurado el caso del cadáver para `Q` y
  cambiado el test del fantasma a rechazo; se conservan los tests del intento 1.
- Commit de código y tests: `9d18627`; la evidencia va con este informe.

# Tests

| Comando | Resultado | Evidencia |
|---|---|---|
| vitest host (input, session, keymap, hud) | 107/107 | `test-output.txt` |
| `pnpm run verify` | 1704/1704; tsc, build y bundle OK | `verify-output.txt` |
| E2E por specs: feedback, game-input-hud, pause-menu, action-counter-turn, cursor-qa | 20/20 | `e2e-output.txt` |

# Evidencia visual

- `e2e/feedback-turns-marks-qa/screenshots/turno-jugador-aviso-no-bloquea.png`:
  cursor un tile a la derecha del jugador y banner `TU TURNO` visible; la ayuda
  del HUD muestra `N terminar turno`.
- Otra corrida del spec con `E2E_ARTIFACTS_DIR`: `e2e-visual-output.txt`.

# Desviaciones

- Ninguna de alcance. No se tocó `docs/**`, `AGENTS.md` ni `.opencode/**`; siguen
  fuera del commit los cambios ajenos de `docs/log.md`, REQ-021 y TASK-0148.
- El primer `pnpm run verify` agotó los 240 s por carga del sistema (load 20, sin
  salida tras `RUN`); reintentado, pasó con ~14 s de tests. No se cambió nada.

# Problemas conocidos y preguntas abiertas

- El paneo real sigue sin existir (TASK-0150): `main.ts` pasa `panning: false`.
- Sin preguntas abiertas.

# Fricción reutilizable

Ninguna.

# Métricas de handoff

| Métrica | Valor |
|---|---|
| `brief_bytes` | 2494 |
| `report_bytes` | 2649 |
| `overflow` | `none` |
| `criteria_failed` | 0 |
