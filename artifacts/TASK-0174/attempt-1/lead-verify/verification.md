---
type: Verification
title: "TASK-0174: verificación del intento 1"
description: Resultado de verify:task y criterios revisados de densidad por party real.
task: TASK-0174
attempt: 1
status: stable
generated: { by: deepseek/v4.1-flash, at: 2026-11-16T20:18:28Z }
---

# Resultado

`ok`. `verify:task` en verde con 9 criterios firmados, `pnpm run verify` (1901
tests, build y bundle) y diff dentro de `src/` y `tests/`.

# Criterios

Todos sostenidos con evidencia:

- Totales 4-6 y 10-12 con la misma semilla: `tests/unit/host/density-party.test.ts`.
- `P` derivado de la party y sin opciones del host: `src/game/engine.ts` sobrescribe
  `numPlayers` con `players.length`; tests de `map-integration` y `density-party`.
- Suelo antes de repartir con 6 salas y fórmula 4: `chambers-enemies.test.ts`
  («con 6 salas no-spawn y fórmula 4 aplica el suelo antes de repartir»), con
  `formulaTotal` 4, `total` 6, una ficha por sala y aviso con los tres valores.
- Factores a 0 → `R`: `enemyTotalFor` y `computeEnemyBudget` cubiertos.
- Snapshot con `P` real, `R` y ambos totales: `createDebugApi` y `debug.ts`;
  `enemyBudget` es `null` en BSP.
- Carga sin regenerar: test de `buildSaveFiles`/`parseSave` con mapa y enemigos
  idénticos.
- BSP: no cambia su colocación ni sus tests.
- Se adaptó la aserción E2E de 11 a 4-6; es consecuencia de la v5 y no relaja
  ninguna otra comprobación.

# Diff revisado

15 archivos, 539 inserciones: `engine.ts` (cableado), `map.ts` (tipo),
`enemies.ts` (presupuesto único), `debug.ts` (snapshot), tests y evidencia. Sin
cambios fuera de `scope`. El único riesgo es que `enemyBudget` recalcula con las
constantes documentadas; queda anotado para TASK-0175 si el experimento pasa a
configurar factores.

# Qué debe probar el usuario

Nada visual en esta tarea. En el playtest de TASK-0176 debe mirar que una partida
en solitario no arranca con 10-12 enemigos y que el aviso del suelo no aparece
como ruido en el HUD.
