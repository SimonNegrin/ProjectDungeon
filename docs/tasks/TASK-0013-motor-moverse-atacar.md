---
type: Task
id: TASK-0013
title: "Motor: Moverse por destino y acercarse + atacar"
description: Añade el comando de movimiento por destino que consume el plan de camino, gasta MP, se detiene a mitad y combina acercarse y atacar sobre un enemigo.
status: stable
task_status: ready
task_type: feature
requirement: REQ-004
requirement_ids: [R-008, R-009, R-010, R-011, T-003, T-004, T-009, T-012]
depends_on: [TASK-0012]
unlocks: [TASK-0014]
created_at: 2026-11-08T01:27:27Z
completed_at:
assignee: task-runner
attempts: 0
artifacts: artifacts/TASK-0013/
priority: P1
risk: high
review_required: true
generated: { by: deepseek/v4.1-flash, at: 2026-11-08T01:27:27Z }
verified:
---

# Objetivo

Añadir al motor un comando de movimiento por destino que reciba el tile
seleccionado, use la planificación de TASK-0012 y aplique las reglas de
**Moverse**: recorrer el camino con el MP disponible, detenerse a mitad, no
consumir acción en un movimiento normal y, si el destino es un enemigo,
acercarse hasta el tile de ataque y atacar cuando sea posible.

# Contexto

- Requisito: [REQ-004](../requirements/REQ-004-cursor-seleccion.md).
- Planificación y clasificación: TASK-0012 (`src/game/path.ts` o similar).
- Motor actual: `src/game/engine.ts`, `movement.ts`, `combat.ts`, `turn.ts`,
  `types.ts`.
- Comandos actuales: `Move`, `Attack`, `EndTurn`, `Restart`.
- La IA enemiga y los tests actuales usan `Move` de un paso; debe seguir
  funcionando sin cambios.
- `Atacar` (`F`) sigue siendo directo y no se acerca; esta tarea no cambia su
  semántica, solo añade el comando de movimiento por destino.

# Diseño técnico de referencia

- Añadir un comando serializable del estilo
  `{ type: 'MoveTo', unitId, target: { x, y } }` a `Command`.
- La reducción del comando debe:
  1. Validar fase, estado de partida, unidad viva y existencia del objetivo.
  2. Recalcular el plan con la función pura de TASK-0012; el host no envía el
     camino, solo el tile.
  3. Si el plan es `player` o `blocked`, rechazar sin mover ni gastar MP.
  4. Si es `floor`:
     - recorrer el camino completo si `withinMp`;
     - recorrer los primeros `MP` pasos si es demasiado lejano;
     - gastar 1 MP por paso;
     - no consumir la acción.
  5. Si es `enemy`:
     - si ya es adyacente y hay acción, atacar sin moverse;
     - si es alcanzable y hay acción, moverse al tile de ataque y después
       atacar;
     - si es alcanzable y no hay acción, solo moverse;
     - si es demasiado lejano, avanzar hasta agotar MP y no atacar;
     - si no hay tile de ataque libre o camino, rechazar como bloqueado.
  6. Aplicar el final de partida con `applyTerminal` cuando un ataque lo
     provoque.
- Emitir un evento `UnitMoved` por cada paso, en orden, con `from`, `to` y
  `mpLeft`, y después `AttackPerformed`/`UnitDied`/`GameEnded` si corresponde.
  No introducir un evento nuevo si el existente basta.
- Los rechazos usan `CommandRejected`. Si hace falta, añadir un motivo estable
  (`no-path`, `invalid-target` o similar) y documentarlo; no romper los motivos
  existentes.
- La reducción debe ser atómica: si un paso falla, devolver el estado original y
  el rechazo, sin dejar movimiento parcial.
- `commitMove`/`validateMove` se pueden reutilizar paso a paso, pero el comando
  debe recalcular y validar; no confiar en el host.
- El comando debe funcionar con `GameSession.dispatch` y con
  `window.__game.dispatch` cuando el host lo exponga.

# Criterios de aceptación

- [ ] `Command` incluye el comando de movimiento por destino y `reduce` lo
      maneja; el comando es serializable.
- [ ] Cursor en verde: el jugador recorre el camino hasta el objetivo y gasta
      exactamente el coste en MP; la acción y el turno no cambian.
- [ ] Cursor en ámbar: el jugador recorre hasta agotar MP, queda en el último
      tile alcanzable, con MP 0, sin atacar y sin consumir acción.
- [ ] Cursor en rojo: no se mueve, no gasta MP ni acción y se emite rechazo con
      motivo.
- [ ] Enemigo alcanzable con acción: el jugador se mueve al tile de ataque,
      gasta MP y acción, ataca y actualiza vida/eventos; si muere, se aplica el
      final de partida.
- [ ] Enemigo alcanzable sin acción: solo se mueve al tile de ataque; no ataca.
- [ ] Enemigo demasiado lejano: avanza hasta agotar MP y no ataca.
- [ ] Enemigo adyacente con acción: ataca sin moverse ni gastar MP.
- [ ] Enemigo adyacente sin acción: no hace nada y emite rechazo.
- [ ] El jugador nunca ocupa el tile del enemigo y el ataque se resuelve después
      del movimiento, sobre el estado actualizado.
- [ ] Los comandos `Move`, `Attack`, `EndTurn`, `Restart` y la IA existentes
      siguen pasando sus tests.
- [ ] Tests unitarios/integración cubren todos los casos, el orden de eventos, la
      atomicidad y el final de partida.
- [ ] `pnpm run verify` pasa y no se debilitan tests existentes.

# Plan de test

- **Unitario:** estados sintéticos con rejilla, jugador y enemigo; verde, ámbar,
  rojo, los cinco casos de enemigo, sin MP, sin acción, objetivo sobre el
  jugador, objetivo bloqueado y muerte del enemigo.
- **Integración:** `GameSession.dispatch({ type: 'MoveTo', ... })` devuelve estado
  y eventos serializables; el estado original no se muta.
- **E2E / visual:** no aplica todavía; el host y la QA visual son TASK-0014 y
  TASK-0015.
- **Manual:** no aplica.

# Comandos y timeouts

| Comando | Timeout | Qué valida |
|---|---:|---|
| `pnpm run test` | 120 s | Comando, reglas, eventos y atomicidad |
| `pnpm run verify` | 180 s | Docs, config, tests y build |
| `pnpm run build` | 120 s | Typecheck y build |

# Evidencia esperada

- [ ] Informe en `artifacts/TASK-0013/attempt-1/report.md`
- [ ] Salida de tests en `artifacts/TASK-0013/attempt-1/test-output.txt`
- [ ] Commit SHA en la rama `task/TASK-0013`
- [ ] No se requieren capturas: la tarea no toca UI

# Restricciones

- No cambiar la economía de turno, el daño, el alcance cuerpo a cuerpo ni las
  reglas de la IA.
- No duplicar el pathfinding: usar la función pura de TASK-0012.
- No confiar en el camino o la clasificación que envíe el host; el motor
  recalcula.
- No añadir dependencias.
- No tocar `src/host/` ni el render.
- No hacer que `Atacar` (`F`) se acerque automáticamente.

# No objetivos

- Cursor, input, render, HUD y feedback del host (TASK-0014).
- E2E y QA visual (TASK-0015).
- Ataque a distancia, línea de visión, esperar/interactuar, puntos de acción.
- Objetos nuevos, varios niveles, hotseat o multijugador.

# Notas

- El camino de TASK-0012 no incluye el tile de salida; recorrerlo paso a paso
  evita un cálculo extra.
- Si el enemigo muere, conservar el evento `UnitDied` y el `GameEnded` con el
  mismo orden que el ataque actual.
- Si el comando recibe un objetivo sobre el jugador, no debe gastar MP; el
  rechazo debe ser explícito para que el HUD pueda avisar.
- Mantener los eventos existentes para no romper el HUD, el feedback de daño ni
  los E2E; si se necesita un motivo nuevo, actualizar tests y documentación.
