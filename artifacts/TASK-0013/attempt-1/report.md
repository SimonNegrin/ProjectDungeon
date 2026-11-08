---
type: Task Report
title: "TASK-0013: informe de ejecución"
description: Comando MoveTo con plan recalculado, movimiento parcial y acercarse + atacar.
task: TASK-0013
attempt: 1
report_status: success
generated: { by: deepseek/v4.1-flash, at: 2026-11-08T01:41:23Z }
artifacts: artifacts/TASK-0013/attempt-1/
verified:
---

# Estado

`success`.

# Cambios

- Archivos:
  - `src/game/types.ts`: comando serializable `MoveTo` (`unitId`, `target`),
    `CommandType`, y motivos `no-path` / `invalid-target`.
  - `src/game/engine.ts`: `reduceMoveTo` valida fase/unidad, recalcula con
    `planCursorTarget`, recorre `min(coste, MP)` pasos sin gastar acción y, sobre
    un enemigo, ataca al llegar al tile de ataque si queda acción. Atómico: un
    fallo devuelve el estado original y un único `CommandRejected`.
  - `tests/unit/game/move-to.test.ts`: verde, ámbar, rojo, objetivo sobre el
    jugador, sin MP, fase/unidad inválida, los cinco casos de enemigo, muerte,
    determinismo y round-trip JSON.
  - `tests/unit/host/session-move-to.test.ts`: `GameSession.dispatch` con estado
    y eventos serializables, sin mutar la entrada.
- Commit SHA: `4585e30` (`feat(TASK-0013): comando MoveTo con movimiento parcial
  y acercarse+atacar`).

# Tests

| Comando | Timeout | Resultado | Evidencia |
|---|---:|---|---|
| `pnpm run test` | 120 s | 25 archivos, 271 tests, todo verde | `test-output.txt` |
| `pnpm run verify` | 180 s | docs, config, tests y build OK | `verify-output.txt` |

# Evidencia visual

- Rutas: no aplica.
- Qué debe mirar el usuario: no hay cambios de UI; el host queda para TASK-0014.

# Desviaciones

- Se añadieron los motivos `no-path` e `invalid-target` a `RejectionReason` (el
  brief lo permitía). Se documentan en comentarios de `types.ts` y `engine.ts`;
  no se editó `docs/`.
- `blocked-object` se traduce a `invalid-target` porque el estado actual no
  contiene objetos bloqueantes y no convenía añadir otro motivo.

# Problemas conocidos y preguntas abiertas

- Movimiento por suelo con MP 0 y camino no vacío devuelve `no-mp` en lugar de
  un no-op silencioso, para que el HUD pueda avisar (R-016).
- Enemigo adyacente sin acción devuelve `no-action` y no mueve, según R-011.
- El ataque posterior al movimiento usa el `enemy.id` del estado original; el
  enemigo no se mueve durante el comando, así que sigue siendo válido.

# Fricción reutilizable

Ninguna entrada: no se encontró comportamiento de arnés no documentado ni fallo
repetible que generalizar.

# Métricas de handoff

| Métrica | Valor |
|---|---|
| `brief_bytes` | 3751 |
| `report_bytes` | 2878 |
| `overflow` | `none` |
| `criteria_failed` | 0 |
| `cause` | n/a |

# Checklist

- [x] Criterios cubiertos y sin tests debilitados
- [x] Evidencia guardada y enlazada
- [x] Sin salidas completas pegadas en el informe
- [x] Listo para verificación del lead
