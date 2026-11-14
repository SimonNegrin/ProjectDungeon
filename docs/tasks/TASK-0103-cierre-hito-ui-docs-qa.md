---
type: Task
id: TASK-0103
title: "Cierre del hito UI: documentación y QA visual"
description: "Reflejar el panel y los HUD implementados en arquitectura, glosario y economía de turno, corregir las notas de vigencia y cerrar con QA visual a 1280×720 y 900×700."
status: stable
task_status: in_progress
task_type: docs
requirement: REQ-032
requirement_ids: [T-007, T-008]
depends_on: [TASK-0102]
unlocks: []
created_at: 2026-11-14T02:14:13Z
completed_at:
assignee: task-lead
attempts: 1
artifacts: artifacts/TASK-0103/
priority: P1
risk: low
review_required: true
generated: { by: deepseek/v4.1-flash, at: 2026-11-14T02:14:13Z }
verified:
---

# Objetivo

Que la documentación describa la UI que existe —tres zonas, panel de tres
columnas con figura, ficha de dos bloques y submenú— sin restos del HUD superior,
de la barra de acciones ni del scroll aceptado, y que el hito quede con capturas
finales y la suite en verde.

# Contexto

- Implementado en TASK-0099 a TASK-0102; el usuario hizo playtest y aprobó el
  panel.
- `docs/design/architecture.md` aún describe el panel antiguo y declara el scroll
  «límite aceptado» (TASK-0097). `docs/design/turn-economy.md` y
  `docs/glossary.md` necesitan los términos nuevos.
- [REQ-032](../requirements/REQ-032-estilo-visual-interaccion-ui.md) v2 T-007 y
  T-008; [REQ-018](../requirements/REQ-018-inventario-equipo.md) v7;
  [REQ-022](../requirements/REQ-022-hud-izquierdo-jugador.md) v3 y
  [REQ-023](../requirements/REQ-023-hud-derecho-detalle-cursor.md) v3.
- Por ADR-016, `docs/design/**` y el glosario los edita el lead: el runner no
  escribe documentos (fricción abierta de TASK-0097). Este trabajo lo asume
  `task-lead`; el runner solo aporta QA y capturas si hace falta.

# Criterios de aceptación

- [ ] `architecture.md` describe las tres zonas del marco, el panel modal sobre el
      mapa, las tres columnas con figura de equipo, la columna de cadáveres y
      suelo con scroll, la ficha del HUD derecho con dos bloques y el submenú; ya
      no declara el scroll del panel como límite aceptado ni la barra de acciones
      como camino vigente.
- [ ] `glossary.md` define ficha del objeto, figura de equipo, zona de cadáveres,
      submenú de acciones y navegación por proximidad con los nombres del código.
- [ ] `turn-economy.md` refleja los controles vigentes del panel (`I`/`Escape`,
      flechas o `WASD`, `Tab`/`Shift+Tab`, `Enter` y `Escape` en el submenú) sin
      cambiar costes ni reglas, y no presenta `G` ni `1`-`3` como vigentes.
- [ ] Las notas de vigencia de ADR-021 y ADR-025 apuntan al cierre de TASK-0099 a
      TASK-0102, al submenú como único camino y a los contenedores pendientes de
      REQ-020.
- [ ] No quedan referencias a HUD superior, barra de acciones ni scroll aceptado
      como estado actual fuera de notas históricas; `REQ-018` consta implementada
      y `docs:check` pasa.
- [ ] QA visual final: capturas 1280×720 y 900×700 de tres zonas, panel con
      mochila llena, ficha de dos bloques y submenú; sin solapes ni texto
      ilegible, y sin scroll del panel a 1280×720.
- [ ] `pnpm run verify` y `pnpm run test:e2e` pasan sin tests debilitados ni
      saltados.

# Plan de test

- Documental: `docs:check`; búsqueda de «HUD superior», «barra de acciones»,
  «límite aceptado», `G` y `1`-`3` para revisar cada aparición.
- Integración: suite completa de unidad y E2E.
- E2E / visual: capturas finales del hito y revisión contra REQ-032 R-006 a R-014.
- Manual: leer arquitectura, glosario y controles y comprobar que coinciden con el
  juego.

# Evidencia esperada

- [ ] Informe en `artifacts/TASK-0103/attempt-1/report.md`
- [ ] Salida de `docs:check`, `pnpm run verify` y `pnpm run test:e2e`
- [ ] Capturas en `artifacts/TASK-0103/attempt-1/screenshots/`
- [ ] Commit SHA en la rama `task/TASK-0103`

# Restricciones

- No cambiar reglas, costes, catálogo ni requisitos: solo reflejar lo
  implementado y la vigencia.
- No tocar `docs/harness/**`, plantillas ni `AGENTS.md`.
- No reescribir evidencia histórica de otros artefactos.
- Sin dependencias nuevas.

# No objetivos

- Contenedores, cofres y cadáveres con inventario (REQ-020/021).
- Hotseat y su HUD (REQ-031).
- Rediseños posteriores del panel: este cierre documenta lo que existe.
