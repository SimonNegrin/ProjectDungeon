---
type: Task Brief
title: "TASK-0040: detalle del brief del intento 2"
description: Correcciones concretas de render, grosor de muro y estado del experimento.
task: TASK-0040
attempt: 2
status: stable
read_detail: false
generated: { by: deepseek/v4.1-flash, at: 2026-11-09T00:40:19Z }
---

# Corrección 1: puertas en la vista 13×13

`drawMap` ya calcula `offsetX`/`offsetY` para el origen `view.x`/`view.y`, pero
`drawDoor` recibe solo el offset y pinta `door.x * tile`. En la vista completa
`view.x = 0` y funciona; en la vista 13×13 se desplaza. Cambia la firma para
pasar `view` y pinta `(door.x - view.x) * tile`, `(door.y - view.y) * tile`.
Antes de dibujar, salta puertas fuera de `view`. Lo mismo aplica al estilo de
debug y a cualquier otra capa de puertas.

Verifica con una semilla cuyo spawn no esté pegado al borde (por ejemplo la de
referencia `279837264`) que las puertas de la vista 13×13 coinciden con las del
mapa completo. Añade una captura de la vista 13×13 y otra del mapa completo en
`attempt-2/screenshots/`.

# Corrección 2: grosor de muro

Hoy `resolveOptions` guarda `wallThickness` y nadie lo lee. Opciones válidas,
de menor a mayor riesgo:

- En `findLink`, descartar o penalizar enlaces cuyo hueco de muro sea menor que
  `wallThickness`; con `wallThickness = 2`, preferir pares separados por 2
  tiles y avisar si no hay ninguno. Mantén al menos una puerta directa o un
  pasillo corto por mapa.
- O en la colocación de cajas, imponer un gap mínimo de `wallThickness` entre
  salas no conectadas y relajar con aviso si el mapa no cabe.

Añade a `contract.test.ts` o `shapes.test.ts` un caso que compare `wallThickness:
1` y `2` y compruebe que el resultado cambia (huella, `sharedWalls` o gaps) sin
romper conectividad, longitudes 0-3, spawn ni enemigos. No cambies los tests
existentes para que pasen; añade casos.

# Corrección 3: experiment.md

Actualiza el frontmatter de `experiments/EXP-004-salas-irregulares/experiment.md`:

- `experiment_status: ready`
- `updated_at: 2026-11-09T...Z`
- En `# Observaciones`, sustituye “Pendiente de construir y probar” por una nota
  de construido, con las capturas y el informe de `attempt-2`; deja la decisión
  abierta.
- En `# Evidencia`, enlaza el informe y las capturas.

No toques `decision`, `decided_by` ni `decided_at`; la decisión sigue abierta.

# Verificación

- `pnpm run test`, `pnpm run docs:check`, `pnpm run build` con timeouts.
- Revisa que `wallThickness` cambia el mapa y que el 13×13 no tiene puertas
  desplazadas.
- Guarda las salidas y el informe del intento 2; no fusiones.
