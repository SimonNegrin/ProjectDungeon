---
type: Task
id: TASK-0135
title: "Host/render: cadáveres desde contenedores"
description: "Dibujar y listar cadáveres leyendo contenedores, no unidades muertas; el cadáver aparece al terminar el beat de muerte y el enemigo sin botín no se dibuja."
status: stable
task_status: done
task_type: feature
requirement: REQ-034
requirement_ids: [R-005, R-010, T-005]
depends_on: [TASK-0127, TASK-0133, TASK-0134]
unlocks: [TASK-0136, TASK-0142, TASK-0143, TASK-0157]
created_at: 2026-11-14T23:31:45Z
completed_at: 2026-11-15T12:31:18Z
assignee: task-runner
attempts: 1
artifacts: artifacts/TASK-0135/
priority: P1
risk: medium
review_required: true
generated: { by: deepseek/v4.1-flash, at: 2026-11-14T23:31:45Z }
verified:
  - by: task-lead
    at: 2026-11-15T12:31:18Z
    note: >-
      Intento 1 verificado con corrección de visibilidad por contenedor (código
      `0ea6c4d`, evidencia `d049316`/`533499d`). Diff de 14 archivos limitado a
      `src/host/renderer.ts`, los dos tests unitarios previstos, el spec E2E
      acotado, la ficha y artefactos; sin tocar motor, panel, arte, dependencias,
      requisitos ni arnés. `pnpm run verify` reejecutado: 102 archivos/1548
      tests, docs:check, config:check, tsc, build y bundle OK; focalizados 96/96
      y E2E 1/1. Criterios 1-6 cumplidos: el render itera contenedores
      `kind: 'corpse'`, oculta la marca con `dyingUnitIds`/`effects` hasta
      terminar el beat, dibuja el cadáver de jugador vacío, retira el de enemigo
      con su contenedor, agrupa por tile con `×N` y reutiliza `corpse-22a/b`.
      Evidencia en `attempt-1/lead-verify/`.
---

# Objetivo

Que el mapa dibuje cadáveres solo cuando existe un contenedor con contenido y que
lo haga después del feedback de muerte, de modo que un enemigo sin botín no deje
rastro visual.

# Contexto

TASK-0133 crea y retira contenedores de cadáver. REQ-034
[T-005](../requirements/REQ-034-objetos-saqueables-botin-enemigos.md#requisitos-técnicos)
exige que render y panel lean contenedores, no unidades muertas. La presentación
de muerte y el cadáver de TASK-0121/REQ-017 viven en `src/host/renderer.ts` y
`src/host/presentation.ts`.

# Criterios de aceptación

- [x] El render itera contenedores de cadáver; una unidad muerta sin contenedor
      no se dibuja como cadáver.
- [x] El cadáver aparece al terminar el beat de muerte, no durante la animación.
- [x] El cadáver de jugador se dibuja y persiste aunque se vacíe; el de enemigo
      desaparece con su contenedor.
- [x] Varios cadáveres en la misma casilla se representan sin ocultar la
      información de que hay más de uno.
- [x] No se añaden sprites ni se cambia el decal existente; se reutiliza el
      cadáver de presentación.
- [x] Tests de mapeo contenedor → marca de render y de retirada; `pnpm run
      verify` pasa.

# Plan de test

- Unitario: `tests/unit/host/renderer.test.ts` y
  `presentation-feedback.test.ts`.
- Integración: muerte de enemigo con botín, sin botín y vaciado posterior.
- E2E / visual: captura de mapa con dos cadáveres; la suite completa va en
  TASK-0142.
- Manual: comprobar que no queda un cadáver durante la animación.

# Evidencia esperada

- [x] Informe en `artifacts/TASK-0135/attempt-1/report.md`
- [x] Salida de `pnpm run verify`
- [x] Commit SHA

# Comandos

| Comando | Timeout |
|---|---:|
| `pnpm exec vitest run tests/unit/host/renderer.test.ts tests/unit/host/presentation.test.ts` | 120 s |
| `pnpm run verify` | 240 s |

# Restricciones

- No implementar transferencia, panel ni costes; eso es TASK-0136.
- No cambiar las reglas de botín, muerte o contenedores.
- No tocar el arte ni el pack de sprites.
- Handoff: brief 1,5 KB, informe 2 KB; tope duro 4 KB.

# No objetivos

- Saquear, «coger todo» o anunciar coste.
- Guardado de contenedores.
- Cadáveres decorativos sin contenedor.
- Animación nueva de caída.
