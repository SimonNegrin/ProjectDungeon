---
type: Task Verification
title: "TASK-0152: verificación independiente"
description: Reejecución de verify y E2E, revisión del diff y comprobación de la fase enemiga con aviso, cámara y HUD de actor/objetivo.
task: TASK-0152
attempt: 1
status: stable
generated: { by: deepseek/v4.1-flash, at: 2026-11-15T23:02:00Z }
---

# Resultado

Aprobada. El intento 1 (código `0c4a321`, `75a5061`, `19d0382`; evidencia
`b95f776`, `670616f`, `25107e8`) cumple los siete criterios. La tarea se cierra
como `done`.

# Alcance revisado

- `src/host/session.ts`: `StepResult` y `GameSession.dispatch` reenvían
  `enemyPhase` sin mutar el estado ni el motor.
- `src/host/presentation.ts`: `enemyPhaseHasActions` y `enemyActorContextAt`
  deciden aviso y actor/objetivo desde la traza; los `wait` no abren ventana.
- `src/host/motion.ts`: sin acciones no hay cue de fase ni pre-beat; con acciones
  el pre-beat usa `enemyPhaseBannerMs` (800 ms) y los atacantes inmóviles reciben
  `focusAnchors` de cámara.
- `src/host/main.ts`: pasa `enemyPhase` a la timeline y a la animación; el HUD y
  `F1` reciben el contexto solo en fase enemiga.
- `src/host/hud.ts`/`hud-detail.ts`: ficha compacta del objetivo y detalle del
  actor; sin arma, traits ni inventario; «Sin objetivo» sin personaje inventado.
- `src/host/debug.ts`: `enemyActorId`/`enemyTargetId` en snapshot y `F1`.
- `src/host/feedback-events.ts`: «El master mueve» sustituye `FASE ENEMIGA`.
- Tests: nueva `presentation.test.ts`, ampliación de `hud.test.ts` y
  `debug.test.ts`, nueva E2E `host-enemy-phase-qa.spec.ts`, actualizaciones de
  copy/espera en specs existentes. Sin borrados ni aserciones debilitadas.
- Sin cambios en `src/game/**`, `index.html`, requisitos, diseño, glosario,
  arnés, plantillas, dependencias ni `.opencode/**`.

# Verificación reejecutada

| Comando | Resultado |
|---|---|
| `pnpm run verify` (240 s) | docs 726, config, 108 archivos/1728 tests, tsc, build y bundle OK |
| `pnpm exec vitest run tests/unit/host/hud.test.ts tests/unit/host/presentation.test.ts` (120 s) | 55/55 |
| `pnpm run test:e2e tests/e2e/host-enemy-phase-qa.spec.ts` (180 s) | 1/1 |
| `pnpm run test:e2e tests/e2e/enemy-phase-offscreen-qa.spec.ts` (180 s) | 3/3 |
| `pnpm run test:e2e tests/e2e/feedback-inventory-perception-qa.spec.ts` (180 s) | 6/6 |
| `pnpm run test:e2e tests/e2e/motion-qa.spec.ts` (180 s) | 8/8 |
| `pnpm run test:e2e tests/e2e/feedback-turns-marks-qa.spec.ts` (180 s) | 4/4 |
| `pnpm run test:e2e tests/e2e/host-hud-hotseat-qa.spec.ts tests/e2e/host-relevo-camera-qa.spec.ts` (180 s) | 9/9 |

Total E2E: 31/31 en 7 specs, cada ejecución en un proceso separado con 180 s.
La suite completa no se ejecutó: excede el timeout heredado. Un primer intento
de `motion-qa` en paralelo con otra spec chocó en el puerto fijo 4173; al
repetirlo solo pasó 8/8. Salidas en `lead-verify/`.

# Criterios

1. Aviso con acciones: unitario de cue de 800 ms, texto «El master mueve» y
   primer paso ≥800 ms; E2E con banner visible en `enemy-phase` y oculto en
   `attack`. OK.
2. Aviso sin acciones omitido: unitario sin cue `enemy-phase` conservando
   `waited`; E2E de fase sin acciones sin banner ni cue. OK.
3. Solo actores reciben cámara y HUD: `enemyActorContextAt` y `focusAnchors`
   filtran `action: 'act'`; unitario con un `wait` y un `act`. El `wait` conserva
   su marca `...` de REQ-017, que no es cámara ni HUD. OK.
4. HUD derecho con el actor e izquierdo con ficha compacta: E2E y unitario;
   miniatura, nombre, PV y tres stats; arma/traits/inventario fuera. OK.
5. «Sin objetivo» sin inventar personaje: unitario con `targetId: null`; nombre,
   retrato, PV y stats vacíos; anuncio «no persigue a nadie». OK.
6. Vuelta al primer jugador y «Ronda N»: E2E con fase/ ronda/activo finales,
   cámara centrada en el jugador y banner `Ronda 2`; sin `TU TURNO`. OK.
7. Tests y `pnpm run verify`: aviso con/sin acciones, salto de dormidos,
   actor/objetivo, «Sin objetivo», duraciones; verify reejecutado. OK.

# Evidencia visual revisada

- `tests/e2e/host-enemy-phase-qa/screenshots/master-mueve.png`: aviso y ficha
  del activo antes de actuar.
- `hud-actor-objetivo.png`: derecha «ENEMIGO Gobardo»; izquierda ficha compacta
  del objetivo, sin zona de arma.
- `vuelta-ronda-2.png`: cámara y ficha del jugador con «Ronda 2».

# Observaciones

- El pre-beat efectivo de la fase con acciones es 800 ms, tomado de
  `FEEDBACK_CONFIG.texts.enemyPhaseBannerMs`; `beats.enemyPhase` sigue en 400
  para las pruebas puras de la timeline. Coherente con R-007, pero conviene
  unificar la configuración si se toca el ritmo en una tarea posterior.
- El foco de un atacante inmóvil se aplica como corte al empezar su ataque, no
  como paneo de 300 ms; los movimientos sí se siguen. El criterio solo exige
  cámara y el E2E/unitario lo comprueban. Si el usuario quiere paneo también
  para el atacante inmóvil, es un ajuste posterior.
- La suite E2E completa sigue pendiente para TASK-0154.
