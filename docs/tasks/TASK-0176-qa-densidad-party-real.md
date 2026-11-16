---
type: Task
id: TASK-0176
title: "QA: densidad por party real de punta a punta"
description: "Prueba en el flujo real de nueva partida, guardado y carga que el total de enemigos cambia con la party y que cargar conserva el reparto."
status: stable
task_status: backlog
task_type: qa
scope: [tests/]
requirement: REQ-012
requirement_ids: [R-006, T-014]
depends_on: [TASK-0174]
unlocks: []
created_at: 2026-11-16T20:07:05Z
completed_at:
assignee: task-runner
attempts: 0
artifacts: artifacts/TASK-0176/
priority: P2
risk: medium
review_required: true
generated: { by: deepseek/v4.1-flash, at: 2026-11-16T20:07:05Z }
verified:
---

# Objetivo

Demostrar con evidencia visual que una partida nueva usa el tamaño real de la
party y que guardar y cargar conserva el reparto, según
[REQ-012 R-006 y T-014](../requirements/REQ-012-spawn-sala-protegida.md#requisitos-técnicos)
y [ADR-034](../decisions/ADR-034-densidad-enemigos-party-real.md).

# Contexto

La regla se prueba en la función pura en TASK-0174. Aquí se recorre el camino que
ve el jugador: pantalla de inicio con 1-6 jugadores, mapa generado, guardado en
fase de personajes y carga desde el menú principal. Las herramientas de QA visual
están en la skill `visual-qa`.

# Criterios de aceptación

- [ ] E2E desde la pantalla de inicio con la misma semilla: 1 jugador produce
      4-6 enemigos y 6 jugadores producen 10-12; el informe declara semilla y
      totales observados.
- [ ] Guardar con una party y cargar conserva total, posiciones y tipos de los
      enemigos, sin regenerar el mapa.
- [ ] Capturas con `E2E_ARTIFACTS_DIR` a 1280×720 y 900×700 que muestren el
      reparto de las dos partidas (`F1` o el HUD de enemigos).
- [ ] Sin regresiones en la suite E2E existente.
- [ ] `pnpm run verify` pasa.

# Plan de test

- Unitario: no.
- Integración: no.
- E2E / visual: flujo de nueva partida con 1 y 6 jugadores, y ciclo de guardado y
  carga; capturas de ambos repartos y del estado tras cargar.
- Manual: no.

# Evidencia esperada

- [ ] Informe en `artifacts/TASK-0176/attempt-1/report.md`
- [ ] Salida de `pnpm run verify` en `artifacts/TASK-0176/attempt-1/`
- [ ] Capturas en `<spec>/screenshots/` vía `E2E_ARTIFACTS_DIR`
- [ ] Commit SHA

# Restricciones

- No cambiar el motor ni la UI: si algo falla, se reporta como bloqueo con la
  evidencia.
- No relajar aserciones existentes para que pasen las nuevas.
- Handoff 2 KB, tope duro 4 KB; pnpm, nunca npm.

# No objetivos

- Cambiar factores, cofres o botín.
- Playtest de sensación: lo valida el usuario.
