---
type: Task Report
title: "TASK-0141: informe de ejecución"
description: Cargador único .zip/.json desde menú y pausa.
task: TASK-0141
attempt: 1
report_status: success
generated: { by: deepseek/v4.1-flash, at: 2026-11-15T18:05:00Z }
artifacts: artifacts/TASK-0141/attempt-1/
verified:
---

# Estado

`success`. Menú y pausa comparten un único cargador y selector; la partida en
curso queda intacta ante cancelación o rechazo.

# Cambios

- `src/host/load-game.ts` (nuevo): `loadGameFile` (`.zip` con `readSaveZip` +
  `readSaveFiles`; `.json` con `parseSave`), `crossCheckManifest` (semilla,
  turno/ronda, fase y party), `requestGameLoad` (flujo común) y
  `createGameFilePicker` (único input reutilizado).
- `src/host/main.ts`: `applyLoadedState` sustituye la sesión, cierra pausa,
  limpia animación/feedback/avisos/modales, centra la cámara en el activo una
  vez y redibuja HUD; `onLoadRequested` y `confirm-load` llaman al mismo flujo.
- `src/host/start-screen-view.ts`, `src/host/pause-menu-view.ts`: región viva de
  rechazo (`start-load-message`, `pause-load-message`).
- `index.html`: input único `load-file` (`accept=".zip,.json"`) y regiones vivas.
- Commits: `a1b84d4` (implementación), `3c21170` (tests).

# Tests

| Comando | Resultado | Evidencia |
|---|---|---|
| `vitest run tests/unit/host/load-game.test.ts tests/unit/host/session.test.ts` | 33 pasan | `logs/unit-focused.txt` |
| `pnpm run verify` | OK (1671 tests, build y bundle) | `verify-output.txt` |
| `pnpm run test:e2e tests/e2e/load-game.spec.ts` (+ pausa y arranque) | 12 pasan | `e2e-output.txt` |

Cubre `.zip`/`.json`, confirmación y cancelación, rechazo visible sin tocar la
partida, ronda/activo, mismo cargador y validación cruzada (semilla, turno,
ronda, fase, nombre, arquetipo y número).

# Evidencia visual

- `screenshots/menu-zip-cargado.png`, `menu-json-cargado.png`,
  `pausa-zip-cargado.png` (HUD «Bru», cámara en el activo),
  `pausa-json-invalido.png` (mensaje en la pausa).
- `saves/`: `.zip` y `.json` reales usados por el E2E.
- Revisar: tras cargar no queda banner ni aviso; la pausa solo se cierra con
  archivo válido.

# Desviaciones

- `tests/e2e/start-screen.spec.ts` exigía 0 `input[type=file]` al pulsar
  «Cargar». Se actualizó (no se debilitó) a comprobar el selector único y su
  `accept`, porque R-005/T-009 ahora lo exigen.
- La cámara se centra en el activo solo en el render posterior a la carga; los
  renders siguientes conservan el comportamiento previo (centro en
  `players[0]`) para no alterar el resto. Anotado para TASK-0150.

# Problemas conocidos y preguntas abiertas

- Guardar una party con `mage`/`cleric` y volver a cargarla falla:
  `stats.fuerza` es `-1` y `readStats` exige ≥ 0 (`$.partida.players[1].stats.fuerza`).
  Es del esquema de TASK-0137/0138, fuera de alcance; los fixtures usan
  guerreros. Conviene una tarea de corrección del redondeo de ida y vuelta.

# Fricción reutilizable

| Síntoma | Evidencia | Workaround | Por qué es reutilizable | Cambio propuesto | Coste/riesgo | Disposición |
|---|---|---|---|---|---|---|
| `docs:check` avisa de handoffs >2560 B mientras la plantilla fija objetivo 2 KB y tope 4 KB | `verify-output.txt`: brief de 2591 B | Ninguno; `verify` sale 0 | Cada brief del lead puede rozar el umbral y producir ruido repetido | Unificar el umbral del validador con la plantilla | Bajo | `pending` |
