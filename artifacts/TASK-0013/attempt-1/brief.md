---
type: Task Brief
title: "TASK-0013: brief del intento 1"
description: Comando MoveTo que consume el plan de camino, gasta MP, se detiene a mitad y acerca + ataca.
task: TASK-0013
attempt: 1
status: stable
brief_bytes: 3751
read_detail: false
generated: { by: deepseek/v4.1-flash, at: 2026-11-08T02:05:00Z }
---

# Objetivo

Añadir a `src/game/` un comando serializable `MoveTo` que, a partir del tile
objetivo, recalcule el plan con `planCursorTarget` y aplique Moverse: camino
completo o parcial según MP, sin consumir acción, y sobre un enemigo acercarse
al tile de ataque y atacar cuando haya acción.

# No objetivos

Fuera de alcance según la tarea (sección «No objetivos»): host, cursor, input,
render, HUD, E2E/QA visual, ataque a distancia, objetos, niveles y red. `Attack`
(`F`) conserva su semántica y no se acerca.

# Invariantes

- `reduce` sigue siendo puro y atómico: si un paso falla, devolver el estado
  original y un único `CommandRejected`, sin movimiento parcial.
- No duplicar pathfinding: usar `planCursorTarget` de TASK-0012. El host solo
  envía el tile; el motor recalcula.
- `Move` de un paso, `Attack`, `EndTurn`, `Restart` y la IA no cambian.
- Un `UnitMoved` por paso, en orden, con `from`, `to`, `mpLeft`; después
  `AttackPerformed`/`UnitDied`/`GameEnded` con el orden actual de `resolveAttack`.
- El jugador nunca ocupa el tile del enemigo. El ataque se resuelve sobre el
  estado ya movido.
- No añadir dependencias ni tocar `src/host/`, `docs/` ni tests existentes para
  debilitarlos.

# Criterios de aceptación

Viven en `docs/tasks/TASK-0013-motor-moverse-atacar.md`, sección «Criterios de
aceptación». Enlazar con ancla; no copiar. Cubrir además el plan de test de esa
tarea (verde, ámbar, rojo, cinco casos de enemigo, sin MP/acción, objetivo sobre
el jugador, muerte y atomicidad).

# Contexto mínimo

- `src/game/types.ts`: `Command`, `CommandType`, `RejectionReason`, `GameEvent`.
- `src/game/engine.ts`: `reduce` y reducciones actuales; validar fase, estado,
  unidad viva y objetivo.
- `src/game/path.ts`: `planCursorTarget` (`kind`, `path`, `cost`, `withinMp`,
  `attackTile`, `blockedReason`); el `path` no incluye el tile de salida.
- `src/game/movement.ts`: `commitMove`/`validateMove` reutilizables paso a paso.
- `src/game/combat.ts`: `resolveAttack` (adyacencia, acción, daño).
- `src/game/turn.ts`: `applyTerminal` para victoria/derrota.
- `src/host/session.ts`: `GameSession.dispatch` debe aceptar el comando.
- Tests: `tests/unit/game/helpers.ts` (`makeState`, `makeUnit`,
  `makeGridWithWalls`) y tests existentes de engine/movement/combat/ai/turn.
- Requisito: [REQ-004](../../../docs/requirements/REQ-004-cursor-seleccion.md),
  R-008 a R-011 y T-003/T-004/T-009/T-012.

# Comandos y timeouts

| Comando | Timeout |
|---|---:|
| `pnpm run test` | 120 s |
| `pnpm run verify` | 180 s |
| `pnpm run build` | 120 s |

# Artefactos

- `artifacts/TASK-0013/attempt-1/report.md` según
  `docs/templates/task-report.md`.
- `test-output.txt` y `verify-output.txt` en el mismo directorio.
- Commit(s) en `task/TASK-0013` con el ID de tarea; indicar SHA en el informe.
- Sin capturas: la tarea no toca UI.

# Riesgos y decisiones abiertas

- Motivos de rechazo: reutilizar los existentes cuando encajen; si hace falta
  `no-path`/`invalid-target`, añadirlo a `RejectionReason`, documentarlo en
  comentario de código e informe (el runner no edita `docs/`).
- `planCursorTarget` devuelve `kind: 'player'` para el tile propio: rechazar de
  forma explícita sin gastar MP.
- No consumir acción en movimiento normal, aunque el camino sea parcial.
- Enemigo adyacente sin acción: rechazo `no-action`, sin movimiento ni MP.

# Desbordamiento

Sin anexo. `read_detail: false`.
