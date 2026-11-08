---
type: Task Brief
title: "TASK-0023: brief del intento 1"
description: Sustituir el damero tintado por suelo programático y ampliar la decoración ambiental del host.
task: TASK-0023
attempt: 1
status: stable
brief_bytes: 2328
read_detail: false
generated: { by: deepseek/v4.1-flash, at: 2026-11-08T14:37:45Z }
---

# Objetivo

Implementar el suelo programático por sala y la decoración ambiental descritos en
la tarea: damero 1×1 con `fillRect`, cinco paletas, 33 decals en lista blanca,
planificador determinista por ambientes y snapshot de solo lectura.

# No objetivos

- E2E y QA visual completos: pertenecen a `TASK-0024`.
- Biomas, props que bloquean, plantas altas, iluminación, sombras o animación.
- Tocar `src/game/`, `index.html` o `public/assets/`.

# Invariantes

- `state.grid.tiles` no cambia; no se añaden colisiones ni reglas de camino.
- Sin `Math.random`, `Date.now` ni estado global mutable.
- Muros, cámara, HUD, camino y cursor conservan su comportamiento y capas.
- Base común `#0d1519`; pasillos y umbrales neutros; máximo un decal por tile.

# Criterios de aceptación

Viven en [la tarea](../../../docs/tasks/TASK-0023-host-suelo-programatico-ambientes.md#criterios-de-aceptación).
No copiarlos ni reinterpretarlos.

# Contexto mínimo

- [Tarea](../../../docs/tasks/TASK-0023-host-suelo-programatico-ambientes.md) y
  [REQ-008](../../../docs/requirements/REQ-008-suelo-programatico-decoracion-ambiental.md)
  (requisitos R-001…R-010 y T-001…T-010); [ADR-011](../../../docs/decisions/ADR-011-suelo-programatico-ambientes.md).
- `src/host/floor.ts` (lógica pura), `src/host/assets.ts` (recortes),
  `src/host/renderer.ts` (orden de dibujo), `src/host/debug.ts` (snapshot).
- Tests actuales de referencia: `tests/unit/host/floor.test.ts`,
  `renderer.test.ts` y `debug.test.ts`; `tests/e2e/floor-qa.spec.ts` es de
  `TASK-0024` y no se debe borrar ni debilitar.

# Artefactos

En `artifacts/TASK-0023/attempt-1/`: `report.md`, `test-output.txt`,
`verify-output.txt`, `screenshots/`, `logs/` y commit SHA.

# Riesgos y decisiones abiertas

- El corte sustituye el comportamiento de `REQ-007`; actualizar los unitarios
  afectados sin perder su intención.
- La captura de sala y pasillo a 1280×720 con `?seed=279837264` es evidencia
  mínima; el E2E completo queda para `TASK-0024`.
