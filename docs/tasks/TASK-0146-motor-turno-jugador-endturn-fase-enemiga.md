---
type: Task
id: TASK-0146
title: "Motor: turno por jugador, EndTurn, fase enemiga y ronda"
description: "Implementar el turno por jugador con `EndTurn`, recursos al empezar el turno, avance de índice, fase enemiga determinista y cierre de ronda."
status: stable
task_status: done
task_type: feature
requirement: REQ-031
requirement_ids: [R-002, R-003, R-004, R-016, T-002, T-003, T-004]
depends_on: [TASK-0132, TASK-0134]
unlocks: [TASK-0147, TASK-0148, TASK-0149, TASK-0150, TASK-0151, TASK-0152, TASK-0153, TASK-0154, TASK-0155, TASK-0159]
created_at: 2026-11-14T23:31:45Z
completed_at: 2026-11-15T20:06:18Z
assignee: task-runner
attempts: 1
artifacts: artifacts/TASK-0146/
priority: P1
risk: high
review_required: true
generated: { by: deepseek/v4.1-flash, at: 2026-11-14T23:31:45Z }
verified:
  - by: task-lead
    at: 2026-11-15T20:06:18Z
    note: >-
      Intento 1 verificado (motor `68d6de7`, evidencia `4b3f026`). Diff de 16
      archivos limitado a `src/game/`, tests y artefactos; sin tocar host,
      requisitos, arnés, dependencias, IA, combate, costes, RNG, botín, mapa ni
      bestiario. `pnpm run verify` reejecutado: 107 archivos/1688 tests, docs 703,
      config, tsc, build y bundle OK; focalizados 71/71. E2E de turnos, combate,
      cursor, guardado/carga, HUD de fantasma y loop de input: 37/37. La suite
      E2E completa excede el timeout de 180 s; el único fallo en paralelo
      (`game-input-hud`) pasa aislado. Criterios 1-8 cumplidos. Evidencia en
      `attempt-1/lead-verify/verification.md`.
---

# Objetivo

Que los jugadores actúen en orden fijo, cierren su turno con `EndTurn` y que tras
el último se ejecute una única fase enemiga por ronda antes de volver al primer
jugador.

# Contexto

TASK-0132 deja el fantasma y TASK-0134 el estado con activo y ronda. REQ-031
[T-002 a T-004](../requirements/REQ-031-hotseat-local.md#requisitos-técnicos)
define `EndTurn`, recursos por turno y fase enemiga. El host de cámara y HUD es
TASK-0150 a TASK-0152; aquí solo vive el motor.

# Criterios de aceptación

- [x] `EndTurn` valida que la unidad sea la activa, cierra su turno y avanza el
      índice; tras el último lanza la fase enemiga.
- [x] MP, acciones, maná y cupo de hechizos se restauran al empezar el turno de
      cada jugador, no todos al inicio de la fase.
- [x] El turno no termina solo al agotar recursos; `EndTurn` lo cierra en
      cualquier momento y no hay temporizador.
- [x] Los comandos de unidades no activas se rechazan sin cambios de estado.
- [x] La fase enemiga expone por enemigo el actor, su objetivo y si espera o
      actúa, en orden determinista; solo hay una por ronda.
- [x] Al terminar el último enemigo, el activo vuelve al primer jugador y la
      ronda avanza.
- [x] El fantasma respeta su índice y puede pasar con `EndTurn`.
- [x] Tests de 2 y 6 jugadores, activo inválido, transición a enemiga, recursos,
      orden enemigo y cierre de ronda; `pnpm run verify` pasa.

# Plan de test

- Unitario: `tests/unit/game/turn.test.ts` y `engine.test.ts`.
- Integración: dos jugadores, `N`, fase enemiga y vuelta a ronda 2.
- E2E / visual: no aplica.
- Manual: `F1` con activo, ronda y actor enemigo.

# Evidencia esperada

- [x] Informe en `artifacts/TASK-0146/attempt-1/report.md`
- [x] Salida de `pnpm run verify`
- [x] Commit SHA

# Comandos

| Comando | Timeout |
|---|---:|
| `pnpm exec vitest run tests/unit/game/turn.test.ts tests/unit/game/engine.test.ts` | 120 s |
| `pnpm run verify` | 240 s |

# Restricciones

- No implementar cámara, HUD, avisos ni input del host.
- No implementar resurrección; eso es TASK-0148.
- No cambiar la economía de acciones ni las fórmulas de combate.
- Handoff: brief 1,5 KB, informe 2 KB; tope duro 4 KB.

# No objetivos

- Relevo por cámara, «Ronda N» o «El master mueve».
- Resultado de partida.
- IA enemiga nueva o cambio de bestiario.
- Temporizadores de turno.

# Notas de verificación

- `F1` muestra ya activo y ronda desde TASK-0134; el actor enemigo y su objetivo
  en `F1`/snapshot quedan en el host de TASK-0152, que consume `enemyPhase`.
- `src/host/input.ts` aún elige al primer vivo y `GameSession.dispatch` aún no
  propaga `enemyPhase`: son los enlaces de TASK-0149 y TASK-0152.
- ADR-029, glosario y documentos de diseño de hotseat quedan en TASK-0155.
