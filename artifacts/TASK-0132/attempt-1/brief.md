---
type: Task Brief
title: "TASK-0132: brief del intento 1"
description: Fantasma controlable con casilla compartida, MP intrínseco y una acción.
task: TASK-0132
attempt: 1
status: stable
brief_bytes: 2128
read_detail: true
generated: { by: deepseek/v4.1-flash, at: 2026-11-15T16:10:00Z }
---

# Objetivo

Convertir al jugador muerto en un fantasma controlable: comparte casilla, no
bloquea ni es objetivo, se mueve con su MP intrínseco y dispone de una acción por
ronda limitada a recoger, soltar e inspeccionar contenedores.

# No objetivos

- Resurrección y devolución de objetos: TASK-0148.
- Turno por jugador, `EndTurn` por índice y fase enemiga: TASK-0146.
- Cadáver de enemigo, botín o descarte: TASK-0133. Panel, render, HUD, avisos,
  guardado y puertas: tareas posteriores.
- Cambiar RNG, `lootable`, costes de vivos, turnos, combate, IA o mapa.

# Invariantes

- `hp === 0` sigue siendo la única señal de muerte; `isAlive` no cambia.
- Un vivo, un muerto sin fantasma y un fantasma son estados distintos sin listas
  paralelas ni pérdida de identidad.
- `src/game` puro y serializable: sin DOM, sin `src/host`, sin red, sin
  `Math.random`.
- No borrar, saltar ni debilitar tests. No cambiar reglas de producto.

# Criterios de aceptación

`docs/tasks/TASK-0132-motor-fantasma-turno-mp-accion.md#criterios-de-aceptación`.

# Contexto mínimo

- `src/game/{types,grid,death,movement,path,actions,turn,engine,inventory}.ts`.
- `src/game/{combat,perception,ai,magic}.ts` para no romper objetivos ni daño.
- Tests: `tests/unit/game/{actions,movement,path,perception,death,engine,turn}.test.ts`
  y `helpers.ts`.
- REQ-021 R-002 a R-007 y T-002 a T-005; REQ-026 R-010/R-011; REQ-034 R-006/T-006.
- Contrato técnico cerrado en `brief-detalle.md`: leerlo antes de editar.

# Artefactos

`report.md`, `test-output.txt`, `verify-output.txt`, `commit.txt`; sin capturas.

# Riesgos y decisiones abiertas

- El detalle fija representación, costes y allowlist. Si algo choca con REQ-034 o
  exige una regla nueva, devolver `blocked` con la evidencia.
- Timeouts: tests focalizados 120 s; `pnpm run verify` 240 s.
