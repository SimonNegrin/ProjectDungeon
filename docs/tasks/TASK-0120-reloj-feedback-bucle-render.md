---
type: Task
id: TASK-0120
title: "Bug: el reloj de feedback no caduca y el host repinta a 60 fps"
description: "Tras cualquier feedback transitorio, el host repinta cada frame y los banners y textos no desaparecen; restaurar el consumo del reloj de presentación de REQ-017."
status: draft
task_status: backlog
task_type: feature
requirement: REQ-017
requirement_ids: [R-011, R-016, T-005]
depends_on: []
unlocks: []
created_at: 2026-11-14T20:06:00Z
completed_at:
assignee: task-runner
attempts: 0
artifacts: artifacts/TASK-0120/
priority: P1
risk: medium
review_required: true
generated: { by: deepseek/v4.1-flash, at: 2026-11-14T20:06:00Z }
verified:
---

# Objetivo

Que el feedback transitorio se consuma con el reloj de presentación y que el host
deje de repintar cuando no hay animación ni feedback pendiente. Un banner de
recogida o un texto de daño deben desaparecer al agotar su duración real, sin
bucle continuo de `requestAnimationFrame`.

# Contexto

Detectado al verificar [TASK-0119](TASK-0119-reapertura-submenu-teclado.md) y
fuera de su alcance. Reproducción en tiempo real:

1. Cargar la partida y recoger un arma desde el panel (o recibir un golpe).
2. Esperar 2 s: el banner `+ <Arma>` sigue visible.
3. Instrumentar `requestAnimationFrame` y las mutaciones del panel: hay un render
   por frame de forma indefinida.
4. `advance(ms)` o `settle()` consumen el feedback, pero el juego normal no.

En `src/host/main.ts`, `scheduleTextFrame` reinicia `textLastFrameTime` en cada
reenganche; `textTick` calcula siempre `raw = 0`, `advanceTransientFeedback(0)`
sale sin descontar y `hasTransientFeedback()` sigue en `true`. Consecuencias:
banners y textos de [REQ-017](../requirements/REQ-017-feedback-visual-eventos.md)
no caducan, el HUD y el panel se actualizan a ~60 fps y el estado de
presentación se refresca solo.

Evidencia: `artifacts/TASK-0119/lead-repro/confirm-loop.txt`,
`diagnose-loop.txt` y `diagnose-stacks.txt`; informe de TASK-0119.

# Criterios de aceptación

- [ ] Tras un banner de 800 ms (recoger o cambiar de arma), desaparece al agotar
      su duración real y no queda visible indefinidamente.
- [ ] Los textos de daño (`-N`, `Fallo`, 1000 ms) desaparecen al agotarse, con un
      máximo de tres y sin reiniciar su animación en frames sucesivos.
- [ ] En reposo, con el feedback agotado, no queda un bucle de render: durante
      1 s no se repite por frame la actualización de HUD/panel; el conteo de
      renders vuelve a cero (instrumentado en el test).
- [ ] `advance(ms)` sigue siendo determinista y equivalente al reloj real, sin
      `setTimeout` para el feedback (REQ-017 T-005).
- [ ] `EnemyPhaseStarted`, `PlayerTurnStarted`, `AlarmRaised` y los beats
      conservan duración, orden y aspecto (R-014/R-016); no se toca el motor.
- [ ] `pnpm run verify` y `pnpm run test:e2e` pasan sin debilitar tests.
- [ ] Reproducción guardada antes del arreglo (banner vivo a los 2 s y renders
      continuos) y después.

# Plan de test

- Unitario: reloj de feedback con delta monotónico entre reenganches; cubrir
  arranque, reenganche y fin del feedback.
- Integración: `pnpm run verify`.
- E2E: recoger con tiempo real y comprobar que el banner desaparece; contar
  renders en reposo durante 1 s; repetir con un texto de daño; confirmar que el
  panel/submenú no dependen de renders espurios.
- Manual: tras un ataque y una recogida, esperar 2 s sin banners ni textos
  residuales ni CPU alta.

# Evidencia esperada

- [ ] Informe en `artifacts/TASK-0120/attempt-1/report.md`
- [ ] Salida del E2E fallando antes y pasando después
- [ ] Salida de `pnpm run verify` y del E2E completo
- [ ] Commit SHA

# Restricciones

- Solo el consumo del reloj y el bucle de feedback; no cambiar duraciones,
  beats, orden ni aspecto.
- Sin `setTimeout` para feedback (REQ-017 T-005).
- Sin cambios en `src/game/**`; no debilitar tests existentes.

# No objetivos

- TASK-0119 y el submenú (ya cerrada).
- Otros hallazgos del playtest sin confirmar.
- Optimización general del render o del canvas.
