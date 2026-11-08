---
type: Task Report
title: "TASK-0035: informe del intento 1"
description: Onda de alarma radio 8, enfriamiento verificado y daño como despertador.
task: TASK-0035
attempt: 1
report_status: success
generated: { by: deepseek/v4.1-flash, at: 2026-11-08T21:05:00Z }
artifacts: artifacts/TASK-0035/attempt-1/
verified:
---

# Estado

`success`. Onda de alarma, daño como despertador y eventos deterministas; el
enfriamiento de TASK-0034 se verificó con tests, no se reimplementó.

# Cambios

- Archivos: `src/game/{bestiary,types,perception,combat}.ts`; tests `bestiary`,
  `perception`, `combat`, `engine`, `integration`.
- Commits: `6f35014` (motor), `d95cc99` (tests) en `task/TASK-0035`.
- `BESTIARY` añade `alarm: 8` y `alarmRadius`; `AlarmRaised` lleva `unitId` y
  `position`.
- `detectEnemiesAfterStep` calcula los `EnemySpotted` y luego las ondas por
  índice; `raiseAlarm` alerta vivos a ≤8 Chebyshev sin LOS ni cadena, comparte
  `lastKnown` y marca `hasShouted`.
- `resolveAttack` llama a `noteDamage` solo al impactar y sobrevivir a un
  enemigo; si empieza episodio, emite `AlarmRaised` tras `AttackPerformed` y
  aplica la onda. Muerte o fallo no alertan.
- Sin tocar host, `public/`, `experiments/`, `docs/` ni dependencias; sin
  `Math.random`.

# Tests

| Comando | Resultado | Evidencia |
|---|---|---|
| `vitest run perception combat turn integration` | 66 OK | `test-output.txt` |
| `pnpm run verify` | docs/config OK; 528 OK; build OK | `verify-output.txt` |
| `git diff --stat` | 9 archivos, +564/−28 | `diff-stat.txt` |

Nuevos: onda 8/9 con muro, sin cadena, receptor ya alertado sin segunda onda,
dos emisores en orden, `hasShouted`, daño que alerta, golpe letal sin alarma,
fallo que no despierta e integraciones tras visión y daño. El enfriamiento 2+1
y el regreso sin atacar conservan sus tests; solo se actualizaron listas
exactas de eventos y la tabla del bestiario.

# Evidencia visual

No aplica: motor puro, sin UI ni E2E.

# Desviaciones

- `AlarmRaised` se emite al empezar episodio aunque no haya receptores; con
  varios emisores, la onda no pisa el `lastKnown` del que también vio.
- `noteDamage` no se invoca en fallos ni contra jugadores.

# Problemas conocidos y preguntas abiertas

- El host no presenta `AlarmRaised` (usa el `default` de `hud.ts`); llega en
  TASK-0038. IA de alerta con MP y huida siguen en TASK-0037.

# Fricción reutilizable

| Síntoma | Evidencia | Workaround | Por qué es reutilizable | Cambio propuesto | Coste/riesgo | Disposición |
|---|---|---|---|---|---|---|
| `docs:check` avisa desde 2,5 KB aunque el tope sea 4 KB, con avisos históricos acumulados | `verify-output.txt` | Ninguno | Se repite cada tarea | Unificar umbrales | Bajo | `deferred` |

Disposición del lead: `deferred` a `requirements-writer` por ser fricción
documental/de arnés (`docs/harness/**` fuera del alcance del lead). No bloquea
TASK-0035.

# Métricas de handoff

| Métrica | Valor |
|---|---|
| `brief_bytes` | 2732 |
| `report_bytes` | 3062 |
| `overflow` | `none` |
| `criteria_failed` | 0 |
