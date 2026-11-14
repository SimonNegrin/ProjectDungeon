---
type: Task
id: TASK-0152
title: "Host: fase enemiga (El master mueve, actor/objetivo)"
description: "Presentar la fase enemiga con «El master mueve» solo si algún enemigo actúa, cámara y HUD del actor, ficha compacta del objetivo o «Sin objetivo»."
status: stable
task_status: backlog
task_type: feature
requirement: REQ-031
requirement_ids: [R-007, R-008, R-009, T-004, T-006]
depends_on: [TASK-0146, TASK-0150, TASK-0151]
unlocks: [TASK-0154, TASK-0155, TASK-0159]
created_at: 2026-11-14T23:31:45Z
completed_at:
assignee: task-runner
attempts: 0
artifacts: artifacts/TASK-0152/
priority: P1
risk: medium
review_required: true
generated: { by: deepseek/v4.1-flash, at: 2026-11-14T23:31:45Z }
verified:
---

# Objetivo

Que la fase enemiga se siga sin perderse: quién actúa, a quién apunta y cuándo
termina, sin presentar a los enemigos que solo esperan.

# Contexto

REQ-031
[R-007 a R-009](../requirements/REQ-031-hotseat-local.md#requisitos-creativos-decididos)
fijan «El master mueve», la cámara selectiva y el HUD contextual. TASK-0146
expone actor, objetivo y espera; TASK-0150 aporta la cámara y TASK-0151 el HUD
del activo. Las duraciones v1 son 800 ms para el aviso y 300 ms para el paneo.

# Criterios de aceptación

- [ ] Si al menos un enemigo va a moverse o atacar, al entrar en la fase enemiga
      aparece «El master mueve» durante ~800 ms, configurable, y desaparece antes
      de que actúen.
- [ ] Si ningún enemigo actúa, el aviso se omite.
- [ ] Solo los enemigos que mueven o atacan reciben cámara y HUD; los dormidos o
      en espera se resuelven sin presentación.
- [ ] El HUD derecho muestra al enemigo que actúa; el izquierdo, una ficha
      compacta del objetivo con miniatura, nombre, PV y stats, sin inventario ni
      equipo.
- [ ] Si no persigue a nadie, el HUD izquierdo muestra «Sin objetivo» y no
      inventa un personaje.
- [ ] Al terminar el último enemigo, la cámara vuelve al primer jugador y
      aparece «Ronda N» sin aviso de relevo.
- [ ] Tests de aviso con y sin acciones, salto de dormidos, actor/objetivo, «Sin
      objetivo» y duraciones; `pnpm run verify` pasa.

# Plan de test

- Unitario: `tests/unit/host/hud.test.ts` y `presentation.test.ts`.
- Integración: fase enemiga con un enemigo que espera y otro que ataca.
- E2E: captura de «El master mueve» y del HUD contextual; la suite completa va
  en TASK-0154.
- Manual: comprobar que el aviso no se repite por enemigo.

# Evidencia esperada

- [ ] Informe en `artifacts/TASK-0152/attempt-1/report.md`
- [ ] Salida de `pnpm run verify`
- [ ] Commit SHA

# Comandos

| Comando | Timeout |
|---|---:|
| `pnpm exec vitest run tests/unit/host/hud.test.ts tests/unit/host/presentation.test.ts` | 120 s |
| `pnpm run verify` | 240 s |

# Restricciones

- No cambiar la IA, el orden enemigo ni el motor.
- No implementar el resultado de partida.
- No presentar enemigos que solo esperan.
- No cambiar las duraciones sin decisión de producto.
- Handoff: brief 1,5 KB, informe 2 KB; tope duro 4 KB.

# No objetivos

- Reglas de percepción, alarma o huida.
- Información privada o pantallas por jugador.
- Temporizadores de fase enemiga.
- Nuevos avisos o sonidos.
