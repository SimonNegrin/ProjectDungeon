---
type: Task
id: TASK-0149
title: "Host: N, retirada de E/R, Esc pausa y bloqueo"
description: "Mapear `N` a fin de turno, retirar `E` y `R`, abrir la pausa con `Esc` y bloquear comandos solo durante paneos y animaciones."
status: stable
task_status: done
task_type: feature
requirement: REQ-031
requirement_ids: [R-005, R-012, R-023, T-007]
depends_on: [TASK-0139, TASK-0146]
unlocks: [TASK-0150, TASK-0154, TASK-0155, TASK-0159]
created_at: 2026-11-14T23:31:45Z
completed_at: 2026-11-15T21:58:55Z
assignee: task-runner
attempts: 2
artifacts: artifacts/TASK-0149/
priority: P1
risk: low
review_required: true
generated: { by: deepseek/v4.1-flash, at: 2026-11-14T23:31:45Z }
verified:
  - by: task-lead
    at: 2026-11-15T21:58:55Z
    note: >-
      Intentos 1 (`d580f3b`, evidencia `eda22a8`) y 2 (`9d18627`, evidencia
      `32b2487`) verificados. Diff limitado a `src/host/{keymap,input,main,hud}.ts`,
      tests y artefactos; sin motor, pausa, requisitos, arnés ni dependencias.
      `pnpm run verify` reejecutado: 107 archivos/1704 tests, docs 714, config,
      tsc, build y bundle OK. E2E por specs separadas: 61/61 en 12 specs,
      incluida la prueba del banner no bloqueante y las de hechizos. Criterios
      1-7 cumplidos. Evidencia en `attempt-2/report.md` y
      `lead-verify/verification.md`.
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

- [x] `N` se mapea a `EndTurn` en todo el juego y `Esc` a la pausa global.
- [x] `E` deja de cerrar la fase/turno y `R` deja de reiniciar; no quedan en la
      ayuda de controles ni en tests vigentes.
- [x] Solo se aceptan comandos del jugador activo; no hay teclas por jugador ni
      mapeo individual.
- [x] Los comandos se bloquean durante paneos y animaciones y se liberan al
      terminar; el aviso de ronda no bloquea.
- [x] Con el panel abierto, el primer `Esc` cierra el panel antes de pausar.
- [x] La ayuda de controles se genera desde el mapa único de teclas y no deriva.
- [x] Tests de teclas, bloqueo durante paneo, libertad durante el aviso y
      ausencia de `E`/`R`; `pnpm run verify` pasa.

# Plan de test

- Unitario: `tests/unit/host/input.test.ts`.
- Integración: `N` con un jugador y con dos; `Esc` con y sin panel.
- E2E: recorrido de teclado; la suite completa va en TASK-0154.
- Manual: abrir la lista de controles y comprobar `N` y `Esc`.

# Evidencia esperada

- [x] Informe en `artifacts/TASK-0149/attempt-2/report.md`
- [x] Salida de `pnpm run verify`
- [x] Commit SHA

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

# Notas de verificación

- El intento 2 corrige tres huecos del intento 1: prueba del banner `TU TURNO`
  visible con input libre, integración de `N` con dos jugadores y `Q` limitado al
  activo vivo (el motor rechaza lanzar con un muerto).
- El paneo real no existe hasta TASK-0150; `main.ts` pasa `panning: false` y el
  gate queda cubierto con `panning: true/false` en unitarios.
- La suite E2E completa no se ejecutó (excede 180 s); se corrieron por separado
  las 12 specs afectadas o sensibles: 61/61.
- El informe del intento 2 tenía el `description` del frontmatter sin comillas y
  se escribió después de `verify`; el lead corrigió el YAML y reejecutó la
  verificación. No se cambió el contenido del informe.
- `docs/design/turn-economy.md` aún menciona `E`: su actualización es TASK-0155,
  no de esta tarea.
