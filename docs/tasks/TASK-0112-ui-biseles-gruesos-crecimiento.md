---
type: Task
id: TASK-0112
title: "UI: biseles de 2× línea y crecimiento hacia fuera"
description: "Aplicar un bisel de 2× la línea base a todos los outset/inset, sin reducir el área interior ni desplazar el contenido."
status: stable
task_status: in_progress
task_type: feature
requirement: REQ-033
requirement_ids: [R-006, R-025, T-002, T-015]
depends_on: []
unlocks: [TASK-0114, TASK-0116, TASK-0117]
created_at: 2026-11-14T15:30:34Z
completed_at:
assignee: task-runner
attempts: 0
artifacts: artifacts/TASK-0112/
priority: P1
risk: medium
review_required: true
generated: { by: deepseek/v4.1-flash, at: 2026-11-14T15:30:34Z }
verified:
---

# Objetivo

Que todos los biseles `outset` e `inset` de la UI de juego midan 2× la línea base
y ganen el grosor hacia fuera, de modo que el área interior de las cajas no se
reduzca. El cursor del mapa conserva su ancho.

# Contexto

REQ-033 v7 R-025 y T-015 suben el relieve de 1× a 2× `--ui-line`. Con
`box-sizing: border-box`, un borde más grueso roba espacio interior; la
implementación debe compensarlo sin cambiar la posición del contenido. El token
de escala y la paleta no cambian.

# Criterios de aceptación

- [ ] Existe un token de bisel igual a `2 × --ui-line` y todos los `.ui-outset`,
      `.ui-inset`, el marco exterior y los componentes con bisel lo consumen; no
      queda ningún bisel de UI a 1×.
- [ ] El grosor crece hacia fuera: el rectángulo interior de HUD, zonas, ficha,
      columnas, slots, botones y submenú conserva tamaño y posición (±1 px) antes
      y después del cambio.
- [ ] A 900×700 el bisel mide ≈3 px y a 1280×720 escala de forma continua; no hay
      saltos de 1 px por umbral.
- [ ] No aparecen solapes, recortes ni Content Shift en el marco, las columnas,
      los títulos ni los slots.
- [ ] El cursor del mapa mantiene su ancho de `2 × --ui-line`.
- [ ] Los tests de relieve existentes se adaptan al grosor nuevo sin retirar
      cobertura.

# Plan de test

- Unitario: cálculo del token de bisel desde la escala y `--ui-line`.
- Integración: `pnpm run verify`; medición de rectángulos interiores y exteriores
  de las cajas representativas.
- E2E: geometría a 900×700 y 1280×720; comprobación de que el área interior no
  cambia y de que no hay CLS.
- Manual: revisar el peso visual del marco, HUD y panel a ambos tamaños.

# Evidencia esperada

- [ ] Informe en `artifacts/TASK-0112/attempt-1/report.md`
- [ ] Salida de `pnpm run verify` y del E2E
- [ ] Capturas a 900×700 y 1280×720
- [ ] Commit SHA

# Restricciones

- Sin cambios de color, contenido, layout, navegación ni reglas.
- Sin tocar el ancho del cursor del mapa ni el render del mundo.
- Sin arte nuevo ni dependencias nuevas.
- No se debilitan tests existentes.

# No objetivos

- Apariencia o movimiento del cursor del panel (TASK-0116).
- Alineación del panel y figura (TASK-0114).
- Siluetas de slots vacíos (TASK-0115).
- QA visual final (TASK-0117) y documentación (TASK-0118).
