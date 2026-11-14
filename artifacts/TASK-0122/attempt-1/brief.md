---
type: Task Brief
title: "TASK-0122: brief del intento 1"
description: Configuración de partida serializable y constructor único del estado inicial.
task: TASK-0122
attempt: 1
status: stable
brief_bytes: 2067
read_detail: true
generated: { by: deepseek/v4.1-flash, at: 2026-11-14T23:50:00Z }
---

# Objetivo

Que `src/game` reciba una `GameConfig` serializable —semilla y de 1 a 6 jugadores
ordenados, con arquetipo, variante `1|2` y nombre— y que un único
`createInitialState` construya el estado inicial; host, sesión y `Restart`
consumen ese mismo camino.

# No objetivos

- Menú, pantallas, resumen, hotseat, guardado, render por variante o spawn
  escalado.
- Cambiar fórmulas, roster, bestiario, balance, `Container` ni dependencias.

# Invariantes

- Motor puro: sin DOM, sin importar `src/host/`, sin relojes ni `Math.random`.
- Una sola construcción del estado inicial; sin rutas fijas paralelas.
- No borrar, saltar ni debilitar tests; los de un jugador conservan su intención.
- `GameConfig` y jugadores serializables; el orden de la lista es el turno 1..N.
- Validar antes de generar el mapa: error tipado y ningún estado parcial.
- El contrato concreto está en `brief-detalle.md`; leerlo antes de editar.

# Criterios de aceptación

`docs/tasks/TASK-0122-motor-configuracion-partida-constructor-unico.md#criterios-de-aceptación`.

# Contexto mínimo

- `src/game/engine.ts`, `types.ts`, `roster.ts`, `map.ts` (`spawns.party`,
  `normalizeSeed`).
- `src/host/session.ts`, arranque de `src/host/main.ts` y `src/host/debug.ts`.
- `tests/unit/game/engine.test.ts`, `tests/unit/game/integration.test.ts`,
  `tests/unit/host/session.test.ts`, `tests/unit/game/helpers.ts`.
- REQ-016 T-001/T-002/T-004 y R-013; REQ-031 T-001.

# Artefactos

`report.md`, `test-output.txt`, `verify-output.txt`, `commit.txt`; sin capturas
(no hay UI).

# Riesgos

- `Unit` y los fixtures cambian: la variante debe ser compatible y serializable.
- Si un test histórico cambia, conserva su aserción e intención.
- Timeouts: tests 120 s; `pnpm run verify` 240 s.
