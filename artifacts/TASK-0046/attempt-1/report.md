---
type: Task Report
title: "TASK-0046: informe de ejecución"
description: GrowthMapGenerator desde el core, growth por defecto y BSP inyectable.
task: TASK-0046
attempt: 1
report_status: success
generated: { by: deepseek/v4.1-flash, at: 2026-11-09T16:55:00Z }
artifacts: artifacts/TASK-0046/attempt-1/
verified:
---

# Estado

`success`. `growth` es una variante de producción compuesta desde el core, el
generador por defecto, y BSP sigue inyectable con sus 4 enemigos y tests.

# Cambios

- `src/game/chambers/variants/growth.ts`: `GrowthMapGenerator` (`id = 'growth'`)
  compone `generateChamberPlan` + `placeChamberContents` y valida con
  `validateGrowthMap`. Sin copiar `generate.ts`, sin imports de experimentos,
  BSP ni plantillas, y sin `Math.random`, relojes ni DOM.
- `src/game/engine.ts`: import estático de `growth`; `createInitialState` lo usa
  por defecto y consume `map.enemies` conservando `type`, `home` y JSON. BSP
  mantiene `placeMapEnemies` como fallback.
- Tests: nuevo `growth-generator.test.ts` (16) y adaptación de 11 archivos para
  inyectar BSP donde se probaba BSP. Sin tests borrados, saltados ni debilitados.
- Commits de código y tests: `4627913` y `f6507e6`. SHA final: commit de
  evidencia posterior a este informe.

# Tests

| Comando | Resultado | Evidencia |
|---|---|---|
| `pnpm run verify` | 53 archivos, 706 tests; build 541 ms | `verify-output.txt` |
| `pnpm run test` | 53 archivos, 706 tests | `test-output.txt` |
| Growth dirigido | 16 tests; barrido 200/200 | `seed-sweep.txt` |
| Rendimiento growth | media 1,84 ms (22×18, semilla 2738263054) | `growth-perf.txt` |
| BSP/REQ-009/REQ-010 | 10 archivos, 176 tests | `bsp-regression.txt` |

Cubre determinismo, contrato completo, enemigos del mapa, default growth, BSP
inyectado, `map.enemies` consumido, serialización, validador positivo/negativo y
rendimiento < 50 ms.

# Evidencia visual

- No aplica UI/E2E: sin cambios en host/render ni `index.html`; van en
  `TASK-0048`/`TASK-0049`.
- Rutas: `seed-sweep.txt`, `growth-perf.txt`, `bsp-regression.txt` y
  `git-diff-stat.txt`.

# Desviaciones

- `validateGeneratedMap` sigue siendo BSP-específico (≥20×20, paths ≥3, 1-3
  huecos, 1-2 anchos). No se relajó; growth usa `validateGrowthMap` con positivos
  y negativos.
- `map.options` conserva la forma histórica `ResolvedMapOptions`; growth rellena
  dimensiones, salas, ratios y anchos coherentes sin cambiar el modelo.
- Los tests de host que dependían de geometría o armas BSP inyectan
  `BspMapGenerator`; no se tocó `src/host/`, `index.html` ni dependencias.
- No se ejecutó `pnpm run test:e2e`: es `TASK-0049` y los fixtures fijan el spawn
  BSP.

# Problemas conocidos y preguntas abiertas

- El nuevo default cambia el mapa del host hasta `TASK-0048`; sus tests inyectan
  BSP para conservar la intención.
- `validateGeneratedMap` no se aplica a growth; está documentado y no hay
  decisión creativa pendiente.

# Fricción reutilizable

| Síntoma | Evidencia | Workaround | Por qué es reutilizable | Cambio propuesto | Coste/riesgo | Disposición |
|---|---|---|---|---|---|---|
| REQ-011 T-005 pide opciones de forma en `MapOptions`, pero `map.ts` solo modela las de BSP | `MapOptions`/`ResolvedMapOptions` frente a `GrowthMapOptions` | Intersección y adaptador local | Toda variante nueva repetirá el mapeo y el desajuste de `options` | Contrato de opciones de variante o ampliar el modelo | Medio | `pending` |

# Métricas de handoff

| Métrica | Valor |
|---|---|
| `brief_bytes` | 2964 |
| `report_bytes` | 3609 |
| `overflow` | `none` |
| `criteria_failed` | 0 |
