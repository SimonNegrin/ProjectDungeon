---
type: Task Report
title: "Informe de ejecución — TASK-0004: sala 20×20, MP 6/4 y posiciones iniciales"
description: Estado inicial del motor con sala 20×20, jugador (4,4) con 6 MP, enemigo (15,15) con 4 MP y tests actualizados sin cambiar reglas.
task: TASK-0004
attempt: 1
status: stable
created_at: 2026-11-07T18:40:00Z
generated: { by: deepseek/v4.1-flash, at: 2026-11-07T18:40:00Z }
---

# Resumen

`createInitialState()` produce ahora la partida de REQ-002:

- rejilla 20×20 con muros en el borde y 18×18 casillas de suelo;
- jugador `player-1` en (4,4) con 20/20 HP y 6/6 MP;
- enemigo `enemy-1` en (15,15) con 10/10 HP y 4/4 MP.

Las reglas de movimiento, combate, turnos, IA y determinismo no cambian: solo se
ajustan las constantes de tamaño y MP (`src/game/types.ts`) y las posiciones
iniciales (`src/game/engine.ts`). El host, el render, el HUD y el layout no se han
tocado en producción. Los tests dependientes de dimensiones, posiciones o MP se
han actualizado y se ha añadido cobertura para las nuevas posiciones y MP
iniciales.

Estado: **done** en cuanto a implementación y pruebas ejecutadas. No se marca la
tarea como terminada ni se fusiona: la verificación independiente corresponde al
`task-lead`.

# Archivos

Modificados en producción (solo constantes):

- `src/game/types.ts` — `ROOM_WIDTH = 20`, `ROOM_HEIGHT = 20`,
  `PLAYER_MAX_MP = 6`, `ENEMY_MAX_MP = 4`. HP, daño y `MOVE_COST` intactos.
- `src/game/engine.ts` — `INITIAL_PLAYER_POSITION = (4,4)` y
  `INITIAL_ENEMY_POSITION = (15,15)`.

Tests modificados:

- `tests/unit/game/helpers.ts` — sala por defecto 20×20 y posiciones por defecto
  (4,4)/(15,15).
- `tests/unit/game/engine.test.ts` — 20×20, 400 tiles (324 de suelo, 76 de muro),
  bordes y esquinas reales (0,0)/(19,19), posiciones y MP iniciales, round-trip
  serializable y movimiento desde (4,4).
- `tests/unit/game/movement.test.ts` — enemigo lejano dentro de la sala, 6
  movimientos y rechazo del séptimo, diagonal con 5 MP restantes.
- `tests/unit/game/ai.test.ts` — la IA avanza una casilla con 4 MP y queda con 3;
  escenario determinista dentro de la sala.
- `tests/unit/game/turn.test.ts` — restauración a 6 MP del jugador y a 4 del
  enemigo; tras el movimiento enemigo quedan 3 MP y `mpLeft: 3`.
- `tests/unit/game/integration.test.ts` — MP final del loop actualizado a 5
  (explicado en desviaciones).
- `tests/unit/game/combat.test.ts` — vida/daño intactos; relleno fuera de la sala
  movido a (18,18); MP tras atacar y mover pasa a 5.
- `tests/unit/host/hud.test.ts` — `6/6` inicial y tras `EndTurn`, debug con (4,4),
  (15,15), límites (0,40) y evento `(4,4)→(5,4) MP 5`.
- `tests/unit/host/session.test.ts` — primer movimiento (4,4)→(5,4) con 5/6 MP;
  restauración a 6 tras `EndTurn`.
- `tests/unit/host/debug.test.ts` — snapshot con posiciones (4,4)/(15,15), límites
  (0,40) y movimiento a (5,4) con 5 MP.
- `tests/unit/host/camera.test.ts` — mundo 640×640, `maxX = 0`, `maxY = 40`,
  rangos visibles 20×19/20×20 y cobertura de centrado/clamp con un mundo
  sintético mayor.
- `tests/unit/host/renderer.test.ts` — cámara centrada en el enemigo (0,40) y
  umbrales exactos para 400 tiles.
- `tests/e2e/game-render.spec.ts` — 20×20, 400 tiles y cámara (0,0,0,40).
- `tests/e2e/game-input-hud.spec.ts` — HUD 6/6, movimiento 5/6 y 4/6, muro oeste
  a tres casillas del spawn, reinicio en (4,4), debug `(4, 4)` y derrota con la
  nueva economía.

Artefactos:

- `artifacts/TASK-0004/attempt-1/brief.md` — añadidos `title` y `description` de
  frontmatter (ver desviación 1).
- `artifacts/TASK-0004/attempt-1/test-output.txt`
- `artifacts/TASK-0004/attempt-1/report.md`
- `artifacts/TASK-0004/attempt-1/screenshots/` — `room-20x20.png`, `hud.png`,
  `attack.png`, `victory.png`, `defeat.png`, `debug.png`.

# Comandos, timeouts y resultados

| Comando | Timeout del tool | Resultado |
|---|---:|---|
| `pnpm run test` | 120 s | OK — 15 archivos, 107 tests, 0 fallos. |
| `pnpm run verify` | 180 s | OK — docs (46 documentos, 6 tareas), config, 107 tests y build. |
| `pnpm run test:e2e` | 240 s | OK — 3 tests (render, loop de input/HUD y shell de experimentos). |

La salida completa está en `artifacts/TASK-0004/attempt-1/test-output.txt`.
Playwright usó su `webServer` y lo cerró al terminar; se comprobó que no quedan
procesos escuchando en 4173 ni 5173.

# Commit

- `e8b56d3` — `feat(TASK-0004): use 20x20 room, 6/4 MP and initial positions`
- `c72fcb2` — `test(TASK-0004): update host and e2e expectations for the new room`
- Este informe y la evidencia se añaden en un commit de artefactos posterior para
  evitar la dependencia circular entre el SHA y el contenido del informe.

# Criterios de aceptación → evidencia

| Criterio | Test(s) / evidencia |
|---|---|
| Sala 20×20 con muros en el borde y suelo dentro. | `engine.test.ts`: dimensiones, 400 tiles, 324 de suelo, 76 de muro, bordes completos y (1,1)/(18,18) transitables. |
| Posiciones iniciales (4,4) y (15,15). | `engine.test.ts`: constantes y unidades iniciales; `debug.test.ts` y E2E comprueban el snapshot real. |
| Jugador 6/6 MP y enemigo 4/4 MP. | `engine.test.ts`: `mp`/`maxMp` y constantes; `hud.test.ts` y E2E muestran `6/6`. |
| Restauración de 6 MP al jugador y 4 al enemigo por turno. | `turn.test.ts`: jugador `0→6`; enemigo restaura 4 y tras mover queda en 3. |
| Coste 1 MP por casilla, también diagonal, sin corte de esquina. | `movement.test.ts`: diagonal deja 5 MP; seis movimientos con 6 MP y rechazo del séptimo; `corner-cut` y `wall` siguen cubiertos. |
| IA enemiga con 4 MP y determinista. | `ai.test.ts`: una casilla por fase y `mp: 3`; mismo estado produce el mismo plan. |
| Vida y daño intactos (20/10, 5/3). | `combat.test.ts` y `hud.test.ts` sin cambios de expectativas de HP/daño. |
| Estado serializable y `window.__game` sin cambio de forma. | `engine.test.ts` (round-trip JSON + `Move`), `debug.test.ts` (snapshot serializable, copia, `dispatch`) y E2E sobre el snapshot real. |
| Tests actualizados sin borrar, saltar ni debilitar. | 107 tests (106 previos + 1 de límites de cámara para la sala 20×20); sin `.skip`, `.todo` ni `.only`; los umbrales de renderer pasan de `>=` a recuentos exactos. |
| `pnpm run verify` pasa. | `pnpm run verify` exit 0; salida en `test-output.txt`. |

# Evidencia E2E

- HUD inicial: `20/20`, `6/6`, acción `Sí`, fase `Jugador`, enemigo `10/10`.
- Movimiento real: `ArrowRight` deja `5/6`; `d` deja `4/6`.
- Muro oeste: desde (4,4), tres pulsaciones llegan a (1,4) con `3/6` y la cuarta
  no cambia posición ni MP.
- Ataque sin objetivo: snapshot y HUD intactos, sin errores de consola.
- Ataque adyacente y feedback: enemigo `10→5`, `-5`, flash activo.
- Fin de turno: ataque enemigo de 3, jugador restaurado a `6/6`, turno siguiente.
- Victoria, reinicio (4,4)/6 MP, debug `(4, 4)` y `MP 6/6`.
- Derrota determinista dentro del límite de 80 turnos y reinicio por botón.

# Desviaciones y decisiones menores

1. **Frontmatter del brief.** `pnpm run verify` fallaba antes de tocar código
   porque `artifacts/TASK-0004/attempt-1/brief.md` no tenía `title` ni
   `description`, y `scripts/validate-docs.mjs` exige `title` en todos los
   documentos OKF. Se añadieron esos dos metadatos sin cambiar objetivo,
   criterios, restricciones ni contenido. Sin este arreglo, el criterio «verify
   pasa» era inalcanzable aun con el código correcto.
2. **MP final de integración: 5, no 4.** El brief estimaba `6 − 2 movimientos =
   4`, pero el escenario intercala `EndTurn` entre los dos movimientos: turno 1
   mueve (6→5), ataca y termina; el `EndTurn` restaura a 6; turno 2 mueve (6→5) y
   remata. El valor correcto y comprobado es 5. Se dejó un comentario en el test.
   No se cambió el escenario para forzar el 4.
3. **Cámara con mundo sintético.** En la sala real 20×20 el mundo mide 640×640 y
   el viewport 960×600, así que `maxX = 0`: la cámara nunca se mueve en
   horizontal. Para conservar la cobertura de centrado sin clamp y de las cuatro
   esquinas se usa un mundo sintético 40×30 (`1280×960`) en esos casos. Los
   límites reales de la sala (`maxX = 0`, `maxY = 40`), el spawn y el rango
   visible se siguen comprobando contra 20×20.
4. **Renderer con recuentos exactos.** Con 20×20 y viewport 960×600 se dibujan 20
   columnas × 19 filas = 380 tiles (324 de suelo y 56 de muro) más 2 unidades. Los
   umbrales `>= 500`/`> 400` se sustituyen por `382`/`324`/`56`, más estrictos que
   antes, no más débiles.
5. **E2E de input/HUD también actualizado.** El brief solo listaba
   `game-render.spec.ts`, pero `game-input-hud.spec.ts` hardcodea spawn, MP y el
   muro oeste; sin actualizarlo la suite E2E no podía pasar. No se añadió
   cobertura E2E nueva: solo se mantuvieron las aserciones existentes.
6. **Capturas históricas.** El E2E existente escribe en
   `artifacts/TASK-0002/...` y `artifacts/TASK-0003/...`. Las capturas de esta
   ejecución se copiaron a `artifacts/TASK-0004/attempt-1/screenshots/` y las
   rutas históricas se revirtieron para no modificar artefactos de tareas
   anteriores.

# Confirmación de alcance

- No se han modificado reglas de movimiento, combate, turnos, IA ni orden de
  acciones.
- No se ha tocado código de producción del host, render, HUD ni layout.
- No se ha modificado `window.__game` ni la forma del snapshot.
- No se ha adelantado TASK-0005 (encuadre/viewport) ni TASK-0006 (playtest).
- No se han borrado, saltado ni debilitado tests: 107 tests frente a los 106
  previos; sin `.skip`, `.todo` ni `.only`.
- No se han añadido dependencias.
- No se ha editado `docs/` ni `experiment.md`.
- No se ha fusionado nada ni se ha marcado TASK-0004 como `done`.

# Preguntas abiertas

- Ninguna bloqueante. La corrección del `title`/`description` del brief debería
  incorporarla el `task-lead` en su plantilla de briefs para que `pnpm run verify`
  pase sin retoques del runner.
