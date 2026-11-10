---
type: Task Brief
title: "TASK-0056: brief del intento 1"
description: Guerrero por defecto, nombre y arquetipo en host, tests y smoke E2E.
task: TASK-0056
attempt: 1
status: stable
brief_bytes: 2558
read_detail: false
generated: { by: deepseek/v4.1-flash, at: 2026-11-10T00:08:01Z }
---

# Objetivo

Sustituir el jugador provisional por el Guerrero del roster (REQ-015; resistencia
0 → 1), mostrar nombre y arquetipo en HUD/debug y cubrirlo con unitarios y E2E.
Balance de enemigos/armas intacto.

# No objetivos

- `docs/**`: no lo edites; el lead prepara la propuesta documental.
- Pantalla de inicio, selección, edición de nombre o sprites (REQ-016).
- Fórmula, valores de enemigos/armas, dependencias nuevas, `src/game/` impuro.

# Invariantes

- El jugador por defecto sale de `createPlayerFromArchetype('warrior', ...)` con
  el spawn real del mapa (no `(0,0)`), conservando `id: 'player-1'`.
- Una única fuente de stats/equipo: `ROSTER`; los tests leen del catálogo.
- Si añades identidad de arquetipo al estado para el host, debe ser serializable
  y `null` en enemigos y fixtures; no dupliques valores.
- `weaponId: null` rechaza el ataque (`unarmed`); con arma se resuelve. No
  cambies la precedencia ni el consumo de RNG.
- No borres, saltes ni debilites tests.

# Criterios de aceptación

Viven en `docs/tasks/TASK-0056-guerrero-defecto-host-docs.md#criterios-de-aceptación`.
Enlazar; no copiar.

# Contexto mínimo

- `src/game/engine.ts`: `createPlayer`/`buildInitialState` crean al `Aventurero`
  provisional; pasa el spawn real al constructor del arquetipo.
- `src/game/roster.ts#createPlayerFromArchetype`: `id`, `position`, `name`.
- `src/host/hud.ts`: `HudModel`, `buildHudModel`, `createHudView`,
  `buildDebugModel`.
- Tests afectados: `roster.test.ts`, `hud.test.ts`, `equipment-hud-qa.spec.ts`,
  `combat-equipment-qa.spec.ts` y `game-input-hud.spec.ts`.
- [REQ-015](../../../docs/requirements/REQ-015-roster-arquetipos.md): «Stats inherentes»,
  «Equipo inicial», T-003/T-005/T-006.

# Artefactos

- `artifacts/TASK-0056/attempt-1/`: `report.md`, `test-output.txt`,
  `verify-output.txt`, `screenshots/` (HUD con nombre y arquetipo;
  `E2E_ARTIFACTS_DIR=artifacts/TASK-0056/attempt-1`), `logs/`.

# Riesgos y decisiones abiertas

- Mostrar el arquetipo: el estado no guarda id (TASK-0055). Elige la vía mínima
  (campo serializable o derivación del roster) sin duplicar stats.
- `weaponId` es nullable; no asumas arma.
- Reporta el texto documental que el lead deba proponer (glosario, diseño,
  arquitectura).
