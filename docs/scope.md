---
type: Scope
title: Alcance y fases
description: Horizonte del juego, alcance vigente, fases y límites del proyecto.
status: draft
generated: { by: deepseek/v4.1-flash, at: 2026-11-11T10:05:00Z }
---

# Alcance vigente

El prototipo actual es un dungeon crawler de un jugador con teclado: mazmorra
generada, turnos, combate con equipo, percepción y feedback visual. La base está
cerrada: `REQ-001` a `REQ-015` y `REQ-017` están implementadas o `stable`, con
`REQ-009` pendiente de playtest. La economía de acciones, la réplica, la magia y
los tipos de daño están implementadas (`REQ-025`, `REQ-026`, `REQ-027` y
`REQ-029`).

El trabajo inmediato es el **inventario y el equipo** (`REQ-018`, tareas
TASK-0093 a TASK-0098), base del saqueo, del fantasma y de la columna del
jugador; después el saqueo y los traits (`REQ-020` y `REQ-019`), la muerte
jugable (`REQ-021`), el HUD lateral y el guardado (`REQ-022`, `REQ-023` y
`REQ-024`) y, al final, el hotseat de la fase 2 (`REQ-016` v2 y `REQ-031`).
`REQ-030` (alcance visible de hechizos) queda en borrador.

# Horizonte

El estado final buscado está en la [visión](vision.md): roguelike 2D cooperativo,
hotseat y remoto por QR, estética clásica con tacto moderno, catálogo amplio de
armas y enemigos, habilidades y magia, progresión por puntos de habilidad,
puertas con llave, cofres, inventario, equipo y traits. La muerte no expulsa al
jugador: cadáver con objetos, fantasma jugable y resurrección condicionada.

El horizonte **no es el alcance vigente**. Cada sistema necesita su hoja de
requisitos aceptada y, si hay incertidumbre creativa, su experimento.

# Fases

| Fase | Objetivo | Estado |
|---|---|---|
| 0 | Documentación base, agentes, skills y shell de experimentos | Completado |
| 1 | Prototipo local de un jugador con teclado | Completado; REQ-001 y REQ-002 cerradas |
| 1.5 | Generación procedural del mapa y muros (REQ-003) | Completado tras playtest; BSP, `MapGenerator` y pasillos anchos de 2 tiles |
| 1.6 | Cursor de selección, camino y acciones por destino (REQ-004 y REQ-005) | Completado tras playtest; viewport 13×13 y TASK-0012 a TASK-0016 cerradas |
| 1.7 | Animación del recorrido, cámara que sigue y bloqueo de input (REQ-006) | Completada tras playtest; ritmo 125/70 y diagonal constante; TASK-0017 a TASK-0019 cerradas |
| 1.8 | Legibilidad del suelo: damero y decoración no bloqueante (REQ-007) | Completada tras playtest; damero global y decals no bloqueantes; TASK-0021 y TASK-0022 cerradas |
| 1.9 | Suelo programático por sala y decoración ambiental (REQ-008) | Completada; TASK-0023 y TASK-0024 cerradas |
| 1.10 | Combate con equipo: acierto, defensa y daño variable (REQ-010) | Completada; tabla A de EXP-003; TASK-0026 a TASK-0030 cerradas |
| 1.11 | Percepción, alarma y huida enemiga (REQ-009) | Implementada; bestiario 6/4/5, alarma 5, MP 5/4/6, 4 enemigos y huida determinista; TASK-0034 a TASK-0039 cerradas; pendiente playtest |
| 1.12 | Generador de mazmorra densa, aparición alrededor del acceso y salida de nivel (REQ-011/REQ-012/REQ-013) | Completada; `growth` por defecto, EXP-004 cerrado y TASK-0043 a TASK-0049 cerradas |
| 1.13 | Feedback visual de eventos y ritmo pausado (REQ-017) | Completada; TASK-0057 a TASK-0061 cerradas |
| 1.14 | Economía de acciones, réplica y magia (REQ-025/REQ-026/REQ-027) | Implementada; TASK-0076 a TASK-0083 cerradas. Resurrección jugable pendiente de REQ-021; TASK-0084 aplazada y soltar/contenedores pendientes de REQ-018/REQ-020 |
| 1.15 | Tipos de daño, paquetes y resistencias por bandas (REQ-029) | Implementada y verificada; TASK-0085 a TASK-0092 cerradas; ajuste fino aplazado a roster y bestiario completos |
| 2 | Multijugador local hotseat en el mismo teclado | Definida: modo en REQ-031 y configuración en REQ-016 v2; se implementa al cerrar inventario, saqueo, muerte, HUD y guardado |
| 3 | Servidor Node autoritativo, salas, QR y móviles | Pendiente |
| 4 | Contenido: armas, enemigos, magia, objetos, arte y audio | Pendiente |

Las fases 2 y 3 son **ambas obligatorias**: el juego debe soportar hotseat y
control remoto. El orden indica qué se construye antes, no qué modo es opcional.

# Estado de requisitos

El detalle vive en el [índice de requisitos](requirements/index.md). Resumen:

- `REQ-001` a `REQ-015` y `REQ-017`: implementadas o `stable`, con playtest
  pendiente en `REQ-009`.
- Magia y maná: `REQ-025` implementada en TASK-0081 a TASK-0083; la resurrección
  jugable sigue pendiente de `REQ-021`.
- Economía de acciones: `REQ-026` implementada en TASK-0076 a TASK-0078. Quedan
  pendientes soltar objetos y contenedores (R-010/R-011), que dependen de
  `REQ-018`/`REQ-020`, y el rebalanceo de TASK-0084, aplazado.
- Réplica cuerpo a cuerpo: `REQ-027` implementada en TASK-0079 y TASK-0080.
- Tipos de daño: `REQ-029` implementada y verificada en TASK-0085 a TASK-0092;
  perfiles y armas v1 son estimados y el ajuste fino se aplaza a roster y
  bestiario completos.
- `REQ-018` (inventario y equipo) está `stable` v4 y en implementación con
  TASK-0093 a TASK-0098; `REQ-019` (traits) sigue `stable` y sin tareas, y
  `REQ-020` (cofres y cadáveres) sigue en borrador.
- Hotseat: `REQ-031` (modo local) y `REQ-016` v2 (configuración y semilla) están
  `stable` y sin tareas; `REQ-024` v2 (pausa, guardado y reinicio) sigue en
  borrador. Es el último paso del orden actual, tras inventario, saqueo, muerte,
  HUD y guardado.
- `REQ-022` (HUD izquierdo), `REQ-023` (detalle del cursor) y `REQ-030` (alcance
  visible de hechizos) están en borrador.
- Muerte, fantasma y resurrección: `REQ-021` está `stable`; tareas pendientes de
  ordenar con `REQ-018`/`REQ-020`.

# Primer hito jugable

Cerrado tras el playtest de `REQ-001`: una sala, un jugador con teclado, un
enemigo con IA simple, cámara que sigue al jugador, fase de jugadores y fase
enemiga, movimiento y ataque en diagonal, MP y una acción por turno, victoria al
eliminar a los enemigos y derrota si el jugador cae, arte placeholder y HUD
mínimo. Se conserva como referencia histórica.

Los valores concretos de la economía de turno son provisionales y viven en
[la economía de turno](design/turn-economy.md).

# Decisiones confirmadas

- El juego es local-first en su construcción: teclado, después hotseat y después
  remoto. El orden no hace opcional ninguno de los modos.
- Se juega con teclado, hotseat y controladores remotos móviles por QR; hotseat y
  remoto son ambos objetivo del producto.
- El host es solo pantalla.
- El servidor será Node a medida y las partidas vivirán en memoria.
- El motor será TypeScript y Canvas 2D.
- La rejilla es cuadrada; movimiento y ataque diagonales.
- Todos los jugadores actúan y después todos los enemigos.
- Hasta 6 jugadores en el futuro; el primer prototipo es de 1.
- Un solo nivel por ahora; habrá varios niveles en el futuro.
- La cámara sigue al jugador activo.
- El movimiento se presenta animado tile a tile, con la cámara siguiendo al
  personaje y el input bloqueado hasta que termina.
- La mazmorra se genera por semilla; `growth` es el generador por defecto y BSP
  queda como alternativa inyectable.
- La generación se encapsula tras `MapGenerator`.
- Hay pasillos estrechos con puertas y 1-2 pasillos anchos de 2 tiles sin puertas.
- El suelo usa un damero de dos colores planos generados por código, con base
  común y segundo tono por sala; la decoración plana se agrupa por ambientes y no
  bloquea.
- El combate usa acierto de arma + 1d6 contra escudo + 1d6. El daño se organiza
  en cinco tipos (filo, contundente, punzante, mágico y eléctrico) y se resuelve
  por paquetes separados con resistencia por bandas; la fuerza solo suma al
  paquete físico y la armadura solo protege lo físico. El escudo sigue evitando
  impactos de todos los tipos. Fuego y hielo quedan como traits de estado futuros
  ([REQ-029](requirements/REQ-029-tipos-dano-resistencias.md)). La tabla A de
  `EXP-003` y el balance provisional v1 de `REQ-010` v5 son históricos; los
  números se reajustarán.
- Los enemigos tienen visión de 360° con línea de visión, detección en cada paso
  y alarma de una onda de radio 5 sin cadena. El perfil cobarde huye de forma
  determinista al recibir un golpe de al menos el 40 % de su vida máxima; la
  alerta y la huida usan el MP por tipo (Centinela 5, Bruto 4, Cobarde 6).
- Las puertas de los accesos son decorativas y acordes a la zona; no bloquean.
  Solo se dibujan con dos muros en la línea, suelo a ambos lados y conexión entre
  dos salas distintas, con separación Chebyshev ≥3 y máximo una por pasillo; si
  la geometría no lo permite, queda una boca abierta con aviso.
- En todos los generadores, el grupo aparece alrededor del acceso de la sala más
  protegida, con al menos 6 huecos y sin enemigos ni línea de visión inicial. En
  empate se evita la sala mayor y se permiten parejas adyacentes, nunca grupos de
  3 o más. BSP conserva 4 enemigos; el generador denso calcula el total por
  superficie de salas y jugadores (factores 0,02 y 1,2 con 6 jugadores por
  defecto), lo reparte por área con mínimo 1 por sala no-spawn, prefiere
  interiores y puede colocar emboscados en puntos calientes al 0,25.
- La entrada es el acceso de spawn y la salida es única: una sala no-spawn a
  distancia de grafo ≥2, preferiblemente la más lejana. Se representa como puerta
  exterior o escalera (abajo/arriba) en `EXP-004`; el encadenado funcional de
  niveles queda fuera de este corte.
- Cada personaje tiene nueve atributos inherentes independientes del equipo:
  habilidad (acierto), fuerza (daño), defensa (evitación), resistencia
  (absorción), puntería, magia (nivel único que alimenta el maná), PV, MP y
  acciones por turno. La resistencia se suma a la armadura en una sola capa; la
  armadura es un bonus a la resistencia.
- El roster tiene nueve arquetipos (Guerrero, Bárbaro, Pícaro, Arquero, Mago,
  Clérigo, Guerrero mágico, Cocinero y Agricultor) con el Guerrero como
  referencia. Cinco quedan con arma futura; se añade el Cuchillo +4/1. Cada
  personaje tiene nombre editable y dos variantes de sprite sin etiqueta de
  género.
- El balance se ajusta por porcentaje de victorias esperado en duelo 1v1 con el
  héroe atacando primero, equipo básico y 1.000 duelos, con tolerancia ±2 %.
- Cada evento del motor tiene feedback visual o una excepción declarada, con un
  beat pausado y un techo de tiempo. El ataque, la defensa y la muerte se leen
  con secuencia; el cadáver es persistente pero solo presentación en ese corte.
- **Nadie sale de la partida**: el jugador muerto sigue jugando. El cadáver queda
  en el suelo con sus objetos y el jugador pasa a fantasma con turno propio,
  movimiento limitado y una acción por ronda.
- El fantasma no atraviesa muros, sí personajes y enemigos, no puede terminar en
  una casilla ocupada y los demás también pueden atravesarlo; no bloquea el paso.
- La resurrección requiere un lanzador vivo con nivel de magia 4 y maná
  suficiente, o un objeto de resurrección en el inventario de quien lo usa.
  Quien resucita debe estar adyacente a la casilla del cadáver, libre de vivos;
  el personaje vuelve en esa casilla, no en la del fantasma. Sin fuente
  disponible, la muerte es definitiva.
- Los hechizos usan un recurso de **maná** derivado del nivel de magia (máximo
  nivel × 4), separado del MP de movimiento. El maná se recarga completo cada
  turno. Cada hechizo cuesta maná y una acción; máximo 2 por turno en el primer
  corte, provisional hasta los objetos de acción.
- Cada personaje tiene **un nivel de magia único 0–4**; las familias son
  categorías de hechizo, no niveles. Cualquier lanzador con nivel suficiente usa
  cualquier hechizo.
- Las acciones por turno son el noveno atributo inherente: 2 por defecto, el
  Pícaro 3, enemigos 2/1/2 y objetos con tope de 4 provisional. Atacar,
  interactuar y lanzar hechizos consumen una; moverse, recoger/soltar y esperar
  no. Abrir contenedores cuesta una acción y transferir es gratis.
- Fallar un ataque cuerpo a cuerpo permite al defensor **replicar** de inmediato,
  gratis, con tirada normal y sin cadena. Un impacto no genera réplica; exige
  arma equipada y el dormido no es atacable en melé.
- El HUD de juego vive en las columnas laterales del marco 16:9: izquierda para el
  jugador activo, derecha para el detalle del cursor. El HUD exterior desaparece.
- El detalle del cursor exige línea de visión de un jugador vivo; un cofre cerrado
  no revela contenido ni trampa.
- El menú de pausa ofrece reanudar, guardar en `.zip`, cargar `.json` o `.zip` y
  controles. Guardar solo desde la pausa, un archivo por partida; cargar pide
  confirmación y reemplaza la partida actual.
- La persistencia es local por archivo, sin cuentas ni servidor; no implica
  progresión entre runs.
- El orden de implementación es inventario y equipo → cofres y saqueo → traits →
  muerte y resurrección → HUD lateral → guardado → hotseat. El hotseat no se
  empieza hasta que existan el panel, el saqueo y el fantasma que sus reglas
  dan por hechos.

# Fuera de alcance ahora

- Servidor, WebSocket, QR y salas (fase 3).
- Cuentas, base de datos y matchmaking. El guardado local de partida lo define
  `REQ-024`; la progresión entre runs sigue abierta.
- Hotseat jugable: definido en `REQ-031` y `REQ-016` v2, con implementación
  pendiente al final del orden actual.
- Arte y audio finales; iluminación dinámica y filtros CRT/VHS sin aprobar.
- Habilidades avanzadas, proyectiles físicos, teletransporte, efectos de estado y
  muros mágicos: horizonte. La magia básica y la curación están implementadas en
  `REQ-025`; la resurrección jugable depende de `REQ-021`.
- Puntos de habilidad y progresión: horizonte sin hoja aprobada. Las acciones por
  personaje están implementadas en `REQ-026`.
- Rebalanceo de combate por acciones, magia y réplica: TASK-0084 queda aplazada;
  el ajuste fino espera a roster y bestiario completos, según `REQ-029`.
- Puertas con llave y cofres: definidos, no implementados; `REQ-020` sigue en
  borrador.
- Inventario y equipo: `REQ-018` está en implementación con TASK-0093 a
  TASK-0098; los traits (`REQ-019`) siguen sin implementar.
- Ajuste fino de tipos y perfiles con roster y bestiario completos: `REQ-029`
  deja valores estimados para probar; el mecanismo iterable de fortalezas y
  debilidades se diseñará cuando ambos estén cerrados.
- Estructura de run (roguelike), muerte permanente y encadenado funcional de
  niveles: sin definir.
- Saqueo de cadáveres: definido como objetivo de la muerte jugable, sin
  implementar.

# Restricciones

- Debe funcionar en navegador de escritorio para el host.
- Debe soportar hotseat y control remoto por QR; la UI debe ser táctil y legible.
- El motor no dependerá del DOM, de la red ni del teclado.
- La documentación debe ser OKF y validable.
- El usuario no debe tener que revisar código para tomar decisiones creativas.
- La estética vintage no puede comprometer la legibilidad.
