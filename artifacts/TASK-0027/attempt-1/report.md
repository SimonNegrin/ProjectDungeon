---
type: Task Report
title: "TASK-0027: informe del intento 1"
description: Armas de mapa deterministas, recogida con G por 1 MP y cambio gratis con 1-3.
task: TASK-0027
attempt: 1
report_status: success
generated: { by: deepseek/v4.1-flash, at: 2026-11-08T18:30:00Z }
artifacts: artifacts/TASK-0027/attempt-1/
verified:
---

# Estado

`success`.

# Cambios

- Archivos: `src/game/types.ts`, `src/game/map.ts`, `src/game/bsp.ts`,
  `src/game/engine.ts`, `src/host/input.ts` y tests de `map`, `engine` e `input`.
- `GeneratedMap.weapons` guarda hacha y daga con ID, posición y arma; el BSP las
  coloca tras generar con un `mulberry32` propio (sal fija), en salas distintas,
  fuera de la sala inicial, alcanzables y sin muro, puerta ni aparición.
- Comandos `PickUp` y `SelectWeapon`: `G` cuesta 1 MP, conserva la acción,
  auto-equipa, borra el arma y no duplica; `1`-`3` cambia gratis entre tres
  huecos y rechaza huecos vacíos o fuera de rango. Entrada y estado inmutables.
- Commit SHA: `d4ea408f7a822027de854a62898c87025edb0cd1`.

# Tests

| Comando | Resultado | Evidencia |
|---|---|---|
| `pnpm exec vitest run tests/unit/game/map.test.ts tests/unit/game/engine.test.ts tests/unit/host/input.test.ts` | 3 archivos, 88 tests OK | `test-output.txt` |
| `pnpm test` | 31 archivos, 460 tests OK | `test-output.txt` |
| `pnpm run verify` | OK (docs, config, test y build) | `verify-output.txt` |
| `pnpm run test:e2e` | 55 tests OK | `e2e-output.txt` |

Los E2E conservan spawns `(6,8)`/`(23,28)` y la secuencia de combate de la
semilla `279837264`; la colocación no altera el RNG del generador ni el de
combate. Los tests nuevos cubren determinismo, exclusiones, `G` con y sin MP,
acción intacta, auto-equipo, borrado, no duplicados, tres huecos, cambio
gratuito, ataque con el arma recién equipada y dos ejecuciones con la misma
semilla.

# Evidencia visual

- No aplica: HUD, dibujo y feedback pertenecen a `TASK-0029`.

# Desviaciones

- Ninguna de alcance. No se tocaron `docs/`, dependencias, HUD, renderer, debug
  ni snapshot.

# Problemas conocidos y preguntas abiertas

- `PickUp` y `SelectWeapon` no emiten `GameEvent` en éxito: añadir variantes
  obligaría a tocar `hud.eventLabel` (exhaustivo y fuera de alcance). El estado
  refleja el resultado; `TASK-0029` puede añadir los eventos junto al feedback.

# Fricción reutilizable

| Síntoma | Evidencia | Workaround | Por qué es reutilizable | Cambio propuesto | Coste/riesgo | Disposición |
|---|---|---|---|---|---|---|
| `pnpm run verify` avisa de briefs por encima del objetivo de 2560 B aunque el tope duro es 4096 B | `docs:check`: TASK-0027 brief 2968 B y report 3079 B; también TASK-0022 (3937 B) y TASK-0025 (3071 B) | Ninguno: el aviso no bloquea | El aviso distingue objetivo y tope, como documenta el workflow | Ninguno | Bajo; solo afecta al validador de docs | `rejected` |

# Métricas de handoff

| Métrica | Valor |
|---|---|
| `brief_bytes` | 2968 |
| `report_bytes` | 3079 |
| `overflow` | `none` |
| `criteria_failed` | 0 |
