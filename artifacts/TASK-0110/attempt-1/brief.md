---
type: Task Brief
title: "TASK-0110: brief del intento 1"
description: "Cierre documental de REQ-033: arquitectura, glosario, ADR y vigencia."
task: TASK-0110
attempt: 1
status: stable
brief_bytes: 1238
read_detail: false
generated: { by: deepseek/v4.1-flash, at: 2026-11-14T14:13:45Z }
---

# Objetivo

Reflejar en `docs/design/architecture.md`, `docs/glossary.md`, ADR-021/025 y un
ADR nuevo lo implementado por TASK-0104 a TASK-0109, sin reescribir historia ni
tocar `src/**`.

# No objetivos

- UI, tests, requisitos o arnés.
- Crear tareas de layout alternativo o defectos.

# Invariantes

- Escala única derivada del marco; ocho colores; outset/inset; cursor
  superpuesto; anti-CLS; «Bolsa» como etiqueta y «mochila» como modelo.

# Criterios de aceptación

En `docs/tasks/TASK-0110-docs-revision-ui-adr.md#criterios-de-aceptación`.

# Contexto mínimo

- `src/host/layout.ts`: `computeFrameLayout` y `computeUiLine`.
- `src/host/ui.css`: tokens y `.ui-outset`/`.ui-inset`.
- Informes `artifacts/TASK-0104..0109/attempt-1/report.md`.
- REQ-033 v6 y ADR-025.

# Artefactos

- `report.md`, `docs-check-output.txt`, `verify-output.txt`.

# Riesgos

- Notas de vigencia contradictorias; enlaces rotos; no editar requisitos.
