---
type: Task Report
title: "TASK-0154: informe de ejecución"
description: "QA/E2E del hotseat: 2 y 6 jugadores, fases, fantasma, pausa, resultado y carga."
task: TASK-0154
attempt: 1
report_status: success
generated: { by: deepseek/v4.1-flash, at: 2026-11-16T10:06:53Z }
artifacts: artifacts/TASK-0154/attempt-1/
verified:
---

# Estado

`success`. Flujo hotseat medido con seis E2E nuevos y la suite completa; sin
defectos de producto detectados. La comprobación manual de mesa queda pendiente
del usuario.

# Cambios

- `tests/e2e/hotseat-flow-qa.spec.ts`: 2 y 6 jugadores, `N`, relevo, ronda,
  recursos, fase enemiga, fantasma, guardado, resultado y carga.
- Evidencia en `artifacts/TASK-0154/attempt-1/`.
- Commit SHA: `f3226af`.

# Tests

| Comando | Resultado | Evidencia |
|---|---|---|
| `pnpm run test:e2e` (240 s) | 282/282; 1,7 min | `e2e-full.txt` |
| `pnpm run test:e2e hotseat-flow-qa` (240 s) | 6/6 | `e2e-hotseat-flow-qa.txt` |
| `pnpm run verify` (300 s) | 1796/1796; build y bundle OK | `verify-output.txt` |

Cobertura: 2/6, `N`, relevo, ronda y N/M en el spec y en
`host-relevo-camera-qa`/`host-hud-hotseat-qa`; una fase enemiga, aviso,
actor/objetivo y «Sin objetivo» en los tests 1/3 y `host-enemy-phase-qa`;
recursos, muerte, wipe, resurrección y fantasma en
`tests/unit/game/{turn,ghost,engine}.test.ts` y test 4; guardar, cargar y
resultado en tests 5/6 y `pause-save-load-qa`/`host-result-qa`; `E`/`R` y pausa
en test 5 y `keymap.test.ts`.

# Evidencia visual

- `e2e/hotseat-flow-qa/screenshots/`: relevo, ronda, fase enemiga, fantasma,
  seis jugadores, guardado desactivado, pausa, resultado y carga.
- Revisar el relevo sin Enter, «Ronda 2» con HUD 1/2, el aviso y HUD enemigo, y
  la carga en «Jugador 2 de 2».
- `relevo-paneo` se captura a 150 ms; la aserción de paneo es de estado.

# Desviaciones

- Solo tests y artefactos: sin cambios de reglas, UI ni tests existentes.
- Sala controlada de 20×20 y enemigos fijos; el guardado de carga usa un estado
  real con mapa.

# Problemas conocidos y preguntas abiertas

- La validación manual de mesa no se ejecuta en este intento; queda para
  usuario/playtest.
- Sin defectos de producto detectados.

# Fricción reutilizable

| Síntoma | Evidencia | Workaround | Por qué es reutilizable | Cambio propuesto | Coste/riesgo | Disposición |
|---|---|---|---|---|---|---|
| `E2E_ARTIFACTS_DIR` con la suite completa escribe capturas de todos los specs | 48 MB y 603 archivos; se podó a `hotseat-flow-qa` | Podar y relanzar el spec | Toda QA que pida suite completa más capturas propias repite el ciclo | Flag para limitar artefactos a un spec | Bajo; tests | `pending` |

# Métricas de handoff

| Métrica | Valor |
|---|---|
| `brief_bytes` | 0 |
| `report_bytes` | 2821 |
| `overflow` | `none` |
| `criteria_failed` | 0 |
