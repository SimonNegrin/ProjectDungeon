---
type: Task
id: TASK-0085
title: "Motor: tipos de daño, paquetes y resolvedor con bandas"
description: "Sustituir el daño único por paquetes tipados con perfil de resistencia, armadura y fuerza solo en los físicos, multiplicador de banda después de la absorción, redondeo hacia abajo y mínimo 1 global, con RNG determinista."
status: stable
task_status: ready
task_type: feature
requirement: REQ-029
requirement_ids: [R-001, R-002, R-003, R-004, R-005, R-006, R-007, R-008, R-009, R-011, T-001, T-002, T-003, T-004, T-005, T-006]
depends_on: []
unlocks: [TASK-0086, TASK-0087, TASK-0088]
created_at: 2026-11-13T12:30:00Z
completed_at:
assignee: task-runner
attempts: 0
artifacts: artifacts/TASK-0085/
priority: P1
risk: high
review_required: true
generated: { by: deepseek/v4.1-flash, at: 2026-11-13T12:30:00Z }
verified:
---

# Objetivo

Que `src/game/` resuelva el daño por paquetes tipados con un único resolvedor
puro: cinco tipos, perfil de resistencia con bandas, armadura y fuerza solo en
físicos, banda después de la absorción, `floor` y mínimo 1 global. Armas,
réplica y hechizos comparten el camino y el RNG conserva su orden.

# Contexto

- Hoy hay daño único en `combat.ts`, `WeaponDefinition.damage` en `equipment.ts`
  y `UnitStats.resistencia` numérica en `types.ts`.
- `magic.ts` y `spells.ts` calculan el daño con la absorción histórica; deben
  declarar tipo y usar el resolvedor compartido (T-006).
- Roster y bestiario declaran resistencia numérica; aquí todos los perfiles son
  normales y los valores estimados llegan en TASK-0086.
- El HUD imprime `resistencia` y `weapon.damage`; se adapta lo mínimo para
  compilar. Las bandas visibles llegan en TASK-0089.
- [REQ-029](../requirements/REQ-029-tipos-dano-resistencias.md#requisitos-técnicos)
  T-001 a T-006, [Fórmulas](../requirements/REQ-029-tipos-dano-resistencias.md#fórmulas)
  y [ADR-023](../decisions/ADR-023-tipos-dano-paquetes-bandas.md).

# Criterios de aceptación

- [ ] `DamageType`, `ResistanceBand`, `ResistanceProfile` y
      `DamagePacket { type, amount }` tienen IDs estables; las etiquetas viven en
      catálogo o UI.
- [ ] `UnitStats.resistencia` es un perfil con una banda por tipo y normal por
      defecto; no queda resistencia numérica usada por el daño.
- [ ] Las armas declaran `damagePackets` con las mismas cantidades (espada y
      hacha filo; daga y cuchillo punzante). La validación rechaza más de un
      físico, más de un elemental o más de dos paquetes.
- [ ] El resolvedor es único y puro: dados de daño y resistencia independientes
      por paquete; los físicos suman fuerza y restan armadura; mágico y eléctrico
      ignoran ambas; banda después de la absorción con `floor`; cada paquete se
      recorta a 0 y el total es `max(1, suma)`.
- [ ] Las bandas aplican ×1,5, ×1, ×0,5 y ×0,25; no existe inmunidad ni total 0.
- [ ] Los hechizos de daño declaran tipo (eléctrico o mágico); curación y
      resurrección no declaran paquete. El nivel de magia solo afecta a acceso,
      maná e impacto.
- [ ] Un fallo consume solo impacto y escudo; un impacto consume, en orden fijo,
      daño y resistencia por paquete. Misma semilla y comandos, misma secuencia.
- [ ] Ataque y réplica comparten resolvedor; no queda fórmula paralela en
      `combat.ts`, `magic.ts` ni `ai.ts`.
- [ ] El host compila con una adaptación mínima; los tests se migran sin
      borrarse, saltarse ni debilitarse.
- [ ] `pnpm run verify` pasa; `src/game/` sigue puro, sin dependencias ni DOM.

# Plan de test

- Unitario: cuatro bandas; armadura y fuerza aisladas; ataque mixto; recorte y
  mínimo 1; validación del catálogo; hechizo eléctrico, de fuego y curación;
  orden y consumo del RNG.
- Integración: ataque, réplica y hechizo comparten cálculo; misma semilla, misma
  secuencia; la IA no duplica la fórmula.
- E2E / visual: no aplica; llega en TASK-0092.
- Manual: comprobar que el combate sigue siendo reconocible con perfiles
  normales.

# Evidencia esperada

- [ ] Informe en `artifacts/TASK-0085/attempt-1/report.md`
- [ ] Salidas de `pnpm run verify` y de los tests focalizados
- [ ] Commit SHA en la rama `task/TASK-0085`

# Restricciones

- No añadir perfiles estimados (TASK-0086) ni las armas nuevas (TASK-0087).
- No cambiar impacto, escudo, economía de acciones ni maná.
- No tocar `src/host/` más allá de lo necesario para compilar.
- Sin dependencias nuevas; `src/game/` no importa `src/host/`.

# No objetivos

- Desglose en eventos (TASK-0088).
- Bandas en el cursor y feedback (TASK-0089).
- Matriz de regresión y coste (TASK-0090).
- Documentación y QA visual (TASK-0091 y TASK-0092).
