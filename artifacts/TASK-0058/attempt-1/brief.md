---
type: Task Brief
title: "TASK-0058: brief del intento 1"
description: "Feedback visual de impacto, fallo y muerte con cadáver persistente de presentación."
task: TASK-0058
attempt: 1
status: stable
brief_bytes: 3138
read_detail: false
generated: { by: deepseek/v4.1-flash, at: 2026-11-10T19:00:00Z }
---

# Objetivo

Completar sobre la timeline de TASK-0057 el feedback de impacto, fallo, muerte
de 900 ms y cadáver persistente de presentación de REQ-017. Sin tocar reglas ni
`src/game/`.

# No objetivos

- Recogida, arma, `!`, alarma, fases y fin (TASK-0059); atajo y reduced motion
  (TASK-0060); E2E/QA completa (TASK-0061).
- Saqueo, cadáver de motor, arte nuevo o dependencias.

# Invariantes

- `src/game/`, `experiments/` y dependencias intactos; sin PNG nuevos.
- `FEEDBACK_CONFIG` única; `MOTION_CONFIG` 125/70. Timeline pura.
- Reloj de presentación único; `advance(ms)` determinista, sin `setTimeout` de
  feedback. El texto puede persistir más allá del beat sin bloquear input.
- Daño, PV y HUD no cambian antes del cue de impacto; beats e input iguales.
- Sin blur, degradados, partículas, inversión total ni multi-frame.
- No borrar, saltar ni debilitar tests.

# Criterios de aceptación

`docs/tasks/TASK-0058-feedback-combate-muerte.md#criterios-de-aceptación`.

# Contexto mínimo

- `src/host/{feedback-config,feedback,motion,presentation,renderer,main}.ts`,
  `index.html`, `floor.ts`, `assets.ts`.
- Tests: `tests/unit/host/{feedback,presentation-feedback,renderer,floor}.test.ts`;
  `tests/e2e/combat-equipment-qa.spec.ts`.
- REQ-017
  [Combate y muerte](../../../docs/requirements/REQ-017-feedback-visual-eventos.md#combate-y-muerte)
  y [Legibilidad](../../../docs/requirements/REQ-017-feedback-visual-eventos.md#lenguaje-visual-y-legibilidad).
- ADR-017
  [Capas](../../../docs/decisions/ADR-017-feedback-visual-eventos.md#capas-y-dibujo),
  [Cadáver](../../../docs/decisions/ADR-017-feedback-visual-eventos.md#cadáver-persistente)
  y [Debug](../../../docs/decisions/ADR-017-feedback-visual-eventos.md#debug-y-tests).

# Artefactos

`artifacts/TASK-0058/attempt-1/`: `report.md`, `test-output.txt`,
`verify-output.txt`, `e2e-output.txt`, `screenshots/` (impacto, fallo, muerte,
cadáver) y commit SHA en `task/TASK-0058`.

# Riesgos y decisiones abiertas

- `attack-flash` es un div CSS con aserción real de 120 ms. Si pasa a Canvas,
  migra esas aserciones a `advance(ms)` o al cue/estado observable; conserva
  impacto-con-destello / fallo-sin-destello y no alargues el efecto para el test.
- Texto de daño anclado a cámara hasta 1000 ms aunque acabe el beat: sin
  `setTimeout` y sin bloquear input.
- En la muerte la unidad se dibuja hasta `UnitDied` y durante su cue; el cadáver
  aparece al final desde la unidad muerta que conserva el motor. Sin estado
  nuevo ni escritura en la rejilla.
- `corpse-22a/b` sale de la decoración ambiental (lista de 31) pero conserva sus
  recortes para la muerte; huesos, sangre y manchas siguen.
- Capas: cadáver sobre decals y bajo unidades; efectos en Canvas; texto/banners
  en DOM sobre unidades y bajo HUD; rejilla, cursor y camino visibles.
