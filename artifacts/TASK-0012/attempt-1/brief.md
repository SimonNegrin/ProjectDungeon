---
type: Task Brief
title: "TASK-0012: brief del intento 1"
description: Planificador puro de camino y clasificación de destino en src/game/.
task: TASK-0012
attempt: 1
status: stable
brief_bytes: 3125
read_detail: false
generated: { by: deepseek/v4.1-flash, at: 2026-11-08T01:31:42Z }
---

# Objetivo

Función pura y exportada en `src/game/` que, dado estado, id de unidad y tile
objetivo, devuelva tipo de destino, camino, coste, `withinMp`, tile de ataque y
motivo estable de bloqueo. Base de TASK-0013 y TASK-0014.

# No objetivos

- `MoveTo`, cambios en `reduce` o ataque combinado (TASK-0013).
- Host, Canvas, input, HUD, cursor o puntos del camino (TASK-0014).
- E2E/QA visual, objetos nuevos, ataque a distancia o niveles.
- Cambiar reglas de movimiento, combate, turnos o economía.

# Invariantes

- Pura y determinista: sin mutar estado, DOM/Canvas/input, `Math.random`,
  `Date.now` ni `performance.now`.
- Camino más corto: 8 direcciones, coste 1, sin corte de esquina, muros,
  unidades vivas (salvo la móvil) ni objetos bloqueantes.
- `path` empieza después del jugador e incluye el tile final o el de ataque;
  nunca el tile del enemigo.
- Enemigo: tile libre adyacente (Chebyshev 1) más cercano; si ya es adyacente,
  `path` vacío, `cost` 0 y `attackTile` = posición del jugador. Desempate con el
  orden de `DIRECTIONS`.
- Un solo predicado de bloqueo compartido con `validateMove`, sin cambiar su
  comportamiento; hook opcional para futuros objetos.
- Sin dependencias nuevas ni ampliar `GameState` salvo necesidad justificada.

# Criterios de aceptación

En [TASK-0012, «Criterios de aceptación»](../../../docs/tasks/TASK-0012-motor-camino-destino.md#criterios-de-aceptación).
No se copian; el plan de test está en la misma hoja.

# Contexto mínimo

- `src/game/movement.ts`: `DIRECTIONS`, `validateMove`, `isFreeCell`, corte de esquina.
- `src/game/grid.ts`: `isInside`, `isWallAt`, `isFloorAt`, `isOccupied`, `isAlive`.
- `src/game/combat.ts`: `isAdjacent`, `findUnit`.
- `src/game/types.ts`: `GameState`, `Unit`, `Position`, `MOVE_COST`.
- `src/game/index.ts`: exportar el módulo nuevo.
- No debilitar `tests/unit/game/movement.test.ts`.
- [REQ-004](../../../docs/requirements/REQ-004-cursor-seleccion.md): R-005–R-007,
  R-011, T-002, T-009, T-010, T-011.

# Comandos y timeouts

| Comando | Timeout |
|---|---:|
| `pnpm run test` | 120 s |
| `pnpm run verify` | 180 s |

# Artefactos

En `artifacts/TASK-0012/attempt-1/`: `report.md` según
`docs/templates/task-report.md`, `test-output.txt` y `verify-output.txt`; anexo
solo si desborda. Incluye commit SHA y comandos con timeout. Sin capturas: no
hay UI.

# Riesgos y decisiones abiertas

- No existen objetos bloqueantes: deja el hook opcional claro y no inventes un
  modelo de objetos.
- `blocked` con camino vacío y motivo serializable y estable; sé consistente
  entre fuera del mapa, muro, ocupante, objeto y sin camino.
- Rendimiento apto para 32×32 por movimiento de cursor.
- Fricción: reportar con evidencia y disposición `pending`; no editar `docs/`.

# Desbordamiento

No hay anexo; no leer `brief-detalle.md`.
