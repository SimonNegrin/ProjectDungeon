---
type: Task
id: TASK-0082
title: "Motor: catálogo y resolución de hechizos"
description: "Catálogo data-driven de seis hechizos y resolvedor mágico con validación atómica de acción, maná, nivel, alcance, LOS y objetivo; ataque con las capas del físico, curación y resurrección."
status: stable
task_status: backlog
task_type: feature
requirement: REQ-025
requirement_ids: [R-002, R-005, R-006, R-007, R-008, R-009, R-010, R-012, R-013, T-002, T-003, T-004, T-006, T-008, T-011]
depends_on: [TASK-0081]
unlocks: [TASK-0083]
created_at: 2026-11-12T15:00:00Z
completed_at:
assignee: task-runner
attempts: 0
artifacts: artifacts/TASK-0082/
priority: P1
risk: high
review_required: true
generated: { by: deepseek/v4.1-flash, at: 2026-11-12T15:00:00Z }
verified:
---

# Objetivo

Que el motor pueda lanzar los seis hechizos del catálogo mínimo con coste de
acción y maná, validación atómica y resolución determinista. Ataque, curación y
resurrección son datos parametrizados; el resolvedor no se escribe por id.

# Contexto

- `src/game/types.ts`: `Command` y `GameEvent`; añadir el comando de lanzamiento
  con `spellId` y objetivo, y el evento de hechizo.
- `src/game/combat.ts`: capas de impacto y daño que la magia reutiliza; la magia
  no debe disparar la réplica de `REQ-027`.
- `src/game/perception.ts`: línea de visión de Bresenham; los muros bloquean y
  las unidades no.
- `src/game/equipment.ts`: armadura y escudo del objetivo.
- Catálogo acordado en
  [REQ-025](../requirements/REQ-025-magia-hechizos-mana.md#catálogo-mínimo-provisional-v1):
  Eléctrico I, Fuego II, Eléctrico III, Fuego IV, Curación III y Resurrección IV.
- Depende de `TASK-0081` por nivel y maná.

# Criterios de aceptación

- [ ] `src/game/spells.ts` es dato serializable y fuente única: id, familia,
      nivel mínimo, coste final, alcance, acierto, poder, objetivo, efecto con
      parámetros y presentación. Añadir o ajustar un hechizo no toca el
      resolvedor.
- [ ] El comando de lanzamiento valida fase, unidad viva, acción, maná, nivel,
      alcance, línea de visión y objetivo antes de aplicar; si falla, no consume
      acción, maná ni RNG y devuelve el motivo.
- [ ] Cada lanzamiento consume 1 acción y su coste de maná; máximo 2 hechizos por
      unidad y turno, independiente de las acciones disponibles.
- [ ] Ataque mágico: `magicLevel + acierto + 1d6` contra `defensa + escudo +
      1d6`, empate falla; daño `max(1, poder + 1d6 − (resistencia + armadura +
      1d6))`. No hay resistencia mágica separada y no se dispara réplica.
- [ ] Curación III: sin tirada, aliado a 2–3 casillas con LOS, nunca a sí mismo
      ni a enemigos; cura la cantidad parametrizada sin superar el PV máximo.
- [ ] Resurrección IV: nivel 4, coste 8, adyacencia a la casilla de un jugador
      muerto y casilla sin vivos; vuelve con el 60 % del PV máximo, redondeado
      hacia arriba y mínimo 1. Se prueba con estados sintéticos de dos jugadores;
      el flujo de fantasma y derrota de `REQ-021` queda fuera.
- [ ] Proyectiles mágicos usan el alcance del hechizo y la LOS; los muros
      bloquean y las unidades no. Misma semilla y comandos dan el mismo
      resultado; no se usa `Math.random`.
- [ ] Tests de cada rechazo, tope de 2, fuego y eléctrico, curación con alcance y
      objetivo, resurrección, proyectil y determinismo; los valores se leen del
      catálogo. `pnpm run verify` pasa.
- [ ] Sin HUD, input, IA que lance hechizos ni arte/audio.

# Plan de test

- Unitario: validación de acción/maná/nivel/alcance/LOS/objetivo; tiradas de
  ataque; curación; resurrección; tope; no réplica.
- Integración: dos hechizos con 2 acciones y maná suficiente; tercero rechazado
  por tope; recarga en el turno siguiente.
- E2E / visual: no aplica; lo cubre `TASK-0083`.
- Manual: Mago lanza Fuego IV y Curación III; comprobar coste y alcance.

# Evidencia esperada

- [ ] Informe en `artifacts/TASK-0082/attempt-1/report.md`
- [ ] Salida de `pnpm run verify`
- [ ] Commit SHA en la rama `task/TASK-0082`

# Restricciones

- No implementar el fantasma, el cadáver saqueable ni la derrota por wipe:
  pertenecen a `REQ-021`.
- No añadir resistencia mágica, estados alterados ni hechizos fuera del catálogo.
- No tocar la réplica ni el contador de acciones.
- No añadir dependencias.

# No objetivos

- Input, HUD y feedback (`TASK-0083`).
- IA que lance hechizos.
- Ajuste de valores de balance.
