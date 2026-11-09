---
type: Task
id: TASK-0053
title: "Motor: esquema de ocho atributos y resistencia en la absorción"
description: "Renombrar acierto/daño a habilidad/fuerza, añadir resistencia/puntería/magia y usar la resistencia en la capa de daño; resistencia 0 conserva el balance v1."
status: stable
task_status: done
task_type: feature
requirement: REQ-014
requirement_ids: [R-001, R-002, R-003, R-004, R-005, R-006, R-007, R-008, R-009, R-010, T-001, T-002, T-003, T-004]
depends_on: []
unlocks: [TASK-0054, TASK-0055]
created_at: 2026-11-09T15:30:00Z
completed_at: 2026-11-09T23:32:10Z
assignee: task-runner
attempts: 1
artifacts: artifacts/TASK-0053/
priority: P1
risk: medium
review_required: true
generated: { by: deepseek/v4-pro, at: 2026-11-09T15:30:00Z }
verified:
  - by: task-lead
    at: 2026-11-09T23:32:10Z
    note: >-
      Intento 1 verificado en `task/TASK-0053` (código y tests `ca928f1`,
      evidencia `10cc5c9`; fusión `ccf7ab5`). Diff completo revisado: solo
      `src/game/`, migración mecánica de host y tests; sin cambios de balance,
      fórmulas paralelas, dependencias ni documentación de TASK-0054. Lead
      re-ejecutó `pnpm run verify` (740/740, docs/config, build y bundle OK) y
      `pnpm run test:e2e` (76/76). Comprobados los ocho atributos, nivel de magia
      1–4, resistencia 0 equivalente, absorción resistencia+armadura y bestiario
      como fuente única; sin tests borrados, saltados ni debilitados (+6 tests).
      El HUD conserva los textos «acierto/daño» para TASK-0054.
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

- [x] El estado de unidad declara `habilidad`, `fuerza`, `defensa`,
  `resistencia`, `puntería`, `magia`, PV y MP; `magia` es una lista de
  `{ familia, nivel }` con nivel 1–4.
- [x] `acierto`→`habilidad` y `daño`→`fuerza` en tipos, combate, bestiario, IA y
  tests; no quedan nombres antiguos como fuente de verdad.
- [x] Impacto: `habilidad + acierto del arma + 1d6 > defensa + escudo + 1d6`; el
  empate falla.
- [x] Daño: `max(1, (fuerza + daño del arma + 1d6) − (resistencia + armadura + 1d6))`.
- [x] El jugador provisional y los enemigos tienen resistencia 0, puntería 0 y
  magia vacía; el resultado de combate del balance v1 no cambia.
- [x] El bestiario declara los ocho atributos por tipo, sin duplicar valores.
- [x] Tests unitarios actualizados; `pnpm run verify` pasa.

# Plan de test

- **Unitario:** 36 combinaciones de impacto, distribución de daño con mínimo 1,
  resistencia 0 equivale al comportamiento previo, serialización de stats.
- **Integración:** fase enemiga y combate sin cambios con resistencia 0.
- **Regresión:** no se borran ni debilitan tests; los que usan acierto/daño se
  migran a habilidad/fuerza.
- **E2E / visual:** llega en TASK-0054.

# Evidencia esperada

- [x] Informe en `artifacts/TASK-0053/attempt-1/report.md`.
- [x] Salidas de tests y `pnpm run verify` en `attempt-1/`.
- [x] Commit SHA.

# Restricciones

- No cambiar los valores del balance v1 (PV 6/8/5, armas 3/5/2, centinela sin
  armadura).
- No añadir valores de arquetipos (REQ-015).
- Sin dependencias nuevas; `src/game/` sigue puro.

# No objetivos

- Host y documentación (TASK-0054).
- Roster, Cuchillo y nombre de personaje (TASK-0055).
- Pantalla de inicio (REQ-016).
