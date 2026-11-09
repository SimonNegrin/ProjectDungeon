---
type: Scope
title: Alcance y fases
description: Alcance vigente, hitos y límites del proyecto.
status: draft
generated: { by: deepseek/v4.1-flash, at: 2026-11-08T16:18:04Z }
---

# Alcance vigente

La **fase 1** está cerrada en su núcleo y la fase 1.9 también: `REQ-008` cerró el
suelo programático y la decoración ambiental con `TASK-0023` y `TASK-0024`. La fase 0 dejó documentación, agentes, skills
y un shell de experimentos fiable. El primer hito jugable está construido y
probado por el usuario; `REQ-002` cerró el encuadre, la sala y el movimiento.
`REQ-003` cerró la generación procedural con BSP, la interfaz `MapGenerator` y
pasillos anchos de 2 tiles. `REQ-004` cerró el cursor de selección, el camino
resaltado y las acciones por destino tras el playtest. `REQ-005` ajustó el
sub-viewport a 13×13 tiles para centrar al jugador y mostrar tiles completos en
los bordes. `REQ-006` completó la fase 1.7: el movimiento se presenta tile a tile
con la cámara siguiendo al personaje y el input bloqueado hasta terminar, con el
ritmo decidido en `EXP-002` (125 ms por paso, 70 ms de pausa y diagonal a
duración constante). `REQ-007` completó la fase 1.8: el suelo transitable usa un
damero global de dos tonos y una decoración plana determinista que no bloquea,
aprobada en playtest. `REQ-008` completó la fase 1.9: damero de colores planos
con paleta por sala y decoración ambiental, sin cambiar reglas.

Dos cortes de juego quedan implementados y pendientes de playtest. `REQ-010`
está `stable` y cerrado con `TASK-0026` a `TASK-0030`: define el combate con
equipo (acierto, defensa y daño variable) con la tabla A decidida en `EXP-003`.
`REQ-009` también está `stable` e implementado con `TASK-0034` a `TASK-0039`
cerradas: fija el bestiario (Centinela/Bruto/Cobarde), la percepción por pasos,
la alarma de una onda y la huida determinista del cobarde.

El siguiente corte está en requisitos. `REQ-011` añade un segundo `MapGenerator`
de mazmorra densa con salas poligonales, pasillos cortos y puertas validadas;
`REQ-012` cambia la aparición para todos los generadores (grupo alrededor del
acceso de la sala más protegida) y el presupuesto de enemigos del generador
denso por superficie y jugadores. El algoritmo y los parámetros de forma se
deciden en `EXP-004`: `TASK-0040` construyó la v1 y `TASK-0041` aplica las
reglas v2 antes de crear las tareas de producción. Después, la fase 2:
multijugador local hotseat.

# Fases

| Fase | Objetivo | Estado |
|---|---|---|
| 0 | Documentación base, agentes, skills y shell de experimentos | Completado |
| 1 | Prototipo local de un jugador con teclado | Completado; REQ-002 y REQ-003 cerradas |
| 1.5 | Generación procedural del mapa y muros (REQ-003) | Completado tras playtest; BSP, `MapGenerator` y pasillos anchos de 2 tiles |
| 1.6 | Cursor de selección, camino y acciones por destino (REQ-004 y REQ-005) | Completado tras playtest; viewport 13×13 y TASK-0012 a TASK-0016 cerradas |
| 1.7 | Animación del recorrido, cámara que sigue y bloqueo de input (REQ-006) | Completada tras playtest; ritmo 125/70 y diagonal constante; TASK-0017 a TASK-0019 cerradas |
| 1.8 | Legibilidad del suelo: damero y decoración no bloqueante (REQ-007) | Completada tras playtest; damero global y decals no bloqueantes; TASK-0021 y TASK-0022 cerradas |
| 1.9 | Suelo programático por sala y decoración ambiental (REQ-008) | Completada; TASK-0023 y TASK-0024 cerradas |
| 1.10 | Combate con equipo: acierto, defensa y daño variable (REQ-010) | Completada; tabla A de EXP-003; TASK-0026 a TASK-0030 cerradas |
| 1.11 | Percepción, alarma y huida enemiga (REQ-009) | Implementada; bestiario 6/4/5, alarma 8, 4 enemigos y huida determinista; TASK-0034 a TASK-0039 cerradas; pendiente playtest |
| 1.12 | Generador de mazmorra densa y aparición alrededor del acceso (REQ-011/REQ-012) | En requisitos; EXP-004 v1 construida en TASK-0040 y v2 pendiente en TASK-0041 |
| 2 | Multijugador local hotseat en el mismo teclado | Pendiente |
| 3 | Servidor Node autoritativo, salas, QR y móviles | Pendiente |
| 4 | Contenido: clases, objetivos, niveles, arte y audio | Pendiente |

# Primer hito jugable

- Una sala de rejilla cuadrada.
- Un jugador controlado con teclado.
- Un enemigo controlado por IA simple.
- Cámara que sigue al jugador activo.
- Fase de jugadores y después fase de enemigos.
- Movimiento y ataque en diagonal.
- Puntos de movimiento y una acción por turno.
- Victoria al eliminar a todos los enemigos; derrota si el jugador cae.
- Arte placeholder y HUD mínimo.

Estado: **cerrado** tras el playtest de `REQ-001`. Las mejoras de encuadre,
tamaño de sala y movimiento por turno pasan a
[REQ-002](requirements/REQ-002-encuadre-16-9.md).

Los valores concretos de la economía de turno son provisionales y viven en
[la economía de turno](design/turn-economy.md).

# Decisiones confirmadas

- El juego es local-first.
- El host es solo pantalla.
- Ahora se juega con teclado; después, hotseat; al final, controladores remotos.
- El servidor será Node a medida y las partidas vivirán en memoria.
- El motor será TypeScript y Canvas 2D.
- La rejilla es cuadrada; movimiento y ataque diagonales.
- Todos los jugadores actúan y después todos los enemigos.
- Hasta 6 jugadores en el futuro; el primer prototipo es de 1.
- Un solo nivel por ahora; habrá varios niveles en el futuro.
- La cámara sigue al jugador activo.
- El movimiento se presenta animado tile a tile, con la cámara siguiendo al
  personaje y el input bloqueado hasta que termina.
- La mazmorra se genera por semilla con BSP; el primer corte usa un mapa de 32×32.
- La generación se encapsula tras `MapGenerator` para poder cambiar el algoritmo.
- Hay pasillos estrechos con puertas y 1-2 pasillos anchos de 2 tiles sin puertas.
- El suelo usa un damero de dos colores planos generados por código, con base
  común y segundo tono por sala; la decoración plana se agrupa por ambientes y no
  bloquea.
- El combate usa acierto de arma + 1d6 contra escudo + 1d6; el daño es arma +
  1d6 menos armadura + 1d6, con mínimo 1. El escudo evita impactos y la armadura
  reduce daño; cada personaje aporta modificadores de acierto, daño y defensa.
  La tabla A de `EXP-003` fija modificadores, armas, PV, escudo y armadura.
- Los enemigos tienen visión de 360° con línea de visión (los muros bloquean y
  las unidades no), detección en cada paso y alarma de una onda de radio 8 sin
  cadena. El perfil cobarde huye de forma determinista al recibir un golpe de al
  menos el 40 % de su vida máxima; la alerta y la huida usan los 4 MP.
- Habrá un segundo generador de mazmorra densa, seleccionable, con mapas
  pequeños (~22×18), 4-6 salas poligonales pared con pared, pasillos de 0-3
  tiles, pasillos anchos ocasionales y una caverna excepcional. BSP sigue siendo
  el defecto hasta el playtest.
- Las puertas de los accesos son decorativas y acordes a la zona; no bloquean.
  Solo se dibujan con dos muros en la línea, suelo a ambos lados y conexión
  entre dos salas distintas, con separación Chebyshev ≥3 y máximo una por
  pasillo; si la geometría no lo permite, queda una boca abierta con aviso.
- En todos los generadores, el grupo aparece alrededor del acceso de la sala más
  protegida, con al menos 6 huecos y sin enemigos ni línea de visión inicial.
  BSP conserva 4 enemigos; el generador denso calcula el total por superficie de
  salas y jugadores (factores 0,02 y 1,35 configurables) y lo reparte por área
  con mínimo 1 por sala no-spawn.

# Fuera de alcance ahora

- Servidor, WebSocket, QR y salas.
- Cuentas, base de datos, matchmaking y persistencia.
- Multijugador local y remoto.
- Arte y audio finales.
- Múltiples niveles, clases y objetivos.

# Restricciones

- Debe funcionar en navegador de escritorio para el host.
- Los controladores futuros serán móviles; la UI deberá ser táctil y legible.
- El motor no dependerá del DOM, de la red ni del teclado.
- La documentación debe ser OKF y validable.
- El usuario no debe tener que revisar código para tomar decisiones creativas.
