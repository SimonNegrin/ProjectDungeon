---
type: Design
title: Economía de turno provisional
description: Valores iniciales de movimiento, acción, combate, orden y cámara para el primer prototipo.
status: draft
decision_status: provisional
generated: { by: deepseek/v4.1-flash, at: 2026-11-08T09:12:11Z }
---

# Propósito

Fijar unos valores jugables para el primer prototipo local. No son definitivos:
están pensados para poder probar el loop y ajustarlos después con experimentos y
playtests.

# Rejilla y movimiento

| Regla | Valor provisional |
|---|---|
| Rejilla | Cuadrada; 32×32 tiles en el mapa generado de `REQ-003`, con el tamaño como parámetro interno. |
| Posición inicial del jugador | Definida por `map.spawns.player`; con la semilla de referencia, (6,8). |
| Posición inicial del enemigo | Definida por `map.spawns.enemy`; con la semilla de referencia, (23,28). |
| Direcciones | 8 direcciones, incluida la diagonal. |
| Coste de movimiento | 1 MP por casilla, también en diagonal. |
| MP de jugador | 6. |
| MP de enemigo | 4. |
| Ocupación | Jugadores y enemigos bloquean la casilla. |
| Corte de esquina | No permitido: para moverse en diagonal, las dos casillas ortogonales adyacentes deben estar libres. |
| Cámara | Viewport de 13×13 tiles; sigue al jugador activo y se limita a los bordes del mapa. |
| Cursor | Cuadrado de un tile; flechas/`WASD` en 4 direcciones; no gasta MP, no consume acción y no mueve la cámara. |
| Inicio de turno | El cursor aparece sobre el tile del jugador activo. |
| Alcance del cursor | Limitado al viewport de 13×13; no lo bloquean muros ni unidades. |
| Camino | Se resalta con puntos blancos: tramo alcanzable con el MP actual en tono fuerte y resto atenuado. |

# Acción

- Cada unidad tiene **una acción por turno**: atacar, interactuar o esperar.
- Se puede mover antes y después de la acción, mientras queden MP.
- Atacar no termina el turno por sí solo.
- El turno termina al pulsar `E`. Si no quedan MP y la acción está usada, el HUD
  sugiere terminar, pero el prototipo no auto-termina.
- Al empezar un turno se restauran MP y acción.

# Movimiento por destino

El cursor elige el destino y el jugador se mueve hacia él. El detalle normativo
está en [REQ-004](../requirements/REQ-004-cursor-seleccion.md).

- **Verde**: suelo libre alcanzable con el MP actual. Moverse recorre el camino
  completo y gasta 1 MP por paso; no consume la acción.
- **Ámbar**: suelo libre con camino, pero el coste supera el MP actual. Moverse
  avanza hasta agotar MP y se detiene; no consume la acción.
- **Rojo**: muro, aliado, objeto bloqueante o sin camino. Moverse no hace nada.
- **Enemigo**: el camino termina en el tile libre adyacente desde el que se
  ataca. Moverse se acerca y ataca si alcanza y queda acción; si no queda acción,
  solo se mueve; si no alcanza, avanza parcialmente sin atacar; si ya está
  adyacente, ataca directamente.
- **Atacar** (`F`) es directo desde la posición actual: solo en adyacencia y con
  acción; no se acerca.
- El cursor no se recentra al moverse ni al atacar; vuelve al jugador al empezar
  su turno, al reiniciar o al cambiar de semilla.

# Combate

| Regla | Valor provisional |
|---|---|
| Alcance cuerpo a cuerpo | 1 casilla, incluidas las diagonales. |
| Alcance a distancia | 4 casillas, con línea de visión. |
| Línea de visión | Bresenham sobre la rejilla; diagonales permitidas. |
| Cobertura | No existe en el primer prototipo. |
| Vida de jugador | 20. |
| Vida de enemigo | 10. |
| Daño de ataque básico | 5. |
| Daño de enemigo | 3. |
| Muerte | Al llegar a 0 de vida. |

En este corte solo existe ataque cuerpo a cuerpo; el alcance a distancia de 4
casillas queda como valor futuro y no se implementa.

Los valores de vida y daño son placeholders para probar el loop, no una
propuesta de balance.

# Orden de turnos

1. Todos los jugadores actúan en orden fijo, determinado por su índice.
2. Cuando el último jugador termina, empieza la fase enemiga.
3. Todos los enemigos actúan en orden de índice.
4. Al terminar el último enemigo, vuelve la fase de jugadores.

En el primer prototipo hay un solo jugador y un solo enemigo, pero el estado ya
representa listas de jugadores y enemigos.

# IA enemiga

Para el primer prototipo:

1. Elegir al jugador más cercano.
2. Si está en rango de ataque, atacar.
3. Si no, avanzar hacia él usando el pathfinding más simple que funcione.
4. Si no puede avanzar ni atacar, esperar.

La IA debe ser determinista y testeable.

# Controles provisionales

| Tecla | Acción |
|---|---|
| `WASD` / flechas | Mover el cursor un tile en 4 direcciones. |
| `Espacio` / `Enter` | Moverse hasta el cursor; sobre un enemigo, acercarse y atacar. |
| `F` | Atacar al enemigo bajo el cursor si está adyacente. |
| `E` | Terminar turno. |
| `R` | Reiniciar la sala. |
| `F1` | Alternar overlay de debug. |
| `F2` | Generar una semilla nueva en modo debug. |

En el futuro hotseat se reutilizarán las mismas teclas para el jugador activo.
En la fase remota, el móvil enviará comandos equivalentes.

# Victoria y derrota

- **Victoria**: no quedan enemigos vivos.
- **Derrota**: no quedan jugadores vivos.
- Al terminar, se muestra un overlay con el resultado y la opción de reiniciar.

# Ajuste futuro

Estos valores se podrán comparar en experimentos interactivos:

- coste diagonal 1 frente a 1,5;
- 4, 6 u 8 MP;
- atacar antes o después de mover;
- una acción frente a puntos de acción;
- velocidad y claridad de la cámara;
- tamaño, opacidad y patrón del cursor y de los puntos del camino;
- texto y duración de los avisos de rechazo;
- repetición automática de teclas al mantener pulsado el cursor.
