---
type: Task
id: TASK-0050
title: "Motor: balance provisional v1 (bestiario y armas)"
description: Aplicar PV 6/8/5, alarma 5, MP 5/4/6, centinela sin armadura y armas 3/5/2 desde los catálogos; motor y tests unitarios en verde.
status: draft
task_status: in_progress
task_type: feature
requirement: REQ-010
requirement_ids: [R-003, R-007, R-008, R-009, T-003, T-005, T-008]
depends_on: []
unlocks: [TASK-0051, TASK-0052]
created_at: 2026-11-09T12:00:00Z
completed_at:
assignee: task-runner
attempts: 1
artifacts: artifacts/TASK-0050/
priority: P1
risk: medium
review_required: true
generated: { by: deepseek/v4.1-flash, at: 2026-11-09T12:00:00Z }
verified:
---

# Objetivo

Que el motor use el balance provisional v1 de
[REQ-010](../requirements/REQ-010-combate-equipo-acierto-defensa.md#balance-provisional-v1)
y [REQ-009](../requirements/REQ-009-percepcion-alarma-huida.md#bestiario-mínimo):
PV 6/8/5, alarma 5, MP 5/4/6, centinela sin armadura y armas 3/5/2.

# Contexto

- Valores: REQ-010 «Balance provisional v1» y «Armas aceptadas»; REQ-009
  «Bestiario mínimo».
- Archivos: `src/game/bestiary.ts`, `equipment.ts`, `engine.ts`,
  `enemy-placement.ts`, `types.ts`.
- `enemy-placement.ts` mantiene un `ALARM_RADIUS` propio: debe derivarse del
  bestiario.
- `ENEMY_MAX_MP` es global: pasa a `maxMp` por tipo; los tests sintéticos leen
  del catálogo.

# Criterios de aceptación

- [ ] `BESTIARY` declara `maxMp` (Centinela 5, Bruto 4, Cobarde 6), `maxHp`
      6/8/5 y `alarm` 5; el centinela usa `armorId: null`.
- [ ] `WEAPONS` declara daño 3/5/2; el acierto no cambia.
- [ ] `createEnemy` usa `definition.maxMp`; no hay una constante global como
      fuente de verdad.
- [ ] `enemy-placement.ts` deriva el radio de alarma del bestiario y la
      colocación sigue colocando 4 enemigos en las semillas 279837264, 42 y
      1234 (pareja ≤5 y aislado >5).
- [ ] Los tests unitarios leen del catálogo y no duplican valores; los de
      balance usan propiedades o rangos.
- [ ] `pnpm run verify` pasa; sin dependencias nuevas; `src/game/` sigue puro.

# Plan de test

- **Unitario:** bestiario, engine, percepción (5/6), colocación, IA (5/6 MP),
  combate, integración, sesión y HUD.
- **Integración:** fase enemiga con MP por tipo; el valiente no huye; el cobarde
  con 5 PV y umbral 2.
- **Regresión:** no se borran ni debilitan tests; los que fijaban 4 MP,
  alarma 8 o daños 4/6/3 se migran al catálogo o a propiedades.
- **E2E / visual:** llega en TASK-0051.

# Evidencia esperada

- [ ] Informe en `artifacts/TASK-0050/attempt-1/report.md`.
- [ ] Salidas de tests y `verify` en `attempt-1/`.
- [ ] Commit SHA en la rama `task/TASK-0050`.

# Comandos

| Comando | Timeout |
|---|---:|
| `pnpm exec vitest run tests/unit/game tests/unit/host` | 180 s |
| `pnpm run verify` | 180 s |
| `git diff --stat` | 15 s |

# Restricciones

- No cambiar fórmulas, reglas de percepción ni economía de turno.
- Ajustar solo textos o etiquetas hardcodeadas del host si existen; el HUD lee
  del catálogo.
- No tocar `experiments/`, `index.html`, `public/` ni dependencias.

# No objetivos

- E2E, QA visual y playtest (TASK-0051).
- Actualizar el preset de EXP-003 (TASK-0052).
- Ampliar bestiario o catálogo de armas.
