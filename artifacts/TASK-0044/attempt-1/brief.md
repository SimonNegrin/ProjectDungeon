---
type: Task Brief
title: "TASK-0044: brief del intento 1"
description: Promocionar la geometría base de EXP-004 al core de chambers con tests puros.
task: TASK-0044
attempt: 1
status: stable
brief_bytes: 3213
read_detail: false
generated: { by: deepseek/v4.1-flash, at: 2026-11-09T16:10:00Z }
---

# Objetivo

Que `src/game/chambers/core/` contenga módulos puros y separados (opciones,
rng/rejilla, formas, pasillos, puertas, paletas/estilos) que construyan el plan
geométrico compartido de REQ-011 v4: salas con máscara y muescas, caverna de 3
salas, pasillos de 0-3 con bucles y pasillo ancho, puertas validadas y bocas con
motivo, y paletas/ambientes por sala. Debe existir un punto de entrada puro
`generateChamberPlan(seed, options)` para barridos y para TASK-0045/0046, sin
spawn, enemigos ni salida.

# No objetivos

- `variants/growth.ts`, adaptador o cambio de generador por defecto (TASK-0046).
- Spawn, enemigos, entrada/salida (TASK-0045).
- Host/render/debug, bundle, E2E/QA.
- BSP con máscaras/plantillas; BSP queda intacto.

# Invariantes

- Core solo: sin `switch (variant)`, sin imports de `variants/`, `bsp.ts`,
  `templates`, `experiments/` ni `src/host/`.
- Sin `Math.random`, `Date.now`, `performance.now`, DOM ni estado global mutable;
  determinista por semilla.
- Usa el modelo `Room`/`Corridor`/`Door` de `src/game/map.ts` sin debilitar
  validadores ni tests existentes.
- Valores aprobados: 22×18, 5 salas, salas 3-8, pasillo máx 3, ancho 33 %, muro 1
  (1-2), caverna 15 %, spawn mínimo 6.
- Tests nuevos puros; no borrar/saltar/debilitar tests; `pnpm run verify` pasa.

# Criterios de aceptación

Viven en
`docs/tasks/TASK-0044-motor-nucleo-salas-pasillos-puertas.md#criterios-de-aceptación`;
enlazar, no copiar.

# Contexto mínimo

- Modelo: `src/game/map.ts` (`Room`, `Corridor`, `Door`, `resolveMapOptions`,
  PRNG, validadores).
- Referencia experimento (solo funciones relevantes):
  `experiments/EXP-004-salas-irregulares/src/generate.ts` (`resolveOptions`,
  `buildGrowth`, `growMask`, `carveNotches`, `buildCavern`, `findLink`,
  `selectLinks`, `widenLink`, `finalizeMap`), `doors.ts`, `grid.ts`, `rng.ts`,
  `types.ts`.
- Requisito:
  `docs/requirements/REQ-011-generador-densa-salas-irregulares.md#requisitos-creativos`
  (R-002–R-007, R-009, R-010) y `#requisitos-técnicos` (T-005, T-006, T-014).
- Arquitectura: `docs/design/architecture.md` (motor puro, experimentos fuera de
  producción).

# Artefactos

- `artifacts/TASK-0044/attempt-1/report.md`, `test-output.txt`,
  `verify-output.txt`, `seed-sweep.txt`, `git-diff-stat.txt`.

# Riesgos y decisiones abiertas

- Frontera del plan: devuelve salas/pasillos/puertas/tiles/paletas/avisos, no
  `GeneratedMap` (faltan spawn/salida/enemigos hasta TASK-0045). No inventar
  campos de spawn.
- La caverna no cabe en `RoomRole` ('large'|'small'|'medium'): no cambies el
  modelo de TASK-0043; expón la marca de caverna en el plan o en un tipo
  extendido local.
- Paletas REQ-008: asigna `ambient`/`palette` por sala sin importar
  `src/host/`; los colores quedan para el host.
- Si el barrido de 200 semillas revela que el experimento no cumple un rango,
  documenta el número y no relajes el criterio.
