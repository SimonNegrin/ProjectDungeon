---
type: Task Brief
title: "TASK-0121: brief del intento 1"
description: Helper único de auditoría de CLS con esquema común y filtro P-006.
task: TASK-0121
attempt: 1
status: stable
brief_bytes: 2070
read_detail: false
generated: { by: deepseek/v4.1-flash, at: 2026-11-14T21:05:00Z }
---

# Objetivo

Un helper exportado en `tests/e2e/support.ts`
(`startLayoutShiftAudit`, `readLayoutShifts`, `resetLayoutShifts`,
`expectNoForbiddenShifts`); migrar los cuatro specs y añadir recogida con 4
objetos en el Suelo.

# No objetivos

- Otros helpers, `src/`, `index.html`, `public/`, `docs/`, P-006/REQ-033 ni UI.

# Invariantes

- Callback `page.evaluate` autocontenido; globales únicos `__layoutShifts` y
  `__layoutObserver` en los cuatro specs.
- Esquema exportado `{ value, hadRecentInput, forbidden, sources }` con
  `sources: { label, forbidden }[]`.
- Prohibido solo `[data-testid="frame"]`, `[data-testid="inventory-panel"]`,
  `.inventory-panel-body`, `.inventory-columns`, `.inventory-section-title` y
  slots de Equipo/Bolsa, también como ancestros. Nunca `.inventory-column` a
  secas ni celdas del Suelo.
- `expectNoForbiddenShifts` espera dos frames, devuelve registros y no silencia;
  no se borran, saltan ni debilitan aserciones ni capturas.

# Criterios de aceptación

`docs/tasks/TASK-0121-e2e-observer-cls-compartido.md#criterios-de-aceptación`.

# Contexto mínimo

- Copias inline: `panel-cursor-cls-qa:495`, `qa-visual-revision-ui:890`,
  `qa-visual-correccion-ui-v7:1081`, `panel-top-alignment-qa:344`.
- `REQ-033#requisitos-creativos-decididos` (R-022, P-006) y
  `#requisitos-técnicos` (T-013).
- Cobertura nueva en `panel-cursor-cls-qa.spec.ts` con `ground: FOUR_GROUND`:
  recoger los cuatro con `panelActionTestId('pickup', 'ground:item-test-ground-N')`,
  `settle` y `expectNoForbiddenShifts` por fase.

# Artefactos

`report.md`, `test-output.txt`, `e2e-output.txt`, `verify-output.txt`.

# Riesgos

- Un CLS prohibido real: guarda nodo/label/fase, devuelve `failed` y propón tarea
  aparte.
- Timeouts 240 s; pnpm, nunca npm ni npx.
