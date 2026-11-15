---
type: Task Report
title: "TASK-0135: informe de ejecución"
description: Render de cadáveres desde contenedores, beat de muerte y marca de pila.
task: TASK-0135
attempt: 1
report_status: success
generated: { by: deepseek/v4.1-flash, at: 2026-11-15T12:30:00Z }
artifacts: artifacts/TASK-0135/attempt-1/
verified:
---

# Estado

`success`.

# Cambios

- `src/host/renderer.ts`: `corpseMarks` agrupa `state.containers` con
  `kind: 'corpse'` por tile (orden estable), reutiliza `corpseRectFor` con
  `corpseOf ?? id` y expone `corpseMarkVisible`; `×N` con `fillRect`/`fillText`
  si `count > 1`. Se elimina el bucle sobre unidades `hp <= 0`.
- Tests: mapeo, decal, sin contenedor, jugador vacío, pila, retirada,
  `dyingUnitIds`/`effects`, no mutación y capas; el test existente de cadáver
  ahora usa contenedor. `presentationState` conserva el contenedor y la marca
  espera al beat.
- `tests/e2e/corpse-containers-render-qa.spec.ts`: dos cadáveres en un tile y
  unidad muerta sin contenedor.
- Commit SHA: `e42346d`.

# Tests

| Comando | Resultado | Evidencia |
|---|---|---|
| `vitest` renderer + presentation-feedback | 95 pasan | `test-output.txt` |
| E2E `corpse-containers-render-qa` | 1 pasa | `e2e-output.txt` |
| `pnpm run verify` | pasa (1547 tests, build y bundle) | `verify-output.txt` |

# Evidencia visual

- `corpse-containers-render-qa/screenshots/mapa-dos-cadaveres.png`: un decal y
  contador `×2` en la casilla compartida.
- `.../sin-contenedor.png`: mismo mapa sin contenedores, sin decal. El E2E
  comprueba que quitar la unidad sin contenedor deja el canvas idéntico.

# Desviaciones

- Ninguna de alcance. No se tocaron panel, motor, reglas, arte, `docs/**` ni el
  arnés.

# Problemas conocidos y preguntas abiertas

- Con varios `corpseOf` en un grupo, la ocultación usa el primero del orden de
  `state.containers`; muertes simultáneas en el mismo tile esperarían al primer
  beat. No afecta al caso de un cadáver por tile.
- No se reejecutó la suite E2E completa (TASK-0142). EXP-004 no agotó timeout.

# Fricción reutilizable

Sin entradas: no apareció comportamiento no documentado ni fallo repetible.

# Métricas de handoff

| Métrica | Valor |
|---|---|
| `brief_bytes` | 2480 |
| `report_bytes` | 2315 |
| `overflow` | `none` |
| `criteria_failed` | `none` |
