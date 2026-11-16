---
type: Task
id: TASK-0165
title: "Bug: la ficha del HUD derecho usa el equipo del jugador activo"
description: "Con el panel abierto, el bloque «Equipado» del HUD derecho muestra el hueco del primer jugador vivo en vez del jugador activo."
status: stable
task_status: done
task_type: feature
requirement: REQ-023
requirement_ids: [R-009]
depends_on: []
unlocks: []
created_at: 2026-11-16T14:23:01Z
completed_at: 2026-11-16T14:41:17Z
assignee: task-runner
attempts: 1
artifacts: artifacts/TASK-0165/
priority: P1
risk: low
review_required: false
generated: { by: deepseek/v4.1-flash, at: 2026-11-16T14:23:01Z }
verified:
  - by: game-lead
    at: 2026-11-16T14:41:17Z
    note: >-
      Intento 1 verificado (código `9bb71215`, evidencia en el mismo commit). Los
      seis criterios firmados: el test previo muestra «Espada» del primero en vez
      de «Hacha» del activo, pasa 28/28 después, y el E2E de dos jugadores
      confirma el equipo del segundo y que el detalle del cursor no cambia al
      cerrar. `verify` completo y 284 E2E en verde. Detalle en
      `attempt-1/lead-verify/verification.md`.
---

# Objetivo

Que con el panel de inventario abierto la ficha del HUD derecho muestre el
objeto seleccionado y el **equipado en ese hueco por el jugador activo**, en
coherencia con la columna de equipo que pinta el propio panel.

# Contexto

Detectado en playtest por `human:simon`: el arma equipada de la ficha derecha es
siempre la del primer jugador. `src/host/hud-detail.ts` resuelve la unidad por
defecto con `players.find(hp > 0) ?? players[0]` y `src/host/main.ts` llama a
`buildPanelDetail` sin `unitId`; el panel resuelve al activo con
`activePlayer(state)` en `src/host/inventory-panel.ts`. La ficha es
[REQ-023](../requirements/REQ-023-hud-derecho-detalle-cursor.md#requisitos-creativos-decididos)
R-009 y el panel pertenece al activo por
[REQ-031](../requirements/REQ-031-hotseat-local.md#requisitos-creativos-decididos)
R-011.

# Criterios de aceptación

- [x] Test unitario nuevo con dos jugadores, armas distintas y activo en el
      segundo: `buildPanelDetail` sin `unitId` devuelve en «Equipado» el arma del
      segundo; el test falla antes del arreglo.
- [x] El `unitId` explícito sigue teniendo prioridad cuando se pasa.
- [x] Sin activo, la ficha no cae en el primer jugador; mantiene un resultado
      vacío coherente con el panel, que no se abre en ese caso.
- [x] E2E con dos jugadores de armas distintas: abrir el panel en el turno del
      segundo y comprobar que `hud-panel-equipped` muestra su arma y no la del
      primero.
- [x] Al cerrar el panel, el detalle del cursor sigue igual; navegación,
      selección, geometría y textos del panel no cambian.
- [x] Sin cambios en `src/game/**`, reglas, costes ni catálogo; no se debilitan
      tests existentes. `pnpm run verify` y `pnpm run test:e2e` pasan.

# Plan de test

- Unitario: dos jugadores con armas distintas; activo en el segundo; bloque
  equipado y desglose esperados. Caso con `unitId` explícito y caso sin activo.
- Integración: `pnpm run verify`.
- E2E / visual: no aplica captura; el cambio es de contenido, no de aspecto. El
  spec de la QA derecha abre el panel en el turno del segundo y comprueba el
  texto de `hud-panel-equipped` y que el detalle del cursor no cambia al cerrar.
- Manual: opcional; la evidencia funcional va en el DOM y el snapshot.

# Evidencia esperada

- [ ] Informe en `artifacts/TASK-0165/attempt-1/report.md`
- [ ] Salida del test unitario fallando antes del cambio y pasando después
- [ ] Salida de `pnpm run verify` y de `pnpm run test:e2e`
- [ ] Commit SHA

# Restricciones

- La corrección vive en la composición de la ficha; no se toca el panel ni el
  motor.
- Sin capturas: el cambio es de contenido, no de aspecto.
- Sin dependencias nuevas.

# No objetivos

- Rediseñar la ficha de dos bloques.
- Cambiar qué objeto se selecciona o cómo se navega el panel.
- Los otros dos hallazgos del playtest: camino del cursor y menú de hechizos.
