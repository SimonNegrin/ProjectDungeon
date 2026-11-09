---
type: Task Report
title: "TASK-0048: informe del intento 2"
description: Corrige la regresión de reduced motion sin ampliar alcance.
task: TASK-0048
attempt: 2
report_status: success
generated: { by: deepseek/v4.1-flash, at: 2026-11-09T17:46:00Z }
artifacts: artifacts/TASK-0048/attempt-2/
verified:
---

# Estado

`success`. Se corrige la única regresión por título del intento 1; no hay
regresiones nuevas y el total E2E baja a 36 fallos stale de BSP (dueño
TASK-0049). Cero cambios de producción.

# Cambios

- `tests/e2e/motion-qa.spec.ts`: «reduced motion» deriva el destino del cursor
  del jugador y del viewport actuales (`player + 1` en X) en vez de fijar `(8,8)`.
  Ambas ejecuciones comprueban que el destino derivado coincide. No se relaja
  ninguna aserción ni se toca el test de determinismo.
- Commit: `7507f97` (`test(TASK-0048): deriva cursor de reduced motion del spawn
  actual`).

# Tests

| Comando | Resultado | Evidencia |
|---|---|---|
| `pnpm run verify` | OK | `verify-output.txt` |
| `pnpm run test` | 55 archivos, 732 tests | `test-output.txt` |
| `pnpm run test:e2e` completo | 38 pasan / 36 fallan | `e2e-output.txt` |
| Nuevo spec growth | 4/4 pasan | `e2e-output.txt` |

# Comparación por título con `main`

| Métrica | `main` | Intento 1 | Intento 2 |
|---|---|---|---|
| Fallos E2E | 50 | 37 | 36 |
| Regresiones nuevas | — | 1 | **0** |
| `reduced motion` | pasaba | fallaba | **pasa** |

Comparación con títulos normalizados (sin línea/columna) sobre
`e2e-baseline.txt` de `main` e `e2e-output.txt` del intento 2:
`comm -13 baseline actual` devuelve **vacío**. Los 36 fallos restantes ya
estaban en `main` y son fixtures BSP con coordenadas/cámara anteriores a
TASK-0045.

# Evidencia visual

- Las capturas del intento 1 siguen vigentes; no cambió el render.
- `attempt-2/screenshots/` contiene la repetición de la suite (mismos nombres).

# Desviaciones

- Ninguna. Solo se ajustó la fixture del test de reduced motion.

# Problemas conocidos y preguntas abiertas

- 36 fallos stale de BSP, documentados en el intento 1 y en `e2e-output.txt`;
  dueño TASK-0049. No se tocaron.

# Fricción reutilizable

Ninguna nueva. Se mantiene la entrada `pending` del intento 1 sobre
`E2E_ARTIFACTS_DIR`.

# Métricas de handoff

| Métrica | Valor |
|---|---|
| `brief_bytes` | 2136 |
| `report_bytes` | 2415 |
| `overflow` | `none` |
| `criteria_failed` | 0 |
