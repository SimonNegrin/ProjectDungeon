---
type: Task
id: TASK-0154
title: "QA/E2E del hotseat"
description: "Cubrir 2 y 6 jugadores, turno con `N`, relevo, aviso de ronda, recursos por turno, muerte, resurrección, fantasma, fase enemiga, resultado, guardado restringido y carga."
status: stable
task_status: done
task_type: qa
requirement: REQ-031
requirement_ids: [R-001, R-002, R-003, R-004, R-005, R-006, R-007, R-008, R-009, R-010, R-011, R-012, R-013, R-014, R-015, R-016, R-017, R-018, R-019, R-020, R-021, R-022, R-023, R-024, R-025, T-012]
depends_on: [TASK-0139, TASK-0140, TASK-0141, TASK-0146, TASK-0147, TASK-0148, TASK-0149, TASK-0150, TASK-0151, TASK-0152, TASK-0153]
unlocks: []
created_at: 2026-11-14T23:31:45Z
completed_at: 2026-11-16T10:10:00Z
assignee: task-runner
attempts: 1
artifacts: artifacts/TASK-0154/
priority: P1
risk: medium
review_required: true
generated: { by: deepseek/v4.1-flash, at: 2026-11-14T23:31:45Z }
verified:
  - by: game-lead
    at: 2026-11-16T10:10:00Z
    note: >-
      Intento 1 verificado (spec `f3226af`, evidencia `2b9ceeb`). Ocho criterios
      firmados con seis E2E de hotseat, 13 capturas y 282 E2E en total; muerte,
      wipe y resurrección por índice se sostienen con
      `tests/unit/game/turn.test.ts`. Sin defectos de producto y sin tests
      existentes tocados. La validación manual de mesa queda para el playtest.
      Detalle en `attempt-1/lead-verify/verification.md`.
---

# Objetivo

Que el hotseat quede verificado como un solo flujo de 1 a 6 jugadores: turnos,
relevo, avisos, fase enemiga, muerte, resurrección, resultado, guardado y carga.

# Contexto

TASK-0146 a TASK-0153 implementan el modo; TASK-0139 a TASK-0141 aportan pausa,
guardado y carga. Esta tarea mide y reporta; no cambia reglas. Los defectos
vuelven a su tarea. La cobertura de arranque es TASK-0129 y la de botín
TASK-0142.

# Criterios de aceptación

- [x] Partida de 2 jugadores y partida de 6: orden fijo, `N`, relevo por cámara,
      «Ronda N» y «Jugador N de M».
- [x] Una sola fase enemiga por ronda; «El master mueve» solo con acciones; el
      HUD muestra actor y objetivo o «Sin objetivo»; los dormidos se saltan.
- [x] Recursos por turno; muerte del activo, turno siguiente y derrota por wipe;
      resurrección antes y después del índice.
- [x] El fantasma respeta su turno, pasa con `N` y no abre el panel.
- [x] Guardar se desactiva en fase enemiga; cargar devuelve el control al activo;
      el resultado ofrece «Nueva partida» y «Cargar partida».
- [x] No quedan `E` de fin de turno ni `R` de reinicio; la pausa es global.
- [x] Capturas de relevo, ronda, fase enemiga, resultado y carga; `pnpm run
      test:e2e` y `pnpm run verify` pasan.
- [x] No se debilitan, borran ni saltan tests existentes.

# Plan de test

- Unitario: `pnpm run verify`.
- Integración: dos jugadores completo; seis jugadores para orden y HUD.
- E2E / visual: spec de hotseat con capturas de los hitos del flujo.
- Manual: comprobar que la mesa sigue el turno sin explicación externa.

# Evidencia esperada

- [x] Informe en `artifacts/TASK-0154/attempt-1/report.md`
- [x] Salida de `pnpm run test:e2e` y `pnpm run verify`
- [x] Capturas de relevo, ronda, fase enemiga, resultado y carga
- [x] Commit SHA

# Comandos

| Comando | Timeout |
|---|---:|
| `pnpm run test:e2e` | 240 s |
| `pnpm run verify` | 240 s |

# Restricciones

- No cambiar reglas, UI ni criterios; los defectos vuelven a su tarea.
- No debilitar, borrar ni saltar tests existentes.
- No probar red, QR, mandos ni información privada.
- Handoff: brief 1,5 KB, informe 2 KB; tope duro 4 KB.
- pnpm, nunca npm ni npx.

# No objetivos

- QA de botín, guardado o pantalla de inicio.
- Balance con 3-6 jugadores; se valida en playtest.
- Temporizadores de turno.
- Arte final del relevo o del resultado.
