---
type: Requirement Sheet
id: REQ-021
title: Muerte, fantasma y resurrección
description: "La muerte no expulsa al jugador: cadáver saqueable, fantasma con turno y acción, resurrección condicionada y derrota por wipe total."
status: stable
version: 1
decision_owner: human:simon
review_required: true
created_at: 2026-11-11T11:00:00Z
updated_at: 2026-11-11T12:00:00Z
related_tasks: []
generated: { by: deepseek/v4.1-flash, at: 2026-11-11T11:00:00Z }
verified:
  - by: human:simon
    at: 2026-11-11T12:00:00Z
---

# Contexto

El usuario quiere que la muerte no saque a nadie de la mesa. En hotseat, un
jugador muerto se queda mirando; en remoto, se desconecta. Esta hoja convierte la
muerte en un estado jugable: el personaje cae, deja un cadáver con su equipo y el
jugador continúa como fantasma hasta que lo resuciten o la partida termine.

La decisión creativa está tomada. Esta hoja la fija y deja como provisionales los
valores que aún no se han decidido (coste y nivel del hechizo, PV al volver y
visión del fantasma). No define la lista de hechizos: solo el efecto de
resurrección y el recurso de maná que lo paga.

# Enmienda a documentos vigentes

- [REQ-017](REQ-017-feedback-visual-eventos.md) define el cadáver como persistente
  pero **solo presentación**. Esta hoja lo convierte en objeto jugable con
  inventario y transición a fantasma.
- [REQ-020](REQ-020-cofres-saqueo.md) deja los **cadáveres de jugadores** fuera de
  alcance. Esta hoja los trae al alcance como contenedores saqueables.
- [REQ-019](REQ-019-traits-objetos.md) propone «cuerpo etéreo» como trait de
  objeto. Esta hoja adelanta ese comportamiento como estado base del fantasma,
  sin depender de un objeto.
- [REQ-014](REQ-014-atributos-inherentes-personajes.md) deja la puntuación de
  magia sin efecto. Esta hoja la convierte en la fuente del maná que paga la
  resurrección; el resto de hechizos seguirá en su propia hoja.
- [Alcance vigente](../scope.md) y [visión](../vision.md) ya recogen la decisión
  el 2026-11-11; no requieren más cambios.

Las enmiendas a `REQ-014`, `REQ-017` y `REQ-020` se aplican al aprobar esta hoja,
antes de implementar.

# Objetivos de experiencia

- Que morir cambie el papel del jugador, no lo saque de la partida.
- Que el grupo sienta que proteger al mago y al objeto de resurrección importa.
- Que el fantasma sea útil sin ser un segundo personaje completo ni un
  espectador inútil.
- Que la mesa nunca se quede parada por un cadáver: el fantasma tiene turno, pero
  corto y legible.
- Que la transición a fantasma se entienda sin explicación previa.

# Requisitos creativos (decididos)

| ID | Requisito | Aceptación |
|---|---|---|
| R-001 | Al morir, el jugador no abandona la partida: su personaje deja un cadáver con el equipo que llevaba y el jugador pasa a controlar un fantasma. | La muerte produce cadáver con inventario y un fantasma controlable; el jugador no pierde la sesión. |
| R-002 | El fantasma actúa en su propio turno dentro de la fase de jugadores, con el MP intrínseco de su personaje y **una acción por ronda**, como excepción a las acciones de `REQ-026`. | El turno del fantasma respeta el orden de jugadores; el MP no incluye bonus de equipo; la acción se consume una vez por ronda. |
| R-003 | El fantasma no atraviesa muros, pero sí personajes y enemigos; puede compartir casilla con cualquier unidad y no bloquea paso, pathfinding ni posición de ataque. | Unidades y enemigos pueden terminar su movimiento sobre el fantasma; el fantasma no impide atacar ni moverse. |
| R-004 | El fantasma no es objetivo de ataque, no recibe daño y no puede atacar ni usar objetos. | Ningún comando de ataque o daño puede seleccionarlo; sus acciones no gastan objetos ni equipo. |
| R-005 | La acción del fantasma permite interactuar con puertas, coger y mover **un** objeto a la vez y acercarlo a los vivos. | El fantasma puede abrir puertas, recoger un objeto y soltarlo; no puede llevar dos ni usarlos. |
| R-006 | El fantasma ve el contenido de cofres abiertos y cerrados e informa de él, pero no sabe si hay trampa ni puede abrir un cofre. | Abrir un cofre sigue siendo acción de un vivo; el fantasma muestra el contenido sin revelar trampa. |
| R-007 | El fantasma puede saquear el cadáver y entregar sus objetos a los vivos. | Los objetos del cadáver se pueden coger de uno en uno; el cadáver conserva el resto. |
| R-008 | La resurrección requiere un **lanzador vivo con nivel de magia suficiente y maná suficiente** (hechizo de nivel alto de `REQ-025`), o un objeto de resurrección en el inventario de quien lo usa. Sin ninguno, la muerte es definitiva. | El comando comprueba la fuente; el maná se gasta o el objeto se consume al resucitar. |
| R-009 | Quien resucita debe estar **adyacente a la casilla del cadáver**, y esa casilla no puede estar ocupada por un vivo (aliado o enemigo). Un vivo puede quedarse encima y bloquear la resurrección. | Fuera de adyacencia o con un vivo en la casilla, la resurrección se rechaza; el fantasma no cuenta como ocupante. |
| R-010 | El personaje resucitado **vuelve en la casilla del cadáver**, no en la del fantasma. | Tras resucitar, la unidad viva ocupa la casilla del cadáver; el fantasma desaparece de esa posición. |
| R-011 | La partida se pierde por wipe total: cuando no queda ningún jugador vivo, aunque queden fantasmas o existan objetos de resurrección. | Al morir el último vivo, la partida termina; los fantasmas no la prolongan. |
| R-012 | El fantasma se representa de forma distinguible y translúcida, desplazado del tile, sin confundirse con un vivo. | El jugador distingue vivo, fantasma, enemigo y cadáver en una captura estática. |

# Requisitos técnicos

| ID | Requisito | Aceptación |
|---|---|---|
| T-001 | El estado de unidad distingue vivo, muerto y fantasma, con identidad estable y serialización. | El snapshot expone el estado de cada unidad; reiniciar reconstruye el mismo estado. |
| T-002 | La ocupación admite compartir casilla solo con fantasmas; el fantasma se excluye de bloqueo, pathfinding de otras unidades, objetivos de ataque y cálculo de daño. | Tests de pathfinding, colisión, ataque y muerte cubren el caso; ninguna unidad viva queda bloqueada. |
| T-003 | El MP del fantasma se calcula desde el atributo intrínseco del personaje, sin modificadores de equipo; el equipo del cadáver no altera su turno. | Con y sin equipo, el MP del fantasma es el mismo; el del vivo cambia. |
| T-004 | Existe un comando de interacción del fantasma limitado a puertas, recogida/suelta de un objeto e inspección de contenedores. | Comandos inválidos se rechazan sin cambios de estado; no hay acciones de ataque, uso o equipo. |
| T-005 | La inspección de contenedores devuelve el contenido a los vivos, pero nunca el estado de trampa; abrir un cofre sigue siendo un comando de unidad viva. | Un cofre con trampa conserva su estado oculto; el fantasma no puede abrirlo. |
| T-006 | La resurrección es un comando con fuente (lanzador con nivel de magia y maná suficientes, u objeto en inventario) que valida adyacencia a la casilla del cadáver, ausencia de vivos en ella y disponibilidad de fuente; si es válido, consume maná u objeto y sitúa al resucitado en la casilla del cadáver. | Tests: fuera de adyacencia, casilla ocupada por aliado, ocupada por enemigo, fantasma sobre la casilla (permitido), nivel insuficiente, maná insuficiente, con objeto; los comandos inválidos no cambian estado y no consumen. |
| T-007 | El nivel de magia define el maná máximo, que se recarga completo al inicio del turno de la unidad; el maná es serializable, se expone en el snapshot y el host lo muestra en el HUD. | Tests de creación, recarga y gasto; el maná no altera el MP ni el movimiento; la reserva se reconstruye al reiniciar. |
| T-008 | La comprobación de derrota cuenta solo jugadores vivos; los fantasmas y los objetos de resurrección no la evitan. | Al morir el último vivo se emite el fin de partida; con un vivo y fantasmas, no. |
| T-009 | La IA enemiga ignora al fantasma y no lo selecciona como objetivo ni obstáculo. | La percepción, la persecución y el ataque no reaccionan al fantasma. |
| T-010 | El host presenta el fantasma, su turno y sus acciones con feedback; el jugador entiende por qué no puede atacar, abrir cofres ni usar objetos. | Avisos de rechazo con texto; el turno del fantasma se distingue del turno vivo. |
| T-011 | Tests nuevos: muerte a fantasma, casilla compartida, pathfinding, acción limitada, inspección sin trampa, resurrección, maná, derrota y E2E de presentación. | `pnpm run verify` pasa; los tests de `REQ-009`, `REQ-010` y `REQ-017` conservan su intención. |
| T-012 | Se actualizan glosario, [economía de turno](../design/turn-economy.md), arquitectura y `REQ-014`/`REQ-017`/`REQ-020`; se registra un ADR de estado fantasma, ocupación compartida y maná. | `pnpm run docs:check` pasa; no quedan contradicciones sobre el cadáver como solo presentación ni sobre magia sin efecto. |
| T-013 | Sin dependencias nuevas, sin red y sin arte final. | `package.json` y `pnpm-lock.yaml` no cambian; el motor sigue sin DOM. |

# Requisitos no funcionales

- **Rendimiento:** compartir casilla no puede multiplicar el coste del pathfinding;
  el fantasma se excluye del índice de ocupación de bloqueo.
- **Accesibilidad:** el estado fantasma y sus rechazos se explican con texto; no
  dependen solo de transparencia o color.
- **Compatibilidad:** Chromium de escritorio como objetivo; Firefox y Safari
  recientes como deseables.
- **Seguridad:** sin datos personales, sin red y sin nuevas dependencias.
- **Hotseat:** el turno del fantasma no debe alargar la mesa sin control; si
  aparece fricción, se propone experimento de tiempo de turno.
- **Mantenibilidad:** un único estado de unidad; la presentación del fantasma no
  decide reglas.

# Dependencias

- [REQ-014](REQ-014-atributos-inherentes-personajes.md): MP y atributos
  intrínsecos separados del equipo; la puntuación de magia pasa a alimentar el
  maná.
- [REQ-018](REQ-018-inventario-equipo.md): inventario, instancias de objeto y
  equipo; el cadáver y el fantasma reutilizan ese modelo.
- [REQ-019](REQ-019-traits-objetos.md): «cuerpo etéreo» como referencia de
  comportamiento, sin depender del trait.
- [REQ-020](REQ-020-cofres-saqueo.md): contenedores, cofres y saqueo; esta hoja
  añade cadáveres de jugadores y la inspección del fantasma.
- [REQ-017](REQ-017-feedback-visual-eventos.md): muerte, cadáver persistente y
  feedback; esta hoja lo amplía.
- [REQ-009](REQ-009-percepcion-alarma-huida.md) y
  [REQ-010](REQ-010-combate-equipo-acierto-defensa.md): muerte, equipo y balance.
- [REQ-016](REQ-016-pantalla-inicio-configuracion.md): roster y jugadores por
  partida; necesaria para hotseat.

# Fuera de alcance

- Hechizos, familias mágicas y habilidades: la resurrección se define como efecto;
  la magia tendrá su propia hoja.
- IA enemiga que reacciona al fantasma.
- Persistencia entre partidas y guardado.
- Estructura de run, muerte permanente entre runs y progresión.
- Resurrección de enemigos.
- Arte final del fantasma y del cadáver.
- Implementación de hotseat y remoto; esta hoja define el estado, no el modo.

# Preguntas abiertas

1. **Coste y nivel del hechizo.** ¿Qué nivel de magia y qué maná exige resucitar?
   ¿El objeto de resurrección tiene nivel o solo se consume? El maná máximo se
   deriva del nivel y se recarga completo por turno (`REQ-025`).
2. **PV al volver.** ¿El resucitado vuelve con 1 PV, con un porcentaje o completo?
3. **Visión del fantasma.** ¿Respeta línea de visión normal o ve a través de
   muros? Provisional: línea de visión normal.
4. **Alcance de «informar».** ¿Solo el contenido de cofres y cadáveres, o también
   posición de enemigos y objetos en pantalla? Provisional: contenido y posición,
   nunca trampas.
5. **Orden del turno del fantasma.** ¿Actúa en su índice de jugador, después de
   los vivos o al final de la fase? Provisional: en su índice, dentro de la fase
   de jugadores.
6. **Objetos del suelo.** ¿El fantasma puede recoger objetos sueltos, además de
   cofres y cadáveres? Provisional: sí, con la misma limitación de uno a la vez.
7. **Hotseat.** ¿El turno del fantasma se puede omitir o limitar en tiempo? ¿La
   mesa espera o se resuelve en paralelo?

# Decisiones

| Fecha | Decisión | Quién | Estado |
|---|---|---|---|
| 2026-11-11 | La muerte no expulsa al jugador: cadáver con equipo y fantasma jugable. | human:simon | aceptada |
| 2026-11-11 | El fantasma tiene turno propio, movimiento con MP intrínseco sin equipo y una acción por ronda. | human:simon | aceptada |
| 2026-11-11 | El fantasma no cruza muros, comparte casilla y no bloquea; no es objetivo ni ataca. | human:simon | aceptada |
| 2026-11-11 | Acción del fantasma: puertas, un objeto a la vez, inspección de cofres sin trampa y saqueo del cadáver. | human:simon | aceptada |
| 2026-11-11 | La resurrección exige mago vivo con maná u objeto consumible. | human:simon | aceptada |
| 2026-11-11 | Los hechizos usan un maná aparte derivado de la puntuación de magia; no gastan MP de movimiento. | human:simon | aceptada; completada por REQ-025 |
| 2026-11-11 | El maná se recarga completo al inicio de cada turno y su máximo deriva del nivel de magia (enmienda `REQ-025`). | human:simon | aceptada |
| 2026-11-11 | La resurrección es un hechizo de nivel alto; no tiene tope propio por turno. | human:simon | aceptada |
| 2026-11-11 | Un intento de resurrección inválido no consume maná ni objeto. | human:simon | aceptada |
| 2026-11-11 | La resurrección se hace en la casilla del cadáver: resucitador adyacente y casilla sin vivos. | human:simon | aceptada |
| 2026-11-11 | Un vivo puede quedarse encima del cadáver y bloquear la resurrección. | human:simon | aceptada |
| 2026-11-11 | El fantasma no cuenta como ocupante de la casilla del cadáver. | human:simon | aceptada |
| 2026-11-11 | Derrota por wipe total; los fantasmas no la evitan. | human:simon | aceptada |
| 2026-11-11 | Los valores de coste, PV de retorno y visión quedan provisionales hasta playtest. | human:simon | provisional |

# Aceptación de la hoja

- [x] El usuario ha aprobado las decisiones creativas.
- [x] El usuario ha aprobado que los hechizos usen maná aparte del MP.
- [x] El usuario ha revisado y aprobado el texto de la hoja.
- [x] Los requisitos son verificables.
- [x] Las dependencias están claras.
- [x] El grafo de tareas es posible; el orden de implementación depende de `REQ-018`/`REQ-020` y se decide al abrirlas.
