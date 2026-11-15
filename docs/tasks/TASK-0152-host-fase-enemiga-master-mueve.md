---
type: Task
id: TASK-0152
title: "Host: fase enemiga (El master mueve, actor/objetivo)"
description: "Presentar la fase enemiga con «El master mueve» solo si algún enemigo actúa, cámara y HUD del actor, ficha compacta del objetivo o «Sin objetivo»."
status: stable
task_status: done
task_type: feature
requirement: REQ-031
requirement_ids: [R-007, R-008, R-009, T-004, T-006]
depends_on: [TASK-0146, TASK-0150, TASK-0151]
unlocks: [TASK-0154, TASK-0155, TASK-0159]
created_at: 2026-11-14T23:31:45Z
completed_at: 2026-11-15T23:02:00Z
assignee: task-runner
attempts: 1
artifacts: artifacts/TASK-0152/
priority: P1
risk: medium
review_required: true
generated: { by: deepseek/v4.1-flash, at: 2026-11-14T23:31:45Z }
verified:
  - by: task-lead
    at: 2026-11-15T23:02:00Z
    note: >-
      Intento 1 verificado (código `0c4a321`/`75a5061`/`19d0382`, evidencia
      `b95f776`/`670616f`/`25107e8`). Diff limitado a `src/host/**`, tests y
      artefactos; sin motor, requisitos, diseño, glosario, arnés, dependencias
      ni `.opencode/**`. `pnpm run verify` reejecutado: docs 726, 108
      archivos/1728 tests, tsc, build y bundle OK. E2E por specs separadas:
      31/31 en 7 specs (enemy-phase, offscreen, feedback, motion, marks,
      hotseat, relevo). Criterios 1-7 cumplidos. Evidencia en
      `attempt-1/lead-verify/verification.md`.
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

- [x] Si al menos un enemigo va a moverse o atacar, al entrar en la fase enemiga
      aparece «El master mueve» durante ~800 ms, configurable, y desaparece antes
      de que actúen.
- [x] Si ningún enemigo actúa, el aviso se omite.
- [x] Solo los enemigos que mueven o atacan reciben cámara y HUD; los dormidos o
      en espera se resuelven sin presentación.
- [x] El HUD derecho muestra al enemigo que actúa; el izquierdo, una ficha
      compacta del objetivo con miniatura, nombre, PV y stats, sin inventario ni
      equipo.
- [x] Si no persigue a nadie, el HUD izquierdo muestra «Sin objetivo» y no
      inventa un personaje.
- [x] Al terminar el último enemigo, la cámara vuelve al primer jugador y
      aparece «Ronda N» sin aviso de relevo.
- [x] Tests de aviso con y sin acciones, salto de dormidos, actor/objetivo, «Sin
      objetivo» y duraciones; `pnpm run verify` pasa.

# Plan de test

- Unitario: `tests/unit/host/hud.test.ts` y `presentation.test.ts`.
- Integración: fase enemiga con un enemigo que espera y otro que ataca.
- E2E: captura de «El master mueve» y del HUD contextual; la suite completa va
  en TASK-0154.
- Manual: comprobar que el aviso no se repite por enemigo.

# Evidencia esperada

- [x] Informe en `artifacts/TASK-0152/attempt-1/report.md`
- [x] Salida de `pnpm run verify`
- [x] Commit SHA

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

# Notas de verificación

- `GameSession.dispatch` ya propaga `enemyPhase`; el host decide aviso, cámara y
  HUD sin leer estado interno.
- El pre-beat efectivo de la fase con acciones es 800 ms, tomado de
  `FEEDBACK_CONFIG.texts.enemyPhaseBannerMs`; `beats.enemyPhase` sigue en 400
  para las pruebas puras de la timeline.
- El foco de un atacante inmóvil se aplica al empezar su ataque; los
  movimientos enemigos se siguen con el foco existente. Un paneo de 300 ms para
  el atacante inmóvil queda como ajuste posterior si el usuario lo pide.
- E2E ejecutadas por separado (31/31): `host-enemy-phase-qa` 1,
  `enemy-phase-offscreen-qa` 3, `feedback-inventory-perception-qa` 6,
  `motion-qa` 8, `feedback-turns-marks-qa` 4, `host-hud-hotseat-qa` 5 y
  `host-relevo-camera-qa` 4. La suite completa va en TASK-0154.
