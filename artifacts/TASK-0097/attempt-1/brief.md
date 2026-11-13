---
type: Task Brief
title: "TASK-0097: brief del intento 1"
description: Actualizar glosario, controles, arquitectura y notas de vigencia del inventario y el equipo.
task: TASK-0097
attempt: 1
status: stable
brief_bytes: 0
read_detail: false
generated: { by: deepseek/v4.1-flash, at: 2026-11-13T22:10:00Z }
---

# Objetivo

Actualizar glosario, controles, arquitectura y notas de vigencia para describir
el inventario y el equipo ya implementados, sin cambiar reglas ni valores.

# No objetivos

- Código, tests, E2E, UI o arte.
- Traits y cofres (`REQ-019`/`REQ-020`).
- Reescribir historia aprobada o tablas de balance.

# Invariantes

- Solo vigencia y descripción; ninguna regla, valor, fórmula o alcance cambia.
- No tocar `docs/harness/**`, plantillas, `AGENTS.md`, `src/**` ni `tests/**`.
- Enlaces OKF válidos; `pnpm run docs:check` verde.
- Fuera de notas históricas no queda `G` ni `1`-`3` como control vigente.

# Criterios de aceptación

Viven en `docs/tasks/TASK-0097-docs-inventario-equipo-controles.md#criterios-de-aceptación`;
no se copian.

# Contexto mínimo

- Ficha, sección «Contexto»:
  `docs/tasks/TASK-0097-docs-inventario-equipo-controles.md#contexto`. Incluye
  REQ-018 v5/R-004, REQ-019 v3/T-013, la limitación visual (692/508; 692/454 y
  1090/454 con mochila llena) y el índice desfasado.
- `docs/glossary.md`: añade los términos pedidos con los nombres del código
  (`ITEMS`/`ItemDefinition`, `ItemInstance`, `EquipmentSlot`, `ItemLocation`,
  `pickUpItem`, `equipItem`, `unequipItem`, `dropItem`, `Container`).
- `docs/design/turn-economy.md#controles-provisionales`: añade `Escape`;
  conserva `I`; sin `G` ni `1`-`3`.
- `docs/design/architecture.md`: catálogo único (`src/game/equipment.ts`),
  instancias con localización única (`src/game/inventory.ts`), stats en un punto
  (`src/game/stats.ts`) y separación motor/host del panel
  (`src/host/inventory-panel*.ts`). Añade la limitación visual como límite
  conocido, no resuelto.
- `docs/decisions/ADR-021-inventario-equipo.md`: nota de vigencia con lo
  implementado y TASK-0093 a TASK-0098; recoge REQ-018 v5 y REQ-019 T-013.
- `docs/requirements/REQ-010-combate-equipo-acierto-defensa.md` y
  `docs/requirements/REQ-026-economia-acciones-rebalanceo.md`: nota de que el
  inventario de tres armas, `G` y `1`-`3` quedan sustituidos; en REQ-026, R-010
  ya está implementado y R-011 sigue pendiente.
- `docs/requirements/index.md`: actualiza solo versión, estado y descripción de
  REQ-018 (v5) y REQ-019 (v3).

# Artefactos

- `artifacts/TASK-0097/attempt-1/report.md`
- `docs-check-output.txt`, `verify-output.txt`
- Commit SHA en `task/TASK-0097`.

# Riesgos y decisiones abiertas

- La limitación de layout es un límite aceptado, no un fallo de reglas.
- Si un cambio exige una regla o un valor nuevos, para y devuelve `blocked`.
