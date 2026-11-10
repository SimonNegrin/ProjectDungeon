---
type: ADR
title: "ADR-016: permisos de task-lead para diseño y glosario"
description: task-lead puede editar docs/design y docs/glossary para cerrar tareas mixtas, solo para reflejar requisitos ya aprobados.
status: stable
decision_status: accepted
decided_by: [human:simon]
decided_at: 2026-11-10T00:30:00Z
generated: { by: deepseek/v4-pro, at: 2026-11-10T00:30:00Z }
---

# Contexto

Las tareas mixtas (código + documentación) se bloqueaban: `task-runner` no puede
editar `docs/` y `task-lead` no podía editar `docs/design/**` ni
`docs/glossary.md`. Cada tarea así (TASK-0054 y TASK-0056) quedaba `blocked` y
`requirements-writer` tenía que aplicar a mano la propuesta documental del
runner, añadiendo una vuelta por tarea.

# Decisión

- `task-lead` puede editar `docs/design/**` y `docs/glossary.md`, además de
  `docs/tasks/**`, `docs/decisions/**`, `docs/log.md` y `artifacts/**`.
- Guardarraíl: en `docs/design/**` y `docs/glossary.md` solo refleja requisitos
  ya aprobados y lo implementado. Cualquier cambio de regla, decisión creativa o
  alcance lo eleva a `requirements-writer` y, si procede, lo decide el usuario.
- `docs/requirements/**`, `docs/harness/**` y `docs/templates/**` siguen en manos
  de `requirements-writer`.

# Consecuencias

- Las tareas mixtas se cierran sin la vuelta de `requirements-writer`.
- La propiedad de `docs/design` y el glosario pasa a ser compartida: el lead
  actualiza para reflejar la implementación; la autoridad de reglas sigue en
  `requirements-writer` y el usuario.
- El riesgo de deriva se acota con el guardarraíl y con la verificación del lead
  contra el requisito.

# Alternativas descartadas

- **Mantener el traspaso de propuestas**: no escala y bloquea cada tarea mixta.
- **Separar lo documental en tareas propias**: añade burocracia y tareas sin
  código que verificar.
- **Dar el permiso a `task-runner`**: menos control; el lead es mejor puerta de
  verificación.

Ver [workflow](../harness/workflow.md#fricción-y-propuestas) y
[ADR-009](ADR-009-recorte-arnes.md).
