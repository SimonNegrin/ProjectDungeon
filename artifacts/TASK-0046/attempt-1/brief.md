---
type: Task Brief
title: "TASK-0046: brief del intento 1"
description: Variante growth completa, import estático y generador por defecto; BSP sigue inyectable.
task: TASK-0046
attempt: 1
status: stable
brief_bytes: 2964
read_detail: false
generated: { by: deepseek/v4.1-flash, at: 2026-11-09T16:45:00Z }
---

# Objetivo

Que `src/game/chambers/variants/growth.ts` exponga `GrowthMapGenerator`
(`id = 'growth'`) componiendo el core, y que `createInitialState` lo use por
defecto. BSP sigue inyectable, con sus 4 enemigos y tests.

# No objetivos

- Host/render/debug/E2E (`TASK-0047`–`0049`); no toques `src/host/` salvo que el
  default impida compilar.
- Copiar el `generate.ts` del experimento o importar `experiments/`, `bsp.ts` o
  `templates.ts` desde producción.
- Cambiar bestiario, IA, combate, valores creativos ni dependencias; sin selector
  runtime ni registro de plugins.

# Invariantes

- Defaults: 22×18, 5 salas, salas 3-8, pasillo 3, ancho 33 %, muro 1, caverna
  15 %, spawn 6, 6 jugadores, 0,02/1,2, emboscadas 0,25, `exitMode random`.
- Puro, determinista y serializable: sin `Math.random`, relojes, DOM ni estado
  global. Misma semilla y opciones ⇒ estructuras profundamente iguales.
- Mapa completo: rejilla, salas con máscara, pasillos, puertas, spawn con
  `party[0] === player`, entrada, salida, enemigos, avisos y opciones coherentes.
- `createInitialState` consume `map.enemies` si existe; si no, conserva
  `placeMapEnemies` para BSP. Conserva tipo, `home` y round-trip JSON.
- `engine.ts` importa `growth` estáticamente; no importa BSP ni experimentos.
- No borrar, saltar ni debilitar tests. Los de geometría/armas de BSP se adaptan
  inyectando `BspMapGenerator`; solo cambian las expectativas del default.

# Criterios de aceptación

Viven en
`docs/tasks/TASK-0046-motor-variante-growth-defecto.md#criterios-de-aceptación`;
enlazar, no copiar.

# Contexto mínimo

- Core: `src/game/chambers/core/{plan,contents,options,index}.ts`; composición
  esperada `generateChamberPlan` + `placeChamberContents`.
- Modelo: `src/game/map.ts`; motor: `src/game/engine.ts`; BSP solo inyectable.
- Referencia sin importar: `experiments/EXP-004-salas-irregulares/src/`.
- Decisión: `docs/decisions/ADR-013-generador-produccion-por-variante.md`.

# Artefactos

- `report.md`, `test-output.txt`, `verify-output.txt`, `growth-perf.txt`,
  `seed-sweep.txt`, `bsp-regression.txt`, `git-diff-stat.txt`.

# Riesgos y decisiones abiertas

- `validateGeneratedMap` es BSP-específico (≥20, paths ≥3, 1-3 huecos, 1-2
  anchos). Añade validador de growth con positivos/negativos o documenta la
  incompatibilidad; nunca relajes reglas BSP.
- El default romperá supuestos 32×32: inyecta BSP donde se pruebe BSP; no cambies
  `src/host/` por comodidad.
- No inventes armas ni toques BSP por tests de armas: usa BSP inyectado si growth
  no aporta `weapons`.
- Mide 22×18 con semilla `2738263054` y umbral <50 ms, fuera del generador.
