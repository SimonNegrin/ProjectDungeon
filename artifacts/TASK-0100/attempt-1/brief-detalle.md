---
type: Task Brief Detail
title: "TASK-0100: detalle del brief del intento 1"
description: Estructura, contenido por tipo, compatibilidad de test IDs, deuda de datos y pruebas para la pantalla en tres zonas.
task: TASK-0100
attempt: 1
status: stable
generated: { by: deepseek/v4.1-flash, at: 2026-11-14T00:30:00Z }
---

# Punto de partida

- `index.html` tiene una `section.hud` fuera del `frame`, encima del `stage`, y
  dentro del `frame` el canvas, el overlay del mapa, los feedbacks, el panel de
  inventario y los overlays de resultado.
- `src/host/hud.ts` concentra `buildHudModel`, `createHudView`, el debug y los
  avisos. `main.ts` llama a `hudView.update(...)` en cada render y en cada tile
  de cursor; no hay que crear otro bucle.
- `src/host/layout.ts` fija el marco 16:9, el mapa 13×13 y los offsets. El
  `.map-overlay` ya empieza en el 21,875 % del marco; no lo muevas.
- `src/host/ui.css` ya tiene `--ui-line`, `--ui-line-color`, la familia y las
  escalas de TASK-0099. Los estilos antiguos del HUD aún tienen literales y
  `rgba(...)`.
- `tests/e2e/frame-qa.spec.ts` exige que `hud` y sus campos estén dentro del
  viewport y sin recorte de texto. `stabilizeHudPaint` usa
  `[data-testid="hud"]`; conserva ese contenedor.
- `docs/requirements/REQ-022-hud-izquierdo-jugador.md` y
  `docs/requirements/REQ-023-hud-derecho-detalle-cursor.md` son la fuente del
  contenido; `REQ-017` la del feedback que no debe perderse.

# Composición de la pantalla

Recomendación, no obligación de estructura interna:

- Mueve `[data-testid="hud"]` dentro de `.frame` como capa absoluta (`inset: 0`)
  con rejilla de tres columnas `21.875% 56.25% 21.875%`; la columna central
  queda vacía para no tapar el mapa.
- `hud-left` ocupa la franja izquierda y `hud-right` la derecha. Ambas son
  informativas: `pointer-events: none` salvo que necesites foco; no deben
  interceptar teclado ni clic del mapa.
- Mueve también dentro del marco los campos que hoy viven en la barra superior:
  `hud-message`, `hud-suggestion`, `hud-keys` y el resumen de estado. El aviso
  de rechazo de REQ-017 no puede quedar fuera del marco ni desaparecer.
- El `spell-list` flota hoy fuera del `frame`; si lo consideras HUD de juego,
  reanclalo dentro del marco sin cambiar su comportamiento. No es obligatorio
  rediseñarlo.
- No cambies `.map-overlay`, la cámara, el canvas, el tamaño del marco ni la
  resolución lógica. El mapa debe seguir viéndose 13×13 a 1280×720 y 900×700.

# Ficha izquierda

Contenido mínimo, todo derivado del snapshot:

- Miniatura del sprite del personaje a píxel entero. El render actual usa
  `KNIGHT_RECT` de `rogues.png` para jugadores; usa ese mismo recorte como
  fondo CSS con `image-rendering: pixelated` y escala entera (64 px es
  suficiente). No inventes un mapa de variantes que el motor no tiene.
- Nombre de instancia y nombre del arquetipo (`rosterEntry`).
- PV actual/máximo, MP actual/máximo y acciones restantes/máximas.
- Maná actual/máximo solo si `unit.mana.max > 0`; si no, omite la fila entera
  sin dejar hueco.
- Atributos con efecto de `effectiveStats(unit).stats`, con signo y etiquetas.
  No sumes modificadores a mano.
- Traits: léelos de las definiciones de los objetos equipados
  (`ITEMS[...].traits`). En el catálogo actual están vacíos: muestra «Sin traits
  activos» y no inventes traits ni notas de recorte. La nota de recorte de
  REQ-022 solo puede mostrarse cuando el dato real de REQ-019 exista; no
  implementes REQ-019 en esta tarea.
- Estado fantasma: el motor de este corte no tiene la mecánica de REQ-021. A
  nivel de vista, si el jugador activo tiene `hp <= 0`, muestra su condición
  («Fantasma») y su MP intrínseco; no toques el motor ni inventes inventario.
- Cambio de turno: la ficha se alimenta de `state.players[0]` en cada render.
  No guardes estado propio de juego.
- Mantén `hud-player-name`, `hud-archetype`, `hud-player-hp`, `hud-player-mp`,
  `hud-player-magic`, `hud-player-mana`, `hud-action`, `hud-stats` y
  `hud-suggestion`. `hud-weapon` puede quedar como ranura compacta del arma
  para el pulso de REQ-017 R-012; no muestres escudo, armadura ni inventario en
  la ficha. Si retiras `hud-shield`/`hud-armor`, actualiza los tests que solo
  comprobaban ese resumen para que cubran el mismo comportamiento en el sitio
  nuevo (panel o HUD derecho); no borres la cobertura.

# HUD derecho

Crea una composición pura (sin DOM) por tipo y una vista DOM que la pinte. El
modelo debe ser de solo lectura. Orden de resolución para la casilla del cursor:

1. **Sin línea de visión** de ningún jugador vivo: `desconocido`. Usa
   `hasLineOfSight(state.grid, player, cursor)` de `src/game/perception.ts` con
   `player.hp > 0`; no reimplementes Bresenham ni percepción. No reveles tipo,
   nombre, stats ni contenido.
2. **Unidad** en la casilla: enemigo o aliado.
   - Enemigo: nombre/tipo, PV actual/máximo, arma, escudo, armadura, acciones
     restantes, y nivel de magia/maná si procede. Reutiliza `effectiveStats` y
     las etiquetas actuales.
   - Aliado: nombre, arquetipo, PV, MP, acciones, atributos y estado; nunca
     inventario ni contenido de mochila.
   - Conserva `hud-cursor-enemy-hp`, `hud-cursor-enemy-magic`,
     `hud-cursor-enemy-mana`, `hud-cursor-bands` y
     `hud-cursor-band-<tipo>` para las bandas de REQ-029. Sin LOS, las bandas
     se ocultan y el panel dice «Desconocido».
3. **Objeto en el suelo**: nombre del objeto con `ITEMS[item.itemId].name`. No
   inventes cantidad si el modelo no la tiene.
4. **Puerta**: busca en `state.map?.doors` por coordenadas. Muestra tipo
   (`wood`/`metal`/`grated` → madera/metal/rejilla) y zona/sala si el dato
   existe; si no, solo «Puerta». No prometas que se abre.
5. **Terreno**: entrada (`map.entrance.position`), salida (`map.exit.position`),
   muro (`grid.tiles`) o suelo. Entrada y salida tienen prioridad sobre
   suelo/muro.
6. **Desconocido** si no hay mapa/casilla válida o no se puede clasificar.

Los contenedores de REQ-023 se pueden **tipar** en el modelo (`kind:
'container'` reservado) pero no deben renderizarse ni leerse de
`state.containers` en esta tarea: llegarán con REQ-020. No inventes contenido ni
trampas.

Añade un contenedor estable `data-testid="hud-cursor-detail"` con
`data-kind` (`enemy`, `ally`, `item`, `door`, `terrain`, `unknown`) y nodos
estables para título, estadísticas y notas. Los tests nuevos deben poder
comprobar el tipo y el texto sin depender de la estructura interna.

# Compatibilidad con los tests existentes

Estos IDs se usan hoy y deben seguir existiendo dentro del marco, con su
semántica y visibilidad cuando corresponda:

- Estado general: `hud`, `hud-phase`, `hud-turn`, `hud-status`,
  `hud-enemy-hp`, `hud-keys`, `hud-suggestion`, `hud-message`.
- Jugador: `hud-player-name`, `hud-archetype`, `hud-player-hp`,
  `hud-player-mp`, `hud-player-magic`, `hud-player-mana`, `hud-action`,
  `hud-stats`, `hud-weapon`, `weapon-hint`.
- Cursor: `hud-cursor-enemy-hp`, `hud-cursor-enemy-magic`,
  `hud-cursor-enemy-mana`, `hud-cursor-bands`, `hud-cursor-band-<tipo>`.

`hud-phase`, `hud-turn`, `hud-status` y `hud-enemy-hp` pueden vivir en una línea
compacta de estado dentro de la columna izquierda; no son una barra superior.
`hud-message` debe seguir siendo un aviso visible, legible y temporal, con
`role="status"`/`aria-live` como ahora. Los banners (`feedback-banner`), textos
de daño, marcas, `frame-effects`, `screen-fade` y el panel de inventario no
cambian de anclaje ni de comportamiento.

No cambies `KEYS_HELP` ni las teclas. Si algún test comprobaba un resumen de
equipo que la nueva ficha ya no muestra, adáptalo al sitio nuevo con una
aserción equivalente; no elimines la comprobación del comportamiento.

# Estilos y tokens

- Usa `var(--ui-line)` para grosores y `var(--ui-line-color)` para líneas.
- Usa `var(--ui-body)`, `var(--ui-data)` y `var(--ui-help)` para las escalas.
- No introduzcas `#hex`, `rgb(...)`, `rgba(...)` ni grosores en píxeles nuevos
  en el HUD. Si necesitas translúcidos, define un token semántico en `:root` o
  usa `color-mix` con tokens; no repitas literales.
- Sin radios, sombras difusas ni transiciones largas en lo nuevo (REQ-032
  R-001/R-005). Bordes duros y color plano.
- Comprueba a 900×700 que el texto no se recorta: `scrollWidth <= clientWidth+1`
  y `scrollHeight <= clientHeight+1` en los nodos medidos por `frame-qa`.
  Recorta contenido secundario, no la escala.
- El estado no puede depender solo del color: usa etiquetas de texto y
  `data-kind`.

# Pruebas

- Unitarias:
  - `tests/unit/host/hud.test.ts` o un `hud-detail.test.ts` nuevo: composición
    por tipo (enemigo, aliado, objeto, puerta, terreno y desconocido), prioridad
    de entrada/salida, puerta sin estilo, objeto sin cantidad inventada,
    contenedor no renderizado, LOS bloqueada con muro y sin jugador vivo.
  - Inmutabilidad: `buildHudModel`/`buildCursorDetail` no mutan el estado ni el
    RNG; compara snapshot antes/después.
  - Ficha izquierda: nombre/arquetipo, PV/MP/acciones, maná omitido con
    `mana.max === 0`, atributos efectivos, traits vacíos, cambio de turno y
    jugador con `hp <= 0` como fantasma.
- Integración:
  - El cursor cambia la ficha por tile sin cambiar el snapshot.
  - Turno y fantasma en la ficha izquierda.
  - Los anclajes de REQ-017 siguen: aviso de rechazo, banner, texto de daño y
    pulso del arma.
- E2E/visual:
  - Spec nueva `tests/e2e/hud-three-zones-qa.spec.ts` a 1280×720 y 900×700.
  - Capturas: tres zonas, enemigo, aliado, objeto, puerta, terreno y
    desconocido. Usa `E2E_ARTIFACTS_DIR=artifacts/TASK-0100/attempt-1` y
    `artifactPath` como el resto de specs.
  - Comprueba que el mapa sigue 13×13 y que `hud` y sus campos están dentro del
    viewport, sin recorte, en ambas resoluciones.
  - Para aliado, monta un estado de test con dos jugadores (`window.__game.setup`
    o `openState`) sin tocar reglas de producción; para puerta/terreno usa el BSP
    de referencia y mueve el cursor con teclado.

# Comandos y timeouts

- `pnpm exec vitest run tests/unit/host/hud.test.ts` (u archivo nuevo): 120 s.
- `pnpm run verify`: 120 s (docs, config, unitarios, build y bundle).
- `pnpm run test:e2e`: 180 s; Playwright usa su `webServer` y cierra Vite.
- No uses npm/npx. No dejes servidores ni procesos en background.
- Guarda salidas completas en `verify-output.txt`, `test-output.txt` y
  `e2e-output.txt`; no las pegues enteras en `report.md`.

# Evidencia y cierre del intento

- `report.md` con estado, archivos, commit SHA, tabla de comandos/resultados,
  rutas de capturas, desviaciones, problemas y fricción con disposición
  `pending`.
- `brief_bytes` y `report_bytes` medidos; si un handoff supera 4 KB, mueve el
  detalle a `brief-detalle.md`/`report-detalle.md`.
- No edites `docs/**` ni `tests` para relajar criterios; si algo no se puede
  cumplir, devuelve `blocked` con evidencia.
