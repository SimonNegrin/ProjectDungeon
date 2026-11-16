---
type: Task
id: TASK-0178
title: "Motor: Curación adyacente, autocuración y costes 8/12"
description: "Curación III pasa a alcance 1 con diagonales, admite al lanzador, cuesta 8 y cura 6; Resurrección IV cuesta 12; a PV completo se rechaza sin gastar."
status: stable
task_status: in_progress
task_type: feature
requirement: REQ-025
requirement_ids: [R-009, R-013, R-014, T-006, T-012]
depends_on: []
unlocks: [TASK-0179]
created_at: 2026-11-16T22:59:36Z
completed_at:
assignee: task-runner
attempts: 0
artifacts: artifacts/TASK-0178/
priority: P1
risk: medium
review_required: true
generated: { by: deepseek/v4.1-flash, at: 2026-11-16T22:59:36Z }
verified:
---

# Objetivo

Que Curación III se pueda lanzar sobre cualquier aliado vivo a **1 casilla**,
diagonales incluidas, **incluido el propio lanzador**, con coste **8 de maná** y
**6 PV** curados; que a PV completo se rechace sin gastar; y que Resurrección IV
cueste **12 de maná**.

# Contexto

El catálogo vive en `src/game/spells.ts` y la validación en `src/game/magic.ts`.
Las reglas están en
[REQ-025](../requirements/REQ-025-magia-hechizos-mana.md#catálogo-mínimo-provisional-v1)
R-009, R-013, R-014 y T-012; el motivo del cambio, en
[ADR-019](../decisions/ADR-019-magia-mana-hechizos.md#enmienda-2026-11-16). El
motor ya rechaza de forma atómica: el objetivo es conservar esa atomicidad y
añadir el motivo de PV completo.

# Criterios de aceptación

- [x] El catálogo declara Curación III con coste 8, alcance 1–1, efecto 6 PV y
      objetivo aliado; Resurrección IV con coste 12. Los tests leen el catálogo.
- [x] Curar a un aliado adyacente ortogonal o diagonal aplica
      `min(6, PV máximos − PV actuales)` y consume 8 de maná, 1 acción y 1 hueco
      del tope de 2.
- [x] Curarse a uno mismo funciona con las mismas reglas y coste; enemigos y
      cadáveres siguen rechazados; a 2 casillas se rechaza por alcance.
- [x] Curar a un objetivo a PV completo devuelve un motivo propio y no consume
      acción, maná, hueco ni RNG; hay test de estado intacto.
- [x] Los tests de `magic`, `damage-matrix` y guardado afectados por los valores
      nuevos se actualizan sin perder su intención; `pnpm run verify` pasa.

# Plan de test

- Unitario: catálogo; curación ortogonal y diagonal; autocuración; sobrecura;
  PV completo; enemigo, cadáver y alcance 2; consumo de acción/maná/tope;
  resurrección con 12 y rechazo con menos.
- Integración: `pnpm run verify`; round-trip de guardado con maná y hechizos.
- E2E / visual: no aplica en esta ficha; el aviso y los flujos se cubren en
  TASK-0179.
- Manual: opcional.

# Evidencia esperada

- [ ] Informe en `artifacts/TASK-0178/attempt-1/report.md`
- [ ] Salida de los tests nuevos y de `pnpm run verify`
- [ ] Commit SHA

# Restricciones

- Sin cambios de host, HUD, avisos ni E2E (TASK-0179).
- Sin cambios en la recuperación de maná (TASK-0177) ni en otros hechizos.
- Sin tocar el tope de 2, la LOS, el nivel 3/4 ni el 60 % de resurrección.
- No se debilitan tests existentes.

# No objetivos

- El contorno de alcance de REQ-030.
- El texto exacto del aviso en el HUD.
- Rebalancear el Clérigo o el Mago más allá de estos números.
