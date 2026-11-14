---
type: Task
id: TASK-0130
title: "Motor: saqueabilidad, lootPolicy y RNG de botín"
description: "Añadir `lootable` por instancia, `lootPolicy` en el catálogo y una tirada determinista derivada de la semilla que no consuma el RNG principal."
status: stable
task_status: backlog
task_type: feature
requirement: REQ-034
requirement_ids: [R-002, R-003, R-008, R-012, T-001, T-002, T-003, T-008]
depends_on: [TASK-0122]
unlocks: [TASK-0133, TASK-0134, TASK-0142, TASK-0143, TASK-0157]
created_at: 2026-11-14T23:31:45Z
completed_at:
assignee: task-runner
attempts: 0
artifacts: artifacts/TASK-0130/
priority: P1
risk: medium
review_required: true
generated: { by: deepseek/v4.1-flash, at: 2026-11-14T23:31:45Z }
verified:
---

# Objetivo

Que cada instancia de objeto sepa si es saqueable desde su creación y que la
decisión de un enemigo sea determinista por semilla, sin alterar el RNG que ya
gobierna mapas y combate.

# Contexto

REQ-034 v1 define la saqueabilidad por objeto en
[R-002](../requirements/REQ-034-objetos-saqueables-botin-enemigos.md#requisitos-creativos-decididos)
y el RNG derivado en
[T-002](../requirements/REQ-034-objetos-saqueables-botin-enemigos.md#requisitos-técnicos).
El catálogo y las instancias viven en `src/game/inventory.ts` y
`src/game/types.ts`; el RNG sembrado en `src/game/rng.ts`. Esta tarea no crea
cadáveres ni toca el render.

# Criterios de aceptación

- [ ] `ItemInstance` gana `lootable: boolean`, fijado al crear la instancia; por
      defecto es `true` para jugador, suelo y cofres.
- [ ] `ItemDefinition` declara `lootPolicy: 'common' | 'progression'`; los
      porcentajes 25 % y 100 % viven en datos, no en el host.
- [ ] Al crear un enemigo se tira por cada instancia de su equipo y mochila; dos
      objetos del mismo enemigo pueden tener resultados distintos.
- [ ] La tirada usa un RNG de botín derivado de la semilla y de una identidad
      estable del enemigo; no consume el RNG principal y no usa `Math.random`.
- [ ] Un objeto de política `progression` nace siempre saqueable; un objeto
      adquirido después conserva la marca que traía.
- [ ] El snapshot de debug expone `lootable`, la política y el resultado de la
      tirada sin duplicar el inventario.
- [ ] Tests de determinismo, 25 %/100 %, independencia por objeto, objetos
      adquiridos y no perturbación del RNG principal; `pnpm run verify` pasa.

# Plan de test

- Unitario: `tests/unit/game/item-catalog.test.ts` e `inventory.test.ts`.
- Integración: crear el mismo enemigo con la misma semilla y comparar marcas;
  comprobar que la secuencia del RNG principal no cambia.
- E2E / visual: no aplica.
- Manual: inspeccionar `F1` con un enemigo de dos objetos.

# Evidencia esperada

- [ ] Informe en `artifacts/TASK-0130/attempt-1/report.md`
- [ ] Salida de `pnpm run verify`
- [ ] Commit SHA

# Comandos

| Comando | Timeout |
|---|---:|
| `pnpm exec vitest run tests/unit/game/inventory.test.ts tests/unit/game/item-catalog.test.ts tests/unit/game/engine.test.ts` | 120 s |
| `pnpm run verify` | 240 s |

# Restricciones

- No crear contenedores de cadáver ni descartar objetos; eso es TASK-0133.
- No tocar el RNG principal, el mapa, el combate ni los tests seeded actuales.
- No añadir objetos, llaves ni piezas de REQ-019 al pool.
- Handoff: brief 1,5 KB, informe 2 KB; tope duro 4 KB.
- pnpm, nunca npm ni npx.

# No objetivos

- Render y panel de cadáveres.
- Saqueo, costes o transferencias.
- Guardado de `lootable`; se integra en TASK-0138.
- Tablas de rareza, oro o consumibles.
