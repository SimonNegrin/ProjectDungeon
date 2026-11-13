---
type: Task
id: TASK-0097
title: "Docs: inventario, equipo, controles y vigencia"
description: "Actualizar glosario, economía de turno, arquitectura y las notas de vigencia de REQ-010 y REQ-026 con el modelo de instancias, mochila, huecos, panel `I` y costes de 1 MP, sin tocar reglas."
status: stable
task_status: backlog
task_type: docs
requirement: REQ-018
requirement_ids: [T-013]
depends_on: [TASK-0095, TASK-0096]
unlocks: []
created_at: 2026-11-13T19:22:51Z
completed_at:
assignee: task-runner
attempts: 0
artifacts: artifacts/TASK-0097/
priority: P2
risk: low
review_required: true
generated: { by: deepseek/v4.1-flash, at: 2026-11-13T19:22:51Z }
verified:
---

# Objetivo

Que la documentación de diseño y los índices describan el inventario y el equipo
implementados —instancias, ocho huecos, mochila parametrizable, panel único con
`I`, costes y retirada de `G` y `1`-`3`— sin contradicciones con las hojas
vigentes.

# Contexto

- Modelo y operaciones en TASK-0094; panel e input en TASK-0095; sprites y debug
  en TASK-0096.
- `docs/glossary.md`, `docs/design/turn-economy.md` y
  `docs/design/architecture.md` son de autoría compartida con el lead.
- [REQ-018](../requirements/REQ-018-inventario-equipo.md#requisitos-técnicos)
  T-013; [ADR-021](../decisions/ADR-021-inventario-equipo.md) ya existe.
- La tabla de controles y las fórmulas son la fuente que leen los agentes: no se
  reescriben reglas, solo se refleja lo implementado.

# Criterios de aceptación

- [ ] El glosario define objeto, instancia, hueco de equipo, mochila, localización,
      equipar, desequipar, recoger, soltar y contenedor con los términos usados por
      el código.
- [ ] `turn-economy.md` muestra `I` y `Escape` en la tabla de controles, el coste
      de 1 MP por equipar, recoger y soltar sin gastar acción, y ya no presenta `G`
      ni `1`-`3` como controles vigentes.
- [ ] `architecture.md` describe el catálogo único, las instancias con localización
      única, el punto único de stats efectivos y la separación motor/host del panel.
- [ ] `ADR-021` queda con una nota de vigencia que apunta a lo implementado y a las
      tareas que lo cierran.
- [ ] `REQ-010` y `REQ-026` llevan la nota de que su inventario de tres armas, su
      recogida con `G` y sus ranuras `1`-`3` quedan sustituidos.
- [ ] `pnpm run docs:check` pasa y no queda `G` ni `1`-`3` como controles vigentes
      fuera de las notas históricas.
- [ ] No se cambian reglas, valores, costes ni el alcance de otras hojas.

# Plan de test

- Documental: `pnpm run docs:check`; búsqueda de `G`, `1`-`3`, «tres armas» y
  «recogida» para revisar cada aparición.
- Manual: leer la tabla de controles y comprobar que coincide con la ayuda del
  juego.

# Evidencia esperada

- [ ] Informe en `artifacts/TASK-0097/attempt-1/report.md`
- [ ] Salida de `pnpm run docs:check`
- [ ] Commit SHA en la rama `task/TASK-0097`

# Restricciones

- No cambiar requisitos, ADRs ni valores; solo vigencia y descripción.
- No tocar `docs/harness/**`, plantillas ni `AGENTS.md`.
- Sin dependencias nuevas.

# No objetivos

- E2E y QA visual (TASK-0098).
- Traits (`REQ-019`) y cofres (`REQ-020`).
