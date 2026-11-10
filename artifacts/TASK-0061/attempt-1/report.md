---
type: Task Report
title: "TASK-0061: informe de ejecución"
description: E2E completo, QA visual, modo reducido y deuda de advance.
task: TASK-0061
attempt: 1
report_status: success
generated: { by: deepseek/v4.1-flash, at: 2026-11-10T20:20:00Z }
artifacts: artifacts/TASK-0061/attempt-1/
verified:
---

# Estado

`success`. Suite E2E completa verde; cada familia observable en su pico, evidencia
1280×720.

# Cambios

- `src/host/main.ts`: sin animación, `advance(ms)` usa reloj manual, cancela el
  rAF de textos y consume `advanceTransientFeedback(ms)` antes de renderizar;
  `advance(0)` no consume.
- `feedback-turns-marks-qa.spec.ts`: regreso (`zzz`), espera (`...`), `TU TURNO`
  y consumo manual de marca.
- `feedback-reduced-motion-qa.spec.ts`: texto/banner/marca estáticos, sin
  tween/sacudida/fundido, mismo orden y estado final que el modo animado.
- `feedback-combat-qa.spec.ts`: regresión de texto/banner, grises y
  rejilla/cursor/camino.
- `feedback-inventory-perception-qa.spec.ts`: capturas de cambio de arma, fin,
  reinicio y rechazo.
- `combat-equipment-qa.spec.ts` y `equipment-hud-qa.spec.ts`: esperas reales
  migradas a `advance`/`advanceToCue`, conservando intención y aserciones.
- Commit: `1117596dc4aae3224ab34a4566917cccddba41be`.

# Tests

| Comando | Resultado | Evidencia |
|---|---|---|
| `pnpm test` | 818 tests OK | `test-output.txt` |
| `pnpm run test:e2e` | 98 OK | `e2e-output.txt` |
| `--repeat-each=3` alarma/huida/muerte | 33 OK | `e2e-repeat.txt` |
| `pnpm run verify` | docs, config, unitarios, build y bundle OK | `verify-output.txt` |

# Evidencia visual

- `screenshots/`: 26 PNG 1280×720 de todas las familias, con grises y reducido.
- `impacto-persistente.png` demuestra rejilla, cursor y camino con texto vivo.
- En grises, `-N` y `Fallo` se distinguen por texto y `data-result`.

# Desviaciones

- `docs/**` intacto; sin deltas documentales. `docs:check` pasa.
- Dos specs con `waitForTimeout` migraron a cue/`advance` sin debilitar aserciones.

# Problemas conocidos y preguntas abiertas

- El `zzz` de `EnemyReturned` puede ser sustituido por `...` del mismo enemigo;
  es el orden real (`playtest.md`).

# Fricción reutilizable

- `--repeat-each` sobrescribe capturas; detalle en `report-detalle.md`.

# Métricas de handoff

| Métrica | Valor |
|---|---|
| `brief_bytes` | 3272 |
| `report_bytes` | 2424 |
| `overflow` | `none` |
| `criteria_failed` | 0 |
