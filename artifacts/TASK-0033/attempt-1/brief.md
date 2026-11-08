---
type: Task Brief
title: "TASK-0033: brief del intento 1"
description: Snapshot de depuración con copia profunda de unidades y RNG de solo lectura.
task: TASK-0033
attempt: 1
status: stable
brief_bytes: 2090
read_detail: false
generated: { by: deepseek/v4.1-flash, at: 2026-11-08T20:05:00Z }
---

# Objetivo

`window.__game.snapshot()` devuelve una copia profunda y serializable: cada
unidad clona `modifiers`, `equipment` y `weapons`, y se añade `rng: { seed,
state }` de solo lectura que coincide con `state.rng` antes y después de cada
comando.

# No objetivos

- Tocar `src/game/` (motor, reglas, RNG, equipo), HUD, `index.html`, `public/`
  ni dependencias.
- Cambiar comandos de debug, artefactos visuales o comportamiento de juego.
- Añadir mutadores o escritura sobre el estado vivo.

# Invariantes

- Solo `src/host/debug.ts`, los tipos del snapshot y
  `tests/unit/host/debug.test.ts`.
- `rng`, `modifiers`, `equipment` y `weapons` del snapshot no comparten
  referencias con el estado; `JSON.parse(JSON.stringify(snapshot))` los
  conserva.
- Los tests existentes conservan su intención y no se debilitan.
- `pnpm run verify` y `pnpm run test:e2e` pasan.

# Criterios de aceptación

Viven en `docs/tasks/TASK-0033-host-snapshot-profundo-rng.md`, sección
«Criterios de aceptación». Enlazar con ancla; no copiar.

# Contexto mínimo

- `src/host/debug.ts`: `GameSnapshot` (línea ~52), `cloneUnit` con `{ ...unit }`
  (línea ~119) y `buildSnapshot` (línea ~161).
- `src/game/types.ts`: `RngState` y `Unit` ya son serializables.
- `docs/requirements/REQ-010-combate-equipo-acierto-defensa.md#requisitos-técnicos`:
  T-002 y T-003.
- `tests/unit/host/debug.test.ts`: `setup`, `generatedSetup` y el bloque de
  armas del mapa como precedente.

# Artefactos

- `artifacts/TASK-0033/attempt-1/report.md`
- `artifacts/TASK-0033/attempt-1/test-output.txt`, `verify-output.txt`,
  `e2e-output.txt`

# Riesgos y decisiones abiertas

- Ninguna decisión creativa. Si el tipo `readonly` no impide la mutación en
  runtime, el test debe cubrirla mutando el snapshot, no el tipo.
