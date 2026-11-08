---
type: Task Brief
title: "TASK-0030: brief del intento 1"
description: E2E y QA visual del combate con equipo, recogida, cambio de arma, HUD y determinismo.
task: TASK-0030
attempt: 1
status: stable
brief_bytes: 2492
read_detail: false
generated: { by: deepseek/v4.1-flash, at: 2026-11-08T20:00:00Z }
---

# Objetivo

Añadir un spec E2E nuevo que verifique en Chromium, con la semilla
`279837264`, el combate con equipo de REQ-010 y deje capturas e informe en
`artifacts/TASK-0030/attempt-1/`. Sin tocar producción.

# No objetivos

- Implementar o corregir motor, equipo, bestiario, HUD o feedback; cambiar
  reglas, valores, mapa, cámara o turnos.
- Modificar `src/`, `index.html`, `public/`, dependencias o `docs/`.

# Invariantes

- Solo se añaden tests E2E, helpers de test si hacen falta y artefactos.
- No se borran, saltan ni debilitan tests ni aserciones existentes.
- La semilla y los comandos reproducen impactos, daños y tiradas; prohibido
  `Math.random`.
- Las capturas van a `attempt-1/screenshots/` vía `E2E_ARTIFACTS_DIR`, sin
  tocar artefactos históricos. Viewport 1280×720 y sin tapar el mapa.
- Si falta un dato de producción, devuelve `blocked` con evidencia; no lo
  parchees.

# Criterios de aceptación

Viven en `docs/tasks/TASK-0030-e2e-qa-combate-equipo.md#criterios-de-aceptación`;
no copiar. Requisito:
`docs/requirements/REQ-010-combate-equipo-acierto-defensa.md#requisitos-creativos`.

# Contexto mínimo

- `tests/e2e/equipment-hud-qa.spec.ts`: patrón de HUD, armas, recogida, ataque y
  `F1`; capturas de referencia en `artifacts/TASK-0029/attempt-1/screenshots/`.
- `tests/e2e/support.ts` (`walkTo`, `approachEnemy`, `endTurn`, `snapshot`,
  `moveCursorTo`, `settle`), `artifacts.ts` y `game-input-hud.spec.ts` (victoria,
  derrota, semilla de referencia).
- `snapshot().weapons` y `AttackPerformed.rolls` exponen armas y tiradas.

# Artefactos

- `report.md`, `test-output.txt`, `verify-output.txt`, `screenshots/`, `logs/`.
- Commit SHA de `task/TASK-0030`.

# Riesgos y decisiones abiertas

- **Fricción conocida:** `walkTo` puede terminar con 0 MP y `G` se rechaza. Tras
  llegar al arma, espera turnos hasta `mp >= 1`; luego comprueba que `G` gasta
  exactamente 1 MP, no la acción, equipa y no duplica el arma.
- Sin baselines de píxeles nuevas: verifica por DOM y snapshot; las capturas son
  evidencia para el usuario.
- Determinismo: repite el guion en dos cargas y compara `AttackPerformed`,
  `rolls`, daños y secuencia de turnos.
