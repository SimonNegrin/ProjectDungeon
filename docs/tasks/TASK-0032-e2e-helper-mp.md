---
type: Task
id: TASK-0032
title: "E2E: espera de MP compartida antes de recoger o actuar"
description: Extraer a support.ts el bucle acotado que termina el turno hasta recuperar MP y usarlo en los specs que hoy lo duplican, sin cambiar producción ni aserciones.
status: stable
task_status: done
task_type: refactor
requirement: HARNESS
requirement_ids: []
depends_on: [TASK-0020]
unlocks: []
created_at: 2026-11-08T19:50:00Z
completed_at: 2026-11-08T19:56:00Z
assignee: task-runner
attempts: 1
artifacts: artifacts/TASK-0032/
priority: P2
risk: low
review_required: true
generated: { by: deepseek/v4.1-flash, at: 2026-11-08T19:50:00Z }
verified:
  - by: task-lead
    at: 2026-11-08T19:56:00Z
    note: >-
      Intento 1 verificado en task/TASK-0032: implementación d157f36 e informe
      ac7dda3. Diff completo revisado; test:e2e OK (63/63) y verify OK (491
      unitarios, 151 documentos, config y build). Sin cambios en src/,
      index.html, public/, Playwright ni dependencias; sin tests borrados,
      saltados ni debilitados (61 declaraciones iguales a main). ensureMp
      acotado a 8 turnos y usado en los mismos puntos de los dos specs.
---

# Objetivo

Eliminar la fricción repetida de los E2E de recogida: tras `walkTo`, el jugador
puede quedarse con 0 MP y `G` se rechaza. Habrá un único helper compartido y
acotado en `tests/e2e/support.ts` que espera al siguiente turno hasta tener el MP
mínimo, y los specs dejarán de duplicar el bucle. Solo tests: no cambia
producción, comandos ni aserciones.

# Contexto

- Origen: `TASK-0029` y `TASK-0030` aplicaron el mismo workaround local; ver
  `artifacts/TASK-0030/attempt-1/report.md`.
- Duplicados actuales: `waitForMp` en `tests/e2e/combat-equipment-qa.spec.ts` y
  un `while` inline en `tests/e2e/equipment-hud-qa.spec.ts`.
- `support.ts` ya expone `snapshot`, `settle`, `endTurn` y utilidades de caminata
  con comandos reales; `ensureAdjacentWithMp` resuelve un caso más restrictivo.

# Criterios de aceptación

- [x] `ensureMp(page, minimum)` se exporta desde `tests/e2e/support.ts`, usa
      `snapshot`, `EndTurn` real y `settle`, tiene guard acotado (8 turnos como
      máximo) y devuelve el snapshot alcanzado.
- [x] Falla con un mensaje claro si la partida deja de estar en `playing` o si no
      se alcanza el MP mínimo; no teletransporta, no inyecta estado y no muta
      posiciones.
- [x] `combat-equipment-qa.spec.ts` y `equipment-hud-qa.spec.ts` usan el helper y
      eliminan sus bucles locales; las llamadas quedan en los mismos puntos.
- [x] No cambia el comportamiento de `walkTo`, `approachEnemy`,
      `retreatEnemyOutOfReach` ni de ninguna aserción existente.
- [x] `pnpm run test:e2e` pasa completo y `pnpm run verify` pasa; no se borran,
      saltan ni debilitan tests.
- [x] Sin cambios en `src/`, `index.html`, `public/`, `package.json`,
      dependencias ni artefactos históricos.
- [x] Evidencia en `artifacts/TASK-0032/attempt-1/` con informe, salidas de E2E y
      `verify`, y commit SHA en `task/TASK-0032`.

# Plan de test

- **E2E:** la suite completa ejercita el helper en los dos specs de recogida y en
  el resto de flujos existentes.
- **Regresión:** `pnpm run test:e2e` y `pnpm run verify`; comparar que el número
  de tests no baja.
- **Manual:** ninguna captura nueva; el cambio no altera presentación.

# Evidencia esperada

- [x] Informe en `artifacts/TASK-0032/attempt-1/report.md`.
- [x] Salidas de `test:e2e` y `verify` en `attempt-1/`.
- [x] Commit SHA en la rama `task/TASK-0032`.

# Comandos

| Comando | Timeout |
|---|---:|
| `pnpm run test:e2e` | 180 s |
| `pnpm run verify` | 180 s |
| `git diff --stat` | 15 s |

# Restricciones

- Solo `tests/e2e/support.ts` y los dos specs que duplican la espera de MP.
- No tocar producción, configuración de Playwright, artefactos históricos ni
  aserciones.
- No añadir dependencias ni cambiar el número de turnos que espera un test.

# No objetivos

- Cambiar el feedback visual (`TASK-0031`).
- Reescribir `walkTo` para que garantice MP al llegar.
- Añadir cobertura nueva de combate o recogida.
