---
type: Task Report
title: "TASK-0149: informe del intento 1"
description: N cierra turno, E/R retiradas, Esc pausa y gate por activo y paneo.
task: TASK-0149
attempt: 1
report_status: success
generated: { by: deepseek/v4.1-flash, at: 2026-11-15T20:29:24Z }
artifacts: artifacts/TASK-0149/attempt-1/
verified:
---

# Estado

`success`.

# Cambios

- `keymap.ts`: `end-turn` pasa de `e` a `n`; la ayuda sigue saliendo de
  `formatKeyHelp()`.
- `input.ts`: comandos y cursor usan `activePlayer`; se elimina
  `findActivePlayer`. Nuevo motivo `panning` y opción `panning` en el gate
  (`repeat`/modificador → panel → `F1` → `Esc` → animación/paneo → resto).
  `e` y `r` caen en `unmapped`.
- `main.ts`: `panning: false` con nota de que el paneo real es TASK-0150.
- `hud.ts`: la sugerencia de fin de turno usa `N`.
- Tests: 5 unitarios y 9 specs E2E actualizados sin borrar casos; nuevos casos
  de activo, fantasma, paneo y ausencia de `E`/`R`.
- Commit SHA: `d580f3b` (`feat(TASK-0149): N cierra turno, Esc pausa y comandos
  solo del activo`).

# Tests

| Comando | Resultado | Evidencia |
|---|---|---|
| `vitest run tests/unit/host/{input,keymap,hud,session}.test.ts` | 105/105 | `test-output.txt` |
| `pnpm run verify` | 1702/1702, build y bundle OK | `verify-output.txt` |
| E2E de las 9 specs tocadas, por separado | 47/47 | `e2e-output.txt` |

Specs E2E: `action-counter-turn-qa`, `cursor-qa`, `flee-behavior-qa`,
`game-input-hud`, `hud-left-zones-qa`, `motion-qa`, `pause-menu`,
`pause-save-load-qa`, `perception-alarm-qa`. `motion-qa` se reejecutó tras
sustituir una `e` residual en su lista de teclas.

# Evidencia visual

- `e2e-output.txt` (Playwright, capturas solo en fallo); no hubo fallos.
- Debe mirarse: ayuda del HUD (`N terminar turno`), pantalla de controles,
  sugerencia «pulsa N», primer `Esc` con panel y segundo `Esc` a pausa.

# Desviaciones

- Ninguna de alcance. No se tocó `docs/**`, `AGENTS.md` ni `.opencode/**`.
- El árbol de trabajo contiene cambios ajenos en `docs/log.md`, REQ-021 y
  TASK-0148 (otra tarea); no se incluyeron en el commit.

# Problemas conocidos y preguntas abiertas

- El paneo real no existe todavía (TASK-0150): `main.ts` pasa `panning: false`;
  el gate está cubierto por tests unitarios.
- Sin preguntas abiertas.

# Fricción reutilizable

Ninguna.

# Métricas de handoff

| Métrica | Valor |
|---|---|
| `brief_bytes` | 2290 |
| `report_bytes` | 2485 |
| `overflow` | `none` |
| `criteria_failed` | 0 |
