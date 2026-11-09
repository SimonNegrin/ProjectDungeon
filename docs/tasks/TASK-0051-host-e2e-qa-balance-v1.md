---
type: Task
id: TASK-0051
title: "Host, E2E y QA visual del balance provisional v1"
description: Actualizar expectativas E2E y QA visual (HP, alarma 5, MP 5/4/6 y armas 3/5/2), verificar el host y dejar capturas y playtest.
status: draft
task_status: backlog
task_type: qa
requirement: REQ-010
requirement_ids: [R-007, R-008, R-009, T-008]
depends_on: [TASK-0050]
unlocks: []
created_at: 2026-11-09T12:00:00Z
completed_at:
assignee: task-runner
attempts: 0
artifacts: artifacts/TASK-0051/
priority: P1
risk: medium
review_required: true
generated: { by: deepseek/v4.1-flash, at: 2026-11-09T12:00:00Z }
verified:
---

# Objetivo

Que el host, los E2E y la QA visual reflejen el balance provisional v1 sin
regresiones: HP 6/8/5, alarma 5, MP 5/4/6, armas 3/5/2 y centinela sin armadura.

# Contexto

- Requisitos:
  [REQ-010](../requirements/REQ-010-combate-equipo-acierto-defensa.md#balance-provisional-v1)
  y [REQ-009](../requirements/REQ-009-percepcion-alarma-huida.md#bestiario-mínimo).
- E2E afectados: `equipment-hud-qa`, `combat-equipment-qa`, `frame-qa`,
  `game-input-hud`, `generated-map-qa`, `perception-host-qa`,
  `perception-alarm-qa`, `perception-fixtures`, `flee-behavior-qa` y
  `support.ts`.
- El host lee del catálogo; se esperan cambios de tests y, como mucho, de
  etiquetas o avisos hardcodeados.

# Criterios de aceptación

- [ ] HUD, debug y avisos muestran HP 6/8/5, alarma 5, MP 5/4/6 y armas 3/5/2;
      el centinela aparece sin armadura.
- [ ] E2E de alarma a 5/6 y colocación ≤5/>5; huida del cobarde con 5 PV y
      6 MP; daños y HP nuevos.
- [ ] `pnpm run test:e2e` y `pnpm run verify` pasan; sin tests debilitados.
- [ ] Capturas 1280×720 y notas de playtest en `artifacts/TASK-0051/`.

# Plan de test

- **E2E:** suites listadas en el contexto; `--repeat-each=3` en alarma y huida.
- **Visual:** capturas de HUD, debug, alarma y huida.
- **Manual:** playtest del usuario con la build; registrar sensaciones.
- **Regresión:** comparar con TASK-0049; no arrastrar fallos stale.

# Evidencia esperada

- [ ] Informe en `artifacts/TASK-0051/attempt-1/report.md`.
- [ ] `test:e2e` y `verify` en `attempt-1/`.
- [ ] Capturas en `attempt-1/screenshots/`.
- [ ] Playtest en `attempt-1/playtest.md`.
- [ ] Commit SHA en la rama `task/TASK-0051`.

# Comandos

| Comando | Timeout |
|---|---:|
| `pnpm run test:e2e` | 180 s |
| `pnpm exec playwright test tests/e2e/perception-alarm-qa.spec.ts --repeat-each=3` | 180 s |
| `pnpm run verify` | 180 s |

# Restricciones

- No cambiar reglas ni fórmulas; solo presentación, datos y expectativas.
- No reescribir decisiones históricas.
- No añadir dependencias.

# No objetivos

- Actualizar el preset de EXP-003 (TASK-0052).
- Ampliar bestiario o catálogo de armas.
- Nuevas mecánicas.
