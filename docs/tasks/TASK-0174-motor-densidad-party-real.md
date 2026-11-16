---
type: Task
id: TASK-0174
title: "Motor: densidad por party real y suelo por salas"
description: "El mapa de una partida nueva usa el tamaño real de la party como P y nunca deja una sala no-spawn vacía, con aviso cuando el suelo eleva el total."
status: stable
task_status: ready
task_type: feature
scope: [src/, tests/]
requirement: REQ-012
requirement_ids: [R-006, T-006, T-014, T-015]
depends_on: []
unlocks: [TASK-0175, TASK-0176]
created_at: 2026-11-16T20:07:05Z
completed_at:
assignee: task-runner
attempts: 0
artifacts: artifacts/TASK-0174/
priority: P1
risk: medium
review_required: true
generated: { by: deepseek/v4.1-flash, at: 2026-11-16T20:07:05Z }
verified:
---

# Objetivo

Que el generador denso reciba el tamaño real de la party al crear la partida y que
el total de enemigos respete el suelo de una ficha por sala no-spawn, según
[REQ-012](../requirements/REQ-012-spawn-sala-protegida.md#requisitos-creativos)
[R-006](../requirements/REQ-012-spawn-sala-protegida.md#requisitos-creativos) y
las decisiones de [ADR-034](../decisions/ADR-034-densidad-enemigos-party-real.md).

# Contexto

La fórmula de
[REQ-012 R-006](../requirements/REQ-012-spawn-sala-protegida.md#requisitos-creativos)
ya existía, pero producción generaba sin `numPlayers` y caía en el 6 por defecto:
`createInitialState` reenvía solo `config.options`
(`src/game/engine.ts`), el host crea la sesión sin opciones de mapa
(`src/host/main.ts`, `src/host/party-summary.ts`) y
`placeChamberContents` usa `DEFAULT_PLAYERS = 6`
(`src/game/chambers/core/contents.ts`). El reparto ya emite `warnings` y el
snapshot ya declara el desglose (`src/game/chambers/core/enemies.ts`).

# Criterios de aceptación

- [ ] Con la misma semilla, una partida de 1 jugador y otra de 6 generan totales
      distintos y dentro de 4-6 y 10-12 en un mapa 22×18.
- [ ] `createInitialState` deriva `P` de `players.length`; ningún camino del host
      fija `numPlayers` ni usa el 6 por defecto en producción.
- [ ] El suelo se aplica antes de repartir: con 6 salas no-spawn y total de
      fórmula 4 se colocan 6 fichas, una por sala, y el reparto suma el total
      aplicado.
- [ ] Cuando el suelo eleva el total se emite un aviso con el total de la fórmula,
      el número de salas no-spawn y el total aplicado.
- [ ] La función pura con factores a 0 devuelve el número de salas no-spawn.
- [ ] El snapshot expone el `P` real, el número de salas no-spawn y ambos totales.
- [ ] Cargar una partida guardada conserva el reparto y no regenera enemigos.
- [ ] BSP conserva 4 fichas y sus tests pasan sin cambios.
- [ ] `pnpm run verify` pasa.

# Plan de test

- Unitario: matriz de `N`, `P` y factores en la función de total, incluido el
  suelo y los factores a 0; aviso cuando manda el suelo.
- Integración: creación de estado con 1 y 6 jugadores sobre el generador `growth`;
  snapshot con ambos totales; carga de una partida guardada sin regenerar.
- E2E / visual: no.
- Manual: no.

# Evidencia esperada

- [ ] Informe en `artifacts/TASK-0174/attempt-1/report.md`
- [ ] Salida de `pnpm run verify` en `artifacts/TASK-0174/attempt-1/`
- [ ] Commit SHA

# Restricciones

- No cambiar la fórmula, los factores, la composición 60/20/20 ni el mínimo por
  sala: solo el cableado de `P` y el suelo.
- No tocar BSP ni la UI del host.
- Sin dependencias nuevas; `src/game/` no importa `src/host/`.
- Handoff 2 KB, tope duro 4 KB; pnpm, nunca npm.

# No objetivos

- Panel y export de `EXP-004`: TASK-0175.
- Prueba de extremo a extremo y capturas: TASK-0176.
- Cofres, botín, guardado de formato nuevo o escalado durante la partida.
