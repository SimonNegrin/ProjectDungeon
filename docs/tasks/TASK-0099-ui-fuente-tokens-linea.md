---
type: Task
id: TASK-0099
title: "UI: fuente pixel, tokens y regla de línea"
description: "Incluir Pixelify Sans con su licencia en public/, definir los tokens semánticos y las escalas tipográficas, y calcular el grosor de línea desde la escala del marco."
status: stable
task_status: backlog
task_type: feature
requirement: REQ-032
requirement_ids: [R-001, R-002, R-003, R-004, R-005, T-001, T-002, T-004, T-009]
depends_on: []
unlocks: []
created_at: 2026-11-13T23:59:04Z
completed_at:
assignee: task-runner
attempts: 0
artifacts: artifacts/TASK-0099/
priority: P1
risk: low
review_required: true
generated: { by: deepseek/v4.1-flash, at: 2026-11-13T23:59:04Z }
verified:
---

# Objetivo

Que la UI use Pixelify Sans servida desde el propio build, con un juego único de
tokens de color, tipografía y línea, y con el grosor de línea derivado del píxel
de arte en lugar de valores fijos.

# Contexto

- La fuente está fuera del repo, en `/Users/simon/Downloads/Pixelify_Sans`:
  `PixelifySans-VariableFont_wght.ttf` (78 KB), `OFL.txt` y `README.txt`. Es un
  binario: se copia con shell, no se edita.
- Los estilos de la UI viven hoy en un bloque inline de `index.html`; no hay hoja
  de estilos ni tokens.
- La geometría del marco está en `src/host/layout.ts`: `MAP_TILES_PER_AXIS`,
  `TILE_SIZE`, `RENDER_SCALE` y la escala calculada del marco.
- [REQ-032](../requirements/REQ-032-estilo-visual-interaccion-ui.md) R-001 a R-005,
  T-001, T-002, T-004 y T-009.
- [ADR-025](../decisions/ADR-025-estilo-visual-ui.md) decide fuente variable,
  tokens semánticos y línea calculada.

# Criterios de aceptación

- [ ] `public/fonts/pixelify-sans/` contiene el TTF variable, `OFL.txt` y un
      `README.txt` con origen y crédito; el build lo sirve desde `/fonts/...` y no
      hay peticiones de red ni referencias a rutas externas al repo.
- [ ] `@font-face` declara el peso 400–700 con `font-display: swap`; cuerpo,
      títulos, datos y ayuda usan la familia por token `--ui-font`.
- [ ] `:root` define los ocho tokens semánticos de color (`--ui-bg`,
      `--ui-panel`, `--ui-line`, `--ui-text`, `--ui-muted`, `--ui-accent`,
      `--ui-danger`, `--ui-focus`) con valores muestreados del pack; ningún
      componente nuevo introduce colores propios.
- [ ] Hay escalas por rol (título, cuerpo, dato, ayuda) como variables y se
      aplican a HUD, panel y ayuda sin romper la maquetación actual.
- [ ] El grosor de línea se calcula desde la escala del marco y el tamaño de
      tile, se redondea a píxel de dispositivo y se expone como `--ui-line`; se
      recalcula al redimensionar sin afectar al mapa.
- [ ] Una captura de la tabla de caracteres (`ñ á é í ó ú ü ¿ ¡ « »`) en cada
      escala muestra los glifos correctos, sin sustituciones ni recortes.
- [ ] Sin arte nuevo, sin dependencias y sin cambios de reglas; `pnpm run verify`
      pasa y no se debilita ningún test existente.

# Plan de test

- Unitario: función de grosor de línea con varias escalas y redondeo; presencia y
  consumo de tokens; ausencia de literales de color en los componentes tocados.
- Integración: la fuente se sirve en el build, `document.fonts` la resuelve y el
  HUD y el panel la usan; `--ui-line` cambia con el tamaño de la ventana.
- E2E / visual: capturas a 1280×720 y 900×700 con HUD y panel abiertos; captura de
  la tabla de caracteres por escala.
- Manual: legibilidad de las cuatro escalas a 900×700.

# Evidencia esperada

- [ ] Informe en `artifacts/TASK-0099/attempt-1/report.md`
- [ ] Salida de `pnpm run verify` y de los tests focalizados
- [ ] Capturas en `artifacts/TASK-0099/attempt-1/screenshots/`
- [ ] Commit SHA en la rama `task/TASK-0099`

# Restricciones

- No rediseñar componentes: la pantalla en tres zonas, el panel de tres columnas,
  la figura de equipo, la ficha del HUD derecho y el submenú son tareas
  posteriores.
- No copiar las estáticas de la fuente; solo la variable.
- No tocar el motor, las reglas ni los costes; `src/game/` no importa `src/host/`.
- Sin dependencias nuevas ni peticiones de red.

# No objetivos

- Aplicar los tokens al rediseño de HUD y panel (tareas siguientes de REQ-032).
- E2E y QA visual del panel nuevo.
- Cambiar la resolución lógica, el viewport de 13×13 o el marco 16:9.
