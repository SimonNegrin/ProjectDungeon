---
type: Task Brief
title: "TASK-0024: brief del intento 1"
description: QA E2E y visual del suelo por sala y la decoración ambiental de REQ-008.
task: TASK-0024
attempt: 1
status: stable
brief_bytes: 2556
read_detail: false
generated: { by: deepseek/v4.1-flash, at: 2026-11-08T14:53:54Z }
---

# Objetivo

Ampliar la QA E2E existente para verificar en navegador, con la semilla
`279837264`, paletas por sala y ambiente, neutralidad de pasillos y puertas,
ambientes con focos y mezcla, lista blanca y evidencia visual.

# No objetivos

- Cambiar `src/`, `index.html` o `public/` (implementación: `TASK-0023`).
- Editar `docs/`, artefactos históricos o debilitar tests existentes.

# Invariantes

- `state.grid.tiles` no cambia; `MoveTo` a tile decorado sigue terminando.
- Paridad `(x + y) % 2` global; base `#0d1519`; misma semilla, mismos buffers;
  otra semilla cambia decal y ambiente.
- Capturas 1280×720 con `E2E_ARTIFACTS_DIR=artifacts/TASK-0024/attempt-1`; no
  tocar `artifacts/TASK-*` previos.
- pnpm y timeout explícito de la tool de shell: macOS sin `timeout` GNU ni
  `gtimeout`.

# Criterios de aceptación

Viven en [la tarea](../../../docs/tasks/TASK-0024-e2e-qa-suelo-ambientes.md#criterios-de-aceptación).
Enlázalos; no los copies ni reinterpretes.

# Contexto mínimo

- [Tarea](../../../docs/tasks/TASK-0024-e2e-qa-suelo-ambientes.md),
  [REQ-008](../../../docs/requirements/REQ-008-suelo-programatico-decoracion-ambiental.md)
  y [ADR-011](../../../docs/decisions/ADR-011-suelo-programatico-ambientes.md).
- Spec base: `tests/e2e/floor-qa.spec.ts` (damero, muros, densidades,
  exclusiones, grises, camino/cursor, `MoveTo` y determinismo).
- Snapshot: `decoration` (x,y,type,family,ambient,area) y `floorPalettes`
  (roomId,ambient,palette,base,second).
- Ayudas: `support.ts` (`walkTo`, `settle`) y `artifacts.ts`.

# Artefactos

En `artifacts/TASK-0024/attempt-1/`: `report.md`, `e2e-output.txt`,
`full-e2e-output.txt`, `verify-output.txt`, logs, `screenshots/` y SHA. Capturas
de sala neutra, humedad, muerte/combate, pasillo, camino sobre decal y gris;
conserva nombres y añade los de ambiente.

# Riesgos y decisiones abiertas

- Encuadrar salas exige caminar con comandos reales, sin teletransportar ni
  inyectar estado; `walkTo` puede cruzar fases enemigas (`status === 'playing'`).
- No cambies aserciones, nombres de captura ni esperas; añade tests y helpers.
- Contrasta pasillos/puertas neutros con canvas, no solo con el snapshot; la
  corrida con evidencia usa `floor-qa` y el resto va sin `E2E_ARTIFACTS_DIR`.
