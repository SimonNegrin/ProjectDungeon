---
type: Task Report
title: "TASK-0127: informe de ejecución"
description: Mapa y miniatura del HUD comparten la celda de la variante.
task: TASK-0127
attempt: 1
report_status: success
generated: { by: deepseek/v4.1-flash, at: 2026-11-15T10:10:00Z }
artifacts: artifacts/TASK-0127/attempt-1/
verified:
---

# Estado

`success`. Mapa y HUD resuelven la celda 32×32 con una función única sobre
`ARCHETYPE_VARIANT_CELLS`; sin sprite fijo ni `PORTRAIT_RECTS`.

# Cambios

- `src/host/archetype-sheet.ts`: `variantCellFor`; variante ausente/inválida →
  variante 1 del mismo arquetipo; arquetipo nulo/desconocido → `null`.
- `src/host/renderer.ts` y `src/host/hud.ts`: ambos usan esa celda; sin arquetipo
  no hay sprite. Enemigos, cadáveres, puertas, efectos y orden intactos.
- Tests: `tests/unit/host/{renderer,hud}.test.ts`,
  `tests/e2e/variant-map-hud-qa.spec.ts`.
- Commit SHA: `87e8629` (código), `be18481` (tests y E2E).

# Tests

| Comando | Resultado | Evidencia |
|---|---|---|
| `pnpm exec vitest run tests/unit/host/renderer.test.ts tests/unit/host/hud.test.ts` | 87 pasan | `test-output.txt` |
| `pnpm exec playwright test tests/e2e/variant-map-hud-qa.spec.ts` | 1 pasa | `e2e-output.txt` |
| `pnpm run verify` | pasa (1452 tests, build y bundle) | `verify-output.txt` |

Cubre 18 celdas, variante por jugador en renderer/HUD, dos jugadores, variante
nula/inválida sin cambiar de arquetipo, sin arquetipo sin sprite,
`createInitialState`, `Restart` y `GameSession.load`. El E2E arranca del menú con
Guerrero v1 y v2: mismo tile y cámara, hash de canvas distinto y
`background-position` ×2.

# Evidencia visual

- `variant-map-hud-qa/{screenshots,logs}/`: partida y HUD v1/v2 y
  `variant-map-hud.json`; miniatura y sprite del tile cambian juntos.

# Desviaciones

- Tests viejos con jugadores sintéticos que esperaban `KNIGHT_RECT` ahora usan un
  Guerrero real; se añaden casos sin arquetipo y desconocido (sin sprite).
- Capturas y log del E2E en `variant-map-hud-qa/`, como en tareas anteriores, en
  vez de en la raíz del intento.

# Problemas conocidos y preguntas abiertas

- `docs/design/architecture.md` aún menciona `PORTRAIT_RECTS`; lo actualiza el
  lead (documentación compartida).
- `docs:check` muestra avisos previos; el del brief (2562 B) es del intento.

# Fricción reutilizable

Ninguna con evidencia suficiente.

# Métricas de handoff

| Métrica | Valor |
|---|---|
| `brief_bytes` | 2559 |
| `report_bytes` | 2520 |
| `overflow` | `none` |
| `criteria_failed` | 0 |
