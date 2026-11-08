---
type: Task Report
title: "TASK-0015: informe de ejecución"
description: "E2E integral de REQ-004 con teclado real, comandos Move/EndTurn, semilla 279837264 y capturas."
task: TASK-0015
attempt: 1
report_status: success
generated: { by: deepseek/v4.1-flash, at: 2026-11-08T02:12:07Z }
artifacts: artifacts/TASK-0015/attempt-1/
verified:
---

# Estado

`success`.

# Cambios

- Nuevo `tests/e2e/cursor-qa.spec.ts`: 10 tests independientes con
  `?seed=279837264`, teclado real y comandos `Move`/`EndTurn`. Cubren arranque y
  teclado, borde del viewport, estados/patrones, caminos verde/ámbar, Moverse
  verde/ámbar/rojo, los cinco casos sobre enemigo, `F`, ciclo de vida, HUD,
  snapshot, debug y partida terminada. No se tocaron specs existentes.
- `tests/e2e/support.ts`: helpers aditivos `visibleRange`,
  `moveAwayFromEnemy`, `ensureAdjacentWithMp` y `retreatEnemyOutOfReach`; no se
  duplica `planCursorTarget` y no se teletransporta ni inyecta estado.
- `artifacts/TASK-0015/attempt-1/brief.md`: se citó `description` para que el
  YAML sea válido (ver fricción). Sin cambio semántico.
- Commits: `79864c0` (brief) y **`686c646`** (tests, helpers y evidencia).
- Sin cambios en `src/game/**`, `src/host/**`, requisitos, criterios ni docs.

# Tests

| Comando | Timeout | Resultado | Evidencia |
|---|---:|---|---|
| `pnpm run test:e2e` | 300 s | 29/29 OK (10 nuevos) | `e2e-output.txt` |
| `pnpm run test:e2e --repeat-each=3` | 300 s | 87/87 OK (3×29) | `repeat-output.txt` |
| `pnpm run test:e2e -- --repeat-each=3` | 300 s | 29/29 OK; **sin repetir** | `repeat-output-literal.txt` |
| `pnpm run verify` | 180 s | docs 84/15/2, config 3/9, 305 unitarios, build 47 módulos | `verify-output.txt` |
| `pnpm run build` | 120 s | `tsc --noEmit` + Vite OK | `build-output.txt` |

# Evidencia visual

- `screenshots/cursor-player.png`: cursor blanco de un tile sobre el jugador.
- `screenshots/cursor-path-green.png`: destino verde, camino completo fuerte.
- `screenshots/cursor-path-amber.png`: borde discontinuo, tramo fuerte hasta MP
  y tramo atenuado después.
- `screenshots/cursor-enemy.png` y `cursor-enemy-path.png`: marca de objetivo y
  camino terminado en el tile de ataque, nunca en el enemigo.
- `screenshots/cursor-move-partial.png`: avance parcial con MP 0 y cursor en el
  enemigo; `cursor-attack.png`: `F`, flash y daño.
- `screenshots/debug.png`: F1 muestra `Cursor: (7, 8) alcanzable · camino 1`.
- Qué mirar: patrón por estado, dos tonos del camino, marca de objetivo, ausencia
  de doble marco y avisos del HUD.

# Desviaciones

- La fase enemiga es síncrona (el motor vuelve a `player` tras `E`); la
  ocultación en fase `enemy` se cubre con el unitario existente
  `tests/unit/host/cursor.test.ts`, como permite el brief. No se inventó pausa.
- El comando literal con `--` no aplicó `--repeat-each`; la estabilidad real se
  validó con `pnpm run test:e2e --repeat-each=3` (ver fricción).

# Problemas conocidos y preguntas abiertas

- La suite E2E reescribe capturas/artefactos históricos de `EXP-000`,
  `TASK-0007`, `TASK-0010`, `TASK-0011` y `TASK-0014`; se revirtieron con
  `git checkout --`. Solo quedan artefactos de TASK-0015.
- `retreatEnemyOutOfReach` depende de suelo libre alrededor del enemigo; con la
  semilla de referencia es estable 3/3, pero podría necesitar otro escenario si
  cambia la IA o el mapa.

# Fricción reutilizable

| Síntoma | Evidencia | Workaround aplicado | Por qué es reutilizable | Cambio propuesto | Coste/riesgo | Disposición |
|---|---|---|---|---|---|---|
| `pnpm run test:e2e -- --repeat-each=3` ejecuta 29 tests, no 87: el segundo `--` llega a Playwright y anula la repetición. | `repeat-output-literal.txt` (`Running 29 tests`) frente a `repeat-output.txt` (`Running 87 tests`). | Ejecutar `pnpm run test:e2e --repeat-each=3` para la evidencia real. | El brief y la tarea ordenan la forma literal; un agente puede creer que repitió 3× sin haberlo hecho. | En briefs/documentación, usar `pnpm run test:e2e --repeat-each=3` (sin `--`) o añadir el flag al script. | Bajo; solo cambia el comando documentado. | `pending` |
| Un brief del lead con `description` sin comillas y dos puntos rompe `docs:check` y bloquea `verify` antes de ejecutar tests. | `brief-yaml-error.txt` y `brief-yaml-fix.diff`; commit `79864c0`. | Citar el valor de `description` en el brief. | Cualquier brief con dos puntos en `description` falla en el validador; el generador debería citar todos los escalares. | Que el generador de briefs emita `description` entre comillas (o cite valores con `:`), y añadir esa comprobación al esquema. | Bajo; no altera contenido ni criterios. | `pending` |

# Métricas de handoff

| Métrica | Valor |
|---|---|
| `brief_bytes` | 4502 |
| `report_bytes` | 5035 |
| `overflow` | `none` |
| `criteria_failed` | 0 |
| `cause` | — |

# Checklist

- [x] Criterios cubiertos y sin tests debilitados
- [x] Evidencia guardada y enlazada
- [x] Sin salidas completas pegadas en el informe
- [x] Listo para verificación del lead
