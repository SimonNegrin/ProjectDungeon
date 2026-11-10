---
type: Task
id: TASK-0057
title: "Núcleo del feedback visual: configuración, timeline y estado intermedio"
description: "Añadir FEEDBACK_CONFIG, cues deterministas sobre la timeline de presentación y estado visible retrasado; un ataque sin movimiento ya tiene beat y bloquea input."
status: draft
task_status: done
task_type: feature
requirement: REQ-017
requirement_ids: [R-001, R-002, R-003, R-004, R-023, T-001, T-002, T-003, T-004, T-005, T-009, T-011]
depends_on: []
unlocks: [TASK-0058, TASK-0059, TASK-0060]
created_at: 2026-11-10T01:00:00Z
completed_at: 2026-11-10T18:10:00Z
assignee: task-runner
attempts: 3
artifacts: artifacts/TASK-0057/
priority: P1
risk: high
review_required: true
generated: { by: deepseek/v4.1-flash, at: 2026-11-10T01:00:00Z }
verified:
  - by: task-lead
    at: 2026-11-10T18:10:00Z
    note: >-
      Intentos 1-3 verificados en `task/TASK-0057` (código `8ed69ba`, cámara
      `4d67615`, configuración `d7139eb`). Diff revisado: `FEEDBACK_CONFIG`
      única con beats, efectos y persistencia de REQ-017; cues puros y
      secuenciados con `TurnEnded` silencioso; estado intermedio de muerte,
      recogida, cambio de arma, fase, turno, fin y alarma; eventos sintéticos
      de `PickUp`/`SelectWeapon` sin tocar el motor; `animation.cues` y
      `advance`; input descartado durante el beat; cámara estable sin
      movimiento. `pnpm run verify` OK (776/776, docs, build y bundle);
      `pnpm run test:e2e` OK 77/77 en pasadas limpias. Queda una flaqueza
      conocida de las aserciones de `attack-flash` (ventana real de 120 ms)
      bajo carga, diferida a TASK-0061. Sin cambios en `src/game/`,
      dependencias, `experiments/` ni `index.html`; sin tests borrados,
      saltados ni debilitados.
---

# Objetivo

Que exista el esqueleto determinista del feedback de
[REQ-017](../requirements/REQ-017-feedback-visual-eventos.md): una configuración
única de duraciones, cues construidos desde los eventos, estado visible
retrasado hasta su cue y bloqueo de input mientras hay beat. Sin efectos visuales
finales todavía.

# Contexto

- Reglas: REQ-017 «Cobertura y ritmo», «Matriz evento → feedback» y
  «Requisitos técnicos».
- Arquitectura: [ADR-017](../decisions/ADR-017-feedback-visual-eventos.md).
- Punto de partida: `src/host/motion.ts` ya construye la timeline de movimiento
  y `presentationState` revierte ataques, MP, fase y estado.
- `src/host/main.ts` dispara feedback con `setTimeout` y muestra la alarma al
  aplicar el comando; debe pasar al reloj de presentación.
- El motor no cambia: `src/game/` no se toca.

# Criterios de aceptación

- [x] Existe `FEEDBACK_CONFIG` con todos los beats y duraciones de REQ-017;
      `MOTION_CONFIG` conserva 125/70 y no hay duraciones de juego dispersas.
- [x] La timeline de presentación produce cues con tipo, inicio, duración, ancla
      y datos; es pura y no conoce DOM, Canvas ni reloj real.
- [x] Un evento sin desplazamiento (ataque, recogida, cambio de arma) genera un
      beat > 0 y bloquea el input; las intenciones se descartan, no se encolan.
- [x] El estado visible retrasa muerte, recogida, cambio de arma, fase, fin de
      partida y avisos hasta su cue; antes del cue se ve el estado anterior.
- [x] `window.__game.animation` expone los cues activos y `advance(ms)` avanza el
      reloj; no hay mutadores del estado vivo.
- [x] Los tests unitarios cubren configuración, timeline, estado intermedio,
      beat e input; `pnpm run verify` pasa sin debilitar tests.
- [x] `src/game/` sigue intacto y no hay dependencias nuevas.

# Plan de test

- **Unitario:** construcción de cues para cada `GameEvent`; duración y orden;
  estado intermedio antes/después de `UnitDied`, `PickUp`, `SelectWeapon`,
  `EnemyPhaseStarted`, `GameEnded` y `AlarmRaised`; pureza de la timeline.
- **Integración:** input durante un beat de ataque sin movimiento; `F1`/`R`;
  `dispatch` completa la presentación pendiente.
- **Regresión:** los 758 tests actuales; `pnpm run verify`.
- **E2E / visual:** llega en TASK-0061; aquí solo el debug hook.

# Evidencia esperada

- [x] Informes en `artifacts/TASK-0057/attempt-{1,2,3}/report.md`.
- [x] Salidas de `verify`, tests nuevos y E2E en los mismos directorios.
- [x] Diff revisable del host y de los tests; sin cambios en `src/game/`.
- [x] Commit SHA en la rama `task/TASK-0057` (`8ed69ba`, `4d67615`, `d7139eb`).

# Comandos

| Comando | Timeout |
|---|---:|
| `pnpm exec vitest run tests/unit/host` | 180 s |
| `pnpm run verify` | 300 s |
| `git diff --stat` | 15 s |

# Restricciones

- No implementar aún los efectos visuales de combate, inventario o percepción;
  esta tarea deja el motor de presentación y el estado intermedio.
- No cambiar reglas, combate, IA, pathfinding ni generación.
- No tocar `src/game/`, `experiments/`, `index.html`, `public/` ni dependencias.
- Los criterios de REQ-017 viven en la hoja; no se copian aquí.

# No objetivos

- Embestidas, destellos, textos de daño, cadáver, `!`, onda de alarma y banners
  (TASK-0058 y TASK-0059).
- Atajo de enemigos fuera de pantalla y `prefers-reduced-motion` (TASK-0060).
- E2E y QA visual (TASK-0061).
