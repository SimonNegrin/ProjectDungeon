---
type: Task
id: TASK-0150
title: "Host: relevo por cámara y paneo"
description: "Al cerrar turno, panoramizar la cámara hasta el siguiente jugador sin confirmación, con bloqueo durante el paneo y soporte de `prefers-reduced-motion`."
status: stable
task_status: done
task_type: feature
requirement: REQ-031
requirement_ids: [R-005, R-010, R-021, R-022, T-006]
depends_on: [TASK-0127, TASK-0146, TASK-0149]
unlocks: [TASK-0151, TASK-0152, TASK-0154, TASK-0155, TASK-0159]
created_at: 2026-11-14T23:31:45Z
completed_at: 2026-11-15T22:18:00Z
assignee: task-runner
attempts: 1
artifacts: artifacts/TASK-0150/
priority: P1
risk: medium
review_required: true
generated: { by: deepseek/v4.1-flash, at: 2026-11-14T23:31:45Z }
verified:
  - by: task-lead
    at: 2026-11-15T22:18:00Z
    note: >-
      Intento 1 verificado (`e8001d6`, evidencia `c24c5c9`). Diff limitado a
      `src/host/{camera-pan,main,debug}.ts`, tests y artefactos; sin motor,
      requisitos, arnés ni dependencias. `pnpm run verify` reejecutado: docs 718,
      107 archivos/1712 tests, config, tsc, build y bundle OK. E2E por specs
      separadas: 36/36 en 8 specs. Criterios 1-7 cumplidos. Evidencia en
      `attempt-1/report.md` y `lead-verify/verification.md`.
---

# Objetivo

Que el control pase al siguiente jugador con un paneo de cámara claro, sin
pulsaciones extra, y que los comandos se liberen justo al llegar.

# Contexto

REQ-031
[R-005](../requirements/REQ-031-hotseat-local.md#requisitos-creativos-decididos)
fija el relevo sin confirmación y
[R-022](../requirements/REQ-031-hotseat-local.md#requisitos-creativos-decididos)
la cámara que sigue al activo. TASK-0127 aporta el render por variante, TASK-0146
el turno y TASK-0149 el bloqueo de input. La duración v1 del paneo es 300 ms.

# Criterios de aceptación

- [x] Al cerrar turno con `N`, el control pasa al siguiente jugador y la cámara
      hace paneo hasta él; no hay Enter ni confirmación.
- [x] Durante el paneo se ignoran los comandos y al terminar se liberan; el
      jugador activo puede actuar.
- [x] En la ronda 1 la cámara aparece directamente en el primer personaje; en
      las siguientes hace paneo.
- [x] Al terminar la fase enemiga, la cámara vuelve al primer jugador de la
      ronda.
- [x] Con un solo jugador no hay paneo de relevo, pero se conserva el flujo.
- [x] Con `prefers-reduced-motion`, el cambio de cámara salta sin animación.
- [x] Tests de objetivo de cámara, bloqueo, ronda 1, un jugador y movimiento
      reducido; `pnpm run verify` pasa.

# Plan de test

- Unitario: `tests/unit/host/camera.test.ts` y `input.test.ts`.
- Integración: dos jugadores, `N`, paneo y comando al llegar.
- E2E: captura del relevo; la suite completa va en TASK-0154.
- Manual: comprobar que el paneo no se siente lento ni bloquea de más.

# Evidencia esperada

- [x] Informe en `artifacts/TASK-0150/attempt-1/report.md`
- [x] Salida de `pnpm run verify`
- [x] Commit SHA

# Comandos

| Comando | Timeout |
|---|---:|
| `pnpm exec vitest run tests/unit/host/camera.test.ts tests/unit/host/input.test.ts` | 120 s |
| `pnpm run verify` | 240 s |

# Restricciones

- No implementar la ficha, «Jugador N de M» ni «Ronda N»; eso es TASK-0151.
- No implementar la fase enemiga ni «El master mueve».
- No cambiar la duración sin decisión de producto.
- Handoff: brief 1,5 KB, informe 2 KB; tope duro 4 KB.

# No objetivos

- Cámara libre, minimapa o pantalla partida.
- Avisos de ronda o de fase enemiga.
- Resultado de partida.
- Cambios de motor.
