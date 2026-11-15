---
type: Task
id: TASK-0142
title: "QA/E2E de botín y cadáveres"
description: "Cubrir en navegador y en unitarios el botín determinista, los cadáveres solo con saqueables, el saqueo en el mismo tile, el coste 0, el cofre sin cambios y la persistencia en guardado."
status: stable
task_status: done
task_type: qa
requirement: REQ-034
requirement_ids: [R-001, R-002, R-003, R-004, R-005, R-006, R-007, R-008, R-009, R-010, R-011, R-012, T-011]
depends_on: [TASK-0130, TASK-0131, TASK-0132, TASK-0133, TASK-0134, TASK-0135, TASK-0136, TASK-0138, TASK-0141]
unlocks: []
created_at: 2026-11-14T23:31:45Z
completed_at: 2026-11-15T18:30:00Z
assignee: task-runner
attempts: 1
artifacts: artifacts/TASK-0142/
priority: P1
risk: medium
review_required: true
generated: { by: deepseek/v4.1-flash, at: 2026-11-14T23:31:45Z }
verified:
  - by: task-lead
    at: 2026-11-15T18:30:00Z
    note: >-
      Intento 1 verificado (tests `f3db820`, evidencia `5e5160e`; verificación
      `artifacts/TASK-0142/lead-verify/verification.md`). QA sin cambios de
      producción: el diff solo añade `tests/e2e/loot-qa.spec.ts`, artefactos y
      esta ficha. `pnpm run verify` reejecutado: 107 archivos/1678 tests,
      docs:check, config:check, tsc, build y bundle OK; `pnpm run test:e2e`
      251/251 con los 3 tests nuevos. Criterios 1-8 cubiertos con unitarios
      existentes enlazados más E2E de muerte real (sin y con botín), cadáver
      oculto durante el beat comparado con gemelo no saqueable, saqueo desde
      adyacente rechazado y desde el mismo tile con 0 acción/0 MP, retirada del
      contenedor vaciado y round-trip por pausa que conserva `lootable:false`,
      ambos cadáveres y el RNG sin retirada. El cofre conserva 1 acción por
      unitario; su adyacencia no es verificable sin comando de apertura.
      Fricción de rutas de capturas `deferred` a requirements-writer.
---

# Objetivo

Que el puente de botín, muerte, fantasma y estado quede verificado de punta a
punta: qué cae, qué cadáver aparece, cómo se saquea y qué sobrevive a guardar y
cargar.

# Contexto

TASK-0130 a TASK-0136 implementan la saqueabilidad, los cadáveres y el saqueo;
TASK-0141 aporta la carga. Esta tarea mide y reporta; no cambia reglas. Los
defectos vuelven a la tarea propietaria. La cobertura de guardado se apoya en
TASK-0138 y TASK-0140.

# Criterios de aceptación

- [x] Misma semilla y mismas acciones producen el mismo botín; cargar no vuelve a
      tirar y no altera el RNG principal.
- [x] Se comprueban 25 % común y 100 % progresión, y dos objetos del mismo
      enemigo con resultados independientes.
- [x] Un enemigo sin saqueables no deja cadáver; con saqueables, el cadáver
      contiene solo esos objetos y no se dibuja antes del beat de muerte.
- [x] Al coger el último objeto de un cadáver de enemigo, el contenedor
      desaparece; el cadáver de jugador persiste vacío.
- [x] El saqueo exige mismo tile; desde adyacente no se abre. El vivo paga 0
      acción y 0 MP; el fantasma paga una acción por objeto; el cofre sigue
      adyacente y con 1 acción.
- [x] El panel y el render leen contenedores, no unidades muertas; no hay listas
      paralelas.
- [x] Guardar y cargar conservan `lootable` y los contenedores de cadáver.
- [x] Capturas del cadáver, panel y coste; `pnpm run test:e2e` y `pnpm run
      verify` pasan.

# Plan de test

- Unitario: `pnpm run verify` y los tests de TASK-0130 a TASK-0138.
- Integración: muerte, cadáver, saqueo y recarga con la misma semilla.
- E2E / visual: spec de botín con capturas y comprobación del panel.
- Manual: comparar un enemigo con y sin botín.

# Evidencia esperada

- [x] Informe en `artifacts/TASK-0142/attempt-1/report.md`
- [x] Salida de `pnpm run test:e2e` y `pnpm run verify` en
      `artifacts/TASK-0142/attempt-1/{e2e-output.txt,verify-output.txt}`
- [x] Capturas de cadáver, panel y coste en
      `artifacts/TASK-0142/attempt-1/screenshots/`
- [x] Commit SHA `f3db820` (test) y `5e5160e` (evidencia)
- [x] Verificación independiente en
      `artifacts/TASK-0142/lead-verify/verification.md`

# Comandos

| Comando | Timeout |
|---|---:|
| `pnpm run test:e2e` | 240 s |
| `pnpm run verify` | 240 s |

# Restricciones

- No cambiar reglas, UI ni criterios; los defectos vuelven a su tarea.
- No debilitar, borrar ni saltar tests existentes.
- No implementar objetos nuevos, llaves ni cofres cerrados.
- Handoff: brief 1,5 KB, informe 2 KB; tope duro 4 KB.
- pnpm, nunca npm ni npx.

# No objetivos

- QA de hotseat, resultado o pantalla de inicio.
- Rebalancear el 25 % o el pool de botín.
- Probar la migración de formatos ya publicados.
- Arte final del cadáver.
