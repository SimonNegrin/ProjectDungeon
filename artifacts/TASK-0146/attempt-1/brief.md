---
type: Task Brief
title: "TASK-0146: brief del intento 1"
description: Turno por jugador, EndTurn, fase enemiga y ronda en el motor.
task: TASK-0146
attempt: 1
status: stable
brief_bytes: 0
read_detail: true
generated: { by: deepseek/v4.1-flash, at: 2026-11-15T19:10:00Z }
---

# Objetivo

Que `EndTurn` cierre el turno de un jugador, avance al siguiente y, tras el
último, ejecute una única fase enemiga por ronda. Solo motor.

# No objetivos

- Host, cámara, HUD, input, avisos ni resultado (TASK-0149 a TASK-0153).
- Resurrección (TASK-0148), muerte en turno (TASK-0147), IA nueva o balance.
- Cambiar `docs/`, el arnés, requisitos o dependencias.

# Invariantes

- `players` es la única lista ordenada; `activePlayerId` y `round` son la verdad
  del turno. Nada nuevo que serializar.
- Motor sin DOM, `Math.random` ni relojes. IA y combate no cambian.
- Sin fin de turno automático por recursos ni temporizadores.
- El fantasma conserva su índice y puede cerrar turno.

# Criterios de aceptación

Viven en [TASK-0146](../../../docs/tasks/TASK-0146-motor-turno-jugador-endturn-fase-enemiga.md#criterios-de-aceptación).
No se copian.

# Contexto mínimo

- `src/game/turn.ts`, `engine.ts`, `types.ts`, `ai.ts`, `party.ts`.
- Tests: `tests/unit/game/turn.test.ts`, `engine.test.ts`, `helpers.ts`.
- [REQ-031 T-002 a T-004](../../../docs/requirements/REQ-031-hotseat-local.md#requisitos-técnicos)
  y [R-002 a R-004, R-013, R-016](../../../docs/requirements/REQ-031-hotseat-local.md#requisitos-creativos-decididos).
- **Contrato técnico detallado en `brief-detalle.md` (leer antes de tocar).**

# Artefactos

- `report.md`, `test-output.txt`, `verify-output.txt`, `logs/`.
- Commit(s) con el ID de tarea.

# Riesgos y decisiones abiertas

- Validar el activo en todos los comandos puede romper fixtures con varios
  jugadores; se actualizan preservando su intención, nunca se debilitan.
- La fase enemiga debe bastar a TASK-0152 sin leer estado interno; contrato en
  `brief-detalle.md`.
- Si el contrato choca con REQ-031, devolver `blocked` con evidencia.
