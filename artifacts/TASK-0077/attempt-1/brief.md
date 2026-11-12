---
type: Task Brief
title: "TASK-0077: brief del intento 1"
description: Encadenar acciones enemigas por tipo sin romper determinismo ni percepción.
task: TASK-0077
attempt: 1
status: stable
brief_bytes: 2088
read_detail: false
generated: { by: deepseek/v4.1-flash, at: 2026-11-12T18:00:00Z }
---

# Objetivo

Que `resolveEndTurn` ejecute la cola de acciones de cada enemigo: en alerta se
mueve con MP y ataca una vez por acción hasta agotar acciones o matar al
objetivo; dormido y en regreso no atacan; el cobarde huye con MP y solo ataca
acorralado. Determinista y en orden de índice.

# No objetivos

- Beats y HUD (TASK-0078), hechizos, rebalanceo, percepción/radios/bestiario.
- Tocar el contador o los costes de TASK-0076.

# Invariantes

- Sin `Math.random`: misma semilla y comandos, mismos eventos y posiciones.
- Enemigos por índice; eventos en orden de ejecución.
- Atacar gasta 1 acción vía `resolveAttack`; huir/perseguir solo MP.
- Tests adaptados a la regla nueva, sin borrar, saltar ni debilitar.
- Cambios limitados a `src/game/ai.ts`, `src/game/turn.ts`, tests y docs.

# Criterios de aceptación

`docs/tasks/TASK-0077-motor-ia-acciones-encadenadas.md#criterios-de-aceptación`.

# Contexto mínimo

- `ai.ts`: `planEnemyAction` planifica **una** acción; no lo conviertas en bucle.
- `turn.ts`: `applyEnemyPlan` aplica un plan; ahí vive el encadenado.
- `actions.ts`: `hasAction`/`spendAction` ya existen. `bestiary.ts`: 2/1/2.
- REQ-026 R-006/R-012/T-004/T-008; REQ-009 T-005/R-009.

# Interpretación fijada por los criterios

- Si el objetivo atacado muere, la cola de ese enemigo termina; no re-targetea.
- Un plan de huida que se mueve no ataca; solo ataca acorralado (sin casilla).
- El bucle corta con `wait`, muerte, 0 acciones o falta de progreso.

# Artefactos

- `artifacts/TASK-0077/attempt-1/report.md`, `verify-output.txt`,
  `test-output.txt` y commit en `task/TASK-0077`.

# Riesgos

- `ai.test.ts` «converge…» y `turn.test.ts` «varios enemigos adyacentes» asumen
  un ataque por enemigo: actualízalos al número de acciones del tipo.
