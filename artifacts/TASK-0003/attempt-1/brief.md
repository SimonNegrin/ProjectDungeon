---
type: Task Brief
title: "Brief de ejecución — TASK-0003: teclado, HUD, overlays y E2E del loop"
description: Instrucciones acotadas para conectar el teclado al motor, añadir HUD, overlays, feedback de ataque, debug y el E2E del loop completo.
status: stable
task: TASK-0003
attempt: 1
created_at: 2026-11-07T15:55:00Z
generated: { by: deepseek/v4.1-flash, at: 2026-11-07T15:55:00Z }
---

# Tarea

[TASK-0003](/docs/tasks/TASK-0003-input-hud-e2e.md), derivada de
[REQ-001](/docs/requirements/REQ-001-primer-prototipo-local.md).

- `TASK-0001` y `TASK-0002` están `done` y fusionadas en `main` (`0090c64`).
- El motor determinista ya existe en `src/game/` y el host Canvas en
  `src/host/`.
- No reimplementes reglas ni cambies valores de la economía provisional.

# Objetivo

Convertir la escena renderizada en una partida jugable con teclado:

- `WASD`/flechas mueven al jugador.
- `Espacio`/`Enter` atacan al enemigo adyacente.
- `E` termina el turno y ejecuta la fase enemiga.
- `R` reinicia la partida.
- `F1` alterna un overlay de debug.
- HUD DOM legible con vida/MP del jugador, acción disponible, fase, vida del
  enemigo y ayuda de teclas.
- Overlays de victoria y derrota con reinicio.
- Feedback de ataque con flash y número de daño, sin animación de movimiento.
- `window.__game` permite leer el estado y despachar comandos para E2E
  determinista.
- E2E del loop completo: mover, atacar, terminar turno, observar la fase
  enemiga, ganar, reiniciar y comprobar la derrota, con capturas.

# Criterios de aceptación (no modificar)

- [ ] `WASD` y flechas envían comandos de movimiento al motor; una pulsación
      mueve una casilla y respeta muros, ocupación y MP.
- [ ] `Espacio` y `Enter` atacan al enemigo adyacente; si no hay objetivo, el
      comando no rompe el estado.
- [ ] `E` termina el turno, ejecuta la fase enemiga y devuelve el control al
      jugador.
- [ ] `R` reinicia la partida al estado inicial.
- [ ] `F1` alterna un overlay de debug con estado útil (coordenadas, MP, acción,
      fase y semilla si aplica).
- [ ] El HUD muestra vida y MP del jugador, acción disponible, fase actual, vida
      del enemigo y ayuda de teclas; se actualiza tras cada comando.
- [ ] Al morir el enemigo aparece el overlay de victoria; al morir el jugador,
      el de derrota. Ambos ofrecen reiniciar.
- [ ] El ataque produce flash y número de daño; no hay animación de movimiento.
- [ ] `window.__game` permite leer el estado y despachar comandos para tests.
- [ ] E2E: mover, atacar, terminar turno, observar la fase enemiga, ganar,
      reiniciar y comprobar la derrota. Guardar capturas de HUD y overlays.
- [ ] `pnpm run verify` y `pnpm run test:e2e` pasan.

# Contexto técnico

## Arquitectura existente

```text
src/game/
  types.ts      # GameState, Command, GameEvent, constantes provisionales
  engine.ts     # createInitialState() y reduce(state, command) puro
  turn.ts       # resolveEndTurn(): fase enemiga completa y vuelta al jugador
  movement.ts   # validación y commit de movimiento
  combat.ts     # ataque básico y adyacencia
  ai.ts         # plan determinista del enemigo
  grid.ts       # sala 32×24, muros, ocupación
src/host/
  main.ts       # bootstrap, carga de assets, render único actual
  renderer.ts   # renderScene(ctx, state, assets, camera, viewport, tileSize)
  camera.ts     # centerCameraOnTile() y clamp
  geometry.ts   # TILE_SIZE = 32
  debug.ts      # window.__game.snapshot() actual, solo lectura
  assets.ts     # carga local de 32rogues
index.html      # página /
```

- El motor ya implementa todo el loop. `reduce()` devuelve
  `{ state, events }` y no muta la entrada.
- `resolveEndTurn()` ejecuta la fase enemiga **de forma síncrona y atómica**:
  el estado final vuelve a `phase: 'player'`. No cambies esa regla. Para
  observar que la fase enemiga ocurrió, usa los eventos devueltos
  (`EnemyPhaseStarted`, `UnitMoved`, `AttackPerformed`, `PlayerTurnStarted`).
- No modifiques `src/game/` ni sus tests salvo que encuentres un fallo real que
  bloquee la tarea. Si ocurre, para y repórtalo; no parchees reglas.
- `src/host/renderer.ts` sigue sin conocer comandos ni reglas. El host puede
  importar de `src/game` lo necesario para construir comandos y llamar a
  `reduce`, pero el renderer no debe importar `engine`, `movement`, `combat`,
  `ai`, `turn` ni `grid`.

## Separación esperada

```text
Teclado -> input.ts (tecla -> intención/comando)
        -> main.ts / game-session (reduce)
        -> eventos
        -> renderer + HUD + overlays + feedback
```

Propuesta de módulos nuevos en `src/host/` (puedes ajustar nombres o fusionar
módulos pequeños si mantienes la separación y la testabilidad):

- `input.ts`: mapeo puro tecla -> comando/intención, sin DOM en la lógica de
  decisión; el listener concreto puede vivir en `main.ts` o en un `bindKeys`.
- `hud.ts`: vista DOM del HUD y overlays, actualizada desde `GameState` +
  eventos. La lógica de formateo debe ser testeable sin navegador.
- `feedback.ts` (opcional): flash/número de daño a partir de `AttackPerformed`.
- `debug.ts`: ampliar `window.__game` con `dispatch()`.
- `main.ts`: composición, listeners, render y arranque.

No añadas framework de UI ni dependencias nuevas. Usa DOM/CSS y TypeScript
estricto.

# Decisiones técnicas del brief

## 1. Controles y mapeo

| Tecla | Acción |
|---|---|
| `W` / `ArrowUp` | Mover `(0, -1)` |
| `S` / `ArrowDown` | Mover `(0, +1)` |
| `A` / `ArrowLeft` | Mover `(-1, 0)` |
| `D` / `ArrowRight` | Mover `(+1, 0)` |
| `Espacio` / `Enter` | Atacar al enemigo adyacente |
| `E` | `EndTurn` |
| `R` | `Restart` |
| `F1` | Alternar overlay de debug |

Reglas de input:

- Una pulsación = una acción. Ignora `event.repeat` para movimiento, ataque,
  fin de turno y reinicio.
- Ignora teclas con `ctrl`, `meta` o `alt` pulsados.
- No secuestres teclas cuando el foco esté en un `input`, `textarea`,
  `select` o elemento `contenteditable` (aunque `/` no los tenga, evita romper
  navegación con teclado).
- Llama a `preventDefault()` solo para teclas gestionadas (flechas, espacio,
  `F1`, etc.) para evitar scroll o ayuda del navegador.
- Antes de despachar movimiento/ataque/fin de turno, comprueba que la partida
  sigue `playing` y que la fase es la del jugador. En victoria/derrota solo
  `R` (y el botón de reinicio) deben actuar.
- Ataque: busca un enemigo vivo adyacente (Chebyshev 1). Si no hay objetivo,
  no despaches un ataque o despacha uno que el motor rechace sin mutar el
  estado; el estado y el HUD deben quedar intactos y no debe aparecer ningún
  error de consola.
- El listener puede usar `event.key`; normaliza `WASD` a minúsculas. Para
  `Space` usa `event.key === ' '` o `event.code === 'Space'`.

## 2. `window.__game`

Mantén la API actual de `snapshot()` y añade:

```ts
interface GameDebugApi {
  snapshot(): GameSnapshot; // ya existe; puede crecer con campos útiles
  dispatch(command: Command): {
    snapshot: GameSnapshot;
    events: GameEvent[];
  };
}
```

Requisitos:

- `dispatch()` usa exactamente el mismo camino que el teclado: `reduce()`,
  actualización de estado, render, HUD, overlays y feedback.
- El retorno debe ser serializable con `JSON.stringify` (sin ciclos ni
  referencias al estado vivo).
- Un comando rechazado devuelve el snapshot sin cambios y un evento
  `CommandRejected`; no lanza.
- El snapshot debe seguir incluyendo grid, players, enemies, phase, turn,
  status, camera, viewport, tileSize y assetsLoaded. Puedes añadir
  `lastEvents` o info de debug si es útil, pero no expongas mutadores.
- `dispatch()` debe estar disponible siempre o con `?test=1`; el E2E puede
  usarlo. No cambies reglas ni valores según el modo test.
- El motor no tiene RNG, así que la semilla no aplica: el overlay de debug
  puede mostrar `semilla: n/a (determinista)` o equivalente.

## 3. HUD DOM

Sustituye el layout de `index.html` por un contenedor de juego con HUD visible
y canvas. Mantén el canvas interno `960×600`, `image-rendering: pixelated`,
relación de aspecto `960/600` y el enlace a `/experiments/`. No rompas el
layout responsive de TASK-0002 (el canvas no debe deformarse).

El HUD debe mostrar, como mínimo:

- vida actual/máxima del jugador (`20/20`);
- MP actual/máximo (`4/4`);
- acción disponible (`Sí`/`No`);
- fase actual (`Jugador`/`Enemigo`, desde `state.phase`);
- vida actual/máxima del enemigo (`10/10`);
- ayuda de teclas;
- turno y estado si encaja visualmente.

Añade `data-testid` estables para que Playwright no dependa de textos frágiles.
Propuesta (puedes añadir más, no eliminar estos):

- `data-testid="hud"` en el contenedor.
- `data-testid="hud-player-hp"`, `hud-player-mp`, `hud-action`, `hud-phase`,
  `hud-enemy-hp`, `hud-keys`, `hud-turn`.
- `data-testid="overlay-victory"` y `data-testid="overlay-defeat"`, con
  `role="dialog"` y un `<button>` de reinicio cada uno.
- `data-testid="debug-overlay"`.
- `data-testid="damage-feedback"` para el número de daño.
- `data-testid="game-root"` para el contenedor posicionado del canvas, HUD y
  overlays.

El HUD debe actualizarse de forma síncrona después de cada comando, incluido
`dispatch()`, y tras reiniciar. Usa texto accesible y contraste suficiente.
No uses un framework ni `innerHTML` con datos no confiables; los valores son
números y textos controlados.

## 4. Overlays de victoria y derrota

- Visibles solo cuando `state.status === 'victory'` o `'defeat'`.
- Cubren el canvas sin ocultar el HUD de forma permanente; muestran el
  resultado y un botón «Reiniciar».
- El botón y `R` reinician al estado inicial, ocultan el overlay, restauran el
  HUD y recentran la cámara.
- El overlay debe ser legible en la captura y no depender de animación.
- Al reiniciar, no deben quedar restos de feedback de ataque ni del overlay de
  debug si estaba abierto (decide si F1 persiste; lo importante es que el
  estado de la partida sea el inicial).

## 5. Feedback de ataque

- Al procesar `AttackPerformed`, muestra un flash visual sobre el objetivo y
  un número de daño (`-5` del jugador al enemigo, `-3` del enemigo al jugador).
- El número debe estar en DOM con `data-testid="damage-feedback"` y texto
  legible; el flash puede ser una clase CSS, un overlay DOM o un dibujo en el
  Canvas. Si usas DOM, posiciónalo sobre la casilla del objetivo usando la
  cámara y `TILE_SIZE`, para que se vea junto al sprite.
- No hay animación de movimiento: el sprite cambia de casilla en el mismo
  frame; no interpoles posiciones ni uses transiciones de posición.
- El feedback no debe modificar el estado ni retrasar la lógica. Puede ser
  transitorio con CSS, pero en modo test debe poder comprobarse el texto/estado
  inmediatamente después del comando.
- También conviene feedback para el ataque enemigo, aunque el criterio se
  centra en el ataque del jugador.
- R-009 también menciona una casilla resaltada. Si el render lo permite sin
  tocar reglas, añade un resaltado discreto de la casilla del jugador activo o
  del objetivo; no es bloqueante para los criterios de esta tarea.

## 6. Debug (`F1`)

Overlay alternable, independiente del HUD normal, con información útil:

- posición del jugador y del enemigo;
- HP/MP y acción del jugador;
- HP del enemigo;
- fase, turno y estado;
- cámara (`x, y, maxX, maxY`) y viewport;
- últimos eventos si los mantienes;
- semilla: `n/a` porque el motor es determinista y no usa RNG.

Debe poder abrirse y cerrarse con `F1`, y su estado no debe alterar la partida.
No añadas un panel DOM gigante que tape el HUD normal de forma inevitable.

## 7. Render, cámara y reinicio

- Tras cada comando, actualiza la cámara para centrar al jugador activo y
  vuelve a dibujar el canvas (o usa un bucle de render determinista). La cámara
  debe seguir el movimiento y respetar el clamp existente.
- Al reiniciar, vuelve a `createInitialState()`, recentra la cámara y redibuja.
- No cambies `renderScene()` para que conozca comandos. Si necesitas dibujar
  feedback o resaltado, pásalo como datos de presentación o hazlo en DOM.
- Mantén el render sin animación de movimiento.

# Tests exigidos

Escribe tests desde los criterios, no desde la implementación. No borres,
saltes ni debilites tests existentes.

## Unitarios / integración (Vitest)

1. `tests/unit/host/input.test.ts`
   - `W/A/S/D` y las cuatro flechas producen el comando `Move` con `dx/dy`
     correctos para el jugador activo.
   - `Espacio` y `Enter` producen ataque al enemigo adyacente; sin enemigo
     adyacente no se produce un ataque destructivo (no-op o rechazo).
   - `E`, `R` y `F1` producen `EndTurn`, `Restart` y toggle de debug
     respectivamente.
   - `event.repeat` y modificadores no disparan acciones.
2. `tests/unit/host/hud.test.ts` (o equivalente)
   - el view-model del HUD refleja HP/MP, acción, fase, turno y HP del enemigo
     para estados iniciales, tras ataque, tras fin de turno y en victoria/
     derrota.
   - visibilidad de overlay de victoria/derrota y reinicio.
   - Si no usas DOM real, extrae funciones puras de formateo/visibilidad y
     pruébalas; evita añadir `jsdom` si no está ya disponible.
3. `tests/unit/host/session.test.ts` (o equivalente)
   - integración: tecla -> comando -> `reduce` -> eventos -> view-model del HUD.
   - `EndTurn` incluye `EnemyPhaseStarted` y `PlayerTurnStarted`, y el estado
     final vuelve a fase de jugador.
   - un ataque actualiza la vida y emite `AttackPerformed`; la muerte emite
     `UnitDied` y `GameEnded` con `victory`.
   - `Restart` vuelve al estado inicial.
4. Mantén los tests existentes de motor, cámara y renderer pasando. Si el
   contrato de `debug.ts` cambia, actualiza solo los tests de host afectados sin
   perder cobertura.

## E2E (Playwright)

Crea o amplía `tests/e2e/game-input-hud.spec.ts` (puedes mantener
`game-render.spec.ts` intacto):

- `page.goto('/')`, espera `window.__game` y `assetsLoaded`.
- Comprueba que el HUD muestra los valores iniciales y la ayuda de teclas.
- Movimiento con teclado real: pulsa `ArrowRight` o `d`, verifica posición
  `x+1`, MP `3` y HUD actualizado. Comprueba que una pulsación mueve una sola
  casilla y que un movimiento inválido (muro/ocupado) no cambia el estado.
- Ataque sin objetivo: pulsa `Espacio` lejos del enemigo; el estado no cambia,
  no hay excepción y el HUD sigue coherente.
- Prepara un estado de combate usando `window.__game.dispatch()` con comandos
  `Move`/`EndTurn` reales. No añadas un comando de teletransporte ni cargues
  estados a mano; la preparación debe pasar por las reglas.
- Ataca con `Espacio` o `Enter` cuando haya adyacencia: verifica
  `AttackPerformed`, HP del enemigo, acción usada y feedback `-5` visible.
- Pulsa `E`: verifica en los eventos devueltos por `dispatch` o en el estado
  que hubo `EnemyPhaseStarted` y que se vuelve a fase de jugador; comprueba el
  movimiento/ataque determinista del enemigo.
- Repite hasta matar al enemigo y comprueba el overlay de victoria. Captura
  `artifacts/TASK-0003/attempt-1/screenshots/hud.png` y
  `.../victory.png`.
- Reinicia con `R` o el botón: estado inicial, HP/MP completos, overlay oculto.
- Provoca la derrota dejando pasar turnos enemigos con `dispatch(EndTurn)` en
  bucle hasta que el jugador caiga. Comprueba el overlay de derrota y captura
  `.../defeat.png`.
- Comprueba `F1`: abre el overlay, verifica coordenadas/MP/fase, cierra y
  verifica que desaparece.
- Comprueba que no hay errores de consola ni `pageerror`.
- No uses diff de píxeles a pantalla completa. Las capturas son evidencia; las
  aserciones deben ser de estado, DOM y overlays.
- Mantén `tests/e2e/experiment-shell.spec.ts` intacto y pasando.

Sugerencia de preparación determinista para el E2E (no obligatoria): en
`page.evaluate`, mientras `status === 'playing'` y el enemigo no esté adyacente,
emite `Move` hacia el enemigo (1 casilla por comando, respetando MP) y
`EndTurn` cuando no queden MP; cuando esté adyacente, ataca y termina turnos
hasta la victoria. Usa el snapshot para decidir. Para la derrota, reinicia y
emite `EndTurn` en bucle hasta `status === 'defeat'`. Deja un límite de
iteraciones (por ejemplo 60) y falla con un mensaje claro si se agota, para no
colgar el test.

# Comandos y timeouts

Usa siempre pnpm (nunca npm/npx) y timeout explícito:

| Comando | Timeout | Qué valida |
|---|---:|---|
| `pnpm run test` | 120 s | Input, HUD, sesión e integración |
| `pnpm run build` | 120 s | `tsc --noEmit` + build de Vite |
| `pnpm exec playwright test tests/e2e/game-input-hud.spec.ts` | 240 s | Loop completo y capturas |
| `pnpm run test:e2e` | 240 s | Toda la suite E2E, incluido el shell de experimentos |
| `pnpm run verify` | 180 s | Docs, config, tests y build |
| `pnpm run docs:check` | 60 s | Solo si tocas Markdown de artefactos |

Playwright usa su `webServer` con Vite en el puerto 4173 y lo cierra solo. No
dejes servidores ni procesos en background al terminar. Si un comando agota el
timeout, páralo, guarda la salida y repórtalo con una hipótesis; no repitas el
mismo comando sin cambios.

# Documentación y alcance

- No edites `docs/` ni `experiments/`; el cierre de tarea, `docs/log.md`,
  `docs/tasks/index.md` y el README los actualiza el `task-lead`.
- No cambies requisitos, criterios, ADRs ni la hoja REQ-001.
- No modifiques las reglas ni los valores de `src/game/` (`PLAYER_MAX_HP`,
  `ENEMY_MAX_HP`, MP, daños, coste de movimiento, IA, etc.).
- No añadas animaciones de movimiento, audio, servidor, red, persistencia ni
  un framework de UI.
- No importes código de `experiments/` desde producción.
- Mantén `/experiments/` funcionando y no toques su comportamiento.
- No hagas commit en `main`; trabaja solo en `task/TASK-0003`.
- No fusiones ni marques la tarea como `done`; eso es del `task-lead`.

# Artefactos y commit

Guarda en `artifacts/TASK-0003/attempt-1/`:

- `report.md` con frontmatter OKF, resumen, archivos, comandos/timeouts,
  resultados, SHA del commit de implementación, criterios -> tests y
  desviaciones.
- `test-output.txt` con la salida de los comandos ejecutados.
- `screenshots/hud.png`, `screenshots/victory.png` y
  `screenshots/defeat.png` como mínimo. Puedes añadir `attack.png` o
  `debug.png`.
- `logs/` si hay algo relevante.

Haz commit en `task/TASK-0003` con un mensaje tipo
`feat(host): add keyboard input, HUD and game loop e2e` o similar. Incluye
código, tests, `index.html`, artefactos y capturas. Si necesitas un commit
posterior para el informe con el SHA, sigue el patrón de tareas anteriores y
explica ambos SHA.

# Qué debe devolver el runner

1. Estado: `done`, `blocked` o `failed`.
2. Commit SHA de implementación y SHA de artefactos si existe.
3. Archivos creados/modificados.
4. Comandos ejecutados, timeout y resultado.
5. Evidencia: capturas, salida de tests, snapshots/eventos E2E.
6. Desviaciones, decisiones menores y preguntas abiertas.
7. Confirmación explícita de que no se han tocado reglas ni valores de
   `src/game/`, de que no se han debilitado tests y de que no hay procesos en
   background.
