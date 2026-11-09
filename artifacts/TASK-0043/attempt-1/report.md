---
type: Task Report
title: "TASK-0043: informe de ejecución"
description: Modelo serializable con máscaras, puertas entre salas, pasillos con extremos y spawn de grupo.
task: TASK-0043
attempt: 1
report_status: success
generated: { by: deepseek/v4.1-flash, at: 2026-11-09T17:05:00Z }
artifacts: artifacts/TASK-0043/attempt-1/
verified:
---

# Estado

`success`. Modelo y validadores ampliados; BSP sigue inyectable, determinista y
con su `id = 'bsp'`.

# Cambios

- `src/game/map.ts`: campos nuevos de `Room`, `Corridor`, `Door` y `Spawns`;
  tipos `Entrance`/`Exit`/`MapEnemy`; pertenencia por máscara y validadores.
- `src/game/bsp.ts`: rellena esos campos sin cambiar geometría, huecos ni semilla.
- `src/game/engine.ts`: jugador desde `party[0]` con fallback a `player` (T-004).
- `tests/unit/game/map-production-model.test.ts`: 15 tests nuevos.
- Commit: `2e14c7df78114a48a5621b1c61a122017c6de812`
  (`feat(TASK-0043): modelo de mapa de producción`).

# Tests

| Comando | Resultado | Evidencia |
|---|---|---|
| `pnpm run verify` (300 s) | OK: docs/config, 635/635 tests, build | `verify-output.txt` |
| Vitest regresión + nuevos (5 archivos) | 93/93 | `test-output.txt` |

Cubre máscara/muesca, celda de caja sin suelo, round-trip JSON, alias
`party[0]`/`player`, fallback del motor, extremos de pasillo, puertas con
`roomA != roomB`, determinismo y negativos históricos de BSP.

# Evidencia visual

- No aplica: sin cambios de UI, host, render ni bundle.

# Desviaciones

- `src/game/engine.ts` (2 líneas) consume `party[0]` con fallback por T-004; no
  cambia spawns ni colocación enemiga.
- Campos nuevos opcionales para no romper fixtures (T-013); BSP y mapas generados
  los rellenan siempre y los tests lo exigen.
- `direct` es `false` en BSP: sus pasillos tienen al menos 1 tile interior.

# Problemas conocidos y preguntas abiertas

- `roomContains` recorre `cells` linealmente; suficiente a 32×32.
- Las máscaras BSP son rectángulos; las formas irregulares llegan con `growth`.

# Fricción reutilizable

Sin entradas: no hubo comportamiento no documentado, fallo repetible ni
contradicción entre brief, plantilla y validador.

# Métricas de handoff

| Métrica | Valor |
|---|---|
| `brief_bytes` | 4086 |
| `report_bytes` | 2316 |
| `overflow` | `none` |
| `criteria_failed` | 0 |
