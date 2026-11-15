---
type: Lead Verification
title: "TASK-0130: verificación independiente del intento 1"
description: Revisión del diff, criterios y reejecución de tests y verify.
task: TASK-0130
attempt: 1
status: stable
generated: { by: deepseek/v4.1-flash, at: 2026-11-15T11:42:00Z }
---

# Diff

- `main...task/TASK-0130`: 2 commits (`053a920`, `7848198`), 28 archivos,
  +759/−90; solo `src/game`, `src/host/debug.ts`, tests y fixtures de E2E.
- Sin cambios de requisitos, criterios, alcance, fórmulas, balance, IA, mapa,
  combate, `Container`, `package.json` ni `pnpm-lock.yaml`.
- Sin `skip`/`todo` nuevos. Las dos aserciones de `debug.test.ts` que cambian
  (`equipment`/`inventory` del snapshot) conservan su intención: comparan contra
  la vista del snapshot con `lootPolicy` derivada, no contra menos campos.

# Criterios

| # | Criterio | Evidencia |
|---|---|---|
| 1 | `lootable` por instancia, por defecto `true` | `inventory.ts` (`itemInstance`, `equipmentFromLegacy`, `inventoryFromIds`); tests de `inventory.test.ts` y `loot.test.ts` |
| 2 | `lootPolicy` y porcentajes en datos | `equipment.ts` (`LOOT_CHANCES` 25/100, diez objetos `common`, regla `loot-policy`); `item-catalog.test.ts` |
| 3 | Tirada por instancia de equipo y mochila; resultados independientes | `loot.ts` (`rollEnemyLoot`), `engine.ts`; `loot.test.ts` («dos objetos del mismo enemigo», mochila) |
| 4 | RNG derivado de semilla e id; sin `Math.random` ni RNG principal | `rng.ts` (`deriveLootRng`, `rollPercent`); `loot.test.ts` y `engine.test.ts` (`state.rng === createRng(seed)`); `boundaries.test.ts` escanea todo `src/game` |
| 5 | `progression` siempre saqueable; objeto adquirido conserva marca | `loot.test.ts` (sin consumir tirada), `inventory.test.ts` (recoger/equipar/soltar con `lootable: false`) |
| 6 | Snapshot expone `lootable`, política y resultado sin duplicar inventario | `host/debug.ts` (`SnapshotItemInstance` con `lootPolicy` derivada en equipo, mochila, suelo y cofres); `host/debug.test.ts` |
| 7 | Tests de determinismo, 25/100, independencia, adquiridos y RNG; `verify` | ver tabla de comandos |

# Comandos reejecutados

| Comando | Resultado | Evidencia |
|---|---|---|
| `pnpm run verify` | OK: docs:check (solo avisos previos), config:check, 100 archivos/1491 tests, `tsc`, build y bundle | `verify-lead.txt` |
| `pnpm exec vitest run` (6 archivos de la tarea) | 116/116 | `targeted-tests.txt` |
| `pnpm run test:e2e tests/e2e/panel-submenu-reopen-qa.spec.ts` | 3/3 (fixture E2E con `lootable`) | `e2e-fixture-spotcheck.txt` |

# Prueba manual acordada

`F1` con un enemigo de dos objetos: `window.__game.snapshot()` muestra
`lootable` y `lootPolicy` por instancia en `enemies[].equipment`; no se añadió
ningún campo de tirada numérico ni se tocó el overlay.

# Fricción triada

`boundaries.test.ts` prohíbe la cadena `Math.random` también en comentarios de
`src/game`: el docblock de `loot.ts` tuvo que reescribirse. **Rechazada**: el
guardián es deliberadamente literal y absoluto; excluir comentarios del escaneo
abarata el invariante por un coste nulo (basta redactar el comentario). Sin
tarea ni cambio de arnés.
