---
type: Task Brief
title: "TASK-0042: brief del intento 1"
description: Implementar EXP-004 v3 (salas, spawn, enemigos interiores/emboscadas y salida) sin tocar producción.
task: TASK-0042
attempt: 1
status: stable
brief_bytes: 3266
read_detail: true
generated: { by: deepseek/v4.1-flash, at: 2026-11-09T12:32:59Z }
---

# Objetivo

Actualizar `EXP-004` a la v3 aprobada: mínimo de 3 salas, spawn no-mayor con
parejas, enemigos interiores con emboscadas y salida de nivel. Todo el código
vive en `experiments/EXP-004-salas-irregulares/`; producción no cambia.

# No objetivos

- No implementar el generador de producción, BSP, motor, HUD, combate, IA ni
  transición de nivel.
- No añadir dependencias, arte final, llaves ni varias salidas.
- No cerrar `REQ-011`, `REQ-012` ni `REQ-013`: el playtest decide.

# Invariantes

- Determinismo puro: sin `Math.random`, relojes ni estado global. Misma semilla,
  variante y opciones ⇒ mismo mapa, spawn, enemigos y salida.
- A/B/C conservan contrato serializable y conectividad al 100 %.
- No se borran, saltan ni debilitan tests. Los cambios de expectativa de la v2 se
  justifican por los requisitos v3 y se cubren con casos nuevos.
- `src/`, `tests/`, `index.html` raíz y `public/` no cambian.
- Todo comando con timeout explícito; servidores con puerto fijo, salud y cierre.

# Criterios de aceptación

Viven en [TASK-0042 § Criterios de aceptación](../../../docs/tasks/TASK-0042-exp-004-distribucion-emboscadas-salida.md#criterios-de-aceptación).
Enlazar; no copiar. El intento debe cubrir los 11 criterios.

# Contexto mínimo

- Código: `src/types.ts`, `src/generate.ts`, `src/spawn.ts`, `src/doors.ts`,
  `src/render.ts`, `src/main.ts`, `src/metrics.ts` y tests existentes.
- Requisitos: [REQ-011 v3](../../../docs/requirements/REQ-011-generador-densa-salas-irregulares.md#requisitos-creativos)
  (R-002, R-008), [REQ-012 v3](../../../docs/requirements/REQ-012-spawn-sala-protegida.md#requisitos-creativos)
  (R-001, R-002, R-009, R-014, R-015) y [REQ-013 v1](../../../docs/requirements/REQ-013-entrada-salida-exploracion.md#requisitos-creativos)
  (R-001–R-007).
- Evidencia v2: `artifacts/TASK-0041/attempt-2/` (informe, capturas,
  `capture.mjs`); reutilizar el método y regenerar evidencia.
- **Lee `brief-detalle.md`**: desglose técnico obligatorio (contrato, spawn,
  enemigos, salida, render, tests, capturas y riesgos).

# Artefactos

`artifacts/TASK-0042/attempt-1/`: `report.md`, `test-output.txt`,
`docs-check-output.txt`, `build-output.txt`, `verify-output.txt`,
`decision-example.json`, `capture.mjs`, `capture-log.txt`, `logs/` y
`screenshots/`. Actualizar `experiments/EXP-004-salas-irregulares/experiment.md`
(observaciones v3 y evidencia). No edites la tarea.

# Riesgos y decisiones abiertas

- **Escaleras:** no hay recorte documentado de `staircase down/up` y no se puede
  tocar `src/`; define el recorte en el experimento o dibuja una escalera
  programática legible y registra la desviación.
- **Caverna exacta de 3:** garantiza 2 anexos; ningún mapa puede quedar en 2.
- **Puerta de salida:** muro de borde no transitable; si no hay sala de borde a
  distancia ≥2, cae a `stairs-down` con aviso.
- **Handoff:** informe ≤4 KB; salidas completas en archivos aparte.
