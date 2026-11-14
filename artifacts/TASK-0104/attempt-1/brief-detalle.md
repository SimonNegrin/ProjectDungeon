---
type: Task Brief Detail
title: "TASK-0104: detalle del intento 1"
description: Contrato de escala, tokens de color, biseles, conversión de tamaños, tests y evidencia.
task: TASK-0104
attempt: 1
status: stable
generated: { by: deepseek/v4.1-flash, at: 2026-11-14T12:12:39Z }
---

# Escala única

- `computeFrameLayout` ya devuelve `scale = tamañoPresentado / tamañoLógico`.
  Publica ese valor como `--ui-scale` (unitless) en `applyPresentation`, junto a
  `--ui-line`.
- Cambia `computeUiLine(tileSize, frameScale)` para que devuelva
  `frameScale * (tileSize / TILE_SIZE)` con guardas de finitos; sin `dpr`, sin
  `Math.round`, sin mínimo cuantizado. `main.ts` deja de pasar
  `window.devicePixelRatio`.
- En `:root` reserva `--ui-scale: 1` y `--ui-line: 1px`; el host los
  sobrescribe en `document.documentElement`. Deriva de `--ui-scale`:
  - `--ui-unit: calc(var(--ui-scale) * 1px)`
  - `--ui-title: calc(var(--ui-scale) * 14px)`
  - `--ui-body: calc(var(--ui-scale) * 11.2px)`
  - `--ui-data: calc(var(--ui-scale) * 10.9px)`
  - `--ui-help: calc(var(--ui-scale) * 10.1px)`
- La constante 11,2 px lógicos está elegida para que el cuerpo caiga dentro de
  ±1 px de 12,8 a 900×700 y de 18,8 a 1280×720 con las alturas reales del marco
  (≈488 y ≈664). Verifica con medición real; si el chrome cambia, ajusta solo
  esa constante, nunca añadas breakpoints ni `clamp()`.
- Todo tamaño de la UI de juego (fuente, interlineado, padding, gap, borde,
  icono, sprite, slot, ancho del submenú, marcadores, banners) usa `--ui-unit`,
  `--ui-line` o un token de rol. Las posiciones porcentuales de mundo y los
  `fr`/`%` de layout siguen valiendo. `letter-spacing` en `em` y `line-height`
  unitario siguen valiendo.
- El footer está fuera de la UI de juego y participa en el layout del marco:
  desacopla su `font-size` de `--ui-body` (por ejemplo `0.75rem`) para que un
  `ResizeObserver` no realimente el tamaño del marco. Exclúyelo de la auditoría
  de escala de juego.

# Paleta y tokens

Un único bloque en `:root`, con los ocho colores exactos y opacos:

```css
--ui-bg: #2f142f;
--ui-panel: #2a584f;
--ui-raised: #774448;
--ui-line-color: #6eb8a8;
--ui-text: #fcffc0;
--ui-accent: #ee9c5d;
--ui-danger: #c6505a;
--ui-focus: #74a33f;
--ui-muted: var(--ui-line-color);
--ui-positive: var(--ui-focus);
```

Ningún componente declara `#hex`, `rgb()`, `rgba()`, `color-mix()` ni
`linear-gradient`/`radial-gradient`. Excepciones documentadas:
`.stage`, `.frame` y `canvas` conservan `#000` como fondo de respaldo del canvas
(no es tinta de UI; `frame-qa` lo mide). El resto, incluidos body/footer/error,
usa tokens. Elimina el degradado radial del `body`.

# Biseles

Define el par y dos utilidades reutilizables:

```css
--ui-bevel-light: var(--ui-line-color);
--ui-bevel-dark: var(--ui-bg);
.ui-outset {
  border-width: var(--ui-line);
  border-style: solid;
  border-color: var(--ui-bevel-light) var(--ui-bevel-dark)
    var(--ui-bevel-dark) var(--ui-bevel-light);
}
.ui-inset {
  border-width: var(--ui-line);
  border-style: solid;
  border-color: var(--ui-bevel-dark) var(--ui-bevel-light)
    var(--ui-bevel-light) var(--ui-bevel-dark);
}
```

- Outset: marco exterior, `.hud-left`, `.hud-right`, secciones de ficha,
  columnas del panel, lista de hechizos, submenú, banner y overlay.
- Inset: huecos de item (filas/slots actuales de equipo, mochila y suelo) y el
  retrato si se lee como receptáculo.
- El marco exterior no puede llevar `border` normal: `box-sizing:border-box`
  encogería el canvas y rompería `frame-qa` (canvas ≈ frame). Usa un
  `::after` absoluto con `inset:0`, `pointer-events:none`, el bisel outset y
  `z-index` por debajo del HUD.
- No queda un tercer tratamiento para el mismo rol. El círculo de
  visión/alarma conserva `border-radius:50%` como geometría, no como radio de
  tarjeta; fuera de ese selector no debe quedar `border-radius`.

# Eliminación de vocabulario moderno

- Quita `border-radius`, `box-shadow`, `text-shadow`, `filter: blur`,
  `backdrop-filter` y fondos translúcidos de toda la UI de juego.
- Sustituye `text-shadow` de marcas, daño y spot por `-webkit-text-stroke` con
  `var(--ui-line)`/`var(--ui-bg)` o por fondo sólido de panel; sin halos.
- `frame-effects`: retira los `element.style.borderColor` de
  `feedback-overlay-view.ts` y resuelve el color con
  `.frame-effects[data-effect="..."]` y tokens.
- `cursor`: usa tokens para borde/fondo/marca de los cinco estados
  (`player`, `reachable`, `too-far`, `invalid`, `enemy`), sin radio, sombra ni
  `rgba`. Mantén los estilos de borde actuales (solid/dashed/double) y el
  comportamiento; la capa superpuesta llega en TASK-0108.
- `overlay` de victoria/derrota: fondo opaco con token, botón con bisel outset,
  sin radio ni `clamp()`.
- `debug-overlay` (F1) queda fuera: no lo rediseñes.

# Sprites e iconos

- `.hud-portrait`: `width/height/background-size/background-position` con
  `calc(var(--ui-unit) * N)`; conserva `image-rendering: pixelated`.
- `.inventory-row-icon`: tamaño y `background-size` con `--ui-unit`. En
  `inventory-panel-view.ts`, el `background-position` calculado del atlas debe
  usar `calc(${...}px * var(--ui-scale))` (o variables CSS equivalentes) para
  que el recorte escale con la UI.
- No toques atlases, `src/game/**`, renderer ni arte.

# Tests

- `tests/unit/host/layout.test.ts`: `computeUiLine` lineal y continuo; sin dpr,
  sin enteros; dos escalas cercanas producen valores cercanos; guardas de
  entradas degeneradas.
- `tests/unit/host/ui-foundations.test.ts`: paleta nueva exacta; `--ui-scale`,
  `--ui-unit`, roles y `--ui-line` en `:root`; todos los tamaños de juego
  consumen tokens; ausencia de `rem` fijo, `clamp()`, literales de color,
  radios, sombras, degradados, blur y translucidez en reglas de juego. Acepta
  las excepciones documentadas (`.stage`, `.frame`, `canvas`, `footer`,
  `.perception-radius` solo para `border-radius`, `.debug-overlay`).
- `tests/e2e/ui-foundations-qa.spec.ts`:
  - línea: `--ui-line` ≈ `frame.height / 416`, no entera, y cambia al
    redimensionar sin cuantizarse;
  - escala: mide `.hud` `font-size` y `frame.height` a 900×700 y 1280×720;
    relación constante y valores dentro de ±1 px de 12,8/18,8;
  - auditoría de estilos computados de HUD, panel, submenú, hechizos, banner,
    daño, cursor y overlay: sin radio/sombra/translucidez;
  - capturas HUD, panel y overlays a ambos tamaños.
- `tests/e2e/cursor-qa.spec.ts`: actualiza los colores esperados a los tokens
  nuevos (`player` texto; `reachable` foco; `too-far` acento; `invalid`/`enemy`
  peligro). No cambies las aserciones de geometría ni de estado.
- Conserva el resto de suites. Si una suite antigua fija la paleta o el grosor
  anteriores, adáptala al contrato nuevo sin borrar cobertura.

# Comandos y artefactos

- `pnpm run verify` (120 s) y salida completa en `verify-output.txt`.
- `pnpm run test:e2e` (180 s) y salida en `e2e-output.txt`; para capturas usa
  `E2E_ARTIFACTS_DIR=artifacts/TASK-0104/attempt-1/e2e`.
- `pnpm run docs:check` (60 s) si tocas cabeceras; `task-runner` no edita docs.
- Informe en `artifacts/TASK-0104/attempt-1/report.md` (≤4 KB), con commit SHA,
  comandos/timeouts, métricas y rutas de capturas.
- Trabaja solo en `src/host/**`, `index.html`, `tests/**` y
  `artifacts/TASK-0104/**`. No toques `src/game/**`, `docs/**`,
  `docs/requirements/**`, `docs/harness/**`, `docs/templates/**`,
  `package.json` ni `pnpm-lock.yaml`.
