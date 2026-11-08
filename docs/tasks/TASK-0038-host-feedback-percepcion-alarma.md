---
type: Task
id: TASK-0038
title: "Host: feedback de percepción, alarma y debug"
description: Mostrar "!" sobre el enemigo que detecta, un aviso breve de alarma y los radios de visión/alarma solo en F1, con el nuevo estado en el snapshot de solo lectura.
status: stable
task_status: done
task_type: feature
requirement: REQ-009
requirement_ids: [R-011, R-012, T-003, T-008, T-009, T-010, T-011]
depends_on: [TASK-0037]
unlocks: [TASK-0039]
created_at: 2026-11-08T20:31:53Z
completed_at: 2026-11-08T23:40:00Z
assignee: task-runner
attempts: 2
artifacts: artifacts/TASK-0038/
priority: P1
risk: medium
review_required: true
generated: { by: deepseek/v4.1-flash, at: 2026-11-08T20:31:53Z }
verified:
  - by: task-lead
    at: 2026-11-08T23:40:00Z
    note: >-
      Intentos 1 y 2 verificados en task/TASK-0038 (commits 1c99935, 9c4d88d y
      c6f8765). Diff completo revisado; lead re-ejecutó 47 tests dirigidos,
      `pnpm run verify` (559 tests, docs/config y build OK) y `pnpm run test:e2e`
      (64/64) con la semilla 279837264 y capturas 1280×720. Criterios R-011/R-012
      cubiertos: "!" por `EnemySpotted`, aviso de `AlarmRaised`, radios solo en
      F1 y snapshot profundo de los 4 enemigos. El intento 2 poda el rastro del
      "!" al salir de alerta y restaura la aserción exacta de avisos. Limitación
      TASK-0035 documentada sin tocar percepción: un alertado por onda que luego
      ve no reemite `EnemySpotted`. Sin cambios en src/game, reglas, valores ni
      dependencias; sin tests borrados, saltados ni debilitados.
---

# Objetivo

Que el host presente la percepción y la alarma de
[REQ-009](../requirements/REQ-009-percepcion-alarma-huida.md#requisitos-creativos)
R-011 y R-012 sin revelar el estado interno: "!" sobre el que detecta, aviso
breve de alarma y radios solo en el overlay de debug `F1`.

# Contexto

- Eventos y estados del motor: `TASK-0034`, `TASK-0035` y `TASK-0037`.
- Puntos de partida: `src/host/feedback.ts`, `debug.ts`, `renderer.ts`,
  `src/host/game.ts` y `index.html`; tests E2E en `tests/e2e/`.
- El host sigue siendo presentación: no decide reglas ni muta el estado.

# Criterios de aceptación

- [ ] El "!" aparece sobre el enemigo que detecta en el paso correcto y
      desaparece al enfriarse la alerta; no se muestra en enemigos alertados
      solo por la onda.
- [ ] Al darse la alarma se muestra un aviso textual breve y no bloqueante; el
      input y el turno siguen funcionando.
- [ ] Los radios de visión y alarma se dibujan solo con `F1`; en juego normal no
      hay líneas de visión permanentes ni estados de todos los enemigos.
- [ ] `window.__game.snapshot()` expone `awareness`, `fleeing`, `home`,
      `lastKnown`, `alertTurns` y `hasShouted` en solo lectura, junto con los 4
      enemigos.
- [ ] El feedback de combate, daño y equipo existente se conserva; no se
      debilitan tests ni se cambian reglas.
- [ ] `pnpm run verify` pasa; capturas a 1280×720 con `E2E_ARTIFACTS_DIR` en
      `<spec>/screenshots/`; sin dependencias nuevas.

# Plan de test

- **Unitario / integración:** mapeo de eventos a feedback; snapshot profundo y de
  solo lectura; sin mutadores nuevos.
- **E2E / visual:** "!" en el paso de detección, aviso de alarma, radios con y
  sin `F1`, estado de huida y snapshot; capturas de juego normal y debug.
- **Regresión:** HUD, feedback de daño, movimiento y combate existentes; no se
  borran, saltan ni debilitan tests.
- **Manual:** revisar que el aviso no tapa el HUD ni bloquea el teclado.

# Evidencia esperada

- [ ] Informe en `artifacts/TASK-0038/attempt-1/report.md`.
- [ ] Salidas de `verify` y `test:e2e` en `attempt-1/`.
- [ ] Capturas en `attempt-1/screenshots/`.
- [ ] Commit SHA en la rama `task/TASK-0038`.

# Comandos

| Comando | Timeout |
|---|---:|
| `pnpm exec vitest run tests/unit/host` | 120 s |
| `pnpm run verify` | 180 s |
| `pnpm run test:e2e` | 180 s |
| `git diff --stat` | 15 s |

# Restricciones

- No cambiar reglas, percepción, alarma, IA ni valores de combate.
- No revelar `lastKnown`, radios ni estados internos fuera de `F1`.
- No añadir arte final, sprites nuevos ni dependencias.
- No tocar `experiments/` ni `docs/` salvo la documentación de la tarea.

# No objetivos

- E2E y QA visual completos del milestone (`TASK-0039`).
- Animaciones nuevas, arte final, sonido o HUD de equipo.
