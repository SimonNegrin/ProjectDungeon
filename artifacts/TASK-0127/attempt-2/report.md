---
type: Task Report
title: "TASK-0127: informe del intento 2"
description: Cubre las 18 celdas y captura el HUD con la miniatura.
task: TASK-0127
attempt: 2
report_status: success
generated: { by: deepseek/v4.1-flash, at: 2026-11-15T10:12:00Z }
artifacts: artifacts/TASK-0127/attempt-2/
verified:
---

# Estado

`success`. Sin cambios de producción: el mapeo de las 18 celdas ya era correcto;
el E2E captura el nodo que contiene la miniatura.

# Cambios

- `tests/unit/host/renderer.test.ts`: 9 arquetipos × 2 variantes comparan
  `variantCellFor(id, variant)` con `ARCHETYPE_VARIANT_CELLS[id][variant - 1]`
  (`sw`/`sh` 32) y exigen que mapa y `buildHudModel(state).portrait` usen esa
  misma celda.
- `tests/e2e/variant-map-hud-qa.spec.ts`: `hud-variante-*` se captura sobre
  `[data-testid="hud-left"]`; se mantienen hash de canvas, tile, cámara y
  `background-position`.
- Commit SHA: `41fbdad` (tests); producción del intento 1: `87e8629`.

# Tests

| Comando | Resultado | Evidencia |
|---|---|---|
| `pnpm exec vitest run tests/unit/host/renderer.test.ts tests/unit/host/hud.test.ts` | 106 pasan | `test-output.txt` |
| `pnpm run test:e2e tests/e2e/variant-map-hud-qa.spec.ts` | 1 pasa | `e2e-output.txt` |
| `pnpm run verify` | pasa (1471 tests, build y bundle) | `verify-output.txt` |

La prueba de 18 celdas habría fallado si renderer o HUD devolvieran la variante 1
en barbarian, archer, cleric, spellblade o cook.

# Evidencia visual

- `variant-map-hud-qa/screenshots/`: `hud-variante-1` y `hud-variante-2` ya
  difieren entre sí y de `mapa-*`; muestran la miniatura con espada y con maza.
- `variant-map-hud-qa/logs/variant-map-hud.json`: hashes de canvas distintos
  (`d479dd0e` / `b4b71bf8`) y `hudPosition.x` 0 / −128.
- Revisar que la miniatura cambia con la variante sin mover tile ni cámara.

# Desviaciones

- Se conserva el test previo del HUD con 4 arquetipos fijos; el nuevo cubre 18.
- Capturas y log bajo `variant-map-hud-qa/`, como en el intento 1.
- `docs/tasks/TASK-0127-*.md` ya estaba modificado al empezar (lead); no se tocó.

# Problemas conocidos y preguntas abiertas

- `docs:check` mantiene avisos previos (brief del intento 1, 2562 B) y la
  mención a `PORTRAIT_RECTS` en `docs/design/architecture.md`.
- El puerto 4173 quedó libre tras el E2E.

# Fricción reutilizable

Ninguna con evidencia suficiente.

# Métricas de handoff

| Métrica | Valor |
|---|---|
| `brief_bytes` | 2332 |
| `report_bytes` | 2515 |
| `overflow` | `none` |
| `criteria_failed` | 0 |
