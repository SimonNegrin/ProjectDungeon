---
type: Task Report
title: "TASK-0169: informe de ejecución"
description: Apertura de cofre con 1 acción y adyacencia, depósito atómico solo en cofres y persistencia del estado de apertura.
task: TASK-0169
attempt: 1
report_status: success
generated: { by: deepseek/v4.1-flash, at: 2026-11-16T17:20:00Z }
artifacts: artifacts/TASK-0169/attempt-1/
verified:
---

# Estado

`success`. El motor abre cofres con coste, adyacencia y rechazo atómico; transfiere
gratis al vivo y conserva cofres abiertos y vacíos en guardado y snapshot.

# Cambios

- `src/game/types.ts`: comandos `OpenContainer` y `DepositItem`; motivos
  `not-adjacent`, `container-closed`, `container-full` y `wrong-container`.
- `src/game/inventory.ts`: `openContainer` (1 acción, Chebyshev 1, reabrir gratis,
  fantasma rechazado); `depositItem` (atómico, solo cofre abierto y adyacente);
  `takeContainerItem`/`takeAllContainerItems` aceptan cofre con las mismas reglas
  y conservan el cadáver.
- `src/game/engine.ts`: reducers de ambos comandos; el fantasma mueve un objeto
  por acción y no tiene «coger todo».
- Tests: `containers.test.ts` (nuevo, 19 casos), `inventory.test.ts` (cofre
  cerrado), `turn.test.ts` (acción), `save-schema.test.ts` (round-trip) y
  `host/debug.test.ts` (snapshot abierto).
- Sin cambios en `save.ts`: `opened` ya se serializaba desde TASK-0168.
- Commit SHA: `daa36231b0016f9c502507de8e8a3949c559f25b`.

# Tests

| Comando | Resultado | Evidencia |
|---|---|---|
| `pnpm run verify` | OK: 116 archivos, 1878 tests, docs, tsc, build y bundle | `verify-output.txt` |
| vitest de 6 archivos (containers, inventory, turn, save-schema, ghost, debug) | OK: 209 tests | `containers-tests.txt` |

E2E no aplica: fuera de alcance (UI y teclas en TASK-0170).

# Evidencia visual

- Rutas: ninguna; motor, snapshot y guardado sin UI.

# Desviaciones

- `takeContainerItem` ya no rechaza todo cofre con `unknown-container`: cerrado
  da `container-closed` y abierto y adyacente se saquea. Se actualizó ese aserto;
  el cadáver conserva mismo tile y retirada al vaciarse.
- Los cofres sin `kind` (fixtures de REQ-018) siguen admitiendo equipar, como
  antes, pero no saqueo ni depósito.

# Problemas conocidos y preguntas abiertas

- Un cofre no bloquea el paso: si una unidad queda sobre su casilla no puede
  abrirlo (Chebyshev 1 estricto). Es la lectura literal de R-003; decidir en
  playtest si debe admitirse el mismo tile.
- `OpenContainer`/`DepositItem` no emiten `GameEvent`; TASK-0170 puede derivar el
  feedback del cambio de estado o añadir su evento.

# Fricción reutilizable

Sin entradas: no hay un disparador nuevo.

# Métricas de handoff

| Métrica | Valor |
|---|---|
| `brief_bytes` | 0 (primer intento, sin brief) |
| `report_bytes` | 2823 |
| `overflow` | `none` |
| `criteria_failed` | 0 |
