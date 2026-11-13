---
type: Task
id: TASK-0052
title: "EXP-003: preset de balance provisional v1"
description: Actualizar el catálogo y el roster de EXP-003 al balance v1 y sus tests, sin reescribir la decisión histórica de la tabla A.
status: draft
task_status: blocked
task_type: experiment
requirement: REQ-010
requirement_ids: [R-003, R-008, T-008]
depends_on: [TASK-0050]
unlocks: []
created_at: 2026-11-09T12:00:00Z
completed_at:
assignee: task-runner
attempts: 0
artifacts: artifacts/TASK-0052/
priority: P2
risk: low
review_required: true
generated: { by: deepseek/v4.1-flash, at: 2026-11-09T12:00:00Z }
verified:
---

> **Obsoleta (2026-11-13).** El balance v1 fue sustituido por EXP-003 v2 y por
> REQ-029. Se conserva como referencia histórica; no ejecutar.

# Objetivo

Que EXP-003 mida el balance provisional v1 de
[REQ-010](../requirements/REQ-010-combate-equipo-acierto-defensa.md#balance-provisional-v1)
con el roster nuevo (PV 6/8/5, armas 3/5/2, centinela sin armadura), sin borrar
la decisión histórica de la tabla A.

# Contexto

- `experiments/EXP-003-mesa-combate/src/combat.ts`: `WEAPONS` y `BASE_ROSTER`.
- `experiments/EXP-003-mesa-combate/src/combat.test.ts` y
  `tests/e2e/experiment-combat.spec.ts`.
- `experiments/EXP-003-mesa-combate/experiment.md` ya documenta la
  re-ejecución del 2026-11-09; debe seguir siendo la referencia.

# Criterios de aceptación

- [ ] `WEAPONS` del experimento usa daño 3/5/2 y el roster/preset declara
      HP 6/8/5, el centinela sin armadura y el MP no aplica (el experimento no
      modela MP).
- [ ] El preset nuevo se identifica como «Balance v1» o equivalente; la tabla A
      histórica sigue documentada y no se sobrescribe.
- [ ] Los tests del experimento se actualizan a los valores nuevos; no se
      debilitan.
- [ ] `pnpm run verify` y el E2E del experimento pasan.

# Plan de test

- **Unitario:** `pnpm exec vitest run experiments/EXP-003-mesa-combate/src/combat.test.ts`.
- **E2E:** `pnpm exec playwright test tests/e2e/experiment-combat.spec.ts`.
- **Manual:** abrir la página del experimento y comprobar que el preset muestra
  impacto, daño medio y ataques esperados del balance v1.

# Evidencia esperada

- [ ] Informe en `artifacts/TASK-0052/attempt-1/report.md`.
- [ ] Salidas de tests en `attempt-1/`.
- [ ] Captura del preset en `attempt-1/screenshots/`.
- [ ] Commit SHA en la rama `task/TASK-0052`.

# Comandos

| Comando | Timeout |
|---|---:|
| `pnpm exec vitest run experiments/EXP-003-mesa-combate/src/combat.test.ts` | 120 s |
| `pnpm exec playwright test tests/e2e/experiment-combat.spec.ts` | 180 s |
| `pnpm run verify` | 180 s |

# Restricciones

- No cambiar las fórmulas del experimento.
- No reescribir la decisión histórica de `experiment.md`.
- No tocar el juego de producción ni añadir dependencias.

# No objetivos

- Cambiar el motor o los E2E del juego (TASK-0050 y TASK-0051).
- Ampliar el experimento con MP, alarma o percepción.
