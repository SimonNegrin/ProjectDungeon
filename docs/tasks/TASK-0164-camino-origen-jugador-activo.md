---
type: Task
id: TASK-0164
title: "Bug: el camino del cursor nace del jugador activo"
description: "En hotseat, la previsualización del camino se calcula desde el primer jugador vivo, no desde el jugador activo."
status: stable
task_status: done
task_type: feature
requirement: REQ-004
requirement_ids: [R-002, R-006, R-007, R-013]
depends_on: []
unlocks: []
created_at: 2026-11-16T14:23:01Z
completed_at: 2026-11-16T14:33:01Z
assignee: task-runner
attempts: 1
artifacts: artifacts/TASK-0164/
priority: P1
risk: low
review_required: false
generated: { by: deepseek/v4.1-flash, at: 2026-11-16T14:23:01Z }
verified:
  - by: game-lead
    at: 2026-11-16T14:33:01Z
    note: >-
      Intento 1 verificado (código `2262eef`, evidencia `4aec1a7`). Los seis
      criterios firmados: el test nuevo falla antes del arreglo (coste 10 y
      strongSteps 6 del primer jugador), pasa 18/18 después, y el E2E de dos
      jugadores demuestra que `N` cambia el origen y que `MoveTo` ejecuta el
      mismo camino. `verify` completo y 283 E2E en verde. Detalle en
      `attempt-1/lead-verify/verification.md`.
---

# Objetivo

Que el camino resaltado bajo el cursor se planifique y se dibuje desde el
**jugador activo** en cada turno del hotseat, no desde el primer jugador vivo.
El origen debe cambiar al pasar el turno con `N`, igual que cambian la cámara y
el HUD.

# Contexto

Detectado en playtest por `human:simon`: el origen del trazado queda fijo en el
primer jugador. `src/host/cursor.ts` resuelve la unidad con
`state.players.find((unit) => unit.hp > 0)` y esa lista no representa al activo
cuando hay varios jugadores. El resto del host ya usa `activePlayer(state)` de
`src/game/party.ts` para cámara, HUD e input. La regla del activo está en
[REQ-031](../requirements/REQ-031-hotseat-local.md#requisitos-creativos-decididos)
R-005, R-012 y R-022; el camino es parte de
[REQ-004](../requirements/REQ-004-cursor-seleccion.md#requisitos-creativos-decididos)
R-002, R-006, R-007 y R-013.

# Criterios de aceptación

- [x] Test unitario nuevo con dos jugadores, `activePlayerId` en el segundo y un
      destino alcanzable: `deriveCursorStatus` devuelve un camino y un coste
      calculados desde el segundo; el test falla antes del arreglo.
- [x] `deriveCursorStatus` resuelve al actor con `activePlayer(state)` y no con
      el primer jugador con vida; sin activo se mantiene el estado oculto e
      inválido actual.
- [x] `strongSteps` usa el MP del activo, no el de otro jugador.
- [x] El camino previsualizado coincide con el que ejecuta `MoveTo` para el
      activo, incluido un turno cambiado con `N`.
- [x] Sin cambios en `src/game/**`, en la planificación del camino, en reglas,
      costes ni aspecto del cursor; no se debilitan tests existentes.
- [x] `pnpm run verify` y `pnpm run test:e2e` pasan.

# Plan de test

- Unitario: dos jugadores con caminos distintos; activo en el segundo; camino,
  coste y `strongSteps` esperados desde el segundo. Repetir con el activo en el
  primero para evitar una solución que invierta el error.
- Integración: `pnpm run verify`.
- E2E / visual: no aplica captura; el cambio es funcional y la evidencia queda
  en `cursor.path`. El spec de hotseat comprueba el camino desde el activo tras
  `N` y que el primer paso no es el tile del otro jugador.
- Manual: opcional; la evidencia funcional va en el snapshot.

# Evidencia esperada

- [ ] Informe en `artifacts/TASK-0164/attempt-1/report.md`
- [ ] Salida del test unitario fallando antes del cambio y pasando después
- [ ] Salida de `pnpm run verify` y de `pnpm run test:e2e`
- [ ] Commit SHA

# Restricciones

- La corrección vive en la presentación del host; no se toca la planificación ni
  el motor.
- Sin capturas: no cambia el aspecto, solo el origen del trazado.
- Sin dependencias nuevas.

# No objetivos

- Rediseñar el cursor o el camino.
- Los otros dos hallazgos del playtest: ficha del HUD derecho y menú de
  hechizos, que van en tareas aparte.
