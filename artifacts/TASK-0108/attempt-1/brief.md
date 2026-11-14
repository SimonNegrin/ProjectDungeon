---
type: Task Brief
title: "TASK-0108: brief del intento 1"
description: "Cursor superpuesto del panel sincronizado con el foco, transición corta, salto instantáneo y CLS 0 del marco."
task: TASK-0108
attempt: 1
status: stable
brief_bytes: 4094
read_detail: false
generated: { by: deepseek/v4.1-flash, at: 2026-11-14T14:40:00Z }
---

# Objetivo

Añadir al panel un **cursor superpuesto** que marque el slot activo y siga al
foco real: transición de 80-120 ms entre slots adyacentes; instantáneo en saltos
de fila/columna, scroll, reapertura y `prefers-reduced-motion`; sin layout shift
ni tapar sprite o bisel.

# No objetivos

- Contenido del panel, slots, sprites, navegación, reglas o motor.
- QA visual final (TASK-0109) o layout alternativo.
- Animaciones, colores o valores de escala nuevos.

# Invariantes

- Tokens de TASK-0104 (`--ui-line`, `--ui-scale`, `--ui-focus`): sin literales de
  color, radios, sombras, degradados, blur ni translucidez.
- Foco DOM intacto en slot (`tabindex`, `aria-current`, etiquetas); el cursor
  es `aria-hidden`, `pointer-events: none` y no recibe foco.
- Posición con `transform` sobre capa absoluta; no altera layout.
- No debilitar tests existentes.

# Criterios de aceptación

Viven en
[TASK-0108](../../../docs/tasks/TASK-0108-ui-cursor-superpuesto-cls.md#criterios-de-aceptación).

# Contexto mínimo

- `src/host/inventory-panel-view.ts`: `applySelection`, `selectByKey`,
  `focusRow`/`revealRow`, apertura y `renderModel`.
- `src/host/main.ts`: `prefersReducedMotion`, `applyPresentation` y creación de
  la vista; `src/host/ui.css` bloque `.inventory-slot`; `index.html` panel.
- Tests actuales: `tests/e2e/panel-three-columns-qa.spec.ts`,
  `tests/unit/host/inventory-navigation.test.ts`.
- Requisito:
  [R-022/R-023/R-024, P-006, T-013/T-014](../../../docs/requirements/REQ-033-revision-visual-hud-panel.md#cursor-de-selección).

# Enfoque técnico

- Un elemento `.inventory-cursor` (testid `inventory-cursor`) dentro del panel,
  borde de foco y **centro transparente**; caja = slot + `2 × --ui-line`,
  desplazada `- --ui-line` para pintar por fuera del bisel.
- `transform: translate(x, y)` relativo al panel; ancho/alto solo cambian al
  redimensionar. Transición de **100 ms** solo en `transform`, sin rebote.
- Modo (extraer función pura + test unitario): **animate** solo si mismo `zone`
  y misma fila (`top` ±1 px), o sea vecino horizontal; **instant** en primera
  colocación, cambio de fila o zona, scroll, reapertura, actualización del modelo
  y reduced motion. En instantáneo: `data-instant` + reflow + retirar.
- Abrir: cursor ya colocado. Cerrar o foco en «Cerrar»: oculto. `scroll` del
  Suelo y `ResizeObserver` del panel recolocan al instante.
- `prefers-reduced-motion`: pasar la preferencia de `main.ts` y cubrir también
  con `@media`; sin transición. El cursor sustituye el resaltado `.is-selected`.

# Evidencia

- Spec E2E nuevo (`tests/e2e/panel-cursor-cls-qa.spec.ts`): transición 80-120 ms
  y transform en vecino horizontal; instantáneo en fila/columna, scroll y
  reduced motion; pulsaciones rápidas sin desincronía (esperar >120 ms y
  comparar centro con slot enfocado); foco DOM intacto; borde fuera del slot,
  centro transparente y sprite/bisel visibles.
- CLS: `PerformanceObserver` de `layout-shift` y rects antes/después de
  abrir/cerrar, navegar, equipar, recoger/soltar, cambiar de tile y
  aparecer/desaparecer cadáveres. Presupuesto 0 para marco, panel, columnas,
  títulos y slots de equipo/bolsa; el Suelo cambia dentro de su scroll.
- Capturas 900×700 y 1280×720 del cursor y modo reducido; logs JSON. Guardar con
  `E2E_ARTIFACTS_DIR=artifacts/TASK-0108/attempt-1`.
- `pnpm run verify` (120 s) y `pnpm run test:e2e` (180 s); informe en
  `artifacts/TASK-0108/attempt-1/report.md` con commit SHA.

# Riesgos

- No animes cambios de fila/zona: el criterio exige salto instantáneo.
- Un `transition` mal reiniciado puede animar la primera colocación o el scroll;
  fuerza reflow en instantáneo.
- Mide rects solo al cambiar selección, modelo, tamaño o scroll.
