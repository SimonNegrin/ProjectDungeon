---
type: Task
id: TASK-0102
title: "Ficha del objeto en el HUD derecho y submenú contextual"
description: "Mostrar en el HUD derecho el objeto seleccionado junto al equipado en ese hueco, y abrir con Enter un submenú con las acciones válidas, su coste y sus rechazos."
status: stable
task_status: backlog
task_type: feature
requirement: REQ-023
requirement_ids: [R-004, R-009, T-005]
depends_on: [TASK-0101]
unlocks: []
created_at: 2026-11-14T00:20:17Z
completed_at:
assignee: task-runner
attempts: 0
artifacts: artifacts/TASK-0102/
priority: P1
risk: medium
review_required: true
generated: { by: deepseek/v4.1-flash, at: 2026-11-14T00:20:17Z }
verified:
---

# Objetivo

Que comparar antes de equipar no exija memorizar números y que ejecutar una acción
sea explícito: ficha del seleccionado y del equipado en el HUD derecho, y submenú
con las acciones válidas y su coste.

# Contexto

- El HUD derecho ya muestra el detalle del cursor (TASK-0100) y el panel de tres
  columnas existe (TASK-0101); su estado de selección vive en el host.
- [REQ-023](../requirements/REQ-023-hud-derecho-detalle-cursor.md) v3 R-009: con el
  panel abierto, el HUD derecho muestra el seleccionado y el equipado en ese
  hueco, sin delta; al cerrar vuelve al cursor.
- [REQ-032](../requirements/REQ-032-estilo-visual-interaccion-ui.md) v2 R-011,
  R-012, R-014 y N-011: dos bloques, submenú con `Enter`, coste anunciado y
  rechazos legibles.
- La composición tipada del HUD derecho está en `src/host/hud-detail.ts`; el panel
  y su input, en `src/host/inventory-panel.ts`.

# Criterios de aceptación

- [ ] Con el panel abierto, el HUD derecho muestra dos bloques: el objeto
      seleccionado y el equipado en ese hueco, con stats, traits y descripción;
      sin objeto equipado el segundo bloque dice «vacío»; no hay delta numérico.
- [ ] Al cerrar el panel, el HUD derecho vuelve al detalle del cursor sin
      parpadeo; con el panel abierto, la ficha manda sobre la casilla del cursor.
- [ ] `Enter` abre un submenú flotante junto al objeto con las acciones válidas
      según contexto —equipar, desequipar, soltar, recoger—; abrir y cerrar no
      ejecutan nada ni gastan MP.
- [ ] Cada opción anuncia su coste de 1 MP antes de confirmar; con 0 MP aparece
      como no disponible con el motivo; con la mochila llena no se ofrece
      «recoger».
- [ ] `Enter` en el submenú ejecuta una sola operación; `Escape` lo cierra y
      devuelve el foco al objeto; arriba/abajo recorren opciones e
      izquierda/derecha no hacen nada.
- [ ] Tras ejecutar, se aplica N-008: el foco sigue en el objeto si existe y, si
      desapareció, pasa al más próximo a su posición anterior; un rechazo explica
      el motivo en el panel y no mueve nada.
- [ ] La ficha y el submenú respetan tokens, escalas y foco visible; legibles a
      1280×720 y 900×700 sin tapar la columna del objeto seleccionado.
- [ ] `pnpm run verify` pasa con tests nuevos de composición de la ficha, opciones
      por contexto, costes y rechazos, y E2E de los cuatro flujos; sin tests
      debilitados.

# Plan de test

- Unitario: composición de ficha con y sin equipado; acciones válidas por
  contexto; etiquetas de coste y motivos de rechazo.
- Integración: selección → ficha; ejecutar → estado y foco; cierre del panel →
  detalle del cursor; 0 MP y mochila llena.
- E2E / visual: equipar, desequipar, recoger y soltar desde el submenú, con
  capturas 1280×720 y 900×700 del submenú y de la ficha con dos bloques.
- Manual: comparar dos armas sin abrir otra pantalla y comprobar que `Escape`
  nunca ejecuta.

# Evidencia esperada

- [ ] Informe en `artifacts/TASK-0102/attempt-1/report.md`
- [ ] Salida de `pnpm run verify` y de los tests focalizados
- [ ] Capturas en `artifacts/TASK-0102/attempt-1/screenshots/`
- [ ] Commit SHA en la rama `task/TASK-0102`

# Restricciones

- No cambiar reglas, costes ni catálogo; las operaciones siguen siendo las del
  motor y se cobran al ejecutar.
- No implementar cofres ni inventario de cadáver (REQ-020/021).
- No rediseñar la rejilla ni la figura de equipo: ya vienen de TASK-0101.
- Sin dependencias nuevas.

# No objetivos

- E2E y QA visual final del hito, y actualización de arquitectura y glosario.
- Atajos nuevos fuera del panel; `G` y `1`-`3` siguen retirados.
