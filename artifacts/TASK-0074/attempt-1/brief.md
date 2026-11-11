---
type: Task Brief
title: "TASK-0074: brief del intento 1"
description: Reescribir el E2E de EXP-003 al modelo de objetivos por par, cubrir filtros y export, y dejar QA visual.
task: TASK-0074
attempt: 1
status: stable
brief_bytes: 0
read_detail: true
generated: { by: deepseek/v4.1-flash, at: 2026-11-12T00:10:00Z }
---

# Objetivo

`tests/e2e/experiment-bench.spec.ts` refleja el modelo vigente (objetivo por
par, 4-de-4 sin dispersión, filtros, export v2) y pasa con QA visual a 1280×720
y 900×700. Sin cambios de producción.

# No objetivos

- Tocar `experiments/**`, `src/**`, `index.html` o `public/**`.
- Debilitar tests existentes ni tocar unitarios para hacer pasar el E2E.
- Filtros por stats/arma, persistir filtros, `experiment.md`.

# Invariantes

- Adaptar, no borrar: mismas comprobaciones con testids y API por par.
- Los filtros no miden ni cambian `% real`, 4-de-4, overrides o export.
- Mismo estado y semilla → mismo JSON, `targetsId` y `overridesId`.
- `?test=1&seed=1017`; sin esperas de reloj: `bench-status` o `expect.poll`.

# Criterios de aceptación

Viven en `docs/tasks/TASK-0074-exp-003-objetivos-filtros-e2e.md`, sección
«Criterios de aceptación». Enlazar; no copiar.

# Contexto mínimo

- **Leer `brief-detalle.md`**: estado de partida, tasas base, nombres y resumen
  del export, mecánica DOM de filtros y rutas de capturas.
- Testids por par: `combats-target-<hero>-<enemy>`, `combats-real-...`,
  `combats-wins-hero-...`; 4-de-4 en `combats-four-<enemy>`.
- API: `getTargets()` → 12 claves `hero:enemy`; `setTarget(hero, enemy, v)`;
  `resetTarget(hero, enemy)`; `getDecision()` incluye `targetsVersion` y
  `targetsId`.
- Filtros: `combats-filter-hero|enemy`, `weapons-filter`, `heroes-filter` y
  `*-clear`; avisos `*-filter-empty` (`hidden`).
- Sin `--repeat-each`; cita la ruta real de cada captura.

# Artefactos

`report.md`, `verify-output.txt`, `e2e-output.txt`,
`experiment-bench/screenshots|exports/`, `logs/`; commits en `task/TASK-0074`.
Informe ≤4 KB; detalle en `report-detalle.md`.

# Riesgos

- QA 1280: `document.scrollWidth <= innerWidth`, tablas ≥80 %, foco, celdas
  sin recorte e inputs legibles; a 900 el scroll queda en la tabla.
- Si un criterio choca con la implementación, para y reporta; no cambies la UI.
