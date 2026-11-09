---
type: Task
id: TASK-0043
title: "Motor: modelo de mapa de producción con máscaras y spawn de grupo"
description: Ampliar el modelo serializable de mapa con máscaras de sala, puertas entre dos salas, pasillos con roomA/roomB, spawnRoomId/party, entrada/salida y enemigos, manteniendo BSP y sus tests.
status: stable
task_status: done
task_type: feature
requirement: REQ-011
requirement_ids: [R-003, R-004, R-005, R-008, T-001, T-003, T-004, T-011, T-012, T-013]
depends_on: []
unlocks: [TASK-0044]
created_at: 2026-11-09T15:30:00Z
completed_at: 2026-11-09T15:52:09Z
assignee: task-runner
attempts: 1
artifacts: artifacts/TASK-0043/
priority: P1
risk: high
review_required: true
generated: { by: deepseek/v4.1-flash, at: 2026-11-09T15:30:00Z }
verified:
  - by: task-lead
    at: 2026-11-09T15:52:09Z
    note: >-
      Intento 1 verificado en task/TASK-0043 (commits 2e14c7d, 9e70064 y
      b20ad1b; fusión 76f9a7e). Diff completo revisado: solo
      src/game/map.ts, src/game/bsp.ts, src/game/engine.ts, un test nuevo y
      artefactos; sin tocar src/host/, experiments/, index.html ni
      dependencias. BSP sigue inyectable, determinista, con id 'bsp' y sin
      cambios de geometría ni huecos. Lead re-ejecutó `pnpm run verify`
      (635/635 tests, docs/config y build OK) y las suites dirigidas (93/93);
      la generación de referencia mide ~2,7 ms. No se borraron, saltaron ni
      debilitaron tests. Los campos nuevos son opcionales para fixtures
      legacy, pero BSP y todo mapa generado los rellenan y los tests lo
      exigen; entrance/exit/enemies quedan como tipos opcionales.
---

# Objetivo

Que el modelo de `src/game/map.ts` soporte el mapa denso de
[REQ-011 v4](../requirements/REQ-011-generador-densa-salas-irregulares.md#requisitos-técnicos)
sin romper BSP: salas con máscara y caja, puertas entre dos salas, pasillos con
extremos, spawn de grupo, entrada/salida y enemigos generados por el mapa.

# Contexto

- Modelo actual: `src/game/map.ts`, `src/game/bsp.ts` y `src/game/enemy-placement.ts`.
- Consumidores: `src/game/engine.ts`, `src/host/floor.ts`, `hud.ts` y `debug.ts`.
- Referencia del contrato: `experiments/EXP-004-salas-irregulares/src/types.ts`.
- BSP debe seguir siendo inyectable y conservar sus tests.

# Criterios de aceptación

- [ ] `Room` conserva `x`, `y`, `width` y `height` como caja y añade `cells`
      (máscara ordenada) y `area`. `roomContains` y `roomAt` usan la máscara.
- [ ] BSP rellena máscaras rectangulares; una celda de la caja que no es suelo no
      pertenece a ninguna sala. El estado sigue siendo serializable.
- [ ] `Corridor` expone `id`, `roomA`, `roomB`, `cells` y `length` sin romper
      `fromRoomId`/`toRoomId`, `width`, `kind` y `path`.
- [ ] `Door` expone `id`, `style`, `roomA`, `roomB`, `direct` y `corridorId`; una
      puerta siempre conecta dos salas distintas. BSP mantiene sus huecos.
- [ ] `Spawns` expone `roomId` y `party` (6 posiciones) con `player` como alias de
      `party[0]`; `enemy` y `distance` se conservan como datos heredados.
- [ ] `GeneratedMap` admite `entrance`, `exit` y `enemies` serializables; son
      opcionales para mapas construidos a mano en tests.
- [ ] Los validadores de `validateGeneratedMap` entienden máscaras y no debilitan
      las comprobaciones de BSP.
- [ ] `pnpm run verify` pasa; no se borran, saltan ni debilitan tests.

# Plan de test

- **Unitario:** pertenencia a máscara, celda de caja sin suelo, serialización,
  alias `player`, puertas entre salas y pasillos con extremos.
- **Integración:** `createInitialState` con BSP inyectado sigue arrancando y sus
  spawns conservan el contrato heredado.
- **Regresión:** `tests/unit/game/map.test.ts`, `map-integration.test.ts` y
  `engine.test.ts` sin cambios de intención.

# Evidencia esperada

- [ ] Informe en `artifacts/TASK-0043/attempt-1/report.md`.
- [ ] Salida de `pnpm run verify` en `attempt-1/`.
- [ ] Commit SHA en `task/TASK-0043`.

# Restricciones

- No implementar aún `growth`, el spawn nuevo ni la salida.
- No tocar `src/host/`, `experiments/`, `index.html` ni dependencias.
- No usar `Math.random`, relojes ni estado global.

# No objetivos

- Generador `growth` (`TASK-0046`), colocación nueva (`TASK-0045`), host
  (`TASK-0048`), bundle (`TASK-0047`) y QA (`TASK-0049`).
- Cámara secreta, transición de nivel o cooperativo.
