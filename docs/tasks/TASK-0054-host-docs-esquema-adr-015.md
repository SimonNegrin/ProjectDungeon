---
type: Task
id: TASK-0054
title: "Host y docs: nombres nuevos del esquema y ADR-015"
description: "HUD/F1 con habilidad, fuerza, defensa y resistencia; turn-economy, glosario y arquitectura actualizados; ADR-015 registrado."
status: stable
task_status: in_progress
task_type: feature
requirement: REQ-014
requirement_ids: [T-005]
depends_on: [TASK-0053]
unlocks: [TASK-0056]
created_at: 2026-11-09T15:30:00Z
completed_at:
assignee: task-runner
attempts: 0
artifacts: artifacts/TASK-0054/
priority: P1
risk: low
review_required: true
generated: { by: deepseek/v4-pro, at: 2026-11-09T15:30:00Z }
verified:
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

- [ ] El HUD y `F1` muestran `habilidad`, `fuerza`, `defensa` y `resistencia`;
  no quedan etiquetas `acierto`/`daño`.
- [ ] `turn-economy`, glosario y arquitectura describen el esquema nuevo sin
  contradicciones.
- [ ] El ADR-015 registra los ocho atributos y la resistencia en la absorción, y
  está enlazado en el índice de decisiones.
- [ ] `pnpm run docs:check` y `pnpm run verify` pasan; E2E sin regresiones.

# Plan de test

- **Unitario / integración:** el HUD lee del catálogo.
- **E2E / visual:** smoke de HUD con los nombres nuevos; captura.
- **Manual:** `F1` muestra habilidad, fuerza, defensa y resistencia.

# Evidencia esperada

- [ ] Informe en `artifacts/TASK-0054/attempt-1/report.md`.
- [ ] Salidas de `docs:check`/`verify` y captura del HUD.
- [ ] Commit SHA.

# Restricciones

- No cambiar fórmulas ni valores de balance.
- No tocar `experiments/`, `index.html`, `public/` ni dependencias.

# No objetivos

- Roster y Cuchillo (TASK-0055).
- Pantalla de inicio (REQ-016).
