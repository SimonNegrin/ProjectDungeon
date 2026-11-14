---
type: Task
id: TASK-0110
title: "Docs: revisión visual, arquitectura y ADR"
description: "Reflejar en arquitectura, glosario y ADR la escala continua, la paleta vintage, el lenguaje inset/outset y el cursor superpuesto, y corregir notas de vigencia."
status: draft
task_status: in_progress
task_type: docs
requirement: REQ-033
requirement_ids: [T-009]
depends_on: [TASK-0109]
unlocks: []
created_at: 2026-11-14T12:02:44Z
completed_at:
assignee: task-lead
attempts: 0
artifacts: artifacts/TASK-0110/
priority: P1
risk: low
review_required: true
generated: { by: deepseek/v4.1-flash, at: 2026-11-14T12:02:44Z }
verified:
---

# Objetivo

Que la documentación de diseño, glosario y decisiones refleje la UI implementada
tras REQ-033 y no queden notas de vigencia contradictorias.

# Contexto

REQ-033 v6 está aceptada y las tareas 0104-0109 implementan y verifican el corte.
La edición de diseño, glosario, ADR y log corresponde a `task-lead` por ADR-016.

# Criterios de aceptación

- [ ] Arquitectura: documenta la escala única derivada del marco, la paleta de
      ocho colores, el relieve outset/inset, el cursor superpuesto y la regla
      anti-CLS.
- [ ] Glosario: añade o precisa «escala de UI», «outset», «inset», «Bolsa» como
      etiqueta de UI y «cursor de selección»; aclara que el modelo sigue usando
      «mochila».
- [ ] ADR: se registra la decisión de escala continua y relieve vintage, o se
      enmienda ADR-025 con nota de vigencia hacia REQ-033.
- [ ] Se corrigen las notas de vigencia de ADR-021/ADR-025 y cualquier documento
      que declare tamaños fijos, paleta anterior o scroll aceptado como límite.
- [ ] `pnpm run docs:check` pasa.
- [ ] El log registra el cierre documental.

# Plan de test

- Documental: `pnpm run docs:check`.
- Manual: revisar enlaces, anclas, términos y notas de vigencia.

# Evidencia esperada

- [ ] Informe en `artifacts/TASK-0110/attempt-1/report.md`
- [ ] Salida de `pnpm run docs:check`
- [ ] Commit SHA

# Restricciones

- Sin cambios en `src/**`, tests ni UI.
- No se reescribe la historia de ADR; se añade la nota de vigencia.
- La hoja REQ-033 no se modifica salvo errata factual.

# No objetivos

- Implementar o corregir UI.
- Crear la tarea del layout alternativo; solo se abre si el QA de TASK-0109 lo
  justifica.
