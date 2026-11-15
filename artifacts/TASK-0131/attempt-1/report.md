---
type: Task Report
title: "TASK-0131: informe de ejecución"
description: Muerte de jugador, cadáver contenedor y unidad muerta estable.
task: TASK-0131
attempt: 1
report_status: success
generated: { by: deepseek/v4.1-flash, at: 2026-11-15T11:43:00Z }
artifacts: artifacts/TASK-0131/attempt-1/
verified:
---

# Estado

`success`. La muerte de un jugador crea su cadáver contenedor con todo el equipo
y la mochila; la unidad queda con `hp: 0`, identidad y posición, sin objetos.

# Cambios

- `src/game/death.ts` nuevo: `corpseId` y `settleUnitDeath(state, unitId)`,
  puro e idempotente. Solo actúa sobre jugadores con `hp === 0`; un enemigo, una
  unidad viva o un id desconocido devuelven el estado tal cual. Transfiere en
  orden `EQUIPMENT_SLOTS` y luego mochila, compacto, con `capacity` igual al
  número de instancias. No lee ni avanza `state.rng`.
- `src/game/inventory.ts`: `Container.kind?: 'chest' | 'corpse'` y
  `corpseOf?: string`, aditivos; cofres y fixtures sin `kind` siguen válidos.
  Docblock con el riesgo de que REQ-020 revise el modelo antes de la v1 de
  guardado.
- `src/game/combat.ts`: `settleUnitDeath` en la muerte del objetivo y en la
  muerte del atacante por réplica, tras `UnitDied`. `src/game/magic.ts`: misma
  llamada en la rama de daño mágico. Sin eventos ni orden nuevos.
- `src/game/index.ts`: exporta `death`.
- `src/host/debug.ts`: `cloneContainer` copia `kind` y `corpseOf`; no hay modelo
  paralelo.
- Tests: `tests/unit/game/death.test.ts` (10) y un caso en
  `tests/unit/host/debug.test.ts`. Ningún test existente se borró, saltó o
  debilitó; no hizo falta ampliarlos.
- Commits: `4329e58` (motor), `42b5e46` (tests); ver `commit.txt`.

# Tests

| Comando | Resultado | Evidencia |
|---|---|---|
| `pnpm exec vitest run tests/unit/game tests/unit/host` | 76 archivos, 1172 OK | `test-output.txt` |
| `pnpm run verify` | OK: 101 archivos, 1502 tests, `tsc`, build y bundle | `verify-output.txt` |

Cubre transferencia sin pérdida ni duplicados, identidad y `hp: 0`, casilla
compartida y movimiento, persistencia al vaciar y al nacer vacío, serialización
JSON del estado y del snapshot, idempotencia y RNG intacto.

# Evidencia visual

- No aplica: sin cambios de render, panel ni HUD. El render del cadáver es
  TASK-0135; no se ejecutó `test:e2e`.

# Desviaciones

- `debug.ts`: además del test, hubo que copiar `kind` y `corpseOf` en
  `cloneContainer`; el clon explícito no incluía campos opcionales nuevos y sin
  esto el snapshot no exponía el cadáver. Son dos líneas, sin duplicar modelo.
- `docs/tasks/TASK-0131-...md` ya estaba modificado por el lead (`in_progress`);
  no lo toqué ni lo incluí en commits.

# Problemas conocidos y preguntas abiertas

- La resurrección actual (`magic.castSpell`) revive una unidad ya asentada sin
  devolverle objetos y deja el cadáver: lo cierra TASK-0148.
- Fantasma/turno del muerto: TASK-0132. Cadáver de enemigo, filtro `lootable` y
  descarte: TASK-0133. Saqueo/panel/guardado: tareas posteriores.

# Fricción reutilizable

Ninguna entrada: no apareció comportamiento de arnés no documentado ni fallo
repetible que generalizar.

# Métricas de handoff

| Métrica | Valor |
|---|---|
| `brief_bytes` | 2472 |
| `report_bytes` | 3502 |
| `overflow` | `none` |
| `criteria_failed` | 0 |

# Checklist

- [x] Criterios cubiertos y sin tests debilitados
- [x] Evidencia guardada y enlazada
- [x] Sin salidas completas pegadas en el informe
- [x] Listo para verificación del lead
