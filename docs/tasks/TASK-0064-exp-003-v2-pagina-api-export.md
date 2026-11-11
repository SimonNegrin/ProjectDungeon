---
type: Task
id: TASK-0064
title: "EXP-003 v2.0: página, API y export de la mesa"
description: Convertir el motor v2.0 en una página interactiva con semilla, 1.000 duelos, tabla de emparejamientos, detalle de métricas, export JSON y API de test.
status: stable
task_status: done
task_type: experiment
requirement: REQ-027
requirement_ids: [REQ-025, REQ-026, REQ-027]
depends_on: [TASK-0063]
unlocks: []
created_at: 2026-11-11T15:50:00Z
completed_at: 2026-11-11T16:04:00Z
assignee: task-runner
attempts: 1
artifacts: artifacts/TASK-0064/
priority: P1
risk: low
review_required: false
generated: { by: deepseek/v4.1-flash, at: 2026-11-11T15:50:00Z }
verified:
  - by: task-lead
    at: 2026-11-11T16:04:00Z
    note: >-
      Verificación independiente en task/TASK-0064, fusionada en main. Diff
      limitado a la página del experimento, helpers `ui.ts`/`ui.test.ts`,
      `measure.ts`/`measure.test.ts`, el e2e migrado, artefactos y esta ficha;
      `src/` de producción, la v1, `experiment.md`, package.json, lockfile y
      docs ajenos intactos. Re-ejecutado por el lead: `pnpm run verify` OK
      (docs 330, config OK, 903/903, build y bundle) y 4/4 e2e de
      `experiment-combat`. Capturas y export revisados; mismo seed/duelos da el
      mismo snapshot y los 12 emparejamientos siguen fuera de la banda
      40–60 % (96,3–100 %).
---

# Objetivo

Convertir el motor de [TASK-0063](TASK-0063-exp-003-v2-motor-medicion.md) en la
página de la v2.0 de EXP-003: controles de semilla y número de duelos, tabla de
los 12 emparejamientos, detalle de acciones/hechizos/réplicas, export JSON
reproducible y API `window.__experiment` para tests. La página no decide los
valores; mide y deja exportar.

# Criterios de aceptación

- [x] `experiments/EXP-003-mesa-combate/index.html` y su entrada de `src/`
      cargan la v2.0 sin romper el arranque de Vite.
- [x] La cabecera muestra id, pregunta y una nota de que los valores de balance
      están pendientes de aprobación del usuario.
- [x] Controles: semilla editable, número de duelos (por defecto 1.000) y botón
      de ejecutar; cambiar semilla o duelos recalcula sin recargar.
- [x] Tabla de 12 emparejamientos con victorias del héroe y del enemigo, banda
      40–60 %, turnos/rondas, TTK, réplicas disparadas/impactos/muertes,
      hechizos, maná gastado y daño.
- [x] Detalle por emparejamiento con acciones por tipo, hechizos por id, maná no
      gastado, PV restantes y distribución de duración.
- [x] Export JSON con versión de catálogo, semilla, escenario, catálogo y
      métricas; botones de copiar y descargar.
- [x] `?test=1&seed=1017` es determinista y `window.__experiment` expone
      `getSeed`, `setSeed`, `getDuels`, `setDuels`, `runAll`, `getResults`,
      `snapshot`, `getDecision` y `reset`.
- [x] Tests del experimento y `pnpm run docs:check` pasan; sin dependencias
      nuevas ni cambios en `src/` de producción.

# Plan de test

- Unitario: helpers de formato y agregación usados por la UI.
- Integración: API de test en modo determinista, misma semilla mismo snapshot.
- E2E / visual: abrir la página, ejecutar, cambiar semilla y exportar; captura
  si se levanta el servidor.
- Manual: leer la tabla y el detalle; comprobar que el export se puede volver a
  ejecutar.

# Evidencia esperada

- [x] Informe en `artifacts/TASK-0064/attempt-1/report.md`
- [x] `test-output.txt` y `docs-check-output.txt`
- [x] Captura de la tabla y del detalle si hay servidor
- [x] Commit SHA

# Restricciones

- No editar `src/` de producción, `docs/harness/**` ni plantillas.
- No añadir dependencias ni arte.
- No editar `experiment.md`; lo actualiza `requirements-writer`.
- No fijar valores de balance en la UI: solo mostrarlos y exportarlos.

# No objetivos

- Cambiar el motor o las reglas de TASK-0063.
- Grupos 2v2, posiciones 2D, estados alterados o arte.
