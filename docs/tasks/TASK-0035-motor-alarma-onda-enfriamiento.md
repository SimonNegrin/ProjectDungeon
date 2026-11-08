---
type: Task
id: TASK-0035
title: "Motor: alarma de una onda, enfriamiento y daño como despertador"
description: Implementar la alarma de radio 8 sin cadena, el enfriamiento a 3 fases con regreso al puesto y el despertar por daño, con eventos deterministas.
status: stable
task_status: ready
task_type: feature
requirement: REQ-009
requirement_ids: [R-006, R-008, T-004, T-008, T-009, T-010, T-011]
depends_on: [TASK-0034]
unlocks: [TASK-0037]
created_at: 2026-11-08T20:31:53Z
completed_at:
assignee: task-runner
attempts: 0
artifacts: artifacts/TASK-0035/
priority: P1
risk: high
review_required: true
generated: { by: deepseek/v4.1-flash, at: 2026-11-08T20:31:53Z }
verified:
---

# Objetivo

Que el motor resuelva la alarma de una sola onda y el despertar por daño de
[REQ-009](../requirements/REQ-009-percepcion-alarma-huida.md#requisitos-creativos)
R-006 y R-008, usando los estados y la memoria de `TASK-0034` y sin generar
cadenas de avisos. La huida y la IA de alerta llegan en `TASK-0037`.

# Contexto

- Base de percepción y estados: `TASK-0034`.
- Puntos de partida: `src/game/ai.ts`, `turn.ts`, `engine.ts`, `combat.ts` y
  `types.ts`; tests en `tests/unit/game/ai.test.ts`, `combat.test.ts` y
  `turn.test.ts`.
- La onda no requiere línea de visión y no se propaga en cadena.

# Criterios de aceptación

- [ ] Al ver por primera vez en un episodio, el enemigo emite una onda de radio
      8 desde su posición; los receptores vivos dentro del radio pasan o
      permanecen en alerta, comparten `lastKnown` y marcan `hasShouted`.
- [ ] Un enemigo a 8 tiles tras un muro se alerta; uno a 9 no; ningún receptor
      genera una segunda onda en el mismo episodio.
- [ ] La alerta se enfría a las 3 fases enemigas sin visión ni daño: 2
      investigando y 1 volviendo; al enfriarse deja de perseguir y de atacar, y
      vuelve a `home` sin atacar hasta llegar.
- [ ] Recibir daño despierta y alerta a un enemigo dormido aunque no haya visto
      al jugador; guarda la posición del atacante y, si sobrevive, da la alarma.
- [ ] Los eventos de percepción y alarma (`EnemySpotted`, `AlarmRaised`,
      `EnemyReturned` o equivalentes) salen en orden determinista con el
      `unitId` correcto.
- [ ] Dos ejecuciones idénticas dan el mismo conjunto de alertados; no se usa
      `Math.random`.
- [ ] `pnpm run verify` pasa; sin dependencias nuevas; `src/game/` sigue puro.

# Plan de test

- **Unitario:** onda a 8/9 tiles, muro intermedio, receptor ya alertado, sin
  cadena, `hasShouted`, enfriamiento, regreso, daño como despertador y orden de
  eventos.
- **Integración:** fase enemiga tras una detección y tras atacar a un dormido;
  el alertado actúa en la fase siguiente si ya había actuado.
- **Regresión:** tests de percepción y turnos existentes sin cambios de
  intención; no se borran, saltan ni debilitan.
- **E2E / visual:** no en esta tarea.

# Evidencia esperada

- [ ] Informe en `artifacts/TASK-0035/attempt-1/report.md`.
- [ ] Salidas de tests y `verify` en `attempt-1/`.
- [ ] Commit SHA en la rama `task/TASK-0035`.

# Comandos

| Comando | Timeout |
|---|---:|
| `pnpm exec vitest run tests/unit/game/ai.test.ts tests/unit/game/combat.test.ts tests/unit/game/turn.test.ts` | 120 s |
| `pnpm run verify` | 180 s |
| `git diff --stat` | 15 s |

# Restricciones

- No implementar la huida ni el movimiento de alerta con MP: son de
  `TASK-0037`.
- No colocar 4 enemigos ni tocar el host.
- No cambiar valores de combate ni economía de turno.
- No tocar `src/host/`, `index.html`, `public/`, `experiments/` ni dependencias.

# No objetivos

- Colocación (`TASK-0036`), IA de alerta y huida (`TASK-0037`), feedback del
  host (`TASK-0038`) y E2E/QA (`TASK-0039`).
- Cadena de alarma, alarma global, refuerzos o enemigos que despiertan a otros
  sin ver al jugador.
