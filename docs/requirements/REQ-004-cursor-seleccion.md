---
type: Requirement Sheet
id: REQ-004
title: Cursor de selección, camino y acciones por destino
description: Cursor cuadrado que se mueve por el viewport, resalta el camino, colorea destinos y dirige el movimiento y el ataque del jugador.
status: stable
version: 1
decision_owner: human:simon
review_required: true
created_at: 2026-11-08T01:18:43Z
updated_at: 2026-11-08T09:03:30Z
related_tasks: [TASK-0012, TASK-0013, TASK-0014, TASK-0015]
generated: { by: deepseek/v4.1-flash, at: 2026-11-08T01:18:43Z }
verified:
  - by: human:simon
    at: 2026-11-08T01:18:43Z
    note: Aprueba REQ-004 v1 con cursor de 4 direcciones, tres estados, camino en dos tonos y Moverse sobre enemigo como acercarse y atacar.
  - by: human:simon
    at: 2026-11-08T09:03:30Z
    note: Playtest aprobado; el cursor, los estados, el camino y las acciones por destino funcionan correctamente. REQ-004 completada.
---

# Contexto

El control actual mueve al jugador tile a tile con `WASD`/flechas y ataca al
enemigo adyacente con `Espacio`/`Enter`. Ese esquema funciona para el primer
prototipo, pero obliga a pulsar muchas veces, no permite elegir un destino
visible y hace difícil saber si un tile es alcanzable antes de gastar MP.

`REQ-004` introduce un cursor táctico sobre el viewport de `REQ-002`. El cursor
se mueve libremente, muestra el camino que seguirá el jugador y colorea el
destino según su validez. Las acciones pasan a ser deliberadas: **Moverse** lleva
al jugador hacia el cursor y **Atacar** golpea al enemigo seleccionado. Sobre un
enemigo, Moverse se interpreta como acercarse y atacar.

La hoja conserva la economía de turno, el combate cuerpo a cuerpo, el mapa de
`REQ-003`, la cámara de 12×12 tiles y el HUD. Solo cambia la forma de seleccionar
y ejecutar movimiento y ataque.

# Objetivos de experiencia

- El jugador elige un destino con la mirada y ve de un vistazo si puede llegar.
- Mover el cursor no cuesta recursos ni desplaza la cámara; explorar el tablero
  es gratis.
- El camino resaltado convierte la intención en una decisión informada: dónde
  llego, dónde me quedo y desde dónde ataco.
- Moverse y atacar son acciones deliberadas, no pulsaciones a ciegas.
- El cursor no tapa el tile, el sprite ni la información de combate.
- El jugador puede seleccionar enemigos lejanos y entender si este turno toca
  acercarse, atacar o esperar.

# Requisitos creativos

| ID | Requisito | Aceptación |
|---|---|---|
| R-001 | El cursor es cuadrado, ocupa exactamente un tile y es transparente. El diseño final está pendiente; el placeholder usa un borde de 2 px y un relleno translúcido al 15 %. | En un tile de 32×32 lógicos el cursor ocupa un tile; el relleno deja ver suelo y sprite; el borde se lee sobre suelo claro y oscuro. El arte final puede sustituirse sin cambiar reglas ni geometría. |
| R-002 | Al empezar cada turno del jugador, el cursor está sobre el tile del jugador activo. También se recoloca tras reiniciar o cambiar de semilla. Sobre el jugador se muestra en blanco neutro. | El snapshot del cursor coincide con la posición del jugador al arrancar, al recibir `PlayerTurnStarted`, tras `R` y tras `F2`; en ese estado el cursor es blanco neutro. |
| R-003 | Las flechas y `WASD` mueven el cursor en 4 direcciones cardinales, un tile por pulsación. No gasta MP, no consume acción, no termina turno, no mueve la cámara y no lo bloquean muros ni unidades. En el borde del viewport no se mueve; no hay wrap. | Cada pulsación cambia el cursor exactamente un tile; MP, acción, turno y cámara no cambian; en el borde el cursor queda igual. El cursor puede cruzar muros y unidades. |
| R-004 | El cursor no puede abandonar el viewport de la cámara. Si el jugador se mueve y la cámara desplaza el viewport, el cursor se recoloca en el tile visible más cercano. El cursor se recorta al viewport. | El tile del cursor intersecta siempre el viewport. Mover el cursor no cambia la cámara. Tras un movimiento del jugador, el cursor sigue dentro del viewport. |
| R-005 | El cursor tiene tres estados de validez y dos estados especiales: **verde** para suelo libre alcanzable con los MP restantes; **ámbar** para suelo libre con camino pero coste mayor que el MP; **rojo** para muro, unidad aliada, objeto bloqueante o tile sin camino; **rojo con marca de objetivo** sobre un enemigo; **blanco neutro** sobre el jugador. El estado no se comunica solo por color: el borde cambia de patrón. | Una tabla de casos cubre suelo alcanzable, suelo lejano, muro, aliado, objeto, sin camino, enemigo y jugador. Cada caso tiene color y patrón de borde distintos; sobre el enemigo se ve la marca de objetivo. |
| R-006 | Al mover el cursor se resalta el camino que seguirá el jugador con puntos blancos semitransparentes sobre cada tile. Se dibuja el camino completo dentro del viewport; los puntos que caen fuera se recortan. Los primeros `min(coste, MP)` pasos usan un tono fuerte y el resto queda atenuado. En rojo puro (muro, aliado, objeto o sin camino), sobre el jugador o sin camino no se dibujan puntos; sobre un enemigo con camino sí. | Con destino verde se ven todos los puntos en tono fuerte; con ámbar se ven todos, fuerte hasta el MP y atenuado después; con rojo puro no hay puntos; con enemigo se ve el camino hasta el tile de ataque. El camino se recalcula al mover cursor, jugador, MP o atacar. |
| R-007 | El camino es el más corto con las reglas actuales de movimiento: 8 direcciones, coste 1 por paso, sin corte de esquina, sin muros, sin unidades vivas de cualquier facción y sin objetos que impidan ocupar el tile. El camino dibujado es exactamente el que ejecuta Moverse. Los empates se resuelven de forma determinista. | Tests unitarios cubren diagonal, corte de esquina, muro, aliado, enemigo, objeto bloqueante y ausencia de camino. El camino de la previsualización y el ejecutado coinciden tile a tile. |
| R-008 | **Moverse** con el cursor en verde lleva al jugador por el camino hasta el tile del cursor, gastando 1 MP por paso. No consume la acción ni termina el turno. El cursor permanece en el destino. | El jugador termina en el tile del cursor; el MP baja exactamente el coste; la acción y el turno no cambian. |
| R-009 | **Moverse** con el cursor en ámbar avanza por el camino hasta agotar los MP y se detiene en el último tile alcanzable. No consume la acción ni ataca. El cursor permanece en el objetivo. | El jugador termina en el paso `min(coste, MP)` del camino; el MP queda en 0; la acción y el turno no cambian; no se emite ataque. |
| R-010 | **Moverse** con el cursor en rojo (muro, aliado, objeto bloqueante o sin camino) no mueve al jugador, no gasta MP ni acción y no cambia el estado de juego, salvo el aviso de rechazo. | El snapshot del jugador, MP, acción y turno no cambia; el HUD muestra el motivo del rechazo. |
| R-011 | Con el cursor sobre un enemigo, el camino termina en el tile libre adyacente más cercano desde el que se puede atacar; nunca en el tile del enemigo. Si el coste es ≤ MP y hay acción, **Moverse** se acerca hasta ese tile y ataca, gastando MP y acción. Si el coste es ≤ MP y no hay acción, solo se mueve. Si el coste es > MP, avanza hasta agotar MP y no ataca. Si ya es adyacente y hay acción, ataca sin moverse. Si ya es adyacente y no hay acción, no hace nada. | Cada caso se prueba por separado: movimiento + ataque, solo movimiento, avance parcial, ataque directo y no-op. El enemigo nunca es pisado. Si no hay tile de ataque libre o camino, se trata como rojo. |
| R-012 | **Atacar** (`F`) solo funciona si el cursor está sobre un enemigo vivo, a distancia Chebyshev 1 (incluye diagonales) y el jugador tiene acción. Gasta la acción, no MP, y no mueve al jugador. Fuera de rango, sin enemigo o sin acción no hace nada y avisa. | El ataque se ejecuta solo en adyacencia y con acción; el jugador no se desplaza; el MP no cambia; la acción pasa a no disponible; el daño y el flash se mantienen. |
| R-013 | El cursor no se recentra al moverse ni al atacar: conserva su tile. Solo vuelve al tile del jugador activo al empezar un turno del jugador, tras reiniciar o tras cambiar de semilla. | Tras Moverse, Moverse parcialmente o Atacar, el cursor sigue en su tile. Tras `E` y la fase enemiga, aparece sobre el jugador; tras `R` y `F2`, también. |
| R-014 | Durante la fase enemiga o con la partida terminada, el cursor y el camino están ocultos y las teclas de cursor y acción no responden. Al volver la fase del jugador, el cursor aparece sobre el tile del jugador activo. | En fase `enemy` o estado terminal no se dibujan cursor ni camino y las teclas no cambian el estado. En fase `player` el cursor está sobre el jugador. |
| R-015 | Los controles son solo de teclado: flechas/`WASD` mueven el cursor; `Espacio`/`Enter` ejecutan **Moverse**; `F` ejecuta **Atacar**; `E` termina el turno; `R` reinicia; `F1` alterna debug; `F2` genera semilla nueva. No se añaden botones clicables nuevos. La ayuda del HUD refleja el nuevo mapa. | Una tabla de teclas prueba cada acción. No hay botones nuevos de Moverse/Atacar/Terminar; la ayuda del HUD menciona cursor, Moverse, Atacar y Terminar. |
| R-016 | Si una acción se rechaza, el HUD muestra un aviso breve con el motivo (`Destino no válido`, `Enemigo fuera de alcance`, `Sin acción`, `Sin MP`) sin cambiar el estado. El aviso no bloquea la siguiente pulsación. | El aviso aparece y desaparece sin alterar jugador, MP, acción, turno ni eventos de combate; la siguiente acción funciona. |
| R-017 | El estado del cursor no depende solo del color: borde sólido para verde, discontinuo para ámbar, doble para rojo, blanco neutro para el jugador y marca de objetivo para el enemigo. Los puntos del camino son blancos. El contraste debe leerse sobre suelo y muro. | La QA visual comprueba color y patrón en cada estado; el cursor se distingue en escala de grises y sobre los tiles de 32rogues. |
| R-018 | El cursor sustituye al resaltado de casilla activa de `REQ-001` R-009; no se dibujan dos marcos sobre el jugador. El feedback de daño y el flash de ataque se mantienen. | Al arrancar y durante la partida solo hay un marco sobre el jugador; el flash y el número de daño siguen funcionando. |

# Requisitos técnicos

| ID | Requisito | Aceptación |
|---|---|---|
| T-001 | El cursor es estado de presentación del host (`src/host/`), no del motor. El motor no conoce teclas, cursor ni Canvas. `window.__game.snapshot()` expone un cursor serializable con posición, estado, camino y tile de ataque si aplica. | `src/game/` no importa DOM ni input; el snapshot incluye `cursor: { x, y, kind, path, attackTile? }` y `JSON.parse(JSON.stringify(snapshot))` lo conserva. |
| T-002 | La planificación de destino es una función pura y determinista en `src/game/` (o módulo compartido sin DOM): recibe estado, unidad y objetivo, y devuelve tipo (`floor`/`enemy`/`blocked`), camino, coste y tile de ataque si aplica. | Vitest la ejecuta sin jsdom; dos llamadas con el mismo estado devuelven lo mismo; no usa `Math.random`, `Date.now` ni `performance.now`. |
| T-003 | Se añade un comando de motor para moverse a un objetivo (por ejemplo `MoveTo`) que usa la misma planificación que el camino. El comando `Move` de un paso y las primitivas de movimiento se mantienen para la IA y los tests. `Attack` conserva su semántica. | `reduce` acepta el nuevo comando y lo rechaza con las mismas reglas de fase/unidad; los tests de `Move`, `Attack` y la IA existentes siguen pasando. |
| T-004 | La lógica de **Moverse sobre un enemigo** (acercarse, atacar o quedarse a mitad) vive en el motor, no en el host. Emite eventos deterministas y no muta la entrada. | Tests de los cinco casos de R-011 comprueban posición, MP, acción, vida y orden de eventos. |
| T-005 | El input traduce flechas/`WASD` a intenciones de cursor; `Espacio`/`Enter` a `MoveTo` con el tile del cursor; `F` a `Attack` contra el enemigo bajo el cursor; `E` a `EndTurn`. Ignora repetición y modificadores. `translateKey` sigue siendo puro. | Tabla de tests unitarios por tecla y estado; la repetición automática no mueve el cursor; `F1`/`F2`/`R` se mantienen. |
| T-006 | El render del cursor y del camino se recorta al viewport, no mueve la cámara, escala con el marco y conserva el pixel art nítido. Los puntos son blancos semitransparentes con dos niveles de opacidad. Si es DOM, no intercepta clics. | La QA visual comprueba que cursor y puntos quedan dentro del viewport y que la cámara no cambia al moverlos; no hay suavizado ni desplazamientos fraccionarios. |
| T-007 | El ciclo de vida del cursor se deriva de eventos y estado: aparece sobre el jugador al arrancar y en `PlayerTurnStarted`/`GameRestarted`/regeneración; se oculta en fase enemiga o estado terminal; se limita al viewport tras cada movimiento de cámara. | Tests de eventos y E2E cubren arranque, fin de turno, reinicio, semilla nueva, fase enemiga y clamp tras mover al jugador. |
| T-008 | `window.__game` expone cursor, camino y clasificación para E2E; el overlay de debug muestra coordenadas y estado del cursor. `dispatch` acepta el nuevo comando. No se exponen mutadores del estado vivo. | E2E lee el cursor y el camino sin tocar el DOM interno; el debug muestra `Cursor: (x,y) estado`; `dispatch` funciona con `MoveTo`. |
| T-009 | Tests nuevos: planificación (diagonal, corte de esquina, muro, aliado, enemigo, objeto, sin camino, empates), clasificación, camino parcial, Moverse en verde/ámbar/rojo, Moverse sobre enemigo en todos los casos, `F`, rechazos, ciclo de vida e input. E2E: movimiento de cursor, estados/patrones, camino, movimiento parcial, acercarse + atacar, cámara inmóvil, reinicio y fase enemiga. | `pnpm run verify` y `pnpm run test:e2e` pasan; no se borran, saltan ni debilitan tests existentes. |
| T-010 | Sin dependencias nuevas. La planificación de 32×32 se ejecuta en cada movimiento de cursor sin afectar a 60 fps. | `package.json` no incorpora dependencias; la medición de rendimiento no muestra tirones. |
| T-011 | Se mantienen las invariantes de `REQ-002` y `REQ-003`: 16:9, viewport 12×12, cámara limitada, HUD, mapa BSP, muros, debug y determinismo. Solo cambian controles, cursor, camino y feedback asociado. | Los tests de encuadre, cámara, mapa, muros y debug siguen pasando; las actualizaciones se limitan a controles y presentación. |
| T-012 | El feedback de rechazo se deriva de eventos `CommandRejected` o del resultado de la planificación y es transitorio; no crea estado de juego ni altera el turno. | El aviso se muestra y desaparece sin cambiar el estado; no hay eventos de movimiento o ataque espurios. |

# Requisitos no funcionales

- **Rendimiento:** la planificación de camino en 32×32 debe ser inferior a 1 ms
  por movimiento de cursor y no reducir los 60 fps objetivo.
- **Accesibilidad:** el estado del cursor no depende solo del color; se usan
  patrones de borde, marca de objetivo y puntos blancos con contraste suficiente.
  El juego sigue siendo operable solo con teclado.
- **Compatibilidad:** Chromium de escritorio como objetivo; Firefox y Safari
  recientes como deseables.
- **Seguridad:** sin red, sin persistencia y sin datos personales.
- **Mantenibilidad:** planificación pura y compartida, cursor en el host, motor
  sin DOM, sin ECS ni motor genérico.

# Dependencias

- `REQ-001` cerrada: loop, movimiento, combate cuerpo a cuerpo y feedback.
- `REQ-002` cerrada: marco 16:9, viewport 12×12, cámara y HUD.
- `REQ-003` cerrada: mapa BSP, muros, semilla y debug.
- [ADR-002](../decisions/ADR-002-stack.md): TypeScript, Vite y Canvas 2D.
- [ADR-006](../decisions/ADR-006-arte-placeholder-32rogues.md): tiles y sprites
  de 32rogues.
- [ADR-007](../decisions/ADR-007-map-generator.md): interfaz `MapGenerator`.
- No se requiere ADR nuevo: la separación host/motor y la planificación pura son
  decisiones técnicas rutinarias.
- No se propone experimento: las decisiones creativas están cerradas. El
  playtest decidirá el ajuste fino de colores, opacidades y avisos.

`REQ-004` sustituye el mapa de controles de `REQ-001` R-007 y la ayuda del HUD de
`REQ-002` R-010/T-008 en lo que respecta a movimiento y ataque. Las hojas
históricas se mantienen estables y las tareas de este corte actualizan sus tests.

# Fuera de alcance

- Diseño final del cursor y del camino, animaciones y sonido.
- Botones clicables, ratón, táctil o selección con clic.
- Números de coste por tile, previsualización de rango de ataque o línea de
  visión.
- Ataque a distancia, esperar/interactuar, puntos de acción y cambios en la
  economía de turno.
- Multijugador local hotseat y controladores remotos; el cursor se define para
  el jugador activo.
- Nuevos objetos o props bloqueantes; la planificación los soporta, pero no se
  añaden en este corte.
- Cambios en el mapa, puertas, muros, generación procedural o guardado.

# Preguntas abiertas

No hay preguntas bloqueantes. Quedan como ajustes revisables en playtest:

- Tamaño exacto del punto, opacidades y patrón de borde.
- Texto y duración de los avisos de rechazo.
- Ignorar la repetición automática de teclas: cada pulsación mueve un tile.
- En los bordes del viewport se permiten tiles parcialmente visibles y el cursor
  se recorta como el resto del mapa; así no se pierde alcance de 12 tiles.

# Decisiones

| Fecha | Decisión | Quién | Estado |
|---|---|---|---|
| 2026-11-08 | Cursor cuadrado de un tile, transparente, con placeholder de borde 2 px y relleno al 15 %. El diseño final queda pendiente. | human:simon | aceptada |
| 2026-11-08 | El cursor aparece sobre el tile del jugador al empezar cada turno, tras reiniciar y tras cambiar de semilla. | human:simon | aceptada |
| 2026-11-08 | Flechas/`WASD` mueven el cursor en 4 direcciones, sin MP, sin acción, sin mover la cámara y sin colisión con muros o unidades. | human:simon | aceptada |
| 2026-11-08 | El cursor se limita al viewport y se recoloca al borde visible si la cámara se desplaza. | human:simon | aceptada |
| 2026-11-08 | Tres estados: verde alcanzable, ámbar demasiado lejano, rojo inválido; enemigo con marca de objetivo y jugador en blanco neutro. | human:simon | aceptada |
| 2026-11-08 | El camino se resalta con puntos blancos; en ámbar se ve completo, con el tramo alcanzable en tono fuerte y el resto atenuado. | human:simon | aceptada |
| 2026-11-08 | El camino excluye muros, unidades vivas de cualquier facción y objetos bloqueantes; usa las reglas actuales de movimiento. | human:simon | aceptada |
| 2026-11-08 | Moverse en verde recorre el camino; en ámbar avanza hasta agotar MP; en rojo no mueve; ninguna de las tres consume la acción. | human:simon | aceptada |
| 2026-11-08 | Con el cursor sobre un enemigo, el camino termina en el tile adyacente de ataque. Moverse se acerca y ataca si alcanza y hay acción; si no hay acción solo se mueve; si no alcanza avanza parcialmente; si ya es adyacente ataca. | human:simon | aceptada |
| 2026-11-08 | `F` es ataque directo desde la posición actual: solo en adyacencia y con acción; no se acerca. | human:simon | aceptada |
| 2026-11-08 | El cursor permanece en su tile tras moverse o atacar; solo se recoloca al empezar turno, reiniciar o cambiar semilla. | human:simon | aceptada |
| 2026-11-08 | En fase enemiga el cursor y el camino se ocultan y no responden. | human:simon | aceptada |
| 2026-11-08 | Controles solo de teclado: flechas/`WASD` cursor, `Espacio`/`Enter` Moverse, `F` Atacar, `E` Terminar. Sin botones clicables nuevos. | human:simon | aceptada |
| 2026-11-08 | El cursor sustituye al resaltado de casilla activa; se mantienen el flash y el número de daño. | requirements-writer | aceptada |
| 2026-11-08 | Avisos breves en el HUD para acciones rechazadas, sin cambiar el estado. | requirements-writer | aceptada |
| 2026-11-08 | Se ignoran las repeticiones automáticas de teclado; cada pulsación mueve un tile. | requirements-writer | aceptada |
| 2026-11-08 | En el borde del viewport se permiten tiles parcialmente visibles y el cursor se recorta al viewport. | requirements-writer | aceptada |
| 2026-11-08 | Playtest aprobado: cursor, estados, camino y acciones por destino funcionan correctamente. `REQ-004` completada. | human:simon | aceptada |

# Aceptación de la hoja

- [x] El usuario ha aprobado las decisiones creativas.
- [x] Los requisitos son verificables.
- [x] Las dependencias están claras.
- [x] Se puede generar un grafo de tareas.
- [x] Está claro el fuera de alcance.
- [x] No hay contradicciones abiertas.
- [x] El usuario ha aprobado `REQ-004` v1.
- [x] El usuario ha hecho el playtest y ha aprobado el cursor, el camino y las acciones por destino.
