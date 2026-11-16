---
type: Task
id: TASK-0162
title: "Host/UI: traits visibles, desglose y feedback"
description: "Mostrar los traits de cada objeto antes de equipar y los activos del portador, desglosar inherente/equipo/traits y emitir feedback por impacto del círculo y por curación."
status: draft
task_status: done
task_type: feature
requirement: REQ-019
requirement_ids: [R-004, R-005, R-006, T-012, T-013]
depends_on: [TASK-0161]
unlocks: []
created_at: 2026-11-16T00:55:00Z
completed_at: 2026-11-16T09:58:00Z
assignee: task-runner
attempts: 2
artifacts: artifacts/TASK-0162/
priority: P1
risk: medium
review_required: true
generated: { by: deepseek/v4.1-flash, at: 2026-11-16T00:55:00Z }
verified:
  - by: game-lead
    at: 2026-11-16T09:58:00Z
    note: >-
      Intento 2 verificado (UI `fb31d8a`, evidencia `8011bd7`). Los seis
      criterios firmados: desglose de nueve atributos visible en la ficha
      derecha sin `F1`, traits antes de equipar, traits activos con fuente,
      feedback por objetivo, rechazo maza/escudo sin cambios y 276 E2E. El
      intento 1 no se firmó porque el desglose solo existía en `F1`. Detalle en
      `attempt-2/lead-verify/verification.md`.
---

# Objetivo

Que el jugador lea qué hace un trait antes de equipar, entienda de dónde sale
cada stat y vea un evento por cada objetivo del ataque circular y por cada
curación del robo de vida.

# Contexto

TASK-0161 deja traits, agregación y eventos en el motor. El panel de inventario
vive en `src/host/inventory-panel.ts` y su vista en
`src/host/inventory-panel-view.ts`; la ficha y el HUD ya desglosan parte de
`REQ-018`. Los requisitos son
[R-004 a R-006](../requirements/REQ-019-traits-objetos.md#requisitos-creativos-decididos)
y [T-012 y T-013](../requirements/REQ-019-traits-objetos.md#requisitos-técnicos).
Sin TASK-0161 cerrada no se empieza.

# Criterios de aceptación

- [x] El panel de inventario muestra, antes de equipar, nombre, descripción y
      efecto de cada trait de cada objeto; ningún trait se revela al equipar.
- [x] La ficha del portador desglosa inherente, equipo y traits por atributo y
      muestra el total con el mismo valor que lee el motor.
- [x] El HUD o `F1` expone los traits activos del portador y su fuente.
- [x] Cada impacto del ataque circular y cada curación del robo de vida generan
      un evento de feedback por objetivo con texto propio y su beat; el feedback
      no depende solo de color, icono o animación.
- [x] La maza a dos manos y el escudo no coexisten: el rechazo no deja cambios
      parciales y hay E2E con la maza y el escudo en el panel.
- [x] `pnpm run verify` pasa y los E2E de inventario y equipo conservan su
      intención.

# Plan de test

- Unitario: `tests/unit/host/inventory-panel.test.ts` y
  `inventory-panel-view.test.ts`.
- Integración: equipar y desequipar cambia la ficha y el HUD sin recargar.
- E2E: `tests/e2e/inventory.spec.ts` con la maza y el escudo; capturas E2E de la
  ficha y del feedback.
- Manual: playtest con las piezas concedidas por el hook de debug; el informe
  registra el comando usado.

# Evidencia esperada

- [x] Informe en `artifacts/TASK-0162/attempt-1/report.md`
- [x] Salida de `pnpm run verify`
- [x] Capturas E2E en `<spec>/screenshots/` con la ficha y el feedback
- [x] Commit SHA

# Comandos

| Comando | Timeout |
|---|---:|
| `pnpm exec vitest run tests/unit/host/` | 180 s |
| `pnpm exec playwright test tests/e2e/inventory.spec.ts` | 240 s |
| `pnpm run verify` | 240 s |

# Restricciones

- Sin cambios de motor: si hace falta uno, devolver `blocked` con la ruta exacta.
- Sin criterios de QA visual ni revisión estética: van en una tarea `qa`
  posterior; las capturas son evidencia funcional.
- Sin cofres ni botín nuevo; las piezas se inspeccionan con el hook de debug
  hasta REQ-020.
- Sin dependencias nuevas ni arte final; pnpm, nunca npm ni npx.
- Handoff: brief 1,5 KB, informe 2 KB; tope duro 4 KB.

# No objetivos

- Motor de traits, stacking o combate (TASK-0161).
- QA visual y corrección estética.
- ADR-024, glosario y economía de turno (T-011).
- Cofres, saqueo y fuente jugable de las piezas.
