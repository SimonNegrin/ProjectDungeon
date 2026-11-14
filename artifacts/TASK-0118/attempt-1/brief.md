---
type: Task Brief
title: "TASK-0118: brief del intento 1"
description: "Cierre documental de REQ-033 v7: arquitectura, glosario, ADR-027 y log."
task: TASK-0118
attempt: 1
status: stable
brief_bytes: 2091
read_detail: false
generated: { by: deepseek/v4.1-flash, at: 2026-11-14T17:40:00Z }
---

# Objetivo

Reflejar en `docs/design/architecture.md`, `docs/glossary.md` y `docs/decisions/**`
lo implementado por TASK-0112 a TASK-0117: bisel de 2× que crece hacia fuera,
listas verticales, panel arriba sin cabeza, siluetas de slots vacíos y cursor de
4× con 150 ms. Registrar ADR-027 y la nota de vigencia de ADR-026; añadir la
entrada de `docs/log.md`.

# No objetivos

- UI, tests, requisitos, arnés, plantillas o `.env`.
- Resolver las fricciones `deferred` de TASK-0112 (redondeo de
  `getComputedStyle`) y TASK-0114 (observer de CLS en el Suelo).
- Cambiar reglas, valores o criterios de REQ-033.

# Invariantes

- Solo se reflejan requisitos aprobados (REQ-033 v7) y lo implementado.
- No se reescribe la historia de ADR-026: se añade nota de vigencia.
- «Bolsa» es etiqueta de UI; «mochila» sigue en modelo y documentación.
- Solo `docs/design/**`, `docs/glossary.md`, `docs/decisions/**`, `docs/log.md`,
  `docs/tasks/TASK-0118-*` y `artifacts/TASK-0118/**`.

# Criterios de aceptación

En `docs/tasks/TASK-0118-docs-correccion-visual-adr.md#criterios-de-aceptación`.

# Contexto mínimo

- `artifacts/TASK-0112..0117/attempt-1/report.md`: implementación y QA.
- `tests/e2e/qa-visual-correccion-ui-v7.spec.ts`: evidencia repetible.
- `src/host/ui.css`: `--ui-bevel`, `.ui-outset`/`.ui-inset`, silueta y cursor.
- `index.html` (figura de cinco bloques) y `src/game/equipment.ts`
  (`EQUIPMENT_SILHOUETTES`).
- REQ-033 v7, ADR-025 y ADR-026.

# Artefactos

- `report.md`, `docs-check-output.txt`, `verify-output.txt`.

# Riesgos y decisiones abiertas

- Contradicciones entre arquitectura, glosario y ADR; enlaces rotos.
- No maquillar la cuantización de Chromium (token 2,35/3,20 px, pintado 2/3 px).
- Las piernas desbordan la caja de cinco filas de forma intencionada.
