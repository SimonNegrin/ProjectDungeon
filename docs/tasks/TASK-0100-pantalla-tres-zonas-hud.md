---
type: Task
id: TASK-0100
title: "UI: pantalla en tres zonas con HUD izquierdo y derecho"
description: "Retirar el HUD superior y componer HUD izquierdo con la ficha del jugador activo, mapa de 13×13 y HUD derecho con el detalle del cursor, sin perder casillas visibles ni mensajes."
status: stable
task_status: done
task_type: feature
requirement: REQ-032
requirement_ids: [R-006, R-007, T-001, T-003, T-006]
depends_on: [TASK-0099]
unlocks: [TASK-0101]
created_at: 2026-11-14T00:20:17Z
completed_at: 2026-11-14T01:20:00Z
assignee: task-runner
attempts: 2
artifacts: artifacts/TASK-0100/
priority: P1
risk: medium
review_required: true
generated: { by: deepseek/v4.1-flash, at: 2026-11-14T00:20:17Z }
verified:
  - by: task-lead
    at: 2026-11-14T01:20:00Z
    note: >-
      Intentos 1 y 2 verificados (commits `57890ae`, `351cb72`, `c910a64` y
      `9f265da`; informes en `attempt-1/` y `attempt-2/`). Reejecutados
      `pnpm run verify` (1278/1278, build y bundle) y `pnpm run test:e2e`
      (141/141) con timeout de 120 s y 180 s, sin procesos huérfanos. Diff
      revisado: `index.html`, `src/host/hud-detail.ts`, `src/host/hud.ts`,
      `src/host/ui.css`, tests y artefactos; sin cambios en `src/game/**`,
      `package.json`, `pnpm-lock.yaml`, `docs/requirements/**`,
      `docs/harness/**` ni `docs/templates/**`. Comprobados los criterios:
      tres zonas dentro del marco, mapa 13×13 intacto a 1280×720 y 900×700,
      ficha izquierda con maná condicional, cambio de turno y fantasma de
      vista; detalle derecho por tipo con LOS y «Desconocido»; consulta de
      solo lectura; mensajes, banners y anclajes de REQ-017; y R-007 con el
      panel modal limitado al mapa y ambos HUD visibles (intento 2). Las
      capturas de ambos intentos se revisaron. Los traits muestran el estado
      vacío real porque REQ-019 no está implementado; no se inventan notas de
      recorte. Los `rgba` heredados de cursor, hechizos y panel quedan fuera
      del alcance de esta tarea; las reglas nuevas del HUD usan tokens.
---

# Objetivo

Que la pantalla se lea en tres zonas dentro del marco 16:9 —HUD izquierdo con el
jugador activo, mapa cuadrado intacto y HUD derecho con lo que hay bajo el
cursor— sin barra superior y sin perder casillas, mensajes ni anclajes de
feedback.

# Contexto

- Hoy el HUD es una barra superior fuera del marco; el mapa de 13×13 queda
  centrado con franjas laterales vacías de ≈162 px lógicos (≈280 px a 1280×720).
- Geometría en `src/host/layout.ts`; estilos y tokens en `src/host/ui.css`
  (TASK-0099); HUD actual en `src/host/hud.ts`.
- Contenido: [REQ-022](../requirements/REQ-022-hud-izquierdo-jugador.md) v3 a la
  izquierda y [REQ-023](../requirements/REQ-023-hud-derecho-detalle-cursor.md) v3
  a la derecha; [REQ-032](../requirements/REQ-032-estilo-visual-interaccion-ui.md)
  R-006/R-007 y [REQ-017](../requirements/REQ-017-feedback-visual-eventos.md)
  para los anclajes.
- No hay cofres jugables hasta REQ-020: el panel derecho debe tipar el contenedor,
  pero no aparecerá ninguno.

# Criterios de aceptación

- [ ] No queda HUD de juego fuera del marco: izquierda con la ficha del jugador
      activo, mapa de 13×13 en el centro y derecha con el detalle del cursor. El
      mapa no encoge ni pierde casillas visibles a 1280×720 ni a 900×700.
- [ ] La ficha izquierda muestra miniatura del sprite a píxel entero, nombre,
      arquetipo, PV, MP, acciones, atributos con efecto, traits activos con nota
      de recorte y maná solo cuando el personaje lo necesita; cambia en el beat de
      turno y, en fantasma, muestra su condición y MP intrínseco.
- [ ] El HUD derecho describe por tipo: enemigo (PV actual/máximo, arma, escudo,
      armadura, acciones y magia/maná si procede), aliado (stats y estado, nunca
      inventario), objeto en el suelo (nombre), puerta (tipo y zona si el dato
      existe), terreno (suelo, muro, entrada, salida) y «desconocido» sin línea de
      visión. Los contenedores de REQ-023 quedan tipados pero no entran aquí:
      llegan con REQ-020.
- [ ] La consulta se actualiza por tile y no altera estado, RNG, percepción ni
      costes; consultar es de solo lectura.
- [ ] Los mensajes, avisos y banners de REQ-017 siguen viéndose y comportándose
      igual, con su anclaje ajustado al marco nuevo; ninguna tecla cambia.
- [ ] La UI usa los tokens y escalas de `ui.css`: sin literales nuevos de color o
      grosor, y los `rgba(...)` sueltos pasan a tokens.
- [ ] Texto legible y sin solapes en las dos resoluciones; el estado no depende
      solo del color y el contraste se mantiene.
- [ ] `pnpm run verify` pasa, con tests nuevos de composición por tipo, línea de
      visión, turno y fantasma; no se debilita ningún test existente.

# Plan de test

- Unitario: composición del detalle por tipo (unidad, objeto, puerta, terreno,
  desconocido); visibilidad con y sin línea de visión; formato numérico.
- Integración: turno y fantasma en la ficha izquierda; cursor sobre cada tipo;
  consulta sin cambios de snapshot; anclajes de REQ-017.
- E2E / visual: capturas 1280×720 y 900×700 con las tres zonas, enemigo,
  aliado, objeto, puerta, terreno y «desconocido».
- Manual: comprobar que el mapa no pierde casillas en ninguna de las dos
  resoluciones y que la ficha se lee a 900×700.

# Evidencia esperada

- [ ] Informe en `artifacts/TASK-0100/attempt-1/report.md`
- [ ] Salida de `pnpm run verify` y de los tests focalizados
- [ ] Capturas en `artifacts/TASK-0100/attempt-1/screenshots/`
- [ ] Commit SHA en la rama `task/TASK-0100`

# Restricciones

- No implementar cofres jugables, contenedores con contenido ni inventario de
  cadáver (REQ-020/021); el tipo queda documentado en REQ-023, sin datos falsos.
- No rediseñar el panel de inventario ni añadir el submenú: es la tarea siguiente.
- No cambiar el viewport de 13×13, la resolución lógica ni el 16:9.
- No tocar el motor ni las reglas; `src/game/` no importa `src/host/`.

# No objetivos

- Panel de tres columnas, figura de equipo, ficha del objeto seleccionado y
  submenú contextual (TASK-0101).
- E2E y QA visual del panel nuevo, y actualización de arquitectura y glosario.
