---
type: Task
id: TASK-0155
title: "Docs: ADR-029 y documentación de hotseat"
description: "Registrar ADR-029 del modelo de turnos hotseat y actualizar glosario, economía de turno y arquitectura con `N`, ronda, relevo, fase enemiga y resultado."
status: stable
task_status: done
task_type: docs
requirement: REQ-031
requirement_ids: [T-013]
depends_on: [TASK-0146, TASK-0147, TASK-0148, TASK-0149, TASK-0150, TASK-0151, TASK-0152, TASK-0153]
unlocks: []
created_at: 2026-11-14T23:31:45Z
completed_at: 2026-11-16T10:28:00Z
assignee: game-lead
attempts: 1
artifacts: artifacts/TASK-0155/
priority: P2
risk: low
review_required: true
generated: { by: deepseek/v4.1-flash, at: 2026-11-14T23:31:45Z }
verified:
  - by: game-lead
    at: 2026-11-16T10:28:00Z
    note: >-
      Intento 1 verificado (docs `96a8bf1`, evidencia `c11b511`). ADR-029 nuevo,
      glosario con relevo/ronda/Jugador N de M, economía y arquitectura sin `E` ni
      `R` y con recursos por jugador y separación motor/host; `docs:check` y
      `pnpm run verify` en verde. Detalle en
      `attempt-1/lead-verify/verification.md`.
---

# Objetivo

Que ADR-029 y la documentación de diseño describan el hotseat implementado
—turno por jugador, `N`, ronda, relevo, fase enemiga y resultado— sin dejar `E`
ni `R` como controles vigentes.

# Contexto

REQ-031
[T-013](../requirements/REQ-031-hotseat-local.md#requisitos-técnicos) pide
ADR-029 y actualizar glosario, economía de turno y arquitectura. TASK-0146 a
TASK-0153 implementan el modo. Las notas en hojas de requisitos son TASK-0159.

# Criterios de aceptación

- [x] ADR-029 registra jugador activo, `EndTurn` con `N`, orden fijo, una fase
      enemiga por ronda, relevo por cámara, recursos por turno, muerte en turno,
      resurrección por índice y resultado con Nueva/Cargar.
- [x] ADR-029 deja claro que no hay reinicio rápido ni temporizadores y que la
      pausa es la de REQ-024.
- [x] El glosario define «hotseat», «relevo», «ronda», «fase enemiga» y «Jugador
      N de M».
- [x] La economía de turno y la arquitectura reflejan `N`/`Esc`, la ausencia de
      `E`/`R`, los recursos por jugador y la separación motor/host.
- [x] `docs/decisions/index.md` y `docs/log.md` recogen ADR-029 y el cierre.
- [x] No se editan hojas de `docs/requirements/**`; eso es TASK-0159.
- [x] `pnpm run docs:check` y `pnpm run verify` pasan.

# Plan de test

- Documental: `pnpm run docs:check`.
- Integración: `pnpm run verify`.
- E2E / visual: no; tarea documental sin UI.
- Manual: contrastar ADR-029, glosario, economía de turno y arquitectura con
  REQ-031 v2 y el modo implementado.

# Evidencia esperada

- [x] Informe en `artifacts/TASK-0155/attempt-1/report.md`
- [x] Salida de `pnpm run docs:check` y `pnpm run verify`
- [x] Commit SHA

# Comandos

| Comando | Timeout |
|---|---:|
| `pnpm run docs:check` | 60 s |
| `pnpm run verify` | 240 s |

# Restricciones

- Solo `docs/design/**`, `docs/glossary.md`, `docs/decisions/**` y `docs/log.md`.
- No cambiar reglas, duraciones ni controles.
- No reescribir requisitos aprobados ni evidencia histórica.
- Handoff: brief 1,5 KB, informe 2 KB; tope duro 4 KB.
- pnpm, nunca npm ni npx.

# No objetivos

- Notas en REQ-005/017/018/021/022/023/024/026; van en TASK-0159.
- Cambios de código, UI o motor.
- Documentar botín, guardado o arranque.
