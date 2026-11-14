---
type: Task Brief
title: "TASK-0101: brief del intento 2"
description: Sincronizar selección y foco al saltar de zona con Tab.
task: TASK-0101
attempt: 2
status: stable
brief_bytes: 0
read_detail: false
generated: { by: deepseek/v4.1-flash, at: 2026-11-14T01:40:00Z }
---

# Objetivo

Corregir la verificación del intento 1: al entrar en una zona con `Tab` o
`Shift+Tab`, el objeto enfocado debe ser también el seleccionado. Así coinciden
foco, `aria-current`, barra de acciones y detalle. Las flechas no cambian.

# Hipótesis

`focusZone` (`src/host/inventory-panel-view.ts`) solo llama a `focusRow`: el foco
se mueve a la zona, pero `selectedKey` sigue en la anterior. La barra de acciones
describe otro objeto, `selectPanelRow` necesita un rodeo de flechas y la memoria
por zona queda sin probar de verdad. Seleccionar el objeto recordado al entrar
mantiene N-010: Tab salta zonas, no recorre objetos.

# Evidencia

- `focusZone` enfoca sin `selectByKey`.
- `selectPanelRow` pulsa una flecha de escape y vuelve a la fila enfocada.
- La memoria por zona pasa aunque `zoneLastKey` falle: la selección no cambia.

# No objetivos

- No rediseñar columnas, figura, mochila, suelo ni scroll.
- No tocar vecino, reglas, costes, motor ni catálogo.
- Sin ficha ni submenú.

# Invariantes

- Flechas/WASD siguen eligiendo el vecino; Tab no recorre objetos.
- `Tab`/`Shift+Tab` ciclan equipo → mochila → derecha → acciones → cerrar,
  saltando zonas vacías y sin salir del diálogo.
- Abrir, navegar y cerrar no gastan MP ni acción; operar cuesta 1 MP y un
  rechazo no mueve nada.
- No se debilita ningún test; se refuerza la memoria por zona.

# Criterios de aceptación

Viven en `docs/tasks/TASK-0101-panel-tres-columnas-figura.md#criterios-de-aceptación`.
Este intento cubre N-008/N-010.

# Contexto mínimo

- `src/host/inventory-panel-view.ts`: `focusZone`, `handleTab`, `selectByKey`,
  `zoneLastKey`, `applySelection`.
- `tests/e2e/support.ts` y `tests/e2e/panel-three-columns-qa.spec.ts`.

# Artefactos

`artifacts/TASK-0101/attempt-2/`: `report.md`, `test-output.txt`,
`verify-output.txt`, `e2e-output.txt`, commit.

# Verificación esperada

- Tras cada `Tab` en una zona, `data-selected-key` coincide con el
  `data-row-key` enfocado.
- Cambiar de objeto en mochila, saltar a la derecha, elegir otro del suelo y
  volver con `Tab` devuelve foco y selección al recordado.
- `selectPanelRow` ya no usa el rodeo de escape.
- `pnpm run verify` y `E2E_ARTIFACTS_DIR=artifacts/TASK-0101/attempt-2
  pnpm run test:e2e` pasan.
