---
type: Task Report
title: "TASK-0030: informe de ejecución"
description: E2E y QA visual del combate con equipo, recogida, cambio de arma, HUD y determinismo.
task: TASK-0030
attempt: 1
report_status: success
generated: { by: deepseek/v4.1-flash, at: 2026-11-08T19:20:00Z }
artifacts: artifacts/TASK-0030/attempt-1/
verified:
---

# Estado

`success`. REQ-010 verificado de extremo a extremo sin tocar producción.

# Cambios

- `tests/e2e/combat-equipment-qa.spec.ts`: 5 tests E2E con helpers locales. Sin
  cambios en `src/`, `index.html`, `public/`, dependencias ni `docs/`.
- Commit SHA: `d35ab07`.
- Artefactos: capturas, `spec-run.txt`, `test-output.txt`, `verify-output.txt`
  y `logs/reference-seed-combat.txt`.

# Tests

| Comando | Resultado | Evidencia |
|---|---|---|
| spec nuevo con `E2E_ARTIFACTS_DIR` | 5 passed | `spec-run.txt` |
| `pnpm run test:e2e` | 62 passed | `test-output.txt` |
| `pnpm run verify` | 483 tests; docs/config/build OK (6 avisos preexistentes) | `verify-output.txt` |

Cubre todos los criterios de TASK-0030, incluido determinismo en dos cargas.

# Evidencia visual

- `screenshots/`: `hud-sword`, `weapon-in-map`, `weapon-map-hint`,
  `weapon-picked`, `weapon-switch`, `attack-hit`, `enemy-hit`, `attack-miss`,
  `debug-f1`, `victory`, `defeat` (1280×720).
- `attack-hit`: flash y enemigo 8/9; el `-1` se solapa con el jugador amarillo.
  `enemy-hit`: `-4` y 16/20, legible. `debug-f1`: equipo, vida, tiradas y cursor.

# Desviaciones

- `Fallo` visual con la semilla suplementaria `13`. Con `279837264` el primer
  ataque impacta (1) y el segundo mata (9); no hay fallo alcanzable antes de
  victoria/derrota. Secuencia en `logs/reference-seed-combat.txt`; el resto usa
  la semilla de referencia.
- `enemy-hit.png` es evidencia adicional, no sustituye aserciones.

# Problemas conocidos y preguntas abiertas

- En pasillos de una casilla el feedback amarillo se solapa con el jugador
  (`attack-hit`). Es presentación de TASK-0029; el DOM y `F1` confirman el daño.

# Fricción reutilizable

| Síntoma | Evidencia | Workaround | Por qué es reutilizable | Cambio propuesto | Coste/riesgo | Disposición |
|---|---|---|---|---|---|---|
| `walkTo` termina con 0 MP y `G` se rechaza | TASK-0029 y este spec | `EndTurn` hasta `mp >= 1` antes de `G` | Cualquier E2E que camine y recoja equipo | `walkToWithMp` o documentarlo | Bajo; solo tests | `pending` |

# Métricas de handoff

| Métrica | Valor |
|---|---|
| `brief_bytes` | 2492 |
| `report_bytes` | 2559 |
| `overflow` | `none` |
| `criteria_failed` | 0 |
