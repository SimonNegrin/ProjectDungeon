---
type: Task Brief
title: "TASK-0176: brief del intento 2"
description: Renovar el fixture de victoria E2E para la densidad de REQ-012 v5 y cerrar la suite sin regresiones.
task: TASK-0176
attempt: 2
status: stable
brief_bytes: 0
read_detail: false
generated: { by: deepseek/v4.1-flash, at: 2026-11-16T20:33:00Z }
---

# Objetivo

Cerrar el criterio 4 de la ficha: la suite E2E completa vuelve a 292/292 sin
tocar `src/`, renovando el fixture de victoria que quedó caducado con la
densidad de REQ-012 v5.

# Criterio incumplido y evidencia

- Criterio 4: «Sin regresiones en la suite E2E existente».
- `attempt-1/report.md`: 290/292; fallan `host-result-qa.spec.ts:145` y
  `pause-save-load-qa.spec.ts:751`. Reproducido sin el spec nuevo
  (`attempt-1/e2e-fallos-base.txt`).

# Hipótesis nueva

La semilla 79 se documentó como victoria cuando un jugador recibía 11 enemigos
(7/2/2). Con `P = 1` el mapa tiene 5 (3/1/1) y la política codiciosa de
`defeatAllEnemies` termina en derrota. El fallo es del fixture, no del motor:
otra semilla con la misma política debe ganar. Si tras una búsqueda razonable
ninguna gana, no toques la política ni el helper: reporta `blocked` con los
datos y la propuesta.

# Invariantes

- La victoria se alcanza por comandos reales desde el menú, sin `?test=1` ni
  estado inyectado.
- No se relajan aserciones de resultado, pausa, guardado o carga.
- No se toca `src/` ni la densidad; el spec nuevo sigue igual.
- Un solo fixture: `WIN_GAME_SEED` y el literal de `host-result-qa` deben quedar
  coherentes.

# Contexto mínimo

- `tests/e2e/support.ts`: `WIN_GAME_SEED = 79` y `winGame`.
- `tests/e2e/host-result-qa.spec.ts`: `PLAY_SEED = 79` (dos usos).
- `tests/e2e/pause-save-load-qa.spec.ts`: consume `WIN_GAME_SEED`.
- Ficha: criterio 4 de `docs/tasks/TASK-0176-qa-densidad-party-real.md`.
- Intento anterior: `artifacts/TASK-0176/attempt-1/report.md`.

# Alcance

`tests/e2e/support.ts`, `tests/e2e/host-result-qa.spec.ts` y, solo si el literal
lo exige, `tests/e2e/pause-save-load-qa.spec.ts`. Además del spec nuevo, la
evidencia de la suite completa.

# Artefactos

`attempt-2/report.md`, `verify-output.txt`, `e2e-full-output.txt`, y las
capturas del spec de densidad del intento 1 siguen sirviendo.

# Riesgos

Buscar semillas a ciegas es lento. Reproduce la política del bot en Node sobre
el motor para cribar y confirma el candidato con el flujo E2E real; documenta la
semilla elegida y el motivo en `support.ts`.
