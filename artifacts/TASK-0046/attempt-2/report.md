---
type: Task Report
title: "TASK-0046: informe del intento 2"
description: Restaura las dos armas del mapa growth por defecto sin cambiar BSP.
task: TASK-0046
attempt: 2
report_status: success
generated: { by: deepseek/v4.1-flash, at: 2026-11-09T17:12:00Z }
artifacts: artifacts/TASK-0046/attempt-2/
verified:
---

# Estado

`success`. El mapa growth y `createInitialState()` vuelven a exponer exactamente
el hacha y la daga, fuera de spawn, puertas, salida y enemigos.

# Cambios

- `src/game/map.ts`: `placeMapWeapons` acepta `blockedCells` opcional; el PRNG
  no cambia y BSP sigue igual. `eligibleWeaponCells` respeta la máscara real de
  salas irregulares.
- `src/game/chambers/variants/growth.ts`: `mapFor` añade `weapons` usando la
  colocación compartida y bloquea `exit.position`, `exit.access` y cada enemigo.
  `validateGrowthMap` comprueba las 2 armas, sala propia no-spawn, suelo
  alcanzable y exclusiones.
- Tests: `growth-generator.test.ts` cubre default, `PickUp`, determinismo,
  serialización, exclusiones y validador positivo/negativo. `map.test.ts` cubre
  `blockedCells` y la conservación exacta de armas BSP.
- Commits: `7abe223` (código), `ed176cf` (tests). SHA final: commit de evidencia
  posterior a este informe.

# Tests

| Comando | Resultado | Evidencia |
|---|---|---|
| `pnpm run test` | 53 archivos, 711 tests | `test-output.txt` |
| `pnpm run verify` | 53 archivos, 711 tests; build 532 ms | `verify-output.txt` |
| Growth/BSP/REQ-009/REQ-010 dirigido | 17 archivos, 247 tests | `directed-regression.txt` |
| Armas host (equipment, hud, debug, renderer) | 4 archivos, 68 tests | `weapon-regression.txt` |
| Rendimiento growth 22×18, semilla 2738263054 | media 1,93 ms | `growth-perf.txt` |

Cubre: default con 2 armas; `PickUp` del arma en la celda del jugador; misma
semilla ⇒ mismas armas; round-trip JSON; sin solape con spawn, puertas, salida
ni enemigos; barrido 200/200 con validador limpio; BSP inyectado con 4 enemigos y
armas intactas.

# Evidencia visual

- No aplica UI/E2E: sin cambios en host, render ni `index.html`.
- Rutas: las de la tabla y `git-diff-stat.txt`.

# Desviaciones

- `eligibleWeaponCells` ahora exige pertenencia a la máscara de sala cuando
  existe. En BSP las salas son rectangulares, así que su colocación no cambia;
  era necesario para no colocar armas en cajas de caverna con suelo de pasillo.
- No se ejecutó `pnpm run test:e2e`; sigue siendo alcance de `TASK-0049`.

# Problemas conocidos y preguntas abiertas

- La colocación compartida corta si no encuentra salas candidatas; el barrido y
  el validador lo detectarían como armas faltantes. No hay decisión creativa
  pendiente.
- `validateGeneratedMap` sigue siendo BSP-específico; growth usa
  `validateGrowthMap`, ahora con contrato de armas.

# Fricción reutilizable

| Síntoma | Evidencia | Workaround | Por qué es reutilizable | Cambio propuesto | Coste/riesgo | Disposición |
|---|---|---|---|---|---|---|
| Los tests de armas inyectaban BSP y ocultaron que el default growth perdió las 2 armas | Intento 1: `createInitialState()` sin `weapons`; tests de armas con `BspMapGenerator` | Test explícito de `createInitialState()` sin generador | Cualquier cambio de generador por defecto puede quedar sin cobertura si los tests inyectan el anterior | Regla de verificación: todo default debe tener al menos un test que no inyecte generador | Bajo | `pending` |

# Métricas de handoff

| Métrica | Valor |
|---|---|
| `brief_bytes` | 2380 |
| `report_bytes` | 3573 |
| `overflow` | `none` |
| `criteria_failed` | 0 |
