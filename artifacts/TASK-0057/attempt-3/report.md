---
type: Task Report
title: "TASK-0057: informe del intento 3"
description: "FEEDBACK_CONFIG completa las duraciones de disolución y persistencia de REQ-017."
task: TASK-0057
attempt: 3
report_status: success
generated: { by: deepseek/v4.1-flash, at: 2026-11-10T18:06:00Z }
artifacts: artifacts/TASK-0057/attempt-3/
verified:
---

# Estado

`success`. `FEEDBACK_CONFIG` reúne todas las duraciones de REQ-017; sin cambios de
comportamiento ni E2E.

# Cambios

- `src/host/feedback-config.ts`: `durations.deathDissolveMs: 300`; en `texts`,
  `rejectedNoticeMs: 1600`, `fledPersistMs: 600`, `returnedPersistMs: 500`,
  `waitedPersistMs: 400`, `enemyPhaseBannerMs: 800`, `playerTurnBannerMs: 700`.
  Los comentarios distinguen `noticeMs` (HUD genérico, incluido rechazo),
  `alarmNoticeMs` (`¡Alarma!`) y `bannerMs` (recogida/cambio de arma); los dos
  avisos de 1600 se mantienen.
- `tests/unit/host/presentation-feedback.test.ts`: aserción nueva sobre
  `durations` y `texts`; sigue la derivación de `DAMAGE_FEEDBACK_MS`,
  `ATTACK_FLASH_MS` y `NOTICE_DURATION_MS`.
- Commit: `d7139eb` (`feat(TASK-0057): completar FEEDBACK_CONFIG`).

# Tests

| Comando | Resultado | Evidencia |
|---|---|---|
| `pnpm exec vitest run tests/unit/host` | OK 297/297 (20 archivos) | `test-output.txt` |
| `pnpm run test:e2e` | OK 77/77 (42.1 s) | `e2e-output.txt` |
| `pnpm run verify` | OK: 776/776, docs, config, build y bundle | `verify-output.txt` |

# Desviaciones

- Sin cambios en `src/game/`, `experiments/`, `index.html`, dependencias,
  requisitos, `docs/**` ni E2E. Valores nuevos solo en `FEEDBACK_CONFIG`.

# Problemas conocidos y preguntas abiertas

- `attack-flash` depende de una clase real de 120 ms; con carga alta se pierde
  antes del primer poll. Tres pasadas fallaron; la final pasó 77/77.

# Fricción reutilizable

| Síntoma | Evidencia | Workaround | Por qué es reutilizable | Cambio propuesto | Coste/riesgo | Disposición |
|---|---|---|---|---|---|---|
| `toHaveClass(/is-active/)` de `attack-flash` falla de forma intermitente: dura 120 ms. | `e2e-output-failed-1/2/3.txt` | Reintentar hasta una pasada limpia. | Cualquier tarea que ejecute E2E con carga puede chocar. | Aseverar el cue de presentación o mantener la clase durante el beat (TASK-0058). | Bajo con el reloj de presentación; alto si solo se alarga para el test. | `pending` |

# Métricas de handoff

| Métrica | Valor |
|---|---|
| `brief_bytes` | 2333 |
| `report_bytes` | 2517 |
| `overflow` | `none` |
| `criteria_failed` | 0 |
