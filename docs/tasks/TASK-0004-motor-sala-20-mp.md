---
type: Task
id: TASK-0004
title: "Motor: sala 20×20, MP 6/4 y posiciones iniciales"
description: Ajusta el estado inicial del motor a la sala 20×20, 6 MP de jugador, 4 de enemigo y posiciones (4,4)/(15,15).
status: stable
task_status: ready
task_type: feature
requirement: REQ-002
requirement_ids: [R-008, R-009, R-011, T-004]
depends_on: [TASK-0003]
unlocks: [TASK-0005]
created_at: 2026-11-07T17:10:00Z
completed_at:
assignee: task-runner
attempts: 0
artifacts: artifacts/TASK-0004/
priority: P1
risk: medium
review_required: true
generated: { by: deepseek/v4.1-flash, at: 2026-11-07T17:10:00Z }
verified:
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

- [ ] `ROOM_WIDTH` y `ROOM_HEIGHT` valen 20 y la rejilla generada mide 20×20
      con muros en el borde y suelo transitable dentro.
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

- [ ] Informe en `artifacts/TASK-0004/attempt-1/report.md`
- [ ] Salida de tests en `artifacts/TASK-0004/attempt-1/test-output.txt`
- [ ] Commit SHA en la rama `task/TASK-0004`

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
