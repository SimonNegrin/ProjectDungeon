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

> **Aviso de vigencia (2026-11-13).** La sección de acción se actualiza con
> `REQ-026`: varias acciones por turno, Pícaro 3, enemigos 2/1/2 y tope 4
> provisional. La réplica de `REQ-027` y la magia de `REQ-025` están
> implementadas; la réplica tiene sección propia. El combate de `REQ-029` se
> documenta en [Combate](#combate) con paquetes y bandas; el daño único queda como
> historia.

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

- Cada unidad tiene **2 acciones por turno** por defecto; el Pícaro empieza con
  **3** y los enemigos tienen 2/1/2 (Centinela/Bruto/Cobarde). Los objetos pueden
  sumar +1 hasta un **tope de 4**, provisional.
- Atacar, interactuar (puertas, cofres, cadáveres) y lanzar hechizos consumen
  **1 acción**; atacar se puede repetir. Moverse, recoger o soltar del suelo,
  equipar o desequipar, esperar y terminar el turno **no** consumen acción.
- Recoger o soltar del suelo, y equipar o desequipar, cuestan **1 MP**. Abrir o
  registrar un contenedor cuesta **1 acción** y requiere adyacencia; transferir es
  gratis. Equipar desde un contenedor cuesta igualmente 1 MP.
- Equipo, mochila y objetos del suelo se gestionan en un único panel modal abierto
  con `I`; ver [REQ-018](../requirements/REQ-018-inventario-equipo.md).
- `Moverse` sobre un enemigo se acerca con MP y ejecuta **un ataque por
  pulsación**; no encadena todos los ataques.
- El turno **no termina solo** al gastar las acciones: se cierra con `E`. El HUD
  sugiere terminar cuando no quedan acciones ni MP útil.
- Al empezar un turno se restauran MP, acciones y maná.

# Réplica

Decidida en [REQ-027](../requirements/REQ-027-replica-combate-cuerpo-a-cuerpo.md)
y registrada en [ADR-022](../decisions/ADR-022-replica-cuerpo-a-cuerpo.md).

- Solo se dispara tras un ataque **cuerpo a cuerpo fallido**. Un impacto no
  genera réplica.
- **Coste 0**: no gasta acción, MP ni maná y no comparte el tope de 4 acciones.
- **Elegibilidad**: defensor vivo, adyacente, con arma equipada y alerta,
  regresando o huyendo acorralado; un dormido nunca replica. Sin arma, a
  distancia o con ataque mágico no hay réplica.
- **Tirada nueva** con la misma fórmula y RNG; puede impactar, fallar o matar.
  No reutiliza la tirada del ataque fallido y no encadena otra réplica.
- **Sin estado pendiente**: es una reacción atómica; cargar una partida no
  reproduce réplicas.
- **Presentación**: reutiliza la animación de ataque, girada desde el defensor
  hacia el atacante original, sin texto propio. Tiene cue propio de 300 ms.
- **Ritmo**: el fallo (300 ms) y la réplica (300 ms) forman una acción compuesta
  de 600 ms. Se declara la excepción al techo de 1,3 s: la reacción no se mide
  como una segunda acción independiente; si la réplica mata, la muerte encadena
  su beat terminal como cualquier impacto letal.

# Movimiento por destino

El cursor elige el destino y el jugador se mueve hacia él. El detalle normativo
está en [REQ-004](../requirements/REQ-004-cursor-seleccion.md).

- **Verde**: suelo libre alcanzable con el MP actual. Moverse recorre el camino
  completo y gasta 1 MP por paso; no consume la acción.
- **Ámbar**: suelo libre con camino, pero el coste supera el MP actual. Moverse
  avanza hasta agotar MP y se detiene; no consume la acción.
- **Rojo**: muro, aliado, objeto bloqueante o sin camino. Moverse no hace nada.
- **Enemigo**: el camino termina en el tile libre adyacente desde el que se
  ataca. Moverse se acerca y ejecuta un ataque si alcanza y queda alguna acción;
  no encadena: repetir Moverse ataca de nuevo. Si no queda acción, solo se mueve;
  si no alcanza, avanza parcialmente sin atacar; si ya está adyacente, ataca una
  vez por pulsación.
- **Atacar** (`F`) es directo desde la posición actual: solo en adyacencia y con
  acción disponible; no se acerca.
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
| Réplica | 300 ms; misma animación girada, sin texto propio; PV en su cue. |
| Acción sin desplazamiento | ≤1,3 s, salvo secuencia terminal o fallo con réplica. |
| Enemigo fuera de pantalla | 150 ms, sin cámara ni tween por tile. |
| Movimiento | 125/70 sin cambios. |

- El input se bloquea y se descarta durante el beat; `F1` y `R` siguen activos.
- El cadáver es solo presentación: no bloquea, no se interactúa y no añade
  reglas; el saqueo tendrá su propia hoja.
- `prefers-reduced-motion` aplica el estado final y conserva texto, banner y
  marca estática.

# Combate

El combate vigente se resuelve con el modelo de paquetes y perfiles de
[REQ-029](../requirements/REQ-029-tipos-dano-resistencias.md) y
[ADR-023](../decisions/ADR-023-tipos-dano-paquetes-bandas.md); la tirada de
impacto y el escudo conservan lo aceptado en
[REQ-010](../requirements/REQ-010-combate-equipo-acierto-defensa.md) y
[ADR-012](../decisions/ADR-012-combate-equipo-rng.md). El esquema de atributos
vive en [REQ-014](../requirements/REQ-014-atributos-inherentes-personajes.md) y la
absorción numérica de
[ADR-015](../decisions/ADR-015-atributos-inherentes-absorcion.md) queda sustituida
por el perfil de bandas.

Todo personaje comparte nueve atributos inherentes, independientes del equipo:
**habilidad**, **fuerza**, **defensa**, **resistencia**, **puntería**, **magia**,
**PV**, **MP** y **acciones por turno**. El equipo no define ninguno; solo aporta
bonus. Habilidad y fuerza sustituyen a los antiguos modificadores de acierto y
daño; la fuerza se suma solo al paquete físico y defensa se mantiene. La
resistencia es un **perfil de cinco bandas**, una por tipo de daño, no un valor
plano. Puntería sigue como slot sin efecto. Magia es un nivel único 0–4
([REQ-025](../requirements/REQ-025-magia-hechizos-mana.md)): determina el maná, el
acceso a hechizos y el impacto mágico; no cambia el tipo de daño ni la
resistencia.

| Regla | Valor |
|---|---|
| Alcance cuerpo a cuerpo | 1 casilla, incluidas las diagonales. |
| Alcance a distancia | 4 casillas, con línea de visión; futuro, no implementado. |
| Línea de visión | Bresenham sobre la rejilla; diagonales permitidas. |
| Cobertura | No existe en el primer prototipo. |
| Impacto | `habilidad + acierto del arma + 1d6 > defensa + escudo + 1d6`; el empate falla. |
| Impacto mágico | `nivel de magia + acierto del hechizo + 1d6 > defensa + escudo + 1d6`; el empate falla. |
| Daño por paquete físico | `bruto = cantidad + fuerza + 1d6 − (armadura + 1d6)`. |
| Daño por paquete mágico o eléctrico | `bruto = cantidad + 1d6 − 1d6`; ni fuerza ni armadura entran. |
| Banda | `bruto = max(0, bruto)`; `daño = max(0, floor(bruto × banda))`. |
| Total | `max(1, suma de daños de paquete)`; un paquete nunca resta a otro. |
| Resistencia | Perfil de cinco bandas; se aplica después de la absorción y no hay inmunidad absoluta. |
| Escudo | Suma a la defensa; decide el impacto de cualquier tipo, no reduce el daño. |
| Armadura | Resta al daño de los paquetes físicos (filo, contundente y punzante); no protege de mágico ni eléctrico. |
| Orden de tiradas | Ataque y escudo; si impacta, por paquete en el orden declarado, daño y resistencia. Un fallo consume dos tiradas. |
| Azar | RNG sembrado y serializable; misma semilla y comandos, misma secuencia. |
| Muerte | Al llegar a 0 PV. |

## Bandas de resistencia

| Banda | Multiplicador | Uso |
|---|---:|---|
| Vulnerable | ×1,5 | Debilidad clara; el paquete hace más daño. |
| Normal | ×1 | Valor por defecto; la banda ausente cuenta como normal. |
| Resistente | ×0,5 | Reduce a la mitad el daño del paquete. |
| Muy resistente | ×0,25 | Resistencia extrema y rara; nunca inmunidad. |

## Armas

| Arma | Acierto | Paquetes | Estimada v1 | Notas |
|---|---:|---|---|---|
| Espada | +3 | filo 3 | No | Equilibrada; arma inicial del Guerrero. |
| Hacha | +2 | filo 5 | No | Mucho daño; falla más. |
| Daga | +4 | punzante 2 | No | Muy fiable; sufre contra armadura. |
| Cuchillo | +4 | punzante 1 | No | Muy fiable; arma inicial del Cocinero. |
| Martillo | +2 | contundente 4 | Sí | Única arma nueva colocada en el mapa de forma determinista. |
| Espada electrizada | +3 | filo 3 + eléctrico 1 | Sí | Arma mixta; cualquier héroe puede usarla. |
| Daga arcana | +4 | punzante 2 + mágico 1 | Sí | Segunda fuente elemental; existe como dato y no se coloca en el mapa. |

El catálogo vive en `equipment.ts`. Las armas marcadas como estimadas v1 son
contenido de prueba de REQ-029 y no cambian el equipo inicial del roster: el
martillo entra en el mapa y la espada electrizada y la daga arcana existen como
datos.

## Equipo y bestiario

Atributos y equipo de los nueve arquetipos y los tres enemigos actuales. Los
perfiles se leen por tipo; `V` = vulnerable, `N` = normal, `R` = resistente y
`MR` = muy resistente.

| Unidad | Habilidad | Fuerza | Defensa | PV | MP | Arma | Escudo | Armadura |
|---|---:|---:|---:|---:|---:|---|---:|---:|
| Guerrero | +1 | +1 | +1 | 20 | 6 | Espada | 1 | 1 |
| Bárbaro | 0 | +3 | −1 | 24 | 5 | Hacha | 0 | 0 |
| Pícaro | +3 | 0 | +1 | 14 | 8 | Daga | 0 | 0 |
| Arquero | +1 | 0 | 0 | 14 | 6 | — | 0 | 0 |
| Mago | 0 | −1 | 0 | 12 | 5 | — | 0 | 0 |
| Clérigo | 0 | −1 | +3 | 18 | 5 | — | 1 | 1 |
| Guerrero mágico | +1 | 0 | +1 | 18 | 6 | — | 0 | 1 |
| Cocinero | +3 | −1 | 0 | 14 | 6 | Cuchillo | 0 | 0 |
| Agricultor | −1 | +3 | 0 | 22 | 4 | — | 1 | 0 |
| Centinela | 0 | 0 | 0 | 6 | 5 | Espada | 1 | 0 |
| Bruto | 0 | +1 | 0 | 8 | 4 | Hacha | 0 | 2 |
| Cobarde | +1 | 0 | +1 | 5 | 6 | Daga | 1 | 0 |

| Unidad | Filo | Contundente | Punzante | Mágico | Eléctrico |
|---|---|---|---|---|---|
| Guerrero | N | N | N | N | N |
| Bárbaro | R | R | N | V | V |
| Pícaro | N | V | R | N | N |
| Arquero | N | V | N | N | N |
| Mago | V | V | V | R | R |
| Clérigo | N | N | N | R | R |
| Guerrero mágico | N | N | N | R | N |
| Cocinero | N | N | N | N | N |
| Agricultor | N | R | N | V | V |
| Centinela | N | N | N | N | N |
| Bruto | N | R | N | V | V |
| Cobarde | N | V | N | N | N |

Los perfiles de los héroes son estimados v1 del roster. Los enemigos heredan la
plantilla humanoide y sobrescriben solo algunas bandas; las seis plantillas de
familia (humanoide, constructo, no muerto, bestia, elemental y dragón) están en
`bestiary.ts` y la asignación de las 64 entradas queda para una hoja posterior.
Escudo y armadura son el valor numérico del equipo; 0 significa sin equipo.

El Guerrero empieza con la espada, el escudo y la armadura; los huecos
secundarios arrancan vacíos y el equipo inicial de cada arquetipo es la tabla de
[REQ-015](../requirements/REQ-015-roster-arquetipos.md). El hacha, la daga y el
martillo están en el mapa; la espada electrizada y la daga arcana existen como
datos. El juego tiene ocho huecos de equipo y ocho de mochila por personaje; el
arma se cambia **solo** desde el panel abierto con `I`, cuesta 1 MP y no gasta
acción; `G` ya no existe y la recogida también se hace desde el panel
([REQ-018](../requirements/REQ-018-inventario-equipo.md)). En este corte existen
ataque cuerpo a cuerpo y hechizos; el alcance físico a distancia queda como valor
futuro.

## Historia: modelo de daño único (REQ-010/ADR-015)

> **No vigente.** Se conserva solo como historia y como referencia para el
> cross-check de `EXP-003`. El motor no usa estas fórmulas ni estas tablas; el
> modelo vigente es el de arriba
> ([REQ-029](../requirements/REQ-029-tipos-dano-resistencias.md),
> [ADR-023](../decisions/ADR-023-tipos-dano-paquetes-bandas.md)).

Fórmula histórica:

```text
impacto: habilidad + acierto del arma + 1d6 > defensa + escudo + 1d6
daño:    max(1, (fuerza + daño del arma + 1d6) − (resistencia + armadura + 1d6))
```

| Arma histórica | Acierto | Daño | Perfil |
|---|---:|---:|---|
| Espada | +3 | 3 | Equilibrada; arma inicial del Guerrero. |
| Hacha | +2 | 5 | Mucho daño; rompe armadura, pero falla más. |
| Daga | +4 | 2 | Muy fiable; supera escudos, pero sufre contra armadura. |
| Cuchillo | +4 | 1 | Muy fiable; menos dañino que la daga. Arma inicial del Cocinero. |

| Unidad histórica | Habilidad | Fuerza | Defensa | Resistencia | Arma | Escudo | Armadura | PV |
|---|---:|---:|---:|---:|---|---:|---:|---:|
| Guerrero (jugador por defecto) | +1 | +1 | +1 | +1 | Espada | 1 | 1 | 20 |
| Centinela | +0 | +0 | +0 | +0 | Espada | 1 | 0 | 6 |
| Bruto | +0 | +1 | +0 | +0 | Hacha | 0 | 2 | 8 |
| Cobarde | +1 | +0 | +1 | +0 | Daga | 1 | 0 | 5 |

En el modelo histórico el Guerrero añadía +1 de resistencia (0 → 1); hoy su
perfil es normal en los cinco tipos.

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
| Alerta | Ataca hasta agotar acciones o matar; si no es adyacente, gasta hasta su MP (5/4/6 según tipo) por BFS hacia `lastKnown` y ataca con las acciones restantes. Sin ruta, espera. |
| Regreso | Vuelve a `home` sin atacar y se duerme al llegar. |
| Daño | Despierta y alerta; guarda la posición del atacante y, si sobrevive, da la alarma. |
| Huida | Solo el perfil cobarde, con un golpe de ≥40 % de sus PV máximos sobreviviendo; rompe la línea de visión y maximiza la distancia. Acorralado, ataca. |
| Desempate | Orden determinista por índice de unidad y de casilla. |

Flujo de una fase enemiga:

1. Si está `dormant`, espera.
2. Si está `alert`, persigue `lastKnown`, ataca al llegar y sigue atacando hasta
   agotar acciones o matar.
3. Si está `returning`, vuelve a `home` sin atacar y se duerme al llegar.
4. Si es cobarde y `fleeing`, elige la casilla alcanzable que rompe la visión y
   más se aleja; sin visión, vuelve a `home`.

# Controles provisionales

| Tecla | Acción |
|---|---|
| `WASD` / flechas | Mover el cursor un tile en 4 direcciones. |
| `Espacio` / `Enter` | Moverse hasta el cursor; sobre un enemigo, acercarse y atacar. |
| `F` | Atacar al enemigo bajo el cursor si está adyacente. |
| `I` | Abrir o cerrar el panel de personaje: equipo, mochila y suelo del tile. |
| `Escape` | Cerrar el panel de personaje. |
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
- reparto de acciones por arquetipo y tipo (Pícaro 3, enemigos 2/1/2);
- velocidad y claridad de la cámara;
- tamaño, opacidad y patrón del cursor y de los puntos del camino;
- texto y duración de los avisos de rechazo;
- repetición automática de teclas al mantener pulsado el cursor.
