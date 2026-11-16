---
type: Task
id: TASK-0167
title: "Motor: poder declarado por trait y puntuación de objetos"
description: "Añadir a cada trait un poder entero con signo validado por el catálogo y una función pura powerScore que puntúe un objeto con acierto, daño, absorción, evasión y traits."
status: stable
task_status: done
task_type: feature
requirement: REQ-020
requirement_ids: [R-006, R-009, T-002, T-003]
depends_on: []
unlocks: [TASK-0168]
created_at: 2026-11-16T16:20:04Z
completed_at: 2026-11-16T16:36:41Z
assignee: task-runner
attempts: 1
artifacts: artifacts/TASK-0167/
priority: P1
risk: low
review_required: true
generated: { by: deepseek/v4.1-flash, at: 2026-11-16T16:20:04Z }
verified:
  - by: game-lead
    at: 2026-11-16T16:36:41Z
    note: >-
      Intento 1 verificado (código `f3d589ed`, evidencia `2add19d4`). Los cinco
      criterios firmados sobre el catálogo real de 17 traits y 14 objetos; los
      recuentos de la ficha y ADR-033 están desfasados y se anotan sin bloquear.
      `verify` completo y `verify:task` en verde. Detalle en
      `attempt-1/lead-verify/verification.md`.
---

# Objetivo

Que el catálogo de traits declare un poder con signo y que exista una puntuación
determinista por objeto, base de la curva de botín de [REQ-020](../requirements/REQ-020-cofres-saqueo.md#requisitos-creativos-decididos)
[R-006 y R-009](../requirements/REQ-020-cofres-saqueo.md#requisitos-creativos-decididos),
sin cambiar el comportamiento del combate.

# Contexto

[ADR-033](../decisions/ADR-033-cofres-poder-botin-progresivo.md) fija la fórmula
y los valores provisionales. Hoy `TraitDefinition` no tiene poder y `ITEMS` no se
puntúa. Los traits viven en `src/game/equipment.ts` y el validador de catálogo ya
comprueba IDs, stacking y parámetros.

# Criterios de aceptación

- [x] `TraitDefinition` declara `poder` entero con signo; los 18 traits del
      catálogo lo tienen y el validador rechaza un trait sin poder.
- [x] `powerScore(item)` es pura y determinista: acierto + daño total + absorción
      + evasión + suma de `poder` de sus traits, sin leer estado de partida.
- [x] Los 13 objetos de `ITEMS` tienen puntuación estable y los malditos restan;
      la tabla de valores provisionales de ADR-033 se respeta.
- [x] La puntuación no altera combate, stats efectivos ni stacking: los tests de
      REQ-019 y REQ-029 pasan sin cambios.
- [x] Tests nuevos de tabla y de validación del catálogo; `pnpm run verify` pasa.

# Plan de test

- Unitario: `tests/unit/game/item-catalog.test.ts` y un `loot-power.test.ts`
  nuevo; valores esperados de los 13 objetos y de cuatro traits negativos.
- Integración: `validateItemCatalog` y `validateTraits` rechazan poder ausente y
  aceptan el catálogo completo.
- E2E / visual: no.

# Evidencia esperada

- [ ] Informe en `artifacts/TASK-0167/attempt-1/report.md`
- [ ] Salida de `pnpm run verify`
- [ ] Commit SHA

# Restricciones

- Sin generación de cofres ni botín: eso es TASK-0168.
- Sin cambios en fórmulas de combate, daño, traits ni stats efectivos.
- Sin dependencias nuevas; `src/game/` no importa `src/host/`.
- No reescribir tests sellados; handoff 2 KB, tope duro 4 KB; pnpm, nunca npm.

# No objetivos

- Curva de botín, umbral por hueco y elección de candidatas (TASK-0168).
- Panel, HUD o feedback (TASK-0170).
- Ajuste fino de los poderes: se hace con playtest y `ADR-014`.
