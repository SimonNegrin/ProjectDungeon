---
type: Task Brief
title: "TASK-0138: brief del intento 1"
description: Esquema v1, manifiesto y round-trip determinista del estado.
task: TASK-0138
attempt: 1
status: stable
brief_bytes: 2334
read_detail: true
generated: { by: deepseek/v4.1-flash, at: 2026-11-15T19:05:00Z }
---

# Objetivo

Que el motor construya y acepte un guardado v1 completo y determinista, con
manifiesto validable y validación estricta previa, sin recalcular botín ni
alterar el RNG. Contrato de campos y validación en `brief-detalle.md`.

# No objetivos

- `.zip`, descarga, selectores, pausa, menús o UI.
- Presentación, ADR-028, migraciones o cambios de reglas/`Container`/ids/RNG.
- Cambiar botín, muerte, mapa o balance.

# Invariantes

- Nuevo `src/game/save.ts` puro: sin `src/host/**`, DOM, red ni relojes.
- `format_version: 1`; versión desconocida rechazada.
- Validación estricta de ambos JSON: sin `eval`/`Function`, sin campos extra ni
  tipos erróneos, sin tocar el estado.
- `lootable`, `kind`/`corpseOf`, `ghost`, IA, maná, hechizos y contenedores se
  copian tal cual; al cargar no se tira botín.
- `round` es el turno del motor; `turn` puede ser alias del mismo valor. Fase
  `player | enemy`.
- `game_version` y `created_at` entran por parámetro. No debilitar tests.

# Criterios de aceptación

En `docs/tasks/TASK-0138-motor-esquema-v1-manifiesto-round-trip.md#criterios-de-aceptación`.

# Contexto mínimo

- `src/game/types.ts`, `config.ts`, `inventory.ts`, `death.ts`, `map.ts`,
  `rng.ts` y el constructor de `engine.ts`.
- `src/host/save-zip.ts` fija el sobre `{ manifest, save }`; no editarlo.
- REQ-024 [formato v1](../../../docs/requirements/REQ-024-menu-pausa-guardado.md#formato-de-guardado-v1)
  y [T-001/T-002/T-004/T-005](../../../docs/requirements/REQ-024-menu-pausa-guardado.md#requisitos-técnicos);
  REQ-034 [T-004/T-007](../../../docs/requirements/REQ-034-objetos-saqueables-botin-enemigos.md#requisitos-técnicos).

# Artefactos

`report.md`, `test-output.txt`, `verify-output.txt`, `commit.txt` y
`tests/unit/game/save-schema.test.ts`.

# Riesgos

- Opcionales: conservar presencia/ausencia, no normalizar.
- `map` es grande; validar sin abrir huecos a campos extra.
- No hay allocator de ids: serializa los ids existentes, no inventes contadores.
- Timeouts: focalizados 120 s; `pnpm run verify` 240 s.
