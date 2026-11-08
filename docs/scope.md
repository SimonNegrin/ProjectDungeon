---
type: Scope
title: Alcance y fases
description: Alcance vigente, hitos y límites del proyecto.
status: draft
generated: { by: deepseek/v4.1-flash, at: 2026-11-08T09:30:52Z }
---

# Alcance vigente

La **fase 1** está cerrada en su núcleo; queda el refinamiento visual 1.9. La fase 0 dejó documentación, agentes, skills
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
aprobada en playtest. `REQ-008` abre la fase 1.9: sustituye el tinte por un
damero de colores planos con paleta por sala y amplía la decoración con
ambientes, sin cambiar reglas. El siguiente corte de contenido sigue siendo la
fase 2: multijugador local hotseat.

# Fases

| Fase | Objetivo | Estado |
|---|---|---|
| 0 | Documentación base, agentes, skills y shell de experimentos | Completado |
| 1 | Prototipo local de un jugador con teclado | Completado; REQ-002 y REQ-003 cerradas |
| 1.5 | Generación procedural del mapa y muros (REQ-003) | Completado tras playtest; BSP, `MapGenerator` y pasillos anchos de 2 tiles |
| 1.6 | Cursor de selección, camino y acciones por destino (REQ-004 y REQ-005) | Completado tras playtest; viewport 13×13 y TASK-0012 a TASK-0016 cerradas |
| 1.7 | Animación del recorrido, cámara que sigue y bloqueo de input (REQ-006) | Completada tras playtest; ritmo 125/70 y diagonal constante; TASK-0017 a TASK-0019 cerradas |
| 1.8 | Legibilidad del suelo: damero y decoración no bloqueante (REQ-007) | Completada tras playtest; damero global y decals no bloqueantes; TASK-0021 y TASK-0022 cerradas |
| 1.9 | Suelo programático por sala y decoración ambiental (REQ-008) | Planificada; TASK-0023 ready y TASK-0024 backlog |
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
