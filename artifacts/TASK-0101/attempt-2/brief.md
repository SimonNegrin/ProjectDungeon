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
foco visible, `aria-current`, barra de acciones y detalle. El resto del panel y
la navegación por flechas no cambian.

# Hipótesis

`focusZone` (`src/host/inventory-panel-view.ts`) solo llama a `focusRow`: el foco
se mueve a la zona, pero `selectedKey` sigue en la anterior. La barra de acciones
y `aria-current` describen otro objeto, `selectPanelRow` necesita un rodeo de
flechas y la comprobación de memoria por zona queda vacía. Seleccionar el objeto
recordado al entrar mantiene N-010 (Tab salta zonas, no recorre objetos).

# Evidencia

- `inventory-panel-view.ts`: `focusZone` enfoca sin `selectByKey`.
- `tests/e2e/support.ts`: `selectPanelRow` pulsa una flecha de escape y vuelve
  para seleccionar la fila enfocada.
- `tests/e2e/panel-three-columns-qa.spec.ts`: la selección no cambia con `Tab`,
  así que la memoria por zona pasa aunque `zoneLastKey` falle.

# No objetivos

- No rediseñar columnas, figura, mochila, suelo, cadáveres ni scroll.
- No tocar vecino, reglas, costes, motor ni catálogo.
- No implementar ficha ni submenú (TASK-0102).

# Invariantes

- Flechas/WASD siguen eligiendo el vecino más próximo; Tab no recorre objetos
  dentro de una zona.
- `Tab`/`Shift+Tab` ciclan equipo → mochila → derecha → acciones → cerrar,
  saltando zonas vacías y sin salir del diálogo.
- Abrir, navegar y cerrar no gastan MP ni acción; operar cuesta 1 MP y un
  rechazo no mueve nada.
- No se debilita ningún test; se refuerza la memoria por zona.

# Criterios de aceptación

Viven en `docs/tasks/TASK-0101-panel-tres-columnas-figura.md#criterios-de-aceptación`.
Este intento cubre la coherencia de foco/selección de N-008/N-010.

# Contexto mínimo

- `src/host/inventory-panel-view.ts`: `focusZone`, `handleTab`, `selectByKey`,
  `zoneLastKey`, `applySelection`.
- `tests/e2e/support.ts`: `selectPanelRow` y `focusPanelAction`.
- `tests/e2e/panel-three-columns-qa.spec.ts`: zonas y memoria.

# Artefactos

`artifacts/TASK-0101/attempt-2/`: `report.md`, `test-output.txt`,
`verify-output.txt`, `e2e-output.txt`, capturas si cambia algo visible y commit
en `task/TASK-0101`.

# Verificación esperada

- Tras cada `Tab` en una zona, `document.activeElement` es la fila y
  `data-selected-key` coincide con su `data-row-key`.
- Cambiar de objeto en mochila, saltar a la derecha, elegir otro del suelo y
  volver con `Tab` devuelve foco y selección al objeto recordado de la mochila.
- `selectPanelRow` ya no necesita el rodeo de escape: usa `Tab` a la zona y
  flechas dentro.
- `pnpm run verify` y `E2E_ARTIFACTS_DIR=artifacts/TASK-0101/attempt-2
  pnpm run test:e2e` pasan.
