---
type: Task
id: TASK-0059
title: "Feedback de inventario, percepción y turno"
description: "Presentar recogida, cambio de arma, avistamiento, alarma, huida, regreso, espera, fases, fin de partida y rechazo con sus beats y anclas."
status: draft
task_status: done
task_type: feature
requirement: REQ-017
requirement_ids: [R-011, R-012, R-013, R-014, R-015, R-016, R-017, R-018, R-019, R-021, T-006, T-007, T-012]
depends_on: [TASK-0057]
unlocks: [TASK-0060, TASK-0061]
created_at: 2026-11-10T01:00:00Z
completed_at: 2026-11-10T19:30:00Z
assignee: task-runner
attempts: 1
artifacts: artifacts/TASK-0059/
priority: P1
risk: medium
review_required: true
generated: { by: deepseek/v4.1-flash, at: 2026-11-10T01:00:00Z }
verified:
  - by: task-lead
    at: 2026-11-10T19:30:00Z
    note: >-
      Intento 1 verificado en `task/TASK-0059` (código `75da2fe`). Recogida y
      cambio de arma aplicados al acabar su beat, `!` estable con entrada y
      retirada, alarma con onda/borde y aviso en su cue, marcas de huida y
      regreso, banners de fase, overlay tras 800 ms, reinicio con fundido de
      250 ms y rechazo sin beat con sacudida y aviso de 1600 ms. `pnpm run
      verify` OK 808/808, docs, build y bundle; `pnpm run test:e2e` OK 86/86.
      Sin cambios en `src/game/`, dependencias ni tests debilitados. El banner
      superior puede cubrir parte del muro superior; se revisa en TASK-0061.
---

# Objetivo

Que los eventos que no son combate también se lean: recogida y cambio de arma,
`!`, alarma, huida, regreso, espera, cambios de fase, fin de partida y rechazo.
Cada uno con su cue, su beat y su ancla, sobre la timeline de
[REQ-017](../requirements/REQ-017-feedback-visual-eventos.md).

# Contexto

- Reglas: REQ-017 «Inventario y percepción» y «Turno, fin y rechazo».
- Punto de partida: `src/host/notices.ts`, `spot-view.ts`, `hud.ts`, `main.ts` e
  `index.html`.
- Hoy la alarma se muestra en `applyCommand` al inicio de la acción; debe salir
  con la onda. El `!` se recrea en cada render y no tiene entrada.
- El arma recogida desaparece del suelo al inicio; el HUD cambia antes del cue.
- `TurnEnded` no debe mostrar banner si le sigue `EnemyPhaseStarted`.

# Criterios de aceptación

- [x] Recogida de 350 ms: el arma permanece en el suelo, parpadea, el slot pulsa
      y aparece `+ <Arma>`; el inventario cambia al final del beat.
- [x] Cambio de arma de 250 ms: slot pulsado, banner con el nombre y cambio de
      arma en mano al final.
- [x] Avistamiento de 200 ms: `!` con entrada de tres frames y parpadeo del
      enemigo; persiste mientras haya alerta y desaparece con muerte o huida.
- [x] Alarma de 500 ms: onda de dos tiles desde el emisor, destello de borde y
      banner `¡Alarma!` en el instante del evento, no al aplicar el comando.
- [x] Huida `!!` + dirección (300 ms), regreso `zzz` (250 ms) y espera `...`
      (200 ms) visibles cuando el enemigo está en pantalla.
- [x] `EnemyPhaseStarted` muestra `FASE ENEMIGA` (400 ms) y `PlayerTurnStarted`
      `TU TURNO` (350 ms) con cursor parpadeante; `TurnEnded` calla cuando le
      sigue la fase enemiga.
- [x] `GameEnded` espera 800 ms antes del overlay; `GameRestarted` hace un
      fundido de 250 ms y limpia cues pendientes.
- [x] El rechazo muestra aviso y sacudida de cursor de 120 ms sin beat
      bloqueante; el aviso dura 1600 ms.
- [x] Los efectos no tapan rejilla, cursor ni camino; `src/game/` no cambia;
      `pnpm run verify` pasa.

# Plan de test

- **Unitario:** cues y beats de cada evento; estado intermedio de inventario,
  arma equipada, avistamiento, alarma, fases y fin; `TurnEnded` silencioso.
- **Visual:** capturas del pico de recogida, `!`, alarma, huida, banner de fase y
  overlay; comprobar capas y legibilidad.
- **Regresión:** HUD, avisos, percepción, turnos y movimiento; `pnpm run verify`.
- **E2E:** las suites de feedback llegan en TASK-0061.

# Evidencia esperada

- [x] Informe en `artifacts/TASK-0059/attempt-1/report.md`.
- [x] Salidas de `verify` y tests nuevos.
- [x] Capturas en `attempt-1/screenshots/`.
- [x] Commit SHA en la rama `task/TASK-0059`.

# Comandos

| Comando | Timeout |
|---|---:|
| `pnpm exec vitest run tests/unit/host` | 180 s |
| `pnpm run verify` | 300 s |
| `git diff --stat` | 15 s |

# Restricciones

- No cambiar reglas de percepción, alarma, huida, turnos ni inventario.
- No añadir arte nuevo; usar sprites, decals y paleta existentes.
- No usar blur, degradados, partículas ni animaciones de sprite de varios frames.
- No tocar `src/game/`, `experiments/` ni dependencias.

# No objetivos

- Combate y muerte (TASK-0058).
- Atajo fuera de pantalla y `prefers-reduced-motion` (TASK-0060).
- E2E completo y QA visual de todas las familias (TASK-0061).
- Saqueo de cadáveres.
