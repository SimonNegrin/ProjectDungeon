---
type: Task
id: TASK-0126
title: "Host: resumen, Empezar y estado inicial"
description: "Añadir el resumen de party y semilla en solo lectura y conectar «Empezar» con el constructor único para arrancar la partida con los N jugadores y la semilla mostrada."
status: stable
task_status: done
task_type: feature
requirement: REQ-016
requirement_ids: [R-009, R-010, R-011, T-001, T-002]
depends_on: [TASK-0124, TASK-0125]
unlocks: [TASK-0129, TASK-0139, TASK-0153]
created_at: 2026-11-14T23:31:45Z
completed_at: 2026-11-15T09:55:40Z
assignee: task-runner
attempts: 1
artifacts: artifacts/TASK-0126/
priority: P1
risk: medium
review_required: true
generated: { by: deepseek/v4.1-flash, at: 2026-11-14T23:31:45Z }
verified:
  - by: task-lead
    at: 2026-11-15T09:55:40Z
    note: >-
      Intento 1 verificado (código 887deec y tests 74dbdee; evidencia 18d3336
      y e0ddada). Diff revisado: solo host, HTML/CSS, tests y artefactos; sin
      cambios en motor, roster, dependencias ni docs ajenas. `pnpm run verify`
      reejecutado: 99 archivos/1441 tests, tsc, build y bundle OK; E2E completo
      228/228, incluidos `party-summary`, `player-screen` y `start-screen`.
      Resumen con filas 1..N y semilla de solo lectura, «Atrás» conserva la
      pantalla de jugador, cancelación confirmada al menú y «Empezar» por
      `new GameSession({seed, players})`; el `webServer` quedó cerrado.
      Evidencia en `attempt-1/lead-verify/`.
---

# Objetivo

Que antes de jugar se revise la party completa y la semilla, y que «Empezar»
construya la partida con esos datos exactos usando el constructor único del
motor.

# Contexto

TASK-0124 y TASK-0125 dejan los jugadores configurados. Esta tarea cubre el
[resumen y el arranque](../requirements/REQ-016-pantalla-inicio-configuracion.md#requisitos-creativos-decididos)
R-009, R-010 y R-011, y consume el constructor de TASK-0122. La pausa de
TASK-0139 y el resultado de TASK-0153 vuelven a este paso 1, pero no se
implementan aquí.

# Criterios de aceptación

- [x] El resumen lista la party en orden con número, arquetipo, variante y nombre,
      y muestra la semilla en solo lectura.
- [x] «Atrás» vuelve al último jugador conservando todos los valores; «Cancelar»
      y `Esc` piden confirmación y, al confirmar, descartan la configuración y
      vuelven al menú principal.
- [x] «Empezar» construye el estado inicial con N jugadores, cada uno con su
      arquetipo, variante y nombre, y con la semilla mostrada.
- [x] El host no duplica la construcción del estado ni reinterpreta la
      configuración; si el constructor rechaza los datos, se muestra el error y
      no se arranca.
- [x] La partida arranca en el flujo actual de juego, sin hotseat, guardado ni
      pantalla de resultado.
- [x] Tests de resumen con 1 y 2 jugadores, «Atrás», cancelación y estado inicial
      con la semilla elegida; `pnpm run verify` pasa.

# Plan de test

- Unitario: composición del resumen y llamada al constructor.
- Integración: flujo paso 1 → jugadores → resumen → «Empezar».
- E2E: partida con 2 jugadores; la cobertura completa va en TASK-0129.
- Manual: leer la semilla y comprobar que no es editable.

# Evidencia esperada

- [x] Informe en `artifacts/TASK-0126/attempt-1/report.md`
- [x] Salida de `pnpm run verify`
- [x] Commit SHA

# Comandos

| Comando | Timeout |
|---|---:|
| `pnpm exec vitest run tests/unit/host/session.test.ts tests/unit/game/engine.test.ts` | 120 s |
| `pnpm run verify` | 240 s |

# Restricciones

- No implementar pausa, guardado, carga ni resultado.
- No implementar turno por jugador, relevo ni fase enemiga.
- No duplicar el constructor ni la validación de la configuración.
- Handoff: brief 1,5 KB, informe 2 KB; tope duro 4 KB.
- pnpm, nunca npm ni npx.

# No objetivos

- Cambiar N o la semilla después del paso 1.
- Persistencia de la configuración o de la partida.
- Reordenar la party.
- Ajustar el spawn o el balance por número de jugadores.
