---
type: Task Brief
title: "TASK-0101: brief del intento 3"
description: Recuperar la operación solo con teclado sin romper foco ni zonas.
task: TASK-0101
attempt: 3
status: stable
brief_bytes: 0
read_detail: false
generated: { by: deepseek/v4.1-flash, at: 2026-11-14T01:50:00Z }
---

# Objetivo

Corregir la verificación del intento 2: foco y selección ya coinciden, pero las
acciones de equipo y mochila solo se alcanzan con `.focus()`, no con `Tab`. Haz
que cada zona tenga su parada de acciones: fila → acciones de esa zona → siguiente
zona, conservando selección y orden equipo → mochila → derecha → cerrar.

# Hipótesis

`availableZones` pone una única parada `actions` tras la derecha. Al entrar en
una zona se selecciona su objeto, así que al llegar a `actions` la selección ya
es la del suelo y las acciones de equipo/mochila quedan sin ruta; por eso
`focusPanelAction` las enfoca con `.focus()`. Añadir la parada de acciones dentro
de cada zona mantiene N-010 (Tab no recorre objetos, sigue saltando de zona en
zona) y permite operar con teclado real.

# No objetivos

- No tocar layout, figura, mochila, suelo, scroll, reglas, costes, motor,
  catálogo.

# Invariantes

- Flechas/WASD siguen eligiendo el vecino; `Tab` no recorre objetos de una zona.
- Ciclo: equipo → acciones → mochila → acciones → derecha → acciones → cerrar,
  saltando paradas vacías y sin que el foco salga del diálogo.
- En una zona se selecciona su objeto recordado; en sus acciones la selección no
  cambia y la barra muestra ese objeto.
- Abrir, navegar y cerrar no gastan MP ni acción; operar cuesta 1 MP y un
  rechazo no mueve nada.
- El E2E vuelve a usar teclado, sin atajos, para llegar a una acción; no se
  debilita ningún test.

# Criterios de aceptación

Viven en `docs/tasks/TASK-0101-panel-tres-columnas-figura.md#criterios-de-aceptación`.
Este intento cubre teclado y N-008/N-010.

# Contexto mínimo

- `inventory-panel-view.ts`: `availableZones`, `handleTab`, `focusZone`,
  `zoneLastKey`, `renderActions`; `tests/e2e/support.ts` y el spec del panel.

# Artefactos

`artifacts/TASK-0101/attempt-3/`: informe, tests, commit.

# Verificación esperada

- Con foco en equipo o mochila, `Tab` llega a su acción sin cambiar de objeto;
  otro `Tab` pasa a la siguiente zona; `Shift+Tab` invierte.
- Equipar, desequipar, recoger y soltar se ejecutan con `Tab` + `Enter` reales y
  cuestan 1 MP; los rechazos no mueven nada.
- `pnpm run verify` y `E2E_ARTIFACTS_DIR=artifacts/TASK-0101/attempt-3
  pnpm run test:e2e` pasan.
