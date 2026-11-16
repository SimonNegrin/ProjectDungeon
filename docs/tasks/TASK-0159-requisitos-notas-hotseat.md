---
type: Task
id: TASK-0159
title: "Requisitos: notas de hotseat en hojas relacionadas"
description: "Anotar en REQ-005, REQ-017, REQ-018, REQ-021, REQ-022, REQ-023, REQ-024 y REQ-026 las enmiendas de REQ-031 v2 sobre turno, relevo, HUD, panel público y controles."
status: stable
task_status: in_progress
task_type: docs
requirement: REQ-031
requirement_ids: [T-013]
depends_on: [TASK-0146, TASK-0147, TASK-0148, TASK-0149, TASK-0150, TASK-0151, TASK-0152, TASK-0153]
unlocks: []
created_at: 2026-11-14T23:31:45Z
completed_at:
assignee: game-lead
attempts: 0
artifacts: artifacts/TASK-0159/
priority: P2
risk: low
review_required: true
generated: { by: deepseek/v4.1-flash, at: 2026-11-14T23:31:45Z }
verified:
---

# Objetivo

Que las hojas enmendadas por REQ-031 v2 dejen constancia del modo hotseat sin
duplicar su detalle ni contradecir sus propias reglas.

# Contexto

REQ-031
[T-013](../requirements/REQ-031-hotseat-local.md#requisitos-técnicos) pide notas
en las hojas relacionadas. La documentación de diseño y ADR-029 es TASK-0155;
esta tarea es solo de `docs/requirements/**` para que tenga un único ejecutor.

# Criterios de aceptación

- [x] REQ-005 anota que la cámara sigue al activo con paneo y al enemigo que
      actúa en la fase enemiga.
- [x] REQ-017 anota los beats de relevo, ronda y «El master mueve»; el aviso de
      ronda no bloquea.
- [x] REQ-018 anota que el panel solo se abre en el turno activo, es público y el
      traspaso directo queda fuera también en hotseat.
- [x] REQ-021 anota que el fantasma cierra turno con `N` y que la resurrección
      respeta el índice de la ronda.
- [x] REQ-022 y REQ-023 anotan «Jugador N de M», la ficha compacta del objetivo y
      el actor enemigo en la columna derecha.
- [x] REQ-024 y REQ-026 anotan pausa global, guardado en fase de personajes,
      carga en el activo, `N` en lugar de `E`, turno por jugador y ronda con una
      fase enemiga; no queda `R`.
- [x] Las notas remiten a REQ-031 v2 y no reescriben requisitos vigentes;
      `docs/log.md` lo registra.
- [x] `pnpm run docs:check` pasa y no hay enlaces rotos.

# Plan de test

- Documental: `pnpm run docs:check`.
- E2E / visual: no; tarea documental sin UI.
- Manual: revisar que las ocho hojas no se contradicen entre sí ni con REQ-031.

# Evidencia esperada

- [x] Informe en `artifacts/TASK-0159/attempt-1/report.md`
- [x] Salida de `pnpm run docs:check`
- [x] Commit SHA

# Comandos

| Comando | Timeout |
|---|---:|
| `pnpm run docs:check` | 60 s |

# Restricciones

- Solo `docs/requirements/**` y `docs/log.md`.
- No cambiar reglas, versiones ni requisitos creativos.
- No editar ADR, glosario, economía de turno ni arquitectura; eso es TASK-0155.
- Handoff: brief 1,5 KB, informe 2 KB; tope duro 4 KB.
- pnpm, nunca npm ni npx.

# No objetivos

- Implementar turnos, HUD, cámara o resultado.
- Cambiar duraciones o controles.
- Documentar botín, guardado o arranque.
- Añadir preguntas abiertas nuevas.
