---
type: Task
id: TASK-0096
title: "Host: objetos del suelo con sprite, efectos y debug"
description: "Dibujar los objetos del suelo con su recorte de items.png, presentar los cues de recoger, soltar y equipar sin parpadeos, usar el mismo sprite en el panel y exponer mochila, equipo, capacidad y objetos del suelo en F1."
status: stable
task_status: backlog
task_type: feature
requirement: REQ-018
requirement_ids: [T-010, T-011]
depends_on: [TASK-0094]
unlocks: [TASK-0097, TASK-0098]
created_at: 2026-11-13T19:22:51Z
completed_at:
assignee: task-runner
attempts: 0
artifacts: artifacts/TASK-0096/
priority: P2
risk: medium
review_required: true
generated: { by: deepseek/v4.1-flash, at: 2026-11-13T19:22:51Z }
verified:
---

# Objetivo

Que los objetos del mundo se lean como objetos —no como formas provisionales— con
el arte de `items.png`, que recoger, soltar y equipar tengan su cue y que el debug
muestre el inventario y el suelo con la misma verdad que el panel.

# Contexto

- `renderer.ts` dibuja hoy las armas del suelo con `drawWeaponShape`, una forma
  plana por ID.
- El catálogo de TASK-0093 declara `sheet` y recorte; `assets.ts` carga los PNG.
- El panel de TASK-0095 muestra nombre, stats y traits; aquí recibe el icono.
- [REQ-018](../requirements/REQ-018-inventario-equipo.md#requisitos-técnicos)
  T-010 y T-011; [ADR-006](../decisions/ADR-006-arte-placeholder-32rogues.md);
  [REQ-017](../requirements/REQ-017-feedback-visual-eventos.md) para los cues.
- El host lee el estado; no decide qué objeto existe.

# Criterios de aceptación

- [ ] Cada objeto del suelo se dibuja con su recorte de `items.png`, legible sobre
      el suelo y sin tapar la unidad que está encima.
- [ ] El panel muestra el mismo icono que el suelo para cada objeto, además de
      nombre, stats y traits.
- [ ] Recoger oculta el objeto del suelo y lo muestra en la mochila al terminar su
      cue; soltar hace lo inverso y equipar mueve entre zonas sin duplicar el icono
      en ningún frame.
- [ ] Los cues respetan el ritmo de `REQ-017` y `prefers-reduced-motion` cuando
      corresponda; no hay parpadeo ni objeto fantasma.
- [ ] `F1` y el snapshot de debug exponen mochila, equipo por hueco, capacidad y
      objetos del suelo con su localización; la UI y `F1` leen el mismo estado.
- [ ] La ayuda de controles muestra `I` y `Escape` y ya no menciona `G` ni `1`-`3`.
- [ ] Sin arte nuevo fuera de `items.png`; sin dependencias nuevas.
- [ ] `pnpm run verify` pasa y los tests de render, snapshot y feedback se
      actualizan sin debilitarse.

# Plan de test

- Unitario: recorte por objeto; icono del panel; snapshot de mochila, equipo,
  capacidad y suelo; texto de ayuda.
- Integración: estado → render con objeto en el suelo; cue de recogida → panel;
  soltar equipado → suelo; `F1` coherente con el panel.
- E2E / visual: no aplica aquí; llega en TASK-0098.
- Manual: comprobar que se distingue una espada de una daga en el suelo y en el
  panel a tamaño normal.

# Evidencia esperada

- [ ] Informe en `artifacts/TASK-0096/attempt-1/report.md`
- [ ] Salida de `pnpm run verify` y de los tests focalizados
- [ ] Commit SHA en la rama `task/TASK-0096`

# Restricciones

- No cambiar reglas, catálogo, costes ni operaciones.
- No rediseñar el HUD lateral ni el marco 16:9.
- No añadir piezas de `REQ-019`/`REQ-020` ni cofres.
- Sin dependencias nuevas; `src/game/` no importa `src/host/`.

# No objetivos

- Documentación (TASK-0097) y E2E (TASK-0098).
- Animaciones nuevas de inventario más allá de los cues existentes.
