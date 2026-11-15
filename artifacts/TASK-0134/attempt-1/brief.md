---
type: Task Brief
title: "TASK-0134: brief del intento 1"
description: Estado de partida con party ordenada, activo, ronda y fase; snapshot y F1.
task: TASK-0134
attempt: 1
status: stable
brief_bytes: 1780
read_detail: true
generated: { by: deepseek/v4.1-flash, at: 2026-11-15T12:20:00Z }
---

# Objetivo

Que `GameState` represente la partida completa —party ordenada, jugador activo,
ronda y fase— de forma serializable, y que el snapshot de debug y `F1` lo
expongan desde esa única fuente. Sin transiciones de turno nuevas.

# No objetivos

- `EndTurn` por jugador, índice de turno, fase enemiga por ronda, recursos por
  turno, relevo, cámara, HUD de fase enemiga, resurrección o resultado.
- Cambiar costes, RNG, botín, muerte, configuración de party, IA o mapa.
- Refactorizar input, cámara, cursor, panel o menús: siguen en tareas
  posteriores. Solo se adopta el helper en el modelo del HUD/F1.
- Añadir una lista paralela de jugadores o una copia de la unidad activa.

# Invariantes

- `players` sigue siendo la **única** lista de jugadores, en orden de turno
  1..N; el orden viene de `GameConfig.players` (TASK-0122).
- El activo es una **referencia estable** (`id`), nunca una copia de `Unit`.
- `src/game` puro y serializable: sin DOM, sin `src/host`, sin red ni
  `Math.random`.
- No borrar, saltar ni debilitar tests. No cambiar reglas de producto.

# Criterios de aceptación

`docs/tasks/TASK-0134-motor-estado-partida-snapshot.md#criterios-de-aceptación`.

# Contexto mínimo

- `src/game/types.ts`, `engine.ts`, `turn.ts` y `index.ts`: modelo y constructor.
- `src/host/debug.ts`: `GameSnapshot` y `buildSnapshot`.
- `src/host/hud.ts`: `buildHudModel`, `buildDebugModel` (`F1`).
- Tests: `tests/unit/game/engine.test.ts`, `tests/unit/host/debug.test.ts` y
  `tests/unit/game/helpers.ts`.
- Contrato técnico cerrado en `brief-detalle.md`: leerlo antes de editar.

# Artefactos

`report.md`, `test-output.txt`, `verify-output.txt`, `commit.txt`; sin capturas.

# Riesgos y decisiones abiertas

- Decisión del lead registrada en el detalle: `GameState.turn` pasa a
  `GameState.round`; los eventos conservan su payload `turn` y el snapshot
  mantiene `turn` como alias obsoleto de `round` para no romper E2E. Si el
  runner ve un choque real con REQ-031, devuelve `blocked`.
- `pnpm run verify` puede fallar solo por el timeout conocido de EXP-004 en
  paralelo; en ese caso, reejecutar ese archivo aislado y anotarlo, sin tocar
  tests ni configuración.
- Timeouts: focalizados 120 s; `pnpm run verify` 240 s.
