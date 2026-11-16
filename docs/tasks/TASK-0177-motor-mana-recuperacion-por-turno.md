---
type: Task
id: TASK-0177
title: "Motor: recuperación de maná +4 por turno"
description: "Cada unidad recupera 4 de maná al inicio de su propio turno, hasta el máximo, en vez de rellenar la reserva completa."
status: stable
task_status: in_progress
task_type: feature
requirement: REQ-025
requirement_ids: [R-004, T-005]
depends_on: []
unlocks: [TASK-0179]
created_at: 2026-11-16T22:59:36Z
completed_at:
assignee: task-runner
attempts: 0
artifacts: artifacts/TASK-0177/
priority: P1
risk: medium
review_required: true
generated: { by: deepseek/v4.1-flash, at: 2026-11-16T22:59:36Z }
verified:
---

# Objetivo

Que el maná deje de rellenarse cada turno: cada unidad viva recupera **+4 al
inicio de su propio turno**, hasta su máximo, con la cifra en una constante
global ajustable. El maná inicial sigue lleno y cambiar el nivel de magia solo
recalcula el máximo y recorta el actual.

# Contexto

Hoy `restoreMana` en `src/game/mana.ts` devuelve la reserva completa y lo usan el
inicio de turno y el cambio de nivel. La regla nueva está en
[REQ-025](../requirements/REQ-025-magia-hechizos-mana.md#requisitos-creativos-decididos)
R-004 y T-005; el motivo y el riesgo, en
[ADR-019](../decisions/ADR-019-magia-mana-hechizos.md#enmienda-2026-11-16). El
maná ya es serializable (`Unit.mana { current, max }`): el formato de guardado no
cambia.

# Criterios de aceptación

- [ ] `MANA_RECOVERY_PER_TURN = 4` se exporta desde `src/game/mana.ts`; la
      recuperación es `min(actual + 4, máximo)` y los tests leen la constante, no
      un 4 duplicado.
- [ ] Al empezar el turno de un jugador y de un enemigo se aplica +4, sin superar
      el máximo; una unidad que aún no ha actuado conserva su maná; el estado
      inicial sigue con la reserva llena.
- [ ] Cambiar el nivel de magia recalcula el máximo y recorta el actual; no
      regala maná. Hay test de subida y de bajada.
- [ ] Los tests existentes de maná, turno, hechizos y experimentos se actualizan
      a la intención nueva sin debilitarse; costes, efectos y resolución de
      hechizos no cambian.
- [ ] `pnpm run verify` pasa.

# Plan de test

- Unitario: `tests/unit/game/mana.test.ts` con +4, tope al máximo, maná inicial,
  cambio de nivel y unidad muerta; `engine`/`turn` para jugador y enemigo;
  cualquier expectativa de maná en `magic` o experimentos se ajusta a +4.
- Integración: `pnpm run verify`.
- E2E / visual: no aplica; el HUD y los flujos visibles se cubren en TASK-0179.
- Manual: opcional; la evidencia va en tests.

# Evidencia esperada

- [ ] Informe en `artifacts/TASK-0177/attempt-1/report.md`
- [ ] Salida de los tests nuevos y de `pnpm run verify`
- [ ] Commit SHA

# Restricciones

- Sin cambios de catálogo, costes, curación ni resurrección (TASK-0178).
- Sin cambios de host, HUD ni E2E (TASK-0179).
- Sin dependencias nuevas; el formato de guardado y el snapshot no cambian.
- No se debilitan tests existentes ni se fija el 4 en varios sitios.

# No objetivos

- La regla de Curación III ni el coste de Resurrección IV.
- Rebalancear daño, PV o enemigos más allá de reflejar +4 en los tests.
- Mostrar el maná recuperado con un aviso propio.
