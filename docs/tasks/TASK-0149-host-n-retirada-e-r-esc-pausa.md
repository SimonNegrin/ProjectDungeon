---
type: Task
id: TASK-0149
title: "Host: N, retirada de E/R, Esc pausa y bloqueo"
description: "Mapear `N` a fin de turno, retirar `E` y `R`, abrir la pausa con `Esc` y bloquear comandos solo durante paneos y animaciones."
status: stable
task_status: backlog
task_type: feature
requirement: REQ-031
requirement_ids: [R-005, R-012, R-023, T-007]
depends_on: [TASK-0139, TASK-0146]
unlocks: [TASK-0150, TASK-0154, TASK-0155, TASK-0159]
created_at: 2026-11-14T23:31:45Z
completed_at:
assignee: task-runner
attempts: 0
artifacts: artifacts/TASK-0149/
priority: P1
risk: low
review_required: true
generated: { by: deepseek/v4.1-flash, at: 2026-11-14T23:31:45Z }
verified:
---

# Objetivo

Que el teclado use `N` para cerrar el turno, `Esc` para la pausa y no queden `E`
ni `R`, sin bloquear al jugador más allá de paneos y animaciones.

# Contexto

REQ-031
[R-023](../requirements/REQ-031-hotseat-local.md#requisitos-creativos-decididos)
sustituye `E` por `N` y retira `R`; TASK-007 fija el input y el bloqueo. TASK-0139
aporta la pausa y TASK-0146 el `EndTurn` del motor. La cámara y el relevo son
TASK-0150.

# Criterios de aceptación

- [ ] `N` se mapea a `EndTurn` en todo el juego y `Esc` a la pausa global.
- [ ] `E` deja de cerrar la fase/turno y `R` deja de reiniciar; no quedan en la
      ayuda de controles ni en tests vigentes.
- [ ] Solo se aceptan comandos del jugador activo; no hay teclas por jugador ni
      mapeo individual.
- [ ] Los comandos se bloquean durante paneos y animaciones y se liberan al
      terminar; el aviso de ronda no bloquea.
- [ ] Con el panel abierto, el primer `Esc` cierra el panel antes de pausar.
- [ ] La ayuda de controles se genera desde el mapa único de teclas y no deriva.
- [ ] Tests de teclas, bloqueo durante paneo, libertad durante el aviso y
      ausencia de `E`/`R`; `pnpm run verify` pasa.

# Plan de test

- Unitario: `tests/unit/host/input.test.ts`.
- Integración: `N` con un jugador y con dos; `Esc` con y sin panel.
- E2E: recorrido de teclado; la suite completa va en TASK-0154.
- Manual: abrir la lista de controles y comprobar `N` y `Esc`.

# Evidencia esperada

- [ ] Informe en `artifacts/TASK-0149/attempt-1/report.md`
- [ ] Salida de `pnpm run verify`
- [ ] Commit SHA

# Comandos

| Comando | Timeout |
|---|---:|
| `pnpm exec vitest run tests/unit/host/input.test.ts` | 120 s |
| `pnpm run verify` | 240 s |

# Restricciones

- No implementar cámara, paneo ni HUD.
- No cambiar el `EndTurn` del motor ni la pausa.
- No añadir remapeo, mandos ni perfiles.
- Handoff: brief 1,5 KB, informe 2 KB; tope duro 4 KB.

# No objetivos

- Relevo por cámara y aviso de ronda.
- Fase enemiga y HUD contextual.
- Resultado de partida.
- Atajos nuevos.
