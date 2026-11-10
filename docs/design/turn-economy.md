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
| Posición inicial del jugador | La del spawn del grupo (`map.spawns.party[0] ?? map.spawns.player`); el jugador por defecto es el Guerrero del roster. |
| Posiciones iniciales enemigas | Derivadas del mapa y la semilla: 4 enemigos (2 centinelas, 1 bruto y 1 cobarde) en salas distintas, fuera de la visión inicial; `map.spawns.enemy` es el ancla. |
| Direcciones | 8 direcciones, incluida la diagonal. |
| Coste de movimiento | 1 MP por casilla, también en diagonal. |
| MP de jugador | 6. |
| MP de enemigo | Por tipo: Centinela 5, Bruto 4, Cobarde 6 (provisional). |
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

# Feedback visual

El detalle normativo está en [REQ-017](../requirements/REQ-017-feedback-visual-eventos.md)
y [ADR-017](../decisions/ADR-017-feedback-visual-eventos.md). Todo evento del
motor tiene una respuesta visual o una excepción declarada. El ritmo es pausado:
**más rápido que en 1986, más lento que en 2026**.

| Regla | Valor |
|---|---|
| Beat normal | 250-350 ms. |
| Impacto de ataque | 320 ms. |
| Fallo de ataque | 300 ms. |
| Recogida | 350 ms. |
| Cambio de arma | 250 ms. |
| Avistamiento (`!`) | 200 ms, luego persiste mientras hay alerta. |
| Alarma | 500 ms. |
| Fase enemiga / turno del jugador | 400 / 350 ms. |
| Muerte | 900 ms; deja cadáver persistente. |
| Fin de partida | 800 ms antes del overlay. |
| Reinicio | 250 ms. |
| Acción sin desplazamiento | ≤1,3 s, salvo secuencia terminal. |
| Enemigo fuera de pantalla | 150 ms, sin cámara ni tween por tile. |
| Movimiento | 125/70 sin cambios. |

- El input se bloquea y se descarta durante el beat; `F1` y `R` siguen activos.
- El cadáver es solo presentación: no bloquea, no se interactúa y no añade
  reglas; el saqueo tendrá su propia hoja.
- `prefers-reduced-motion` aplica el estado final y conserva texto, banner y
  marca estática.

# Combate

Valores aceptados en [REQ-010](../requirements/REQ-010-combate-equipo-acierto-defensa.md)
y registrados en [ADR-012](../decisions/ADR-012-combate-equipo-rng.md); el
esquema de atributos y la absorción vigente están en
[REQ-014](../requirements/REQ-014-atributos-inherentes-personajes.md) y
[ADR-015](../decisions/ADR-015-atributos-inherentes-absorcion.md). Son revisables
en playtest, pero no se cambian sin una nueva decisión.

Todo personaje comparte ocho atributos inherentes, independientes del equipo:
**habilidad**, **fuerza**, **defensa**, **resistencia**, **puntería**, **magia**,
**PV** y **MP**. El equipo no define ninguno; solo aporta bonus. Habilidad y
fuerza sustituyen a los antiguos modificadores de acierto y daño; defensa se
mantiene. Puntería y magia existen como slots sin efecto en este corte.

| Regla | Valor |
|---|---|
| Alcance cuerpo a cuerpo | 1 casilla, incluidas las diagonales. |
| Alcance a distancia | 4 casillas, con línea de visión; futuro, no implementado. |
| Línea de visión | Bresenham sobre la rejilla; diagonales permitidas. |
| Cobertura | No existe en el primer prototipo. |
| Impacto | `habilidad + acierto del arma + 1d6 > defensa + escudo + 1d6`; el empate falla. |
| Daño | `max(1, (fuerza + daño del arma + 1d6) − (resistencia + armadura + 1d6))`. |
| Resistencia | Absorción de daño; se suma a la armadura del equipo en una sola capa. |
| Escudo | Suma a la defensa; no reduce el daño de un impacto. |
| Armadura | Bonus a la resistencia; resta al daño de un impacto, no evita el impacto. |
| Orden de tiradas | Ataque y escudo; si impacta, golpe y absorción. |
| Azar | RNG sembrado y serializable; misma semilla y comandos, misma secuencia. |
| Muerte | Al llegar a 0 PV. |

## Armas

| Arma | Acierto | Daño | Perfil |
|---|---:|---:|---|
| Espada | +3 | 3 | Equilibrada; arma inicial del Guerrero. |
| Hacha | +2 | 5 | Mucho daño; rompe armadura, pero falla más. |
| Daga | +4 | 2 | Muy fiable; supera escudos, pero sufre contra armadura. |
| Cuchillo | +4 | 1 | Muy fiable; menos dañino que la daga. Arma inicial del Cocinero. |

## Equipo y bestiario

| Unidad | Habilidad | Fuerza | Defensa | Resistencia | Arma | Escudo | Armadura | PV |
|---|---:|---:|---:|---:|---|---:|---:|---:|
| Guerrero (jugador por defecto) | +1 | +1 | +1 | +1 | Espada | 1 | 1 | 20 |
| Centinela | +0 | +0 | +0 | +0 | Espada | 1 | 0 | 6 |
| Bruto | +0 | +1 | +0 | +0 | Hacha | 0 | 2 | 8 |
| Cobarde | +1 | +0 | +1 | +0 | Daga | 1 | 0 | 5 |

Todos los personajes tienen puntería 0 y magia vacía en este corte. MP enemigo:
Centinela 5, Bruto 4, Cobarde 6. Estos valores son el **balance provisional v1**
de [REQ-010 v5](../requirements/REQ-010-combate-equipo-acierto-defensa.md) y
[REQ-009 v4](../requirements/REQ-009-percepcion-alarma-huida.md); el balance v1
de enemigos y armas no cambia. El Guerrero sustituye al jugador provisional y
añade +1 de resistencia (0 → 1). El roster de
[REQ-015](../requirements/REQ-015-roster-arquetipos.md) es la fuente única de
stats y equipo de los héroes.

El Guerrero empieza con la espada, el escudo y la armadura. El hacha y la daga
están en el mapa: `G` recoge la del tile por 1 MP sin gastar acción y la equipa;
`1`-`3` cambia de arma sin coste. En este corte solo existe ataque cuerpo a
cuerpo; el alcance a distancia queda como valor futuro.

# Orden de turnos

1. Todos los jugadores actúan en orden fijo, determinado por su índice.
2. Cuando el último jugador termina, empieza la fase enemiga.
3. Todos los enemigos actúan en orden de índice.
4. Al terminar el último enemigo, vuelve la fase de jugadores.

En este corte hay un jugador y cuatro enemigos; el estado sigue representando
listas de jugadores y enemigos.

# IA enemiga

Reglas decididas en [REQ-009](../requirements/REQ-009-percepcion-alarma-huida.md);
la IA es determinista y testeable y no usa `Math.random`.

| Regla | Valor |
|---|---|
| Visión | 360° con línea de Bresenham; los muros bloquean y las unidades no. |
| Radio de visión por tipo | Centinela 6, Bruto 4, Cobarde 5. |
| Radio de alarma | 5 para todos; no requiere línea de visión y no se propaga en cadena. |
| Estado inicial | `dormant`: no se mueve, no ataca y no patrulla. |
| Detección | Tras cada paso aceptado de `Move`/`MoveTo`; no consume MP ni acción. |
| Memoria | `lastKnown`; 2 fases enemigas investigando y la tercera volviendo. |
| Alerta | Ataca si es adyacente; si no, gasta hasta su MP (5/4/6 según tipo) por BFS hacia `lastKnown` y ataca si termina adyacente con acción. Sin ruta, espera. |
| Regreso | Vuelve a `home` sin atacar y se duerme al llegar. |
| Daño | Despierta y alerta; guarda la posición del atacante y, si sobrevive, da la alarma. |
| Huida | Solo el perfil cobarde, con un golpe de ≥40 % de sus PV máximos sobreviviendo; rompe la línea de visión y maximiza la distancia. Acorralado, ataca. |
| Desempate | Orden determinista por índice de unidad y de casilla. |

Flujo de una fase enemiga:

1. Si está `dormant`, espera.
2. Si está `alert`, persigue `lastKnown` y ataca al llegar si conserva la acción.
3. Si está `returning`, vuelve a `home` sin atacar y se duerme al llegar.
4. Si es cobarde y `fleeing`, elige la casilla alcanzable que rompe la visión y
   más se aleja; sin visión, vuelve a `home`.

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
- 4, 6 u 8 MP por tipo;
- atacar antes o después de mover;
- una acción frente a puntos de acción;
- velocidad y claridad de la cámara;
- tamaño, opacidad y patrón del cursor y de los puntos del camino;
- texto y duración de los avisos de rechazo;
- repetición automática de teclas al mantener pulsado el cursor.
