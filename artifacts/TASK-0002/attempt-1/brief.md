---
type: Task Brief
title: "Brief de ejecución — TASK-0002: host Canvas, sala, sprites y cámara"
description: Instrucciones acotadas para implementar la página de juego, el render Canvas 2D y la cámara con clamp.
status: stable
task: TASK-0002
attempt: 1
created_at: 2026-11-07T15:36:49Z
generated: { by: deepseek/v4.1-flash, at: 2026-11-07T15:36:49Z }
---

# Tarea

[TASK-0002](/docs/tasks/TASK-0002-host-canvas-camara.md), derivada de
[REQ-001](/docs/requirements/REQ-001-primer-prototipo-local.md). La dependencia
TASK-0001 está `done` en `main` (`15b7a27`) y el motor de `src/game/` no debe
reimplementarse ni modificarse.

# Objetivo

Convertir la entrada `/` en una página de juego que renderice con Canvas 2D la
sala de 32×24 del motor, dibuje al caballero y al goblin con los sprites de
32rogues y mantenga una cámara que sigue al jugador y se limita a los bordes del
mapa. Sin teclado, HUD completo, overlays ni reinicio: eso es TASK-0003.

# Contexto de arquitectura

- El motor es determinista y no conoce DOM ni Canvas: `src/game/`.
- El host vive en `src/host/` y solo lee `GameState`; no llama a `reduce` ni
  implementa reglas de movimiento, combate o turnos.
- La página de juego es `/` (`index.html`). La ruta `/experiments/` debe seguir
  funcionando tal cual.
- Sin framework de UI y sin dependencias nuevas de runtime.
- Assets locales en `public/assets/32rogues/`; nada de CDN ni red en runtime.

# Criterios de aceptación (no modificar)

- [ ] Existe una página de juego que arranca con `pnpm run dev` y muestra la
      sala de 32×24 con tiles de 32 px.
- [ ] El suelo y los muros usan los tiles de 32rogues; el borde del mapa está
      cerrado por muros y no se puede atravesar.
- [ ] El jugador se dibuja con el sprite del caballero y el enemigo con el del
      goblin, centrados en su casilla y con escala nítida.
- [ ] La cámara sigue al jugador y se limita a los bordes del mapa; la sala es
      mayor que el viewport para que el desplazamiento sea observable.
- [ ] El canvas se adapta al tamaño de la ventana sin deformar los tiles.
- [ ] El render lee el estado del motor y no implementa reglas de movimiento,
      combate ni turnos.
- [ ] El estado se expone en `window.__game` al menos con un snapshot
      serializable para depuración y tests visuales.
- [ ] Los assets se cargan desde `public/assets/32rogues/` y la página funciona
      sin red.
- [ ] `LICENSE.txt` y el crédito a Seth Boyles están presentes en los assets.
- [ ] `pnpm run verify` y `pnpm run build` pasan; hay una captura de la sala.

# Decisiones técnicas del brief

## 1. Estructura propuesta

```text
src/host/
  assets.ts      # carga de imágenes y definición de rectángulos de sprites/tiles
  camera.ts      # matemática pura de cámara: follow + clamp en 4 bordes
  geometry.ts    # casilla -> píxel y rango visible de tiles
  renderer.ts    # dibuja estado + cámara en un CanvasRenderingContext2D
  debug.ts       # tipos de window.__game y snapshot serializable
  main.ts        # bootstrap: canvas, carga, render inicial, resize
index.html       # página de juego (sustituye el arnés actual)
```

Puedes ajustar nombres o fusionar módulos pequeños si mantienes la separación
render/reglas. No crees un motor nuevo ni un ECS.

## 2. Geometría real de los PNG

Comprobada con `sips`; usa estos recortes salvo que un test visual demuestre que
la cuadrícula real es distinta y lo justifiques en el informe.

| Asset | Tamaño | Rejilla | Recorte | Uso |
|---|---:|---|---|---|
| `tiles.png` | 544×832 | 17×26 de 32 px | `(0, 64, 32, 32)` | muro de ladrillo de piedra, top |
| `tiles.png` | 544×832 | 17×26 de 32 px | `(32, 64, 32, 32)` | muro de ladrillo, side 1 |
| `tiles.png` | 544×832 | 17×26 de 32 px | `(64, 64, 32, 32)` | muro de ladrillo, side 2 |
| `tiles.png` | 544×832 | 17×26 de 32 px | `(32, 288, 32, 32)` | stone floor 1 |
| `tiles.png` | 544×832 | 17×26 de 32 px | `(64, 288, 32, 32)` | stone floor 2 |
| `tiles.png` | 544×832 | 17×26 de 32 px | `(96, 288, 32, 32)` | stone floor 3 |
| `rogues.png` | 224×224 | 7×7 de 32 px | `(0, 32, 32, 32)` | caballero (fila 2, columna 1) |
| `monsters.png` | 384×416 | 12×13 de 32 px | `(64, 0, 32, 32)` | goblin (fila 1, columna 3) |

Variantes deterministas para dar textura, sin aleatoriedad:

- suelo: una de las tres variantes según `(x * 7 + y * 13) % 3`;
- muro: el tile `top` en `y === 0`; en el resto de bordes alterna `side 1` y
  `side 2` según `(x + y) % 2`.

El borde del mapa lo define el motor (`createRoomGrid`); el render solo debe
reflejarlo. No añadas muros ni casillas transitables nuevas.

## 3. Cámara

- Viewport de referencia: `960×600` px. Sala completa: `32×24×32 = 1024×768` px.
- La cámara es la esquina superior izquierda del viewport en píxeles de mundo.
- Objetivo: centrar al jugador (`(unit.x + 0.5) * 32`, `(unit.y + 0.5) * 32`).
- Clamp: `x ∈ [0, max(0, 1024 - viewport.width)]`,
  `y ∈ [0, max(0, 768 - viewport.height)]`. Con 960×600: máximos `(64, 168)`.
- Redondea a enteros para que los tiles no se dibujen en posiciones
  fraccionarias y vuelve a aplicar el clamp tras redondear.
- Si el viewport es mayor que el mundo, la cámara debe quedar en `0,0`.
- Expón funciones puras y testéalas sin DOM.

## 4. Render

- `renderScene(ctx, state, assets, camera, viewport, tileSize = 32)`.
- Solo puede importar tipos de `src/game` (`GameState`, `Unit`, `Tile`). No
  importes `reduce`, `movement`, `combat`, `ai` ni `turn` desde el renderer.
- `ctx.imageSmoothingEnabled = false`; `fillRect` de fondo oscuro; traslada por
  `-camera.x/-camera.y` y dibuja suelo, muros, enemigos y jugador en ese orden.
- Puedes recortar tiles fuera del viewport con `visibleTileRange`; no es
  obligatorio, pero si lo haces, los tests deben cubrirlo.
- Entidades centradas en su casilla con `dx = unit.x * tileSize +
  (tileSize - 32) / 2` (equivalente a la esquina con tile 32).
- No muta el estado ni lee teclado/red/tiempo real.

## 5. Página y canvas responsive

- `index.html` debe cargar `<script type="module" src="/src/host/main.ts"></script>`
  y eliminar el contenido de arnés. Mantén un enlace discreto a `/experiments/`.
- Canvas interno fijo `960×600`. CSS: fondo oscuro, canvas centrado,
  `image-rendering: pixelated`, relación de aspecto `960 / 600` y tamaño que se
  adapte a la ventana (`width: min(100%, ...)`, `max-height`), sin deformar.
- No añadas HUD, textos de vida/MP, overlays ni listeners de teclado.
- `?test=1` no es necesario en esta tarea; no lo implementes salvo que sea
  trivial y no cambie el alcance.

## 6. `window.__game`

Debe existir tras cargar la página y los assets. Mínimo:

```ts
interface GameDebugApi {
  snapshot(): {
    grid: { width: number; height: number; tiles: readonly ('floor' | 'wall')[] };
    players: readonly Unit[];
    enemies: readonly Unit[];
    phase: 'player' | 'enemy';
    turn: number;
    status: 'playing' | 'victory' | 'defeat';
    camera: { x: number; y: number; maxX: number; maxY: number };
    viewport: { width: number; height: number };
    tileSize: number;
    assetsLoaded: boolean;
  };
}
declare global {
  interface Window { __game?: GameDebugApi }
}
```

El retorno de `snapshot()` debe pasar `JSON.stringify` sin errores ni ciclos. No
expongas comandos, `step()` ni mutadores; son TASK-0003.

## 7. Assets

- Carga con `new Image()` desde rutas absolutas del bundle:
  `/assets/32rogues/tiles.png`, `/assets/32rogues/rogues.png`,
  `/assets/32rogues/monsters.png`.
- Espera a que las tres imágenes estén listas antes de renderizar y marcar
  `assetsLoaded: true`. Si falla una carga, muestra un error legible en consola
  y no dejes un canvas vacío silencioso.
- No copies, muevas ni modifiques los assets. `LICENSE.txt` y el crédito a Seth
  Boyles ya están versionados; no los borres.

# Tests exigidos

Crea tests desde los criterios, no desde la implementación:

1. `tests/unit/host/camera.test.ts`
   - `tileToPixel(0,0) = (0,0)` y `tileToPixel(3,2) = (96,64)`.
   - jugador en el centro de la sala -> cámara centrada.
   - clamp en los cuatro bordes y en las cuatro esquinas.
   - jugador en `(2,2)` -> cámara `(0,0)`; máximos `(64,168)` con 960×600.
   - mundo menor que el viewport -> `(0,0)`.
   - salida entera.
2. `tests/unit/host/renderer.test.ts`
   - contexto 2D falso que registra `drawImage`.
   - con el estado inicial y cámara `(0,0)`, dibuja suelo y muros (>= 500 tiles).
   - verifica el recorte del caballero `(0,32,32,32)`.
   - renderiza con una cámara cercana al enemigo y verifica el recorte del
     goblin `(64,0,32,32)`.
   - no se llama a reglas del motor; el render solo recibe estado.
3. `tests/e2e/game-render.spec.ts`
   - `page.goto('/')`, espera `window.__game`.
   - snapshot: grid 32×24, `tileSize: 32`, un jugador `player-1`, un enemigo
     `enemy-1`, `phase: 'player'`, `assetsLoaded: true`.
   - cámara dentro de `[0,maxX] × [0,maxY]`; con el spawn actual `(0,0)` y
     máximos `(64,168)`.
   - canvas visible con tamaño interno 960×600 y píxeles no vacíos
     (`getImageData`; usa un umbral razonable, no un hash de píxeles).
   - relación de aspecto del canvas ≈ `960/600` a 1280×720 y a 800×600.
   - `page.screenshot` a `artifacts/TASK-0002/attempt-1/screenshots/room.png`.
   - sin errores de consola ni excepciones de página.
4. Mantén `tests/e2e/experiment-shell.spec.ts` intacto y pasando.

No borres, saltes ni debilites tests existentes. No cambies tests del motor. Si
un test del motor falla, para y repórtalo: no es de esta tarea.

# Comandos y timeouts

Ejecuta siempre con `timeout` explícito y usa pnpm (nunca npm/npx):

| Comando | Timeout | Qué valida |
|---|---:|---|
| `pnpm run test` | 120 s | Unitarios de cámara, geometría y render |
| `pnpm run build` | 120 s | `tsc --noEmit` + build de Vite |
| `pnpm exec playwright test tests/e2e/game-render.spec.ts` | 180 s | Render, snapshot y captura |
| `pnpm run test:e2e` | 180 s | No romper el shell de experimentos |
| `pnpm run verify` | 180 s | Docs, config, tests y build |

Playwright usa su `webServer` con Vite en el puerto 4173 y lo cierra solo. No
dejes servidores ni procesos en background al terminar. Si un comando agota el
timeout, páralo, guarda la salida y repórtalo con hipótesis; no repitas el mismo
comando sin cambios.

# Documentación

- Actualiza `README.md` solo en lo imprescindible: el estado actual ya no es
  «fase 0 sin código de juego» y `pnpm run dev` abre el juego en `/`.
- No cambies requisitos, ADRs, tareas ni la hoja REQ-001. El cierre de tarea y
  `docs/log.md` los hace `task-lead`.
- Si añades un archivo Markdown, debe llevar frontmatter OKF válido (`type`,
  `title`, `description`, `status`, `generated`).

# Restricciones y no objetivos

- No implementes teclado, HUD, overlays, reinicio, turnos ni animaciones.
- No modifiques `src/game/` ni sus tests.
- No toques `experiments/` salvo que sea estrictamente necesario; debe seguir
  funcionando.
- No añadas dependencias, frameworks, CDN ni peticiones de red.
- No cambies `vite.config.ts` salvo que el build lo exija y lo justifiques.
- No hagas commit en `main`; trabaja solo en `task/TASK-0002`.
- No fusiones ni marques la tarea como `done`; eso es del `task-lead`.

# Artefactos y commit

Guarda en `artifacts/TASK-0002/attempt-1/`:

- `report.md` con frontmatter OKF, resumen, archivos, comandos/timeouts,
  resultados, SHA del commit de implementación, criterios -> tests y desviaciones;
- `test-output.txt` con la salida de los comandos ejecutados;
- `screenshots/room.png` (captura real de Playwright);
- `logs/` si hay algo relevante.

Commit en `task/TASK-0002` con mensaje `feat(host): render room, sprites and
clamped camera` o similar. Incluye código, tests, `index.html`, README,
artefactos y captura. Si necesitas un commit posterior para el informe con el
SHA, sigue el patrón de TASK-0001 y explica ambos SHA.

# Qué debe devolver el runner

1. Estado: `done`, `blocked` o `failed`.
2. Commit SHA de implementación y SHA de artefactos si existe.
3. Archivos creados/modificados.
4. Comandos ejecutados, timeout y resultado.
5. Evidencia: captura, salida de tests, snapshot E2E.
6. Desviaciones, decisiones menores y preguntas abiertas.
7. Confirmación explícita de que no se han tocado reglas ni tests del motor y
   de que no hay procesos en background.
