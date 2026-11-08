---
type: Task Brief
title: "TASK-0027: brief del intento 1"
description: Armas de mapa deterministas, recogida con G y cambio gratuito con 1-3.
task: TASK-0027
attempt: 1
status: stable
brief_bytes: 2968
read_detail: false
generated: { by: deepseek/v4.1-flash, at: 2026-11-08T18:20:00Z }
---

# Objetivo

Añadir hacha y daga deterministas en salas distintas, recogida con `G` (1 MP,
sin acción) y cambio entre tres armas con `1`-`3` (gratis), sin HUD ni dibujo.

# No objetivos

- HUD, dibujo, pista de `G`, feedback (`TASK-0029`); E2E visual (`TASK-0030`);
  bestiario, percepción o huida (`TASK-0028`).
- Cuarta arma, loot, comercio, durabilidad, peso o inventario completo.
- Cambiar fórmulas, turnos, victoria/derrota ni el mapa más allá de las armas.

# Invariantes

- `src/game/` puro: sin DOM, red, relojes ni `Math.random`; estado y snapshot
  serializables, `reduce` no muta la entrada.
- La semilla `279837264` conserva spawns `(6,8)`/`(23,28)`, salas, puertas y
  secuencia de combate: los E2E fijan esos valores. Deriva las armas con un PRNG
  propio sin consumir ni reordenar el RNG del generador ni el de combate.
- Jugador inicial: espada, armadura 1, escudo 1, `weapons: ['sword']`; el enemigo
  no recoge ni cambia de arma.
- `G` solo sobre el arma del tile, exige 1 MP, no gasta acción, auto-equipa y la
  elimina; repetir no duplica; con 0 MP se rechaza.
- `1`-`3` cambia sin MP ni acción; tres huecos; la cuarta se rechaza.

# Criterios de aceptación

[docs/tasks/TASK-0027-equipo-armas-mapa-recogida.md](../../../docs/tasks/TASK-0027-equipo-armas-mapa-recogida.md#criterios-de-aceptación).
Requisito: [REQ-010](../../../docs/requirements/REQ-010-combate-equipo-acierto-defensa.md#requisitos-creativos)
R-003 a R-006 y T-003/T-004/T-007.

# Contexto mínimo

- `src/game/types.ts` (`Unit`, `GameState`, `Command`, `RejectionReason`,
  `GameEvent`), `engine.ts` (`reduce` y estado inicial), `equipment.ts` (IDs),
  `map.ts`/`bsp.ts` (`GeneratedMap`, salas, puertas, spawns).
- `src/host/input.ts` (`translateKey`, `isManagedKey`). Toca `src/host` solo
  para mapear `G`, `1`, `2` y `3`; no toques HUD, renderer, debug ni snapshot.
- Tests: `map.test.ts`, `engine.test.ts`, `helpers.ts`, `input.test.ts`,
  `session.test.ts`. Filtra con `pnpm exec vitest run <archivos>`.
- Usa BFS (`floorDistances`) para alcance y para excluir muros, puertas, spawns
  y la sala inicial.

# Artefactos

`artifacts/TASK-0027/attempt-1/report.md`, salidas de test/verify/e2e.

# Riesgos y decisiones abiertas

- Colocación determinista y reintentable que cumpla todas las exclusiones en la
  semilla de referencia y al menos otra; si un mapa no admitiera dos salas
  válidas, documéntalo con evidencia sin debilitar la restricción.
- El estado (incluidas las armas del mapa) debe ser serializable y de solo
  lectura; reinicio y `F2` las reconstruyen desde la semilla. El snapshot queda
  para `TASK-0029`. Ejecuta `pnpm run test:e2e`: tocas el input.
