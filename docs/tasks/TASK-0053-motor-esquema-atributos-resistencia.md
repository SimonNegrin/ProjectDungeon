---
type: Task
id: TASK-0053
title: "Motor: esquema de ocho atributos y resistencia en la absorción"
description: "Renombrar acierto/daño a habilidad/fuerza, añadir resistencia/puntería/magia y usar la resistencia en la capa de daño; resistencia 0 conserva el balance v1."
status: stable
task_status: ready
task_type: feature
requirement: REQ-014
requirement_ids: [R-001, R-002, R-003, R-004, R-005, R-006, R-007, R-008, R-009, R-010, T-001, T-002, T-003, T-004]
depends_on: []
unlocks: [TASK-0054, TASK-0055]
created_at: 2026-11-09T15:30:00Z
completed_at:
assignee: task-runner
attempts: 0
artifacts: artifacts/TASK-0053/
priority: P1
risk: medium
review_required: true
generated: { by: deepseek/v4-pro, at: 2026-11-09T15:30:00Z }
verified:
---

# Objetivo

Que el motor use el esquema de ocho atributos de
[REQ-014](../requirements/REQ-014-atributos-inherentes-personajes.md): renombrar
los modificadores `acierto`→`habilidad` y `daño`→`fuerza`, añadir
`resistencia`, `puntería` y `magia` al estado, y declarar la resistencia en la
capa de absorción del daño. Con resistencia 0, el comportamiento del balance v1
no cambia.

# Contexto

- Fórmulas y comportamiento actual: REQ-010 «Requisitos creativos» y
  `docs/design/turn-economy.md#combate`.
- Archivos: `src/game/types.ts`, `combat.ts`, `bestiary.ts`, `engine.ts`,
  `ai.ts` y `tests/unit/game/`.
- Hoy cada unidad tiene `acierto`, `daño` y `defensa`; el daño resta solo
  `armadura`.

# Criterios de aceptación

- [ ] El estado de unidad declara `habilidad`, `fuerza`, `defensa`,
  `resistencia`, `puntería`, `magia`, PV y MP; `magia` es una lista de
  `{ familia, nivel }` con nivel 1–4.
- [ ] `acierto`→`habilidad` y `daño`→`fuerza` en tipos, combate, bestiario, IA y
  tests; no quedan nombres antiguos como fuente de verdad.
- [ ] Impacto: `habilidad + acierto del arma + 1d6 > defensa + escudo + 1d6`; el
  empate falla.
- [ ] Daño: `max(1, (fuerza + daño del arma + 1d6) − (resistencia + armadura + 1d6))`.
- [ ] El jugador provisional y los enemigos tienen resistencia 0, puntería 0 y
  magia vacía; el resultado de combate del balance v1 no cambia.
- [ ] El bestiario declara los ocho atributos por tipo, sin duplicar valores.
- [ ] Tests unitarios actualizados; `pnpm run verify` pasa.

# Plan de test

- **Unitario:** 36 combinaciones de impacto, distribución de daño con mínimo 1,
  resistencia 0 equivale al comportamiento previo, serialización de stats.
- **Integración:** fase enemiga y combate sin cambios con resistencia 0.
- **Regresión:** no se borran ni debilitan tests; los que usan acierto/daño se
  migran a habilidad/fuerza.
- **E2E / visual:** llega en TASK-0054.

# Evidencia esperada

- [ ] Informe en `artifacts/TASK-0053/attempt-1/report.md`.
- [ ] Salidas de tests y `pnpm run verify` en `attempt-1/`.
- [ ] Commit SHA.

# Restricciones

- No cambiar los valores del balance v1 (PV 6/8/5, armas 3/5/2, centinela sin
  armadura).
- No añadir valores de arquetipos (REQ-015).
- Sin dependencias nuevas; `src/game/` sigue puro.

# No objetivos

- Host y documentación (TASK-0054).
- Roster, Cuchillo y nombre de personaje (TASK-0055).
- Pantalla de inicio (REQ-016).
