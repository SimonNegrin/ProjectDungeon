---
type: Task
id: TASK-0061
title: "E2E y QA visual del feedback"
description: "Cubrir con Playwright determinista los cues de combate, muerte, inventario, percepción, turnos y modo reducido; capturas en el pico y docs al día."
status: draft
task_status: done
task_type: qa
requirement: REQ-017
requirement_ids: [R-001, R-002, R-021, R-022, R-023, R-024, R-025, T-011, T-012, T-013]
depends_on: [TASK-0058, TASK-0059, TASK-0060]
unlocks: []
created_at: 2026-11-10T01:00:00Z
completed_at: 2026-11-10T22:25:00Z
assignee: task-runner
attempts: 1
artifacts: artifacts/TASK-0061/
priority: P2
risk: medium
review_required: true
generated: { by: deepseek/v4.1-flash, at: 2026-11-10T01:00:00Z }
verified:
  - by: task-lead
    at: 2026-11-10T22:25:00Z
    note: >-
      Intento 1 verificado en `task/TASK-0061` (código `1117596`). Suite E2E
      completa 98/98 y `verify` 818/818, docs, build y bundle; repetición
      `--repeat-each=3` de alarma, huida y muerte 33/33. Nuevas specs cubren
      regreso (`zzz`), espera (`...`), `TU TURNO`, reducido con texto/banner/
      marca estáticos, mismo orden y estado final, y persistencia determinista
      de `advance(ms)` sin animación. 26 capturas 1280×720 con picos, grises de
      impacto/fallo y rejilla/cursor/camino visibles. Sin cambios en
      `src/game/`, dependencias ni tests borrados, saltados o debilitados.
---

# Objetivo

Que el feedback de [REQ-017](../requirements/REQ-017-feedback-visual-eventos.md)
tenga evidencia E2E y visual reproducible: cada familia de cues se observa en su
pico, el modo reducido conserva la información y no hay regresiones en las
suites existentes.

# Contexto

- Arquitectura y contrato de test:
  [ADR-017](../decisions/ADR-017-feedback-visual-eventos.md).
- `window.__game.animation` expone los cues y `advance(ms)` avanza el reloj;
  `?test=1` permite montar escenarios.
- Suites existentes: `tests/e2e/game-input-hud.spec.ts`,
  `frame-qa.spec.ts`, `combat-equipment-qa.spec.ts`, `perception-host-qa.spec.ts`,
  `perception-alarm-qa.spec.ts`, `flee-behavior-qa.spec.ts` y `support.ts`.
- La evidencia visual se guarda en `artifacts/TASK-0061/attempt-1/screenshots/`
  con `E2E_ARTIFACTS_DIR`.
- Riesgo heredado de TASK-0057: las aserciones `toHaveClass(/is-active/)` de
  `attack-flash` dependen de la ventana real de 120 ms y pueden fallar bajo
  carga. Esta tarea debe muestrear el cue con `advance(ms)` o congelar el reloj,
  no alargar la duración del efecto.

# Criterios de aceptación

- [x] Hay E2E deterministas para impacto, fallo, muerte y cadáver, recogida,
      cambio de arma, `!`, alarma, huida, regreso, espera, fases, fin de partida,
      reinicio y rechazo.
- [x] Las pruebas muestrean el pico con `advance(ms)` y no dependen de esperas de
      reloj real; `--repeat-each=3` en las suites de alarma, huida y muerte.
- [x] El atajo de 150 ms de un enemigo fuera de pantalla y su cruce de borde
      tienen prueba observable; la cámara del jugador no salta.
- [x] El modo reducido no muestra tween, sacudida ni parpadeo, pero conserva
      texto, banner y marca estática; el orden de eventos es el mismo.
- [x] Capturas 1280×720 del pico de cada familia; impacto y fallo se distinguen
      en escala de grises; la rejilla, el cursor y el camino siguen visibles.
- [x] `pnpm run test:e2e` y `pnpm run verify` pasan; no se borran, saltan ni
      debilitan tests existentes.
- [x] Arquitectura, economía de turno y glosario reflejan la implementación
      final; `pnpm run docs:check` pasa.
- [x] Notas de playtest para el usuario en `attempt-1/playtest.md`.

# Plan de test

- **E2E:** una spec nueva o ampliación de las existentes por familia; fixtures con
  semilla y `?test=1`; aserciones sobre cues y estado final.
- **Visual:** capturas en el pico de impacto, fallo, muerte, recogida, `!`,
  alarma y banner de fase; comprobar capas y grises.
- **Accesibilidad:** spec con `prefers-reduced-motion: reduce`.
- **Regresión:** suites actuales y `pnpm run verify`; comparar con el estado
  previo del milestone.

# Evidencia esperada

- [x] Informe en `artifacts/TASK-0061/attempt-1/report.md`.
- [x] Salidas de `test:e2e` y `verify`.
- [x] Capturas en `attempt-1/screenshots/`.
- [x] `playtest.md` con notas para el usuario.
- [x] Commit SHA en la rama `task/TASK-0061`.

# Comandos

| Comando | Timeout |
|---|---:|
| `pnpm run test:e2e` | 300 s |
| `pnpm exec playwright test tests/e2e/<spec>.spec.ts --repeat-each=3` | 180 s |
| `pnpm run verify` | 300 s |
| `git diff --stat` | 15 s |

# Restricciones

- No cambiar reglas, efectos ni datos para que los tests pasen; si un criterio
  falla, se corrige la implementación.
- No debilitar tests existentes; las expectativas stale se migran, no se borran.
- No añadir dependencias ni tocar `experiments/`.
- Las capturas son evidencia, no la única prueba.

# No objetivos

- Implementar los efectos (TASK-0058, TASK-0059 y TASK-0060).
- Playtest de sensación: lo realiza el usuario después de la tarea.
- Audio, arte nuevo o saqueo de cadáveres.
