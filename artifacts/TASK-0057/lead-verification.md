---
type: Lead Verification
title: "TASK-0057: verificación del lead"
description: Revisión independiente del diff, criterios, tests y fricción del núcleo de feedback.
task: TASK-0057
attempts: [1, 2, 3]
status: stable
generated: { by: deepseek/v4.1-flash, at: 2026-11-10T18:10:00Z }
---

# Alcance revisado

Diff completo de `main...task/TASK-0057`: `src/host/{feedback-config,motion,
presentation,main,debug,notices,renderer}.ts`, tests unitarios y migraciones E2E
de regresión. Sin cambios en `src/game/`, `experiments/`, `index.html`,
dependencias ni requisitos.

# Criterios

| Criterio | Resultado | Evidencia |
|---|---|---|
| `FEEDBACK_CONFIG` única con beats/duraciones de REQ-017; `MOTION_CONFIG` 125/70 | OK | `feedback-config.ts`, `presentation-feedback.test.ts` |
| Cues puros con tipo/inicio/duración/ancla/datos | OK | `buildMotionTimeline`, tests de pureza/orden |
| Beat > 0 sin desplazamiento y input descartado | OK | `presentation-feedback.test.ts`, `translateKey` |
| Estado visible retrasado (muerte, recogida, arma, fase, fin, avisos) | OK | `presentationState`, `dyingUnitIds`, tests |
| `animation.cues` y `advance(ms)` sin mutadores | OK | `debug.ts`, `main.ts`, E2E `advanceToCue` |
| Tests unitarios y `verify` sin debilitar | OK | 776/776 |
| `src/game/` intacto y sin dependencias | OK | `git diff --stat` vacío |

# Verificación ejecutada por el lead

| Comando | Resultado | Evidencia |
|---|---|---|
| `pnpm exec vitest run tests/unit/host` | OK 296/296 (intento 2); 297/297 (intento 3) | `attempt-2/lead-test-output.txt` |
| `pnpm run verify` | OK 776/776, docs, config, build y bundle | `attempt-3/lead-verify-output-2.txt` |
| `pnpm run test:e2e` | OK 77/77 en pasadas limpias; 1 fallo intermitente por `attack-flash` | `attempt-2/lead-e2e-output.txt`, `attempt-3/lead-e2e-output.txt` |

La primera pasada de `verify` del lead falló por un timeout aislado de
`experiments/EXP-004` bajo carga; la repetición inmediata pasó 776/776 y no tiene
relación con el diff.

# Revisión de regresiones

- Los 8 fallos E2E del intento 1 se corrigieron: bug real de cámara/feedback sin
  movimiento y expectativas stale por el beat, el aviso de alarma en su cue y el
  pre-beat de fase.
- No se borraron, saltaron ni debilitaron tests: se añadieron aserciones de
  configuración, cámara, estado intermedio, cues e input; las migraciones E2E
  conservan sus aserciones semánticas.
- `attack-flash` (120 ms) sigue siendo una ventana real frágil bajo carga en
  `combat-equipment-qa`. No se alargó el efecto para el test; se difiere a
  TASK-0061, que ya exige muestreo determinista con `advance(ms)`.

# Fricción

| Síntoma | Evidencia | Disposición | Dueño |
|---|---|---|---|
| `toHaveClass(/is-active/)` de `attack-flash` falla intermitentemente con 120 ms | `attempt-3/e2e-output-failed-1/2/3.txt` | `deferred` | TASK-0061 |
| Timeout aislado de `EXP-004` bajo carga | `attempt-3/lead-verify-output.txt` | `rejected` (no reproducible; pasada limpia) | — |

No hay propuestas abiertas sin dueño. Ninguna propuesta cambia criterios ni
desbloquea la tarea.
