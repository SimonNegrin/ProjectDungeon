---
type: Task Brief
title: "TASK-0047: brief del intento 1"
description: Build de producción separado y guarda de bundle.
task: TASK-0047
attempt: 1
status: stable
brief_bytes: 2409
read_detail: false
generated: { by: deepseek/v4.1-flash, at: 2026-11-09T17:10:00Z }
---

# Objetivo

Que `pnpm run build` emita solo el juego (`index.html` → `src/host/main.ts`), que
los experimentos se construyan aparte sin tocar `dist/` y que una guarda
re-ejecutable detecte `buildBsp`, `pickTemplate`, `EXP-004` o chunks de
`bsp`/`templates`.

# No objetivos

- Selector runtime, promoción de BSP/plantillas, cambio de generador/host o QA
  visual (`TASK-0049`).
- Borrar experimentos o dejar de servirlos en `dev`.

# Invariantes

- `pnpm run dev` sigue sirviendo `/experiments/`.
- Sin dependencias nuevas ni tests debilitados; allowlist de guarda estrecha.
- Comportamiento del generador y del host intacto.

# Criterios de aceptación

[TASK-0047](../../../docs/tasks/TASK-0047-arnes-build-produccion-guarda-bundle.md#criterios-de-aceptación);
requisito [REQ-011 T-015/T-016](../../../docs/requirements/REQ-011-generador-densa-salas-irregulares.md#requisitos-técnicos).

# Contexto mínimo

- `vite.config.ts` mezcla hoy producción y todos los `experiments/*/index.html`.
- `package.json`: `build`/`verify` sin guarda ni build de experimentos.
- Producción: `index.html` → `src/host/main.ts` → `session.ts` → `engine.ts` →
  `GrowthMapGenerator`. `src/game/index.ts` exporta `bsp`, pero el host no usa el
  barril.
- Marcadores: `buildBsp`/`pickTemplate` en
  `experiments/EXP-004-salas-irregulares/src/generate.ts`; `BspMapGenerator` y
  `buildBspTree` en [bsp.ts](../../../src/game/bsp.ts).
- Decisión: [ADR-013](../../../docs/decisions/ADR-013-generador-produccion-por-variante.md).

# Artefactos

`report.md`, `build-output.txt`, `build-experiments-output.txt`,
`guard-positive.txt`, `guard-negative.txt`, `verify-output.txt`,
`dev-health.txt`, `diff-stat.txt`.

# Riesgos y decisiones abiertas

- La minificación puede borrar nombres: combinar escaneo de `dist/` (contenido,
  chunks, `dist/experiments/`) con el grafo de imports de producción desde
  `src/host/main.ts`.
- Config/output separados para experimentos (`dist-experiments/`); `verify`
  ejecuta build y luego la guarda.
- Guarda negativa real: import temporal de una variante descartada, fallo
  evidenciado y reversión completa.
