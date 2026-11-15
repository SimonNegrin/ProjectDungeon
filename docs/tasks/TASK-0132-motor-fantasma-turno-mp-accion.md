---
type: Task
id: TASK-0132
title: "Motor: fantasma con turno, MP y una acción"
description: "Convertir al jugador muerto en fantasma controlable: comparte casilla, no bloquea ni es objetivo, mueve con MP intrínseco y gasta una acción por ronda."
status: stable
task_status: done
task_type: feature
requirement: REQ-021
requirement_ids: [R-002, R-003, R-004, R-005, R-006, R-007, T-002, T-003, T-004, T-005, T-009]
depends_on: [TASK-0131]
unlocks: [TASK-0134, TASK-0136, TASK-0142, TASK-0143, TASK-0146, TASK-0157]
created_at: 2026-11-14T23:31:45Z
completed_at: 2026-11-15T12:05:00Z
assignee: task-runner
attempts: 1
artifacts: artifacts/TASK-0132/
priority: P1
risk: high
review_required: true
generated: { by: deepseek/v4.1-flash, at: 2026-11-14T23:31:45Z }
verified:
  - by: task-lead
    at: 2026-11-15T12:05:00Z
    note: >-
      Intento 1 verificado (motor `e493ab7`, tests `30dbb91`). Diff acotado a
      motor, dos casos exhaustivos del host, tests y artefactos; sin tocar
      requisitos, arnés, RNG ni botín. `pnpm run verify` reejecutado:
      102 archivos/1521 tests y 99/99 focalizados, con build y bundle OK.
      Evidencia en `attempt-1/lead-verify/`.
---

# Objetivo

Que el jugador muerto siga jugando como fantasma: se mueve con su MP intrínseco,
comparte casilla sin bloquear y dispone de una sola acción por ronda limitada a
interactuar y mover objetos.

# Contexto

TASK-0131 deja el cadáver y la unidad muerta. REQ-021 define el fantasma en
[R-002 a R-007](../requirements/REQ-021-muerte-fantasma-resurreccion.md#requisitos-creativos-decididos)
y sus reglas técnicas en
[T-002 a T-005](../requirements/REQ-021-muerte-fantasma-resurreccion.md#requisitos-técnicos).
El turno por jugador y la fase enemiga son TASK-0146; aquí se prepara el estado y
los comandos, no la presentación.

# Criterios de aceptación

- [x] El estado distingue vivo, muerto y fantasma con identidad estable y
      serialización.
- [x] El fantasma no atraviesa muros, pero comparte casilla con personajes y
      enemigos; queda excluido de bloqueo, pathfinding, objetivos de ataque y
      cálculo de daño.
- [x] Su MP sale del atributo intrínseco del personaje, sin bonus de equipo, y su
      equipo no altera el turno.
- [x] Tiene una acción por ronda, como excepción a REQ-026.
- [x] Los comandos válidos se limitan a puertas, recoger/soltar un objeto e
      inspeccionar contenedores; no puede atacar, usar objetos, equipar ni abrir
      cofres.
- [x] La inspección devuelve el contenido, pero nunca el estado de trampa.
- [x] La IA enemiga ignora al fantasma como objetivo y como obstáculo.
- [x] Comandos inválidos se rechazan sin cambios de estado; tests de casilla
      compartida, pathfinding, MP, una acción, inspección e IA; `pnpm run verify`
      pasa.

# Plan de test

- Unitario: `movement`, `path`, `perception`, `actions` y `engine`.
- Integración: muerte → fantasma → compartir casilla → inspeccionar → recoger.
- E2E / visual: no aplica; la presentación es TASK-0135.
- Manual: `F1` con un vivo y un fantasma en la misma casilla.

# Evidencia esperada

- [x] Informe en `artifacts/TASK-0132/attempt-1/report.md`
- [x] Salida de `pnpm run verify`
- [x] Commit SHA

# Comandos

| Comando | Timeout |
|---|---:|
| `pnpm exec vitest run tests/unit/game/actions.test.ts tests/unit/game/path.test.ts tests/unit/game/perception.test.ts tests/unit/game/engine.test.ts` | 120 s |
| `pnpm run verify` | 240 s |

# Restricciones

- No implementar la resurrección; eso es TASK-0148.
- No implementar el turno hotseat, el relevo ni la fase enemiga; eso es TASK-0146.
- No tocar el RNG, el mapa ni el combate de vivos.
- Handoff: brief 1,5 KB, informe 2 KB; tope duro 4 KB.

# No objetivos

- Presentación translúcida, animación o avisos de rechazo.
- Temporizador de turno del fantasma.
- Entrega directa de objetos.
- HUD del fantasma.

# Notas de verificación

- Puertas: el motor no tiene estado ni comando de puerta interactiva y REQ-034
  excluye puertas cerradas. No se añade comando nuevo; la allowlist queda en
  mover, recoger/soltar un objeto e inspeccionar. Se eleva a
  `requirements-writer` para concretar el alcance.
- La inspección no mueve objetos y no gasta acción ni MP; mover un objeto cuesta
  una acción y 0 MP. No revela trampa.
- TASK-0148 debe limpiar `ghost` y restaurar `actions.max` al resucitar.
