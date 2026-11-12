---
type: Task Brief
title: "TASK-0076: brief del intento 1"
description: Acciones, costes y restauración.
task: TASK-0076
attempt: 1
status: stable
brief_bytes: 1536
read_detail: true
generated: { by: deepseek/v4.1-flash, at: 2026-11-12T14:45:00Z }
---

# Objetivo

Sustituir `Unit.actionAvailable` por `Unit.actions { max, remaining }` con
restauración por turno, coste 0/1 atómico, ataque repetible, `MoveTo` con un solo
ataque y tope 4.

# No objetivos

HUD/beats (TASK-0078); IA encadenada (TASK-0077); soltar, cofres, hechizos,
réplica, balance y dependencias.

# Invariantes

- Motor puro y determinista; rechazo atómico sin estado, RNG ni eventos.
- No borrar ni debilitar tests; migrarlos.
- La última acción no termina el turno.
- `pnpm run verify` pasa y el árbol queda limpio en `task/TASK-0076`.

# Criterios

[Enlace](../../../docs/tasks/TASK-0076-motor-contador-acciones-costes.md#criterios-de-aceptación).

# Contexto

- Motor: `src/game/` (types, combat, turn, engine, roster, bestiary, equipment, ai).
- Host: `src/host/` (motion, hud, debug, session).
- Tests: `tests/unit/{game,host}`, `tests/e2e/support.ts`, fixtures.
- Diseño: `docs/design/architecture.md#economía-de-acciones`.
- Inventario: `rg actionAvailable`. Leer `brief-detalle.md`.

# Artefactos

`report.md`, `test-output.txt`, `verify-output.txt`, SHA

# Riesgos

- El cálculo de `max` no se duplica en el host.
- E2E no se ejecutan, pero `tsc` los compila: migrar fixtures sin trivializar.
- Si no cabe o hay decisión creativa, `blocked`.
