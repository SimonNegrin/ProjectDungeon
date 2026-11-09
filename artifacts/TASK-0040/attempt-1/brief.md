---
type: Task Brief
title: "TASK-0040: brief del intento 1"
description: Construir EXP-004 con tres generadores deterministas, render real, métricas, spawn, enemigos y export.
task: TASK-0040
attempt: 1
status: stable
brief_bytes: 2442
read_detail: true
generated: { by: deepseek/v4.1-flash, at: 2026-11-09T00:02:00Z }
---

# Objetivo

Construir `/experiments/EXP-004-salas-irregulares/`: un comparador interactivo
A/B/C de mazmorra densa con la misma semilla y parámetros, tileset real, mapa
completo y vista 13×13, métricas, spawn/enemigos y export JSON. Trabaja solo en
la rama `task/TASK-0040`.

# No objetivos

- No tocar `src/`, `tests/`, el `index.html` raíz ni `public/`.
- No promover el generador ni decidir la variante por el usuario.
- No añadir dependencias ni arte final.

# Invariantes

- Generación pura y determinista: sin `Math.random`, relojes ni estado global.
- Misma semilla y parámetros ⇒ mismo contrato y mapa por variante.
- Tests nuevos solo en `experiments/EXP-004-salas-irregulares/src/`.
- El experimento es autocontenido; solo puede importar constantes estables de
  `src/host/assets.ts` y `src/host/floor.ts`.

# Criterios de aceptación

Viven en [la tarea](../../../docs/tasks/TASK-0040-exp-004-salas-irregulares.md#criterios-de-aceptación);
no se copian.

# Contexto mínimo

- [EXP-004](../../../experiments/EXP-004-salas-irregulares/experiment.md) y
  [REQ-011](../../../docs/requirements/REQ-011-generador-densa-salas-irregulares.md).
- [REQ-012](../../../docs/requirements/REQ-012-spawn-sala-protegida.md) para
  spawn y reparto de enemigos.
- Referencia de shell, render y tests: `experiments/EXP-001-generador-mazmorra/`.
- Tileset y recortes: `src/host/assets.ts`. Paletas: `src/host/floor.ts`.
- **Lee `brief-detalle.md` antes de implementar**: contrato, variantes, render,
  controles, métricas y capturas.

# Artefactos

- `artifacts/TASK-0040/attempt-1/report.md`, `test-output.txt`,
  `docs-check-output.txt`, `build-output.txt`, `screenshots/`,
  `decision-example.json` y `logs/`.
- Commits en `task/TASK-0040` con el ID; el informe incluye el SHA.

# Riesgos y decisiones abiertas

- La tarea es amplia: asegura primero el contrato común y los tests; el pulido
  visual va después.
- Si el shell no cubre la vista 13×13 o el export con métricas, extiende la
  página sin modificar `experiments/_shell/`.
- Cualquier duda creativa se deja abierta y documentada; no se decide.
