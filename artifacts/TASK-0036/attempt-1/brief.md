---
type: Task Brief
title: "TASK-0036: brief del intento 1"
description: Colocación determinista de 4 enemigos desde el mapa y la semilla.
task: TASK-0036
attempt: 1
status: stable
brief_bytes: 2717
read_detail: false
generated: { by: deepseek/v4.1-flash, at: 2026-11-08T21:20:00Z }
---

# Objetivo

Que `createInitialState` genere exactamente 4 enemigos (2 centinelas, 1 bruto y
1 cobarde) desde el mapa BSP y la semilla: salas distintas, sin visión inicial,
distancias mínimas, una pareja a ≤8 tiles y un enemigo a >8 de los demás.
`home` = posición inicial. Determinista y sin `Math.random`.

# No objetivos

Los de [TASK-0036](../../../docs/tasks/TASK-0036-motor-colocacion-cuatro-enemigos.md#no-objetivos):
nada de alarma/huida/IA, host, combate, bestiario, economía, dependencias ni
posiciones fijas.

# Invariantes

- `src/game/` puro y serializable; sin DOM, Canvas, red ni relojes.
- No consumir el RNG del BSP ni el de combate: `mulberry32` derivado de
  `map.seed` con sal propia, como `placeMapWeapons`.
- Chebyshev para alarma y distancias. Semilla de referencia `279837264`; otra
  semilla también cumple.

# Criterios de aceptación

Viven en [TASK-0036](../../../docs/tasks/TASK-0036-motor-colocacion-cuatro-enemigos.md#criterios-de-aceptación).
Enlazar; no copiar. Requisito:
[REQ-009 R-010/T-007](../../../docs/requirements/REQ-009-percepcion-alarma-huida.md#requisitos-creativos).

# Contexto mínimo

- `src/game/engine.ts`: `buildInitialState`, `createEnemy`, `createInitialState`.
- `src/game/map.ts`/`bsp.ts`: `GeneratedMap`, `rooms`, `doors`, `spawns`,
  `placeMapWeapons`. Referencia: 9 salas, jugador `(6,8)`, `spawns.enemy`
  `(23,28)`.
- `src/game/bestiary.ts`: `sentinel|brute|coward`. `src/game/perception.ts`:
  `canSee`. Tests en `tests/unit/game/`; E2E en `tests/e2e/` (varios asumen 1
  enemigo).

Decisiones del lead: celdas de suelo de salas, alcanzables, sin puerta, spawn del
jugador, arma ni otra unidad; mínimo 2 Chebyshev entre enemigos y 7 al jugador
(visión máxima 6 + 1). Conserva `map.spawns.enemy` como ancla de `enemy-1` si
cumple. Ids `enemy-1..4`.

# E2E

Ajusta solo número/posición, sin borrar, saltar ni debilitar: conserva victoria,
derrota y combate; si hace falta, derrota a los 4 con comandos reales. Si no se
puede sin salir del alcance, devuelve `blocked`.

# Artefactos

`report.md`, `test-output.txt`, `verify-output.txt`, `e2e-output.txt`,
`diff-stat.txt`, `snapshots/` si aplica. Commit SHA en `task/TASK-0036`.

# Riesgos y decisiones abiertas

- Otra semilla sin combinación válida: búsqueda determinista y fallback
  documentado; no relajar restricciones.
- Victoria con 4 enemigos: mantener la intención de los E2E, no eliminarla.
