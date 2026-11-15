---
type: Task Report
title: "TASK-0133: informe de ejecución"
description: Cadáver de enemigo solo con saqueables, descarte y retirada al vaciar.
task: TASK-0133
attempt: 1
report_status: success
generated: { by: deepseek/v4.1-flash, at: 2026-11-15T12:06:00Z }
artifacts: artifacts/TASK-0133/attempt-1/
verified:
---

# Estado

`success`.

# Cambios

- `src/game/death.ts`: `settleUnitDeath` busca en `players` y luego en
  `enemies`. El camino de jugador no cambia (`settlePlayerDeath`); el de enemigo
  crea cadáver solo con sus instancias `lootable` en orden estable, descarta el
  resto, no crea contenedor sin saqueables y deja al enemigo en `enemies` con
  `hp: 0`, sin objetos y sin `ghost`. Idempotente y sin tocar `rng`.
- `src/game/inventory.ts`: `locateSource` (ruta única de retirada, usada por
  `equipItem`) elimina el cadáver de enemigo vacío; el de jugador, cofres y
  fixtures persisten.
- Tests actualizados en `death.test.ts`: la muerte mágica de un enemigo ahora
  espera cadáver y el test de «enemigo muerto sin cadáver» pasa a cubrir solo
  unidades vivas o desconocidas. La intención se mantiene; los casos nuevos
  están en `engine.test.ts` e `inventory.test.ts`.
- Commit SHA: `d2993d7386a33c78768e62933b67c42ba027889d`.

# Tests

| Comando | Resultado | Evidencia |
|---|---|---|
| `pnpm exec vitest run tests/unit/game/inventory.test.ts tests/unit/game/engine.test.ts` | 63/63 | `test-output.txt` |
| `pnpm exec vitest run tests/unit/game/death.test.ts tests/unit/game/ghost.test.ts tests/unit/host/debug.test.ts` | 60/60 | comprobación adicional |
| `pnpm run verify` | OK: 1530/1530, build y bundle | `verify-output.txt` |

Cubre filtrado, descarte, sin botín, muerte por ataque/réplica/hechizo,
permanencia con 0 PV, casilla compartida, retirada al vaciar, persistencia del
cadáver de jugador, idempotencia y RNG intacto.

# Evidencia visual

- No aplica: el render es TASK-0135. Sin capturas.

# Desviaciones

- Se ejecutaron además `death.test.ts`, `ghost.test.ts` y `debug.test.ts` fuera
  de la tabla de comandos para validar los tests actualizados.

# Problemas conocidos y preguntas abiertas

- Ninguno. No se adelantó TASK-0134/0135/0136 ni se tocó RNG, IA, mapa,
  probabilidad o costes.

# Fricción reutilizable

- Ninguna entrada: no apareció comportamiento no documentado ni contradicción
  entre brief, plantilla y validador.

# Métricas de handoff

| Métrica | Valor |
|---|---|
| `brief_bytes` | 2152 |
| `report_bytes` | 2549 |
| `overflow` | `none` |
| `criteria_failed` | 0 |
