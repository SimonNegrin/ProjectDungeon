---
type: Task
id: TASK-0084
title: "Balance: propuesta con acciones, magia y réplica"
description: "Ejecutar la mesa EXP-003 v2 con los valores implementados de acciones, magia y réplica, medir 1.000 duelos por emparejamiento y entregar una tabla propuesta sin aplicar valores."
status: stable
task_status: backlog
task_type: experiment
requirement: REQ-026
requirement_ids: [R-009, T-005, T-008]
depends_on: [TASK-0083]
unlocks: []
created_at: 2026-11-12T15:10:00Z
completed_at:
assignee: task-runner
attempts: 0
artifacts: artifacts/TASK-0084/
priority: P1
risk: medium
review_required: true
generated: { by: deepseek/v4.1-flash, at: 2026-11-12T15:10:00Z }
verified:
---

# Objetivo

Medir el balance del milestone con la mesa EXP-003 v2, incluyendo acciones,
magia y réplica, y entregar una propuesta de ajuste de roster, bestiario y
hechizos con win % y tolerancia ±2 %. No se aplican valores sin aprobación del
usuario.

# Contexto

- `experiments/EXP-003-mesa-combate/`: v2 con acciones, magia, réplica, RNG
  sembrado y 1.000 duelos por emparejamiento (`TASK-0063` a `TASK-0065`, ya
  cerradas).
- `src/game/roster.ts`, `src/game/bestiary.ts` y `src/game/spells.ts`: valores
  implementados que la simulación debe reflejar.
- [REQ-026](../requirements/REQ-026-economia-acciones-rebalanceo.md) R-009 y
  [REQ-015](../requirements/REQ-015-roster-arquetipos.md): método de win %,
  héroe con iniciativa, equipo básico y tolerancia ±2 %.
- Depende de `TASK-0083`: sin acciones, magia y réplica implementadas no hay
  nada que medir.

# Criterios de aceptación

- [ ] La simulación usa los valores implementados de acciones por arquetipo y
      tipo, magia, maná, hechizos, réplica y equipo; no inventa fórmulas.
- [ ] Se ejecutan 1.000 duelos por emparejamiento con semilla fija y héroe con
      iniciativa; el resultado es reproducible byte a byte.
- [ ] El informe incluye win % por emparejamiento, delta frente al objetivo,
      filas fuera de ±2 %, causas probables y una tabla propuesta de valores.
- [ ] La propuesta distingue cambios de roster, bestiario y hechizos, y señala
      los que afectan a la sensación de juego para que los decida el usuario.
- [ ] Los artefactos incluyen resultados crudos, resumen y comando de
      reproducción; no se edita `experiment.md` (lo registra
      `requirements-writer`).
- [ ] No se aplican valores en `src/`, `tests/`, `index.html` ni `public/`;
      `pnpm run verify` sigue pasando.
- [ ] Sin dependencias nuevas y sin tocar la lógica de producción.

# Plan de test

- Unitario: la simulación usa los catálogos indicados y la semilla fija.
- Integración: dos ejecuciones producen el mismo resumen; cambiar un valor
  afecta solo a las filas esperadas.
- E2E / visual: no aplica; es una mesa de medición, no una pantalla nueva.
- Manual: revisar la tabla propuesta con el usuario antes de aplicarla.

# Evidencia esperada

- [ ] Informe en `artifacts/TASK-0084/attempt-1/report.md`
- [ ] Resultados y resumen en `artifacts/TASK-0084/attempt-1/`
- [ ] Salida de `pnpm run verify`
- [ ] Commit SHA en la rama `task/TASK-0084`

# Restricciones

- No aplicar valores ni crear una tarea de aplicación: la decisión es del
  usuario.
- No reescribir la decisión histórica de EXP-003.
- No tocar `src/` ni `tests/` de producción.
- No añadir dependencias.

# No objetivos

- Aplicar la tabla propuesta; será una tarea posterior tras la aprobación.
- Ajustar magia más allá de lo necesario para el método.
- Progresión, puntos de habilidad o nuevos hechizos.
