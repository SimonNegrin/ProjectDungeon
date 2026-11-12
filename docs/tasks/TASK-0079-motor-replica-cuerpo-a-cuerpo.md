---
type: Task
id: TASK-0079
title: "Motor: réplica tras fallo cuerpo a cuerpo"
description: "Resolver una réplica inmediata del defensor cuando falla un ataque cuerpo a cuerpo con arma, con la misma fórmula y RNG, sin coste ni cadena y con posible muerte del atacante."
status: stable
task_status: ready
task_type: feature
requirement: REQ-027
requirement_ids: [R-001, R-002, R-003, R-004, R-005, R-006, R-007, R-008, R-009, R-010, R-011, T-001, T-002, T-003, T-004, T-005, T-007]
depends_on: [TASK-0078]
unlocks: [TASK-0080]
created_at: 2026-11-12T14:45:00Z
completed_at:
assignee: task-runner
attempts: 0
artifacts: artifacts/TASK-0079/
priority: P1
risk: high
review_required: true
generated: { by: deepseek/v4.1-flash, at: 2026-11-12T14:45:00Z }
verified:
---

# Objetivo

Que fallar un ataque cuerpo a cuerpo con arma permita al defensor replicar en el
acto con una tirada normal, gratis, sin cadena y con la misma fórmula y RNG. Si
la réplica mata al atacante, este pierde las acciones que le quedaban.

# Contexto

- `src/game/combat.ts`: `resolveAttack` concentra validación, impacto, daño,
  eventos y consumo de acción.
- `src/game/types.ts`: `GameEvent`, `AttackRolls` y `RejectionReason`; la réplica
  necesita un evento propio para que la presentación lo distinga.
- `src/game/perception.ts` y `src/game/ai.ts`: estados `dormant`, `alert`,
  `returning`, huida y acorralamiento.
- `src/game/engine.ts`: comandos `Attack` y `MoveTo`; ambos pueden disparar la
  réplica al fallar.
- Requisito: [REQ-027](../requirements/REQ-027-replica-combate-cuerpo-a-cuerpo.md).
  Depende de `TASK-0078` por secuencia del milestone y del contador de acciones.

# Criterios de aceptación

- [ ] Un ataque cuerpo a cuerpo que impacta no genera réplica; un fallo genera
      una réplica del defensor, resuelta inmediatamente después y antes de la
      siguiente acción del atacante.
- [ ] La réplica usa la misma fórmula de ataque y el mismo RNG sembrado, pero no
      reutiliza la tirada del ataque fallido; puede impactar, fallar y matar.
- [ ] La réplica no consume acción, maná ni MP, no recursa y no deja estado
      pendiente; cargar una partida no reproduce réplicas.
- [ ] Solo replica quien está adyacente, vivo, con arma equipada y en estado
      elegible: alerta o regresando; huyendo solo si está acorralado. Un dormido
      no es atacable en melé y no replica.
- [ ] Ataques a distancia y mágicos no generan réplica; se deja el discriminante
      de tipo de ataque para que `TASK-0082` lo use.
- [ ] Si la réplica mata al atacante, sus acciones restantes se descartan y, si
      es el jugador, la partida termina; no se ejecuta la acción siguiente.
- [ ] El evento `ReplicaPerformed` incluye atacante, objetivo, impacto, daño,
      PV resultante y tiradas, y aparece después del `AttackPerformed` fallido.
- [ ] La IA no cambia de objetivo por la réplica; el que regresa sigue
      regresando aunque replique.
- [ ] Tests de impacto sin réplica, fallo con réplica, dos fallos, réplica letal,
      réplica fallida, sin arma, huida, acorralado, regreso, distancia, magia y
      orden de tiradas. `pnpm run verify` pasa.
- [ ] Sin cambios en la presentación, el HUD ni los valores de balance.

# Plan de test

- Unitario: elegibilidad por estado y equipo; orden ataque → réplica; tiradas
  distintas; sin cadena; contadores intactos; muerte del atacante.
- Integración: dos ataques fallidos en el mismo turno producen dos réplicas;
  `MoveTo` que falla al llegar también las dispara.
- E2E / visual: no aplica; lo cubre `TASK-0080`.
- Manual: atacar a un Centinela armado y comprobar que el fallo se contesta.

# Evidencia esperada

- [ ] Informe en `artifacts/TASK-0079/attempt-1/report.md`
- [ ] Salida de `pnpm run verify`
- [ ] Commit SHA en la rama `task/TASK-0079`

# Restricciones

- No aplicar el −1 al acierto de la réplica: queda como regla futura.
- No crear cadenas de réplicas ni estados pendientes.
- No tocar el HUD ni la animación.
- No añadir dependencias.

# No objetivos

- Animación, cue y QA visual
  ([TASK-0080](TASK-0080-host-docs-replica-visible.md)).
- Hechizos y rebalanceo.
- Cambios de la IA para planificar el riesgo.
