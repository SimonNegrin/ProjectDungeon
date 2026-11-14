---
type: Task Brief Detail
title: "TASK-0109: matriz de QA visual"
description: Escenarios, capturas, logs y comprobaciones del intento 1.
task: TASK-0109
attempt: 1
status: stable
generated: { by: deepseek/v4.1-flash, at: 2026-11-14T14:15:00Z }
---

# Matriz de escenas (cada una a 900×700 y 1280×720)

Usa un estado de sala determinista (como `roomState` de
`hud-left-zones-qa`) para el HUD y un estado BSP con equipo/mochila/suelo
controlados para el panel (como `warriorScenario` de `panel-three-columns-qa`).
Cada captura se guarda con `artifactPath`, nunca con una ruta fija.

| Escena | Estado | Captura | Log |
|---|---|---|---|
| Tres zonas HUD | Guerrero con espada, HP/MP/acciones | `tres-zonas-<vp>.png` | `hud-geometry.json` |
| HUD sin maná ni traits | Guerrero: `hud-magic-row`, `hud-mana-row` y `hud-traits` ocultos | `hud-sin-mana-sin-traits-<vp>.png` | `hud-geometry.json` |
| HUD con maná | Mago con magia y maná visibles, sin arma | `hud-con-mana-<vp>.png` | `hud-geometry.json` |
| HUD con traits | Trait inyectado en el arma equipada (mismo recurso que TASK-0106); bloque visible con texto | `hud-con-traits-<vp>.png` | `hud-geometry.json` |
| Ficha sin traits | Panel abierto, objeto de mochila seleccionado, sin traits | `ficha-sin-traits-<vp>.png` | `ficha.json` |
| Ficha con traits | Trait inyectado y ficha releída | `ficha-con-traits-<vp>.png` | `ficha.json` |
| Panel mochila llena | Ocho objetos en Bolsa, equipo completo | `panel-mochila-llena-<vp>.png` | `panel-geometry.json` |
| Panel sin cadáveres | Sin unidades muertas en el tile | `panel-sin-cadavers-<vp>.png` | `panel-geometry.json` |
| Panel con cadáveres | Jugador «Bruja» + Centinela + Bruto | `panel-con-cadavers-<vp>.png` | `panel-geometry.json` |
| Suelo con objetos | Cuatro objetos en el tile bajo el jugador | `panel-suelo-objetos-<vp>.png` | `panel-geometry.json` |
| Tres columnas y encaje | Panel de 8+8+4; medir panel, columnas, títulos y slots | `tres-columnas-<vp>.png` | `panel-geometry.json` |
| Cursor | Panel abierto, foco en Bolsa; vecino horizontal, salto de fila y Suelo | `cursor-<vp>.png`, `cursor-salto-<vp>.png` | `cursor.json` |
| Movimiento reducido | `emulateMedia({ reducedMotion: 'reduce' })` y cambio de slot | `cursor-reduced-motion-<vp>.png` | `cursor.json` |
| CLS | Abrir/cerrar, navegar, equipar, recoger/soltar, cambiar de tile y cadáveres | `cls-<vp>.png` | `cls.json` |
| Escala continua | 900, 901, 1024, 1100 y 1280 de ancho, misma altura 700/720 | `escala-<vp>.png` | `scale-continuity.json` |
| Paleta y relieve | HUD y panel abiertos | (usa las anteriores) | `palette-styles.json` |

# Comprobaciones mínimas por escena

- **Tres zonas:** `hud-zone-character`, `hud-zone-weapon` y `hud-zone-stats`
  visibles, sin scroll vertical; personaje en dos columnas (retrato a la
  izquierda, nombre/datos a la derecha y bordes superiores alineados); pie
  (`hud-keys`, `hud-suggestion`) fuera de las zonas y sin marco. Sin fase, turno,
  PV enemigo ni «En juego»; `F1` los conserva.
- **HUD condicional:** sin maná no existe fila ni hueco; con maná se ven magia y
  maná; sin traits no hay bloque ni «Sin traits activos»; con traits se lee el
  texto. Sin arma se oculta la zona entera.
- **Ficha:** sin «Seleccionado», tipo duplicado, «Stats», descripciones ni «Sin
  traits activos». Sprite visible, sobre `items.png`, `pixelated`, cuadrado y
  dentro de su bloque. Stats en `li` verticales, valor delante. Con panel abierto,
  dos secciones enmarcadas y «Equipado» solo en la segunda.
- **Slots:** todos cuadrados (|ancho-alto| ≤ 0,5 px) y del mismo lado en Equipo,
  Bolsa y Suelo (≤ 0,5 px); cada sprite dentro del área interior, centrado en
  ambos ejes (±1 px), sin recorte ni desborde. Bisel inset en slots y outset en
  zonas, secciones y columnas; sin radios, sombras suaves, degradados, blur ni
  translucidez.
- **Cadáveres:** sin cadáveres, `inventory-cadavers` oculto y sin título/hueco;
  con cadáveres, tres celdas con sprite y nombre («Bruja») o tipo («Centinela»,
  «Bruto») antes del Suelo. La rejilla no añade paradas de foco.
- **Cursor:** caja = slot + `2 × --ui-line`, centro transparente, sprite y bisel
  visibles (`elementFromPoint` en el centro devuelve el slot); foco DOM =
  selección; transición 80-120 ms solo en vecino horizontal; sin transición en
  cambio de fila, zona, scroll o reduced motion.
- **CLS:** `PerformanceObserver` y rects antes/después. Presupuesto 0 para
  `frame`, panel, columnas, títulos y slots de equipo/bolsa. Registrar cualquier
  shift con `hadRecentInput` y su fuente; los cambios internos de ficha o Suelo
  se anotan como permitidos por P-006.
- **Escala:** `--ui-scale` = altura del marco / 416 en cada ancho; cuerpo
  11,2 × escala (≈12,8 px a 900×700 y ≈18,8 px a 1280×720, ±1 px); `--ui-line`
  = escala; slots y huecos proporcionales; al pasar de 900 a 901 la línea cambia
  de forma continua (<0,01 px) y no hay saltos discretos.
- **Tres columnas a 900×700:** los tres títulos en la misma línea superior,
  columnas dentro del panel sin intersecciones, slots y sprites dentro de su
  columna, sin scroll horizontal del panel ni recorte. Deja las cifras en
  `panel-geometry.json` y en el informe.

# Retrato

Comprueba el `hud-portrait` con guerrero, mago y pícaro a 900×700. Si la imagen y
la posición de fondo son iguales en los tres, guárdalo en
`logs/portrait-audit.json` como observación no bloqueante. No falles el spec por
ello.
