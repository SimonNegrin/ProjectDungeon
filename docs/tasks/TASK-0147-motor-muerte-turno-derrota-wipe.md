---
type: Task
id: TASK-0147
title: "Motor: muerte en turno y derrota por wipe"
description: "Resolver la muerte del jugador activo durante su turno, cerrar el turno y emitir derrota cuando no queda ningún vivo, aunque queden fantasmas."
status: stable
task_status: backlog
task_type: feature
requirement: REQ-031
requirement_ids: [R-015]
depends_on: [TASK-0131, TASK-0146]
unlocks: [TASK-0153, TASK-0154, TASK-0155, TASK-0159]
created_at: 2026-11-14T23:31:45Z
completed_at:
assignee: task-runner
attempts: 0
artifacts: artifacts/TASK-0147/
priority: P1
risk: medium
review_required: true
generated: { by: deepseek/v4.1-flash, at: 2026-11-14T23:31:45Z }
verified:
---

# Objetivo

Que morir en el propio turno no deje un turno muerto: la acción en curso se
resuelve, el turno pasa al siguiente y, si era el último vivo, la partida termina
en derrota.

# Contexto

REQ-031
[R-015](../requirements/REQ-031-hotseat-local.md#requisitos-creativos-decididos)
fija la muerte en turno; TASK-0131 crea el cadáver y TASK-0146 el turno por
jugador. REQ-021 R-011 y T-008 definen el wipe. La pantalla de resultado es
TASK-0153.

# Criterios de aceptación

- [ ] Si el activo muere durante su turno, la acción que causó la muerte se
      resuelve por completo y después se cierra el turno.
- [ ] No queda un turno muerto ni se aceptan comandos de la unidad muerta; el
      control pasa al siguiente jugador o a la fase enemiga.
- [ ] Si no queda ningún jugador vivo, se emite el fin de partida en derrota;
      los fantasmas y los objetos de resurrección no la evitan.
- [ ] Con al menos un vivo, la partida continúa aunque haya fantasmas.
- [ ] El resultado del motor expone Victoria o Derrota y la ronda alcanzada sin
      decidir la presentación.
- [ ] Tests de muerte por enemigo, muerte por efecto propio, último vivo, vivo
      con fantasmas y acción resuelta; `pnpm run verify` pasa.

# Plan de test

- Unitario: `tests/unit/game/engine.test.ts` y `turn.test.ts`.
- Integración: muerte del activo con dos jugadores y con un solo jugador.
- E2E / visual: no aplica; la pantalla es TASK-0153.
- Manual: `F1` tras el wipe.

# Evidencia esperada

- [ ] Informe en `artifacts/TASK-0147/attempt-1/report.md`
- [ ] Salida de `pnpm run verify`
- [ ] Commit SHA

# Comandos

| Comando | Timeout |
|---|---:|
| `pnpm exec vitest run tests/unit/game/engine.test.ts tests/unit/game/turn.test.ts` | 120 s |
| `pnpm run verify` | 240 s |

# Restricciones

- No implementar la pantalla de resultado ni sus botones.
- No cambiar la resurrección ni la regla de fantasmas.
- No tocar la presentación de muerte.
- Handoff: brief 1,5 KB, informe 2 KB; tope duro 4 KB.

# No objetivos

- Victoria, empate o condiciones alternativas.
- Cámara, HUD o avisos de derrota.
- Reinicio rápido.
- Guardado tras el resultado.
