---
type: Task Brief
title: "TASK-0040: detalle del brief del intento 1"
description: Contrato, variantes, render, controles, métricas y capturas de EXP-004.
task: TASK-0040
attempt: 1
status: stable
read_detail: false
generated: { by: deepseek/v4.1-flash, at: 2026-11-09T00:02:00Z }
---

# Contrato común

Define un contrato único en `src/types.ts` (o equivalente) y úsalo en las tres
variantes. Como mínimo:

- `GeneratedMap`: `seed`, `variant`, `width`, `height`, `tiles` (0 muro, 1
  suelo), `rooms`, `doors`, `corridors`, `loops`, `spawns`, `enemies`,
  `palettes`, `warnings` y `stats`.
- `Room`: `id`, caja `x/y/width/height`, `cells` (máscara de suelo),
  `role` (`large` | `medium` | `small` | `cavern` | `spawn`), `area`,
  `boxArea`, `notches`, `alcoves`, `accesses`, `doorIds`.
- `Door`: `x`, `y`, `orientation`, `style` (`wood` | `metal` | `grated`),
  `roomA`, `roomB`, `direct` (0 tiles de pasillo).
- `Corridor`: `id`, `cells`, `kind` (`door` | `short` | `wide`), `length` (0-3;
  wide ≥3), `doors`.
- `Spawns`: `roomId`, `party` (6 puntos distintos de suelo, fuera de puertas y
  armas), `player` (alias de `party[0]`).
- `Enemy`: `id`, `type` (`sentinel` | `brute` | `coward`), `x`, `y`, `roomId`,
  `home`.
- Todo debe ser serializable con `JSON.parse(JSON.stringify(...))`.

Validadores puros exportados para tests: conectividad ortogonal, ausencia de
diagonales, cierre del borde, no solape de salas, longitudes 0-3, bucles 0-3,
puertas 1-2 tiles de muro, spawn ≥6 huecos y sin enemigos, reparto 1 por sala
(0-1 vacía), separación ≥2 Chebyshev y tipos según `REQ-012` R-008.

# Variantes

- **A · crecimiento sobre roca:** mapa macizo, siembra de salas y crecimiento
  con máscaras irregulares; sellado, conexión con puertas directas o pasillos
  de 1-3 tiles, 0-3 bucles y apertura ocasional de pasillo ancho.
- **B · BSP con máscaras:** partición BSP en 4-6 hojas; cada hoja se llena con
  una máscara irregular y 1-2 tiles de muro; hojas vecinas con puerta directa,
  resto con pasillos de 1-3; bucles 0-3.
- **C · plantillas empaquetadas:** biblioteca determinista de formas L/T/con
  muescas, rotadas y espejadas; colocación en grafo empaquetado; puertas en
  paredes compartidas y pasillos cortos donde falten.

Las tres deben producir el mismo contrato, no solo dibujos. La probabilidad de
caverna (~1/6) transforma el mapa en una caverna grande (≥55 % del suelo de
sala) con 1-2 anexas. La probabilidad de pasillo ancho (~1/3) abre como máximo
un pasillo de 2 tiles, longitud ≥3 y sin puertas.

# Render

- Canvas 2D, `imageSmoothingEnabled = false`, tiles de 32 px de
  `public/assets/32rogues/tiles.png` mediante `ASSET_URLS`/`TILE_RECTS`.
- Muros con la regla por borde: `wallSide1` solo si hay suelo al sur; `wallTop`
  en el resto. Nada de `wallSide2` salvo que lo justifiques.
- Suelo programático de `REQ-008`: base `#0d1519` y segundo tono de
  `FLOOR_PALETTES` por sala; pasillos y umbrales neutros; damero `(x+y)%2`.
- Puertas decorativas en el hueco, por debajo de las unidades: estilo estable
  por semilla y legible (marco + hoja); no bloquean ni cambian reglas.
- Spawn: sala resaltada, 6 huecos y jugador en `party[0]`. Enemigos con sprites
  de `monsters.png` o fichas etiquetadas; muestra tipo y sala.
- Capa debug conmutable: máscaras de sala, límites, puertas y estilo, spawn,
  huecos, anchura de pasillo, caverna y enemigos.
- Vista de juego 13×13 además del mapa completo, centrada en el spawn o en el
  jugador, con el mismo render y sin enseñar suelo fuera del borde.

# Controles y página

- Semilla, ancho, alto, salas, tamaño mínimo/máximo, pasillo máximo,
  probabilidad de pasillo ancho, grosor de muro, probabilidad de caverna,
  variante, debug, puertas y spawn/enemigos.
- La comparación A/B/C siempre visible. El control `variant` decide qué variante
  alimenta la vista 13×13 y el foco; no oculta la comparación.
- Panel de métricas por variante: salas, roles, área/caja, muescas, hornacinas,
  paredes compartidas, longitudes, bucles, anchos, caverna, accesos, huecos de
  spawn, enemigos por sala y tiempo de generación.
- Exportación JSON con semilla, variante, parámetros y métricas. El export del
  shell no incluye métricas: añade un botón propio o extiende `getDecision`
  sin tocar `experiments/_shell/`.
- `?test=1&seed=...` debe ser determinista y exponer `window.__experiment`
  (params, seed, snapshot con métricas y `getDecision`). Sin reloj en generación.

# Tests

`src/*.test.ts` con Vitest, sin DOM:

- Determinismo de A/B/C con semilla de referencia y 20+ semillas.
- Conectividad, cierre del borde, no diagonales, no solape.
- Formas: al menos una no rectangular, muescas y relación área/caja.
- Longitudes 0-3, puertas, bucles 0-3.
- Frecuencias: 30 semillas para pasillo ancho y 60 para caverna.
- Spawn ≥6 huecos, sin enemigos ni visión inicial, reparto y tipos.
- Contrato serializable y opciones extremas con `warnings`.

No debilites tests existentes; los nuevos viven solo en el experimento.

# Capturas y evidencia

- Al menos 4 semillas por variante A/B/C (12 capturas), con una caverna y un
  pasillo ancho identificados.
- Revisa a 1280×720; incluye mapa completo, debug, puertas, spawn y vista 13×13.
- Guarda `screenshots/` y `decision-example.json` en
  `artifacts/TASK-0040/attempt-1/`.
- Servidor en background solo con puerto fijo, health check y cierre con trap.
