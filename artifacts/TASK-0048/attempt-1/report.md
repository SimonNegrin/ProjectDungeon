---
type: Task Report
title: "TASK-0048: informe de ejecución"
description: Render growth, puertas, salida, spawn y capa F1; BSP inyectado en E2E.
task: TASK-0048
attempt: 1
report_status: success
generated: { by: deepseek/v4.1-flash, at: 2026-11-09T17:40:00Z }
artifacts: artifacts/TASK-0048/attempt-1/
verified:
---

# Estado

`success`. Implementación y tests verdes; quedan 37 fallos E2E de fixtures BSP
obsoletas, documentados y asignados a TASK-0049. Baseline: 50 fallos / 20 pasan.

# Cambios

- `src/game/map.ts`, `chambers/variants/growth.ts`: campos opcionales
  `openMouths`, `hotspots` y `cavernRoomId`, poblados por `growth`; BSP intacto.
- `src/host/renderer.ts`: puertas por estilo, bocas sin puerta, salida
  `door`/escaleras con recorte local, y capa F1 (máscaras, límites, spawn de 6,
  entrada/salida, pasillos, caverna, puntos calientes y enemigos).
- `src/host/{debug,hud,main,session}.ts`: snapshot serializable ampliado, líneas
  F1, `setup(state, generator?)` solo con `?test=1`, y `Restart` conserva el
  generador inyectado sin meter BSP en el bundle.
- `tests/unit/*`: cobertura de campos growth, render, snapshot y sesión.
- `tests/e2e/*`: helper `openBspState` (import dinámico de BSP solo en test) y
  nuevo spec `host-growth-render-qa.spec.ts` con capturas.
- Commits: `b662e81` (implementación), `bcc4c1d` (tests).

# Tests

| Comando | Resultado | Evidencia |
|---|---|---|
| `pnpm run verify` | OK | `verify-output.txt` |
| `pnpm run test` | 55 archivos, 732 tests | `test-output.txt` |
| `pnpm exec playwright test host-growth-render-qa` | 4/4 | `e2e-output.txt` |
| `pnpm run test:e2e` completo | 37 pasan / 37 fallan | `e2e-output.txt`, `e2e-baseline.txt` |

# Evidencia visual

- `screenshots/growth-normal.png`, `growth-debug-on.png`, `growth-debug-off.png`
- `growth-cavern-debug.png`, `growth-wide-corridor-debug.png`,
  `growth-spawn-debug.png`, `growth-exit-stairs-debug.png`,
  `growth-exit-door-debug.png`, `growth-13x13.png`
- Revisar: puertas con estilo, bocas sin puerta, spawn J+2..6, entrada/salida,
  máscara de caverna y capa F1 oculta en juego normal.

# Desviaciones

- No se pudo restaurar el BSP histórico solo inyectando el generador: su spawn
  cambió en TASK-0045 (`6,8`→`9,27`), así que 37 specs conservan coordenadas
  antiguas. No se relajó ninguna aserción.
- Las capturas se escriben directamente en `screenshots/` desde el spec nuevo;
  el helper `artifactPath` añade subcarpeta por spec.

# Problemas conocidos y preguntas abiertas

- 37 fallos E2E restantes por fixtures BSP con coordenadas/cámara antiguas
  (combate, cursor, frame, motion, perception, floor-ambient, generated-map).
  Evidencia en `e2e-output.txt` y desglose en `report-detalle.md`; asignados a
  TASK-0049. El recuento mejora el baseline (37 vs 50 fallos) y ninguna prueba
  se borró ni debilitó.
- La suite completa de vitest incluyó una vez timeouts de 5 s en tests de
  `experiments/` bajo carga; repetida, pasó limpia.

# Fricción reutilizable

| Síntoma | Evidencia | Workaround | Por qué es reutilizable | Cambio propuesto | Coste/riesgo | Disposición |
|---|---|---|---|---|---|---|
| `E2E_ARTIFACTS_DIR` siempre añade `<spec>/screenshots`, pero el brief pide capturas en `attempt-N/screenshots` | `tests/e2e/artifacts.ts:39-45`; capturas movidas a mano | Ruta propia en el spec nuevo | Afecta a cualquier tarea que pida capturas en la raíz del intento | Permitir `artifactPath` sin segmento de spec o documentar la subcarpeta | Bajo | `pending` |

# Métricas de handoff

| Métrica | Valor |
|---|---|
| `brief_bytes` | 2552 |
| `report_bytes` | 3720 |
| `overflow` | `none` |
| `criteria_failed` | 0 en unit/verify; 37 E2E stale → TASK-0049 |
