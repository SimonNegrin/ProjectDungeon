---
type: Task Report
title: "TASK-0120: informe de ejecución"
description: El feedback transitorio vuelve a consumirse con el reloj real y el host no repinta en reposo.
task: TASK-0120
attempt: 1
report_status: success
generated: { by: deepseek/v4.1-flash, at: 2026-11-14T20:20:00Z }
artifacts: artifacts/TASK-0120/attempt-1/
verified:
---

# Estado

`success`.

# Cambios

- `src/host/main.ts`: `scheduleTextFrame(resetClock)` conserva
  `textLastFrameTime` en los reenganches de `textTick`; solo lo reinicia al
  abrir una tanda (`finishAnimation`). El delta pasa de `0` constante a
  monotónico con el reloj de presentación.
- `tests/e2e/feedback-clock-loop-qa.spec.ts`: E2E en tiempo real con
  instrumentación de `requestAnimationFrame` y de las mutaciones de
  `debug-content` (una por `render()`); sin `settle()`.
- Sin cambios en `src/game/**`, duraciones, beats, orden ni aspecto.
- Commit SHA: `bd56ad0`.

# Tests

| Comando | Resultado | Evidencia |
|---|---|---|
| E2E nuevo sobre código previo | 3 failed: banner vivo y 60–61 renders/s | `before/e2e-before.txt` |
| E2E nuevo con arreglo | 3 passed | `after/e2e-after.txt` |
| `pnpm run verify` | OK: 94 archivos, 1332 tests; build y bundle OK | `verify-output.txt` |
| `pnpm run test:e2e` | 214 passed (211 previos + 3 nuevos) | `e2e-output.txt` |

No se añadió unitario: no se extrajo un reloj ni un predicado puro. El arreglo
es el consumo del timestamp de `requestAnimationFrame` y el E2E lo mide en
tiempo real; los unitarios de `feedback` y `presentation-feedback` siguen
cubriendo el modelo.

# Criterios

- **Banner 800 ms**: antes, a los 2 s seguía visible (JSON `before/pickup`:
  `hidden: false`, `+ Hacha`); después, oculto (`after/pickup`: `hidden: true`).
- **Daño 1000 ms, sin reinicio**: impacto y fallo siguen avanzando
  (`transform` cambia entre muestras) y terminan ocultos; antes quedaban
  congelados en `opacity 0.818` y el mismo `transform`. El máximo de tres lo
  fija `FEEDBACK_CONFIG` y lo cubre `tests/unit/host/feedback.test.ts`.
- **Sin bucle en reposo**: contadores a cero durante 1 s (`raf: 0`,
  `mutations: 0`); antes `raf: 61`, `mutations: 61` en el mismo tramo.
- **Reloj determinista**: `advanceTransientFeedback` y `advance(ms)` no cambian;
  TASK-0061 y el resto de unitarios pasan. Sin `setTimeout` en producción; el
  único `setTimeout` es la espera del propio test.
- **Fases, alarma, daño y recogida**: `src/game/**` intacto; pasan
  `feedback-turns-marks-qa`, `perception-alarm-qa`, `feedback-combat-qa` y
  `feedback-inventory-perception-qa` en la suite completa.
- **Reproducción antes/después**: `before/` y `after/` con salida, capturas y
  JSON de medidas.

# Evidencia visual

- `before/feedback-clock-loop-qa/screenshots/pickup-banner-reposo.png`: banner
  vivo a los 2 s.
- `after/feedback-clock-loop-qa/screenshots/pickup-banner-reposo.png`: mismo
  instante sin banner.
- `after/.../damage-impacto-reposo.png` y `damage-fallo-reposo.png`: sin texto
  residual.

# Desviaciones

- Ninguna.

# Problemas conocidos y preguntas abiertas

- Ninguno.

# Fricción reutilizable

Sin entradas: no hubo comportamiento no documentado ni workaround repetido.

# Métricas de handoff

| Métrica | Valor |
|---|---|
| `brief_bytes` | 2555 |
| `report_bytes` | 3341 |
| `overflow` | `none` |
| `criteria_failed` | 0 |
