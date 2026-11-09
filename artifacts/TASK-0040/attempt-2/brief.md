---
type: Task Brief
title: "TASK-0040: brief del intento 2"
description: Corregir la vista 13×13, hacer funcional el grosor de muro y cerrar el estado del experimento.
task: TASK-0040
attempt: 2
status: stable
brief_bytes: 3111
read_detail: true
generated: { by: deepseek/v4.1-flash, at: 2026-11-09T00:40:19Z }
---

# Objetivo

Corregir los hallazgos de la verificación del intento 1 sin rehacer el
experimento: puertas mal posicionadas en la vista 13×13, control de grosor de
muro inerte y estado de `experiment.md`. Mantén el contrato y los tests ya
aceptados.

# No objetivos

- No cambiar los criterios de aceptación ni las variantes A/B/C.
- No tocar `src/`, `tests/`, el `index.html` raíz ni `public/`.
- No decidir la variante ni cerrar `REQ-011`.

# Invariantes

- Determinismo y contrato intactos; no debilitar tests existentes.
- La vista 13×13 debe enseñar el mismo mapa y las mismas puertas que el mapa
  completo, con el origen correcto.
- Un control debe cambiar el resultado o no debe existir.

# Criterios de aceptación

Siguen en [la tarea](../../../docs/tasks/TASK-0040-exp-004-salas-irregulares.md#criterios-de-aceptación).

# Hallazgos a corregir

1. **Puertas en 13×13:** `render.ts` dibuja `door.x/y` en coordenadas absolutas;
   con `view.x/y > 0` las puertas se desplazan y aparecen sobre el margen negro.
   Evidencia: `attempt-1/screenshots/growth-seed-5-cavern-normal.png` (dos marcas
   naranjas fuera del tablero en la vista 13×13). Pasa la vista a `drawDoor` y
   resta el origen; descarta puertas fuera del viewport. Añade evidencia visual
   del 13×13 con puertas alineadas.
2. **Grosor de muro inerte:** `wallThickness` se resuelve pero no se usa. Cambiar
   `1` y `2` devuelve la misma huella en las tres variantes. Haz que afecte a la
   colocación/enlaces (gap mínimo o preferencia de 1-2 tiles), mantén las puertas
   directas y los tests; añade un test que demuestre huellas o gaps distintos y
   que el valor 2 no rompe el contrato. Si una combinación es imposible, avisa
   con `warnings` sin lanzar.
3. **Estado del experimento:** `experiments/EXP-004-salas-irregulares/experiment.md`
   sigue `experiment_status: proposed`. Actualízalo a `ready`, `updated_at` y
   añade una nota breve de construido/pendiente de playtest con enlace al
   informe. No decidas la variante.

# Contexto mínimo

- `attempt-1/report.md` y `attempt-1/brief.md`.
- `experiments/EXP-004-salas-irregulares/src/render.ts`, `generate.ts` y
  `src/render.ts`/`generate.ts` tests.
- [EXP-004](../../../experiments/EXP-004-salas-irregulares/experiment.md).

# Artefactos del intento 2

- `artifacts/TASK-0040/attempt-2/report.md`, `test-output.txt`,
  `docs-check-output.txt`, `build-output.txt`, `screenshots/` y
  `decision-example.json`.
- Commit en `task/TASK-0040` con el ID; no fusiones.

# Riesgos y decisiones abiertas

- El pasillo ancho de C queda en 20 % en 30 semillas (objetivo ~1/3); el
  agregado A/B/C está en 25,6 %. Si es barato, súbelo; si no, documéntalo como
  desviación conocida, no como criterio fallido.
- Cualquier duda creativa se deja abierta.
