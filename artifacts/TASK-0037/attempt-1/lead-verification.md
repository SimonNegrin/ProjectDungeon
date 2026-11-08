---
type: Task Verification
title: "TASK-0037: verificación independiente del lead"
description: Revisión del diff, re-ejecución de tests/verify/E2E y criterios de R-005, R-007 y R-009.
status: stable
generated: { by: deepseek/v4.1-flash, at: 2026-11-08T22:15:00Z }
---

# Resultado

Aprobado. Intento 1 verificado en `task/TASK-0037`: implementación `9933e60`,
artefactos `d25d67e`. Sin cambios fuera de `src/game/`, `tests/` y artefactos.

# Comandos re-ejecutados por el lead

| Comando | Resultado | Evidencia |
|---|---|---|
| `pnpm exec vitest run tests/unit/game/{ai,turn,combat,integration,perception}.test.ts` | 85 tests OK | `lead-tests.txt` |
| `pnpm run verify` (timeout 180 s) | docs/config OK; 549 tests OK; build OK | `lead-verify.txt` |
| `pnpm run test:e2e` (timeout 180 s) | 63/63 OK | `lead-e2e.txt` |
| Revisión del diff completo | 23 archivos, +1513/−166 | `diff-stat.txt` |

El baseline E2E previo fue 63/63. No se borró ni saltó ningún test; los specs
existentes conservan su intención y solo ajustaron supuestos de daño/HP,
semillas y movimiento de un tile a 4 MP. Los unitarios pasan de 536 a 549 (+13).

# Criterios

- Dormido espera; alerta ataca si es adyacente y, si no, gasta hasta 4 MP por BFS
  hacia `lastKnown`, ataca al quedar adyacente con acción y espera sin ruta.
- Regreso vuelve a `home` sin atacar y duerme al llegar; visión/daño lo devuelve
  a alerta (tests de `turn`, `ai` e `integration`).
- Solo el perfil cobarde huye con daño ≥40 % de `maxHp` sobreviviendo
  (`damage * 5 >= maxHp * 2`); sin tiradas nuevas ni `Math.random`.
- La huida rompe LOS de todos los jugadores visibles, maximiza la distancia al
  más cercano con orden BFS y desempate estable; sin cobertura elige la que más
  se aleja; acorralado se queda y ataca si es adyacente; sin jugador visible
  vuelve a `home`.
- Un golpe fuerte nuevo renueva la huida y reemite `EnemyFled`; el enfriamiento
  limpia `fleeing` y duerme en `home`.
- `EnemyFled` lleva `unitId`; dos ejecuciones idénticas coinciden. `src/game/`
  no importa host, DOM, relojes ni RNG oculto; no hay dependencias nuevas.
- `pnpm run verify` verde y `pnpm run test:e2e` verde.

# E2E y riesgos

- E2E: se ajustaron 7 specs y `support.ts` para que los escenarios sigan
  montando el combate que prueban (aproximación con 4 MP, semillas de feedback,
  `defeatAllEnemies` con `preserveId`). No se eliminó ninguna aserción de
  intención: la victoria/derrota se sigue comprobando al final.
- Riesgo TASK-0035 (`EnemySpotted` no se reemite al ver tras una onda): no
  afecta al movimiento ni a los criterios de TASK-0037; el feedback queda para
  TASK-0038. No se reabre TASK-0035.
- La cobertura E2E específica de percepción, alarma y huida sigue en TASK-0039.
- `src/host/` sigue siendo presentación; el HUD actual no cambia.

# Fricción

La propuesta del informe (E2E dependientes de daño/HP fijos) queda `deferred` a
`requirements-writer` por ser documental/de arnés. La evidencia “12/63 fallos”
no coincide con `e2e-baseline.txt` (63/63); se corrige el dato en el informe y no
se usa para debilitar tests.
