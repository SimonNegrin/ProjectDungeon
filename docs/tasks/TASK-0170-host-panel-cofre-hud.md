---
type: Task
id: TASK-0170
title: "Host/UI: abrir cofre con Espacio/Enter, columna «Cofre» y HUD"
description: "Abrir el cofre desde el cursor adyacente con Espacio/Enter, mostrar su contenido en la columna derecha del panel con una sola fuente, seguir el cofre en el HUD derecho y producir feedback de apertura y transferencia."
status: stable
task_status: done
task_type: feature
requirement: REQ-020
requirement_ids: [R-011, R-012, T-007, T-009]
depends_on: [TASK-0169]
unlocks: [TASK-0171]
created_at: 2026-11-16T16:20:04Z
completed_at: 2026-11-16T17:42:40Z
assignee: task-runner
attempts: 1
artifacts: artifacts/TASK-0170/
priority: P1
risk: medium
review_required: true
generated: { by: deepseek/v4.1-flash, at: 2026-11-16T16:20:04Z }
verified:
  - by: game-lead
    at: 2026-11-16T17:42:40Z
    note: >-
      Intento 1 verificado (`bb01f3f2`, `e0c15305`). Siete criterios firmados:
      apertura con Espacio/Enter y aviso sin mover, panel Cofre/Suelo exclusivo,
      HUD sin contenido en cerrado, transferencias con la navegación existente,
      cue y banner con beat, seis capturas a 1280×720 y 900×700 y 287 E2E. La
      fila de la matriz de REQ-017 se añadió en `1170a6d` como cierre documental
      del lead. Detalle en `attempt-1/lead-verify/verification.md`.
---

# Objetivo

Que abrir y saquear un cofre se sienta directo: cursor sobre el cofre, una tecla,
1 acción y el contenido en la columna derecha, con el resto del panel intacto
([REQ-020](../requirements/REQ-020-cofres-saqueo.md#requisitos-creativos-decididos)
R-011 y R-012).

# Contexto

El panel de tres columnas ([REQ-033](../requirements/REQ-033-revision-visual-hud-panel.md))
muestra Equipo, Bolsa y Suelo con los cadáveres del tile. `Espacio`/`Enter` sobre
el cursor hoy mueve o ataca. El HUD derecho ya sigue al cursor
([REQ-023](../requirements/REQ-023-hud-derecho-detalle-cursor.md)) y no revela
contenido de un contenedor cerrado. La matriz de feedback vive en
[REQ-017](../requirements/REQ-017-feedback-visual-eventos.md#matriz-evento--feedback).

# Criterios de aceptación

- [x] Con el cursor sobre un cofre adyacente, `Espacio`/`Enter` abre el cofre y
      gasta 1 acción; sin adyacencia o sin acción se rechaza con el aviso actual y
      sin mover al jugador.
- [x] Abrir un cofre abre el panel con la columna derecha en «Cofre» y su
      contenido; `I` abre «Suelo» con suelo y cadáveres del tile. Nunca se ven dos
      fuentes a la vez en esa columna.
- [x] Con el panel cerrado, el HUD derecho muestra el cofre cerrado sin contenido y
      el contenido cuando está abierto.
- [x] Coger, depositar y «coger todo» se manejan con la navegación existente y sin
      atajos nuevos; el coste anunciado coincide con el motor.
- [x] Abrir y cada transferencia producen su fila en la matriz de REQ-017, con beat
      y sin bloquear más de lo que dura el beat.
- [x] Tests de host y E2E de las dos vistas del panel, apertura por teclado,
      depósito y vuelta a «Suelo»; capturas a 1280×720 y 900×700.
- [x] `pnpm run verify` pasa.

# Plan de test

- Unitario: `tests/unit/host/inventory-panel.test.ts` e `input.test.ts`.
- Integración: cursor sobre cofre cerrado y abierto; acciones agotadas.
- E2E / visual: `<spec>/screenshots/` con «Cofre» y «Suelo»; sin CLS.
- Manual: abrir, coger todo, depositar y cerrar.

# Evidencia esperada

- [ ] Informe en `artifacts/TASK-0170/attempt-1/report.md`
- [ ] Salida de `pnpm run verify`
- [ ] Capturas E2E con `E2E_ARTIFACTS_DIR`
- [ ] Commit SHA

# Restricciones

- Sin cambios en reglas, botín, costes ni generación: solo presentación e input.
- Sin teclas nuevas; sin sonido; sin arte definitivo del cofre (usa el sprite
  disponible o un marcador declarado en el informe).
- No romper el saqueo de cadáveres ni la navegación por zonas.
- Handoff 2 KB, tope duro 4 KB; pnpm, nunca npm.

# No objetivos

- QA completa y playtest (TASK-0171).
- Glosario, economía de turno y alcance (TASK-0172).
- Cofres cerrados, trampas y llaves.
