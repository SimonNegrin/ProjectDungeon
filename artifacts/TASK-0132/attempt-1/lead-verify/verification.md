---
type: Task Verification
title: "TASK-0132: verificación del lead"
description: Revisión independiente del diff, criterios y evidencia del intento 1.
task: TASK-0132
attempt: 1
status: stable
generated: { by: deepseek/v4.1-flash, at: 2026-11-15T12:05:00Z }
---

# Resultado

Intento 1 aceptado. Motor `e493ab7`, tests `30dbb91`; fusión `7a683c3`.
`pnpm run verify` reejecutado sobre el árbol final: 102 archivos, 1521 tests,
`docs:check`, `config:check`, `tsc`, build y bundle OK. Focalizados: 99/99.

# Criterios

| Criterio | Evidencia |
|---|---|
| Vivo, muerto y fantasma con identidad y serialización | `lifeState`/`isGhost`, `Unit.ghost`, round-trip JSON en `ghost.test.ts`; identidad y stats conservados |
| Muros sí, casilla compartida; fuera de bloqueo, pathfinding, ataque y daño | Pruebas de muro/esquina, movimiento sobre aliado/enemigo, `isOccupied` falso, `planCursorTarget`, `target-dead` |
| MP intrínseco sin equipo; equipo no altera turno | `maxMp` conservado con y sin equipo; `GHOST_ACTIONS = 1`; restauración de MP/acción |
| Una acción por ronda | `restorePlayerTurn` incluye fantasmas; recoger/soltar consume acción y no MP; segundo intento `no-action` |
| Allowlist de comandos | `Move`, `MoveTo`, `PickUp`, `DropItem`, `InspectContainer`, `EndTurn`, `Restart`; ataque, hechizo, equipo y selección rechazados sin estado |
| Inspección sin trampa | `inspectContainer` copia solo `id`/`itemId`/`lootable`; prueba con `trap` inyectada y JSON sin `trap` |
| IA ignora objetivo y obstáculo | `nearestVisiblePlayer`/`visiblePlayers` vacíos, `planEnemyAction` espera, ataque `target-dead`; el fantasma es `hp 0` y no entra en bloqueo ni campos de distancia |
| Inválidos sin cambios y verify | Estados idénticos y RNG intacto; `verify` y focalizados OK |

# Diff y alcance

13 archivos: `src/game` (estado, muerte, movimiento, path, acciones, turno,
inventario y motor), dos casos exhaustivos en `src/host/{hud,motion}`, un test
nuevo y el helper. Sin cambios en requisitos, arnés, RNG, botín, mapa, costes de
vivos ni dependencias. No se borraron ni debilitaron tests.

# Triaje de fricción

| Propuesta | Clase | Disposición | Dueño |
|---|---|---|---|
| Puertas mencionadas en R-005/T-004 sin estado ni comando interactivo | Documental / producto | `deferred` | `requirements-writer` |
| T-003 dice que el MP del vivo cambia con el equipo, pero el equipo no define MP | Documental | `deferred` | `requirements-writer` |
| Resurrección deja `ghost` y `actions.max = 1` | Técnica, fuera de alcance | `deferred` | TASK-0148 |
| Umbral de aviso de handoffs >2560 B frente a plantilla | Arnés | `deferred` | `harness-keeper` vía `requirements-writer` |

# Observaciones

- Sin E2E: no hay presentación nueva; el render es TASK-0135.
- Inspección gratuita: no mueve objetos; el coste de una acción grava mover un
  objeto. No revela trampa.
- No hay transferencia desde cadáver en este corte: la cubre TASK-0136.
