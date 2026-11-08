---
type: Task
id: TASK-0030
title: "E2E y QA visual del combate con equipo"
description: Verificar en navegador el impacto, el daño, el equipo, la recogida, el cambio de arma, el HUD y el feedback de REQ-010 con capturas y determinismo.
status: stable
task_status: backlog
task_type: test
requirement: REQ-010
requirement_ids: [R-001, R-002, R-003, R-004, R-005, R-006, R-007, R-008, R-010, R-011, R-012, R-013, T-006, T-008]
depends_on: [TASK-0029]
unlocks: []
created_at: 2026-11-08T17:31:45Z
completed_at:
assignee: task-runner
attempts: 0
artifacts: artifacts/TASK-0030/
priority: P1
risk: low
review_required: true
generated: { by: deepseek/v4.1-flash, at: 2026-11-08T17:31:45Z }
verified:
---

# Objetivo

Verificar en navegador que el combate con equipo de
[REQ-010](../requirements/REQ-010-combate-equipo-acierto-defensa.md) funciona de
extremo a extremo: fórmulas visibles, equipo, recogida, cambio de arma, HUD,
feedback, `F1`, victoria/derrota y determinismo. Sin cambios de producción.

# Contexto

- Implementación: `TASK-0026` a `TASK-0029`.
- Decisión y valores: [EXP-003](../../experiments/EXP-003-mesa-combate/experiment.md).
- Convención de capturas: [QA visual](../harness/visual-qa.md); semilla de
  referencia `279837264`.
- Spec de partida y helpers: `tests/e2e/game-input-hud.spec.ts`,
  `tests/e2e/support.ts` y `tests/e2e/artifacts.ts`.

# Criterios de aceptación

- [ ] Un spec E2E nuevo carga la partida con semilla fija y comprueba que el HUD
      muestra espada, escudo, armadura y modificadores; el snapshot coincide.
- [ ] El jugador recoge el hacha con `G`, gasta 1 MP, no gasta acción y la ve
      equipada; `1`-`3` cambia entre espada, hacha y daga sin coste.
- [ ] Un ataque produce "Fallo" o "−N" y el daño coincide con el estado; la vida
      del enemigo bajo el cursor y `F1` muestran las tiradas y el equipo.
- [ ] La misma semilla y los mismos comandos producen los mismos impactos,
      daños y secuencia de RNG; no se usa `Math.random`.
- [ ] Victoria al matar al último enemigo y derrota al caer el jugador siguen
      funcionando; no cambian `evaluateStatus` ni la economía de turno.
- [ ] Capturas a 1280×720 de HUD con espada, armas en el mapa, pista de `G`,
      impacto, fallo, cambio de arma y `F1`; se revisan sin tapar el mapa.
- [ ] `pnpm run test:e2e` y `pnpm run verify` pasan; no se borran, saltan ni
      debilitan tests; no se modifica `src/`, `index.html` ni `public/`.
- [ ] Evidencia en `artifacts/TASK-0030/attempt-1/` con informe, capturas y
      salidas de test.

# Plan de test

- **E2E funcional:** HUD, snapshot, recogida con `G`, cambio con `1`-`3`,
  ataque con impacto y fallo, vida del enemigo, `F1`, victoria y derrota.
- **Determinismo:** dos ejecuciones idénticas con la misma semilla; comparación
  de estado, eventos y daños.
- **E2E visual:** capturas de HUD, armas en el mapa, pista, impacto, fallo,
  cambio de arma y `F1`.
- **Regresión:** `pnpm run test:e2e` completo y `pnpm run verify`.
- **Manual:** revisar que el feedback y el HUD no compiten con camino, cursor ni
  decoración.

# Evidencia esperada

- [ ] Informe en `artifacts/TASK-0030/attempt-1/report.md`.
- [ ] Capturas en `attempt-1/screenshots/`.
- [ ] Salidas de `pnpm run test:e2e` y `pnpm run verify`.
- [ ] Commit SHA en la rama `task/TASK-0030`.

# Comandos

| Comando | Timeout |
|---|---:|
| `pnpm run test:e2e` | 180 s |
| `pnpm run verify` | 180 s |
| `git status --porcelain artifacts` | 15 s |

# Restricciones

- No modificar código de producción; si falta un dato, devolver `blocked`.
- No cambiar aserciones, nombres de capturas ni esperas existentes.
- No tocar artefactos históricos; usar `E2E_ARTIFACTS_DIR`.
- No editar `docs/`.

# No objetivos

- Implementar el motor, el equipo, el bestiario o el HUD: pertenecen a
  `TASK-0026` a `TASK-0029`.
- Cambiar reglas, valores, generación, cámara o economía de turno.
- Percepción, alarma y huida (`REQ-009`).
