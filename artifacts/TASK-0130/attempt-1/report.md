---
type: Task Report
title: "TASK-0130: informe de ejecución"
description: Motor de saqueabilidad, lootPolicy y RNG de botín derivado.
task: TASK-0130
attempt: 1
report_status: success
generated: { by: deepseek/v4.1-flash, at: 2026-11-15T11:34:40Z }
artifacts: artifacts/TASK-0130/attempt-1/
verified:
---

# Estado

`success`.

# Cambios

- `equipment.ts`: `LootPolicy`, `LOOT_CHANCES` (25/100) en datos,
  `ItemDefinition.lootPolicy` obligatorio (diez objetos `common`) y regla
  `loot-policy` en `validateItemCatalog`.
- `rng.ts`: `deriveLootRng` y `rollPercent` puros, sin leer `state.rng`.
- `inventory.ts`: `ItemInstance.lootable` obligatorio y helper `itemInstance`;
  propagación en creación, recogida, equipado, suelo y `allInstances`.
- `loot.ts` nuevo: `rollEnemyLoot(semilla, id, equipo, mochila, catálogo?)`,
  orden `EQUIPMENT_SLOTS` y luego mochila; `progression` no consume tirada.
- `engine.ts`: `createEnemy` recibe la semilla y tira al crear (tres rutas).
- `host/debug.ts`: `lootPolicy` derivada de `ITEMS` en equipo, mochila, suelo y
  cofres; sin listas paralelas ni cambio de overlay.
- Tests: nuevo `loot.test.ts`; ampliados `item-catalog`, `inventory`, `engine`,
  `integration` y `host/debug`; fixtures con `lootable: true`.
- Commits: `053a920` (motor), `7848198` (tests); ver `commit.txt`.

# Tests

| Comando | Resultado | Evidencia |
|---|---|---|
| `pnpm exec vitest run tests/unit/game/{inventory,item-catalog,engine}.test.ts` | 3 archivos, 66 OK | `test-output.txt` |
| `pnpm exec vitest run loot + integration + debug` | 3 archivos OK | `test-output.txt` |
| `pnpm run verify` | OK: 100 archivos, 1491 tests, build y bundle | `verify-output.txt` |

Ningún test se borró, saltó ni debilitó.

# Evidencia visual

- No aplica: sin cambios de render ni del overlay `F1`.

# Desviaciones

- `docs/tasks/TASK-0130-...md` ya estaba modificado antes del intento; no lo
  toqué ni lo incluí en commits.
- Sin `pnpm run test:e2e`: los E2E solo recibieron el campo obligatorio en
  fixtures y no cambia la UI.

# Problemas conocidos y preguntas abiertas

- Persistencia de `lootable`: TASK-0138.

# Fricción reutilizable

| Síntoma | Evidencia | Workaround | Por qué es reutilizable | Cambio propuesto | Coste/riesgo | Disposición |
|---|---|---|---|---|---|---|
| `boundaries.test.ts` falla si un comentario de `src/game` menciona `Math.random` | Falló el docblock de `loot.ts`; se reescribió | Evitar la cadena literal | Afecta a cualquier módulo futuro | Ignorar comentarios al escanear | Bajo | `pending` |
