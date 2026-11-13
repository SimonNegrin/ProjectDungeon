---
type: Task
id: TASK-0097
title: "Docs: inventario, equipo, controles y vigencia"
description: "Actualizar glosario, economía de turno, arquitectura y las notas de vigencia de REQ-010 y REQ-026 con el modelo de instancias, mochila, huecos, panel `I` y costes de 1 MP, sin tocar reglas."
status: stable
task_status: done
task_type: docs
requirement: REQ-018
requirement_ids: [T-013]
depends_on: [TASK-0095, TASK-0096, TASK-0098]
unlocks: []
created_at: 2026-11-13T19:22:51Z
completed_at: 2026-11-13T21:39:15Z
assignee: task-runner
attempts: 1
artifacts: artifacts/TASK-0097/
priority: P2
risk: low
review_required: true
generated: { by: deepseek/v4.1-flash, at: 2026-11-13T19:22:51Z }
verified:
  - by: task-lead
    at: 2026-11-13T21:39:15Z
    note: >-
      Verificación independiente en `main` tras fusionar `task/TASK-0097`
      (implementación `572a756`, evidencia `c89fd68`, merge `b78047b`). Diff
      completo revisado: solo `docs/glossary.md`, `docs/design/{architecture,turn-economy}.md`,
      `docs/decisions/ADR-021-inventario-equipo.md`,
      `docs/requirements/{REQ-010,REQ-026,index}.md`, la ficha, TASK-0098 y
      `artifacts/TASK-0097/**`; sin `src/**`, `tests/**`, `docs/harness/**`,
      plantillas ni `AGENTS.md`. Reejecutados `pnpm run docs:check` (OK, 471
      documentos) y `pnpm run verify` (1249/1249, build y bundle). Criterios
      revisados uno a uno: glosario con los términos y nombres del código;
      `turn-economy` con `I`/`Escape` y sin `G` ni `1`-`3` vigentes; arquitectura
      con catálogo, instancias/localización, stats en un punto y separación
      motor/host, más el límite visual 692/508 y 692/454 (1090/454) como límite
      aceptado; ADR-021 con cierre TASK-0093 a TASK-0098, REQ-018 v5/R-004 y
      REQ-019 v3/T-013; REQ-010 y REQ-026 con la sustitución y el estado de
      R-010/R-011; índice con REQ-018 v5 y REQ-019 v3. Sin cambios de reglas,
      valores, costes ni alcance y sin tests tocados. Fricción del `edit`
      denegado en `task-runner` elevada a `harness-keeper`.
---

# Objetivo

Que la documentación de diseño y los índices describan el inventario y el equipo
implementados —instancias, ocho huecos, mochila parametrizable, panel único con
`I`, costes y retirada de `G` y `1`-`3`— sin contradicciones con las hojas
vigentes.

# Contexto

- Modelo y operaciones en TASK-0094; panel e input en TASK-0095; sprites y debug
  en TASK-0096; E2E y QA visual en TASK-0098.
- `docs/glossary.md`, `docs/design/turn-economy.md` y
  `docs/design/architecture.md` son de autoría compartida con el lead.
- [REQ-018](../requirements/REQ-018-inventario-equipo.md#requisitos-técnicos)
  T-013; [ADR-021](../decisions/ADR-021-inventario-equipo.md) ya existe.
- La tabla de controles y las fórmulas son la fuente que leen los agentes: no se
  reescriben reglas, solo se refleja lo implementado.
- **REQ-018 v5 enmendó R-004:** este corte solo trae armas a una mano. La regla de
  dos manos vive en el modelo y sus unitarios; la primera arma a dos manos
  jugable es la maza de REQ-019. La nota de vigencia de ADR-021 debe recogerlo.
- **REQ-019 v3 añadió a T-013** el E2E de dos manos con escudo, diferido desde
  REQ-018 v5.
- **Limitación visual conocida y aceptada:** a 1280×720 el cuerpo del panel mide
  692 px de contenido para 508 visibles, y a 900×700 692/454 (1090/454 con la
  mochila llena). El panel hace scroll interno y el desglose de stats no cabe
  entero; es un límite de layout, no un fallo de reglas. Documéntalo en
  arquitectura como limitación, no como algo resuelto.
- **Índice:** `docs/requirements/index.md` aún describe REQ-018 como v4 y
  REQ-019 como v2 «en curso»; actualiza solo versión, estado y descripción, sin
  tocar reglas ni alcance.

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
