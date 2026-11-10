---
type: Task Verification
title: "TASK-0061: verificación independiente del lead"
description: "Re-ejecución de verify, E2E completo y repeticiones; revisión de diff y capturas."
task: TASK-0061
attempt: 1
status: stable
generated: { by: deepseek/v4.1-flash, at: 2026-11-10T22:25:00Z }
---

# Resultado

Verificado. El intento 1 cierra TASK-0061 sin regresiones ni tests debilitados.

# Comandos re-ejecutados

| Comando | Resultado | Evidencia |
|---|---|---|
| `pnpm run verify` | 818/818, docs, config, build y bundle OK | `verify-lead.txt` |
| `pnpm run test:e2e` | 98/98 (47,3 s) | `e2e-lead.txt` |
| `playwright test` alarma + huida + combate `--repeat-each=3` | 33/33 (20,4 s) | `e2e-repeat-lead.txt` |

# Revisión del diff

- Solo `src/host/main.ts` de producción: `advanceForTest` sin animación consume
  textos, banners y marcas con el reloj manual; `advance(0)` no consume. No toca
  reglas, render ni configuración.
- Dos specs existentes migran `waitForTimeout` a `dispatchFrozen` +
  `advanceToCue`/`advance`, conservando las mismas aserciones de cue, caja,
  daño y HUD. No se borraron expectativas.
- Specs nuevas: `feedback-turns-marks-qa` y `feedback-reduced-motion-qa`.
  Ampliaciones de combate e inventario para persistencia, grises y capturas.
- Sin `src/game/`, `experiments/` ni dependencias. Sin `waitForTimeout` en
  `tests/e2e/`.

# Criterios

- [x] Familias E2E completas, incluidas regreso, espera y turno del jugador.
- [x] Picos con `advance(ms)`; sin esperas reales; repetición 3× en alarma,
      huida y muerte.
- [x] Atajo y cruce de borde con cámara estable.
- [x] Reducido sin tween/sacudida/parpadeo, con texto, banner y marca; mismo
      orden de eventos y estado final.
- [x] 26 capturas 1280×720; grises de impacto/fallo; rejilla, cursor y camino
      visibles en `impacto-persistente.png`.
- [x] `test:e2e` y `verify` verdes; sin tests borrados, saltados o debilitados.
- [x] Arquitectura, economía de turno y glosario coherentes; `docs:check` pasa.

# Triaje de fricción

| Propuesta | Clasificación | Disposición | Dueño |
|---|---|---|---|
| `--repeat-each=3` no crea `repeat-N` porque `testInfo.project.repeatEach` no refleja el flag | Arnés (helper de artefactos) | `deferred` | requirements-writer |

Ninguna propuesta bloquea la tarea.
