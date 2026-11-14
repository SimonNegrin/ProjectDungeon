---
type: Task Brief
title: "TASK-0099: brief del intento 1"
description: Fuente Pixelify Sans local, tokens semánticos, escalas por rol y línea calculada desde el marco.
task: TASK-0099
attempt: 1
status: stable
brief_bytes: 3151
read_detail: true
generated: { by: deepseek/v4.1-flash, at: 2026-11-14T00:00:00Z }
---

# Objetivo

Que la UI cargue Pixelify Sans desde `public/`, use un único bloque de tokens
`--ui-*` con escalas por rol y obtenga `--ui-line` del píxel de arte escalado,
con tests y capturas que lo demuestren.

# No objetivos

- Rediseñar HUD, panel, figura de equipo, submenú o ayuda: solo su tipografía y
  tokens. Tampoco reglas, motor, costes, `src/game/**` ni render del mapa.
- Añadir dependencias, arte nuevo, estáticas de la fuente o peticiones de red.

# Invariantes

- Solo la fuente variable `PixelifySans-VariableFont_wght.ttf`; `OFL.txt` y un
  `README.txt` nuevo con origen, autor y licencia; nada de rutas externas.
- Si se extraen los estilos a una hoja, el cambio es mecánico: mismos selectores,
  orden, especificidad y comportamiento; sin rediseño.
- Tokens y escalas en un único `:root`; los componentes consumen variables.
- No se debilita ningún test; `src/game/**` no importa `src/host/**`.

# Criterios de aceptación

Viven en `docs/tasks/TASK-0099-ui-fuente-tokens-linea.md#criterios-de-aceptación`;
no se copian.

# Contexto mínimo

- Fuente externa: `/Users/simon/Downloads/Pixelify_Sans`. Copia con shell el TTF
  variable y `OFL.txt`; crea el README. No copies `static/`.
- `index.html`: bloque `<style>` inline. Crea `src/host/ui.css`, enlázala y mueve
  el bloque sin cambiar reglas.
- `src/host/layout.ts`: `TILE_SIZE` y `computeFrameLayout(...).scale`. Añade una
  función pura de grosor de línea redondeada a píxel de dispositivo.
- `src/host/main.ts`: `applyPresentation` ya corre con `ResizeObserver`; publica
  ahí `--ui-line` en `document.documentElement`.
- Paleta ya usada y muestreada del pack 32rogues en `public/assets/32rogues/`;
  mapéala a los ocho tokens. Mantén escalas cercanas a las actuales para no
  romper 900×700.
- Tests existentes: `tests/unit/host/layout.test.ts`, `tests/e2e/support.ts` y
  `tests/e2e/artifacts.ts`. La tabla de caracteres se inyecta en el test, sin UI
  de producción.
- [REQ-032](../../../docs/requirements/REQ-032-estilo-visual-interaccion-ui.md#requisitos-creativos-decididos)
  R-001 a R-005 y T-001/T-002/T-004/T-009;
  [ADR-025](../../../docs/decisions/ADR-025-estilo-visual-ui.md).

# Detalle obligatorio

Leer `brief-detalle.md`: comandos de copia, nombres de tokens y escalas,
fórmula de línea, tests y capturas exactas.

# Artefactos

`artifacts/TASK-0099/attempt-1/`: `report.md`, `verify-output.txt`,
`test-output.txt`, `e2e-output.txt`, `screenshots/`, `logs/`; commit en
`task/TASK-0099`.

# Riesgos y decisiones abiertas

- Mover estilos inline puede alterar cascada: verifica E2E y capturas; si algo
  se rompe, no lo maquilles, para y reporta.
- `--ui-line` debe cambiar con la ventana sin mover mapa ni canvas.
- Si un criterio exige una decisión creativa o cambiar una regla, devuelve
  `blocked` con evidencia.
