---
type: Task Brief
title: "TASK-0098: brief del intento 1"
description: E2E y QA visual del panel de inventario y equipo.
task: TASK-0098
attempt: 1
status: stable
brief_bytes: 2516
read_detail: true
generated: { by: deepseek/v4.1-flash, at: 2026-11-13T21:25:00Z }
---

# Objetivo

Un recorrido E2E nuevo que gestione inventario y equipo solo con teclado en
navegador real, con capturas legibles a 1280×720 y 900×700, y los specs que aún
esperan `G`/`1`-`3` realineados al panel sin perder cobertura.

# No objetivos

Reglas, costes, catálogo, UI, `src/game/**`, docs (TASK-0097), traits, cofres,
hotseat y artefactos históricos.

# Invariantes

- Sin hooks fuera de `?test=1`, sin dependencias nuevas.
- Teclado real y helpers de `tests/e2e/support.ts`; el estado del criterio se
  comprueba, no se inyecta para saltarse una regla.
- Conservar la intención de los tests de combate, movimiento y feedback; no
  borrar ni debilitar aserciones. Los rechazos se comprueban por estado y texto.

# Criterios de aceptación

Viven en `docs/tasks/TASK-0098-e2e-qa-inventario-equipo.md`, sección «Criterios
de aceptación».

# Contexto mínimo

- Baseline en `main`: `pnpm run verify` pasa (1249). Tres E2E fallan solo por
  `G`/`1`-`3` en `equipment-hud-qa`, `combat-equipment-qa` y `damage-types-qa`
  (líneas 105, 216 y 362).
- `tests/e2e/support.ts`: `openBspState`, `snapshot`, `ensureMp`, `walkTo`,
  `settle`, `advanceToCue`; `artifacts.ts`: `E2E_ARTIFACTS_DIR`.
- Panel: testids, comandos, fixtures y realineado exacto en
  `brief-detalle.md` (leerlo).
- [REQ-018](../../../docs/requirements/REQ-018-inventario-equipo.md#requisitos-técnicos)
  T-008 a T-010 y T-012; [REQ-017](../../../docs/requirements/REQ-017-feedback-visual-eventos.md)
  para cues; [REQ-006](../../../docs/requirements/REQ-006-movimiento-animado.md) para
  el bloqueo durante animaciones.
- Límite conocido: «Recoger» toma el primer objeto del tile; el panel lo advierte
  y «Equipar» elige la fila. Se asume y se cubre, no se rodea.
- Capturas 1280×720 y 900×700: panel abierto, mochila llena, arma a dos manos y
  suelo vacío, legibles sin ayuda.

# Artefactos

`artifacts/TASK-0098/attempt-1/`: informe, salidas, `screenshots/` y `logs/`.

# Riesgos

- A 900×700 el panel puede desbordar: captura y reporta; no cambies la UI.
- `--repeat-each=3` puede destapar flakes: usa esperas de cue/estado, nunca
  reintentos ni aserciones más laxas.
- Si un criterio choca con una regla, para y devuelve `blocked` con evidencia.
