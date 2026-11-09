---
type: Task Brief
title: "TASK-0048: brief del intento 2"
description: Corregir la única regresión E2E del intento 1 sin ampliar alcance.
task: TASK-0048
attempt: 2
status: stable
brief_bytes: 0
read_detail: false
generated: { by: deepseek/v4.1-flash, at: 2026-11-09T17:55:00Z }
---

# Motivo del relanzamiento

La verificación del lead comparó por título los fallos E2E de `main` (50) con
los del intento 1 (37). Solo hay una regresión: `motion-qa.spec.ts` › «reduced
motion: movimiento instantáneo con el mismo estado y eventos» pasaba en `main`
y ahora falla. Evidencia: `moveCursorTo` lanza «El cursor no puede pasar de
(8,19) hacia (8,8)»; `openBspState` cambió el spawn BSP a `(9,27)` y `(8,8)`
queda fuera del viewport 13×13.

# Objetivo

Adaptar esa fixture a la posición real del jugador (o al viewport BSP) sin
debilir aserciones, y confirmar que no hay ninguna otra regresión frente al
baseline. El resto de los 37 fallos stale de BSP sigue documentado y asignado a
TASK-0049.

# No objetivos

- Arreglar los 37 fallos stale de BSP: son de TASK-0049.
- Cambiar producción, criterios, valores aprobados ni el alcance del intento 1.
- Relajar o borrar aserciones; empeorar el baseline.

# Invariantes

- `pnpm run verify` pasa.
- `pnpm run test:e2e`: ningún test que pasaba en `main` falla ahora; total de
  fallos ≤ 37 y todos stale de BSP documentados con dueño TASK-0049.
- El spec nuevo de growth sigue 4/4 y las capturas se mantienen.

# Criterios de aceptación

Los de `docs/tasks/TASK-0048-host-render-spawn-puertas-salida.md#criterios-de-aceptación`.
Este intento solo corrige la regresión E2E; no reabre el resto.

# Contexto mínimo

- `tests/e2e/motion-qa.spec.ts` (test «reduced motion», cursor a `(8,8)`).
- `tests/e2e/support.ts` (`openBspState`, `moveCursorTo`).
- Baseline por título del lead: 50 fallos en `main`, 37 en el intento 1; la
  única diferencia nueva es ese test.

# Artefactos

`artifacts/TASK-0048/attempt-2/`: `report.md`, `test-output.txt`,
`verify-output.txt`, `e2e-output.txt`, `screenshots/` si cambian capturas.
Commit en `task/TASK-0048` con el ID de tarea.
