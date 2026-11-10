---
type: Task Brief
title: "TASK-0060: brief del intento 1"
description: Atajo fuera de pantalla, política de foco de cámara y modo reducido sin animación.
task: TASK-0060
attempt: 1
status: stable
brief_bytes: 3677
read_detail: false
generated: { by: deepseek/v4.1-flash, at: 2026-11-10T20:10:00Z }
---

# Objetivo

Cerrar los dos huecos de REQ-017: (1) fase enemiga con beat de 150 ms, sin
tween ni cámara, cuando el recorrido empieza y termina fuera del viewport;
recorrido completo al cruzar el borde y cámara del jugador estable; (2)
`prefers-reduced-motion: reduce` colapsa beats a 0 y conserva texto, banner y
marca estática sin tween, sacudida ni parpadeo.

# No objetivos

- E2E global y QA de todas las familias (TASK-0061).
- Combate, muerte, inventario o percepción ya cerrados.
- Audio, partículas, arte nuevo o cambios de reglas.

# Invariantes

- `src/game/`, `experiments/` y dependencias no cambian. Sin `setTimeout` de
  juego ni relojes paralelos.
- Timeline pura; visibilidad y foco se deciden en el host con cámara y
  viewport. `motion.ts` recibe la política, no la deduce.
- Orden de eventos intacto; movimiento 125/70 sin cambios.
- No borres, saltes ni debilites tests. Adapta una aserción obsoleta solo si el
  criterio la supera, con evidencia.
- Normal: input bloqueado y descartado durante el beat, con `F1`/`R` activos.
  Reducido: no bloquea.

# Criterios de aceptación

Viven en [TASK-0060](../../../docs/tasks/TASK-0060-fase-enemiga-fuera-pantalla-reduced-motion.md#criterios-de-aceptación).
Enlazar; no copiar.

# Contexto mínimo

- `src/host/motion.ts`: `buildMotionTimeline`, `cameraAt`, `visualPositions`,
  `focusUnitId`. Hoy todo `UnitMoved` recibe tween 125/70 y foco de cámara.
- `src/host/main.ts`: `applyCommand` construye la timeline; `startAnimation` ya
  salta al final con reducido; `finishAnimation` recentra al jugador.
  `cursorView.shake()`, `pulseAppear()` y `screenFadeView.play()` son
  animaciones CSS que reducido debe omitir.
- `src/host/feedback-config.ts`: `beats.enemyOffscreen = 150` ya existe.
- `index.html`: keyframes de sacudida, retorno, `spot-enter`, pulso y fundido;
  reducido necesita estado estático.
- Reglas: REQ-017 «Input y fase enemiga» y «Lenguaje visual y legibilidad»;
  ADR-017 «Fase enemiga y fuera de pantalla» y «Movimiento reducido».
- Tests: `tests/unit/host/{motion,presentation-feedback,input}.test.ts`;
  `tests/e2e/{motion-qa,frame-qa}.spec.ts`.

# Decisión técnica del lead

- Agrupa `UnitMoved` contiguos por unidad y evalúa extremos:
  - ambos fuera → un beat de 150 ms, sin pasos ni fases (sin tween ni foco),
    posición final visible al inicio; conserva orden y eventos.
  - cruza el borde → recorrido completo 125/70, sin foco de cámara si la unidad
    no es el jugador.
  - dentro → recorrido completo; un enemigo visible puede seguirse.
  - sin política (tests existentes) → comportamiento actual.
- Separa «unidades animadas» de «enfocadas por cámara» para ver el tween de un
  cruce aunque la cámara no se mueva. `finishAnimation` recentra al jugador.
- Reducido: opción del builder que pone beats, pasos y pausas a 0 sin reordenar;
  el host omite sacudida, retorno y fundido; una media query deja estados
  finales estáticos.

# Artefactos

`artifacts/TASK-0060/attempt-1/{report.md,test-output.txt,verify-output.txt,screenshots/,logs/}`.

# Riesgos y decisiones abiertas

- La cámara que sigue a un enemigo visible debe volver al jugador al cerrar.
- El fundido de reinicio usa `animationend`: en reducido hay que cerrarlo sin
  esperar la animación.
- Capturas de enemigo fuera de pantalla y de cruce de borde con `advance`.
