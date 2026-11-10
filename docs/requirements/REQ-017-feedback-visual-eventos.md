---
type: Requirement Sheet
id: REQ-017
title: Feedback visual de eventos y ritmo pausado
description: Todo evento del motor tiene una respuesta visual perceptible, con un beat pausado, un techo de tiempo y un cadáver persistente, sin cambiar las reglas.
status: stable
version: 1
decision_owner: human:simon
review_required: true
created_at: 2026-11-10T00:45:43Z
updated_at: 2026-11-10T00:45:43Z
related_tasks: [TASK-0057, TASK-0058, TASK-0059, TASK-0060, TASK-0061]
amends: [REQ-006, REQ-008]
generated: { by: deepseek/v4.1-flash, at: 2026-11-10T00:45:43Z }
verified:
  - by: human:simon
    at: 2026-11-10T00:45:43Z
    note: >-
      Aprueba ritmo pausado, base funcional con acentos, input bloqueado y
      descartado, fase enemiga secuencial con atajo fuera de pantalla, silencios
      solo en transiciones redundantes, cadáver persistente de presentación y
      reserva del sprite de cadáver para muertes reales.
---

# Contexto

El juego ya presenta el movimiento tile a tile y tiene algunos avisos aislados:
el número de daño, el destello de impacto, el `!` de detección y los avisos de
rechazo. El resto de eventos ocurre sin una respuesta visual proporcionada:

- un ataque sin desplazamiento se resuelve en el mismo frame y el daño aparece de
  golpe;
- la muerte se lee como una desaparición instantánea en el impacto;
- el arma recogida desaparece del suelo al inicio de la acción, antes de que se
  vea la recogida;
- el cambio de arma, la fase enemiga, el regreso, la huida, la espera y el fin de
  partida no tienen presentación propia;
- el `!` y los avisos aparecen sin transición;
- el aviso de alarma se muestra al inicio de la acción, no cuando ocurre la onda.

Esto hace que el jugador pierda información y que el combate y los cambios de
estado se sientan menos deliberados de lo que son. La sensación buscada es la de
un roguelike 2D por turnos con aspecto vintage de los 80, pero con un ritmo algo
más vivo: **más rápido que en 1986, más lento que en 2026**.

# Objetivos de experiencia

- Que ningún evento relevante pase desapercibido.
- Que el jugador pueda leer qué ha pasado, quién lo ha hecho y qué ha cambiado,
  sin consultar el log de debug.
- Que el combate se sienta contundente: ataque, defensa, impacto y muerte con
  una secuencia clara.
- Que los cambios de inventario, fase y turno tengan un momento de lectura.
- Que el ritmo pausado no se convierta en espera: el turno sigue siendo ágil y la
  fase enemiga no se arrastra fuera de la pantalla.
- Conservar la nitidez del pixel art, la paleta limitada y la legibilidad de la
  rejilla.

# Requisitos creativos

## Cobertura y ritmo

| ID | Requisito | Aceptación |
|---|---|---|
| R-001 | Todo evento del motor tiene una respuesta visual definida o una excepción silenciosa declarada en esta hoja. No hay eventos sin presentación por omisión. | Existe una matriz evento → feedback; cada `GameEvent` aparece con efecto o con excepción; una prueba recorre la lista de eventos y no encuentra huecos. |
| R-002 | El **beat** es el tiempo mínimo en que el input sigue bloqueado para que el ojo registre el cambio. Cada evento visible tiene un beat propio dentro del ritmo pausado: 250-350 ms para eventos normales, 320 ms para impacto, 300 ms para fallo, 350 ms para recogida, 250 ms para cambio de arma, 200 ms para avistamiento, 500 ms para alarma, 400/350 ms para fases, 900 ms para muerte, 800 ms para fin de partida, 250 ms para reinicio y 150 ms para el atajo de un enemigo fuera de pantalla. | La configuración coincide con la tabla; un muestreo con el reloj de presentación muestra el efecto activo durante su beat; ningún evento visible termina antes de su beat. |
| R-003 | El movimiento conserva el ritmo de `REQ-006`: 125 ms por paso, 70 ms de pausa por tile y diagonal a duración constante. El feedback no lo acorta ni lo alarga. | Los tests de `REQ-006` siguen pasando; `MOTION_CONFIG` no cambia; un movimiento de 3 pasos dura 3 × 125 + 4 × 70 ms. |
| R-004 | Una acción estándar sin desplazamiento no supera 1,3 s de presentación, salvo que encadene muerte o fin de partida. Una acción con desplazamiento añade como máximo el beat de su evento posterior al movimiento. | Medición de una acción de ataque, recogida o cambio de arma; la suma de beats y efectos bloqueantes respeta el techo; la secuencia terminal puede llegar a ~2 s. |

## Combate y muerte

| ID | Requisito | Aceptación |
|---|---|---|
| R-005 | En un impacto, el atacante hace una embestida de 2-4 px hacia el objetivo y vuelve; el objetivo recibe un destello blanco de 80-120 ms, un retroceso de 2 px en sentido opuesto y una sacudida de sprite de 1 px. El daño (`-N`) sube 4 px y se desvanece, y la barra de PV baja en el momento del impacto. | En un frame intermedio se ve la embestida y el destello; el daño no aparece antes del impacto; la barra de PV no cambia antes; el texto es legible al final del beat. |
| R-006 | En un fallo, el atacante hace la misma embestida y el defensor responde con un gesto de esquiva o de escudo; se muestra `Fallo` en gris. No hay destello rojo ni sacudida de impacto. | Impacto y fallo se distinguen en escala de grises; el fallo muestra `Fallo`; no hay destello de impacto. |
| R-007 | La defensa es visible: el defensor reacciona tanto si el ataque impacta como si falla. No se inventan reglas ni se afirma qué tirada concreta ha evitado el golpe. | El defensor tiene una reacción visible en ambos casos; el texto no atribuye el fallo a una regla no expuesta. |
| R-008 | La muerte se presenta en 900 ms: destello blanco, tres parpadeos, disolución de paleta de 300 ms y sacudida de 1 px. Al terminar queda un cadáver persistente en el tile. | La unidad no desaparece en el impacto; la secuencia se ve completa; el cadáver queda al final; la unidad muerta no se dibuja como viva. |
| R-009 | El cadáver es **solo presentación** en este corte: se dibuja desde la unidad muerta que el motor ya conserva, no bloquea, no se puede interactuar y no añade reglas. El saqueo futuro tendrá su propia hoja y podrá leer el botín de la unidad muerta. | No hay comandos ni eventos nuevos; el pathfinding no cambia; el cadáver no se escribe en `state.grid.tiles`; se puede caminar sobre él. |
| R-010 | El cadáver persiste hasta reiniciar la sala, regenerar la semilla o cambiar de nivel. Se dibuja bajo la capa de unidades y sobre la decoración del suelo. | El cadáver sigue visible tras varios turnos; desaparece al reiniciar o regenerar; no tapa al jugador ni al cursor. |

## Inventario y percepción

| ID | Requisito | Aceptación |
|---|---|---|
| R-011 | La recogida dura 350 ms: el arma parpadea tres frames, el slot del HUD pulsa y aparece un banner `+ <Arma>`. El arma permanece en el suelo y el inventario no cambia hasta el beat. | El arma se ve hasta el beat; el slot y el inventario cambian al final; no se puede recoger dos veces la misma arma. |
| R-012 | El cambio de arma dura 250 ms: el slot pulsa, aparece un banner con el nombre y el arma en mano cambia al final del beat. | El HUD y el sprite cambian al final; no hay cambio instantáneo al inicio. |
| R-013 | El avistamiento dura 200 ms: el `!` entra con una animación de tres frames y el enemigo parpadea. Después el `!` persiste mientras el enemigo siga alerta y desaparece con su muerte o huida. | El `!` no se ve antes del evento; la entrada se aprecia; el marcador permanece mientras hay alerta. |
| R-014 | La alarma dura 500 ms: una onda expansiva de dos tiles sale del emisor, el borde de la pantalla destella dos frames y aparece el banner `¡Alarma!`. | La onda empieza en el emisor; el banner coincide con la onda; no se insinúa una cadena que no existe. |
| R-015 | La huida muestra `!!` y una marca de dirección durante 300 ms; el regreso muestra `zzz` que se apaga durante 250 ms; la espera muestra `...` durante 200 ms. | Cada evento visible deja su marca; las marcas no tapan la rejilla ni el cursor. |

## Turno, fin y rechazo

| ID | Requisito | Aceptación |
|---|---|---|
| R-016 | `EnemyPhaseStarted` muestra `FASE ENEMIGA` durante 400 ms y un tinte de borde; `PlayerTurnStarted` muestra `TU TURNO` durante 350 ms y el cursor reaparece con un parpadeo. | La secuencia no muestra dos banners seguidos; el cursor aparece al final del beat; el tinte no oculta el mapa. |
| R-017 | `TurnEnded` es silencioso cuando le sigue `EnemyPhaseStarted`; si apareciera solo, muestra un separador de 250 ms. | En el flujo normal solo se ve el banner de fase; no hay dos avisos redundantes. |
| R-018 | `GameEnded` muestra un destello y espera 800 ms antes del overlay; `GameRestarted` hace un fundido de 250 ms. | El overlay no aparece antes del beat; el reinicio limpia los cues pendientes. |
| R-019 | Un comando rechazado muestra el aviso del HUD y una sacudida de cursor de 120 ms. No añade un beat bloqueante: el aviso dura 1600 ms y el jugador puede seguir actuando. | El aviso aparece sin retrasar la siguiente acción; la sacudida es visible; el aviso se lee. |

## Lenguaje visual y legibilidad

| ID | Requisito | Aceptación |
|---|---|---|
| R-020 | El lenguaje es vintage contenido: destello de paleta, sacudida de 1-2 px, parpadeo, desplazamiento de 2-4 px, texto ASCII y banners. No se usan blur, degradados, partículas, inversión de color a pantalla completa ni animaciones de sprite de varios frames. | La QA visual no encuentra blur ni degradados; los efectos usan la paleta y los sprites existentes; no se añaden assets. |
| R-021 | Los efectos nunca tapan la rejilla, el cursor ni los puntos del camino. La información crítica usa al menos dos canales: forma o movimiento, más texto o color. | Capturas con efectos activos muestran rejilla, cursor y camino; impacto y fallo se distinguen sin color; la información no depende solo del tono. |
| R-022 | El juego respeta `prefers-reduced-motion: reduce`: sin sacudida, parpadeo ni tween; se aplica el estado final en el momento del evento y se conservan texto, banner y marca estática. El orden de eventos es el mismo. | Con la preferencia activa no hay animación; el texto y los banners siguen; el estado final coincide con el modo animado. |

## Input y fase enemiga

| ID | Requisito | Aceptación |
|---|---|---|
| R-023 | Mientras hay un beat activo, las intenciones de juego se bloquean y se descartan; no se encolan. `F1` sigue alternando el debug y `R` sigue reiniciando y cancela la presentación. | Pulsar movimiento, ataque, esperar o fin de turno durante un beat no cambia el estado; `F1` y `R` responden; la siguiente pulsación tras el beat funciona. |
| R-024 | La fase enemiga es secuencial. Si el enemigo es visible, se presenta con su beat completo y la cámara lo sigue. Si su recorrido empieza y termina fuera de la pantalla, se aplica un atajo de 150 ms, sin seguimiento de cámara y sin tween por tile; el cambio de posición se ve al inicio del beat. | Un enemigo visible se anima y la cámara lo sigue; uno fuera de pantalla no mueve la cámara y su beat es ~150 ms; el orden de las acciones se mantiene. |
| R-025 | El atajo fuera de pantalla no se aplica si el enemigo entra o sale del viewport: en ese caso se presenta el recorrido completo, sin mover la cámara si el jugador no es el foco. | Un enemigo que cruza el borde se ve caminar; la cámara no salta; el jugador no pierde su posición. |

## Matriz evento → feedback

| Evento | Cue | Beat | Persistencia |
|---|---|---:|---|
| `UnitMoved` | Paso + pausa + MP + puntos de camino (ya existe) | 125 + 70 ms | — |
| `AttackPerformed` impacto | Embestida, destello blanco, retroceso, `-N`, tick de PV, sacudida de sprite | 320 ms | Texto 1000 ms |
| `AttackPerformed` fallo | Embestida, esquiva/escudo, `Fallo` gris | 300 ms | Texto 1000 ms |
| `UnitDied` | Destello, 3 parpadeos, disolución, sacudida | 900 ms | Cadáver persistente |
| `PickUp` | Parpadeo del arma, banner `+ <Arma>`, slot pulsado | 350 ms | Banner 800 ms |
| `SelectWeapon` | Slot pulsado, banner con nombre, cambio de arma en mano | 250 ms | Banner 800 ms |
| `EnemySpotted` | `!` con entrada de 3 frames, enemigo parpadea | 200 ms | Mientras haya alerta |
| `AlarmRaised` | Onda de 2 tiles, destello de borde, banner `¡Alarma!` | 500 ms | Banner 1600 ms |
| `EnemyFled` | `!!` + marca de dirección | 300 ms | 600 ms |
| `EnemyReturned` | `zzz` que se apaga | 250 ms | 500 ms |
| `EnemyWaited` | `...` sobre el enemigo | 200 ms | 400 ms |
| `EnemyPhaseStarted` | Banner `FASE ENEMIGA` + tinte de borde | 400 ms | 800 ms |
| `PlayerTurnStarted` | Banner `TU TURNO` + cursor con parpadeo | 350 ms | 700 ms |
| `TurnEnded` | Silencio si le sigue `EnemyPhaseStarted`; si no, separador | 0 / 250 ms | — |
| `GameEnded` | Destello + espera antes del overlay | 800 ms | Overlay |
| `GameRestarted` | Fundido a negro | 250 ms | — |
| `CommandRejected` | Aviso de HUD + sacudida de cursor | 0 ms (no bloquea) | Aviso 1600 ms |

La matriz es la lista canónica de cobertura. Cualquier evento nuevo debe añadir
su fila o declarar una excepción antes de implementarse.

# Requisitos técnicos

| ID | Requisito | Aceptación |
|---|---|---|
| T-001 | El motor no cambia: no se añaden comandos ni eventos, y `src/game/` no se modifica. Todo el feedback se deriva de los eventos ordenados y del estado. | El diff de `src/game/` está vacío; los tests de motor y el determinismo siguen pasando. |
| T-002 | El feedback es una timeline de presentación pura, construida a partir de los eventos, con cues de tipo, inicio, duración, ancla y datos de presentación. No conoce DOM, Canvas ni reloj real. | Tests unitarios construyen la timeline y comprueban orden, duración y ancla; no hay efectos secundarios; dos construcciones iguales producen lo mismo. |
| T-003 | El estado visible va un paso por detrás: la muerte, la recogida, el cambio de arma, la fase y el fin de partida se aplican en su cue, no al inicio. La unidad muerta se mantiene dibujada como viva hasta `UnitDied`; el arma permanece en el suelo hasta `PickUp`. | Tests de estado intermedio: antes del cue, PV, inventario, arma y estado de muerte son los anteriores; después coinciden con el motor. |
| T-004 | Una única configuración (`FEEDBACK_CONFIG`) contiene todas las duraciones y variantes. `MOTION_CONFIG` se mantiene para el movimiento. No hay números mágicos repartidos por el host. | Cambiar una duración solo toca la configuración; los tests leen la configuración; no hay `setTimeout` con duraciones de juego. |
| T-005 | El reloj de presentación es único y usa `requestAnimationFrame` con delta acotado. Los textos, destellos y banners se apagan por el reloj de presentación, no por `setTimeout`. | Una pestaña en segundo plano no adelanta cues; `advance(ms)` reproduce el mismo resultado; no quedan temporizadores de feedback. |
| T-006 | Las capas se dibujan en orden: suelo → decals → cadáveres → camino/cursor → unidades → efectos de mundo → texto/banners → HUD. El texto y los banners viven en DOM; los efectos de mundo, en Canvas. | La QA visual comprueba el orden; el texto no queda debajo de una unidad; el HUD queda por encima. |
| T-007 | Las vistas DOM reutilizan nodos por unidad o por cue y no se recrean en cada frame; las animaciones de entrada se disparan al empezar el cue, no en cada render. | Un `!` o un texto no reinicia su animación en frames sucesivos; el nodo se actualiza sin parpadeo. |
| T-008 | El texto de daño se ancla al mundo y se recoloca con la cámara; pueden coexistir varios textos, con un máximo de tres visibles y sin solaparse en el mismo tile. | Al mover la cámara el texto sigue al objetivo; dos impactos seguidos no se pisan; el cuarto texto espera o sustituye al más antiguo. |
| T-009 | El bloqueo de input vive en la capa de intenciones del host: si hay un beat activo, las intenciones de juego se descartan. `window.__game.dispatch` completa la presentación pendiente antes de aplicar el comando. | Tests de input y E2E: teclas ignoradas; `F1`/`R` activos; `dispatch` completa y aplica; no hay doble dispatch. |
| T-010 | La visibilidad para el atajo enemigo se decide con la cámara y el viewport del host. El foco de cámara se puede suprimir por grupo de presentación. | Un enemigo fuera de pantalla no mueve la cámara; uno que cruza el borde se presenta completo; el foco del jugador no cambia. |
| T-011 | El debug y los tests pueden observar el feedback: `window.__game.animation` incluye los cues activos y `advance(ms)` avanza el reloj. No se exponen mutadores del estado vivo. | E2E lee el cue activo y su tipo; el modo test es determinista; el snapshot sigue siendo el estado final serializable. |
| T-012 | Tests nuevos: timeline de feedback, estado intermedio, duraciones, ataque/fallo, muerte y cadáver, recogida, cambio de arma, avistamiento, alarma, fases, fin de partida, atajo fuera de pantalla, reduced motion, input y textos múltiples. No se borran, saltan ni debilitan tests existentes. | `pnpm run verify` y `pnpm run test:e2e` pasan; los tests existentes conservan su intención. |
| T-013 | Se registra `ADR-017` con la decisión de feedback dirigido por eventos y reloj de presentación, y se actualizan arquitectura, economía de turno, glosario, índices y log. Sin dependencias nuevas. | El ADR existe y está enlazado; `pnpm run docs:check` pasa; `package.json` y `pnpm-lock.yaml` no cambian. |

# Requisitos no funcionales

- **Rendimiento:** 60 fps objetivo con la timeline activa; el coste por frame es
  proporcional a los cues visibles, no al tamaño del mapa. Sin dependencias
  nuevas.
- **Accesibilidad:** `prefers-reduced-motion`; la información crítica no depende
  solo del color; el juego sigue siendo operable solo con teclado; los avisos
  importantes usan `aria-live`.
- **Compatibilidad:** Chromium de escritorio como objetivo; Firefox y Safari
  recientes como deseables.
- **Seguridad:** sin red, sin persistencia y sin datos personales.
- **Mantenibilidad:** una sola configuración de duraciones; el motor sigue sin
  conocer tiempo real, Canvas ni teclado; el feedback no se importa desde
  `experiments/`.

# Dependencias

- [REQ-006](REQ-006-movimiento-animado.md): movimiento animado, cámara, input
  bloqueado y ritmo 125/70. Esta hoja amplía su presentación de ataque y muerte,
  pero no cambia su ritmo.
- [REQ-008](REQ-008-suelo-programatico-decoracion-ambiental.md): decals planos.
  Esta hoja reserva `corpse-22a/b` para muertes reales y los retira de la
  decoración ambiental.
- [REQ-009](REQ-009-percepcion-alarma-huida.md): eventos de avistamiento, alarma,
  huida y regreso.
- [REQ-010](REQ-010-combate-equipo-acierto-defensa.md) y
  [REQ-014](REQ-014-atributos-inherentes-personajes.md): evento de ataque, impacto,
  daño y muerte.
- [REQ-004](REQ-004-cursor-seleccion.md): cursor, camino y avisos de rechazo.
- [ADR-006](../decisions/ADR-006-arte-placeholder-32rogues.md): sprites de un solo
  frame y límites de modificación del arte.
- [ADR-008](../decisions/ADR-008-presentacion-animada.md): presentación animada
  sobre un motor atómico.
- [ADR-011](../decisions/ADR-011-suelo-programatico-ambientes.md): decals y
  ambientes del suelo.
- [ADR-017](../decisions/ADR-017-feedback-visual-eventos.md): arquitectura del
  feedback, estado intermedio, reloj y testabilidad.

# Fuera de alcance

- Audio y sonido.
- Partículas, blur, degradados, inversión de color a pantalla completa y
  animaciones de sprite de varios frames.
- Saqueo de cadáveres y cadáver como entidad de motor.
- Cambios en reglas, combate, IA, pathfinding, generación o economía de turno.
- Relojes paralelos por unidad o fase enemiga solapada.
- Sacudida de cámara de más de 2 px o a pantalla completa.
- Hotseat, red, guardado y persistencia.
- Arte nuevo o modificación de los PNG de 32rogues.

# Preguntas abiertas

Ninguna decisión creativa abierta. Quedan como ajustes revisables en playtest,
sin cambiar las reglas:

- El beat exacto dentro de los rangos (por ejemplo, 300 vs 320 ms en impacto).
- La duración de la disolución de muerte (300 ms) y el peso de la sacudida.
- El atajo de 150 ms para enemigos fuera de pantalla.
- La densidad de textos simultáneos y su desplazamiento vertical.

# Decisiones

| Fecha | Decisión | Quién | Estado |
|---|---|---|---|
| 2026-11-10 | Ritmo pausado: beat 250-350 ms, muerte 800-1000 ms y acción sin desplazamiento ≤1,3 s. | human:simon | aceptada |
| 2026-11-10 | Lenguaje vintage contenido: destello, sacudida, parpadeo, desplazamiento, ASCII y banner; sin blur, degradados ni partículas. | human:simon | aceptada |
| 2026-11-10 | Input bloqueado y descartado durante el feedback; `F1` y `R` siguen activos. | human:simon | aceptada |
| 2026-11-10 | Fase enemiga secuencial; enemigos visibles con beat completo y cámara; fuera de pantalla con atajo de ~150 ms y sin cámara. | human:simon | aceptada |
| 2026-11-10 | Silencios solo en transiciones redundantes: `TurnEnded` calla cuando le sigue `EnemyPhaseStarted`. | human:simon | aceptada |
| 2026-11-10 | Cadáver persistente, solo presentación en este corte; el saqueo futuro tendrá su propia hoja. | human:simon | aceptada |
| 2026-11-10 | El sprite de cadáver se reserva para muertes reales y se retira de la decoración ambiental. | human:simon | aceptada |
| 2026-11-10 | Separar reglas creativas (REQ-017) e implementación (ADR-017). | human:simon | aceptada |

# Aceptación de la hoja

- [x] El usuario ha aprobado las decisiones creativas.
- [x] Los requisitos son verificables.
- [x] Las dependencias están claras.
- [x] Se puede generar un grafo de tareas.
- [x] Está claro el fuera de alcance.
- [x] No hay contradicciones abiertas: `REQ-017` enmienda `REQ-006` y `REQ-008`
      en los puntos indicados.
