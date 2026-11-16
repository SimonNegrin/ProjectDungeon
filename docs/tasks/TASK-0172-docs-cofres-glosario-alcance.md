---
type: Task
id: TASK-0172
title: "Docs: cofres en glosario, economía de turno y alcance"
description: "Reflejar los cofres y el botín progresivo en glosario, economía de turno, arquitectura, alcance y la matriz de feedback, sin reescribir requisitos."
status: draft
task_status: in_progress
task_type: docs
requirement: REQ-020
requirement_ids: [T-009]
depends_on: [TASK-0171]
unlocks: []
created_at: 2026-11-16T16:20:04Z
completed_at:
assignee: game-lead
attempts: 0
artifacts: artifacts/TASK-0172/
priority: P2
risk: low
review_required: true
generated: { by: deepseek/v4.1-flash, at: 2026-11-16T16:20:04Z }
verified:
---

# Objetivo

Que la documentación vigente describa cofres, coste de apertura, depósito y curva
de botín sin contradecir [REQ-020](../requirements/REQ-020-cofres-saqueo.md) v5 ni
[ADR-033](../decisions/ADR-033-cofres-poder-botin-progresivo.md).

# Contexto

`docs/scope.md` sigue diciendo que los cofres son «fuera de alcance» y que
REQ-019 no tiene fuente jugable. La matriz de
[REQ-017](../requirements/REQ-017-feedback-visual-eventos.md#matriz-evento--feedback)
no tiene filas de apertura y transferencia. El glosario no define cofre, poder ni
mejora.

# Criterios de aceptación

- [ ] El glosario define cofre, capacidad, poder, mejora y botín especial con los
      términos de REQ-020 y ADR-033.
- [ ] La economía de turno recoge apertura con 1 acción, transferencia y depósito
      gratis, y el límite de las 4 casillas.
- [ ] La arquitectura describe contenedores, generación determinista y separación
      motor/host para cofres.
- [ ] La matriz de REQ-017 gana las filas de apertura y transferencia con beat.
- [ ] `docs/scope.md` deja de listar cofres como fuera de alcance y refleja que las
      piezas de REQ-019 ya tienen fuente jugable.
- [ ] `docs/requirements/index.md`, `docs/log.md` y el glosario quedan coherentes;
      `pnpm run docs:check` y `pnpm run verify` pasan.

# Plan de test

- Unitario: no aplica.
- Integración: `pnpm run docs:check` y enlaces con ancla.
- E2E / visual: no.
- Manual: lectura cruzada con REQ-020, REQ-034 y ADR-033.

# Evidencia esperada

- [ ] Informe en `artifacts/TASK-0172/attempt-1/report.md`
- [ ] Salida de `pnpm run docs:check`
- [ ] Commit SHA

# Restricciones

- No reescribir requisitos cerrados ni la historia del log.
- Sin cambios en `src/`, `tests/` ni arnés.
- Handoff 2 KB, tope duro 4 KB.

# No objetivos

- Ajustar valores de balance.
- Documentar cofres cerrados, llaves o trampas.
