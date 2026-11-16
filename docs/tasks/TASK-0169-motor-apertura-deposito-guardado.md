---
type: Task
id: TASK-0169
title: "Motor: apertura con acción, depósito y persistencia del cofre"
description: "Añadir el comando de apertura de cofre con coste 1 acción y adyacencia, el depósito gratis y atómico solo en cofres, y el estado de apertura en snapshot y guardado v1."
status: draft
task_status: backlog
task_type: feature
requirement: REQ-020
requirement_ids: [R-003, R-010, T-001, T-005, T-006, T-008]
depends_on: [TASK-0168]
unlocks: [TASK-0170]
created_at: 2026-11-16T16:20:04Z
completed_at:
assignee: task-runner
attempts: 0
artifacts: artifacts/TASK-0169/
priority: P1
risk: medium
review_required: true
generated: { by: deepseek/v4.1-flash, at: 2026-11-16T16:20:04Z }
verified:
---

# Objetivo

Que un cofre generado se pueda abrir con una acción desde una casilla adyacente,
recibir y entregar objetos sin coste y sobrevivir a guardar y cargar con su estado,
según [REQ-020](../requirements/REQ-020-cofres-saqueo.md#requisitos-creativos-decididos)
[R-003 y R-010](../requirements/REQ-020-cofres-saqueo.md#requisitos-creativos-decididos).

# Contexto

`TakeItem` y `TakeAll` ya existen y `containerOpenCost` es hoy una regla pura del
host. El fantasma inspecciona contenedores con `InspectContainer` y no debe abrir.
El guardado v1 aún no está publicado, así que el campo nuevo entra en esa versión.

# Criterios de aceptación

- [ ] Un comando de apertura gasta exactamente 1 acción, exige adyacencia
      Chebyshev 1 y rechaza sin cambios parciales si falta acción, distancia o el
      cofre no existe; reabrir un cofre abierto no cuesta nada.
- [ ] El fantasma no puede abrir un cofre y conserva la inspección; los vivos
      abren en su turno.
- [ ] Depositar es gratis y atómico, solo en cofres: capacidad, localización y
      tipo se validan antes de mover; un cadáver rechaza depósitos.
- [ ] «Coger todo» con el cofre abierto se rechaza entero si algo no cabe.
- [ ] El cofre abierto permanece en el mundo con su estado y su contenido; vacío
      no se elimina.
- [ ] Snapshot y guardado v1 exponen y restauran cofres, estado de apertura y
      contenido sin repetir tiradas; cargar y volver a guardar es estable.
- [ ] Tests de coste, adyacencia, reapertura, fantasma, depósito atómico,
      capacidad, cadáver sin depósito y round-trip de guardado; `pnpm run verify`
      pasa.

# Plan de test

- Unitario: `tests/unit/game/inventory.test.ts`, `turn.test.ts`,
  `save-schema.test.ts` y un `containers.test.ts` nuevo.
- Integración: abrir, coger uno, depositar otro y guardar; cargar y verificar.
- E2E / visual: no.

# Evidencia esperada

- [ ] Informe en `artifacts/TASK-0169/attempt-1/report.md`
- [ ] Salida de `pnpm run verify`
- [ ] Commit SHA

# Restricciones

- Sin UI ni teclas: TASK-0170.
- No cambiar el coste ni el comportamiento del cadáver de REQ-034.
- Sin llaves, trampas ni cofres cerrados con cerradura.
- Sin dependencias nuevas; `src/game/` no importa `src/host/`.
- Handoff 2 KB, tope duro 4 KB; pnpm, nunca npm.

# No objetivos

- Columna «Cofre», HUD por cursor y feedback.
- Depósito en cadáveres y soltar al suelo.
- Migración de guardados publicados.
