---
type: Task
id: TASK-0090
title: "Verificación: matriz de tipos, regresión y coste por ataque"
description: "Cubrir con tests la matriz de bandas, paquetes, armas y hechizos, comprobar la no regresión de REQ-010, REQ-014, REQ-025 y REQ-027 y medir el coste de un ataque de dos paquetes."
status: stable
task_status: backlog
task_type: test
requirement: REQ-029
requirement_ids: [T-009, T-012]
depends_on: [TASK-0086, TASK-0087, TASK-0088]
unlocks: [TASK-0091]
created_at: 2026-11-13T12:30:00Z
completed_at:
assignee: task-runner
attempts: 0
artifacts: artifacts/TASK-0090/
priority: P1
risk: medium
review_required: true
generated: { by: deepseek/v4.1-flash, at: 2026-11-13T12:30:00Z }
verified:
---

# Objetivo

Que la matriz de reglas de REQ-029 quede cubierta por tests que lean del
catálogo, que las reglas de combate, atributos, magia y réplica no hayan
retrocedido y que el coste de un ataque de dos paquetes esté medido y registrado.

# Contexto

- Núcleo en TASK-0085; perfiles en TASK-0086; armas en TASK-0087; desglose en
  TASK-0088.
- Tests actuales: `tests/unit/game/combat.test.ts`, `magic.test.ts`,
  `equipment.test.ts`, `roster.test.ts`, `bestiary.test.ts` y `engine.test.ts`.
- [REQ-029](../requirements/REQ-029-tipos-dano-resistencias.md#requisitos-técnicos)
  T-009 y T-012; [REQ-015](../requirements/REQ-015-roster-arquetipos.md) para el
  método de balance por propiedades.

# Criterios de aceptación

- [ ] Hay tests para cada banda, armadura solo física, fuerza solo física, ataque
      con paquete físico y elemental, recorte a 0, mínimo 1 global, máximo de
      paquetes y validación del catálogo.
- [ ] Hay tests de hechizo eléctrico y de fuego (banda correcta), curación sin
      paquete y nivel de magia que no cambia el tipo ni el daño.
- [ ] El determinismo se comprueba con la misma semilla y comandos; el desglose y
      la secuencia del RNG coinciden.
- [ ] Los tests de balance comprueban propiedades y leen del catálogo; cambiar una
      banda o una cantidad no obliga a reescribir fórmulas de test.
- [ ] La no regresión de `REQ-010` (impacto y escudo), `REQ-014` (nueve
      atributos), `REQ-025` (maná, acceso y tope) y `REQ-027` (réplica) queda
      cubierta; no se borran, saltan ni debilitan tests.
- [ ] El coste de un ataque de dos paquetes se mide antes y después: dos tiradas
      de daño y dos de resistencia como máximo; el objetivo de 60 fps no se
      degrada y la medición queda en el informe.
- [ ] `pnpm run verify` pasa; cualquier defecto encontrado se corrige en el
      alcance del motor o se reporta como bloqueo, sin relajar el test.

# Plan de test

- Unitario: matriz completa de T-009 y propiedades de balance.
- Integración: ataque, réplica y hechizo con el mismo resolvedor y el mismo
  desglose; escenario de dos paquetes con semilla fija.
- E2E / visual: no aplica; el QA de navegador llega en TASK-0092.
- Manual: revisar el informe de coste y la tabla de casos cubiertos.

# Evidencia esperada

- [ ] Informe en `artifacts/TASK-0090/attempt-1/report.md`
- [ ] Salida de `pnpm run verify` y de los tests focalizados
- [ ] Medición de coste con el comando y la semilla usados
- [ ] Commit SHA en la rama `task/TASK-0090`

# Restricciones

- No cambiar criterios, perfiles, armas ni fórmulas para hacer pasar un test.
- No añadir dependencias ni herramientas de medición nuevas.
- No duplicar la lógica del resolvedor dentro de los tests.
- Sin tests condicionales, saltados o borrados.

# No objetivos

- QA visual y E2E (TASK-0092).
- Documentación de diseño (TASK-0091).
- Rebalanceo de valores; los perfiles y armas v1 son estimados.
