---
type: Task
id: TASK-0088
title: "Motor: desglose por paquete en eventos de ataque, réplica y hechizo"
description: "Ampliar AttackPerformed, ReplicaPerformed y SpellCast con el desglose de cada paquete y conservar el daño total, para que el host explique el resultado sin recalcular reglas."
status: stable
task_status: backlog
task_type: feature
requirement: REQ-029
requirement_ids: [T-007]
depends_on: [TASK-0085, TASK-0086]
unlocks: [TASK-0089, TASK-0090]
created_at: 2026-11-13T12:30:00Z
completed_at:
assignee: task-runner
attempts: 0
artifacts: artifacts/TASK-0088/
priority: P1
risk: medium
review_required: true
generated: { by: deepseek/v4.1-flash, at: 2026-11-13T12:30:00Z }
verified:
---

# Objetivo

Que los eventos de combate expongan el desglose de cada paquete —tipo, cantidad
base, dados de daño y resistencia, bruto, banda, multiplicador y daño final— y
conserven el campo de daño total, de modo que el host y `F1` puedan explicar el
resultado sin recalcular fórmulas.

# Contexto

- El resolvedor y los eventos base llegan en TASK-0085; los perfiles de contenido
  llegan en TASK-0086.
- `src/game/types.ts` declara `AttackRolls`, `AttackPerformed`,
  `ReplicaPerformed` y `SpellCast`; `combat.ts` y `magic.ts` los emiten.
- `src/game/engine.ts` construye el snapshot; `src/host/debug.ts` y el snapshot
  profundo deben clonar el desglose.
- [REQ-029](../requirements/REQ-029-tipos-dano-resistencias.md#requisitos-técnicos)
  T-007.

# Criterios de aceptación

- [ ] `AttackPerformed` y `ReplicaPerformed` incluyen una lista de paquetes con
      tipo, cantidad base, dado de daño, dado de resistencia, bruto, banda,
      multiplicador y daño final; el campo `damage` total se conserva.
- [ ] `SpellCast` de daño incluye el mismo desglose; curación y resurrección no
      declaran paquetes.
- [ ] Un fallo produce una lista vacía de paquetes y no inventa tiradas; el orden
      de los paquetes es el declarado en el ataque.
- [ ] El snapshot y el debug exponen el desglose en solo lectura; el host no
      recalcula reglas ni bandas.
- [ ] Los tests leen el desglose para un ataque mixto, cada banda y un hechizo
      eléctrico y otro de fuego; el total coincide con la suma y con el campo
      `damage`.
- [ ] `pnpm run verify` pasa; no se eliminan ni debilitan tests existentes.
- [ ] Sin dependencias nuevas; `src/game/` sigue puro.

# Plan de test

- Unitario: forma del desglose; total = suma de paquetes; paquete recortado a 0;
  fallo sin paquetes; curación sin paquetes; banda y multiplicador reflejados.
- Integración: ataque, réplica y hechizo emiten el desglose con el mismo
  resolvedor; el snapshot lo conserva.
- E2E / visual: no aplica; llega en TASK-0092.
- Manual: `F1` permite explicar un ataque de dos paquetes sin leer código.

# Evidencia esperada

- [ ] Informe en `artifacts/TASK-0088/attempt-1/report.md`
- [ ] Salida de `pnpm run verify` y de los tests focalizados
- [ ] Commit SHA en la rama `task/TASK-0088`

# Restricciones

- No cambiar las fórmulas ni el reparto de tiradas de TASK-0085.
- No presentar el desglose en el HUD de juego; eso llega en TASK-0089.
- No añadir eventos nuevos si basta con ampliar los existentes.
- Sin dependencias nuevas.

# No objetivos

- Texto e iconos de las bandas en el cursor (TASK-0089).
- Matriz de regresión y medición de coste (TASK-0090).
- Documentación de diseño (TASK-0091).
