---
type: Task Brief
title: "TASK-0160: brief del intento 1"
description: Partir el barrido A/B/C × 200 semillas de EXP-004 en tres tests por variante con timeout local de 15 s.
task: TASK-0160
attempt: 1
status: stable
brief_bytes: 2266
read_detail: false
generated: { by: deepseek/v4.1-flash, at: 2026-11-15T10:50:00Z }
---

# Objetivo

Sustituir el `it` de 200 semillas de `experiments/EXP-004-salas-irregulares/src/spawn.test.ts`
por tres tests equivalentes, uno por variante (`growth`, `bsp`, `templates`), con
200 semillas cada uno y timeout local de 15 s.

# No objetivos

- Reducir semillas, saltar comprobaciones ni tocar otros tests.
- Cambiar `vitest.config.ts`, `package.json`, workers o política de timeouts.
- Optimizar `generateMap` o mover el barrido a un script.

# Invariantes

- Solo se edita `spawn.test.ts` del experimento.
- Se conservan las cinco comprobaciones: `validateMap` vacío, componente global
  ≤ `ENEMY_MAX_COMPONENT`, enemigos ≤ `stats.enemy.total`, ambas métricas
  `hotspotRolls` iguales a `hotspotsTotal` y ≥1 enemigo por sala no-spawn.
- Etiquetas `${variant} · ${seed}` y 200 semillas por variante sin cambios.
- Timeout local de 15 s por test, con comentario del coste real y la contención
  de workers junto al timeout; sin cambios en aserciones ni en los 600 mapas.

# Criterios de aceptación

En `docs/tasks/TASK-0160-test-exp-004-barrido-por-variante.md`, sección
«Criterios de aceptación». Enlazar; no copiar.

# Contexto mínimo

- `spawn.test.ts`: el `it` afectado es «el barrido A/B/C × 200 semillas mantiene
  componente global ≤2, mínimo 1 y métricas»; usa `sweepSeeds` de 200 y un bucle
  de variantes. Medido en aislado: 3077 ms.
- `SEEDS` (20) alimenta otros tests; no reutilizarlo para el barrido.
- Vitest 5.1.0: opciones de test admiten `{ timeout }` como segundo argumento.
- Requisito: `docs/requirements/REQ-011-generador-densa-salas-irregulares.md#requisitos-creativos`
  (R-008/R-009).

# Artefactos

- `report.md`, `test-isolated-output.txt`, `test-run-1-output.txt`,
  `test-run-2-output.txt`, `verify-output.txt`.

# Riesgos y decisiones abiertas

- Ninguna decisión creativa. Si hace falta tocar el arnés, devolver `blocked`.
- El test debe pasar por aserciones, no por tiempo.
