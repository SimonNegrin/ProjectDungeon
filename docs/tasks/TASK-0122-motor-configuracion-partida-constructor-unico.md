---
type: Task
id: TASK-0122
title: "Motor: configuración de partida y constructor único"
description: "Añadir al motor un contrato serializable de configuración (semilla y N jugadores ordenados) y un único constructor del estado inicial que consuman el shell, el hotseat y la carga."
status: stable
task_status: done
task_type: feature
requirement: REQ-016
requirement_ids: [R-003, R-010, R-013, T-001, T-002]
depends_on: []
unlocks: [TASK-0123, TASK-0124, TASK-0125, TASK-0127, TASK-0130, TASK-0131, TASK-0134]
created_at: 2026-11-14T23:31:45Z
completed_at: 2026-11-14T23:58:00Z
assignee: task-runner
attempts: 1
artifacts: artifacts/TASK-0122/
priority: P1
risk: medium
review_required: true
generated: { by: deepseek/v4.1-flash, at: 2026-11-14T23:31:45Z }
verified:
  - by: task-lead
    at: 2026-11-14T23:58:00Z
    note: >-
      Intento 1 verificado (código `0c4ee7c`, tests `1b75673`; informe
      `46a1602`). Diff revisado: 18 archivos, solo motor, host de sesión/arranque/
      snapshot, tests y artefactos; sin cambios de fórmulas, roster, balance,
      `Container`, render ni dependencias. `pnpm run verify` reejecutado: la
      primera pasada falló solo por el timeout conocido de EXP-004 y la segunda
      pasó 94 archivos/1344 tests, tsc, build y bundle; EXP-004 aislado 20/20.
      Criterios 1-7 cumplidos; E2E/visual no aplica. Evidencia en
      `attempt-1/lead-verify/`.
---

# Objetivo

Que el motor reciba una configuración de partida explícita —semilla y de 1 a 6
jugadores con arquetipo, variante y nombre, en orden— y construya el estado
inicial con un único constructor, sin que el host, el hotseat o la carga
dupliquen esa lógica.

# Contexto

Hoy `createInitialState` arranca un solo jugador desde valores fijos del host.
REQ-016 v3 separa la pantalla del motor y exige un contrato serializable
([T-001 y T-002](../requirements/REQ-016-pantalla-inicio-configuracion.md#requisitos-técnicos)).
La configuración es la entrada común de TASK-0123 a TASK-0127, TASK-0134 y del
guardado de REQ-024. Módulos de referencia: `src/game/types.ts`,
`src/game/engine.ts`, `src/game/roster.ts` y `src/host/session.ts`.

# Criterios de aceptación

- [x] Existe un tipo de configuración de partida con semilla y una lista ordenada
      de jugadores; cada jugador guarda arquetipo, variante `1|2` y nombre.
- [x] La configuración y la lista de jugadores son serializables y se exponen en
      el snapshot; el orden se conserva como orden de turno 1..N.
- [x] Un único constructor produce el estado inicial desde esa configuración y
      sustituye la construcción fija actual; no queda una segunda ruta en el
      host, en tests de integración ni en el arranque.
- [x] El constructor valida N entre 1 y 6, arquetipo existente, variante válida y
      semilla; una configuración inválida se rechaza con error tipado y sin
      estado parcial.
- [x] Un nombre vacío se resuelve con el nombre del arquetipo en el estado
      inicial; el resto de nombres se guarda tal cual llega del shell.
- [x] El motor sigue sin DOM y sin depender de `src/host/`; los tests actuales de
      un jugador se adaptan sin debilitar su intención.
- [x] `pnpm run verify` pasa.

# Plan de test

- Unitario: N=1 y N=6, orden, semilla, nombre vacío, configuración inválida y
  serialización.
- Integración: el arranque del host usa el constructor único; no hay diferencias
  de estado entre llamadas equivalentes.
- E2E / visual: no aplica.
- Manual: inspeccionar el snapshot de `F1` con dos jugadores.

# Evidencia esperada

- [x] Informe en `artifacts/TASK-0122/attempt-1/report.md`
- [x] Salida de `pnpm run verify`
- [x] Commit SHA

# Comandos

| Comando | Timeout |
|---|---:|
| `pnpm exec vitest run tests/unit/game/engine.test.ts tests/unit/game/integration.test.ts` | 120 s |
| `pnpm run verify` | 240 s |

# Restricciones

- No implementar pantallas, menús, guardado ni turnos de hotseat.
- No cambiar fórmulas, balance, roster ni valores de arquetipos.
- No tocar el modelo de `Container` ni crear tareas de REQ-020.
- Handoff: brief 1,5 KB, informe 2 KB; tope duro 4 KB.
- pnpm, nunca npm ni npx; timeout como parámetro de la herramienta de shell.

# No objetivos

- Menú principal, paso 1, resumen y navegación de REQ-016.
- Guardado, carga y esquema de archivo de REQ-024.
- Turno por jugador, fase enemiga y relevo de REQ-031.
- Spawn escalado por número de jugadores.
