---
type: Task Brief
title: "TASK-0038: brief del intento 1"
description: Feedback de percepción/alarma en el host y snapshot de solo lectura.
task: TASK-0038
attempt: 1
status: stable
brief_bytes: 3277
read_detail: false
generated: { by: deepseek/v4.1-flash, at: 2026-11-08T23:05:00Z }
---

# Objetivo

Presentar la percepción y la alarma con los eventos del motor: "!" sobre el
enemigo que detecta en el paso de `EnemySpotted`, aviso breve de `AlarmRaised`,
radios de visión/alarma solo con `F1`, y completar el snapshot de solo lectura.
El host sigue siendo presentación y no decide reglas.

# No objetivos

- Motor, percepción, alarma, IA, valores de combate, bestiario o arte final.
- E2E/QA completo del milestone (TASK-0039); aquí solo un E2E focal.
- Dependencias, `experiments/` o documentación ajena a la tarea.

# Invariantes

- El host no muta el estado ni añade reglas. El "!" sale solo de `EnemySpotted`;
  los receptores de una onda sin `EnemySpotted` no lo muestran. Persiste
  mientras el detector siga `alert` y se oculta al pasar a `returning`/`dormant`,
  morir, reiniciar o cambiar semilla.
- `AlarmRaised` muestra un aviso textual breve y no bloqueante que no tapa el
  HUD; input y turno siguen funcionando.
- Los radios de visión (6/4/5 de `BESTIARY`/`perception`) y alarma (8) se dibujan
  solo con `F1`. Sin `F1` no hay radios ni líneas de visión permanentes. La
  visibilidad debe ser verificable (DOM/`data-testid` o snapshot) y en captura.
- Se conservan HUD, cursor, feedback de combate/daño/equipo y overlay de debug.
  No se borran, saltan ni debilitan tests.
- `window.__game.snapshot()` expone los 4 enemigos con `awareness`, `fleeing`,
  `home`, `lastKnown`, `alertTurns` y `hasShouted`, en solo lectura. Clonar
  `home` y `lastKnown` (hoy se comparten por referencia) y probar que mutarlos no
  altera el estado vivo. Sin mutadores nuevos.

# Criterios de aceptación

Viven en [TASK-0038](../../../docs/tasks/TASK-0038-host-feedback-percepcion-alarma.md#criterios-de-aceptación).
Enlazar; no copiar.

# Contexto mínimo

- `src/host/main.ts`: `applyCommand`, `fireFeedbacks`, `render`, `debugView`,
  `noticeView`; `feedback.ts`, `hud.ts`, `debug.ts` (`cloneUnit`/snapshot),
  `renderer.ts`; `index.html` (marker/radios DOM/CSS si hace falta).
- Eventos: `EnemySpotted`, `AlarmRaised`, `EnemyFled`, `EnemyReturned` en
  `src/game/types.ts`. Requisito: R-011, R-012, T-003, T-008.
- Riesgo TASK-0035: un alertado por onda que luego ve no reemite
  `EnemySpotted` (`perception.test`). Decisión del lead: no cambiar percepción;
  el criterio cubre al detector que inicia el episodio. Documentar la limitación.

# Artefactos

`artifacts/TASK-0038/attempt-1/`: `report.md`, `test-output.txt`,
`verify-output.txt`, `e2e-output.txt`, `screenshots/<spec>/screenshots/`, `logs/`.
`pnpm run verify` (180 s) y `pnpm run test:e2e` (180 s) con
`E2E_ARTIFACTS_DIR=artifacts/TASK-0038/attempt-1` y viewport 1280×720; informe
con salidas y commit SHA.

# Riesgos y decisiones abiertas

- No añadir eventos ni tocar `src/game/`; si el "!" requiere más, reportar.
- Tests deterministas con `dispatch`/`advance`, sin timers.
- Si un test legacy cambia por el nuevo DOM/canvas, ajustar solo el supuesto,
  nunca la intención ni los criterios.
