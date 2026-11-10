---
type: Task Brief
title: "TASK-0059: brief del intento 1"
description: Presentar inventario, percepción y turno en su cue sobre la timeline existente.
task: TASK-0059
attempt: 1
status: stable
brief_bytes: 2820
read_detail: false
generated: { by: deepseek/v4.1-flash, at: 2026-11-10T19:08:06Z }
---

# Objetivo

Cerrar los consumidores visuales de los cues de inventario, percepción y turno:
recogida y cambio de arma en su beat, `!` estable con entrada, onda de alarma con
borde y banner en su cue, marcas de huida/regreso/espera, banners de fase, fin y
reinicio, y rechazo con sacudida no bloqueante. La timeline y el estado
intermedio ya existen; aquí se presentan.

# No objetivos

- Los de la ficha: combate/muerte, atajo fuera de pantalla y
  `prefers-reduced-motion` (TASK-0060), E2E global y playtest (TASK-0061).

# Invariantes

- `src/game/`, `experiments/` y las dependencias no cambian.
- No reimplementes `buildMotionTimeline`, `presentationState` ni
  `FEEDBACK_CONFIG`: úsalos. Sin `setTimeout` para duraciones de juego.
- DOM para texto/banners; Canvas para efectos de mundo. Nada tapa rejilla,
  cursor ni camino.
- No borres, saltes ni debilites tests. Adapta una aserción obsoleta solo si el
  criterio la supera, dejando evidencia.

# Criterios de aceptación

Viven en [TASK-0059](../../../docs/tasks/TASK-0059-feedback-inventario-percepcion-turno.md#criterios-de-aceptación).
Enlazar; no copiar.

# Contexto mínimo

- `src/host/main.ts`: `fireFeedbacks` ya dispara el aviso de alarma en su cue;
  no lo muevas a `applyCommand`. `finishAnimation`, reinicio y overlays.
- `src/host/spot-view.ts`: hoy recrea el `!` en cada render; necesita nodo
  estable y entrada al empezar el cue.
- `src/host/hud.ts`, `src/host/notices.ts` e `index.html`: banners, pulso de
  slot, sacudida de cursor y aviso de 1600 ms.
- `src/host/world-effects.ts` y `src/host/renderer.ts`: onda de dos tiles y
  destello de borde si se dibujan en Canvas.
- Reglas: REQ-017 «Inventario y percepción» y «Turno, fin y rechazo»;
  ADR-017. Tests: `presentation-feedback.test.ts`, `feedback.test.ts`,
  `world-effects.test.ts`, `hud.test.ts`, `notices.test.ts` y
  `tests/e2e/perception-alarm-qa.spec.ts`.

# Artefactos

`artifacts/TASK-0059/attempt-1/{report.md,test-output.txt,verify-output.txt,e2e-output.txt,screenshots/,logs/}`.

# Riesgos y decisiones abiertas

- La alarma ya nace en su cue; añadir la onda sin adelantar el banner.
- La recogida y el cambio de arma ya revierten estado en `presentationState`;
  falta el pulso, el banner y el parpadeo del arma del suelo.
- `GameRestarted` hoy renderiza sin fundido; debe limpiar cues y fundir 250 ms.
- El rechazo no debe crear beat bloqueante: aviso 1600 ms y sacudida 120 ms.
- Capturas del pico de recogida, `!`, alarma, huida, banner de fase y overlay.
