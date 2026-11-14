---
type: Task Brief
title: "TASK-0114: brief del intento 1"
description: Columnas del panel arriba, casco en la primera fila y figura sin cabeza.
task: TASK-0114
attempt: 1
status: stable
brief_bytes: 2596
read_detail: false
generated: { by: deepseek/v4.1-flash, at: 2026-11-14T17:00:00Z }
---

# Objetivo

Las tres columnas del panel empiezan arriba: título y contenido bajo él, sin
centrado vertical. La rejilla de Equipo arranca en la primera fila con el casco
como primer slot, y la figura pierde el bloque de la cabeza conservando torso,
brazos y piernas recolocados respecto a la rejilla superior.

# No objetivos

- Siluetas (0115), cursor (0116), QA visual (0117) y docs (0118).
- Bisel, `--ui-line`, paleta, escala, contenido, reglas o `src/game/**`.

# Invariantes

- Títulos Equipo/Bolsa/Suelo con tamaño y `data-testid` actuales; slots del mismo
  lado en las tres columnas.
- El casco sigue siendo `slot:head` (`inventory-slot-head`, fila 1, columna 2);
  no confundir con `.inventory-figure-head`, que se elimina.
- `.inventory-figure` conserva `aria-hidden`, sin foco ni clics.
- Sin CLS al abrir, navegar o cambiar contenido. No se debilitan tests.

# Criterios de aceptación

En `docs/tasks/TASK-0114-ui-panel-arriba-figura-sin-cabeza.md`, sección
«Criterios de aceptación».

# Contexto mínimo

- `index.html`: 245-255 — figura; retirar solo `.inventory-figure-head` y
  conservar los cinco bloques.
- `src/host/ui.css`: 883-943 — `.inventory-equipment` es `absolute; inset: 0`
  con `align-content: center` (causa del centrado); los bloques usan porcentajes
  del contenedor. 944-987 — `--ui-slot` y casco.
- `docs/requirements/REQ-033-revision-visual-hud-panel.md#requisitos-creativos-decididos`:
  R-027 y R-028.
- Tests: `tests/unit/host/ui-foundations.test.ts:356-391`; E2E
  `panel-three-columns-qa.spec.ts` y `panel-cursor-cls-qa.spec.ts`; helpers en
  `tests/e2e/support.ts` y `tests/e2e/artifacts.ts`.

# Artefactos

`artifacts/TASK-0114/attempt-1/`: `report.md`, `verify-output.txt`,
`test-output.txt`, `screenshots/` vía `E2E_ARTIFACTS_DIR` y `logs/`. Capturas a
900×700 y 1280×720.

# Riesgos y decisiones abiertas

- Ata la geometría de la figura a `--ui-slot`/`--ui-unit` para que siga la escala
  y quede detrás de los slots.
- El bisel de 2× crece hacia fuera: mide la caja del slot, no el pseudo-elemento,
  y deja hueco para que no la recorte el contenedor.
- Cubre con unitario la ausencia del nodo de cabeza y con E2E la primera fila, la
  línea de títulos y la estabilidad. `pnpm run verify` (120 s) y
  `pnpm run test:e2e` (180 s).
