---
type: Task Brief
title: "Brief — TASK-0004: motor con sala 20×20, MP 6/4 y posiciones iniciales"
description: "Alcance, criterios, restricciones y comandos para ejecutar TASK-0004."
id: TASK-0004-attempt-1
task: TASK-0004
attempt: 1
created_at: 2026-11-07T18:10:00Z
generated: { by: deepseek/v4.1-flash, at: 2026-11-07T18:10:00Z }
---

# Brief — TASK-0004: motor con sala 20×20, MP 6/4 y posiciones iniciales

## Estado de partida

- Rama de trabajo: `task/TASK-0004` (ya creada desde `main`).
- `TASK-0003` está `done`; la dependencia se cumple.
- `REQ-002` está aprobada y estable. No hay decisiones creativas abiertas.
- No cambies requisitos, criterios de aceptación ni alcance.

## Objetivo

Que `createInitialState()` produzca la partida de `REQ-002`: rejilla 20×20 con
muros en el borde, jugador en (4,4) con 6/6 MP, enemigo en (15,15) con 4/4 MP.
Las reglas de movimiento, combate, turnos, IA y determinismo deben quedar
intactas.

## Contexto mínimo

- Requisito: `docs/requirements/REQ-002-encuadre-16-9.md` (R-008, R-009, R-011,
  T-004).
- Economía: `docs/design/turn-economy.md`.
- Arquitectura: `docs/design/architecture.md`.
- Tarea: `docs/tasks/TASK-0004-motor-sala-20-mp.md`.
- Código afectado: `src/game/types.ts` (constantes), `src/game/engine.ts`
  (posiciones iniciales). `src/game/grid.ts` ya genera muros de borde: no hace
  falta cambiar su comportamiento.
- El host (`src/host/`) no debe cambiar en producción. Los tests del host solo
  se actualizan donde dependan de las dimensiones, posiciones o MP iniciales.
- `TASK-0005` cambiará el encuadre y el viewport; **no** adelantes ese trabajo.

## Criterios de aceptación (copiados de la tarea)

- [ ] `ROOM_WIDTH` y `ROOM_HEIGHT` valen 20 y la rejilla generada mide 20×20 con
      muros en el borde y suelo transitable dentro.
- [ ] `INITIAL_PLAYER_POSITION` es (4,4) y `INITIAL_ENEMY_POSITION` es (15,15).
- [ ] El jugador empieza con 6/6 MP y el enemigo con 4/4 MP.
- [ ] Al empezar un turno se restauran 6 MP al jugador y 4 al enemigo.
- [ ] El coste de movimiento sigue siendo 1 MP por casilla, también en diagonal,
      sin corte de esquina.
- [ ] La IA enemiga usa los 4 MP y sigue siendo determinista.
- [ ] Vida y daño no cambian: jugador 20, enemigo 10, ataque 5, daño enemigo 3.
- [ ] El estado sigue siendo serializable y `window.__game` no cambia de forma.
- [ ] Los tests unitarios y de integración se actualizan a las nuevas
      dimensiones y valores; no se borran, saltan ni debilitan tests.
- [ ] `pnpm run verify` pasa.

## Archivos y expectativas que hay que revisar

Actualiza solo lo necesario; conserva la cobertura existente y añade tests
unitarios para las posiciones y MP iniciales si no quedan cubiertos.

- `src/game/types.ts`: `ROOM_WIDTH = 20`, `ROOM_HEIGHT = 20`,
  `PLAYER_MAX_MP = 6`, `ENEMY_MAX_MP = 4`. Vida y daño no cambian.
- `src/game/engine.ts`: `INITIAL_PLAYER_POSITION = (4,4)`,
  `INITIAL_ENEMY_POSITION = (15,15)`.
- `tests/unit/game/engine.test.ts`: 20×20, 400 tiles, bordes en (0,0)/(19,19),
  posiciones y MP iniciales, round-trip serializable y movimiento desde (4,4).
- `tests/unit/game/helpers.ts`: sala por defecto 20×20; valora alinear las
  posiciones por defecto con (4,4)/(15,15). Revisa cualquier escenario que use
  coordenadas fuera de la nueva sala (por ejemplo 20,20 o 29,21).
- `tests/unit/game/movement.test.ts`: 6 MP, diagonal con 5 MP restantes, seis
  movimientos y rechazo del séptimo; enemigo lejano dentro de la sala.
- `tests/unit/game/ai.test.ts`: la IA mueve una casilla con 4 MP y queda con 3.
- `tests/unit/game/turn.test.ts`: restauración a 6 MP del jugador y 4 del
  enemigo; tras un movimiento enemigo quedan 3 MP y `mpLeft: 3`.
- `tests/unit/game/integration.test.ts`: el loop mantiene victoria/derrota y
  determinismo; actualiza el MP final esperado (6 − 2 movimientos = 4 si el
  escenario conserva dos movimientos).
- `tests/unit/game/combat.test.ts`: vida/daño intactos; ajusta posiciones de
  relleno que queden fuera de la sala 20×20.
- `tests/unit/host/hud.test.ts`: MP inicial 6/6, posiciones de debug (4,4) y
  (15,15).
- `tests/unit/host/session.test.ts`: primer movimiento desde (4,4) a (5,4) con
  5/6 MP; restauración a 6 tras `EndTurn`.
- `tests/unit/host/debug.test.ts`: posiciones del snapshot (4,4)/(15,15) y MP
  coherente; el resto de la forma del snapshot no cambia.
- `tests/unit/host/camera.test.ts`: usa el tamaño de sala. Actualiza el mundo y
  la rejilla a 20×20 y recalcula expectativas con el viewport actual 960×600
  (mundo 640×640; `maxX = 0`, `maxY = 40`). Conserva la cobertura de centrado,
  clamp y rango visible; puedes usar un mundo sintético mayor para los casos de
  centrado sin clamp.
- `tests/unit/host/renderer.test.ts`: posiciones iniciales, cámara centrada en
  el enemigo (15,15) y umbrales de dibujo acordes a una sala de 400 tiles.
- `tests/e2e/game-render.spec.ts`: actualiza dimensiones (20×20, 400 tiles),
  límites de cámara (`maxX: 0`, `maxY: 40`) y lo que dependa de las posiciones
  iniciales. No añadas cobertura E2E nueva; esta tarea solo mantiene la suite.
  El canvas sigue siendo 960×600 en esta tarea.

No toques documentos históricos de `REQ-001` ni cambies la forma de
`window.__game`.

## Restricciones

- No cambies reglas de movimiento, combate, turnos, IA ni orden de acciones.
- No toques layout, render, HUD ni código de producción del host.
- No introduzcas dependencias nuevas.
- No modifiques la semántica de comandos, eventos ni rechazos.
- No borres, saltes, marques como `skip`/`todo` ni debilites tests.
- No cambies el alcance ni los criterios de la tarea.
- No adelantes `TASK-0005` ni `TASK-0006`.

## Comandos y timeouts

Usa siempre `pnpm`, nunca `npm` ni `npx`. Ejecuta cada comando con timeout
explícito del tool (macOS no trae el binario `timeout` de coreutils):

| Comando | Timeout | Qué valida |
|---|---:|---|
| `pnpm run test` | 120 s | Unitarios e integración |
| `pnpm run verify` | 180 s | Docs + config + tests + build |
| `pnpm run test:e2e` | 240 s | Loop existente sin regresiones |

Si un comando agota el timeout: para el proceso, guarda la salida y devuelve
`blocked` con evidencia. No repitas el mismo comando sin una hipótesis nueva.
Playwright usa su `webServer`; no dejes servidores ni procesos en background.

## Artefactos y entrega

Guarda en `artifacts/TASK-0004/attempt-1/`:

- `report.md`: estado (`done`/`blocked`), cambios, comandos con timeout y
  resultado, commit SHA, desviaciones y preguntas abiertas.
- `test-output.txt`: salida resumida de `pnpm run test`, `pnpm run verify` y
  `pnpm run test:e2e` (incluye fallos completos si los hay).

Haz commits pequeños en `task/TASK-0004` con el ID de tarea. No fusiones ni
marques la tarea como `done`: eso lo hace `task-lead` tras verificar.

## Qué debe devolver el runner

1. Estado: `done` o `blocked`.
2. Lista de archivos modificados.
3. SHA del último commit en la rama.
4. Resultado de cada comando con su timeout.
5. Confirmación explícita de que no se han borrado, saltado ni debilitado tests.
6. Desviaciones respecto al brief y cualquier duda.
