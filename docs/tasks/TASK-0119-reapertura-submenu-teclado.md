---
type: Task
id: TASK-0119
title: "Bug: el submenú no reabre con teclado tras una acción del panel"
description: "Tras recoger o equipar, Enter deja de abrir el submenú contextual hasta que se vuelve a seleccionar con clic; el teclado queda inerte en el panel."
status: stable
task_status: ready
task_type: feature
requirement: REQ-032
requirement_ids: [R-012, R-013, R-014, N-008]
depends_on: []
unlocks: []
created_at: 2026-11-14T19:39:41Z
completed_at:
assignee: task-runner
attempts: 0
artifacts: artifacts/TASK-0119/
priority: P1
risk: medium
review_required: true
generated: { by: deepseek/v4.1-flash, at: 2026-11-14T19:39:41Z }
verified:
---

# Objetivo

Que `Enter` vuelva a abrir el submenú contextual sobre cualquier objeto con
acciones después de recoger, equipar, desequipar o soltar, sin exigir un clic
previo ni un cambio de turno. La selección posterior a una acción debe quedar en
un objeto con acciones, nunca en un hueco vacío que no responde.

# Contexto

Reportado en playtest por `human:simon`: el submenú se abre una vez, se recoge o
equipa un arma y desde ahí `Enter` no abre nada, tampoco cambiando de turno.
Solo falla con teclado; volver a seleccionar con clic restaura el
comportamiento. Quedaba 1 MP o más, así que no es el caso de MP insuficiente de
[REQ-032](../requirements/REQ-032-estilo-visual-interaccion-ui.md#requisitos-creativos-decididos)
R-014, que debe abrir el menú con la opción deshabilitada y su motivo.

También ocurre tras equipar, así que no depende de que la fila desaparezca: el
objeto cambia de zona y su clave deja de ser la seleccionada. Ningún E2E hace
`Enter` → ejecutar → `Enter`; todos abren una vez y siguen con clics, por eso la
suite pasa.

Punto de partida probable en `src/host/inventory-panel-view.ts`: la selección se
recalcula al refrescar el modelo y puede caer en una celda vacía, donde
`openMenu()` devuelve `false` sin feedback. La causa real la confirma el test que
falle primero; no se da por supuesta.

# Criterios de aceptación

- [ ] Test E2E nuevo y previo al arreglo: arma en el suelo, panel abierto, `Enter`,
      recoger, `Enter` otra vez sobre la fila resultante y submenú visible. Debe
      fallar antes del cambio.
- [ ] Con teclado, tras recoger, equipar desde mochila, desequipar y soltar,
      `Enter` abre el submenú del objeto seleccionado o del que ocupa su lugar
      mientras exista alguna fila con acciones.
- [ ] La selección posterior a una acción recae en una fila con acciones; si no
      queda ninguna, cae en «Cerrar» o cierra el panel de forma explícita, nunca
      en un hueco vacío que ignora `Enter`.
- [ ] Cambiar de turno, refrescar el estado y redimensionar no dejan el teclado
      inerte mientras el panel siga abierto.
- [ ] Clic, flechas, `Tab`, `aria-current` y foco DOM mantienen el
      comportamiento actual; `Enter` sobre una fila vacía no abre menú ni
      ejecuta nada.
- [ ] Sin gasto de MP adicional, sin cambios de coste, de reglas ni del modelo.

# Plan de test

- Unitario: selección tras una acción cuando la zona queda vacía y cuando la
  clave cambia de zona; `buildPanelMenu` sobre una selección vacía.
- Integración: `pnpm run verify`.
- E2E: spec nuevo con las cuatro acciones encadenadas y `Enter` después de
  cada una; caso de cambio de turno; prueba de que la selección nunca queda en
  celda vacía. Guardar la salida del test fallando antes del arreglo.
- Manual: recorrer el panel solo con teclado tras cada acción, a 1280×720.

# Evidencia esperada

- [ ] Informe en `artifacts/TASK-0119/attempt-1/report.md`
- [ ] Salida del E2E fallando antes del cambio y pasando después
- [ ] Salida de `pnpm run verify` y del E2E completo
- [ ] Commit SHA

# Restricciones

- Sin cambios en `src/game/**`: el fallo se resuelve en la presentación del
  panel. Si la causa exige tocar el motor, detente y consulta.
- No se debilitan tests existentes ni se retira cobertura de submenú.
- Sin cambios de reglas, costes, navegación, aspecto del cursor ni del submenú.
- Sin dependencias nuevas.

# No objetivos

- Revisión v8 de precisión de REQ-033 y su documentación.
- Otros hallazgos del playtest: se abrirán como tareas aparte si se confirman.
- Rediseño del submenú, atajos nuevos o cambio de coste de las acciones.
