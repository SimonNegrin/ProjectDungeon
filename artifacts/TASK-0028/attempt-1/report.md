---
type: Task Report
title: "TASK-0028: informe del intento 1"
description: Bestiario único de combate y ataque enemigo con el resolvedor compartido.
task: TASK-0028
attempt: 1
report_status: success
generated: { by: deepseek/v4.1-flash, at: 2026-11-08T18:42:00Z }
artifacts: artifacts/TASK-0028/attempt-1/
verified:
---

# Estado

`success`. Catálogo único de centinela, bruto y cobarde; el enemigo inicial es un
centinela de 9 PV y ataca con `resolveAttack` y el catálogo.

# Cambios

- `src/game/bestiary.ts`: `BESTIARY` con equipo por ID, modificadores, PV, visión
  y perfil; `EnemyType` estable.
- `equipment.ts`: añadida `plate` (armadura 2); `null` = escudo 0.
- `engine.ts`/`types.ts`: `enemyType` serializable; `createEnemy` toma PV,
  modificadores y equipo del bestiario. `turn.ts`/`ai.ts` ya usaban
  `resolveAttack`; los tests nuevos lo fijan con unidades del catálogo.
- `bestiary.test.ts`: tabla, serialización, ataque enemigo y TtK. Unitarios y E2E
  sembrados ajustados solo en la vida real del centinela.
- Commit SHA: `7d5282599190feb400bded93876260721c744c69`.

# Tests

| Comando | Resultado | Evidencia |
|---|---|---|
| `pnpm exec vitest run tests/unit/game/ai.test.ts tests/unit/game/combat.test.ts` | 33/33, 2 archivos | `logs/focus-output.txt` |
| `pnpm test` | 466/466, 32 archivos | `test-output.txt` |
| `pnpm run verify` | OK: docs, config, tests y build | `verify-output.txt` |
| `pnpm run test:e2e` | 55/55 | `e2e-output.txt` |

# Tiempo para matar (PV / impacto × daño medio)

RNG sembrado 1017, 12.000 ataques por celda; medido / esperado.

| Objetivo | Espada | Hacha | Daga |
|---|---|---|---|
| Centinela | 2,645 / 2,6 | 2,107 / 2,1 | 2,982 / 3,0 |
| Bruto | 3,976 / 4,0 | 2,884 / 2,9 | 4,847 / 4,8 |
| Cobarde | 2,236 / 2,2 | 1,980 / 2,0 | 2,351 / 2,3 |

Las nueve celdas quedan dentro de ±0,3 con la definición de `REQ-010`/`EXP-003`;
el conteo real hasta 0 es menor por el overkill.

# Evidencia visual

- Sin capturas nuevas; los E2E sembrados solo actualizaron la vida real (9 PV).

# Desviaciones

- Corregí cuatro enlaces del brief (`../../` → `../../../`) porque `docs:check`
  los resuelve desde el artefacto; contenido y contrato intactos. Sin ello
  `verify` fallaba.
- Eliminé `ENEMY_MAX_HP`: el bestiario es la única fuente. Los fixtures usan una
  constante local de 10 PV.
- En `engine.test` el hacha usa `[1,1,3,1]` para no matar al centinela y
  conservar la intención.

# Problemas conocidos

- La presentación restaura la vida máxima (9/9) al deshacer un golpe letal con
  overkill, en vez de 8/9. Es `src/host/`, fuera de alcance; el E2E documenta el
  valor real y el motor no se ve afectado.
- Visión y perfil son datos provisionales de `REQ-009`; sin percepción ni huida.

# Fricción reutilizable

| Síntoma | Workaround | Por qué es reutilizable | Cambio propuesto | Coste/riesgo | Disposición |
|---|---|---|---|---|---|
| Enlaces del brief a `../../docs/...` fallan `docs:check`; la ruta correcta desde `artifacts/TASK-NNNN/attempt-N/brief.md` es `../../../` | Corregir la profundidad | Error local del lead al redactar el brief, no del arnés | Ninguno | Bajo; ya corregido en el brief | `rejected` |

# Métricas de handoff

| Métrica | Valor |
|---|---|
| `brief_bytes` | 2573 |
| `report_bytes` | 3350 |
| `overflow` | `none` |
| `criteria_failed` | 0 |
