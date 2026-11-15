---
type: Task Brief Detail
title: "TASK-0130: contrato técnico del intento 1"
description: Decisiones cerradas de modelo de datos, RNG derivado, propagación y snapshot.
task: TASK-0130
attempt: 1
status: stable
generated: { by: deepseek/v4.1-flash, at: 2026-11-15T09:40:00Z }
---

# Decisiones cerradas (no reabrir)

1. **Instancia.** `ItemInstance` gana `readonly lootable: boolean` obligatorio.
   Añadir un helper `itemInstance(id, itemId, lootable = true)` y usarlo en
   `equipmentFromLegacy`, `inventoryFromIds` y los sitios que reconstruyan
   instancias. Jugador, suelo y cofres nacen con `true`.
2. **Catálogo.** En `equipment.ts`: `export type LootPolicy = 'common' |
   'progression'`; `ItemDefinition.lootPolicy` obligatorio; los diez objetos
   actuales declaran `'common'` (progresión llega con su hoja, sin añadir
   objetos). Los porcentajes son dato:
   `LOOT_CHANCES: Readonly<Record<LootPolicy, number>> = { common: 25,
   progression: 100 }`. `validateItemCatalog` añade la regla `loot-policy` si
   falta o es desconocida.
3. **RNG derivado** (`rng.ts`): `deriveLootRng(seed: number, identity: string):
   RngState` con hash puro de semilla + identidad (no lee `state.rng`) y
   `rollPercent(rng): { value /* 0..99 */, rng }`. Prohibido `Math.random`.
4. **Tirada** (módulo nuevo `src/game/loot.ts`, exportado en `index.ts`): una
   función pura que recibe semilla, id de enemigo e instancias y devuelve las
   instancias con la marca aplicada. `progression` no consume tirada y sale
   siempre `true`; `common` sale `lootable = value < LOOT_CHANCES.common`. Orden
   estable: huecos de `EQUIPMENT_SLOTS` y después índices de mochila.
5. **Creación.** `createEnemy` recibe la semilla de `buildInitialState` y aplica
   la tirada al equipo y a la mochila (hoy vacía). Las tres rutas de creación de
   enemigos pasan la semilla. `Restart` y `debug.setup` no vuelven a tirar por su
   cuenta: la tirada ocurre solo al crear la instancia del enemigo.
6. **Propagación.** `pickUpItem`, `locateSource` (suelo y contenedor),
   `dropItem`, `allInstances` y `GroundItem` conservan la marca. Un objeto
   adquirido después mantiene la que traía.
7. **Snapshot** (`debug.ts`): `SnapshotItemInstance = ItemInstance & {
   readonly lootPolicy: LootPolicy }` en `equipment`, `inventory`, `groundItems`
   y `containers`; `lootPolicy` se deriva de `ITEMS[itemId]`. Sin listas
   paralelas de objetos y sin tocar el overlay `F1` (`hud.ts`). `lootable` es el
   resultado visible de la tirada; no se añade un campo numérico de tirada.
8. **Tests.** Nuevo `tests/unit/game/loot.test.ts`: determinismo por semilla e
   id, ~25 % sobre una muestra de semillas, 100 % de progresión con definición
   sintética, dos objetos del mismo enemigo con resultados distintos en alguna
   semilla, política inválida y `state.rng` intacto. Actualizar
   `item-catalog.test.ts`, `inventory.test.ts`, `engine.test.ts`,
   `integration.test.ts` y `tests/unit/host/debug.test.ts` conservando sus
   aserciones. Los fixtures de tests y E2E que creen instancias literales se
   actualizan (tsconfig incluye `tests/`).
9. **Fuera.** No tocar acciones, IA, mapa, combate, `Container`, `package.json`
   ni `pnpm-lock.yaml`. `src/game` no importa `src/host`.
