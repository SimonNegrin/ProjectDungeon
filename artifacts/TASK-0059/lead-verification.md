---
type: Lead Verification
title: "TASK-0059: verificación del lead"
description: Revisión independiente del feedback de inventario, percepción y turno sobre la timeline.
task: TASK-0059
attempts: [1]
status: stable
generated: { by: deepseek/v4.1-flash, at: 2026-11-10T19:30:00Z }
---

# Alcance revisado

Diff completo de `main...task/TASK-0059`: `src/host/{feedback-config,feedback-events,feedback-overlay-view,motion,world-effects,renderer,spot,spot-view,hud,cursor-view,main}.ts`, `index.html`, tests unitarios y el E2E nuevo. Sin cambios en `src/game/`, `experiments/`, `package.json` ni `pnpm-lock.yaml`.

# Criterios

| Criterio | Resultado | Evidencia |
|---|---|---|
| Recogida 350 ms: arma en el suelo, parpadeo, pulso de slot, banner y cambio al final | OK | `world-effects.test.ts`, `feedback-events.test.ts`, `renderer.test.ts`, `presentation-feedback.test.ts`, E2E `recogida` |
| Cambio de arma 250 ms: pulso, banner con nombre y cambio al final | OK | `feedback-events.test.ts`, E2E `cambio de arma` |
| Avistamiento 200 ms: `!` estable con entrada, parpadeo del enemigo y retirada con muerte/huida | OK | `spot-view.ts`, `world-effects.test.ts`, `spot.test.ts`, E2E `avistamiento` |
| Alarma 500 ms: onda de 2 tiles, borde y aviso en el instante del evento | OK | `world-effects.test.ts`, `feedback-events.test.ts`, `renderer.test.ts`, E2E `alarma` y `perception-alarm-qa` |
| Huida `!!` + dirección, regreso `zzz` y espera `...` visibles | OK | `feedback-events.test.ts`, E2E `huida` |
| Fases 400/350 ms con cursor parpadeante; `TurnEnded` silencioso | OK | `feedback-events.test.ts`, `presentation-feedback.test.ts`, E2E `fase enemiga` |
| `GameEnded` espera 800 ms; `GameRestarted` funde 250 ms y limpia cues | OK | `presentation-feedback.test.ts`, E2E `overlay` y `reinicio` |
| Rechazo: aviso 1600 ms y sacudida 120 ms sin beat | OK | `notices.test.ts`, `cursor-view.ts`, E2E `rechazo` |
| Efectos sin tapar rejilla/cursor/camino; `src/game/` intacto; verify | OK | Capturas, `git diff`, verify 808/808 |

# Verificación ejecutada por el lead

| Comando | Resultado | Evidencia |
|---|---|---|
| `pnpm run verify` | OK: docs, config, 808/808 tests, build y bundle | `attempt-1/lead-verify-output.txt` |
| `pnpm run test:e2e` | OK: 86/86 (52,2 s) | `attempt-1/lead-e2e-output.txt` |

# Revisión de regresiones

- No se borraron, saltaron ni debilitaron tests: las dos aserciones de
  recogida/cambio se ampliaron con el estado intermedio y el estado final al
  acabar el beat; el resto de tests existentes pasan sin cambios.
- El aviso de alarma ya nacía en su cue desde TASK-0057; TASK-0059 añade onda y
  borde sin adelantarlo a `applyCommand`.
- `GameEnded` retrasa el overlay con el estado de presentación, no con un
  temporizador; `GameRestarted` limpia banners, marcas, textos y `!`.
- `src/game/`, `experiments/`, dependencias y `MOTION_CONFIG` no cambian.

# Evidencia visual

- `attempt-1/screenshots/{recogida,avistamiento,alarma,huida,fase-enemiga,overlay}.png`.
- La onda y el borde se ven en `alarma.png`; el `!` en `avistamiento.png`; la
  marca `!!←` en `huida.png`; el banner de fase y el overlay al final.
- Observación para playtest/TASK-0061: el banner ocupa una franja superior del
  marco y puede cubrir parte del muro superior; no tapa cursor ni camino.

# Fricción y disposición

| Propuesta | Evidencia | Disposición | Dueño |
|---|---|---|---|
| Enlace `../../docs` desde `attempt-N` rompe `docs:check` | `attempt-1/verify-output.txt` | `accepted`: corregido en el brief del intento | — |
| Barrido de EXP-004 supera a veces su timeout de 5 s bajo carga | `attempt-1/report.md` | `rejected`: pasa al repetir y no depende del diff | — |

No quedan propuestas abiertas sin dueño. Ninguna cambia criterios, desbloquea la
tarea ni relaja tests.
