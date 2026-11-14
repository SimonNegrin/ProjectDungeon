---
type: Task
id: TASK-0104
title: "UI: escala continua, paleta y relieve vintage"
description: "Derivar una escala única del marco, aplicar los ocho colores y sustituir radios, sombras y degradados por biseles outset/inset en la UI de juego."
status: stable
task_status: in_progress
task_type: feature
requirement: REQ-033
requirement_ids: [R-002, R-003, R-004, R-005, R-016, R-018, T-001, T-002, T-003, T-011]
depends_on: []
unlocks: [TASK-0105, TASK-0106, TASK-0107]
created_at: 2026-11-14T12:02:44Z
completed_at:
assignee: task-runner
attempts: 0
artifacts: artifacts/TASK-0104/
priority: P1
risk: medium
review_required: true
generated: { by: deepseek/v4.1-flash, at: 2026-11-14T12:02:44Z }
verified:
---

# Objetivo

Que todos los tamaños de la UI de juego se deriven de una escala única ligada al
marco 16:9, con la paleta de ocho colores y el relieve vintage de biseles, sin
radios, sombras suaves, degradados, blur ni translucidez.

# Contexto

La UI actual mezcla `rem` fijos, `--ui-line` cuantizado y restos de estilo web
moderno. REQ-033 fija el ancla visual en las capturas de 900×700 y exige escala
continua. La fuente, el mapa y el render no cambian.

# Criterios de aceptación

- [ ] Una única escala de UI se calcula desde el marco y se publica como token;
      todos los tamaños de la UI de juego la consumen.
- [ ] A 900×700 el cuerpo de texto mide ≈12,8 px; a 1280×720, ≈18,8 px (±1 px);
      la relación sigue la altura del marco.
- [ ] Al redimensionar no hay saltos discretos de fuente, hueco, borde, icono ni
      sprite; no se usan `clamp()` de viewport ni breakpoints de tamaño.
- [ ] El grosor de borde se deriva linealmente de la escala y no se cuantiza a
      píxeles enteros en el token.
- [ ] Los ocho colores viven en tokens semánticos; no hay literales de color en
      los componentes de la UI de juego.
- [ ] El outset y el inset usan el par claro/oscuro de la paleta; no hay
      `color-mix()` ni colores inventados.
- [ ] Se eliminan radios, sombras suaves, degradados, blur y translucidez de la
      UI de juego; el relieve sale de bordes.
- [ ] La lista de hechizos, el submenú, los banners y las marcas de daño heredan
      escala, paleta y relieve; el cursor se completa en TASK-0108.
- [ ] El marco conserva 16:9 y el mapa 13×13; no cambia el render del mundo.

# Plan de test

- Unitario: escala y línea en varios tamaños de marco; tokens y ausencia de
  literales; relación de tamaños.
- Integración: `pnpm run verify`; auditoría de CSS de colores, radios, sombras y
  degradados en la UI de juego.
- E2E / visual: medición de `font-size` y cajas a 900×700 y 1280×720; capturas de
  HUD, panel y overlays sin artefactos modernos.
- Manual: redimensionar la ventana y comprobar que no hay saltos ni CLS.

# Evidencia esperada

- [ ] Informe en `artifacts/TASK-0104/attempt-1/report.md`
- [ ] Salida de `pnpm run verify` y del test E2E
- [ ] Capturas a 900×700 y 1280×720
- [ ] Commit SHA

# Restricciones

- Sin cambios en `src/game/**`, reglas, costes ni navegación.
- Sin dependencias nuevas, sin red y sin arte nuevo.
- La UI de juego es el alcance; `F1`, la pantalla de inicio y la pausa quedan
  fuera.

# No objetivos

- Recomponer el HUD izquierdo o derecho.
- Cambiar el panel, los slots o el cursor.
- QA visual final del corte.
