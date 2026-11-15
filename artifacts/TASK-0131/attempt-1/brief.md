---
type: Task Brief
title: "TASK-0131: brief del intento 1"
description: Muerte de jugador, cadáver contenedor y unidad muerta estable.
task: TASK-0131
attempt: 1
status: stable
brief_bytes: 2469
read_detail: true
generated: { by: deepseek/v4.1-flash, at: 2026-11-15T12:00:00Z }
---

# Objetivo

Que al morir un jugador se cree en su casilla un `Container` de cadáver con todo
su equipo y mochila, se vacíe la unidad conservando su identidad y `hp: 0`, y el
estado/snapshot expongan ambos de forma serializable. El cadáver no bloquea y
persiste aunque se vacíe.

# No objetivos

- Fantasma, turno, comandos o MP del muerto: TASK-0132.
- Cadáver de enemigo, filtro `lootable` y descarte: TASK-0133.
- Resurrección: TASK-0148. Saqueo, panel, render o guardado: tareas posteriores.
- Cambiar RNG, saqueabilidad, coste de acciones, combate de vivos, IA o mapa.

# Invariantes

- `hp === 0` sigue siendo la señal de unidad muerta (`isAlive` no cambia).
- La unidad muerta permanece en `players` con el mismo `id` y sus campos de
  identidad; no se crea una lista paralela.
- Solo los jugadores generan cadáver en esta tarea; un enemigo muerto queda
  exactamente como hoy.
- Sin eventos nuevos: se conserva `UnitDied` y el orden actual de eventos.
- `src/game` puro: sin DOM, sin `src/host`, sin red, sin `Math.random`.
- No borrar, saltar ni debilitar tests existentes.

# Criterios de aceptación

`docs/tasks/TASK-0131-motor-muerte-jugador-cadaver-contenedor.md#criterios-de-aceptación`.

# Contexto mínimo

- `src/game/inventory.ts`: `Container`, `ItemInstance`, `EquipmentSlots`,
  `emptyEquipment()`.
- `src/game/combat.ts`: `resolveAttack`, ramas `targetHp === 0` y réplica.
- `src/game/magic.ts`: rama de daño con `targetHp === 0` (hoy solo enemigos).
- `src/game/grid.ts`: `isAlive` e `isOccupied`.
- `src/game/types.ts`, `src/game/index.ts`.
- `src/host/debug.ts`: el snapshot ya clona `containers` y unidades.
- REQ-021 R-001/R-009/R-010/T-001; REQ-034 R-007/R-009.
- Tests: `tests/unit/game/{inventory,engine,combat,helpers}.test.ts`.
- Contrato técnico cerrado en `brief-detalle.md`: leerlo antes de editar.

# Artefactos

`report.md`, `test-output.txt`, `verify-output.txt`, `commit.txt`; sin capturas.

# Riesgos y decisiones abiertas

- La ampliación de `Container` debe ser aditiva y no romper cofres ni fixtures.
- Si aparece una duda que cambie reglas de REQ-021/REQ-034, devolver `blocked`.
- Timeouts: tests 120 s; `pnpm run verify` 240 s.
