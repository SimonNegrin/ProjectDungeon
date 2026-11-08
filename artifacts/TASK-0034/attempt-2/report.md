---
type: Task Report
title: "TASK-0034: informe del intento 2"
description: Cierre de los huecos de detección por paso y daño; regreso real cubierto.
task: TASK-0034
attempt: 2
report_status: success
generated: { by: deepseek/v4.1-flash, at: 2026-11-08T20:56:00Z }
artifacts: artifacts/TASK-0034/attempt-2/
verified:
---

# Estado

`success`. `EnemySpotted` lleva la posición del paso, `noteDamage` cubre la
transición pura de daño y el regreso real está probado en integración. No se
rehizo nada del intento 1 ni se tocó `src/host/`.

# Cambios

- Archivos: `src/game/types.ts`, `src/game/perception.ts`,
  `tests/unit/game/perception.test.ts`, `tests/unit/game/integration.test.ts`.
- Commit SHA: `8fc687965bafac803d259d68b0c32f6a78d2391b`.
- `EnemySpotted` añade `step: Position` con la posición del jugador tras el paso;
  se emite después de su `UnitMoved`.
- `noteDamage(state, enemyId, attackerPosition)`: puro; si el enemigo vive pasa o
  permanece en `alert`, fija `lastKnown` al atacante y `alertTurns: 0`. En un
  episodio nuevo deja `hasShouted: false` para que TASK-0035 decida la onda; en
  alerta conserva el valor. Muerto o inexistente devuelve el mismo estado.

# Tests

| Comando | Resultado | Evidencia |
|---|---|---|
| `pnpm exec vitest run` (6 archivos indicados) | 69 tests OK | `test-output.txt` |
| `pnpm run verify` | docs/config OK; 517 tests OK; build OK; 10 avisos de tamaño (brief 2868 B) | `verify-output.txt` |

Tests nuevos: 4 unitarios de `noteDamage` (dormido, alerta, regreso, muerto/
inexistente) y 1 de integración con 3 `EndTurn`: el enemigo en regreso avanza
hacia `home` (distancias 2→1→0), no ataca, emite `EnemyReturned` y queda
`dormant` con `lastKnown: null`. Las tres aserciones que comparaban
`EnemySpotted` se actualizaron solo para incluir `step`.

# Evidencia visual

No aplica: motor puro, sin UI, Canvas ni E2E.

# Desviaciones

- `noteDamage` reinicia `hasShouted` solo al empezar episodio (dormido/regreso);
  el brief no lo detalla y se eligió para dejar lista la alarma de TASK-0035.
- El daño no se integra en `combat.ts` ni lanza alarma, como pide el brief.
- `step` se toma del jugador detectado tras el paso; con un solo jugador coincide
  con el que se movió. No se cambió la firma de `detectEnemiesAfterStep`.

# Problemas conocidos y preguntas abiertas

- `noteDamage` aún no se invoca desde combate: TASK-0035 debe llamarlo tras un
  golpe a un enemigo que sobrevive y decidir la onda.
- `docs:check` avisa del brief de este intento (2868 B > objetivo 2560 B); es
  aviso, no fallo.

# Fricción reutilizable

| Síntoma | Evidencia | Workaround | Por qué es reutilizable | Cambio propuesto | Coste/riesgo | Disposición |
|---|---|---|---|---|---|---|
| Añadir variantes a `GameEvent` rompe el switch exhaustivo de `src/host/hud.ts` aunque las tareas de motor prohíben tocar `src/host/` | Intento 1: `src/host/hud.ts(149,40): error TS2366`; TASK-0035 y TASK-0037 añadirán eventos | `default` de 3 líneas ya aceptado | Se repetirá en las tareas siguientes de eventos | Helper tolerante de etiquetas o permitir 1 línea de host en tareas de motor | Bajo: solo debug | `pending` |

# Métricas de handoff

| Métrica | Valor |
|---|---|
| `brief_bytes` | 2868 |
| `report_bytes` | 3330 |
| `overflow` | `none` |
| `criteria_failed` | 0 |
