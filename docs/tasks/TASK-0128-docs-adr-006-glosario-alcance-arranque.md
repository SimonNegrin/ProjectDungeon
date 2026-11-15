---
type: Task
id: TASK-0128
title: "Docs: ADR-006, glosario y alcance del arranque"
description: "Añadir la tabla de 18 sprites a ADR-006 y reflejar en glosario y alcance el menú principal, el paso 1, el resumen y la variante elegida."
status: stable
task_status: blocked
task_type: docs
requirement: REQ-016
requirement_ids: [T-010]
depends_on: [TASK-0127]
unlocks: []
created_at: 2026-11-14T23:31:45Z
completed_at:
assignee: task-lead
attempts: 1
artifacts: artifacts/TASK-0128/
priority: P2
risk: low
review_required: true
generated: { by: deepseek/v4.1-flash, at: 2026-11-14T23:31:45Z }
verified:
---

# Objetivo

Que ADR-006, el glosario y el alcance describan el arranque implementado de
REQ-016 v3 y la variante de sprite elegida, sin contradecir la tabla de sprites
ni el render.

# Contexto

TASK-0122 a TASK-0127 implementan el shell. REQ-016
[T-010](../requirements/REQ-016-pantalla-inicio-configuracion.md#requisitos-técnicos)
reparte la documentación: esta tarea cubre ADR-006, glosario y alcance; las
enmiendas a hojas de requisitos son TASK-0156. ADR-006 describe hoy el pack
`rogues.png` sin la tabla de variantes.

# Criterios de aceptación

- [ ] ADR-006 incorpora la tabla de 18 celdas de REQ-016 con `(sx, sy)` por
      arquetipo y variante, y una nota de que la variante forma parte del estado.
- [ ] El glosario define «menú principal», «paso 1», «resumen» y «variante de
      sprite», con el vocabulario de la UI y sin etiquetas de género.
- [ ] El alcance refleja el arranque, la configuración de 1-6 jugadores y la
      ausencia de persistencia de configuraciones.
- [ ] `docs/decisions/index.md` y `docs/log.md` recogen el cambio.
- [ ] No se editan hojas de `docs/requirements/**`; esas notas son TASK-0156.
- [ ] `pnpm run docs:check` y `pnpm run verify` pasan.

# Plan de test

- Documental: `pnpm run docs:check`.
- Integración: `pnpm run verify`.
- Manual: contrastar ADR-006, glosario y alcance con REQ-016 v3 y el render de
  TASK-0127.

# Evidencia esperada

- [ ] Informe en `artifacts/TASK-0128/attempt-1/report.md`
- [ ] Salida de `pnpm run docs:check` y `pnpm run verify`
- [ ] Commit SHA

# Comandos

| Comando | Timeout |
|---|---:|
| `pnpm run docs:check` | 60 s |
| `pnpm run verify` | 240 s |

# Restricciones

- Solo `docs/design/**`, `docs/glossary.md`, `docs/decisions/**` y `docs/log.md`.
- No cambiar reglas, valores de arquetipos ni la tabla de sprites.
- No reescribir requisitos ya aprobados ni evidencia histórica.
- Handoff: brief 1,5 KB, informe 2 KB; tope duro 4 KB.
- pnpm, nunca npm ni npx.

# No objetivos

- Enmiendas en REQ-022, REQ-024 y REQ-031; van en TASK-0156.
- Cambios de código, UI o arte.
- Documentar hotseat, guardado o botín.
