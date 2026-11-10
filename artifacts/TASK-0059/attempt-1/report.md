---
type: Task Report
title: "TASK-0059: informe de ejecución del intento 1"
description: "Conecta inventario, percepción, alarma, fase, fin y rechazo a la timeline y sus vistas."
task: TASK-0059
attempt: 1
report_status: success
generated: { by: deepseek/v4.1-flash, at: 2026-11-10T19:30:00Z }
artifacts: artifacts/TASK-0059/attempt-1/
verified:
---

# Estado

`success`.

# Cambios

- `feedback-events.ts` y `feedback-overlay-view.ts` (nuevos): banners, marcas,
  pulso de slot, efectos de marco, nodos estables y fundido de reinicio sin
  `setTimeout`.
- `spot-view.ts`/`spot.ts`: `!` estable, entrada de tres frames y retirada en
  muerte, huida o regreso. `world-effects.ts`/`renderer.ts`: parpadeos, onda de
  dos tiles y destellos de borde.
- `main.ts`, `hud.ts`, `cursor-view.ts`, `motion.ts`, `index.html`: banners en
  su cue, pulso, parpadeo de cursor, sacudida de rechazo, overlay tras 800 ms,
  fundido de reinicio e inventario aplicado al final del beat.
- Tests: `feedback-events.test.ts` nuevo; ampliados `presentation-feedback`,
  `world-effects`, `renderer`, `spot`; E2E
  `feedback-inventory-perception-qa.spec.ts`.
- Commit SHA: `75da2fe8682c053d214331dc36131f0f200c21cc`.

# Tests

| Comando | Resultado | Evidencia |
|---|---|---|
| `pnpm exec vitest run tests/unit/host` | 22 archivos, 329 tests OK | `test-output.txt` |
| `pnpm run verify` | docs/config, 808 tests, build, bundle OK | `verify-output.txt` |
| `pnpm run test:e2e` | 86 tests OK (45,9 s) | `e2e-output.txt` |

# Evidencia visual

- `screenshots/{recogida,avistamiento,alarma,huida,fase-enemiga,overlay}.png`.
- Revisar `alarma.png` (onda y borde), `recogida.png` (banner con HUD aún en
  Espada), `huida.png` (`!!←`), `fase-enemiga.png` y `overlay.png`.

# Desviaciones

- Recogida y cambio de arma se aplican al acabar el cue, no al empezar
  (R-011/R-012). Actualicé dos aserciones unitarias obsoletas; no se debilitó
  ninguna.
- `victory/defeat` pasa al acabar el beat de 800 ms para retrasar el overlay
  (R-018).
- El aviso de alarma existente se reutiliza como banner; no se duplica.
- El brief traía un enlace `../../docs` roto; lo corregí a `../../../docs` y
  actualicé `brief_bytes`. No cambia criterios.
- La ficha ya estaba modificada (`task_status`) antes del intento; no entra en
  mis commits.

# Problemas conocidos y preguntas abiertas

- La onda es un anillo cuadrado plano; validar grosor y fundido en playtest.
- El banner ocupa una franja superior del marco; no tapa cursor ni camino, pero
  conviene revisarlo en TASK-0061.
- El primer `verify` falló por timeout interno de 5 s en el barrido de EXP-004;
  la repetición pasó.

# Fricción reutilizable

| Síntoma | Evidencia | Workaround | Por qué es reutilizable | Cambio propuesto | Coste/riesgo | Disposición |
|---|---|---|---|---|---|---|
| Enlace `../../docs` desde `attempt-N` rompe `docs:check` | `verify-output.txt` del primer intento | Corregir a tres `../` | Cualquier brief que enlace la ficha | Documentar la profundidad | Bajo | `pending` |
| El barrido de EXP-004 supera a veces su timeout de 5 s bajo carga | `verify-output.txt` del primer intento | Reintentar `verify` | Afecta a la suite completa en paralelo | Subir timeout | Bajo | `pending` |

# Métricas de handoff

| Métrica | Valor |
|---|---|
| `brief_bytes` | 2820 |
| `report_bytes` | 3398 |
| `overflow` | `none` |
| `criteria_failed` | 0 |
