---
type: Task Brief
title: "TASK-0057: brief del intento 1"
description: "Núcleo determinista del feedback: configuración, cues, estado intermedio, beat e input."
task: TASK-0057
attempt: 1
status: stable
brief_bytes: 2544
read_detail: true
generated: { by: deepseek/v4.1-flash, at: 2026-11-10T03:00:00Z }
---

# Objetivo

Dejar el esqueleto determinista de REQ-017: `FEEDBACK_CONFIG` única, cues puros
con tipo/inicio/duración/ancla/datos sobre el reloj del movimiento, estado
visible retrasado hasta su cue y bloqueo/descarte de input durante el beat. Sin
efectos visuales finales.

# No objetivos

- Efectos de combate, muerte, inventario, percepción, banners y fundidos
  (TASK-0058/0059); atajo fuera de pantalla y reduced motion (TASK-0060); E2E/QA
  (TASK-0061).
- Tocar `src/game/`, `experiments/`, `index.html`, `public/`, dependencias,
  requisitos, ADR, `docs/harness/**` ni plantillas.

# Invariantes

- `src/game/` intacto; `dispatch().events`/`lastEvents` siguen siendo del motor;
  `MOTION_CONFIG` 125/70; timeline pura (sin DOM, Canvas ni reloj real).
- Una sola `FEEDBACK_CONFIG` para beats y duraciones de REQ-017; sin duraciones
  mágicas (deriva de ella `DAMAGE_FEEDBACK_MS`, `NOTICE_DURATION_MS`, flash).
- Input descartado durante el beat, no encolado; `F1`/`R` activos; `dispatch`
  completa la presentación; sin mutadores del estado vivo.
- No borres, saltes ni debilites tests; migra solo expectativas afectadas y
  explícalo.
- **Recogida y cambio de arma no emiten `GameEvent`** (`events: []`): no cambies
  el motor; crea eventos/cues de presentación del host desde comando y diff
  inicial/final. Detalle en `brief-detalle.md`.

# Criterios de aceptación

Viven en
`docs/tasks/TASK-0057-nucleo-feedback-timeline-estado.md#criterios-de-aceptación`;
enlazar, no copiar.

# Contexto mínimo

- `src/host/motion.ts` (`buildMotionTimeline`, `presentationState`,
  `advanceTimeline`), `main.ts` (rAF, `applyCommand`, `fireFeedbacks`), y
  `feedback.ts`, `notices.ts`, `debug.ts`, `input.ts`, `renderer.ts`.
- Tests: `tests/unit/host/{motion,debug,input,feedback}.test.ts`.
- [REQ-017](../../../docs/requirements/REQ-017-feedback-visual-eventos.md#cobertura-y-ritmo),
  [matriz](../../../docs/requirements/REQ-017-feedback-visual-eventos.md#matriz-evento--feedback),
  T-002/003/004/005/009/011, [ADR-017](../../../docs/decisions/ADR-017-feedback-visual-eventos.md)
  y `brief-detalle.md` (léelo).

# Artefactos

`artifacts/TASK-0057/attempt-1/`: `report.md`, `test-output.txt`,
`verify-output.txt`, `logs/`.
