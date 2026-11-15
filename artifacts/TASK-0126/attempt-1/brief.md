---
type: Task Brief
title: "TASK-0126: brief del intento 1"
description: Resumen de party y semilla, «Atrás»/«Cancelar» y arranque con el constructor único.
task: TASK-0126
attempt: 1
status: stable
brief_bytes: 2554
read_detail: true
generated: { by: deepseek/v4.1-flash, at: 2026-11-15T10:20:00Z }
---

# Objetivo

Tras el último «Siguiente», mostrar el resumen con la party en orden (número,
arquetipo, variante, nombre) y la semilla en solo lectura. «Atrás» vuelve al
último jugador con todo conservado; «Cancelar»/`Esc` confirman y vuelven al menú.
«Empezar» arranca el juego con N jugadores y la semilla mostrada con el
constructor único.

# No objetivos

- Variante en mapa/HUD (0127), pausa/guardado/carga, resultado (0153), hotseat,
  persistencia, reordenar, spawn/balance, motor.
- Redefinir roster, ficha, nombres o semilla; tocar `?test=1` o «Cargar».

# Invariantes

- Consume `PlayerPartyConfig`; no reinterpreta la configuración ni reconstruye
  unidades. Nombres vacíos van como `''` al motor; el resumen muestra el efectivo.
- Un único camino: `new GameSession({ seed, players })` (`createInitialState`).
- Error del constructor: mensaje visible, no se arranca y no se pierde la config.
- La semilla del resumen es texto, nunca un control editable.
- Al empezar se ocultan todas las pantallas de arranque; el bucle/HUD/teclado
  actuales toman el control. Sin overlays de resultado.
- `?test=1` sigue saltando el arranque; «Cargar» sigue no-op.
- No debilitar tests: el anuncio provisional del último «Siguiente» en
  `tests/e2e/player-screen.spec.ts` se sustituye por la entrada al resumen.
- pnpm, nunca npm/npx; todo comando con `timeout`.

# Criterios de aceptación

En `docs/tasks/TASK-0126-host-resumen-empezar-estado-inicial.md`; no se copian.

# Contexto mínimo

- `src/host/player-screen.ts`: `PlayerPartyConfig`; `-view.ts`: `onComplete`,
  `onCancelConfirmed` y ciclo de vida.
- `src/host/main.ts`: `openPlayerScreen`, `session`, `setupState`, guardas de
  teclado y `window.__game`.
- `src/host/start-screen.ts`/`-view.ts`: `StepOneConfig`, `hide`, `showMenu`.
- `src/game/engine.ts`, `config.ts` (`GameConfigError`), `roster.ts`,
  `src/host/session.ts`; `index.html` y `ui.css`.
- REQ-016 R-009, R-010, R-011, T-001 y T-002.
- Contrato, matriz de tests y guion E2E: `brief-detalle.md`.

# Artefactos

`report.md`, `test-output.txt`, `verify-output.txt`, `e2e-output.txt`,
`commit.txt` y capturas con `E2E_ARTIFACTS_DIR=artifacts/TASK-0126/attempt-1`
(el helper añade `<spec>/screenshots/`).
