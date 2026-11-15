---
type: Task Verification
title: "TASK-0149: verificación independiente"
description: Reejecución de verify y E2E, revisión del diff e inspección de criterios.
task: TASK-0149
attempt: 2
status: stable
generated: { by: deepseek/v4.1-flash, at: 2026-11-15T21:59:00Z }
---

# Resultado

Aprobada. Los dos intentos (`d580f3b` + `9d18627`, evidencia `eda22a8` +
`32b2487`) cumplen los siete criterios. La tarea se cierra como `done`.

# Alcance revisado

- `src/host/keymap.ts`: `end-turn` de `e` a `n`; sin `E` ni `R`.
- `src/host/input.ts`: comandos y cursor con `activePlayer`; `Q` exige activo
  vivo; gate `animating`/`panning`; `e`/`r` → `unmapped`.
- `src/host/main.ts`: `panning: false` con nota de TASK-0150.
- `src/host/hud.ts`: sugerencia «pulsa N».
- Tests unitarios y 9 specs E2E actualizadas; nuevas pruebas de activo, fantasma,
  paneo, dos jugadores y banner no bloqueante.
- Sin cambios en motor, pausa, requisitos, arnés, dependencias ni `.opencode/**`.

# Verificación reejecutada

| Comando | Resultado |
|---|---|
| `pnpm run verify` (240 s) | docs 714, config, 107 archivos/1704 tests, tsc, build y bundle OK |
| `pnpm run test:e2e tests/e2e/feedback-turns-marks-qa.spec.ts` | 4/4 |
| `pnpm run test:e2e tests/e2e/spell-hud-qa.spec.ts` | 5/5 |
| `pnpm run test:e2e tests/e2e/ui-foundations-qa.spec.ts` | 5/5 |
| `pnpm run test:e2e tests/e2e/game-input-hud.spec.ts` | 1/1 |
| `pnpm run test:e2e tests/e2e/pause-menu.spec.ts` | 4/4 |
| `pnpm run test:e2e tests/e2e/action-counter-turn-qa.spec.ts` | 1/1 |
| `pnpm run test:e2e tests/e2e/cursor-qa.spec.ts` | 10/10 |
| `pnpm run test:e2e tests/e2e/pause-save-load-qa.spec.ts` | 7/7 |
| `pnpm run test:e2e tests/e2e/motion-qa.spec.ts` | 8/8 |
| `pnpm run test:e2e tests/e2e/flee-behavior-qa.spec.ts` | 3/3 |
| `pnpm run test:e2e tests/e2e/perception-alarm-qa.spec.ts` | 3/3 |
| `pnpm run test:e2e tests/e2e/hud-left-zones-qa.spec.ts` | 10/10 |

Total E2E: 61/61 en 12 specs. La suite completa no se ejecutó por el timeout
heredado de 180 s.

# Criterios

1. `N` → `EndTurn` y `Esc` → pausa: unitarios y E2E de teclado y pausa. OK.
2. `E`/`R` retiradas: `KEY_BINDINGS` y `MANAGED_KEY_CODES` sin ellas; ayuda y
   controles generados; specs sin pulsaciones `e`. OK.
3. Solo el activo: `activePlayer` en todos los comandos; integración a dos
   jugadores y rechazo `not-active`. OK.
4. Gate: unitarios de paneo y animación, liberación al terminar y banner
   `TU TURNO` visible con input libre. OK.
5. `Esc` con panel: unitario y E2E de pausa/panel. OK.
6. Ayuda desde `keymap.ts`: `KEYS_HELP = formatKeyHelp()`; pantalla de controles
   desde `KEY_BINDINGS`; tests. OK.
7. Tests y `pnpm run verify`: OK.

# Evidencia visual

- `artifacts/TASK-0149/attempt-2/e2e/feedback-turns-marks-qa/screenshots/turno-jugador-aviso-no-bloquea.png`:
  banner `TU TURNO`, cursor desplazado un tile y ayuda con `N terminar turno`.

# Incidencias y disposición

- El informe del intento 2 se escribió después de `verify` y su `description`
  tenía `:` sin comillas; `docs:check` fallaba. El lead corrigió el YAML, actualizó
  `report_bytes` y reejecutó `verify`. Contenido sin cambios.
- El primer `N` con dos jugadores no emite fase enemiga; el segundo cierra la
  ronda. Cubierto en `session.test.ts`.
- `docs/design/turn-economy.md` sigue citando `E`; lo actualiza TASK-0155.
- Sin fricción de arnés reutilizable.
