---
type: Task Brief
title: "TASK-0148: brief del intento 2"
description: Consumir el cadáver al resucitar y recuperar equipo y mochila sin duplicar.
task: TASK-0148
attempt: 2
status: stable
brief_bytes: 2450
read_detail: false
generated: { by: task-lead, at: 2026-11-16T12:00:00Z }
---

# Objetivo

Completar solo el criterio pendiente de REQ-021 v5 R-014/T-014: al resucitar,
retirar el `Container` `corpseOf` de esa unidad, devolver a su equipo y mochila
lo que aún guardaba y no duplicar lo ya saqueado; una segunda muerte crea
cadáver nuevo. Los criterios 1-8 ya están verificados en `task/TASK-0148`.

# No objetivos

- Repetir o reescribir la resurrección por cadáver, índice o recursos ya verdes.
- Host, HUD, menú, E2E visual, objetos o huecos nuevos.
- Cambiar REQ-021/REQ-020, coste, nivel, PV ni reglas de saqueo.

# Invariantes

- Motor puro en `src/game/`; intento inválido sin cambios ni consumo.
- No perder ni duplicar instancias; `lootable` se conserva.
- No tocar `docs/requirements/**`, `docs/harness/**`, `AGENTS.md`,
  `.opencode/**` ni `src/host/**`.
- No debilitar tests; conservar la intención de REQ-009/010/017/018/021/034.

# Criterios de aceptación

Viven en [TASK-0148](../../../docs/tasks/TASK-0148-motor-resurreccion-indice-recursos.md#criterios-de-aceptación);
solo queda el quinto.

# Contexto mínimo

- `src/game/magic.ts`: `revivePlayer` y la rama de resurrección; hoy fija HP y
  quita `ghost` pero no toca contenedores.
- `src/game/death.ts`: `settlePlayerDeath` crea `corpseOf` y, si ya existe,
  descarta el equipo nuevo; el criterio exige que no quede contenedor previo.
- `src/game/inventory.ts`: `Container`, `ItemInstance`, `EquipmentSlots`,
  `equipment.ts` (`EQUIPMENT_SLOTS`, `ITEMS[].slot`), mochila con capacidad.
- REQ-021 v5 R-014/T-014 y REQ-020 v4 (persistencia solo enemiga).
- Tests actuales: `tests/unit/game/magic.test.ts`, `engine.test.ts`,
  `turn.test.ts` (helpers de cadáver y estado).

# Artefactos

- `artifacts/TASK-0148/attempt-2/report.md`, `test-output.txt`,
  `verify-output.txt`, `logs/`.
- Commit con el ID de tarea.

# Riesgos y decisiones abiertas

- El contenedor aplana equipo y mochila; recoloca por `ITEMS[].slot` y deja el
  resto en mochila. Lo que el fantasma llevaba encima se conserva y no se
  duplica.
- Casos de capacidad no cubiertos por REQ-021: no inventes regla; devuelve
  `blocked` con el caso concreto.
- E2E completa la ejecuta el lead; tú no.
