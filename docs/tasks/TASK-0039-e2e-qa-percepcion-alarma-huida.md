---
type: Task
id: TASK-0039
title: "E2E y QA visual de percepción, alarma y huida"
description: Cubrir con Playwright la detección por paso, la alarma sin cadena, el enfriamiento, el daño como despertador, la huida determinista y el feedback; revisar capturas.
status: stable
task_status: done
task_type: qa
requirement: REQ-009
requirement_ids: [R-001, R-002, R-003, R-004, R-005, R-006, R-007, R-008, R-009, R-010, R-011, R-012, T-010]
depends_on: [TASK-0037, TASK-0038]
unlocks: []
created_at: 2026-11-08T20:31:53Z
completed_at: 2026-11-08T23:10:00Z
assignee: task-runner
attempts: 1
artifacts: artifacts/TASK-0039/
priority: P1
risk: medium
review_required: true
generated: { by: deepseek/v4.1-flash, at: 2026-11-08T20:31:53Z }
verified:
  - by: task-lead
    at: 2026-11-08T23:10:00Z
    note: >-
      Intento 1 verificado en task/TASK-0039 (commits 0668f5a, 650202f,
      f1e1284, 1c37e48, dfbbc6d y b87d4a1), fusionado en main. Diff completo
      revisado: solo host de test (setup gateado con ?test=1) y specs E2E
      nuevos; sin cambios en src/game, reglas, combate, IA ni dependencias.
      Lead re-ejecutó `pnpm run verify` (559 tests, docs/config y build OK),
      `pnpm run test:e2e` (70/70) y `--repeat-each=3` (210/210). Mutaciones
      locales revertidas (strongHit=false y alarma +1) hicieron fallar los
      nuevos specs, demostrando que cubren las reglas. Capturas 1280×720
      revisadas: sin F1 no hay radios, el aviso queda en el HUD, "!" legible,
      huida rompe LOS y acorralado ataca. R-010 verificado con canSee/BESTIARY.
---

# Objetivo

Que la percepción, la alarma y la huida de
[REQ-009](../requirements/REQ-009-percepcion-alarma-huida.md#requisitos-creativos)
estén cubiertas de extremo a extremo con la semilla de referencia `279837264`,
incluido el feedback visual y el determinismo, sin debilitar los E2E existentes.

# Contexto

- Motor y host: `TASK-0034` a `TASK-0038`.
- Puntos de partida: `tests/e2e/`, `tests/e2e/support.ts`,
  `playwright.config.ts` y `artifacts/TASK-0030/attempt-1/`.
- Usar `E2E_ARTIFACTS_DIR` y guardar capturas en `<spec>/screenshots/`.

# Criterios de aceptación

- [ ] E2E de detección por paso: un `MoveTo` que cruza la vista y termina tras un
      muro alerta al enemigo en el paso correcto; sin visión no se mueve.
- [ ] E2E de alarma: un enemigo a 8 tiles tras un muro se alerta, uno a 9 no; no
      hay cadena; el enfriamiento lo devuelve a su puesto y lo duerme.
- [ ] E2E de daño: atacar a un dormido lo despierta, guarda la posición del
      atacante y activa a los enemigos dentro del radio.
- [ ] E2E de huida: el cobarde huye tras un golpe de ≥40 %, rompe la línea de
      visión y se aleja; acorralado ataca; el valiente no huye; la huida se
      renueva con otro golpe fuerte.
- [ ] E2E de feedback: "!" en el paso de detección, aviso breve de alarma,
      radios solo con `F1` y snapshot de solo lectura.
- [ ] La semilla `279837264` coloca los 4 enemigos con las restricciones de
      `R-010`; dos ejecuciones dan el mismo resultado.
- [ ] Capturas revisadas a 1280×720 (juego normal, debug, detección, alarma,
      huida y acorralamiento); no se borran, saltan ni debilitan tests.
- [ ] `pnpm run test:e2e` y `pnpm run verify` pasan; sin dependencias nuevas.

# Plan de test

- **E2E:** detección, alarma, enfriamiento, daño, huida, acorralamiento,
  feedback y snapshot con teclado real y comandos `Move`/`EndTurn`.
- **Visual:** capturas de los estados anteriores con y sin `F1`; revisar que el
  aviso no tapa el HUD y que los radios no aparecen en juego normal.
- **Regresión:** suite E2E completa y `pnpm run verify`; tests existentes con su
  intención intacta.
- **Manual:** comprobar la legibilidad del "!" y del aviso en 1280×720.

# Evidencia esperada

- [ ] Informe en `artifacts/TASK-0039/attempt-1/report.md`.
- [ ] Salidas de `test:e2e` y `verify` en `attempt-1/`.
- [ ] Capturas en `attempt-1/screenshots/` y en `<spec>/screenshots/`.
- [ ] Commit SHA en la rama `task/TASK-0039`.

# Comandos

| Comando | Timeout |
|---|---:|
| `pnpm run test:e2e` | 180 s |
| `pnpm run test:e2e --repeat-each=3` | 240 s |
| `pnpm run verify` | 180 s |
| `git diff --stat` | 15 s |

# Restricciones

- No cambiar reglas, valores de combate, IA ni percepción para hacer pasar un
  test; si algo falla, se reporta con evidencia.
- No usar esperas fijas si existe una condición de estado; reutilizar los
  helpers de `tests/e2e/support.ts`.
- No borrar, saltar ni debilitar tests existentes.
- No añadir dependencias ni arte final.

# No objetivos

- Implementar percepción, alarma, huida o feedback: ya están en las tareas
  anteriores.
- Pruebas de carga, red, hotseat o persistencia.
- Reequilibrar el combate o cambiar el bestiario.
