---
type: Task Brief
title: "TASK-0065: brief del intento 1"
description: Actualizar solo la entrada EXP-003 del manifiesto a la v2.0.
task: TASK-0065
attempt: 1
status: stable
brief_bytes: 1881
read_detail: false
generated: { by: deepseek/v4.1-flash, at: 2026-11-11T16:05:00Z }
---

# Objetivo

Que `experiments/manifest.ts` describa la v2.0 de EXP-003 en su entrada: título,
descripción con catálogos data-driven, acciones, magia/maná y réplica, pregunta
idéntica a la de `experiment.md`/`src/ui.ts`, y estado `ready`. Solo cambia esa
entrada.

# No objetivos

- Cambiar `experiment.md`, el motor, la página, `src/` de producción ni
  dependencias.
- Aprobar valores de balance o tocar otras entradas del manifiesto.

# Invariantes

- `path` de EXP-003 sigue siendo `/experiments/EXP-003-mesa-combate/`.
- Ninguna otra entrada ni el tipo del manifiesto cambian.
- Hay cambios ajenos sin commitear (`experiment.md`, `experiments/index.md`,
  `docs/tasks/index.md`, `TASK-0064`): no los incluyas ni los reviertas.

# Criterios de aceptación

Viven en `docs/tasks/TASK-0065-exp-003-v2-manifest.md#criterios-de-aceptación`;
no copiar.

# Contexto mínimo

- `experiments/manifest.ts`: entrada EXP-003.
- `experiments/EXP-003-mesa-combate/experiment.md`: frontmatter `title`,
  `description`, `question`, `experiment_status` y sección «Pregunta».
- `experiments/EXP-003-mesa-combate/src/ui.ts`: constantes `EXPERIMENT_TITLE`,
  `EXPERIMENT_QUESTION` y `EXPERIMENT_DESCRIPTION`.

# Artefactos

- `artifacts/TASK-0065/attempt-1/report.md`
- `docs-check-output.txt`, `test-output.txt`, `verify-output.txt`
- Commit SHA

# Riesgos y decisiones abiertas

- Ninguna decisión creativa: título, descripción, pregunta y estado se copian de
  las fuentes citadas.
- No usar `git add -A`; el commit debe incluir solo `experiments/manifest.ts` y
  los artefactos de este intento.
