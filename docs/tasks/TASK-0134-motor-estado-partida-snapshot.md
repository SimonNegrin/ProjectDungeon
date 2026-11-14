---
type: Task
id: TASK-0134
title: "Motor: estado de partida (party, activo, ronda) y snapshot"
description: "Extender el estado con fase, jugador activo, ronda y party ordenada, y exponerlos en el snapshot y en `F1` sin duplicar listas."
status: stable
task_status: backlog
task_type: feature
requirement: REQ-031
requirement_ids: [R-001, R-003, T-001, T-005, T-011]
depends_on: [TASK-0122, TASK-0130, TASK-0131, TASK-0132, TASK-0133]
unlocks: [TASK-0135, TASK-0136, TASK-0138, TASK-0139, TASK-0140, TASK-0141, TASK-0142, TASK-0143, TASK-0146, TASK-0148, TASK-0157]
created_at: 2026-11-14T23:31:45Z
completed_at:
assignee: task-runner
attempts: 0
artifacts: artifacts/TASK-0134/
priority: P1
risk: high
review_required: true
generated: { by: deepseek/v4.1-flash, at: 2026-11-14T23:31:45Z }
verified:
---

# Objetivo

Que el estado del motor represente la partida completa —party ordenada, jugador
activo, ronda y fase— de forma serializable, y que UI, `F1` y guardado lean esa
única fuente.

# Contexto

REQ-031
[T-001](../requirements/REQ-031-hotseat-local.md#requisitos-técnicos) exige
activo, ronda y configuración de party en el estado. TASK-0122 aporta la
configuración, TASK-0130 a TASK-0133 el botín, el cadáver y el fantasma. Esta
tarea fija el modelo; el `EndTurn`, la fase enemiga y el relevo son TASK-0146.

# Criterios de aceptación

- [ ] El estado guarda la party ordenada, el jugador activo, el índice de ronda y
      la fase con valores explícitos y estables.
- [ ] El activo se identifica por una referencia estable, no por una copia de la
      unidad; no hay listas paralelas de jugadores.
- [ ] El snapshot de debug y `F1` exponen activo, ronda, orden y fase desde el
      mismo estado que consume la UI.
- [ ] El estado completo es serializable y se reconstruye sin perder activo,
      ronda ni orden.
- [ ] La configuración de party se consume de TASK-0122; el hotseat no
      reconfigura la party ni crea una ruta paralela.
- [ ] Las transiciones de turno no se implementan aquí; solo el modelo y los
      helpers de lectura.
- [ ] Tests de snapshot, serialización y orden con 1, 2 y 6 jugadores;
      `pnpm run verify` pasa.

# Plan de test

- Unitario: `tests/unit/game/engine.test.ts`, `tests/unit/host/debug.test.ts`.
- Integración: construir con 2 y 6 jugadores y leer activo/ronda/orden desde
  `F1` y desde el snapshot.
- E2E / visual: no aplica.
- Manual: comparar `F1` con el estado visible.

# Evidencia esperada

- [ ] Informe en `artifacts/TASK-0134/attempt-1/report.md`
- [ ] Salida de `pnpm run verify`
- [ ] Commit SHA

# Comandos

| Comando | Timeout |
|---|---:|
| `pnpm exec vitest run tests/unit/game/engine.test.ts tests/unit/host/debug.test.ts` | 120 s |
| `pnpm run verify` | 240 s |

# Restricciones

- No implementar `EndTurn`, fase enemiga ni recursos por turno; eso es TASK-0146.
- No implementar cámara, HUD, pausa ni resultado.
- No duplicar el estado en el host ni en estructuras de presentación.
- Handoff: brief 1,5 KB, informe 2 KB; tope duro 4 KB.

# No objetivos

- Validar el activo o rechazar comandos de otras unidades.
- Guardado y carga completos.
- Relevo, avisos de ronda o «El master mueve».
- Cambiar el orden de la party.
