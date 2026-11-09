---
type: Task Report
title: "TASK-0045: informe del intento 2"
description: Corrige el cómputo de accesos del spawn y refuerza protección, visión y ancla BSP.
task: TASK-0045
attempt: 2
report_status: success
generated: { by: deepseek/v4.1-flash, at: 2026-11-09T16:36:00Z }
artifacts: artifacts/TASK-0045/attempt-2/
verified:
---

# Estado

`success`. El spawn cuenta puertas + 2 por pasillo ancho, desempata por
superficie libre sin puertas y el ancla BSP evita la visión al spawn.

# Cambios

- `src/game/chambers/core/spawn.ts`: `accessesFor` ignora bocas estrechas
  (`reason !== 'pasillo-ancho'`) y suma 2 por `corridorId` ancho; el desempate y
  el fallback usan celdas de sala sin puertas.
- `src/game/bsp.ts`: `enemyAnchor` busca globalmente la celda no-spawn más
  lejana sin LOS, fuera de puertas, armas (calculadas de forma provisional y
  determinista) y huecos; si no existe, usa la más lejana y avisa.
- Tests: helper de accesos derivado de `corridors`; regresión de pasillo
  estrecho con puerta y boca; LOS para todos los enemigos, incluidos `hidden`;
  barrido con `T` 10-12, `enemies.length <= total` y LOS salvo aviso; ancla sin
  LOS en 25 semillas.
- Commit SHA: `7123fb9`.

# Tests

| Comando | Resultado | Evidencia |
|---|---|---|
| `pnpm run verify` | pasa: 52 archivos, 689 tests, build 531 ms | `verify-output.txt` |
| `pnpm run test` | pasa: 52 archivos, 689 tests | `test-output.txt` |
| Barrido 200 semillas | 200/200, `T` 11-12, protección y reservas | `seed-sweep.txt` |
| Regresión BSP/REQ-009 | 5 archivos, 77 tests | `bsp-regression.txt` |
| Chequeo de accesos (temporal) | `failures=0`; el cómputo antiguo difiere en 157 semillas | `access-check.txt` |

# Evidencia visual

- Rutas: `seed-sweep.txt` (200 líneas `seed ... total=...`) y
  `bsp-regression.txt` (25 semillas con spawn, 4 enemigos y ancla).
- Qué mirar: `spawn` con el mínimo de accesos en cada semilla y `total` 11-12.

# Desviaciones

- No se ejecutó `test:e2e`: QA/E2E es TASK-0049 y el spec aún fija el spawn
  antiguo (misma desviación que el intento 1).
- La incompatibilidad conocida de `validateGeneratedMap` con planes densos
  sigue diferida a TASK-0046; no se relajó BSP ni sus tests.
- El ancla BSP calcula las armas antes de tiempo para poder excluirlas; el
  cálculo es puro y produce el mismo resultado que la colocación final.

# Problemas conocidos y preguntas abiertas

- Persisten 3/200 semillas con salida a distancia 1 y aviso (R-007), ya
  reportado en el intento 1.
- Sin decisiones creativas nuevas ni preguntas abiertas.

# Fricción reutilizable

Ninguna. El fallo era de esta tarea (test que copiaba la implementación), no del
arnés.

# Métricas de handoff

| Métrica | Valor |
|---|---|
| `brief_bytes` | 3390 |
| `report_bytes` | 2839 |
| `overflow` | `none` |
| `criteria_failed` | 0 |
