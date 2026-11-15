---
type: Task Brief
title: "TASK-0148: brief del intento 1"
description: Resurrección de motor por cadáver concreto, índice de ronda y recursos.
task: TASK-0148
attempt: 1
status: stable
brief_bytes: 2487
read_detail: false
generated: { by: task-lead, at: 2026-11-15T23:56:18Z }
---

# Objetivo

Que `resurrection-4` devuelva a un jugador muerto concreto a la vida en la
casilla de su cadáver con las condiciones de REQ-021 v4, y que el resucitado
actúe según REQ-031 R-014 con recursos restaurados.

# No objetivos

- Host, menú, HUD, feedback o E2E visual.
- Objetos de resurrección, huecos de equipo o contenido nuevo.
- Cambiar coste, nivel, PV, wipe ni reglas de REQ-021/REQ-031.

# Invariantes

- Motor puro en `src/game/`: sin DOM, red, dependencias ni `Math.random`.
- Un intento inválido no muta estado ni consume maná, acción ni RNG.
- `hp === 0` sigue siendo la única señal de muerte; no se resucitan enemigos.
- No debilitar tests; conservar la intención de REQ-009/010/017/021/026/031.
- No tocar `docs/requirements/**`, `docs/harness/**`, `AGENTS.md`,
  `.opencode/**` ni el host salvo tipos imprescindibles.

# Criterios de aceptación

Viven en [TASK-0148](../../../docs/tasks/TASK-0148-motor-resurreccion-indice-recursos.md#criterios-de-aceptación).

# Contexto mínimo

- `src/game/magic.ts` ya resuelve `resurrect`: revisa validación, marca de
  fantasma, cadáver y comando. `spells.ts` fija nivel 4, coste 8 y rango 1.
- `death.ts`, `grid.ts` e `inventory.ts`: cadáver `Container` con `corpseOf`;
  `isGhost`/`isOccupied` derivan el estado.
- `turn.ts`: `restorePlayerTurn`, `resolveEndTurn` y orden por índice.
- `types.ts`: `CastSpell` apunta a casilla; REQ-021 R-009 exige cadáver concreto.
  Añade un selector opcional compatible (p. ej. `targetId`).
- Tests: `tests/unit/game/{magic,engine,turn}.test.ts` y `helpers.ts`;
  REQ-021 v4 R-008 a R-013/T-006 y REQ-031 R-014/T-003.

# Artefactos

- `artifacts/TASK-0148/attempt-1/report.md`, `test-output.txt`,
  `verify-output.txt`, `logs/`.
- Commit(s) con el ID de tarea.

# Riesgos y decisiones abiertas

- El destino concreto no está en la API actual: selección opcional sin romper
  llamadas existentes.
- El ciclo del `Container` del cadáver al resucitar no está fijado: conserva el
  estado actual y no inventes transferencia de objetos; anótalo en el informe.
- E2E completa ~3,9 min y puerto 4173: no la ejecutes salvo petición del lead; si
  aplica, en serie con `--workers=1`.
