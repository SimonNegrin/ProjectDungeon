---
type: Task
id: TASK-0034
title: "Motor: percepción, línea de visión, detección por paso y memoria"
description: Añadir un módulo puro de percepción con visión 360° y línea de visión, estados dormido/alerta/regreso, detección tras cada paso y memoria de la última posición, expuesto en el snapshot.
status: stable
task_status: ready
task_type: feature
requirement: REQ-009
requirement_ids: [R-001, R-002, R-003, R-004, R-005, R-007, T-001, T-002, T-003, T-008, T-009, T-010, T-011]
depends_on: []
unlocks: [TASK-0035, TASK-0036]
created_at: 2026-11-08T20:31:53Z
completed_at:
assignee: task-runner
attempts: 0
artifacts: artifacts/TASK-0034/
priority: P1
risk: high
review_required: true
generated: { by: deepseek/v4.1-flash, at: 2026-11-08T20:31:53Z }
verified:
---

# Objetivo

Que `src/game/` tenga un módulo de percepción puro y determinista que decida qué
enemigo ve a qué jugador, guarde la última posición conocida y gestiona los
estados dormido, alerta y regreso, según
[REQ-009](../requirements/REQ-009-percepcion-alarma-huida.md#requisitos-creativos)
R-001 a R-005 y R-007. La alarma, la huida y la colocación de 4 enemigos
pertenecen a las tareas siguientes.

# Contexto

- Puntos de partida: `src/game/ai.ts`, `types.ts`, `engine.ts` y `turn.ts`;
  tests en `tests/unit/game/ai.test.ts`, `engine.test.ts` y `turn.test.ts`.
- La partida sigue con un solo enemigo en esta tarea; la colocación llega en
  `TASK-0036`.
- No se implementan alarma, huida ni feedback del host.

# Criterios de aceptación

- [ ] La visión es de 360° y usa Bresenham: los muros bloquean y las unidades
      no; cada tipo usa su radio del bestiario (6/4/5).
- [ ] La detección se evalúa tras cada paso aceptado de `Move` y `MoveTo`, no
      solo al cerrar el turno; no consume MP ni acción y emite un evento con el
      paso y el `unitId`.
- [ ] `Unit` incorpora `awareness` (`dormant` / `alert` / `returning`),
      `fleeing`, `home`, `lastKnown`, `alertTurns` y `hasShouted`; es
      serializable y `window.__game.snapshot()` lo expone en solo lectura.
- [ ] Un enemigo dormido no se mueve ni ataca. Al ver a un jugador pasa a
      alerta, guarda `lastKnown` y reinicia `alertTurns`.
- [ ] Sin visión, investiga hasta 2 fases enemigas y en la tercera vuelve a
      `home`; si no llega, sigue volviendo sin atacar; al llegar queda dormido.
- [ ] Una nueva visión reinicia la memoria y el contador; recibir daño también
      lo reinicia y devuelve a alerta (la reacción de alarma es de `TASK-0035`).
- [ ] Misma semilla, estado y entradas producen los mismos eventos y posiciones;
      no se usa `Math.random`.
- [ ] `pnpm run verify` pasa; sin dependencias nuevas; `src/game/` no conoce
      DOM, Canvas, red ni relojes.

# Plan de test

- **Unitario:** línea de visión con muro, alineación y unidades; radios por tipo;
  detección por paso; memoria, investigación y regreso; serialización y
  determinismo.
- **Integración:** un `MoveTo` que cruza la vista y termina tras un muro; estado
  conservado entre turnos; el enemigo no se mueve dormido.
- **Regresión:** tests existentes de IA, turnos y movimientos sin cambios de
  intención; no se borran, saltan ni debilitan.
- **E2E / visual:** no en esta tarea.

# Evidencia esperada

- [ ] Informe en `artifacts/TASK-0034/attempt-1/report.md`.
- [ ] Salidas de tests y `verify` en `attempt-1/`.
- [ ] Commit SHA en la rama `task/TASK-0034`.

# Comandos

| Comando | Timeout |
|---|---:|
| `pnpm exec vitest run tests/unit/game/ai.test.ts tests/unit/game/engine.test.ts tests/unit/game/turn.test.ts` | 120 s |
| `pnpm run verify` | 180 s |
| `git diff --stat` | 15 s |

# Restricciones

- No implementar la onda de alarma, el despertar por daño ni la huida.
- No colocar 4 enemigos ni tocar el host.
- No cambiar valores de combate ni economía de turno.
- No tocar `src/host/`, `index.html`, `public/`, `experiments/` ni dependencias.

# No objetivos

- Alarma y daño (`TASK-0035`), colocación (`TASK-0036`), IA de alerta y huida
  (`TASK-0037`), feedback del host (`TASK-0038`) y E2E/QA (`TASK-0039`).
- Percepción por cono, oído, ruido, sigilo o patrullas.
