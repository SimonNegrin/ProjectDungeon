---
type: Task Brief
title: "TASK-0039: brief del intento 1"
description: E2E y QA visual de percepción, alarma y huida con comandos reales.
task: TASK-0039
attempt: 1
status: stable
brief_bytes: 2208
read_detail: true
generated: { by: deepseek/v4.1-flash, at: 2026-11-08T22:40:00Z }
---

# Objetivo

Cubrir con Playwright y la semilla `279837264` la detección por paso, la alarma
sin cadena, el daño como despertador, la huida determinista y el feedback de
[REQ-009](../../../docs/requirements/REQ-009-percepcion-alarma-huida.md).
Verificar colocación de 4 enemigos, determinismo y snapshot de solo lectura, sin
tocar reglas ni debilitar tests.

# No objetivos

- Implementar percepción, alarma, IA o feedback (TASK-0034 a 0038).
- Cambiar combate, bestiario, economía de turno, arte o dependencias.
- Reescribir o relajar los E2E existentes.

# Invariantes

- `src/game/` sigue puro; sin cambios de reglas.
- Teclado y `dispatch` comparten `GameSession`.
- Semilla fija; sin `Math.random`; sin esperas fijas si hay estado.
- Tests existentes con su intención; no se borran, saltan ni debilitan.
- Capturas 1280×720 con `E2E_ARTIFACTS_DIR`.

# Criterios de aceptación

En
[TASK-0039](../../../docs/tasks/TASK-0039-e2e-qa-percepcion-alarma-huida.md#criterios-de-aceptación);
no copiar.

# Contexto mínimo

- `tests/e2e/support.ts` y `artifacts.ts`; `perception-host-qa.spec.ts` y
  `combat-equipment-qa.spec.ts` como patrón; no los debilites.
- `src/host/debug.ts`, `main.ts`, `session.ts` para el hook mínimo.
- Escenarios, coordenadas y justificación del hook: `brief-detalle.md`
  (`read_detail: true`).

# Artefactos

- `report.md`, `test-output.txt`, `verify-output.txt`, `e2e-output.txt`,
  `e2e-repeat-output.txt`, `screenshots/`, `logs/`.
- Capturas por spec en `<spec>/screenshots/` dentro de `attempt-1/`.
- Commit SHA en `task/TASK-0039`.

# Riesgos y decisiones abiertas

- Atacar a un dormido, el 8/9 exacto, la huida renovada y el acorralamiento no
  son alcanzables sin hook. Usa el hook mínimo de `brief-detalle.md`, solo host
  y con `?test=1`; regístralo como desviación.
- No cambies reglas para hacer pasar un test; si no se puede montar, para y
  reporta con evidencia.
