---
type: Scope
title: Alcance y fases
description: Alcance vigente, hitos y límites del proyecto.
status: draft
generated: { by: deepseek/v4.1-flash, at: 2026-11-07T14:33:11Z }
---

# Alcance vigente

Estamos en la **fase 1 cerrada**. La fase 0 dejó documentación, agentes, skills
y un shell de experimentos fiable. El primer hito jugable está construido y
probado por el usuario; `REQ-002` cerró el encuadre, la sala y el movimiento.
El siguiente corte es la generación procedural del mapa
([REQ-003](requirements/REQ-003-generacion-mapa.md)), que se decide con
`EXP-001` antes de pasar a la fase 2.

# Fases

| Fase | Objetivo | Estado |
|---|---|---|
| 0 | Documentación base, agentes, skills y shell de experimentos | Completado |
| 1 | Prototipo local de un jugador con teclado | Completado; REQ-002 cerrada |
| 1.5 | Generación procedural del mapa y muros (REQ-003) | Aprobada v2: BSP, `MapGenerator` y pasillos anchos de 2 tiles; tareas TASK-0008 a TASK-0011 |
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
- La mazmorra se genera por semilla; el primer corte usa un mapa de 32×32.

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
