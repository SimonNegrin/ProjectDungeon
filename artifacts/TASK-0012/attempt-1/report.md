---
type: Task Report
title: "TASK-0012: informe de ejecución del intento 1"
description: Planificador puro de camino y clasificación de destino, con tests unitarios.
task: TASK-0012
attempt: 1
report_status: success
generated: { by: deepseek/v4.1-flash, at: 2026-11-08T01:36:30Z }
artifacts: artifacts/TASK-0012/attempt-1/
verified:
---

# Estado

`success`.

# Cambios

- Archivos:
  - `src/game/path.ts` (nuevo): `planCursorTarget(state, unitId, target, options?)`
    devuelve `kind` (`player`/`floor`/`enemy`/`blocked`), `path`, `cost`,
    `withinMp`, `attackTile?` y `blockedReason?`. BFS determinista con
    `DIRECTIONS`, coste `MOVE_COST`, sin corte de esquina y sin mutar el estado.
  - `src/game/movement.ts`: `cellBlockReason` y `BlockingOptions` compartidos por
    `validateMove` y la planificación; hook opcional `isBlockingObject`. El
    comportamiento de `validateMove` sin hook no cambia.
  - `src/game/index.ts`: exporta `./path`.
  - `tests/unit/game/path.test.ts` (nuevo): 16 tests de criterios.
- Commit SHA:
  - `978254f` — `feat(TASK-0012): planificador puro de camino y destino`
  - `0291e97` — `test(TASK-0012): cubrir planificación de camino y destino`

# Tests

| Comando | Timeout | Resultado | Evidencia |
|---|---:|---|---|
| `pnpm run test` | 120 s | 23 archivos / 254 tests OK | `test-output.txt` |
| `pnpm run verify` | 180 s | OK (docs, config, tests, typecheck y build) | `verify-output.txt` |

Cobertura nueva: diagonal, corte de esquina, muro, fuera del mapa, aliado,
objeto bloqueante (destino y rodeo), sin camino, jugador, enemigo adyacente,
enemigo alcanzable, enemigo demasiado lejano, enemigo sin tile de ataque,
desempate por `DIRECTIONS`, determinismo y no mutación.

# Evidencia visual

- No aplica: la tarea no toca UI. Sin capturas.

# Desviaciones

- Ninguna de alcance. El corte de esquina sintético exige 6 pasos, no 4 como
  estimé al escribir el test; el test se corrigió para reflejar la geometría
  real (muros en `(6,5)` y `(5,6)`), no para debilitar la comprobación.

# Problemas conocidos y preguntas abiertas

- No hay objetos bloqueantes en `GameState`: el hook `isBlockingObject` es
  opcional y solo lo usan los tests. Cuando existan, `validateMove`/`Move`
  deberán pasarlo y `RejectionReason` necesitará un motivo propio; hoy
  `validateMove` lo mapea a `occupied` y el plan usa `blocked-object`.
- `withinMp` con `kind: 'player'` es `true` por coste 0; el host debe clasificar
  el blanco neutro por `kind`, no por `withinMp`.

# Fricción reutilizable

Sin entradas: no se detectó comportamiento no documentado ni fallo repetible del
arnés.

| Síntoma | Evidencia | Workaround aplicado | Por qué es reutilizable | Cambio propuesto | Coste/riesgo | Disposición |
|---|---|---|---|---|---|---|
| — | — | — | — | — | — | — |

# Métricas de handoff

| Métrica | Valor |
|---|---|
| `brief_bytes` | 3125 |
| `report_bytes` | 3191 |
| `overflow` | `none` |
| `criteria_failed` | 0 |
| `cause` | — |

# Checklist

- [x] Criterios cubiertos y sin tests debilitados
- [x] Evidencia guardada y enlazada
- [x] Sin salidas completas pegadas en el informe
- [x] Listo para verificación del lead
