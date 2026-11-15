---
type: Task
id: TASK-0148
title: "Motor: resurrección por índice y recursos"
description: "Permitir resucitar al fantasma en la casilla del cadáver y devolver el turno en la misma ronda si su índice no ha pasado, con recursos restaurados."
status: stable
task_status: in_progress
task_type: feature
requirement: REQ-031
requirement_ids: [R-014, T-003]
depends_on: [TASK-0131, TASK-0134, TASK-0146]
unlocks: [TASK-0154, TASK-0155, TASK-0159]
created_at: 2026-11-14T23:31:45Z
completed_at:
assignee: task-runner
attempts: 0
artifacts: artifacts/TASK-0148/
priority: P1
risk: high
review_required: true
generated: { by: deepseek/v4.1-flash, at: 2026-11-14T23:31:45Z }
verified:
  - by: task-lead
    at: 2026-11-15T20:20:45Z
    note: >-
      Bloqueada en Definition of Ready antes de in_progress: el criterio 1 y el
      plan de test exigen un objeto de resurrección, pero no existe en el
      catálogo, el modelo solo admite arma/escudo/armadura y REQ-018 R-005 y
      REQ-019 lo excluyen; además «No objetivos» prohíbe un objeto nuevo.
      Requiere decisión de requirements-writer sobre el objeto y sobre el
      objetivo unidad/casilla. Detalle en
      `artifacts/TASK-0148/lead-blocked/blocked.md`.
---

# Objetivo

Que resucitar devuelva al personaje vivo en la casilla del cadáver y que su turno
se resuelva según el índice de la ronda, sin dobles turnos ni recursos perdidos.

# Contexto

REQ-031
[R-014](../requirements/REQ-031-hotseat-local.md#requisitos-creativos-decididos)
fija el índice de resurrección y TASK-003 los recursos por turno. La mecánica de
resurrección —lanzador de nivel 4 con 8 de maná como única fuente, adyacencia,
casilla sin vivos y 60 % del PV máximo— está en
[REQ-021](../requirements/REQ-021-muerte-fantasma-resurreccion.md#requisitos-creativos-decididos)
v4, R-008 a R-013, con el objeto de resurrección diferido fuera de este corte.
TASK-0131 crea el cadáver y TASK-0146 el turno.

# Criterios de aceptación

- [ ] El comando apunta a un cadáver concreto y valida un lanzador vivo con nivel
      de magia 4 y 8 de maná; no existe fuente por objeto.
- [ ] Exige lanzador adyacente a la casilla del cadáver y ausencia de vivos en
      esa casilla; el fantasma no cuenta como ocupante.
- [ ] Si es válido, consume 8 de maná y sitúa al resucitado en la casilla del
      cadáver con el 60 % de su PV máximo, redondeado hacia arriba y mínimo 1.
- [ ] Con varios cadáveres en la misma casilla, resucita el elegido y los demás
      quedan intactos.
- [ ] Si el índice del jugador aún no ha pasado en la ronda, actúa en la misma
      ronda; si ya pasó, en la siguiente; no hay doble turno.
- [ ] Los recursos del resucitado se restauran al empezar su turno.
- [ ] Un intento inválido no cambia el estado y no consume maná.
- [ ] Tests de antes/después del índice, casilla ocupada por aliado o enemigo,
      fantasma sobre la casilla, varios cadáveres, nivel o maná insuficiente y PV
      de retorno; `pnpm run verify` pasa.

# Plan de test

- Unitario: `tests/unit/game/magic.test.ts`, `engine.test.ts` y `turn.test.ts`.
- Integración: muerte, resurrección y turno en la misma ronda o en la siguiente.
- E2E / visual: no aplica.
- Manual: `F1` con un fantasma y un lanzador adyacente.

# Evidencia esperada

- [ ] Informe en `artifacts/TASK-0148/attempt-1/report.md`
- [ ] Salida de `pnpm run verify`
- [ ] Commit SHA

# Comandos

| Comando | Timeout |
|---|---:|
| `pnpm exec vitest run tests/unit/game/magic.test.ts tests/unit/game/engine.test.ts tests/unit/game/turn.test.ts` | 120 s |
| `pnpm run verify` | 240 s |

# Restricciones

- No implementar el menú de hechizos ni la presentación.
- No crear objetos ni huecos de equipamiento: el objeto de resurrección está
  diferido (REQ-021, decisión de 2026-11-15).
- No cambiar el coste, el nivel ni el PV de retorno de REQ-021.
- No resucitar enemigos.
- Handoff: brief 1,5 KB, informe 2 KB; tope duro 4 KB.

# No objetivos

- Objeto de resurrección nuevo o arte final.
- Revivir al jugador sin lanzador.
- Cambiar la derrota por wipe.
- HUD del fantasma o del resucitado.

# Notas de verificación

- Bloqueada el 2026-11-15 antes de `in_progress` porque la ficha pedía un objeto
  de resurrección que el catálogo no admite. Ver
  [bloqueo](../../artifacts/TASK-0148/lead-blocked/blocked.md).
- Desbloqueada el 2026-11-15: REQ-021 v4 elimina el objeto como fuente y fija el
  hechizo como única vía; la tarea se queda con el motor ejecutable (comando,
  índice de ronda, recursos) sin crear contenido.
- REQ-020 ya decidió que la resurrección apunte a una unidad, no a una casilla, y
  la enmienda ya está aplicada en REQ-021 R-009; el comando elige cadáver.
