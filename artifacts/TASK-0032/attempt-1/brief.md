---
type: Task Brief
title: "TASK-0032: brief del intento 1"
description: Extraer ensureMp compartido y sustituir los dos bucles duplicados de espera de MP.
task: TASK-0032
attempt: 1
status: stable
brief_bytes: 1894
read_detail: false
generated: { by: deepseek/v4.1-flash, at: 2026-11-08T20:05:00Z }
---

# Objetivo

Añadir `ensureMp(page, minimum)` a `tests/e2e/support.ts` y usarlo en los dos
specs que hoy esperan MP con bucles locales, con el mismo número de turnos y
las mismas aserciones.

# No objetivos

- Cambiar producción, `playwright.config`, `package.json` ni dependencias.
- Garantizar MP dentro de `walkTo` o tocar combate/recogida.
- Añadir cobertura o capturas nuevas.

# Invariantes

- Solo se editan `tests/e2e/support.ts`, `tests/e2e/combat-equipment-qa.spec.ts`
  y `tests/e2e/equipment-hud-qa.spec.ts`.
- No se teletransporta ni se inyecta estado; solo `EndTurn` real y `settle`.
- No cambian aserciones, semillas, flujos ni el recuento de tests (63).
- El helper devuelve el `GameSnapshot` alcanzado y tiene guard de 8 turnos.

# Criterios de aceptación

Viven en `docs/tasks/TASK-0032-e2e-helper-mp.md`, sección «Criterios de
aceptación». Enlazar con ancla; no copiar.

# Contexto mínimo

- `tests/e2e/support.ts`: `snapshot`, `settle`, `endTurn`, `dispatchAccepted`;
  `ensureAdjacentWithMp` es el precedente de estilo con guard.
- `tests/e2e/combat-equipment-qa.spec.ts`: `waitForMp` en la línea ~158.
- `tests/e2e/equipment-hud-qa.spec.ts`: `while` inline en la línea ~69.
- Detalle del workaround original: `artifacts/TASK-0030/attempt-1/report.md`.

# Artefactos

- `artifacts/TASK-0032/attempt-1/report.md`
- `artifacts/TASK-0032/attempt-1/test-output.txt`, `verify-output.txt`

# Riesgos y decisiones abiertas

- Ninguna decisión creativa. Si el helper cambia el número de turnos o el
  mensaje de error de un test, es una desviación: repórtala.
