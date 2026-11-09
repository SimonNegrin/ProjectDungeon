---
type: Task Brief
title: "TASK-0045: brief del intento 1"
description: Spawn protegido, reparto de enemigos y salida compartidos en el core; BSP adopta el spawn sin salida.
task: TASK-0045
attempt: 1
status: stable
brief_bytes: 3600
read_detail: true
generated: { by: deepseek/v4.1-flash, at: 2026-11-09T16:30:00Z }
---

# Objetivo

Que `src/game/chambers/core/` seleccione la sala de spawn más protegida y 6
huecos alrededor del acceso, reparta enemigos por superficie y jugadores con
interiores, componentes ≤2 y emboscadas al 0,25, y elija una salida única a
distancia de grafo ≥2. BSP usa el mismo contrato de spawn (sala protegida, 6
huecos, sin enemigos ni visión inicial) y conserva 4 enemigos en salas distintas,
sin salida.

# No objetivos

- `variants/growth.ts`, adaptador o cambio de generador por defecto (TASK-0046).
- Salida en BSP; host/render/debug (TASK-0048), bundle (TASK-0047), E2E/QA.
- Bestiario, percepción, alarma, IA, combate, cooperativo o transición de nivel.
- Tocar `src/host/`, `experiments/`, `index.html` ni dependencias.
- Cambiar geometría, puertas o paletas de TASK-0044 sin necesidad.

# Invariantes

- Valores aprobados: 6 huecos; radio 2 con fallback 3/sala; componente 8-dir ≤2;
  0,02 por tile; 1,2 por jugador; 6 jugadores; emboscadas 0,25; tipos 60/20/20;
  mínimo 1 por sala no-spawn; salida ≥2; `door`/`stairs-down`/`stairs-up`/
  `random` estable por semilla.
- `party[0]` es el acceso y `player` su alias; `spawns.roomId` identifica la sala;
  `spawns.enemy` deja de ser fuente de verdad pero sigue siendo serializable.
- La salida reserva tile y acceso: sin enemigos, spawn, armas ni decoración.
  `door` usa muro de borde y no abre paso; las escaleras usan suelo.
- Puro, determinista y serializable: sin `Math.random`, relojes, DOM ni estado
  global. La ausencia de visión reutiliza la LOS de `perception.ts`.
- No borrar, saltar ni debilitar tests; `pnpm run verify` pasa.

# Criterios de aceptación

Viven en
`docs/tasks/TASK-0045-motor-spawn-enemigos-salida.md#criterios-de-aceptación`;
enlazar, no copiar.

# Contexto mínimo

- Core: `src/game/chambers/core/{plan,doors,grid,rng,options}.ts`.
- Modelo y validador: `src/game/map.ts` (`Room`, `Spawns`, `Exit`, `MapEnemy`,
  `validateGeneratedMap`).
- BSP: `src/game/bsp.ts` (`chooseSpawns`, `spawnParty`, `buildMap`) y
  `src/game/enemy-placement.ts` (4 fichas, alarma y aislado).
- LOS: `src/game/perception.ts` (`hasLineOfSight`, `canSee`).
- Referencia sin importar: `experiments/EXP-004-salas-irregulares/src/{spawn,exit}.ts`
  y sus tests.
- Requisitos:
  `docs/requirements/REQ-012-spawn-sala-protegida.md#requisitos-creativos` y
  `#requisitos-técnicos`;
  `docs/requirements/REQ-013-entrada-salida-exploracion.md#requisitos-creativos`.
- Detalle de integración: `artifacts/TASK-0045/attempt-1/brief-detalle.md`.

# Artefactos

- `report.md`, `test-output.txt`, `verify-output.txt`, `seed-sweep.txt`,
  `bsp-regression.txt`, `git-diff-stat.txt`.

# Riesgos y decisiones abiertas

- La incompatibilidad conocida de `validateGeneratedMap` (paths <3 y 1-3 huecos)
  no se ejerce sin `growth`: resuélvela solo si es trivial y no debilita BSP; si
  no, documéntala y difiérela a TASK-0046 con evidencia.
- Los tests BSP fijan coordenadas de spawn antiguas: adapta solo los casos de
  spawn afectados, manteniendo o reforzando las aserciones.
- No añadas salida a BSP ni cambies su cupo de 4 enemigos.
- Si una sala no admite 6 huecos o no hay combinación sin visión, usa fallback
  con `warnings`; no relajes reglas en silencio.
- No tomes decisiones creativas.
