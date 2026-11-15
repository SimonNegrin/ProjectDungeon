---
type: Task Verification
title: "TASK-0150: verificación independiente"
description: Reejecución de verify y E2E, revisión del diff y comprobación de criterios del relevo por cámara.
task: TASK-0150
attempt: 1
status: stable
generated: { by: deepseek/v4.1-flash, at: 2026-11-15T22:18:00Z }
---

# Resultado

Aprobada. El intento 1 (`e8001d6`, evidencia `c24c5c9`) cumple los siete
criterios. La tarea se cierra como `done`.

# Alcance revisado

- `src/host/camera-pan.ts`: transición pura `none`/`jump`/`pan`, paneo de 300 ms
  y destino en el activo final con respaldo `players[0]`.
- `src/host/main.ts`: cámara en reposo en el activo, paneo tras
  `finishAnimation`, reloj propio cancelable por pausa/carga/nueva/restart/setup
  y avanzable desde `advance`; `panning` en keydown, pausa, guardado y snapshot;
  cursor del turno en el activo.
- `src/host/debug.ts`: `panning` opcional en la fuente y `false` por defecto.
- Tests: 8 casos en `camera.test.ts`, comprobación en `debug.test.ts` y 4 casos
  E2E en `host-relevo-camera-qa.spec.ts`.
- Sin cambios en motor, requisitos, arnés, dependencias ni `.opencode/**`.

# Verificación reejecutada

| Comando | Resultado |
|---|---|
| `pnpm exec vitest run tests/unit/host/{camera,input,debug,session}.test.ts` | 123/123 |
| `pnpm run verify` (240 s) | docs 718, config, 107 archivos/1712 tests, tsc, build y bundle OK |
| `pnpm run test:e2e tests/e2e/host-relevo-camera-qa.spec.ts` | 4/4 |
| `pnpm run test:e2e tests/e2e/feedback-turns-marks-qa.spec.ts` | 4/4 |
| `pnpm run test:e2e tests/e2e/game-input-hud.spec.ts` | 1/1 |
| `pnpm run test:e2e tests/e2e/motion-qa.spec.ts` | 8/8 |
| `pnpm run test:e2e tests/e2e/pause-menu.spec.ts` | 4/4 |
| `pnpm run test:e2e tests/e2e/pause-save-load-qa.spec.ts` | 7/7 |
| `pnpm run test:e2e tests/e2e/enemy-phase-offscreen-qa.spec.ts` | 3/3 |
| `pnpm run test:e2e tests/e2e/load-game.spec.ts` | 5/5 |

Total E2E: 36/36 en 8 specs, por separado. La suite completa no se ejecutó por
el timeout heredado de 180 s.

# Criterios

1. `N` → siguiente jugador con paneo y sin confirmación: unitario de transición y
   E2E de relevo (mismo camino que el teclado). OK.
2. Bloqueo durante el paneo y liberación al llegar: el E2E pulsa `d` y `n` a
   mitad; el cursor y el activo no cambian; al llegar, `ArrowRight` mueve el
   cursor. OK.
3. Ronda 1 directa y rondas siguientes con paneo: el E2E arranca en la cámara del
   primer jugador y comprueba el paneo de vuelta en ronda 2. OK.
4. Vuelta tras la fase enemiga al primer jugador: E2E de dos jugadores. OK.
5. Un jugador sin paneo de relevo y flujo conservado: la cámara vuelve al jugador
   con salto y la ronda avanza. OK.
6. `prefers-reduced-motion`: salto sin paneo en unitario y E2E. OK.
7. Tests y `pnpm run verify`: OK, sin tests borrados ni debilitados.

# Evidencia visual

- `attempt-1/e2e/host-relevo-camera-qa/screenshots/relevo-paneo.png`: mitad del
  paneo, sin jugador en el encuadre intermedio.
- `relevo-destino.png`: activo y cursor en el segundo jugador.
- `vuelta-ronda.png`: ronda 2 con el primer jugador y su HUD.

# Incidencias y disposición

- Los E2E dejaron fixtures grandes y efímeros (`saves/`, `downloads/`) bajo
  `attempt-1`; se podaron tras la verificación según
  [artefactos](../../../artifacts/README.md#reglas). Se conservan logs y capturas.
- Con un jugador no hay paneo de relevo ni de vuelta: la cámara salta. Se alinea
  con R-021 («solo desaparece el relevo»); R-006 se aplica a los relevos con más
  de un jugador.
- `docs/design/architecture.md` y `docs/glossary.md` reflejan el módulo y el
  término implementados. No se toca `turn-economy.md` (TASK-0155).
- Sin fricción de arnés reutilizable.
