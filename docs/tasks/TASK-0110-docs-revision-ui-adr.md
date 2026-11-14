---
type: Task
id: TASK-0110
title: "Docs: revisión visual, arquitectura y ADR"
description: "Reflejar en arquitectura, glosario y ADR la escala continua, la paleta vintage, el lenguaje inset/outset y el cursor superpuesto, y corregir notas de vigencia."
status: stable
task_status: done
task_type: docs
requirement: REQ-033
requirement_ids: [T-009]
depends_on: [TASK-0109]
unlocks: []
created_at: 2026-11-14T12:02:44Z
completed_at: 2026-11-14T14:15:36Z
assignee: task-lead
attempts: 1
artifacts: artifacts/TASK-0110/
priority: P1
risk: low
review_required: true
generated: { by: deepseek/v4.1-flash, at: 2026-11-14T12:02:44Z }
verified:
  - by: task-lead
    at: 2026-11-14T14:15:36Z
    note: >-
      Intento 1 verificado (contenido `9da3281`; fusión `eab91ef`). Reejecutado
      `pnpm run verify` (docs:check 525 documentos y 110 tareas, config, 1317
      tests, tsc, build y bundle) y `pnpm run docs:check`. Diff revisado: solo
      `docs/design/architecture.md`, `docs/glossary.md`, ADR-021/025/026, índice
      de decisiones, ficha y log; sin cambios en `src/**`, tests, UI, requisitos
      ni arnés. Arquitectura recoge escala única, ocho colores, outset/inset,
      cursor superpuesto y anti-CLS; glosario añade escala de UI, outset, inset,
      Bolsa y cursor de selección; ADR-026 registra la decisión y ADR-021/025
      llevan nota de vigencia. E2E no aplica: no se tocó código de UI.
---

# Objetivo

Que la documentación de diseño, glosario y decisiones refleje la UI implementada
tras REQ-033 y no queden notas de vigencia contradictorias.

# Contexto

REQ-033 v6 está aceptada y las tareas 0104-0109 implementan y verifican el corte.
La edición de diseño, glosario, ADR y log corresponde a `task-lead` por ADR-016.

# Criterios de aceptación

- [x] Arquitectura: documenta la escala única derivada del marco, la paleta de
      ocho colores, el relieve outset/inset, el cursor superpuesto y la regla
      anti-CLS.
- [x] Glosario: añade o precisa «escala de UI», «outset», «inset», «Bolsa» como
      etiqueta de UI y «cursor de selección»; aclara que el modelo sigue usando
      «mochila».
- [x] ADR: se registra la decisión de escala continua y relieve vintage, o se
      enmienda ADR-025 con nota de vigencia hacia REQ-033.
- [x] Se corrigen las notas de vigencia de ADR-021/ADR-025 y cualquier documento
      que declare tamaños fijos, paleta anterior o scroll aceptado como límite.
- [x] `pnpm run docs:check` pasa.
- [x] El log registra el cierre documental.

# Plan de test

- Documental: `pnpm run docs:check`.
- Manual: revisar enlaces, anclas, términos y notas de vigencia.

# Evidencia esperada

- [x] Informe en `artifacts/TASK-0110/attempt-1/report.md`
- [x] Salida de `pnpm run docs:check`
- [x] Commit SHA

# Restricciones

- Sin cambios en `src/**`, tests ni UI.
- No se reescribe la historia de ADR; se añade la nota de vigencia.
- La hoja REQ-033 no se modifica salvo errata factual.

# No objetivos

- Implementar o corregir UI.
- Crear la tarea del layout alternativo; solo se abre si el QA de TASK-0109 lo
  justifica.
