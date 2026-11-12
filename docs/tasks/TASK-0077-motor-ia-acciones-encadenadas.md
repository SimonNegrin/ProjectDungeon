---
type: Task
id: TASK-0077
title: "Motor: IA enemiga con acciones encadenadas"
description: "Encadenar las acciones por tipo de enemigo de forma determinista: en alerta moverse con MP y atacar hasta agotar acciones o matar, sin atacar dormido o en regreso y atacando acorralado al huir."
status: stable
task_status: done
task_type: feature
requirement: REQ-026
requirement_ids: [R-006, R-012, T-004, T-008]
depends_on: [TASK-0076]
unlocks: [TASK-0078]
created_at: 2026-11-12T14:35:00Z
completed_at: 2026-11-12T18:20:00Z
assignee: task-runner
attempts: 2
artifacts: artifacts/TASK-0077/
priority: P1
risk: medium
review_required: true
generated: { by: deepseek/v4.1-flash, at: 2026-11-12T14:35:00Z }
verified:
  - by: task-lead
    at: 2026-11-12T18:20:00Z
    note: >-
      Intentos 1 y 2 verificados en task/TASK-0077 (implementación 04e40f7,
      E2E 3046d28, informes 290363e/fef53cc; merge cb49df2). Diff completo
      revisado: solo `src/game/turn.ts` y tests; sin host, HUD, bestiario,
      contador ni experimentos. Criterios comprobados por tipo (2/1/2), alerta
      con MP y ataque hasta agotar o matar, dormido/regreso sin ataque, huida
      sin ataque salvo acorralado, parada al morir el objetivo, fin de fase y
      determinismo sin `Math.random`. `pnpm run verify` re-ejecutado OK (1012
      tests, tsc, build y bundle); `pnpm run test:e2e` 108/109: el único fallo
      (`cursor-qa` «sin acción») ya fallaba en `main` desde TASK-0076 y queda
      fuera de alcance. Sin tests borrados, saltados ni debilitados.
      Fricción: timeout de 5 s de `EXP-004` bajo carga, `deferred` a
      requirements-writer; patrón de HUD en el cue del beat, `deferred` a
      requirements-writer. Sin resultado creativo pendiente.
  - by: requirements-writer
    at: 2026-11-12T18:50:16Z
    note: >-
      Verificación independiente: `pnpm run verify` OK (1012/1012, tsc, build y
      bundle); E2E focalizados 19/20. El único fallo es la aserción de
      `cursor-qa` «enemigo alcanzable sin acción», que tras dos pulsaciones de
      `F` espera 1 acción y recibe 0; procede de TASK-0076 (commit `169ca54`) y
      no del encadenado. Corrección asignada a TASK-0078 por decisión del
      usuario.
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

- [x] En alerta, el enemigo se mueve con MP y ataca hasta agotar sus acciones o
      matar al objetivo; no ataca si el objetivo muere ni si se queda sin MP y
      sin adyacencia.
- [x] Dormido y en regreso no atacan; el que regresa sigue volviendo a su puesto
      después de actuar y no reanuda la persecución.
- [x] El cobarde que huye usa MP y no ataca mientras huye; si está acorralado,
      ataca con las acciones que le queden.
- [x] Cada tipo usa su número de acciones del bestiario; cambiar un tipo no
      cambia los demás.
- [x] La secuencia es determinista con la misma semilla y comandos; no se usa
      `Math.random`; los eventos y las acciones conservan el orden.
- [x] La fase termina al morir el último jugador o al agotar las acciones de
      todos los enemigos vivos; no hay turnos automáticos del jugador.
- [x] Tests por estado, por tipo, de parada al morir el objetivo, de huida y
      acorralamiento y de determinismo. `pnpm run verify` pasa.
- [x] Sin cambios en el HUD, la presentación ni los valores de balance.

# Plan de test

- Unitario: Centinela ataca dos veces; Bruto una; Cobarde dos; dormido/regreso
  no atacan; huida no ataca; acorralado ataca; objetivo muerto detiene la cola.
- Integración: fase enemiga completa con dos tipos y semilla fija; misma
  secuencia de eventos en dos ejecuciones.
- E2E / visual: no aplica; la presentación de varios beats es `TASK-0078`.
- Manual: observar una fase enemiga con Centinela y Cobarde y comprobar que no
  hay ataques de más.

# Evidencia esperada

- [x] Informe en `artifacts/TASK-0077/attempt-1/report.md`
- [x] Salida de `pnpm run verify`
- [x] Commit SHA en la rama `task/TASK-0077`

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
