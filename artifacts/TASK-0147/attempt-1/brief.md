---
type: Task Brief
title: "TASK-0147: brief del intento 1"
description: Muerte del activo durante su turno y derrota por wipe.
task: TASK-0147
attempt: 1
status: stable
brief_bytes: 0
read_detail: true
generated: { by: deepseek/v4.1-flash, at: 2026-11-15T20:15:00Z }
---

# Objetivo

Que la muerte del activo durante su turno resuelva la acción completa, cierre el
turno sin dejar un turno muerto y, si no queda ningún vivo, deje la partida en
derrota aunque haya fantasmas. Solo motor.

# No objetivos

- Pantalla de resultado, botones, cámara, HUD o avisos (TASK-0153).
- Resurrección por índice (TASK-0148), IA, balance o reglas de fantasmas.
- Cambiar presentación, guardado, `docs/` ni dependencias.

# Invariantes

- `hp === 0` sigue siendo la única señal de muerte; `settleUnitDeath` no cambia.
- `evaluateStatus` ya cuenta solo vivos: los fantasmas no evitan la derrota.
- La acción que causa la muerte se resuelve antes de `TurnEnded`.
- Sin DOM, `Math.random` ni relojes. No tocar `src/host/**`.

# Criterios de aceptación

Viven en [TASK-0147](../../../docs/tasks/TASK-0147-motor-muerte-turno-derrota-wipe.md#criterios-de-aceptación).
No se copian.

# Contexto mínimo

- `src/game/engine.ts` (`reduce`), `turn.ts` (`resolveEndTurn`), `combat.ts`
  (réplica y `UnitDied`) y `death.ts`.
- [REQ-031 R-015](../../../docs/requirements/REQ-031-hotseat-local.md#requisitos-creativos-decididos)
  y [REQ-021 R-011/T-008](../../../docs/requirements/REQ-021-muerte-fantasma-resurreccion.md#requisitos-técnicos).
- Tests: `tests/unit/game/engine.test.ts`, `turn.test.ts`, `replica.test.ts`.
- **Contrato técnico detallado en `brief-detalle.md` (leer antes de tocar).**

# Artefactos

- `report.md`, `test-output.txt`, `verify-output.txt`, `logs/`.
- Commit(s) con el ID de tarea.

# Riesgos y decisiones abiertas

- La suite E2E completa excede 180 s: no la ejecutes entera; corre por separado
  las specs sensibles y deja constancia. E2E/visual no aplica según la ficha.
- Si el requisito no distingue «efecto propio» de la réplica, cubre el camino
  real y registra la duda; no inventes mecánicas.
- Si el contrato choca con REQ-031, devolver `blocked` con evidencia.
