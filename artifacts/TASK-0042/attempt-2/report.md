---
type: Task Report
title: "TASK-0042: informe del intento 2"
description: Corrige la componente global de enemigos y hotspotRolls con regresión y barrido de 200 semillas.
task: TASK-0042
attempt: 2
report_status: success
generated: { by: deepseek/v4.1-flash, at: 2026-11-09T13:25:00Z }
artifacts: artifacts/TASK-0042/attempt-2/
verified:
---

# Estado

`success`. El fallo de componente global y la métrica de tiradas están corregidos;
el lead debe repetir la verificación independiente.

# Cambios

- `spawn.ts`: las fichas ya colocadas se pasan a `selectCandidates` y
  `placeRoomEnemies` para validar la componente **global** de 8 direcciones. La
  preferencia por interior también respeta esa restricción. Post-pase determinista
  de reubicación por sala si el pase secuencial se queda corto; no se redujo el
  cupo en el barrido. `hotspotRolls` pasa a `hotspots.length`.
- `generate.ts`: `buildStats.hotspotRolls` pasa a `hotspots.length`. Aviso no
  fatal de cajas a gap 0 (decisión abajo).
- Tests: regresión `bsp/104` y `bsp/371`, aserción de `hotspotRolls ===
  hotspotsTotal` (con un mapa donde `eligible < total`) y barrido A/B/C × 200 con
  `validateMap` vacío, componente ≤2, mínimo 1 por sala no-spawn y tiradas. 620
  tests; no se debilitó ninguno.
- Commits: `aa6c51a` (código y tests), `1803f79` (evidencia). SHA final en el
  resumen.

# Tests

| Comando | Resultado | Evidencia |
|---|---|---|
| `pnpm run docs:check` | 0 (31 avisos previos) | `docs-check-output.txt` |
| `pnpm run test` | 0 · 44 archivos · 620 tests | `test-output.txt` |
| `pnpm run build` | 0 | `build-output.txt` |
| `pnpm run verify` | 0 | `verify-output.txt` |

Antes del fix se reprodujo `maxComponentSize(enemies) = 3` y «hay una componente
de enemigos mayor que 2» en 104 y 371 (diagnóstico en el brief). Barrido extra de
3000 mapas en `logs/sweep-1000.txt`: 0 incidencias, componente máxima 2, 0 salas
vacías y `T` completo.

# Evidencia visual

- 128 capturas 1280×720 en `screenshots/`: A/B/C × 8 semillas
  (`2,5,8,17,23,40,56,279837264`), normal/debug/mapa/13×13, caverna, pasillo
  ancho, features de spawn/hotspots/emboscados/entrada-salida, 4 `exitMode` y las
  regresiones 104/371.
- `capture-log.txt` sin errores; `decision-example.json` con semilla 1: en growth
  `hotspotsTotal=6`, `hotspotsEligible=5`, `hotspotRolls=6`.
- Mirar `regression-bsp-seed-104-debug-zoom.png`,
  `regression-bsp-seed-371-debug-zoom.png`, `bsp-seed-2-debug-zoom.png`,
  `cavern-growth-seed-5-debug-zoom.png`, `wide-bsp-seed-17-debug-zoom.png` y
  `growth-seed-11-exitMode-stairs-down.png`.

# Desviaciones

- **Cajas a gap 0:** 33/200 mapas BSP tienen cajas de sala que se tocan sin muro.
  No se cambió la generación ni la aceptación; se añadió un aviso no fatal en
  `map.warnings` y la componente global ≤2 ya evita el cruce de fichas.
- **Salida a distancia 1:** 2/200 mapas de plantillas; llevan el aviso «No hay una
  sala no-spawn a distancia ≥2» y `validateMap` no las marca. Sin cambio.
- **`experiment.md`:** no editado; texto con cifras nuevas en
  `experiment-observations.md` para que lo aplique el lead.
- **Escaleras:** se conserva el recorte local `STAIR_RECTS` del intento 1 porque
  `src/host/assets.ts` no expone el tileset de escaleras y no se toca `src/`.

# Problemas conocidos y preguntas abiertas

- El playtest debe elegir variante y representación de salida; no se cierra aquí.
- Con `hiddenEnemyChance` 1 no siempre se ocupan todos los elegibles si la
  componente ≤2 agrupa fichas; es el límite del requisito.
- El aviso de gap 0 añade ruido informativo en BSP (16,5 %); no bloquea.

# Fricción reutilizable

Sin entradas nuevas: no se detectó un disparador que no cubran ya los avisos
existentes.

# Métricas de handoff

| Métrica | Valor |
|---|---|
| `brief_bytes` | 4060 |
| `report_bytes` | 3917 |
| `overflow` | `none` |
| `criteria_failed` | 0 |
