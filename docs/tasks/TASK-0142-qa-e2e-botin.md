---
type: Task
id: TASK-0142
title: "QA/E2E de botín y cadáveres"
description: "Cubrir en navegador y en unitarios el botín determinista, los cadáveres solo con saqueables, el saqueo en el mismo tile, el coste 0, el cofre sin cambios y la persistencia en guardado."
status: stable
task_status: backlog
task_type: qa
requirement: REQ-034
requirement_ids: [R-001, R-002, R-003, R-004, R-005, R-006, R-007, R-008, R-009, R-010, R-011, R-012, T-011]
depends_on: [TASK-0130, TASK-0131, TASK-0132, TASK-0133, TASK-0134, TASK-0135, TASK-0136, TASK-0138, TASK-0141]
unlocks: []
created_at: 2026-11-14T23:31:45Z
completed_at:
assignee: task-runner
attempts: 0
artifacts: artifacts/TASK-0142/
priority: P1
risk: medium
review_required: true
generated: { by: deepseek/v4.1-flash, at: 2026-11-14T23:31:45Z }
verified:
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

- [ ] Misma semilla y mismas acciones producen el mismo botín; cargar no vuelve a
      tirar y no altera el RNG principal.
- [ ] Se comprueban 25 % común y 100 % progresión, y dos objetos del mismo
      enemigo con resultados independientes.
- [ ] Un enemigo sin saqueables no deja cadáver; con saqueables, el cadáver
      contiene solo esos objetos y no se dibuja antes del beat de muerte.
- [ ] Al coger el último objeto de un cadáver de enemigo, el contenedor
      desaparece; el cadáver de jugador persiste vacío.
- [ ] El saqueo exige mismo tile; desde adyacente no se abre. El vivo paga 0
      acción y 0 MP; el fantasma paga una acción por objeto; el cofre sigue
      adyacente y con 1 acción.
- [ ] El panel y el render leen contenedores, no unidades muertas; no hay listas
      paralelas.
- [ ] Guardar y cargar conservan `lootable` y los contenedores de cadáver.
- [ ] Capturas del cadáver, panel y coste; `pnpm run test:e2e` y `pnpm run
      verify` pasan.

# Plan de test

- Unitario: `pnpm run verify` y los tests de TASK-0130 a TASK-0138.
- Integración: muerte, cadáver, saqueo y recarga con la misma semilla.
- E2E / visual: spec de botín con capturas y comprobación del panel.
- Manual: comparar un enemigo con y sin botín.

# Evidencia esperada

- [ ] Informe en `artifacts/TASK-0142/attempt-1/report.md`
- [ ] Salida de `pnpm run test:e2e` y `pnpm run verify`
- [ ] Capturas de cadáver, panel y coste
- [ ] Commit SHA

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
