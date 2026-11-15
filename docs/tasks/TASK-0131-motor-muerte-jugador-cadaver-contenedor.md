---
type: Task
id: TASK-0131
title: "Motor: muerte de jugador y cadáver contenedor"
description: "Al morir un jugador, crear un cadáver como `Container` con todo su equipo y mochila, retirarlos de la unidad y conservar la identidad para la resurrección."
status: stable
task_status: done
task_type: feature
requirement: REQ-021
requirement_ids: [R-001, R-009, R-010, T-001]
depends_on: [TASK-0122]
unlocks: [TASK-0132, TASK-0133, TASK-0134, TASK-0136, TASK-0142, TASK-0143, TASK-0147, TASK-0148, TASK-0157]
created_at: 2026-11-14T23:31:45Z
completed_at: 2026-11-15T12:12:00Z
assignee: task-runner
attempts: 1
artifacts: artifacts/TASK-0131/
priority: P1
risk: high
review_required: true
generated: { by: deepseek/v4.1-flash, at: 2026-11-14T23:31:45Z }
verified:
  - by: task-lead
    at: 2026-11-15T12:12:00Z
    note: >-
      Intento 1 verificado (motor `4329e58`, tests `42b5e46`, evidencia
      `5ef0e05`). Diff de 14 archivos limitado a `src/game`, dos líneas de
      `src/host/debug.ts`, tests y artefactos; sin tocar requisitos, arnés,
      alcance, RNG, botín ni dependencias. `pnpm run verify` reejecutado: 101
      archivos/1502 tests, docs:check y config:check con avisos previos, tsc,
      build y bundle OK; 186/186 en los siete archivos de la tarea. Criterios
      1-7 cumplidos: transferencia completa sin tirada, unidad con `hp: 0` e
      identidad, casilla compartida, persistencia al vaciar y snapshot
      serializable. Evidencia en `attempt-1/lead-verify/`.
---

# Objetivo

Que la muerte de un jugador produzca un cadáver contenedor con todos sus objetos,
sin pérdida probabilística, y que la unidad muerta conserve una identidad estable
para la futura resurrección y para la derrota.

# Contexto

REQ-021 v1 convierte el cadáver en estado jugable
([R-001](../requirements/REQ-021-muerte-fantasma-resurreccion.md#requisitos-creativos-decididos)).
REQ-034
[R-009](../requirements/REQ-034-objetos-saqueables-botin-enemigos.md#requisitos-creativos-decididos)
confirma que el cadáver de jugador conserva todo. El modelo actual `Container`
está en `src/game/inventory.ts`; esta tarea lo usa y, si necesita un tipo de
contenedor, lo añade de forma compatible con REQ-020.

# Criterios de aceptación

- [x] La muerte de un jugador crea un `Container` de cadáver en su casilla con
      todo su equipo y mochila, sin tirada ni filtro.
- [x] La unidad pasa a un estado muerto con 0 PV, identidad estable y sin
      objetos; el cadáver queda vinculado a esa unidad.
- [x] El cadáver no bloquea el paso y puede compartir casilla con vivos, otros
      cadáveres o enemigos.
- [x] El cadáver de jugador persiste aunque se vacíe, porque sigue siendo
      objetivo de resurrección.
- [x] El estado y el snapshot exponen el cadáver y la unidad muerta; ambos son
      serializables.
- [x] Si se amplía `Container`, la ampliación es aditiva y se anota el riesgo de
      que REQ-020 cambie el modelo antes de publicar la v1 de guardado.
- [x] Tests de transferencia completa, identidad, casilla compartida y
      serialización; `pnpm run verify` pasa.

# Plan de test

- Unitario: `tests/unit/game/inventory.test.ts` y `engine.test.ts`.
- Integración: muerte con equipo y mochila llenos; ningún objeto desaparece.
- E2E / visual: no aplica; el render es TASK-0135.
- Manual: inspeccionar el snapshot de un jugador muerto.

# Evidencia esperada

- [x] Informe en `artifacts/TASK-0131/attempt-1/report.md`
- [x] Salida de `pnpm run verify`
- [x] Commit SHA

# Comandos

| Comando | Timeout |
|---|---:|
| `pnpm exec vitest run tests/unit/game/inventory.test.ts tests/unit/game/engine.test.ts` | 120 s |
| `pnpm run verify` | 240 s |

# Restricciones

- No implementar el control del fantasma; eso es TASK-0132.
- No implementar resurrección; eso es TASK-0148.
- No cambiar el botín de enemigos ni la saqueabilidad.
- No crear tareas de REQ-020 ni cerrar su modelo.
- Handoff: brief 1,5 KB, informe 2 KB; tope duro 4 KB.

# No objetivos

- Presentación del cadáver, panel o saqueo.
- Derrota por wipe; eso es TASK-0147.
- Guardado del cadáver; se integra en TASK-0138.
- Arte final del cadáver.
