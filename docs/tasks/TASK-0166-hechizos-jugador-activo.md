---
type: Task
id: TASK-0166
title: "Bug: la lista de hechizos usa el nivel del jugador activo"
description: "La disponibilidad de hechizos se calcula con el primer jugador vivo, no con el lanzador activo."
status: draft
task_status: ready
task_type: feature
requirement: REQ-025
requirement_ids: [R-001, R-007, R-011]
depends_on: []
unlocks: []
created_at: 2026-11-16T14:23:01Z
completed_at:
assignee: task-runner
attempts: 0
artifacts: artifacts/TASK-0166/
priority: P1
risk: low
review_required: false
generated: { by: deepseek/v4.1-flash, at: 2026-11-16T14:23:01Z }
verified:
---

# Objetivo

Que la lista de hechizos (`Q`) calcule nivel, maná y disponibilidad con el
**jugador activo**, de modo que un mago que no sea el primer jugador vea sus
hechizos disponibles y un no lanzador no herede los del primero.

# Contexto

Hallazgo análogo a los dos bugs de playtest: `src/host/spell-menu.ts` resuelve el
lanzador con `players.find(hp > 0) ?? players[0]`. El resto del host ya usa
`activePlayer(state)`. La disponibilidad por nivel está en
[REQ-025](../requirements/REQ-025-magia-hechizos-mana.md#requisitos-creativos-decididos)
R-001 y R-007; el HUD del activo, en R-011 y en
[REQ-031](../requirements/REQ-031-hotseat-local.md#requisitos-creativos-decididos)
R-012.

# Criterios de aceptación

- [ ] Test unitario nuevo con dos jugadores, primero sin magia y segundo con
      nivel suficiente, activo en el segundo: `buildSpellMenuModel` marca como
      disponibles los hechizos de su nivel y no los del primero; el test falla
      antes del arreglo.
- [ ] La resolución usa `activePlayer(state)`; sin activo no se cae al primer
      jugador y la lista queda sin lanzador, como cuando no hay caster.
- [ ] Cambiar de turno con `N` recalcula la disponibilidad para el nuevo activo
      sin conservar la del anterior.
- [ ] La selección, el orden, el texto de ayuda, el lanzamiento con `X` y el
      coste no cambian.
- [ ] Sin cambios en `src/game/**`, catálogo, reglas ni maná; no se debilitan
      tests existentes. `pnpm run verify` y `pnpm run test:e2e` pasan.

# Plan de test

- Unitario: dos jugadores con niveles 0 y ≥1; activo en el segundo; estados
  `available`/`no-mana`/`level` esperados según catálogo y maná. Caso inverso
  con el activo en el primero y caso sin activo.
- Integración: `pnpm run verify`.
- E2E: en hotseat, segundo jugador mago, abrir `Q` en su turno y comprobar que
  sus hechizos aparecen disponibles; repetir en el turno del primero si es no
  lanzador.
- Manual: opcional; la evidencia funcional va en el modelo y el DOM.

# Evidencia esperada

- [ ] Informe en `artifacts/TASK-0166/attempt-1/report.md`
- [ ] Salida del test unitario fallando antes del cambio y pasando después
- [ ] Salida de `pnpm run verify` y de `pnpm run test:e2e`
- [ ] Commit SHA

# Restricciones

- La corrección vive en el modelo del menú; no se toca el motor ni el catálogo.
- Sin capturas: no cambia el aspecto, solo la disponibilidad calculada.
- Sin dependencias nuevas.

# No objetivos

- Rediseñar la lista de hechizos o sus controles.
- Cambiar costes, niveles o el catálogo de hechizos.
- Los otros dos hallazgos del playtest: camino del cursor y ficha del HUD.
