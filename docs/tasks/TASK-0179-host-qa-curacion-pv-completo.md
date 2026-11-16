---
type: Task
id: TASK-0179
title: "Host y E2E: aviso de PV completo y curación adyacente"
description: "El HUD explica el rechazo por PV completo, la lista muestra el coste y alcance reales y el E2E cubre curación adyacente, autocuración, rechazo y +4 de maná."
status: stable
task_status: in_progress
task_type: qa
requirement: REQ-025
requirement_ids: [R-004, R-013, R-014, T-005, T-008, T-012]
depends_on: [TASK-0177, TASK-0178]
unlocks: []
created_at: 2026-11-16T22:59:36Z
completed_at:
assignee: task-runner
attempts: 0
artifacts: artifacts/TASK-0179/
priority: P1
risk: low
review_required: true
generated: { by: deepseek/v4.1-flash, at: 2026-11-16T22:59:36Z }
verified:
---

# Objetivo

Que el jugador vea por qué no se cura a un aliado a PV completo y que la mesa
demuestre, con E2E, que Curación III funciona a 1 casilla y sobre uno mismo, que
cuesta 8, cura 6 y que el maná sube +4 al empezar el turno.

# Contexto

TASK-0177 cambia la recuperación de maná y TASK-0178 el catálogo y la validación.
Esta ficha cubre la presentación y la evidencia de punta a punta. El motivo de PV
completo está en
[REQ-025](../requirements/REQ-025-magia-hechizos-mana.md#requisitos-creativos-decididos)
R-014; el aviso genérico y los textos viven en `src/host/notices.ts` y
`src/host/feedback-events.ts`. Los specs de referencia son
`tests/e2e/spell-hud-qa.spec.ts` y `tests/e2e/damage-types-qa.spec.ts`.

# Criterios de aceptación

- [ ] El rechazo por PV completo muestra un aviso legible («Ya está a PV
      completo» o equivalente) y el HUD no pierde maná, acción ni hueco.
- [ ] La lista de hechizos y el detalle muestran coste 8 y alcance 1 de Curación
      III y coste 12 de Resurrección IV desde el catálogo, sin números duplicados.
- [ ] El E2E cubre: aliado adyacente curado 6 PV; autocuración; rechazo a PV
      completo sin gastar; alcance 2 rechazado; maná 12 → 4 tras curar y 8 tras
      terminar y empezar el turno siguiente.
- [ ] Los specs que asumían curación a 2 casillas y 4 PV se actualizan sin perder
      sus aserciones de rechazo, tope, HUD y feedback.
- [ ] Capturas a 1280×720 y 900×700 con el aviso y la lista; sin errores de
      consola. `pnpm run verify` y `pnpm run test:e2e` pasan.

# Plan de test

- Unitario: mapeo del motivo nuevo a aviso; modelo de la lista con coste/alcance
  leídos del catálogo.
- Integración: `pnpm run verify`.
- E2E / visual: escenario con Clérigo y aliado adyacente dañado; autocuración;
  aliado a PV completo; aliado a 2 casillas; HUD de maná tras el turno.
- Manual: opcional; la evidencia funcional va en E2E y capturas.

# Evidencia esperada

- [ ] Informe en `artifacts/TASK-0179/attempt-1/report.md`
- [ ] Salida de `pnpm run verify` y `pnpm run test:e2e`
- [ ] Capturas en `<spec>/screenshots/` con `E2E_ARTIFACTS_DIR`
- [ ] Commit SHA

# Restricciones

- Sin cambios de reglas, catálogo ni maná: solo presentación, tests y E2E.
- No se debilitan los specs existentes ni se eliminan sus rechazos.
- Sin dependencias nuevas ni arte nuevo.
- No se implementa el contorno de REQ-030.

# No objetivos

- El alcance visible de todos los hechizos (REQ-030).
- Rebalancear la party inicial o el Clérigo.
- Sonido o animaciones nuevas.
