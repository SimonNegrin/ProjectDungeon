---
type: Task Report
title: "TASK-0057: informe del intento 2"
description: "Cámara estable sin movimiento activo y migración de expectativas E2E del beat."
task: TASK-0057
attempt: 2
report_status: success
generated: { by: deepseek/v4.1-flash, at: 2026-11-10T18:00:00Z }
artifacts: artifacts/TASK-0057/attempt-2/
verified:
---

# Estado

`success`. La cámara conserva su posición cuando no hay movimiento activo y el
texto de daño vuelve a quedar sobre el objetivo; la suite E2E completa pasa.

# Cambios

- `src/host/motion.ts`: `focusUnitId` devuelve la última unidad ya presentada o,
  antes del primer paso, la primera que se moverá; `cameraAt` acepta la cámara
  actual y la conserva hasta que arranca la primera fase. `MOTION_CONFIG` sigue
  125/70 y no cambia el beat ni el bloqueo.
- `src/host/main.ts`: `render`, `animationSnapshot` y `fireFeedbacks` pasan la
  cámara vigente a `cameraAt`.
- `tests/unit/host/motion.test.ts`: 2 tests nuevos (ataque sin movimiento y
  pre-beat de fase).
- `tests/e2e/support.ts`: `advanceToCue` para muestrear un cue sin completar la
  presentación.
- E2E migrados sin borrar aserciones: `cursor-qa`, `game-input-hud`,
  `motion-qa`, `perception-alarm-qa`, `perception-host-qa`. Se completa el beat
  antes de la siguiente tecla, se avanza al cue de alarma y se espera el
  pre-beat de fase antes del primer `UnitMoved`. No se añaden suites.
- Commit SHA: `4d67615`
  (`fix(TASK-0057): cámara estable sin movimiento y expectativas E2E del beat`).

# Tests

| Comando | Resultado | Evidencia |
|---|---|---|
| `pnpm exec vitest run tests/unit/host` | OK 296/296 (20 archivos) | `test-output.txt` |
| `pnpm run test:e2e` | OK 77/77 (39.8 s) | `e2e-output.txt` |
| `pnpm run verify` | OK: 775/775, docs, config, build y bundle | `verify-output.txt` |

# Evidencia visual

- No aplica como entrega visual nueva: TASK-0058/0059 implementan los efectos y
  TASK-0061 la QA visual. Las capturas E2E existentes se regeneraron en verde.

# Desviaciones

- No se tocaron `src/game/`, `experiments/`, dependencias, requisitos ni
  `docs/**`.
- Además de los 8 fallos del brief, al completar el beat apareció una expectativa
  stale en `motion-qa`: el tramo final asumía que la animación acababa con el
  movimiento y ahora incluye el beat de impacto. Se migró a completar el beat en
  el mismo muestreo; flash, daño y estado se siguen comprobando.
- En los E2E de fase se sustituyó el sondeo corto por un avance explícito del
  pre-beat; las aserciones de foco, cámara, fase y turno se conservan.

# Problemas conocidos y preguntas abiertas

- La aserción de `attack-flash` depende de una clase real de 120 ms. En dos
  ejecuciones parciales con 4 workers se perdió la ventana antes del primer poll;
  la suite completa pasó 77/77 en dos ejecuciones seguidas. No se debilitó el
  test.
- Los `setTimeout` de daño y destello siguen hasta TASK-0058; la alarma ya sale
  en su cue.

# Fricción reutilizable

Ninguna entrada que cumpla un disparador en este intento.

# Métricas de handoff

| Métrica | Valor |
|---|---|
| `brief_bytes` | 3764 |
| `report_bytes` | 3181 |
| `overflow` | `none` |
| `criteria_failed` | 0 |
