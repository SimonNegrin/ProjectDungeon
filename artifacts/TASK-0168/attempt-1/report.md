---
type: Task Report
title: "TASK-0168: informe de ejecución"
description: Cofres deterministas en salas no-spawn con botín orientado al equipo y pieza de traits garantizada.
task: TASK-0168
attempt: 1
report_status: success
generated: { by: deepseek/v4-pro, at: 2026-11-16T17:05:00Z }
artifacts: artifacts/TASK-0168/attempt-1/
verified:
---

# Estado

`success`. Cofres deterministas por sala no-spawn; el RNG de combate no cambia y
la partida recién creada expone cofres, posición, capacidad, estado y contenido
en `state.containers`.

# Cambios

- `src/game/chests.ts` (nuevo): `generateChests`, `bestPowerBySlot`, constantes
  y opciones (`chestChance`/`secondChestChance`/`traitPieceCount`/`depth`).
- `src/game/engine.ts`: `createInitialState` genera cofres con PRNG propio
  (mulberry32 con sal); no consume `state.rng`.
- `src/game/inventory.ts`: `Container.opened?`; `src/game/save.ts`: serializa
  `opened`; `src/game/index.ts`: export.
- Tests: `tests/unit/game/dungeon-chests.test.ts` (nuevo) y ajuste de
  `tests/unit/game/save-schema.test.ts` (cofres ya nacen en el estado inicial).
- Commit SHA: `28bfb274` (`feat(TASK-0168): cofres por sala y botín progresivo determinista`)

# Tests

| Comando | Resultado | Evidencia |
|---|---|---|
| `pnpm run verify` | OK: 115 archivos, 1854 tests, docs, tsc, build y bundle | `verify-output.txt` |
| `pnpm exec vitest run tests/unit/game/{dungeon-chests,save-schema,loot}.test.ts` | OK: 3 archivos, 95 tests | `chests-tests.txt` |

E2E no aplica: la ficha lo declara fuera de alcance (UI/HUD en TASK-0170).

# Evidencia visual

- Rutas: ninguna; motor puro sin UI.

# Desviaciones

- La pieza de traits garantizada ocupa el hueco 1 del primer cofre (sustituye su
  relleno); cada cofre conserva 2 objetos y la pieza va «fuera de la curva».
  Interpretación de ADR-033 § botín especial.
- La pieza solo sale del catálogo presente: un `catalog` de pruebas sin las
  cuatro piezas no las inyecta.

# Problemas conocidos y preguntas abiertas

- ¿Confirma el lead «una pieza por nivel en el primer cofre»? No bloquea: los
  criterios 50/20, forzado, umbral, relleno y pieza garantizada se cumplen.

# Fricción reutilizable

| Síntoma | Evidencia | Workaround | Por qué es reutilizable | Cambio propuesto | Coste/riesgo | Disposición |
|---|---|---|---|---|---|---|
| Añadir `containers` al estado inicial rompió el round-trip byte-idéntico por orden de claves | `save-schema.test.ts` falló en ida-vuelta con el mismo JSON en distinto orden | Colocar la clave nueva en el orden en que `readState` reconstruye (al final) | Cualquier campo nuevo de `GameState` debe replicar el orden de `readState` o el guardado deja de ser byte-idéntico | Documentar el orden canónico o comparar por igualdad profunda en vez de `JSON.stringify` | Bajo | `pending` |

# Métricas de handoff

| Métrica | Valor |
|---|---|
| `brief_bytes` | 0 (primer intento, sin brief) |
| `report_bytes` | ~2700 |
| `overflow` | `none` |
| `criteria_failed` | 0 |
