---
type: Task Report
title: "TASK-0168: informe de ejecución"
description: Cofres deterministas en salas no-spawn con botín orientado al equipo y pieza de traits garantizada.
task: TASK-0168
attempt: 1
report_status: success
generated: { by: deepseek/v4-pro, at: 2026-11-16T17:10:00Z }
artifacts: artifacts/TASK-0168/attempt-1/
verified:
---

# Estado

`success`. Cofres deterministas por sala no-spawn; el RNG de combate no cambia y
la partida recién creada expone cofres (posición, capacidad, `opened` y
contenido). Corregidos los dos defectos del lead: `cloneContainer` copia
`opened` y la colocación BSP bloquea las celdas de `placeMapEnemies`.

# Cambios

- `src/game/chests.ts` (nuevo): `generateChests`, `bestPowerBySlot` y opciones
  (`chestChance`/`secondChestChance`/`traitPieceCount`/`depth`/`blockedCells`).
- `src/game/engine.ts`: genera cofres con PRNG propio y bloquea las celdas de
  `placeMapEnemies` cuando el generador no declara `map.enemies` (BSP).
- `src/game/inventory.ts`: `Container.opened?`; `src/game/save.ts` serializa
  `opened`; `src/game/index.ts`: export.
- `src/host/debug.ts`: `cloneContainer` copia `opened` (sin cambiar el tipo).
- Tests: `tests/unit/game/dungeon-chests.test.ts` (nuevo, +caso BSP),
  `tests/unit/host/debug.test.ts` (cofre con `opened`), ajuste de
  `tests/unit/game/save-schema.test.ts`.
- Commit SHA: `edf51595` (`fix(TASK-0168): snapshot cofre con opened y bloqueo
  de enemigos BSP`); feat previo `28bfb274`.

# Tests

| Comando | Resultado | Evidencia |
|---|---|---|
| `pnpm run verify` | OK: 115 archivos, 1856 tests, docs, tsc, build y bundle | `verify-output.txt` |
| `pnpm exec vitest run tests/unit/{game/dungeon-chests,game/save-schema,game/loot,host/debug}.test.ts` | OK: 4 archivos, 132 tests | `chests-tests.txt` |

E2E no aplica: la ficha lo declara fuera de alcance (UI/HUD en TASK-0170).

# Evidencia visual

- Rutas: ninguna; motor y snapshot sin UI.

# Desviaciones

- La pieza de traits garantizada ocupa el hueco 1 del primer cofre (sustituye su
  relleno); cada cofre conserva 2 objetos. Registrada como decisión del lead.
- La pieza solo sale del catálogo presente: un `catalog` de pruebas sin las
  cuatro piezas no las inyecta.

# Problemas conocidos y preguntas abiertas

- Ninguno pendiente.

# Fricción reutilizable

| Síntoma | Evidencia | Workaround | Por qué es reutilizable | Cambio propuesto | Coste/riesgo | Disposición |
|---|---|---|---|---|---|---|
| Añadir `containers` al estado inicial rompió el round-trip byte-idéntico por orden de claves | `save-schema.test.ts` falló con el mismo JSON en distinto orden | Colocar la clave nueva al final, donde `readState` la reconstruye | Cualquier campo nuevo de `GameState` debe replicar el orden de `readState` | Documentar el orden canónico o comparar por igualdad profunda | Bajo | `pending` |

# Métricas de handoff

| Métrica | Valor |
|---|---|
| `brief_bytes` | 0 (primer intento, sin brief) |
| `report_bytes` | ~3000 |
| `overflow` | `none` |
| `criteria_failed` | 0 |
