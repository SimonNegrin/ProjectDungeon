---
type: Task Report
title: "TASK-0050: informe de ejecución"
description: Balance provisional v1 en catálogos y tests migrados a propiedades.
task: TASK-0050
attempt: 1
report_status: success
generated: { by: deepseek/v4.1-flash, at: 2026-11-09T22:00:00Z }
artifacts: artifacts/TASK-0050/attempt-1/
verified:
---

# Estado

`success`: el motor lee PV 6/8/5, alarma 5, MP 5/4/6, centinela sin armadura y
daños 3/5/2 desde los catálogos; suite unitaria en verde.

# Cambios

- `src/game/bestiary.ts`: `maxMp` por tipo, PV 6/8/5, `alarm: 5` y centinela con
  `armorId: null`.
- `src/game/equipment.ts`: daños 3/5/2 (acierto intacto).
- `src/game/engine.ts` y `types.ts`: `createEnemy` usa `definition.maxMp` y se
  elimina `ENEMY_MAX_MP` como fuente global.
- `src/game/enemy-placement.ts`: `ALARM_RADIUS` se deriva del bestiario.
- Tests de `tests/unit/game` y `tests/unit/host`: expectativas numéricas
  sustituidas por valores/propiedades del catálogo; helpers sintéticos tipados
  leen PV, MP, modificadores y equipo del bestiario.
- Commit SHA: `f8ef0c4676082e09c2ddc2902b6116e0b1b13051` (código y tests).

# Tests

| Comando | Resultado | Evidencia |
|---|---|---|
| `pnpm exec vitest run tests/unit/game tests/unit/host` | 42 archivos, 581 tests en verde | `test-output.txt` |
| `pnpm run verify` | 55 archivos, 734 tests; build y bundle OK | `verify-output.txt` |

La colocación conserva 4 enemigos en las semillas 279837264, 42 y 1234, con
pareja ≤5 y aislado >5; cubierto por `enemy-placement.test.ts` y
`bsp-spawn-contract.test.ts`, que ya leen `ALARM_RADIUS`.

# Evidencia visual

- No aplica: E2E, capturas y playtest quedan para TASK-0051.

# Desviaciones

- Dos tests de integración de percepción/alarma pasan de comparar la lista
  completa de eventos a comprobar la secuencia clave, la adyacencia y el avance
  del alertado. El MP por tipo cambia el número de pasos; la intención se
  conserva sin fijar cifras frágiles de balance.
- Los tests de TtK y de ataque calculan la referencia desde los catálogos y las
  fórmulas, en lugar de fijar los valores de la tabla anterior.

# Problemas conocidos y preguntas abiertas

- Un primer `pnpm run verify` falló solo en
  `tests/unit/game/map.test.ts > rendimiento > genera la semilla de referencia
  por debajo de 100 ms` (406 ms) bajo carga; el reintento pasó. El test de tiempo
  es existente y ajeno a este cambio.
- Sin bloqueos ni preguntas abiertas.

# Fricción reutilizable

Ninguna. El fallo intermitente de rendimiento no se ha reproducido y no se
clasifica como fricción del arnés.

# Métricas de handoff

| Métrica | Valor |
|---|---|
| `brief_bytes` | 2550 |
| `report_bytes` | 2735 |
| `overflow` | `none` |
| `criteria_failed` | 0 |
