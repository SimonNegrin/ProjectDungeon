---
type: Task Report
title: "TASK-0135: informe de ejecución"
description: Render de cadáveres desde contenedores, beat de muerte y pila por contenedor visible.
task: TASK-0135
attempt: 1
report_status: success
generated: { by: deepseek/v4.1-flash, at: 2026-11-15T12:31:00Z }
artifacts: artifacts/TASK-0135/attempt-1/
verified:
---

# Estado

`success`. Corrige la visibilidad de la pila: se resuelve por contenedor antes
de agrupar.

# Cambios

- `src/host/renderer.ts`: `corpseMarks(containers, options)` filtra cada
  contenedor `kind: 'corpse'` por `corpseContainerVisible` antes de agrupar. El
  grupo solo cuenta visibles, el decal usa el primer visible y un tile sin
  visibles no produce marca. `×N` solo si `count > 1`.
- Regresión: cadáver de jugador visible + segundo contenedor con `corpseOf` en
  `dyingUnitIds`/`effects` → un decal, `count: 1`, sin `×2`; al quitar la
  ocultación → `count: 2` y `×2`.
- E2E: casilla sin objeto de suelo ni jugador; contenedores con una
  `ItemInstance` saqueable (`dagger`, `axe`).
- `presentationState` sigue conservando el contenedor; `corpseMarks` lo filtra
  hasta acabar el beat.
- Commit SHA: `0ea6c4d`.

# Tests

| Comando | Resultado | Evidencia |
|---|---|---|
| `vitest` renderer + presentation-feedback | 96 pasan | `test-output.txt` |
| E2E `corpse-containers-render-qa` | 1 pasa | `e2e-output.txt` |
| `pnpm run verify` | pasa (1548 tests, build y bundle) | `verify-output.txt` |

# Evidencia visual

- `corpse-containers-render-qa/screenshots/mapa-dos-cadaveres.png`: un decal y
  contador `×2` en la casilla compartida.
- `.../sin-contenedor.png`: mismo mapa sin contenedores, sin decal. El E2E
  comprueba que quitar la unidad sin contenedor deja el canvas idéntico.

# Desviaciones

- Ninguna de alcance. No se tocaron panel, motor, reglas, arte, `docs/**` ni el
  arnés.

# Problemas conocidos y preguntas abiertas

- Ninguno abierto para esta tarea. No se reejecutó la suite E2E completa
  (TASK-0142). EXP-004 no agotó timeout en `verify`.

# Fricción reutilizable

Sin entradas: no apareció comportamiento no documentado ni fallo repetible.

# Métricas de handoff

| Métrica | Valor |
|---|---|
| `brief_bytes` | 2480 |
| `report_bytes` | 2292 |
| `overflow` | `none` |
| `criteria_failed` | `none` |
