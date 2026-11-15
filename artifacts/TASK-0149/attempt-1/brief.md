---
type: Task Brief
title: "TASK-0149: brief del intento 1"
description: N como fin de turno, retirada de E/R, Esc pausa y gate de input por activo.
task: TASK-0149
attempt: 1
status: stable
brief_bytes: 2290
read_detail: true
generated: { by: deepseek/v4.1-flash, at: 2026-11-15T21:10:00Z }
---

# Objetivo

Que `N` cierre el turno y `Esc` abra la pausa; que `E` y `R` no hagan nada; que
los comandos usen al jugador activo y solo se bloqueen durante paneo y animación;
y que la ayuda salga del mapa único.

# No objetivos

- Cámara, relevo y paneo real (TASK-0150); HUD y «Ronda N» (TASK-0151); fase
  enemiga (TASK-0152); resultado (TASK-0153).
- Cambiar el `EndTurn` del motor, la pausa de TASK-0139 o el guardado.
- Remapeo, perfiles o teclas por jugador.
- Editar `docs/**`, `AGENTS.md` o `.opencode/**`.

# Invariantes

- `keymap.ts` sigue siendo la única fuente para input, HUD y pausa.
- `translateKey` sigue puro: sin DOM, sin mutar estado ni cursor.
- `Esc` con panel abierto cierra el panel; con la lista de hechizos, la lista.
- La suite E2E completa no se ejecuta (excede 180 s); specs sensibles aparte.

# Criterios de aceptación

Viven en [TASK-0149](../../../docs/tasks/TASK-0149-host-n-retirada-e-r-esc-pausa.md#criterios-de-aceptación).
No se copian.

# Contexto mínimo

- `src/host/keymap.ts`, `input.ts` (`translateKey`, `findActivePlayer`),
  `main.ts` (keydown y `pauseContext`), `hud.ts` (`KEYS_HELP`, prompt de fin de
  turno) y `pause-menu-view.ts` (controles).
- `src/game/party.ts`: `activePlayer(state)`; `EndTurn` ya valida el activo.
- Tests: `tests/unit/host/{input,keymap,hud,session}.test.ts` y specs E2E que
  pulsan `e`.
- **Contrato técnico en `brief-detalle.md` (leer antes de tocar).**

# Artefactos

- `report.md`, `test-output.txt`, `verify-output.txt`, `e2e-output.txt`, `logs/`.
- Commit(s) con el ID de tarea.

# Riesgos y decisiones abiertas

- El paneo aún no existe: expón la opción de gate y pásala como `false`; no
  implementes cámara ni temporizadores.
- «Ronda N» es TASK-0151: el gate no debe depender de banners ni avisos, solo de
  animación/paneo.
- `E` está en 11 specs E2E y 3 tests unitarios: actualízalos sin debilitar
  aserciones ni borrar casos.
- Si algo choca con REQ-031, devuelve `blocked` con evidencia.
