---
type: Task
id: TASK-0025
title: "EXP-003: mesa de combate configurable"
description: Construir la mesa de combate con roster editable, presets, duelo simulado por semilla, métricas y exportación de la tabla elegida.
status: stable
task_status: done
task_type: experiment
requirement: REQ-010
requirement_ids: [R-001, R-002, R-003, R-004, R-007, R-008, R-013, T-001, T-008]
depends_on: []
unlocks: []
created_at: 2026-11-08T16:37:43Z
completed_at: 2026-11-08T17:42:51Z
assignee: task-runner
attempts: 1
artifacts: artifacts/TASK-0025/
priority: P1
risk: medium
review_required: true
generated: { by: deepseek/v4.1-flash, at: 2026-11-08T16:37:43Z }
verified:
  - by: task-lead
    at: 2026-11-08T17:08:00Z
    note: >-
      Intento 1 verificado en task/TASK-0025 (implementación 3b6f41c, evidencia
      5253c39): docs:check, verify (426 tests) y test:e2e (55) OK; revisados
      presets, roster, ataque, duelo, export y ?test=1&seed=1017. Playtest de
      human:simon recibido: opción A. Pendiente el registro formal en EXP-003 y
      REQ-010 por requirements-writer; no se marca done.
  - by: task-lead
    at: 2026-11-08T17:42:51Z
    note: >-
      Cierre: decisión A en EXP-003 y REQ-010 v4 `stable` (e220be6); docs:check
      y tasks:board OK; sin cambios en src/ ni tests/ desde 3b6f41c, no se
      repiten verify ni test:e2e (426/55).
---

# Objetivo

Construir [EXP-003](../../experiments/EXP-003-mesa-combate/experiment.md) en
`experiments/EXP-003-mesa-combate/` usando el shell compartido. La página permite
editar un roster de personajes y enemigos, comparar presets, simular ataques y
duelos con una semilla y exportar la tabla elegida. No se implementa combate en
`src/`: solo se construye el banco de pruebas para que el usuario decida los
números de [REQ-010](../requirements/REQ-010-combate-equipo-acierto-defensa.md).

# Criterios de aceptación

- [x] La página `/experiments/EXP-003-mesa-combate/` carga, aparece en
      `experiments/manifest.ts` y en el índice de experimentos.
- [x] El roster permite añadir, duplicar, editar y eliminar combatientes con
      nombre, bando, PV, acierto/daño/defensa base, arma (acierto y daño), escudo
      y armadura.
- [x] Hay presets A (propuesta), B (sin base), C (tanque) y D (letal); cambiar de
      preset actualiza el roster y las métricas.
- [x] El cálculo de un ataque muestra probabilidad de impacto, daño mínimo,
      medio y máximo, y daño esperado por ataque.
- [x] El duelo simulado elige atacante y defensor, ejecuta N duelos con la
      semilla y muestra victorias, turnos medios, PV medios restantes y ataques
      esperados para matar.
- [x] La misma semilla y el mismo roster dan el mismo resultado; no se usa
      `Math.random`.
- [x] `?test=1&seed=...` y `window.__experiment` permiten fijar parámetros,
      ejecutar y leer métricas de forma determinista.
- [x] El panel de decisión exporta un JSON con roster, valores, notas, semilla y
      fecha; el experimento queda listo para el playtest del usuario.
- [x] Tests unitarios de las dos fórmulas (36 combinaciones de impacto, daño con
      mínimo 1, distribución y RNG sembrado) y E2E de carga, presets, roster,
      simulación y exportación.
- [x] `pnpm run verify` y `pnpm run docs:check` pasan; no se debilitan tests
      existentes.

# Plan de test

- Unitario: fórmulas puras, 36 combinaciones, mínimo 1, distribuciones y
  secuencia del RNG con semilla fija.
- Integración: cambio de preset y roster recalcula métricas sin recargar.
- E2E: página, presets, edición de un combatiente, duelo, exportación y modo
  determinista.
- Visual: capturas de A/B/C/D y de una tabla personalizada.
- Manual: el usuario prueba la mesa y decide la tabla; no se marca la tarea
  `done` hasta registrar la decisión.

# Evidencia esperada

- [x] Informe en `artifacts/TASK-0025/attempt-1/report.md`
- [x] Salida de tests y `docs:check`
- [x] Capturas de A/B/C/D y de la tabla personalizada
- [x] JSON de decisión en
      `experiments/EXP-003-mesa-combate/results/decision-2026-11-08T17-18-00Z.json`
- [x] Commit SHA

# Restricciones

- Usar el shell de `experiments/_shell/`; no reimplementar semilla, exportación ni
  controles si el shell ya los cubre.
- Sin imports desde `experiments/` a producción ni de producción a
  `experiments/`; sin dependencias nuevas; sin `Math.random`.
- La página no decide por el usuario: presenta opciones y mide.
- Timebox: si una métrica no ayuda a elegir, se recorta.

# No objetivos

- Implementar el combate en `src/game/`.
- Cambiar `REQ-010`, `REQ-009`, ADR o el alcance.
- Críticos, ataques a distancia, inventario completo, loot o arte final.
- Marcar la decisión en nombre del usuario.

# Playtest y cierre

`task-lead` verificó `3b6f41c`/`5253c39`: `verify` (426 tests) y `test:e2e` (55)
pasan. `human:simon` eligió **A · Propuesta** (semilla 1017, 1.000 duelos); la
siente fácil en duelos singulares. La idea de cooperativo queda fuera de EXP-003
y REQ-010.

- Comentario: `artifacts/TASK-0025/attempt-1/playtest.md`.
- JSON: `experiments/EXP-003-mesa-combate/results/decision-2026-11-08T17-18-00Z.json`.

# Handoff para task-lead

- Estado: `review`; no reimplementar. Decisión A registrada en
  [EXP-003](../../experiments/EXP-003-mesa-combate/experiment.md) y
  [REQ-010](../requirements/REQ-010-combate-equipo-acierto-defensa.md) v4
  `stable`; `REQ-009` solo cambia la huida.
- Cerrar: comprobar el diff documental, ejecutar `pnpm run docs:check` y
  `pnpm run tasks:board`, y marcar `done` con `completed_at`.
- Desbloquea `TASK-0026` (`ready`); `TASK-0027` a `TASK-0030` en `backlog`.

# Cierre

**A · Propuesta** (semilla `1017`, 1.000 duelos) en
[EXP-003](../../experiments/EXP-003-mesa-combate/experiment.md) y `REQ-010` v4
`stable`. TASK-0025 `done` en `2026-11-08T17:42:51Z`; `docs:check` y
`tasks:board` OK. Desbloquea `TASK-0026`.
