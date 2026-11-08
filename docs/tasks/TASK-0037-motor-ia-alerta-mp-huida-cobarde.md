---
type: Task
id: TASK-0037
title: "Motor: IA de alerta con MP y huida del cobarde"
description: Hacer que planEnemyAction distinga dormido, alerta, regreso y huida; usar los 4 MP para converger o escapar y atacar al llegar si conserva la acción.
status: stable
task_status: backlog
task_type: feature
requirement: REQ-009
requirement_ids: [R-005, R-007, R-009, T-005, T-006, T-008, T-009, T-010, T-011]
depends_on: [TASK-0035, TASK-0036]
unlocks: [TASK-0038, TASK-0039]
created_at: 2026-11-08T20:31:53Z
completed_at:
assignee: task-runner
attempts: 0
artifacts: artifacts/TASK-0037/
priority: P1
risk: high
review_required: true
generated: { by: deepseek/v4.1-flash, at: 2026-11-08T20:31:53Z }
verified:
---

# Objetivo

Que `planEnemyAction` resuelva el movimiento de alerta, el regreso y la huida
del cobarde de
[REQ-009](../requirements/REQ-009-percepcion-alarma-huida.md#requisitos-creativos)
R-005, R-007 y R-009, gastando hasta los 4 MP y manteniendo el determinismo.

# Contexto

- Percepción, alarma y estados: `TASK-0034` y `TASK-0035`.
- Colocación de los 4 enemigos: `TASK-0036`.
- Puntos de partida: `src/game/ai.ts`, `turn.ts`, `movement.ts` y `types.ts`;
  tests en `tests/unit/game/ai.test.ts` y `turn.test.ts`.
- La IA actual mueve un tile por turno y no distingue estados.

# Criterios de aceptación

- [ ] Dormido espera. Alerta ataca si es adyacente; si no, gasta hasta 4 MP
      avanzando por BFS a `lastKnown` y ataca si termina adyacente y conserva la
      acción; si no hay ruta, espera.
- [ ] Regreso vuelve a `home` sin atacar y se duerme al llegar; una nueva visión
      o daño lo devuelve a alerta.
- [ ] Solo el perfil cobarde huye de forma determinista cuando un golpe le quita
      al menos el 40 % de su vida máxima y sobrevive; no hay tirada adicional.
- [ ] La huida elige, entre las casillas alcanzables con el MP disponible, las
      que rompen la línea de visión de todos los jugadores visibles y maximizan
      la distancia al más cercano, con desempate determinista. Si ninguna rompe
      la visión, elige la que más se aleja; si no hay ninguna que mejore, se
      queda y ataca si está adyacente. Sin jugador visible, vuelve a `home`.
- [ ] Un nuevo golpe que cruce el umbral renueva la huida; al enfriarse la
      alerta se duerme en su puesto.
- [ ] Se emite `EnemyFled` (o equivalente) con el `unitId`; dos ejecuciones
      idénticas coinciden y no se usa `Math.random`.
- [ ] `pnpm run verify` pasa; sin dependencias nuevas; `src/game/` sigue puro.

# Plan de test

- **Unitario:** los cuatro estados; convergencia con 4 MP; ataque al llegar;
  regreso sin ataque; huida que rompe visión; desempate determinista;
  acorralamiento; re-trigger; sin visión vuelve a `home`.
- **Integración:** fase enemiga completa con varios enemigos y alerta; el
  cobarde huye tras un golpe fuerte; el valiente nunca huye.
- **Regresión:** tests de IA y turnos existentes ajustados solo en sus supuestos
  de movimiento por tile; no se borran, saltan ni debilitan.
- **E2E / visual:** la cobertura específica llega en `TASK-0039`.

# Evidencia esperada

- [ ] Informe en `artifacts/TASK-0037/attempt-1/report.md`.
- [ ] Salidas de tests y `verify` en `attempt-1/`.
- [ ] Commit SHA en la rama `task/TASK-0037`.

# Comandos

| Comando | Timeout |
|---|---:|
| `pnpm exec vitest run tests/unit/game/ai.test.ts tests/unit/game/turn.test.ts` | 120 s |
| `pnpm run verify` | 180 s |
| `git diff --stat` | 15 s |

# Restricciones

- No cambiar la percepción, la alarma ni la colocación ya implementadas.
- No añadir tiradas de moral o de huida: la probabilidad emerge del daño.
- No cambiar valores de combate, bestiario ni economía de turno.
- No tocar `src/host/`, `index.html`, `public/`, `experiments/` ni dependencias.

# No objetivos

- Feedback del host (`TASK-0038`), E2E/QA (`TASK-0039`).
- Huida fuera del mapa, rendición, prisioneros, moral negociable o patrullas.
