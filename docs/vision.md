---
type: Vision
title: Visión del proyecto
description: Estado final buscado del roguelike cooperativo y su regla de evolución.
status: draft
generated: { by: deepseek/v4.1-flash, at: 2026-11-11T10:00:00Z }
---

# Visión

ProyectDungeon es un roguelike 2D cooperativo por turnos. La pantalla compartida
muestra la mazmorra; cada jugador decide desde su propio puesto, en el mismo
teclado (hotseat) o desde su móvil mediante QR. **Los dos modos son objetivo del
juego**: el diseño debe funcionar en ambos y ninguno es la versión degradada del
otro.

# Fantasía

Un grupo pequeño de amigos entra en una mazmorra generada, con personajes que
pueden morir, objetos que cambian cómo se juega y decisiones tácticas que se
resuelven en la mesa. La partida tiene que poder contarse después: qué se
encontró, quién cayó, quién lo rescató y cómo se salió.

# Pilares

- **Cooperación legible**: cada jugador entiende qué puede hacer, qué ha hecho el
  resto y qué va a hacer la máquina, tanto en pantalla compartida como en remoto.
- **Nadie sale de la partida**: la muerte no expulsa a un jugador de la mesa;
  cambia su papel, no lo elimina de la experiencia.
- **Decisiones tácticas cortas**: mover, atacar, interactuar, usar una habilidad
  y terminar turno forman un ciclo claro, con poco tiempo muerto.
- **Mazmorra con intención**: salas, enemigos, llaves y cofres invitan a
  explorar y a coordinarse, no a rellenar casillas.
- **Fricción cero para jugar**: el juego arranca en una pestaña; unirse desde el
  móvil debe ser inmediato cuando llegue la fase remota.
- **Iteración visible**: cada decisión importante se prueba en un experimento o
  playtest antes de convertirse en requisito.

# Tono y presentación

La estética busca la sensación de un clásico: lectura de píxel, paleta sobria,
nostalgia de máquina antigua. La sensación moderna viene del tacto: animaciones
fluidas, tiempos cuidados, respuesta inmediata y feedback claro.

- Música y efectos de sonido forman parte del juego, no son un extra.
- Iluminación dinámica y filtros tipo CRT o VHS son hipótesis de presentación:
  deben probarse y nunca pueden comprometer la legibilidad. Si se implementan,
  serán configurables.
- El arte y el audio finales se deciden con el usuario y se validan con
  experimentos y playtests.

# Sistemas del horizonte

Esta lista describe lo que el juego debe llegar a tener. No es el alcance
vigente: cada sistema necesita su hoja de requisitos y, si hay dudas, su
experimento.

- **Catálogo amplio** de armas y enemigos, con perfiles y comportamientos
  distintos.
- **Habilidades**: combate cuerpo a cuerpo, proyectiles físicos y mágicos,
  familias mágicas con efectos temporales y permanentes, teletransporte mediante
  magia y curación.
- **Progresión**: puntos de habilidad para mejorar los atributos del personaje y
  un número de acciones por personaje tratado como atributo.
- **Exploración con llaves**: puertas cerradas que exigen encontrar llaves; no
  todas las puertas están cerradas.
- **Cofres** abiertos, cerrados y con trampa, con inventario y objetos propios.
- **Inventario y equipo por personaje**, con huecos para equipar objetos.
- **Modificadores y habilidades al equipar**: bonificaciones de atributo, daño de
  fuego, veneno, robo de vida y efectos similares.

# Muerte y cooperación

La muerte es un estado jugable, no una salida de la mesa.

- El personaje muerto deja un **cadáver en el suelo** con sus objetos.
- El jugador muerto sigue jugando como **fantasma**, con turno propio, movimiento
  limitado y **una acción por ronda**.
- El fantasma **no atraviesa muros**, pero sí personajes y enemigos; no puede
  terminar su movimiento en una casilla ocupada y los demás también pueden
  atravesarlo. No bloquea el paso de nadie.
- La **resurrección** exige un mago vivo con el hechizo y recurso suficiente, o
  un objeto de resurrección en el inventario de quien lo usa. Quien resucita debe
  estar **adyacente a la casilla del cadáver**, y esa casilla no puede estar
  ocupada por un vivo (aliado o enemigo). El fantasma no cuenta como ocupante.
- El personaje **vuelve en la casilla del cadáver**, no en la del fantasma. Sin
  fuente de resurrección disponible, la muerte es definitiva.
- Cada muerte pesa según el estado del grupo: perder al mago o al objeto de
  resurrección cambia el riesgo de la partida.

# Modos de juego

- **Hotseat**: varios jugadores se turnan en el mismo teclado y la misma pantalla.
- **Remoto**: cada jugador usa su móvil como mando, unido por QR a la pantalla
  host.
- Sesiones cortas, de aproximadamente 20-40 minutos, para grupos pequeños de
  amigos. El host es el tablero compartido.

# Estado de la idea

Esta visión es una **hipótesis evolutiva**, no un contrato. Con cada playtest y
experimento puede ajustarse, reescribirse o descartarse. Lo que obliga es la hoja
de requisitos aceptada; lo que no está aceptado sigue siendo propuesta.

# Preguntas abiertas

- **Estructura de run**: ¿muerte permanente con runs, pisos encadenados y
  progresión entre partidas, o partidas sueltas con mapa procedural?
- **Puntos de habilidad**: ¿se ganan y gastan dentro de la run o persisten entre
  partidas? Lo segundo implica guardado local.
- **Filtros CRT/VHS**: ¿activos por defecto con opción de apagarlos o solo un
  modo opcional?
- **Borde del fantasma**: ¿alguna unidad puede terminar su movimiento sobre la
  casilla del fantasma, o solo lo atraviesa de paso?
- **Derrota**: ¿la partida se pierde cuando no queda ningún jugador vivo y no hay
  resurrección posible, o existe otro criterio?
- **Coste y límites de la resurrección**: quién puede resucitar, cuántas veces y
  a qué precio.
- **Acciones por personaje**: cómo convive el atributo de acciones con la acción
  única actual por turno.

# No objetivos

- No es un juego competitivo ni un eSport.
- No hay cuentas ni matchmaking. La persistencia sigue siendo una pregunta
  abierta.
- No se busca un motor genérico ni un framework de gameplay.
- No se sacrifica la legibilidad por efectos visuales o filtros.
- No se implementan sistemas del horizonte sin hoja de requisitos aceptada.

# Autoridad creativa

El usuario decide cómo se ve, cómo se escucha, cómo se juega y cómo se siente. El
agente puede proponer, comparar y advertir, pero no aceptar una decisión creativa
en su nombre.
