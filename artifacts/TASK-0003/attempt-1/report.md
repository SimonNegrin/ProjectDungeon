---
type: Task Report
title: "Informe de ejecución — TASK-0003: teclado, HUD, overlays y E2E del loop"
description: Partida jugable con teclado, HUD DOM, overlays de resultado, feedback de ataque, debug y E2E determinista del loop completo.
task: TASK-0003
attempt: 1
status: stable
created_at: 2026-11-07T16:05:00Z
generated: { by: deepseek/v4.1-flash, at: 2026-11-07T16:05:00Z }
---

# Resumen

Se ha convertido la escena de TASK-0002 en una partida jugable con teclado. El
host mantiene la separación motor / render / input / HUD:

```text
Teclado -> input.ts (tecla -> intención/comando)
        -> GameSession.dispatch (reduce)
        -> eventos
        -> renderer + HUD DOM + overlays + feedback
```

`window.__game` conserva `snapshot()` y añade `dispatch(command)`, que usa
exactamente el mismo camino que el teclado. El E2E recorre movimiento, ataque,
fin de turno, fase enemiga, victoria, reinicio, debug y derrota con capturas.

Estado: **done** en cuanto a implementación y pruebas ejecutadas. No se marca la
tarea como terminada ni se fusiona: la verificación independiente corresponde al
`task-lead`.

# Archivos

Creados:

- `src/host/input.ts` — mapeo puro tecla → comando/intención, sin DOM.
- `src/host/hud.ts` — modelos puros del HUD y del debug, vista DOM del HUD y
  overlays de resultado.
- `src/host/feedback.ts` — `AttackPerformed` → objetivo, daño y posición.
- `src/host/session.ts` — `GameSession`, estado actual y `dispatch()` con
  `reduce`.
- `tests/unit/host/input.test.ts`
- `tests/unit/host/hud.test.ts`
- `tests/unit/host/session.test.ts`
- `tests/unit/host/debug.test.ts`
- `tests/unit/host/feedback.test.ts`
- `tests/e2e/game-input-hud.spec.ts`
- `artifacts/TASK-0003/attempt-1/test-output.txt`
- `artifacts/TASK-0003/attempt-1/screenshots/hud.png`
- `artifacts/TASK-0003/attempt-1/screenshots/attack.png`
- `artifacts/TASK-0003/attempt-1/screenshots/victory.png`
- `artifacts/TASK-0003/attempt-1/screenshots/defeat.png`
- `artifacts/TASK-0003/attempt-1/screenshots/debug.png`
- `artifacts/TASK-0003/attempt-1/report.md` (commit de artefactos)

Modificados:

- `index.html` — layout con HUD DOM, canvas 960×600 responsive, overlays de
  victoria/derrota, overlay de debug, número de daño, flash de ataque y
  resaltado discreto de la casilla del jugador. Se mantiene el enlace a
  `/experiments/`.
- `src/host/main.ts` — composición de sesión, assets, render, cámara, HUD,
  overlays, feedback, listeners de teclado y botones de reinicio.
- `src/host/debug.ts` — `snapshot()` ampliado con `lastEvents` y
  `dispatch(command)` con retorno serializable.

# Comandos, timeouts y resultados

| Comando | Timeout | Resultado |
|---|---:|---|
| `pnpm run test` | 120 s | OK — 15 archivos, 106 tests, 0 fallos. |
| `pnpm run build` | 120 s | OK — `tsc --noEmit` y `vite build`. |
| `pnpm run test:e2e` | 240 s | OK — 3 tests (loop nuevo, render de TASK-0002 y shell de experimentos). |
| `pnpm run verify` | 180 s | OK — docs (39 documentos, 3 tareas, 1 experimento), config, 106 tests y build. |

La salida completa está en `artifacts/TASK-0003/attempt-1/test-output.txt`.
Playwright usó su `webServer` con Vite en el puerto 4173 y lo cerró al terminar;
no quedan servidores ni procesos en background.

# Commit

- Commit de implementación, tests y artefactos de ejecución:
  `366782fd29d9fb0f412f35728aebcdc405c062af`
  (`feat(host): add keyboard input, HUD and game loop e2e`).
- Este informe se añade en un commit de artefactos posterior para evitar la
  dependencia circular entre el SHA y el propio contenido del informe.

# Criterios de aceptación → tests

| Criterio | Test(s) / evidencia |
|---|---|
| `WASD` y flechas mueven una casilla y respetan muros, ocupación y MP. | `input.test.ts`: las ocho teclas producen `Move` con `dx/dy` correctos. `game-input-hud.spec.ts`: `ArrowRight` pasa de `x=2` a `x=3` y MP `4→3`; `d` suma otra casilla; `a` contra el muro oeste no cambia posición ni MP; `R` restaura `(2,2)` y `4/4`. La ocupación y el consumo de MP del motor siguen cubiertos por los tests de `src/game/` sin cambios. |
| `Espacio` y `Enter` atacan al enemigo adyacente; sin objetivo no rompen el estado. | `input.test.ts`: ambos producen `Attack` contra un enemigo adyacente y devuelven no-op `no-target` sin adyacencia o con el enemigo muerto. `game-input-hud.spec.ts`: `Space` lejos del enemigo deja snapshot y HUD intactos; `dispatch(Attack)` devuelve `CommandRejected` sin lanzar. |
| `E` termina el turno, ejecuta la fase enemiga y devuelve el control. | `session.test.ts`: `EndTurn` incluye `EnemyPhaseStarted` y `PlayerTurnStarted`, vuelve a `phase: 'player'` y restaura HP/MP/acción. `game-input-hud.spec.ts`: tras pulsar `e`, `lastEvents` contiene ambas fases y el ataque enemigo determinista de 3; HUD en fase Jugador. |
| `R` reinicia al estado inicial. | `session.test.ts`: `Restart` emite `GameRestarted` y deja el estado igual a `createInitialState()`. E2E: reinicio tras movimiento, tras victoria y reinicio con el botón tras derrota. |
| `F1` alterna el overlay de debug con coordenadas, MP, acción, fase y semilla. | `hud.test.ts`: el modelo incluye jugador `(2,2)`, MP `4/4`, enemigo `(29,21)`, fase, turno, cámara, viewport y `Semilla: n/a (determinista)`. E2E: `F1` abre, comprueba el texto, cierra y verifica que la partida sigue `playing`. |
| El HUD muestra vida/MP, acción, fase, vida enemiga y ayuda; se actualiza tras cada comando. | `hud.test.ts`: estados inicial, tras ataque, tras fin de turno, victoria y derrota. E2E: `hud-player-hp`, `hud-player-mp`, `hud-action`, `hud-phase`, `hud-enemy-hp`, `hud-turn`, `hud-status` y `hud-keys` tras movimiento, ataque, turno y reinicio. |
| Overlays de victoria y derrota con reinicio. | `hud.test.ts`: visibilidad derivada de `status`. E2E: overlay de victoria visible y capturado; overlay de derrota visible y capturado; el botón «Reiniciar» del overlay de derrota restaura el estado inicial. |
| El ataque produce flash y número de daño; sin animación de movimiento. | `feedback.test.ts`: `AttackPerformed` produce daño y posición, también para el ataque enemigo. E2E: tras atacar, `damage-feedback` muestra `-5`, `attack-flash` está activo y el HUD baja el enemigo a `5/10`. El sprite cambia de casilla en el mismo frame; no hay interpolación ni transición de posición. |
| `window.__game` permite leer el estado y despachar comandos. | `debug.test.ts`: snapshot serializable con cámara, viewport, assets y `lastEvents`; `dispatch()` devuelve snapshot y eventos serializables; el rechazo devuelve `CommandRejected`; el snapshot es una copia. E2E usa `dispatch` para acercarse al enemigo con `Move`/`EndTurn` reales y para provocar la derrota. |
| E2E del loop completo con capturas. | `game-input-hud.spec.ts`: HUD inicial, movimiento, muro, ataque sin objetivo, aproximación determinista, ataque `-5`, `E` con fase enemiga, victoria, reinicio, debug, derrota y reinicio por botón. Capturas `hud.png`, `attack.png`, `victory.png`, `debug.png` y `defeat.png`. |
| `pnpm run verify` y `pnpm run test:e2e` pasan. | Ambos comandos OK; salida en `test-output.txt`. |

# Evidencia E2E

- HUD inicial: `20/20`, `4/4`, acción `Sí`, fase `Jugador`, enemigo `10/10`,
  `Turno 1`, estado `En juego`.
- Movimiento real: `ArrowRight` → `(3,2)` y `3/4`; `d` → `(4,2)` y `2/4`.
- Muro: desde `(1,2)`, otra pulsación hacia el oeste mantiene `(1,2)` y `3/4`.
- Ataque sin objetivo: snapshot y HUD sin cambios; sin `pageerror` ni errores de
  consola.
- Ataque adyacente: enemigo `10→5`, acción `No`, feedback DOM `-5`, flash
  activo, HUD `5/10`.
- Fin de turno: `EnemyPhaseStarted`, ataque enemigo de `3`, `PlayerTurnStarted`,
  jugador `17/20`, MP `4/4`, acción `Sí`, turno siguiente.
- Segundo ataque: enemigo a `0`, `status: victory`, overlay de victoria visible
  con botón «Reiniciar».
- Reinicio: `(2,2)`, `20/20`, `4/4`, `Turno 1`, overlays ocultos y feedback
  limpio.
- Derrota: 33 turnos enemigos (límite de seguridad 80); jugador `0/20`, overlay
  de derrota visible. El botón restaura el estado inicial.
- La suite completa también mantiene `game-render.spec.ts` y
  `experiment-shell.spec.ts` en verde.

# Desviaciones y decisiones menores

1. **Ataque sin objetivo en el teclado.** El mapeo devuelve un no-op explícito
   (`no-target`) sin despachar, permitido por el brief. El `dispatch(Attack)`
   directo sí llega al motor y devuelve `CommandRejected` sin mutar el estado.
2. **`F1` durante victoria/derrota.** El overlay de debug puede abrirse siempre
   porque no es una acción de juego; solo `R` y el botón de reinicio cambian el
   estado de la partida. Se interpreta así la regla «solo R debe actuar».
3. **Reinicio y debug.** Reiniciar cierra el overlay de debug y limpia el
   feedback de ataque para no dejar restos visuales. Se eligió no persistir F1
   entre partidas.
4. **Feedback transitorio.** El número de daño permanece en DOM 1200 ms y el
   flash 400 ms. El E2E lo comprueba inmediatamente después del comando, como
   exige el brief, y el reinicio lo limpia de forma síncrona.
5. **Resaltado de casilla.** Se añadió un resaltado DOM discreto sobre la casilla
   del jugador activo, sin tocar `renderer.ts` ni las reglas.
6. **Captura de TASK-0002.** `tests/e2e/game-render.spec.ts` sigue escribiendo
   `artifacts/TASK-0002/attempt-1/screenshots/room.png`; con el HUD nuevo esa
   captura se regenera al ejecutar la suite. Se revirtió del commit para no
   alterar artefactos de una tarea anterior; volverá a cambiar si el lead
   re-ejecuta `pnpm run test:e2e`, que es el comportamiento esperado del test
   existente.
7. **Listeners tras cargar assets.** El teclado se activa cuando los assets
   están listos y `window.__game` ya está publicado, para que cualquier acción
   tenga render y HUD coherentes.

# Confirmación de alcance

- No se ha modificado `src/game/` ni ninguno de sus tests o valores.
- No se han borrado, saltado ni debilitado tests existentes.
- No se han añadido dependencias, frameworks de UI, audio, red, persistencia ni
  animación de movimiento.
- No se ha tocado `experiments/` ni `tests/e2e/experiment-shell.spec.ts`; la
  suite E2E del shell sigue pasando.
- No se ha editado `docs/` ni `experiment.md`.
- No se ha cambiado de rama (`task/TASK-0003`), no se ha fusionado nada y no se
  ha marcado TASK-0003 como `done`.
- No quedan procesos ni servidores en background.

# Preguntas abiertas

Ninguna bloqueante. El juicio de legibilidad, comodidad de cámara y sensación
del loop queda para el playtest del usuario.
