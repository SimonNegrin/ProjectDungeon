---
type: Task Brief
title: "TASK-0037: brief del intento 1"
description: IA de alerta con MP, regreso y huida determinista del cobarde.
task: TASK-0037
attempt: 1
status: stable
brief_bytes: 2723
read_detail: false
generated: { by: deepseek/v4.1-flash, at: 2026-11-08T22:10:00Z }
---

# Objetivo

Que `planEnemyAction` resuelva dormido, alerta, regreso y huida con 4 MP; que un
golpe fuerte active la huida del cobarde y se emita `EnemyFled`, sin romper el
determinismo ni añadir tiradas.

# No objetivos

- Host/feedback (`TASK-0038`), E2E específico (`TASK-0039`), arte o combate.
- Huida fuera del mapa, rendición, moral negociable o patrullas.
- Cambiar percepción, alarma, colocación, bestiario, combate ni economía.

# Invariantes

- `src/game/` puro, sin DOM, relojes ni `Math.random`; misma entrada, mismo plan
  y eventos.
- Desempate por índice de jugador y orden fijo de `DIRECTIONS`/BFS.
- No se borran, saltan ni debilitan tests; los legacy solo ajustan el supuesto
  de “un tile por fase”.

# Criterios de aceptación

Viven en [la tarea](../../../docs/tasks/TASK-0037-motor-ia-alerta-mp-huida-cobarde.md#criterios-de-aceptación);
no se copian. Requisito:
[REQ-009 v3](../../../docs/requirements/REQ-009-percepcion-alarma-huida.md#requisitos-creativos)
(R-005, R-007, R-009; T-005, T-006, T-008–T-011).

# Contexto mínimo

- `src/game/ai.ts`: `distanceField`/`stepAlongField` y `planEnemyAction` solo
  mueven un tile, sin distinguir huida.
- `turn.ts`: `applyEnemyPlan` aplica un plan por enemigo; debe consumir la
  secuencia de alerta y emitir la huida en orden de índice.
- `movement.ts`: `DIRECTIONS`, `validateMove`, `commitMove` (1 MP, sin gastar
  acción); `types.ts`: `fleeing`, `home`, `lastKnown`, eventos y 4 MP.
- `perception.ts`: `refreshEnemyAwareness`, `nearestVisiblePlayer`,
  `canSee`/`hasLineOfSight`, `noteDamage`; `combat.ts` llama a `noteDamage` al
  impactar. `bestiary.ts`: perfil cobarde y umbral del 40 % de `maxHp`.
- Tests `tests/unit/game/`; E2E en `tests/e2e/`; guarda el baseline en
  `e2e-baseline.txt` antes de tocar supuestos.

# Artefactos

`report.md`, `test-output.txt`, `verify-output.txt`, `e2e-output.txt`,
`e2e-baseline.txt`, `diff-stat.txt` en `attempt-1/`; commit con el ID de tarea.

# Riesgos y decisiones abiertas

- Riesgo TASK-0035: un alertado por onda que luego ve al jugador no reemite
  `EnemySpotted`; no bloquea (el movimiento usa `refreshEnemyAwareness` y
  `lastKnown`). El feedback queda para `TASK-0038`.
- `EnemyFled` se emite al iniciar o renovar la huida, una vez por golpe fuerte;
  `returning`/`dormant` limpia `fleeing`.
- Si un E2E falla por el nuevo movimiento/ataque, ajusta solo su supuesto sin
  debilitar su intención.
