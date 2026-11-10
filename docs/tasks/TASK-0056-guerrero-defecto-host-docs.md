---
type: Task
id: TASK-0056
title: "Guerrero por defecto, host, tests y docs del roster"
description: "El personaje por defecto es el Guerrero (con +1 de resistencia); el host muestra nombre y arquetipo; docs y E2E del roster."
status: stable
task_status: done
task_type: feature
requirement: REQ-015
requirement_ids: [T-003, T-005, T-006]
depends_on: [TASK-0054, TASK-0055]
unlocks: []
created_at: 2026-11-09T15:30:00Z
completed_at: 2026-11-10T00:19:34Z
assignee: task-runner
attempts: 1
artifacts: artifacts/TASK-0056/
priority: P1
risk: medium
review_required: true
generated: { by: deepseek/v4-pro, at: 2026-11-09T15:30:00Z }
verified:
  - by: task-lead
    at: 2026-11-10T00:19:34Z
    note: >-
      Intento 1 verificado en `task/TASK-0056` (brief `8cf7de5`, código y tests
      `81d45cf`, informe `cb9849c`, documentación `e8392da`). Diff revisado:
      Guerrero por defecto con stats/equipo del roster y resistencia 1 en el
      spawn real, `Unit.archetypeId` serializable, HUD con nombre y arquetipo,
      rechazo `unarmed` y ataque armado; glosario, `turn-economy` y arquitectura
      actualizados. Sin tests borrados, saltados ni debilitados, ni cambios de
      balance, fórmula, dependencias o fuera de alcance. Lead re-ejecutó
      `pnpm run docs:check` (271 documentos), `pnpm run verify` (758/758, build
      y bundle OK) y `pnpm run test:e2e` (77/77).
---

# Objetivo

Que el personaje por defecto sea el Guerrero de
[REQ-015](../requirements/REQ-015-roster-arquetipos.md) (stats y equipo del
roster, con +1 de resistencia respecto al provisional), que el host muestre
nombre y arquetipo, y que documentación, tests y E2E lo cubran.

# Contexto

- Guerrero y su equipo: REQ-015 «Stats inherentes» y «Equipo inicial».
- Sustituye al jugador provisional de REQ-014 (resistencia 0 → 1); REQ-015
  `T-003`.
- Host: `src/host/hud.ts`, `debug.ts`.

# Criterios de aceptación

- [x] El jugador por defecto usa stats y equipo del Guerrero; el balance de
  enemigos y armas no cambia.
- [x] El host muestra el nombre y el arquetipo del personaje.
- [x] Un arquetipo con «arma futura» no puede atacar (rechazo); con arma sí.
- [x] Glosario (arquetipo, roster) actualizado; `pnpm run docs:check` y
  `pnpm run verify` pasan.
- [x] E2E smoke: el personaje por defecto es el Guerrero, con su nombre y stats.

# Plan de test

- **Unitario:** default Guerrero (resistencia +1), nombre mostrado, ataque con y
  sin arma.
- **E2E / visual:** smoke del jugador por defecto y HUD; captura.
- **Manual:** verificar nombre y arquetipo en pantalla.

# Evidencia esperada

- [x] Informe en `artifacts/TASK-0056/attempt-1/report.md`.
- [x] Salidas de tests, `verify` y captura del HUD.
- [x] Commit SHA.

# Restricciones

- No cambiar fórmula ni valores de enemigos/armas.
- No implementar la pantalla de inicio ni la selección (REQ-016).
- Sin dependencias nuevas; `src/game/` sigue puro.

# No objetivos

- Pantalla de inicio, edición de nombre y assets de sprite (REQ-016).
- Bestiario y objetivos de win % (hoja futura).
