---
type: Task
id: TASK-0077
title: "Motor: IA enemiga con acciones encadenadas"
description: "Encadenar las acciones por tipo de enemigo de forma determinista: en alerta moverse con MP y atacar hasta agotar acciones o matar, sin atacar dormido o en regreso y atacando acorralado al huir."
status: stable
task_status: ready
task_type: feature
requirement: REQ-026
requirement_ids: [R-006, R-012, T-004, T-008]
depends_on: [TASK-0076]
unlocks: [TASK-0078]
created_at: 2026-11-12T14:35:00Z
completed_at:
assignee: task-runner
attempts: 0
artifacts: artifacts/TASK-0077/
priority: P1
risk: medium
review_required: true
generated: { by: deepseek/v4.1-flash, at: 2026-11-12T14:35:00Z }
verified:
---

# Objetivo

Que la fase enemiga use el contador de acciones de `TASK-0076`: cada enemigo
encadena sus acciones en orden determinista, ataca hasta agotar acciones o matar
y respeta los estados de percepción y huida. Huir y perseguir siguen gastando MP,
no acciones.

# Contexto

- `src/game/ai.ts`: `planEnemyAction` planifica un ataque o un movimiento con
  MP; la fase actual aplica un solo plan por enemigo.
- `src/game/turn.ts`: `applyEnemyPlan` y `resolveEndTurn` recorren los enemigos
  en orden de índice.
- `src/game/bestiary.ts`: acciones por tipo (Centinela 2, Bruto 1, Cobarde 2).
- `src/game/combat.ts`: cada ataque consume una acción.
- [REQ-009](../requirements/REQ-009-percepcion-alarma-huida.md): estados
  `dormant`, `alert` y `returning`, y huida del cobarde.
- Requisito: [REQ-026](../requirements/REQ-026-economia-acciones-rebalanceo.md).
  Depende de `TASK-0076` por el contador y el coste de ataque.

# Criterios de aceptación

- [ ] En alerta, el enemigo se mueve con MP y ataca hasta agotar sus acciones o
      matar al objetivo; no ataca si el objetivo muere ni si se queda sin MP y
      sin adyacencia.
- [ ] Dormido y en regreso no atacan; el que regresa sigue volviendo a su puesto
      después de actuar y no reanuda la persecución.
- [ ] El cobarde que huye usa MP y no ataca mientras huye; si está acorralado,
      ataca con las acciones que le queden.
- [ ] Cada tipo usa su número de acciones del bestiario; cambiar un tipo no
      cambia los demás.
- [ ] La secuencia es determinista con la misma semilla y comandos; no se usa
      `Math.random`; los eventos y las acciones conservan el orden.
- [ ] La fase termina al morir el último jugador o al agotar las acciones de
      todos los enemigos vivos; no hay turnos automáticos del jugador.
- [ ] Tests por estado, por tipo, de parada al morir el objetivo, de huida y
      acorralamiento y de determinismo. `pnpm run verify` pasa.
- [ ] Sin cambios en el HUD, la presentación ni los valores de balance.

# Plan de test

- Unitario: Centinela ataca dos veces; Bruto una; Cobarde dos; dormido/regreso
  no atacan; huida no ataca; acorralado ataca; objetivo muerto detiene la cola.
- Integración: fase enemiga completa con dos tipos y semilla fija; misma
  secuencia de eventos en dos ejecuciones.
- E2E / visual: no aplica; la presentación de varios beats es `TASK-0078`.
- Manual: observar una fase enemiga con Centinela y Cobarde y comprobar que no
  hay ataques de más.

# Evidencia esperada

- [ ] Informe en `artifacts/TASK-0077/attempt-1/report.md`
- [ ] Salida de `pnpm run verify`
- [ ] Commit SHA en la rama `task/TASK-0077`

# Restricciones

- No tocar el contador ni los costes de `TASK-0076`; solo consumirlos.
- No introducir aleatoriedad nueva ni reordenar enemigos.
- No cambiar la percepción ni los radios de `REQ-009`.
- No añadir dependencias.

# No objetivos

- Presentación secuencial de los beats
  ([TASK-0078](TASK-0078-host-contador-acciones-fin-turno.md)).
- Hechizos enemigos o réplica.
- Rebalanceo de valores.
