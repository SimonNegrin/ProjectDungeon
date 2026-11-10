---
type: Lead Verification
title: "TASK-0058: verificación del lead"
description: Revisión independiente del feedback de combate y muerte, con los tres intentos y la evidencia visual.
task: TASK-0058
attempts: [1, 2, 3]
status: stable
generated: { by: deepseek/v4.1-flash, at: 2026-11-10T19:10:00Z }
---

# Alcance revisado

Diff completo de `main...task/TASK-0058`: `src/host/{feedback-config,feedback,
motion,world-effects,renderer,main,floor,assets,debug}.ts`, `index.html`, tests
unitarios y E2E de regresión y de feedback. Sin cambios en `src/game/`,
`experiments/`, dependencias ni requisitos.

# Criterios

| Criterio | Resultado | Evidencia |
|---|---|---|
| Impacto: embestida 2-4 px, destello 80-120 ms, retroceso 2 px, `-N`, tick de PV y sacudida 1 px; daño/PV no antes del cue | OK | `world-effects.test.ts`, `presentation-feedback.test.ts`, `feedback-combat-qa` |
| Fallo: embestida, gesto de defensa y `Fallo` gris; sin destello; legible en grises | OK | `world-effects.test.ts`, test de render del gesto, captura `fallo.png` |
| Muerte: destello, tres parpadeos, disolución 300 ms y sacudida; cadáver al final | OK | `world-effects.test.ts`, `feedback-combat-qa` |
| Cadáver bajo unidades y sobre decals; no bloquea ni escribe en la rejilla | OK | `renderer.test.ts`, E2E de rejilla, captura `cadaver.png` |
| `corpse-22a/b` fuera de la decoración ambiental; lista de 31 | OK | `floor.test.ts`, `floor-qa*.spec.ts` |
| Texto anclado a cámara, hasta 3 simultáneos sin pisarse, sin `setTimeout` | OK | `feedback.test.ts`, `main.ts`, E2E de feedback |
| Canvas para mundo, DOM para texto, capas de ADR-017; rejilla/cursor/camino visibles | OK | `renderer.ts`, `index.html`, capturas |
| `src/game/` intacto; `verify` pasa; tests no debilitados | OK | `git diff --stat`, verify 790/790 |

# Verificación ejecutada por el lead

| Comando | Resultado | Evidencia |
|---|---|---|
| `pnpm run verify` (intento 1) | OK 784/784, docs, config, build y bundle | `attempt-1/lead-verify-output.txt` |
| `pnpm run test:e2e` (intento 1) | OK 80/80 | `attempt-1/lead-e2e-output.txt` |
| `pnpm run verify` (intento 2, primera pasada) | 789/790: timeout aislado de `EXP-004` | `attempt-2/lead-verify-output.txt` |
| `pnpm run verify` (intento 2, repetición) | OK 790/790 | `attempt-2/lead-verify-output-2.txt` |
| `pnpm run test:e2e` (intento 2) | 79/80: carrera real en el E2E de fallo | `attempt-2/lead-e2e-output.txt` |
| `pnpm run verify` (intento 3) | OK 790/790 | `attempt-3/lead-verify-output.txt` |
| `pnpm run test:e2e` (intento 3) | OK 80/80 | `attempt-3/lead-e2e-output.txt` |
| `pnpm exec playwright test tests/e2e/feedback-combat-qa.spec.ts --repeat-each=3` | OK 9/9 | `attempt-3/lead-e2e-repeat-output.txt` |

# Revisión de regresiones

- Intento 1: el signo de `awayFromAttacker` movía al defensor hacia el atacante;
  corregido en el intento 2 con aserciones de signo en horizontal, vertical y
  diagonal. El gesto de defensa se dibujaba fuera del tile y podía quedar
  oculto; ahora se dibuja dentro del tile y en una pasada posterior a las
  unidades.
- Intento 2: el E2E nuevo muestreaba después de que el rAF real pudiera avanzar
  el beat; corregido en el intento 3 con `dispatchFrozen` y `advance(0)` dentro
  del mismo `page.evaluate`. La suite nueva pasó 3 repeticiones.
- No se borraron, saltaron ni debilitaron tests: las aserciones de
  `attack-flash` se migraron a cue/estado y a muestreo con `advance`, y se añadió
  la suite `feedback-combat-qa` con capturas de impacto, fallo, muerte y
  cadáver.
- `src/game/`, `experiments/`, `package.json` y `pnpm-lock.yaml` no cambian.

# Evidencia visual

- `attempt-1/screenshots/`, `attempt-2/screenshots/` y
  `attempt-3/screenshots/` con impacto, fallo, muerte y cadáver.
- `attempt-2/screenshots/fallo-detalle.png` amplía el gesto de defensa.
- Las capturas finales del intento 3 muestrean a 70 ms exactos desde el inicio
  del cue.

# Fricción y disposición

| Propuesta | Evidencia | Disposición | Dueño |
|---|---|---|---|
| `advance(ms)` sin animación no consume la persistencia de textos ya creados | `attempt-1/report.md`, `src/host/main.ts` | `deferred` | TASK-0061 |
| Timeout aislado del barrido de `EXP-004` bajo carga | `attempt-2/lead-verify-output.txt` | `rejected` (no reproducible; no relacionado con el diff) | — |
| Carrera entre `dispatch` y el muestreo de cues E2E | `attempt-2/lead-e2e-output.txt` | `accepted` (resuelto con `dispatchFrozen` y `advance(0)`) | TASK-0058 |

No hay propuestas abiertas sin dueño. Ninguna propuesta cambia criterios,
desbloquea la tarea ni relaja tests.
