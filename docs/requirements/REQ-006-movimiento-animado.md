---
type: Requirement Sheet
id: REQ-006
title: Movimiento animado paso a paso y cámara que sigue
description: Animar el recorrido de los personajes tile a tile con pausa, cámara que sigue al personaje e input bloqueado hasta terminar, sin cambiar las reglas del motor.
status: draft
version: 1
decision_owner: human:simon
review_required: true
created_at: 2026-11-08T09:51:14Z
updated_at: 2026-11-08T09:51:14Z
related_tasks: [TASK-0017]
generated: { by: deepseek/v4.1-flash, at: 2026-11-08T09:51:14Z }
verified:
  - by: human:simon
    at: 2026-11-08T09:51:14Z
    note: Aprueba animar a jugador y enemigos, la cámara continua a píxel entero, el bloqueo de input, el cursor oculto, el MP progresivo y que el ritmo se decida con EXP-002. La hoja queda en borrador hasta esa decisión.
---

# Contexto

Hoy **Moverse** es un teletransporte: el motor recorre el camino de golpe y el
personaje aparece en el destino. Los pasos intermedios existen en el motor
(`UnitMoved` con `from`, `to` y `mpLeft`), pero el host los presenta de una vez.
Lo mismo ocurre con el enemigo en la fase enemiga.

El salto hace difícil leer el camino ejecutado, el coste real en MP y dónde se
detiene un movimiento ámbar. En un camino de 6 pasos el jugador solo ve el
resultado. Esta hoja añade una **capa de presentación animada** sobre el motor:

- el personaje recorre el camino tile a tile, con transición entre tiles;
- hay una pausa breve en cada tile, también al llegar;
- la cámara le sigue mientras camina, limitada al mapa;
- el input de juego se ignora hasta que el recorrido termina.

El motor, el camino, la economía de turno, el combate, el mapa, el viewport de
13×13 y el HUD no cambian sus reglas. `MoveTo` sigue siendo atómico y
determinista; los eventos ya contienen todo lo necesario para reconstruir el
recorrido en el host. La animación es la forma de presentar ese resultado, no una
segunda simulación.

El ritmo (duración de paso, pausa y tratamiento de la diagonal) es una decisión
de sensación y lo decide el usuario con [EXP-002](../../experiments/EXP-002-ritmo-movimiento/experiment.md).
Hasta esa decisión, esta hoja queda en borrador.

# Objetivos de experiencia

- Ver el recorrido completo y entender qué tiles se han pisado.
- Sentir el coste de cada paso y por qué un movimiento ámbar se detiene antes.
- No perder al personaje de vista: la cámara lo acompaña, no salta al final.
- Que el movimiento se lea como una acción deliberada y no como un fallo de
  teletransporte.
- Que la fase enemiga sea legible: se ve de dónde a dónde va cada enemigo.
- Que la espera no se sienta como un bloqueo arbitrario: el input se ignora
  mientras el personaje camina, y vuelve en cuanto termina.
- Conservar la nitidez del pixel art y el determinismo del motor.

# Requisitos creativos

| ID | Requisito | Aceptación |
|---|---|---|
| R-001 | Todo movimiento de una unidad viva se presenta como un recorrido tile a tile por el camino ejecutado: `MoveTo`, `Move` y el tramo de acercamiento de Moverse sobre un enemigo. Se aplica al jugador y a los enemigos. No hay teletransportes ni pasos instantáneos. | En un `MoveTo` de 3 pasos se observan las posiciones de los 3 tiles; ningún frame muestra la unidad en el destino antes del último paso; no hay saltos de más de un tile. |
| R-002 | Entre dos tiles consecutivos hay una transición animada continua: el sprite pasa por posiciones intermedias entre los centros, sin saltar. En diagonal la trayectoria es una línea recta. La diagonal tarda lo mismo que un paso recto o ~1,41× según decida EXP-002 (velocidad constante o duración constante). | Un muestreo a mitad de transición muestra el sprite entre dos centros contiguos; en diagonal la trayectoria es recta; la duración de la diagonal coincide con la opción elegida. |
| R-003 | En cada tile hay una pausa breve antes de continuar, incluido el tile de destino antes de devolver el control. La pausa es la misma en todos los pasos y no se omite en el primero ni en el último. | Con el reloj de presentación, cada tile incluido el destino permanece al menos `pauseMs` antes del siguiente paso o del fin; ningún paso se salta la pausa. |
| R-004 | El ritmo de la animación (duración de paso, pausa por tile y regla de diagonal) es el que decida EXP-002 y vive en una única configuración de presentación. | Los valores vigentes coinciden con la decisión registrada de EXP-002; cambiarlos no requiere tocar reglas de juego ni tests de motor. |
| R-005 | La cámara sigue al personaje animado de forma continua, redondeando a píxel entero y limitándose a los bordes del mapa. No añade saltos ni se mueve al mover el cursor. | En frames intermedios el personaje está a ≤1 px del centro del viewport salvo clamp; los offsets de cámara son enteros; con el cursor en movimiento la cámara no cambia. |
| R-006 | Mientras hay una animación de movimiento activa se ignoran las teclas de juego: flechas/`WASD`, `Espacio`/`Enter`, `F` y `E`. No se encolan: se descartan. `F1` sigue alternando el debug y `R` sigue reiniciando y cancela la animación. | Pulsar cualquiera de esas teclas durante el recorrido no cambia cursor, estado, MP, acción ni turno; al terminar, la siguiente pulsación funciona; `F1` y `R` responden durante la animación. |
| R-007 | Durante la animación no se dibuja el cuadrado del cursor; los puntos del camino siguen visibles y se apagan a medida que el personaje los recorre. Al terminar, el cursor reaparece en su tile y se limita al viewport. Esto ajusta `REQ-004` R-004 solo para el intervalo de animación. | No se ve el cuadrado del cursor mientras camina; los puntos recorridos desaparecen; al final el cursor está en su tile y dentro del viewport. |
| R-008 | El MP del HUD baja paso a paso, a medida que se presenta cada `mpLeft`, no de golpe al final. | Un muestreo durante el recorrido muestra el MP de cada paso; al terminar coincide con el estado del motor. |
| R-009 | Si el plan incluye atacar tras acercarse, el ataque se presenta después del último paso y de su pausa. El flash y el daño existentes se mantienen; el enemigo no recibe daño antes de que el jugador llegue. | El orden observado es caminar → pausa → flash/daño; la vida del enemigo no cambia antes; si muere, la muerte se presenta al final. |
| R-010 | En la fase enemiga cada `UnitMoved` se anima en orden, de uno en uno. El cursor y el nuevo turno del jugador aparecen después de la última animación; no hay teletransportes enemigos. | Durante la fase enemiga se ve el recorrido de cada enemigo; `PlayerTurnStarted` se presenta al terminar; el cursor no aparece antes. |
| R-011 | El overlay de victoria o derrota aparece al terminar la animación en curso, no antes. | Tras el último paso y su pausa se muestra el overlay; no hay overlay con el personaje a mitad de camino. |
| R-012 | No cambian las reglas: camino, coste, MP, acción, orden de turnos, combate, mapa, viewport de 13×13 ni aspecto del HUD. La animación es solo presentación. | Los tests de motor, mapa, cámara, cursor y HUD siguen pasando; el snapshot del motor no cambia por animar. |
| R-013 | Con `prefers-reduced-motion: reduce` el movimiento se presenta de forma instantánea, sin tween ni pausa, con el mismo estado final y el mismo orden de eventos. | Con la preferencia activa no hay animación; el estado final y los eventos coinciden con el modo animado. |

# Requisitos técnicos

| ID | Requisito | Aceptación |
|---|---|---|
| T-001 | El motor no cambia: no se añaden comandos ni eventos, y `UnitMoved` ya aporta `from`, `to` y `mpLeft`. `src/game/` no se modifica. | El diff de `src/game/` está vacío; los tests de motor y el determinismo siguen pasando sin cambios. |
| T-002 | La animación es una timeline de presentación construida a partir de los eventos ordenados de la acción. El estado del motor ya está en el destino; el render recibe overrides visuales (posición en píxeles de las unidades y cámara) derivados de la timeline, sin mutar el estado. | Tests unitarios construyen la timeline desde eventos y comprueban pasos, `mpLeft` y orden; el estado de entrada no se muta; dos timelines iguales producen lo mismo. |
| T-003 | El render animado usa posiciones enteras en píxeles lógicos, sin coordenadas fraccionarias persistentes, y recorta al viewport. Se conserva la nitidez del pixel art y no se suaviza el sprite. | La QA visual no muestra borrosidad ni temblor; las posiciones intermedias son enteras; el sprite se recorta como el resto del mapa. |
| T-004 | El reloj de presentación usa `requestAnimationFrame` con delta acotado para evitar saltos tras una pestaña en segundo plano. Las duraciones se expresan en milisegundos. El motor no usa reloj real. | Tests del reloj con deltas grandes y pequeños; una pausa de pestaña no adelanta varios pasos; `src/game/` no importa `performance.now` ni `requestAnimationFrame`. |
| T-005 | El bloqueo de input vive en la capa de intenciones del host: si hay animación activa, las intenciones de juego se descartan. `window.__game.dispatch` es una API de debug/test y completa la animación pendiente antes de aplicar el comando, para conservar el determinismo de los E2E. | Tests de input: teclas de juego ignoradas durante la animación; `F1`/`R` responden; `dispatch` durante la animación termina la presentación y aplica el comando; no hay doble dispatch. |
| T-006 | El HUD y el overlay se sincronizan con la presentación: el MP mostrado puede ir por detrás del estado durante la animación y el overlay espera al final. El snapshot del motor no se altera. | Tests de HUD con MP intermedio y final; el overlay no aparece antes; `snapshot()` sigue siendo el estado final serializable. |
| T-007 | El debug y los tests pueden observar la presentación: `window.__game` expone si hay animación, el paso actual y las posiciones visuales, y ofrece un modo de test determinista que avanza el reloj de presentación sin depender del reloj real. | E2E lee `animating`, paso y posición; el modo test reproduce el mismo resultado en dos ejecuciones; no se exponen mutadores del estado vivo. |
| T-008 | Tests nuevos: timeline, interpolación (recta y diagonal), pausa, cámara continua con clamp, bloqueo de input, MP progresivo, ataque tras caminar, fase enemiga, fin de partida y reduced motion. E2E: movimiento animado observable, input ignorado, cámara, cursor oculto, enemigo y `R` durante la animación. No se borran, saltan ni debilitan tests existentes. | `pnpm run verify` y `pnpm run test:e2e` pasan; los tests existentes conservan su intención. |
| T-009 | Se registra un ADR (`ADR-008`) con la decisión de presentación animada sobre motor atómico: fuente de verdad, overrides de render, reloj de presentación y modo instantáneo. Sin dependencias nuevas. | El ADR existe y está enlazado; `package.json` y `pnpm-lock.yaml` no cambian. |
| T-010 | La documentación vigente se actualiza: economía de turno (ritmo y bloqueo), arquitectura (timeline de presentación) y el ajuste de `REQ-004` R-004 para el intervalo de animación. Las hojas históricas no se reescriben. | `pnpm run docs:check` pasa; no quedan referencias vigentes contradictorias. |

# Requisitos no funcionales

- **Rendimiento:** el render debe mantener los 60 fps objetivo con la timeline
  activa; el coste por frame es proporcional a las unidades visibles, no al
  tamaño del mapa. Sin dependencias nuevas.
- **Accesibilidad:** se respeta `prefers-reduced-motion`; el bloqueo de input es
  perceptible por el movimiento del personaje y la ocultación del cursor, sin
  depender solo de un texto. El juego sigue siendo operable solo con teclado.
- **Compatibilidad:** Chromium de escritorio como objetivo; Firefox y Safari
  recientes como deseables.
- **Seguridad:** sin red, sin persistencia y sin datos personales.
- **Mantenibilidad:** una sola configuración de duraciones; el motor sigue sin
  conocer tiempo real, Canvas ni teclado; la animación no se importa desde
  `experiments/`.

# Dependencias

- `REQ-001` a `REQ-005` cerradas.
- [REQ-004](REQ-004-cursor-seleccion.md): comando `MoveTo`, camino, cursor,
  bloqueo de input y ciclo de vida. `REQ-006` ajusta R-004 solo durante la
  animación.
- [REQ-005](REQ-005-viewport-impar-13.md): viewport de 13×13 y cámara.
- [ADR-002](../decisions/ADR-002-stack.md): TypeScript, Vite y Canvas 2D.
- [ADR-006](../decisions/ADR-006-arte-placeholder-32rogues.md): sprites de
  32rogues de un solo frame.
- [ADR-007](../decisions/ADR-007-map-generator.md): mapa por `MapGenerator`.
- [EXP-002](../../experiments/EXP-002-ritmo-movimiento/experiment.md): decide el
  ritmo. Bloquea las tareas de implementación, no la de construir el experimento.
- `ADR-008`: presentación animada sobre motor atómico (se crea en la tarea de
  implementación).

# Fuera de alcance

- Ciclos de caminar, rebote, polvo, sombras animadas o sonido. Los sprites de
  32rogues son de un solo frame.
- Animar el movimiento del cursor o la cámara al mover el cursor.
- Cambiar pathfinding, coste, MP, acción, turnos, combate o generación del mapa.
- Encolar o bufferizar input: las pulsaciones durante la animación se descartan.
- Cámara subpíxel suave, zoom o seguimiento con deadzone.
- Animar ataques más allá del flash y el número de daño existentes.
- Hotseat, red, controladores remotos, guardado o persistencia.
- Arte final o sprites nuevos.

# Preguntas abiertas

- **Ritmo:** duración de paso, pausa por tile y regla de diagonal. Lo decide
  `human:simon` en EXP-002. Es la única decisión creativa abierta y bloquea las
  tareas de implementación, no la construcción del experimento.
- Ajuste fino revisable en playtest: pausa antes del ataque tras acercarse
  (provisional ~150 ms) y sensación de la pausa en el destino.

# Decisiones

| Fecha | Decisión | Quién | Estado |
|---|---|---|---|
| 2026-11-08 | Animar el movimiento del jugador y de los enemigos; cualquier `UnitMoved`, incluido el acercamiento de Moverse sobre un enemigo. | human:simon | aceptada |
| 2026-11-08 | Cámara continua a píxel entero, centrada en el personaje y limitada al mapa; sin subpíxel ni saltos por tile. | human:simon | aceptada |
| 2026-11-08 | El ritmo se decide con EXP-002 antes de implementar la animación. | human:simon | aceptada |
| 2026-11-08 | La diagonal es una línea recta; EXP-002 decide si tarda lo mismo o ~1,41×. | human:simon | aceptada |
| 2026-11-08 | Bloquear solo teclas de juego durante la animación; `F1` y `R` siguen activos y `R` cancela. Las pulsaciones se descartan, no se encolan. | human:simon | aceptada |
| 2026-11-08 | Ocultar el cuadrado del cursor durante el recorrido; mantener los puntos del camino y apagar los recorridos; al final, cursor en su tile y limitado al viewport. | human:simon | aceptada |
| 2026-11-08 | El MP del HUD baja paso a paso. | human:simon | aceptada |
| 2026-11-08 | Pausa también en el tile de destino antes de devolver el control. | human:simon | aceptada |
| 2026-11-08 | Tras acercarse a un enemigo, pausa breve y después flash/daño. | human:simon | aceptada |
| 2026-11-08 | Respetar `prefers-reduced-motion` con movimiento instantáneo. | human:simon | aceptada |

# Aceptación de la hoja

- [x] El usuario ha aprobado el alcance y las decisiones creativas salvo el
      ritmo, delegado a EXP-002.
- [x] Los requisitos son verificables.
- [x] Las dependencias están claras.
- [x] Se puede generar el grafo de tareas; la implementación espera al
      experimento y el resto ya está definido.
- [x] Está claro el fuera de alcance.
- [x] No hay contradicciones abiertas: R-007 ajusta `REQ-004` R-004 para el
      intervalo de animación.
- [ ] El ritmo está decidido y sus valores incorporados a la hoja (v2).
