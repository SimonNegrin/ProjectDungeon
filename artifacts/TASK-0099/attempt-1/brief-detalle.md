---
type: Task Brief Detail
title: "TASK-0099: detalle del brief del intento 1"
description: Fuente, tokens, escalas y línea calculada; tests y capturas exactas.
task: TASK-0099
attempt: 1
status: stable
generated: { by: deepseek/v4.1-flash, at: 2026-11-14T00:00:00Z }
---

# Detalle del intento 1

## Fuente

- Origen: `/Users/simon/Downloads/Pixelify_Sans`.
- Copiar solo:
  - `PixelifySans-VariableFont_wght.ttf` a
    `public/fonts/pixelify-sans/`.
  - `OFL.txt` al mismo directorio.
- Crear `public/fonts/pixelify-sans/README.txt` con: nombre Pixelify Sans,
  autor/proyecto «The Pixelify Sans Project Authors», origen
  `https://github.com/eifetx/Pixelify-Sans`, licencia SIL OFL 1.1, y la nota de
  que se incluye la variable 400–700 y no las estáticas.
- No copiar `static/`, no renombrar el TTF y no tocar `package.json`.

## Hoja de estilos

- Crear `src/host/ui.css` enlazada desde `index.html`
  (`<link rel="stylesheet" href="/src/host/ui.css" />`) antes del script.
- Mover el contenido del `<style>` inline sin cambiar selectores, orden ni
  comportamiento. El único cambio permitido en las reglas existentes es
  sustituir las variables antiguas por los tokens `--ui-*` y aplicar las
  escalas por rol.
- `@font-face`: familia `Pixelify Sans`, `src: url('/fonts/pixelify-sans/PixelifySans-VariableFont_wght.ttf') format('truetype')`,
  `font-weight: 400 700`, `font-style: normal`, `font-display: swap`.
- `:root` debe contener exactamente estos nombres, como mínimo:
  `--ui-font`, `--ui-title`, `--ui-body`, `--ui-data`, `--ui-help`,
  `--ui-bg`, `--ui-panel`, `--ui-line`, `--ui-text`, `--ui-muted`,
  `--ui-accent`, `--ui-danger`, `--ui-focus`, y una línea de reserva
  `--ui-line: 1px`.
- Usa `--ui-font` en `body` y en título, cuerpo, dato y ayuda. Aplica
  `--ui-title` a títulos, `--ui-body` al texto normal, `--ui-data` a cifras y
  datos y `--ui-help` a la ayuda. Mantén tamaños cercanos a los actuales
  (0,7–1 rem) para no romper 900×700.
- Colores: conserva los valores actuales que ya salen del pack (por ejemplo
  `#06080c`, `#0d141d`, `#22303f`, `#edf2f7`, `#9aa7b8`, `#e8b86d`) y asígnalos
  a los tokens. No introduzcas colores nuevos en componentes; los literales
  heredados de estados existentes pueden quedar para las tareas de rediseño.

## Línea

- Añade en `src/host/layout.ts` una función pura exportada, por ejemplo
  `computeUiLine(tileSize, frameScale, devicePixelRatio)`, que:
  - devuelva al menos `1 / dpr` para que la línea no desaparezca;
  - calcule un píxel de arte como `frameScale * (tileSize / TILE_SIZE)`;
  - redondee a píxel de dispositivo: `Math.round(px * dpr) / dpr`;
  - trate entradas no finitas o no positivas con un fallback seguro.
- En `main.ts`, dentro de `applyPresentation`, publica
  `document.documentElement.style.setProperty('--ui-line', ...)`. No dupliques
  el cálculo en CSS.
- El `ResizeObserver` existente debe recalcular el valor; comprueba que no
  mueve ni redimensiona el canvas.

## Tests y evidencia

- Unitarios:
  - línea con escalas 1, 1,25, 1,5, 2,5 y dpr 1/2, redondeo y mínimo;
  - lectura de `src/host/ui.css` y `public/fonts/...`: tokens presentes,
    `@font-face` con 400–700 y `swap`, sin URLs externas, y uso de
    `--ui-font`;
  - presencia de TTF, `OFL.txt` y `README.txt` con crédito.
- E2E nuevo en `tests/e2e/ui-foundations-qa.spec.ts`: fuente servida y
  resuelta (`document.fonts.check`), HUD/panel/ayuda con la familia; `--ui-line`
  distinta a 1280×720 y 900×700; mapa/canvas sin desplazamiento.
- Capturas en `artifacts/TASK-0099/attempt-1/screenshots/`: HUD y panel abiertos
  a 1280×720 y 900×700, y tabla `ñ á é í ó ú ü ¿ ¡ « »` en título, cuerpo, dato
  y ayuda. La tabla se inyecta desde el test con las variables de rol; no se
  añade a la UI de producción.
- Evita peticiones externas: falla el test si aparece una URL fuera del origen.
