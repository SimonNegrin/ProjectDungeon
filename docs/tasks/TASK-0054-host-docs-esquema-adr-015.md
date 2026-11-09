---
type: Task
id: TASK-0054
title: "Host y docs: nombres nuevos del esquema y ADR-015"
description: "HUD/F1 con habilidad, fuerza, defensa y resistencia; turn-economy, glosario y arquitectura actualizados; ADR-015 registrado."
status: stable
task_status: done
task_type: feature
requirement: REQ-014
requirement_ids: [T-005]
depends_on: [TASK-0053]
unlocks: [TASK-0056]
created_at: 2026-11-09T15:30:00Z
completed_at: 2026-11-09T23:55:10Z
assignee: task-runner
attempts: 1
artifacts: artifacts/TASK-0054/
priority: P1
risk: low
review_required: true
generated: { by: deepseek/v4-pro, at: 2026-11-09T15:30:00Z }
verified:
  - by: task-lead
    at: 2026-11-09T23:55:10Z
    note: >-
      Intento 1 verificado en `task/TASK-0054` (HUD y tests `d8e3876`,
      evidencia `c7dd711`, ADR y triaje `6713ef7`, docs `15800c4`). Diff
      revisado: solo host, expectativas de tests, documentación y ADR; sin
      fórmulas, balance, dependencias ni tests debilitados. Lead re-ejecutó
      `pnpm run docs:check` (265 documentos), `pnpm run verify` (740/740, build y
      bundle) y `pnpm run test:e2e` (76/76). HUD/F1 sin etiquetas antiguas; docs
      sin contradicciones; ADR-015 enlazado en el índice.
---

# Objetivo

Que el host muestre los nombres nuevos del esquema de
[REQ-014](../requirements/REQ-014-atributos-inherentes-personajes.md)
(`habilidad`, `fuerza`, `defensa`, `resistencia`) en HUD y `F1`, y que
`docs/design/turn-economy.md`, el glosario, la arquitectura y el `ADR-015`
reflejen el esquema y la resistencia en la absorción.

# Contexto

- HUD y `F1` actuales: REQ-010 «T-006».
- Textos a actualizar: `docs/design/turn-economy.md`, `docs/glossary.md` y
  `docs/design/architecture.md`.
- ADR a crear: `docs/decisions/ADR-015-*.md` (esquema de atributos), enlazado en
  `docs/decisions/index.md`.

# Criterios de aceptación

- [x] El HUD y `F1` muestran `habilidad`, `fuerza`, `defensa` y `resistencia`;
  no quedan etiquetas `acierto`/`daño`.
- [x] `turn-economy`, glosario y arquitectura describen el esquema nuevo sin
  contradicciones.
- [x] El ADR-015 registra los ocho atributos y la resistencia en la absorción, y
  está enlazado en el índice de decisiones.
- [x] `pnpm run docs:check` y `pnpm run verify` pasan; E2E sin regresiones.

# Plan de test

- **Unitario / integración:** el HUD lee del catálogo.
- **E2E / visual:** smoke de HUD con los nombres nuevos; captura.
- **Manual:** `F1` muestra habilidad, fuerza, defensa y resistencia.

# Evidencia esperada

- [x] Informe en `artifacts/TASK-0054/attempt-1/report.md`.
- [x] Salidas de `docs:check`/`verify` y captura del HUD.
- [x] Commit SHA.

# Restricciones

- No cambiar fórmulas ni valores de balance.
- No tocar `experiments/`, `index.html`, `public/` ni dependencias.

# No objetivos

- Roster y Cuchillo (TASK-0055).
- Pantalla de inicio (REQ-016).
