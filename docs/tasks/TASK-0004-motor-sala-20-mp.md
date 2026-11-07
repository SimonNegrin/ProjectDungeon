---
type: Task
id: TASK-0004
title: "Motor: sala 20×20, MP 6/4 y posiciones iniciales"
description: Ajusta el estado inicial del motor a la sala 20×20, 6 MP de jugador, 4 de enemigo y posiciones (4,4)/(15,15).
status: stable
task_status: done
task_type: feature
requirement: REQ-002
requirement_ids: [R-008, R-009, R-011, T-004]
depends_on: [TASK-0003]
unlocks: [TASK-0005]
created_at: 2026-11-07T17:10:00Z
completed_at: 2026-11-07T18:55:00Z
assignee: task-runner
attempts: 1
artifacts: artifacts/TASK-0004/
priority: P1
risk: medium
review_required: true
generated: { by: deepseek/v4.1-flash, at: 2026-11-07T17:10:00Z }
verified: { by: task-lead, at: 2026-11-07T18:55:00Z }
---

# Objetivo

Que `createInitialState()` produzca la partida de `REQ-002`: rejilla 20×20 con
muros en el borde, jugador en (4,4) con 6 MP, enemigo en (15,15) con 4 MP, sin
cambiar las reglas de movimiento, combate, turnos ni IA.

# Contexto

- Requisito: [REQ-002](../requirements/REQ-002-encuadre-16-9.md).
- Economía: [turn-economy](../design/turn-economy.md).
- Código: `src/game/types.ts`, `src/game/engine.ts`, `src/game/grid.ts`.
- Tests: `tests/unit/game/` y `tests/unit/host/camera.test.ts` si usa el tamaño
  de sala.
- Base verificada: TASK-0001 a TASK-0003 (`REQ-001`).

# Criterios de aceptación

- [x] `ROOM_WIDTH` y `ROOM_HEIGHT` valen 20 y la rejilla generada mide 20×20
      con muros en el borde y suelo transitable dentro.
- [x] `INITIAL_PLAYER_POSITION` es (4,4) y `INITIAL_ENEMY_POSITION` es (15,15).
- [x] El jugador empieza con 6/6 MP y el enemigo con 4/4 MP.
- [x] Al empezar un turno se restauran 6 MP al jugador y 4 al enemigo.
- [x] El coste de movimiento sigue siendo 1 MP por casilla, también en diagonal,
      sin corte de esquina.
- [x] La IA enemiga usa los 4 MP y sigue siendo determinista.
- [x] Vida y daño no cambian: jugador 20, enemigo 10, ataque 5, daño enemigo 3.
- [x] El estado sigue siendo serializable y `window.__game` no cambia de forma.
- [x] Los tests unitarios y de integración se actualizan a las nuevas
      dimensiones y valores; no se borran, saltan ni debilitan tests.
- [x] `pnpm run verify` pasa.

# Plan de test

- **Unitario:** estado inicial (dimensiones, posiciones, HP/MP), restauración de
  MP por turno, movimiento con 6 MP, IA con 4 MP y límites (0, 19).
- **Integración:** loop mover → atacar → terminar turno → fase enemiga con la
  nueva economía; victoria y derrota siguen funcionando.
- **E2E:** no se añade cobertura nueva aquí; se comprueba que la suite existente
  sigue pasando con los valores actualizados.
- **Manual:** no aplica en esta tarea; el playtest llega en TASK-0006.

# Comandos y timeouts

| Comando | Timeout | Qué valida |
|---|---:|---|
| `pnpm run test` | 120 s | Unitarios e integración del motor |
| `pnpm run verify` | 180 s | Docs, config, tests y build |
| `pnpm run test:e2e` | 240 s | Que el loop existente no regresa |

# Evidencia esperada

- [x] Informe en `artifacts/TASK-0004/attempt-1/report.md`
- [x] Salida de tests en `artifacts/TASK-0004/attempt-1/test-output.txt`
- [x] Commit SHA en la rama `task/TASK-0004`

# Verificación

- `task-lead` revisó el diff completo de `task/TASK-0004`: solo cambian dos
  archivos de producción (`src/game/types.ts` y `src/game/engine.ts`) en
  constantes de sala, MP y posiciones. `src/host/`, `docs/`, `index.html`,
  configuración, dependencias y lockfile no cambian. Los tests del host solo se
  actualizan donde dependían de las dimensiones, posiciones o MP iniciales.
- `pnpm run verify` re-ejecutado de forma independiente: docs (46 documentos, 6
  tareas), config, 107 tests y build OK.
- `pnpm run test:e2e` re-ejecutado: 3 tests OK (render, loop de input/HUD y shell
  de experimentos). Los puertos 4173 y 5173 quedaron libres.
- Criterios comprobados: rejilla 20×20 con 400 tiles (18×18 de suelo), bordes en
  (0,0)/(19,19), jugador (4,4) con 6/6 MP, enemigo (15,15) con 4/4 MP,
  restauración 6/4 por turno, coste 1 MP también en diagonal, sin corte de
  esquina, IA determinista con 4 MP, vida/daño 20/10 y 5/3, y estado
  serializable con la misma forma de `window.__game`.
- No se han borrado, saltado ni debilitado tests: 107 tests frente a 106 previos
  (+1 de límites de la sala 20×20); sin `.skip`, `.todo` ni `.only`. Los
  umbrales del renderer pasan de desigualdades a recuentos exactos (382 draws,
  324 suelos, 56 muros) y la cámara conserva la cobertura de centrado/clamp con
  un mundo sintético mayor, además de los límites reales de la sala.
- Capturas revisadas: la sala muestra 20×20 con el jugador en (4,4); el HUD
  muestra 6/6; el overlay de debug muestra (4,4), (15,15), MP 6/6 y límites de
  cámara (0,40) con viewport 960×600.
- La re-ejecución del E2E regenera capturas históricas de `TASK-0002` y
  `TASK-0003`; se restauraron para no alterar sus artefactos. Las capturas de
  esta tarea quedan en `artifacts/TASK-0004/attempt-1/screenshots/`.
- Desviaciones menores aceptadas: se añadió `title`/`description` al frontmatter
  del brief para que `docs:check` lo valide; el MP final de integración es 5
  porque el escenario intercala `EndTurn` y restaura MP; `game-input-hud.spec.ts`
  también se actualizó porque hardcodeaba spawn, MP y muro oeste.
- Commit de implementación: `e8b56d3`. Commit de tests: `c72fcb2`. Último commit
  de la rama: `f980d30`. Pendiente: `TASK-0005` (encuadre 16:9) y `TASK-0006`
  (E2E/QA visual y playtest).

# Restricciones

- No cambiar reglas de movimiento, combate, turnos, IA ni orden de acciones.
- No tocar el layout, el render ni el HUD; eso es TASK-0005.
- No introducir dependencias nuevas.
- No modificar la semántica de comandos, eventos ni rechazos.

# No objetivos

- Encuadre 16:9, viewport 12×12 o paneles laterales.
- Cambios de HUD o feedback.
- Balance fino, clases, objetos o progresión.
- Hotseat, red o persistencia.

# Notas

- Los tests de límites deben usar las esquinas reales de la sala 20×20: (0,0) y
  (19,19).
- Revisar cualquier expectativa hardcodeada de 32×24, 4 MP o 3 MP en tests y
  documentación de la tarea; no tocar documentos históricos de `REQ-001`.
- El `task-lead` debe marcar esta tarea como `ready` solo cuando TASK-0003 esté
  `done`.
