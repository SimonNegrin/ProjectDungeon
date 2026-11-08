---
type: Task
id: TASK-0012
title: "Motor: planificación de camino y clasificación de destino"
description: Añade una función pura que calcula el camino, el coste, el tile de ataque y el estado de validez del cursor para REQ-004.
status: stable
task_status: done
task_type: feature
requirement: REQ-004
requirement_ids: [R-005, R-006, R-007, R-011, T-002, T-009, T-010, T-011]
depends_on: [TASK-0011]
unlocks: [TASK-0013]
created_at: 2026-11-08T01:27:27Z
completed_at: 2026-11-08T01:37:10Z
assignee: task-runner
attempts: 1
artifacts: artifacts/TASK-0012/
priority: P1
risk: medium
review_required: true
generated: { by: deepseek/v4.1-flash, at: 2026-11-08T01:27:27Z }
verified:
  - by: task-lead
    at: 2026-11-08T01:37:10Z
    note: "Verificación independiente: diff completo de `src/game/path.ts`, `movement.ts`, `index.ts`, `tests/unit/game/path.test.ts` y artefactos; `pnpm run verify` OK (79 documentos, 3 agentes/9 skills, 254 tests en 23 archivos, build 43 módulos). Los 16 tests cubren diagonal, corte de esquina, muro, fuera del mapa, aliado, objeto bloqueante, sin camino, jugador, enemigo adyacente/alcanzable/lejano, enemigo sin tile de ataque, empates y determinismo sin mutación. Sin tests existentes modificados, borrados, saltados ni debilitados; sin cambios fuera de alcance; `path.ts` sin DOM, aleatoriedad ni relojes. Commit verificado `087b872`."
    artifacts: artifacts/TASK-0012/attempt-1/
    commit: 087b872
---

# Objetivo

Existir una función pura y determinista en `src/game/` que, dado el estado, la
unidad que se mueve y un tile objetivo, devuelva el tipo de objetivo, el camino,
el coste, el tile de ataque si el objetivo es un enemigo y el estado de validez
del cursor. Es la base compartida del color del cursor, los puntos del camino y
el futuro comando `MoveTo`.

# Contexto

- Requisito: [REQ-004](../requirements/REQ-004-cursor-seleccion.md).
- Reglas actuales de movimiento: `src/game/movement.ts`, `DIRECTIONS`,
  `validateMove` y `commitMove`.
- Rejilla, muros y ocupación: `src/game/grid.ts`.
- Combate y adyacencia: `src/game/combat.ts`.
- Tipos: `src/game/types.ts`.
- El host usará el plan en TASK-0014; el comando `MoveTo` se añade en
  TASK-0013.
- No hay objetos bloqueantes en este corte; el predicado debe dejar un punto de
  extensión claro para ellos.

# Diseño técnico de referencia

- Crear un módulo puro, por ejemplo `src/game/path.ts` o `planning.ts`, sin DOM,
  sin Canvas y sin input.
- Exponer una función del estilo
  `planCursorTarget(state, unitId, target): CursorTargetPlan`.
- El plan debe distinguir:
  - `player`: el cursor está sobre el jugador.
  - `floor`: suelo libre; el camino termina en el objetivo.
  - `enemy`: enemigo vivo; el camino termina en un tile libre adyacente desde el
    que se puede atacar, nunca en el tile del enemigo.
  - `blocked`: muro, aliado, objeto bloqueante, fuera del mapa o sin camino.
- Incluir al menos `kind`, `path`, `cost`, `withinMp`, `attackTile` y un motivo de
  bloqueo cuando aplique. El host debe poder derivar de ahí los estados
  `player`, `reachable`, `too-far`, `invalid` y `enemy` sin volver a calcular el
  camino.
- `path` contiene los pasos posteriores al jugador, en orden, incluido el tile
  final o el tile de ataque. No incluye el tile de salida del jugador.
- El camino es el más corto con las reglas actuales: 8 direcciones, coste 1,
  sin corte de esquina, sin muros, sin unidades vivas de cualquier facción
  (salvo la unidad que se mueve) y sin objetos que impidan ocupar el tile.
- Para un enemigo, buscar el camino más corto a cualquier tile libre adyacente en
  Chebyshev 1. Si el jugador ya es adyacente, `path` queda vacío, `cost` es 0 y
  `attackTile` es la posición actual del jugador. Los empates se resuelven de
  forma determinista con el orden de `DIRECTIONS`.
- Un objeto o unidad aliada bloquea el paso y el destino; el cursor puede estar
  encima, pero el plan es `blocked`.
- El plan no muta el estado y no usa `Math.random`, `Date.now` ni
  `performance.now`.
- El predicado de bloqueo debe ser único y compartido para que la
  previsualización y el movimiento no puedan divergir. Si hace falta un hook
  para futuros objetos, que sea opcional y compatible con el estado actual.

# Criterios de aceptación

- [ ] Existe una función pura y exportada en `src/game/` que devuelve el plan de
      destino con tipo, camino, coste, `withinMp`, tile de ataque y motivo de
      bloqueo cuando aplique.
- [ ] El cursor sobre el jugador devuelve `player`, camino vacío y coste 0.
- [ ] Un tile de suelo libre alcanzable devuelve `floor`, camino más corto y
      `withinMp: true`; uno demasiado lejano devuelve `withinMp: false` con el
      camino completo.
- [ ] Un muro, aliado, objeto bloqueante, fuera del mapa o tile sin camino
      devuelve `blocked`, camino vacío y un motivo identificable.
- [ ] Un enemigo devuelve `enemy` con camino hasta el tile de ataque adyacente;
      nunca incluye el tile del enemigo. Si ya es adyacente, el camino está vacío
      y el tile de ataque es el del jugador.
- [ ] El camino respeta 8 direcciones, coste 1, sin corte de esquina, muros,
      unidades vivas y objetos bloqueantes.
- [ ] La función es determinista y no usa DOM, Canvas, input, aleatoriedad ni
      relojes.
- [ ] Los tests cubren diagonal, corte de esquina, muro, aliado, enemigo,
      objeto bloqueante, sin camino, jugador, enemigo adyacente, enemigo
      alcanzable, enemigo demasiado lejano y empates.
- [ ] `pnpm run verify` pasa y no se debilitan tests existentes.

# Plan de test

- **Unitario:** rejillas sintéticas con muros, aliados, enemigos y huecos;
  comprobar tipo, camino, coste, `withinMp`, `attackTile` y motivo; comprobar el
  orden determinista y el corte de esquina.
- **Integración:** no aplica todavía; el comando se prueba en TASK-0013.
- **E2E / visual:** no aplica; la representación es TASK-0014/TASK-0015.
- **Manual:** no aplica.

# Comandos y timeouts

| Comando | Timeout | Qué valida |
|---|---:|---|
| `pnpm run test` | 120 s | Planificación, clasificación y determinismo |
| `pnpm run verify` | 180 s | Docs, config, tests y build |
| `pnpm run build` | 120 s | Typecheck y build |

# Evidencia esperada

- [ ] Informe en `artifacts/TASK-0012/attempt-1/report.md`
- [ ] Salida de tests en `artifacts/TASK-0012/attempt-1/test-output.txt`
- [ ] Commit SHA en la rama `task/TASK-0012`
- [ ] No se requieren capturas: la tarea no toca UI

# Restricciones

- No tocar `src/host/`, Canvas, input ni HUD.
- No cambiar las reglas de movimiento, combate, turnos ni economía.
- No añadir el comando `MoveTo` ni modificar `reduce`; eso es TASK-0013.
- No añadir dependencias.
- No cambiar la forma de `GameState` salvo que sea imprescindible; preferir un
  predicado o hook opcional.
- No resolver decisiones creativas dentro de la tarea.

# No objetivos

- Comando de movimiento por destino y acción combinada (TASK-0013).
- Cursor, input y render del host (TASK-0014).
- E2E y QA visual (TASK-0015).
- Ataque a distancia, línea de visión, objetos nuevos o varios niveles.

# Notas

- Reutilizar `DIRECTIONS`, `isWallAt`, `isInside`, `isOccupied` e `isAlive` en
  lugar de duplicar reglas.
- Documentar en JSDoc que el camino empieza después del jugador y que un enemigo
  se representa por su tile de ataque.
- Si el plan necesita un motivo de bloqueo, usar un valor estable y serializable
  para que el HUD pueda traducirlo.
- La función debe ser barata: una búsqueda en 32×32 por movimiento de cursor.
