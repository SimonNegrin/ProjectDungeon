---
type: Task Brief
title: "TASK-0046: brief del intento 2"
description: Corrige la regresión de armas del default growth reutilizando la colocación determinista existente.
task: TASK-0046
attempt: 2
status: stable
brief_bytes: 2380
read_detail: false
generated: { by: deepseek/v4.1-flash, at: 2026-11-09T17:05:00Z }
---

# Motivo del relanzamiento

La verificación del intento 1 encontró una regresión: `createInitialState()` ya
usa growth, pero su `GeneratedMap` no trae `weapons`. Los tests de armas se
redirigieron a BSP en vez de preservar el comportamiento por defecto. REQ-010
R-005 y TASK-0027 siguen exigiendo hacha y daga en el mapa; REQ-011 R-008 exige
huecos de spawn fuera de armas y TASK-0045 reserva la salida de armas.

Hipótesis: reutilizar la colocación determinista existente (`placeMapWeapons`)
con celdas bloqueadas opcionales restaura las 2 armas sin cambiar BSP ni los
valores creativos.

# Objetivo

Que el mapa growth incluya exactamente las 2 armas del catálogo en celdas de
sala alcanzables, deterministas y fuera de spawn, puertas, salida y enemigos. El
estado por defecto debe exponerlas y `PickUp` debe funcionar. BSP conserva su
colocación y sus tests.

# Invariantes

- Sin cambios en valores aprobados, bestiario, IA, combate ni host.
- Sin `Math.random`, relojes, DOM ni estado global; misma semilla ⇒ mismas
  armas y mismo mapa profundo.
- Las armas existentes (`axe`, `dagger`) se colocan en salas no-spawn distintas,
  sobre suelo, alcanzables y serializables.
- No se solapan con `spawns.party`, puertas, `exit.position`/`exit.access` ni
  ningún `map.enemies`.
- `validateGrowthMap` debe comprobar el contrato de armas con al menos un caso
  positivo y uno negativo.
- No borrar, saltar ni debilitar tests; `pnpm run verify` pasa.

# Criterios de aceptación

Viven en
`docs/tasks/TASK-0046-motor-variante-growth-defecto.md#criterios-de-aceptación`;
enlazar, no copiar. Este intento añade la conservación de armas como condición
de no regresión.

# Contexto mínimo

- `src/game/map.ts`: `placeMapWeapons`, `MAP_WEAPON_SPECS`, `MapWeapon`.
- `src/game/chambers/variants/growth.ts`: composición y `validateGrowthMap`.
- `src/game/engine.ts`: consume `map.enemies`; `PickUp` ya lee `map.weapons`.
- Tests de armas actuales: `tests/unit/host/{equipment-integration,hud,debug,renderer}.test.ts`.

# Artefactos

- `report.md`, `test-output.txt`, `verify-output.txt`, `growth-perf.txt`,
  `weapon-regression.txt`, `git-diff-stat.txt`.

# Restricciones

- No toques `src/host/`, `index.html` ni dependencias. No cambies BSP salvo una
  extensión aditiva de `placeMapWeapons` si hace falta.
- No inventes un sistema de armas nuevo: reutiliza el existente.
- Mantén el validador BSP intacto; amplía solo el de growth.
