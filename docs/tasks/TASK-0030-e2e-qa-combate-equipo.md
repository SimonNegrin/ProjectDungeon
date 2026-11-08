---
type: Task
id: TASK-0030
title: "E2E y QA visual del combate con equipo"
description: Verificar en navegador el impacto, el daño, el equipo, la recogida, el cambio de arma, el HUD y el feedback de REQ-010 con capturas y determinismo.
status: stable
task_status: done
task_type: test
requirement: REQ-010
requirement_ids: [R-001, R-002, R-003, R-004, R-005, R-006, R-007, R-008, R-010, R-011, R-012, R-013, T-006, T-008]
depends_on: [TASK-0029]
unlocks: []
created_at: 2026-11-08T17:31:45Z
completed_at: 2026-11-08T19:18:12Z
assignee: task-runner
attempts: 1
artifacts: artifacts/TASK-0030/
priority: P1
risk: low
review_required: true
generated: { by: deepseek/v4.1-flash, at: 2026-11-08T17:31:45Z }
verified:
  - by: task-lead
    at: 2026-11-08T19:18:12Z
    note: >-
      Intento 1 verificado en task/TASK-0030: spec d35ab07 e informe 6726ac1.
      Diff revisado; verify OK (483 tests, 144 documentos, config y
      build) y test:e2e OK (62/62). HUD, snapshot, recogida por 1 MP, cambio
      1-3, impacto/fallo, vida bajo cursor, F1, determinismo, victoria y
      derrota cubiertos; capturas 1280×720 revisadas. Sin cambios en src/,
      index.html, public/ ni dependencias; sin tests borrados o debilitados.
      Fricción de walkTo: elevada a requirements-writer.
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

- [x] Un spec E2E nuevo carga la partida con semilla fija y comprueba que el HUD
      muestra espada, escudo, armadura y modificadores; el snapshot coincide.
- [x] El jugador recoge el hacha con `G`, gasta 1 MP, no gasta acción y la ve
      equipada; `1`-`3` cambia entre espada, hacha y daga sin coste.
- [x] Un ataque produce "Fallo" o "−N" y el daño coincide con el estado; la vida
      del enemigo bajo el cursor y `F1` muestran las tiradas y el equipo.
- [x] La misma semilla y los mismos comandos producen los mismos impactos,
      daños y secuencia de RNG; no se usa `Math.random`.
- [x] Victoria al matar al último enemigo y derrota al caer el jugador siguen
      funcionando; no cambian `evaluateStatus` ni la economía de turno.
- [x] Capturas a 1280×720 de HUD con espada, armas en el mapa, pista de `G`,
      impacto, fallo, cambio de arma y `F1`; se revisan sin tapar el mapa.
- [x] `pnpm run test:e2e` y `pnpm run verify` pasan; no se borran, saltan ni
      debilitan tests; no se modifica `src/`, `index.html` ni `public/`.
- [x] Evidencia en `artifacts/TASK-0030/attempt-1/` con informe, capturas y
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

- [x] Informe en `artifacts/TASK-0030/attempt-1/report.md`.
- [x] Capturas en `attempt-1/screenshots/`.
- [x] Salidas de `pnpm run test:e2e` y `pnpm run verify`.
- [x] Commit SHA en la rama `task/TASK-0030`.

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

# Verificación

`task-lead` revisó el diff y re-ejecutó `pnpm run test:e2e` (62/62) y
`pnpm run verify` (483 tests, 144 documentos, config y build) con timeout 180 s;
salidas en `attempt-1/lead-e2e.txt` y `lead-verify.txt`. Se añadió
`tests/e2e/combat-equipment-qa.spec.ts` y artefactos: sin tocar `src/`,
`index.html`, `public/`, dependencias ni tests. Los cinco tests
cubren los criterios, incluido determinismo en dos cargas, victoria y derrota.
Capturas 1280×720 revisadas. `attack-hit` solapa el `-1` con el jugador en un
pasillo; `enemy-hit` muestra el `-4` y el DOM confirma el daño.

Fricción: `walkTo` con 0 MP antes de `G` se eleva a `requirements-writer`
(workaround `EndTurn` hasta `mp >= 1`); el solape visual queda como observación
local con el mismo dueño. No bloquea.
