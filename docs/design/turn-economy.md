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

# Presentación del movimiento

El detalle normativo está en [REQ-006](../requirements/REQ-006-movimiento-animado.md).
La animación es presentación: el motor sigue resolviendo el movimiento de forma
atómica y el host reconstruye el recorrido desde los eventos `UnitMoved`.

| Regla | Valor |
|---|---|
| Duración de un paso recto | 125 ms. |
| Pausa por tile | 70 ms, también al inicio y en el destino. |
| Diagonal | Duración constante: mismo tiempo que un paso recto. |
| Cámara | Sigue al personaje de forma continua, redondeada a píxel entero y limitada al mapa. |
| Input durante el recorrido | Se ignoran las teclas de juego y se descartan; `F1` y `R` siguen activos. |
| Cursor | Oculto mientras se camina; los puntos del camino se apagan al recorrerlos. |
| MP | Baja paso a paso en el HUD. |
| Ataque tras acercarse | Se presenta después del último paso y su pausa. |
| Movimiento reducido | Con `prefers-reduced-motion` se presenta de forma instantánea. |

Valores decididos en [EXP-002](../../experiments/EXP-002-ritmo-movimiento/experiment.md):
125 ms de paso, 70 ms de pausa y diagonal a duración constante. Son revisables en
playtest, pero no se cambian sin una nueva decisión.

# Combate

Valores aceptados en [REQ-010](../requirements/REQ-010-combate-equipo-acierto-defensa.md)
y registrados en [ADR-012](../decisions/ADR-012-combate-equipo-rng.md). Son
revisables en playtest, pero no se cambian sin una nueva decisión.

| Regla | Valor |
|---|---|
| Alcance cuerpo a cuerpo | 1 casilla, incluidas las diagonales. |
| Alcance a distancia | 4 casillas, con línea de visión; futuro, no implementado. |
| Línea de visión | Bresenham sobre la rejilla; diagonales permitidas. |
| Cobertura | No existe en el primer prototipo. |
| Impacto | `mod. acierto + acierto del arma + 1d6 > mod. defensa + escudo + 1d6`; el empate falla. |
| Daño | `max(1, (mod. daño + daño del arma + 1d6) − (armadura + 1d6))`. |
| Escudo | Suma a la defensa; no reduce el daño de un impacto. |
| Armadura | Resta al daño de un impacto; no evita el impacto. |
| Orden de tiradas | Ataque y escudo; si impacta, daño y armadura. |
| Azar | RNG sembrado y serializable; misma semilla y comandos, misma secuencia. |
| Muerte | Al llegar a 0 PV. |

## Armas

| Arma | Acierto | Daño | Perfil |
|---|---:|---:|---|
| Espada | +3 | 4 | Equilibrada; arma inicial del jugador. |
| Hacha | +2 | 6 | Mucho daño; rompe armadura, pero falla más. |
| Daga | +4 | 3 | Muy fiable; supera escudos, pero sufre contra armadura. |

## Equipo y bestiario

| Unidad | Acierto | Daño | Defensa | Arma | Escudo | Armadura | PV |
|---|---:|---:|---:|---|---:|---:|---:|
| Jugador | +1 | +1 | +1 | Espada | 1 | 1 | 20 |
| Centinela | +0 | +0 | +0 | Espada | 1 | 1 | 9 |
| Bruto | +0 | +1 | +0 | Hacha | 0 | 2 | 12 |
| Cobarde | +1 | +0 | +1 | Daga | 1 | 0 | 8 |

El jugador empieza con la espada, el escudo y la armadura. El hacha y la daga
están en el mapa: `G` recoge la del tile por 1 MP sin gastar acción y la equipa;
`1`-`3` cambia de arma sin coste. En este corte solo existe ataque cuerpo a
cuerpo; el alcance a distancia queda como valor futuro.

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
