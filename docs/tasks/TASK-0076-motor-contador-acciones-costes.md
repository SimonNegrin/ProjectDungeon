---
type: Task
id: TASK-0076
title: "Motor: contador de acciones y costes por comando"
description: "Sustituir la acción booleana por un contador por unidad con máximo, restauración por turno, coste declarado por comando, ataque repetible y fin de turno manual."
status: stable
task_status: review
task_type: feature
requirement: REQ-026
requirement_ids: [R-001, R-002, R-003, R-004, R-005, R-006, R-007, R-008, R-013, T-001, T-002, T-003, T-007, T-008, T-013]
depends_on: []
unlocks: [TASK-0077]
created_at: 2026-11-12T14:30:00Z
completed_at:
assignee: task-runner
attempts: 1
artifacts: artifacts/TASK-0076/
priority: P1
risk: high
review_required: true
generated: { by: deepseek/v4.1-flash, at: 2026-11-12T14:30:00Z }
verified:
  - by: task-lead
    at: 2026-11-12T17:40:00Z
    note: >-
      Verificación independiente: `pnpm run verify` OK (74 archivos, 1004 tests),
      build y bundle OK; diff y criterios revisados. Estado `review`: falta la
      aprobación humana por `review_required`.
---

# Objetivo

Que cada unidad tenga un contador `actions { max, remaining }` restaurado al
inicio de su turno, con 2 acciones por defecto, Pícaro 3 y enemigos 2/1/2, y que
cada comando consuma 0 o 1 acción de forma atómica. Atacar se puede repetir;
moverse, recoger, cambiar de arma y cerrar el turno no gastan acción.

# Contexto

- `src/game/types.ts`: `Unit`, `UnitStats`, `Command`, `RejectionReason` y
  `GameEvent`. Hoy existe `actionAvailable: boolean`.
- `src/game/combat.ts`: `resolveAttack` consume la acción al atacar.
- `src/game/turn.ts`: `restorePlayerTurn`, `restoreEnemyTurn` y
  `resolveEndTurn`; el fin de turno ya es manual con `E`.
- `src/game/engine.ts`: `reduceAttack`, `reduceMoveTo`, `reducePickUp` y
  `reduceEndTurn`, con la validación atómica de comandos.
- `src/game/roster.ts` y `src/game/bestiary.ts`: origen de las acciones por
  arquetipo y por tipo de enemigo.
- `src/host/motion.ts` lee `actionAvailable` para reconstruir la presentación;
  se adapta de forma mecánica, sin rediseñar el HUD.
- Requisito: [REQ-026](../requirements/REQ-026-economia-acciones-rebalanceo.md).
  El HUD y los beats van en [TASK-0078](TASK-0078-host-contador-acciones-fin-turno.md).

# Criterios de aceptación

- [ ] `Unit.actions` guarda `{ max, remaining }`; `remaining` baja con cada
      comando de coste 1 y vuelve a `max` al empezar el turno de la unidad, junto
      a MP. El gasto no persiste entre turnos.
- [ ] `actions.max` sale del atributo inherente de acciones (2 por defecto,
      Pícaro 3) más `actionsBonus` del equipo, con recorte determinista a 4; un
      objeto de prueba con +2 se recorta al tope. Enemigos: Centinela 2,
      Bruto 1, Cobarde 2.
- [ ] Atacar cuesta 1 acción y se puede repetir contra el mismo objetivo u otro;
      sin acciones se rechaza con `no-action` sin cambiar estado, RNG ni eventos.
- [ ] `Moverse` y `MoveTo` gastan MP y 0 acciones; `PickUp` sigue costando 1 MP
      y 0 acciones; `SelectWeapon`, `EndTurn` y `Restart` cuestan 0.
- [ ] `MoveTo` sobre un enemigo se resuelve como movimiento con MP más **un**
      ataque de 1 acción por comando; no encadena ataques. Si no queda acción,
      solo se mueve; si ya es adyacente, ataca una vez.
- [ ] Gastar la última acción no termina el turno ni cambia de fase; el jugador
      sigue pudiendo moverse y cierra con `E`.
- [ ] La serialización, el snapshot y el debug exponen `actions.max` y
      `actions.remaining`; no queda `actionAvailable` como fuente de verdad.
- [ ] Tests actualizados de `REQ-009`, `REQ-010` y `REQ-017`; tests nuevos de dos
      ataques, Pícaro 3, ataque + interacción, movimiento y recogida sin acción,
      fin de turno manual, restauración y tope. `pnpm run verify` pasa.
- [ ] Sin cambios en contenedores, soltar objetos, hechizos, réplica ni valores
      de balance.

# Plan de test

- Unitario: contador, coste por comando, ataque repetido, tope, restauración,
  rechazo sin acción y `MoveTo` de una pulsación.
- Integración: turno completo jugador → enemigo con MP y acciones restaurados;
  dos ataques seguidos con la misma fórmula.
- E2E / visual: no aplica aquí; lo cubre
  [TASK-0078](TASK-0078-host-contador-acciones-fin-turno.md).
- Manual: Pícaro con 3 acciones ataca tres veces pulsando `F`.

# Evidencia esperada

- [ ] Informe en `artifacts/TASK-0076/attempt-1/report.md`
- [ ] Salida de `pnpm run verify`
- [ ] Commit SHA en la rama `task/TASK-0076`

# Restricciones

- No implementar soltar objetos, cofres o cadáveres: dependen de REQ-018/REQ-020.
- No implementar hechizos ni réplica.
- No cambiar fórmulas de combate ni valores de balance.
- No añadir dependencias.

# No objetivos

- HUD, beats y sugerencia de fin de turno
  ([TASK-0078](TASK-0078-host-contador-acciones-fin-turno.md)).
- IA enemiga con varias acciones
  ([TASK-0077](TASK-0077-motor-ia-acciones-encadenadas.md)).
- Rebalanceo de valores (`TASK-0084`).
